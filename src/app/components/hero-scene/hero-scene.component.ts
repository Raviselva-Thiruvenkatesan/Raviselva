import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnDestroy, Output,
  PLATFORM_ID, ViewChild, inject, signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as THREE_NS from 'three';
import type { OrbitControls as OrbitControlsT } from 'three/examples/jsm/controls/OrbitControls.js';
import { MotionService } from '../../services/motion.service';

type Three = typeof THREE_NS;

interface Palette {
  column: number;   // painted slate-blue columns
  beam: number;     // indigo primer beams
  brace: number;    // amber bracing (like site-painted HSS)
  plate: number;    // end / base / gusset / splice plates
  bolt: number;     // zinc-plated bolts
  weld: number;     // weld beads (slightly emissive)
  weldGlow: number;
  accent: number;
  highlight: number;
  dust: number;
  key: number;
  rim: number;
  envIntensity: number;
  dustOpacity: number;
  fog: number;
}

const PALETTES: Record<'light' | 'dark', Palette> = {
  dark: {
    column: 0x5d6b88, beam: 0x5257b0, brace: 0xdb9420, plate: 0x8a95a8, bolt: 0xe5e7eb,
    weld: 0xfb923c, weldGlow: 0xc2410c, accent: 0x38bdf8, highlight: 0x22d3ee, dust: 0x8b5cf6,
    key: 0xdbe4ff, rim: 0x38bdf8, envIntensity: 0.4, dustOpacity: 0.6, fog: 0x020617
  },
  light: {
    column: 0x64748b, beam: 0x5a5fc8, brace: 0xe09a22, plate: 0x9aa5b8, bolt: 0xf1f5f9,
    weld: 0xf97316, weldGlow: 0x7c2d12, accent: 0x8b5cf6, highlight: 0x06b6d4, dust: 0x6366f1,
    key: 0xffffff, rim: 0xa78bfa, envIntensity: 0.8, dustOpacity: 0.4, fog: 0xf8fafc
  }
};

/** What the info panel shows for a clicked member. */
export interface MemberInfo {
  kind: string;
  title: string;
  subtitle: string;
  rows: Array<[string, string]>;
}

/** One steel member: final transform plus when it gets erected during the build animation. */
interface Member {
  mesh: THREE_NS.InstancedMesh;
  index: number;
  pos: THREE_NS.Vector3;
  quat: THREE_NS.Quaternion;
  length: number;
  delay: number;
}

interface Tween {
  fromPos: THREE_NS.Vector3;
  toPos: THREE_NS.Vector3;
  fromScale: number;
  toScale: number;
  t: number;
  duration: number;
}

const BUILD_STEP = 0.42;      // seconds between storeys
const MEMBER_ANIM = 0.75;     // seconds for one member to drop into place
const CAM_DIST = 30;          // resting camera distance (layout maths assume it)
const UNIT_M = 2;             // one scene unit = 2 m in the info panel

/**
 * WebGL scene for the hero: a steel-framed building (I-section columns and beams with bolted end
 * plates and weld beads, base plates with anchor bolts, splice plates, gusseted X-bracing) that
 * erects itself storey by storey and turns slowly behind the profile photo.
 *
 * In explore mode (`[exploring]="true"`) it takes over the hero: orbit / zoom / pan with
 * OrbitControls, hover highlight, and click a member to see its details.
 *
 * Three.js is lazy-loaded, rendering pauses off-screen / in hidden tabs, and reduced-motion
 * visitors get the finished structure as a still frame (explore mode still works, without easing).
 */
@Component({
  selector: 'app-hero-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.exploring]': 'explore()' },
  template: `
    <canvas #canvas [class.ready]="ready()" aria-hidden="true"></canvas>

    @if (explore()) {
      <div class="explore-ui" role="dialog" aria-modal="true" aria-labelledby="model-title">
        <div class="topbar">
          <div class="model-title">
            <strong id="model-title">Steel frame model</strong>
            <span>6 storeys · 5 × 3 bays · {{ partCount() }} parts</span>
          </div>
          <div class="actions">
            <button type="button" class="ui-btn" (click)="resetView()">
              <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i><span>Reset view</span>
            </button>
            <button type="button" class="ui-btn" (click)="toggleSpin()" [attr.aria-pressed]="autoRotate()">
              <i class="bi bi-arrow-repeat" aria-hidden="true"></i><span>Spin</span>
            </button>
            <button #exitBtn type="button" class="ui-btn exit" (click)="exitExplore.emit()" aria-label="Close 3D model">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <p class="hint">{{ touch ? 'Drag to rotate · Pinch to zoom · Tap a member' : 'Drag to rotate · Scroll to zoom · Right-drag to pan · Click a member' }}</p>

        <aside class="info" aria-live="polite">
          @if (loadError()) {
            <div class="info-head"><span class="kind">Viewer unavailable</span></div>
            <h3>The 3D controls couldn't load</h3>
            <p class="sub">Please refresh the page and try again. If you're running the dev server, restart it.</p>
          } @else if (selected(); as s) {
            <div class="info-head">
              <span class="kind">{{ s.kind }}</span>
              <button type="button" class="close-info" (click)="clearSelection()" aria-label="Clear selection">
                <i class="bi bi-x" aria-hidden="true"></i>
              </button>
            </div>
            <h3>{{ s.title }}</h3>
            <p class="sub">{{ s.subtitle }}</p>
            <dl>
              @for (row of s.rows; track row[0]) {
                <div><dt>{{ row[0] }}</dt><dd>{{ row[1] }}</dd></div>
              }
            </dl>
          } @else {
            <div class="info-head"><span class="kind">Model summary</span></div>
            <dl>
              @for (row of summary(); track row[0]) {
                <div><dt>{{ row[0] }}</dt><dd>{{ row[1] }}</dd></div>
              }
            </dl>
            <p class="sub mt">Select any member to see its details.</p>
          }
        </aside>
      </div>
    }
  `,
  styles: [`
    :host { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
    /* Explore mode is a full-screen viewer, so it works the same on phones and desktops. */
    :host(.exploring) { position: fixed; inset: 0; z-index: 1200; pointer-events: auto; background: var(--bg-main); }
    canvas { width: 100%; height: 100%; display: block; opacity: 0; transition: opacity 1s ease; }
    canvas.ready { opacity: 1; }
    :host(.exploring) canvas { cursor: grab; touch-action: none; }
    :host(.exploring) canvas:active { cursor: grabbing; }

    .explore-ui {
      position: absolute; inset: 0; pointer-events: none;
      padding: 24px clamp(16px, 4vw, 48px);
      display: flex; flex-direction: column; gap: 10px;
      animation: ui-in 0.4s ease both;
    }
    @keyframes ui-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

    .topbar, .info { pointer-events: auto; }
    .topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .model-title { display: flex; flex-direction: column; }
    .model-title strong { font-family: var(--font-heading); font-size: 1.25rem; color: var(--text-main); }
    .model-title span { font-size: 0.85rem; color: var(--text-muted); }
    .actions { display: flex; gap: 8px; }
    .ui-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px;
      border: 1px solid var(--border-color); background: var(--bg-glass); color: var(--text-main);
      backdrop-filter: blur(10px); font-size: 0.875rem; font-weight: 500; cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
    }
    .ui-btn:hover { border-color: var(--purple); }
    .ui-btn[aria-pressed="true"] { background: var(--gradient-primary); color: #fff; border-color: transparent; }
    .ui-btn.exit { padding: 8px 11px; }
    .hint { margin: 0; font-size: 0.8rem; color: var(--text-muted); pointer-events: none; }

    .info {
      margin-top: auto; align-self: flex-start; width: min(340px, 100%);
      padding: 16px 18px; border-radius: 16px; border: 1px solid var(--border-color);
      background: var(--bg-glass); backdrop-filter: blur(14px); box-shadow: var(--shadow-lg);
      color: var(--text-main);
    }
    .info-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .kind {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase;
      color: var(--purple);
    }
    .close-info { border: none; background: none; color: var(--text-muted); font-size: 1.2rem; line-height: 1; cursor: pointer; }
    .info h3 { font-size: 1.1rem; margin: 0 0 2px; }
    .sub { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
    .sub.mt { margin-top: 10px; }
    dl { margin: 10px 0 0; display: grid; gap: 6px; }
    dl div { display: flex; justify-content: space-between; gap: 16px; font-size: 0.875rem;
      border-top: 1px dashed var(--border-color); padding-top: 6px; }
    dt { font-weight: 500; color: var(--text-muted); }
    dd { margin: 0; text-align: right; font-weight: 600; }

    @media (max-width: 767px) {
      .explore-ui { padding: 16px; }
      .ui-btn span { display: none; }
      .ui-btn { padding: 8px 11px; }
      .info { width: 100%; padding: 12px 14px; }
      .hint { font-size: 0.75rem; }
    }
  `]
})
export class HeroSceneComponent implements AfterViewInit, OnDestroy {
  /** CSS selector (inside the hero) of the element the structure should sit behind. */
  @Input() anchor = '.profile-container';

  /** Explore mode: the model takes over the hero and becomes interactive. */
  @Input() set exploring(value: boolean) {
    if (value === this.explore()) return;
    this.explore.set(value);
    value ? this.enterExplore() : this.leaveExplore();
  }

  /** Fired when the visitor closes explore mode (close button or Escape). */
  @Output() exitExplore = new EventEmitter<void>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('exitBtn') exitBtn?: ElementRef<HTMLButtonElement>;

  ready = signal(false);
  explore = signal(false);
  selected = signal<MemberInfo | null>(null);
  autoRotate = signal(false);
  summary = signal<Array<[string, string]>>([]);
  partCount = signal(0);
  /** The OrbitControls chunk failed to download: explain instead of failing silently. */
  loadError = signal(false);

  private THREE?: Three;
  private renderer?: THREE_NS.WebGLRenderer;
  private scene?: THREE_NS.Scene;
  private camera?: THREE_NS.PerspectiveCamera;
  private controls?: OrbitControlsT;
  private pivot?: THREE_NS.Group;          // positioned behind the photo (or centred when exploring)
  private structure?: THREE_NS.Group;      // rotates
  private dust?: THREE_NS.Points;
  private scanRing?: THREE_NS.LineLoop;
  private grid?: THREE_NS.GridHelper;
  private keyLight?: THREE_NS.DirectionalLight;
  private rimLight?: THREE_NS.DirectionalLight;
  private mats: Record<string, THREE_NS.Material & { color?: THREE_NS.Color; opacity?: number }> = {};
  private disposables: Array<{ dispose(): void }> = [];

  private members: Member[] = [];
  private pickables: THREE_NS.InstancedMesh[] = [];
  private memberInfo = new Map<THREE_NS.InstancedMesh, MemberInfo[]>();
  private buildDone = false;
  private buildDuration = 0;
  private structureHeight = 0;
  private structureWidth = 0;
  private structureDepth = 0;

  // Placement of the pivot: "home" behind the photo, tweened when entering / leaving explore mode.
  private homePos?: THREE_NS.Vector3;
  private homeScale = 1;
  private tween?: Tween;

  // Picking & highlight
  private raycaster?: THREE_NS.Raycaster;
  private ndc?: THREE_NS.Vector2;
  private hoverHl?: THREE_NS.Mesh;
  private selectHl?: THREE_NS.Mesh;
  private hoverAt: { x: number; y: number } | null = null;
  private downAt: { x: number; y: number; t: number } | null = null;
  private exploreCleanup: Array<() => void> = [];
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly touch = this.isBrowser && !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  private frameId = 0;
  private running = false;
  private inView = true;
  private destroyed = false;
  private lastTime = 0;
  private elapsed = 0;
  private spin = 0;

  private pointer = { x: 0, y: 0 };
  private tilt = { x: 0, y: 0 };

  private readonly motion = inject(MotionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Read once at build time: sets particle count and pixel ratio. */
  private readonly isSmall = this.motion.small();
  private cleanup: Array<() => void> = [];

  // scratch objects
  private m4?: THREE_NS.Matrix4;
  private v3?: THREE_NS.Vector3;
  private s3?: THREE_NS.Vector3;

  ngAfterViewInit() {
    // WebGL only exists in the browser; pre-rendered HTML just has the empty canvas.
    if (!this.isBrowser || !this.supportsWebGL()) return;
    const start = () => this.init();
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(start, { timeout: 1200 });
    } else {
      setTimeout(start, 300);
    }
  }

  private supportsWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  private async init() {
    const [THREE, { RoomEnvironment }] = await Promise.all([
      import('three'),
      import('three/examples/jsm/environments/RoomEnvironment.js')
    ]);
    if (this.destroyed) return;
    this.THREE = THREE;
    this.m4 = new THREE.Matrix4();
    this.v3 = new THREE.Vector3();
    this.s3 = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.homePos = new THREE.Vector3();

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement, alpha: true, antialias: true, powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isSmall ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    // Studio-style reflections so the steel reads as metal
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envTex = pmrem.fromScene(room, 0.04).texture;
    scene.environment = envTex;
    room.dispose();
    pmrem.dispose();
    this.disposables.push(envTex);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    this.camera.position.set(0, 0, CAM_DIST);
    this.camera.lookAt(0, 0, 0);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.keyLight.position.set(-6, 10, 8);
    this.rimLight = new THREE.DirectionalLight(0xffffff, 3.2);
    this.rimLight.position.set(8, 4, -10);
    scene.add(this.keyLight, this.rimLight, new THREE.AmbientLight(0xffffff, 0.15));

    this.pivot = new THREE.Group();
    scene.add(this.pivot);
    this.buildStructure();
    this.buildHighlights();
    this.buildDust();
    this.applyTheme();
    this.resize();
    this.bindEvents();

    if (this.motion.reducedMotion()) this.elapsed = this.buildDuration + 1;
    this.renderFrame(0);
    this.ready.set(true);
    this.start();
    if (this.explore()) this.enterExplore();   // explore requested before the scene loaded
  }

  /* ---------------------------------------------------------------- geometry */

  /** Unit-length I-section (H-beam) extruded along +Z and centred on the origin. */
  private iSection(depth: number, width: number, flange: number, web: number): THREE_NS.BufferGeometry {
    const THREE = this.THREE!;
    const d = depth / 2, b = width / 2, w = web / 2;
    const s = new THREE.Shape();
    s.moveTo(-b, -d); s.lineTo(b, -d); s.lineTo(b, -d + flange); s.lineTo(w, -d + flange);
    s.lineTo(w, d - flange); s.lineTo(b, d - flange); s.lineTo(b, d); s.lineTo(-b, d);
    s.lineTo(-b, d - flange); s.lineTo(-w, d - flange); s.lineTo(-w, -d + flange); s.lineTo(-b, -d + flange);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.computeVertexNormals();
    return g;
  }

  private buildStructure() {
    const THREE = this.THREE!;
    const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const nx = 5, nz = 3, floors = 6;
    const bayX = 2.2, bayZ = 2.0, storey = 1.55;
    const ox = ((nx - 1) * bayX) / 2, oz = ((nz - 1) * bayZ) / 2;
    const height = floors * storey;
    this.structureHeight = height;
    this.structureWidth = (nx - 1) * bayX;
    this.structureDepth = (nz - 1) * bayZ;
    const P = (i: number, f: number, k: number) => V(i * bayX - ox, f * storey - height / 2, k * bayZ - oz);

    /* ---- labels for the info panel ---- */
    const metres = (u: number) => `${(u * UNIT_M).toFixed(1)} m`;
    const gridX = 'ABCDEFGH';
    const node = (i: number, k: number) => `${gridX[i]}${k + 1}`;

    /* ---- section sizes (scene units) ---- */
    const COL = { d: 0.3, b: 0.3, tf: 0.05, tw: 0.035 };   // columns: flanges face ±Z
    const BM = { d: 0.26, b: 0.16, tf: 0.04, tw: 0.03 };    // beams
    const EP = { w: 0.2, h: 0.36, t: 0.025 };               // beam end plate
    const BOLT_LEN = 0.06;

    /* ---- materials (colours set in applyTheme) ---- */
    const mats = {
      column: new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.38 }),
      beam: new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.42 }),
      brace: new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.4 }),
      plate: new THREE.MeshStandardMaterial({ metalness: 0.8, roughness: 0.35 }),
      bolt: new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.22 }),
      weld: new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.6, emissiveIntensity: 0.9 }),
      scan: new THREE.LineBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    };
    this.mats = { ...mats };

    /* ---- geometries (all aligned along +Z) ---- */
    const geos = {
      column: this.iSection(COL.d, COL.b, COL.tf, COL.tw),
      beam: this.iSection(BM.d, BM.b, BM.tf, BM.tw),
      brace: new THREE.BoxGeometry(0.09, 0.09, 1),                      // square HSS
      endPlate: new THREE.BoxGeometry(EP.w, EP.h, EP.t),
      basePlate: new THREE.BoxGeometry(0.62, 0.06, 0.62),
      capPlate: new THREE.BoxGeometry(0.4, 0.035, 0.4),
      splice: new THREE.BoxGeometry(0.3, 0.38, 0.022),
      gusset: new THREE.BoxGeometry(0.36, 0.36, 0.022),
      bolt: new THREE.CylinderGeometry(0.024, 0.024, BOLT_LEN, 6).rotateX(Math.PI / 2), // hex bolt
      weldV: new THREE.BoxGeometry(0.022, BM.d - 2 * BM.tf, 0.022),
      weldH: new THREE.BoxGeometry(BM.b, 0.02, 0.022)
    };
    this.disposables.push(...Object.values(geos), ...Object.values(mats));

    /* ---- collect every part first so each InstancedMesh gets an exact count ---- */
    type Key = keyof typeof geos;
    type Part = { pos: THREE_NS.Vector3; quat: THREE_NS.Quaternion; len: number; delay: number; info: MemberInfo };
    const parts: Record<Key, Part[]> = {
      column: [], beam: [], brace: [], endPlate: [], basePlate: [], capPlate: [],
      splice: [], gusset: [], bolt: [], weldV: [], weldH: []
    };
    const Zaxis = V(0, 0, 1);
    const qFor = (dir: THREE_NS.Vector3) => new THREE.Quaternion().setFromUnitVectors(Zaxis, dir.clone().normalize());
    const qId = new THREE.Quaternion();
    const qUp = qFor(V(0, 1, 0));
    const add = (set: Key, pos: THREE_NS.Vector3, quat: THREE_NS.Quaternion, delay: number, info: MemberInfo, len = 1) =>
      parts[set].push({ pos, quat, len, delay, info });
    /** A point at a local offset inside a frame given by (origin, quat). */
    const local = (origin: THREE_NS.Vector3, quat: THREE_NS.Quaternion, x: number, y: number, z: number) =>
      V(x, y, z).applyQuaternion(quat).add(origin);

    let jitter = 0;
    const j = () => (jitter = (jitter + 0.037) % 0.18);

    /** A beam between two column centres, with bolted end plates and weld beads at both ends. */
    const beam = (a: THREE_NS.Vector3, b: THREE_NS.Vector3, delay: number, from: string, to: string, lvl: number) => {
      const dir = V().subVectors(b, a).normalize();
      const alongX = Math.abs(dir.x) > 0.5;
      // Along X the beam frames into the column web; along Z it bears on the flange face.
      const clear = alongX ? COL.tw / 2 : COL.d / 2;
      const q = qFor(dir);
      const a2 = a.clone().addScaledVector(dir, clear + EP.t);
      const b2 = b.clone().addScaledVector(dir, -(clear + EP.t));
      const name = `Beam ${from}–${to}`;
      add('beam', a2.clone().add(b2).multiplyScalar(0.5), q, delay, {
        kind: 'Beam', title: name, subtitle: `Level ${lvl}`,
        rows: [
          ['Section', 'I-beam (UB)'],
          ['Span', metres(a.distanceTo(b))],
          ['Direction', alongX ? 'Along grid lines A–E' : 'Along grid lines 1–3'],
          ['Frames into', alongX ? 'Column webs' : 'Column flanges'],
          ['End connections', 'Bolted end plates']
        ]
      }, a2.distanceTo(b2));

      const plateInfo: MemberInfo = {
        kind: 'Connection', title: 'End-plate connection', subtitle: `${name} · Level ${lvl}`,
        rows: [['Plate', 'Flush end plate'], ['Bolts', '8 hex bolts'], ['Welds', 'Fillet welds to web & flanges']]
      };
      const boltInfo: MemberInfo = {
        kind: 'Fastener', title: 'Hex bolt', subtitle: `End plate · ${name}`,
        rows: [['Bolt group', '8 per end plate'], ['Layout', '2 columns × 4 rows']]
      };
      const weldInfo: MemberInfo = {
        kind: 'Weld', title: 'Fillet weld', subtitle: `${name} to end plate`,
        rows: [['Joins', 'Beam web & flanges'], ['To', 'End plate'], ['Level', `${lvl}`]]
      };

      const ends: Array<[THREE_NS.Vector3, number]> = [[a, 1], [b, -1]];
      for (const [end, s] of ends) {
        const c = end.clone().addScaledVector(dir, s * (clear + EP.t / 2));
        const d = delay + 0.12;
        add('endPlate', c, q, d, plateInfo);
        // 8 bolts: 2 rows outside the flanges, 2 rows between them
        for (const x of [-0.062, 0.062]) for (const y of [-0.152, -0.05, 0.05, 0.152])
          add('bolt', local(c, q, x, y, s * (EP.t / 2 + BOLT_LEN / 2 - 0.01)), q, d + 0.08, boltInfo);
        // Fillet welds: both sides of the web and along both flanges
        const wz = s * (EP.t / 2 + 0.011);
        for (const x of [-(BM.tw / 2 + 0.011), BM.tw / 2 + 0.011]) add('weldV', local(c, q, x, 0, wz), q, d + 0.12, weldInfo);
        for (const y of [-(BM.d / 2 + 0.01), BM.d / 2 + 0.01]) add('weldH', local(c, q, 0, y, wz), q, d + 0.12, weldInfo);
      }
    };

    /** An X-brace diagonal with gusset plates and bolts at both ends; n = face normal. */
    const brace = (a: THREE_NS.Vector3, b: THREE_NS.Vector3, n: THREE_NS.Vector3, delay: number, storeyNo: number, face: string) => {
      const dir = V().subVectors(b, a).normalize();
      const a2 = a.clone().addScaledVector(dir, 0.34);
      const b2 = b.clone().addScaledVector(dir, -0.34);
      add('brace', a2.clone().add(b2).multiplyScalar(0.5), qFor(dir), delay, {
        kind: 'Bracing', title: 'X-brace', subtitle: `Storey ${storeyNo} · ${face}`,
        rows: [['Section', 'Square hollow section (SHS)'], ['Length', metres(a.distanceTo(b))],
          ['Role', 'Lateral stability'], ['Ends', 'Bolted to gusset plates']]
      }, a2.distanceTo(b2) + 0.16);
      const qn = qFor(n);
      const gussetInfo: MemberInfo = {
        kind: 'Connection', title: 'Gusset plate', subtitle: `X-brace · Storey ${storeyNo} · ${face}`,
        rows: [['Connects', 'Brace to beam–column joint'], ['Bolts', '2 per brace end']]
      };
      const boltInfo: MemberInfo = {
        kind: 'Fastener', title: 'Hex bolt', subtitle: `Gusset plate · Storey ${storeyNo}`,
        rows: [['Bolt group', '2 per brace end']]
      };
      const ends: Array<[THREE_NS.Vector3, number]> = [[a, 1], [b, -1]];
      for (const [end, s] of ends) {
        const g = end.clone().addScaledVector(dir, s * 0.3);
        add('gusset', g, qn, delay - 0.05, gussetInfo);
        for (const o of [-0.07, 0.07]) add('bolt', g.clone().addScaledVector(dir, s * o), qn, delay + 0.1, boltInfo);
      }
    };

    for (let f = 0; f < floors; f++) {
      const t = f * BUILD_STEP;
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const base = P(i, f, k);
        const top = P(i, f + 1, k);
        const d = t + j();
        const g = node(i, k);
        add('column', base.clone().add(top).multiplyScalar(0.5), qUp, d, {
          kind: 'Column', title: `Column ${g}`, subtitle: `Storey ${f + 1} of ${floors}`,
          rows: [['Section', 'I-section (UC)'], ['Height', metres(storey)], ['Grid', g],
            ['At base', f === 0 ? 'Base plate + anchor bolts' : f % 2 === 0 ? 'Bolted splice' : 'Continuous']]
        }, storey);

        if (f === 0) {
          add('basePlate', base.clone().setY(base.y + 0.03), qId, d - 0.1, {
            kind: 'Foundation', title: 'Base plate', subtitle: `Column ${g}`,
            rows: [['Anchors', '4 anchor bolts'], ['Connects', 'Column to foundation']]
          });
          const anchorInfo: MemberInfo = {
            kind: 'Fastener', title: 'Anchor bolt', subtitle: `Base plate · Column ${g}`,
            rows: [['Bolt group', '4 per base plate'], ['Holds', 'Column down to foundation']]
          };
          for (const x of [-0.22, 0.22]) for (const z of [-0.22, 0.22])          // anchor bolts
            add('bolt', V(base.x + x, base.y + 0.08, base.z + z), qUp, d, anchorInfo, 1.6);
        }
        // Bolted flange splice plates every second storey
        if (f > 0 && f % 2 === 0) {
          const spliceInfo: MemberInfo = {
            kind: 'Connection', title: 'Column splice', subtitle: `Column ${g} · Level ${f}`,
            rows: [['Type', 'Bolted flange splice'], ['Plates', '2 (one per flange)'], ['Bolts', '4 per plate']]
          };
          const spliceBolt: MemberInfo = {
            kind: 'Fastener', title: 'Hex bolt', subtitle: `Column splice · ${g} · Level ${f}`,
            rows: [['Bolt group', '4 per splice plate']]
          };
          for (const s of [-1, 1]) {
            const c = V(base.x, base.y + 0.05, base.z + s * (COL.d / 2 + 0.011));
            add('splice', c, qId, d + 0.05, spliceInfo);
            for (const x of [-0.08, 0.08]) for (const y of [-0.11, 0.11])
              add('bolt', V(c.x + x, c.y + y, c.z + s * 0.02), qId, d + 0.12, spliceBolt);
          }
        }
        if (f === floors - 1) add('capPlate', top.clone().setY(top.y + 0.018), qId, d + 0.3, {
          kind: 'Plate', title: 'Cap plate', subtitle: `Column ${g} · Roof level`,
          rows: [['Purpose', 'Closes the column top'], ['Supports', 'Roof beams']]
        });
      }

      const lvl = f + 1;
      for (let k = 0; k < nz; k++) for (let i = 0; i < nx - 1; i++)
        beam(P(i, lvl, k), P(i + 1, lvl, k), t + 0.22 + j(), node(i, k), node(i + 1, k), lvl);
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz - 1; k++)
        beam(P(i, lvl, k), P(i, lvl, k + 1), t + 0.22 + j(), node(i, k), node(i, k + 1), lvl);

      // X-bracing: alternating bays on the long faces, end bays on the short faces
      for (let i = 0; i < nx - 1; i++) {
        if ((i + f) % 2) continue;
        for (const k of [0, nz - 1]) {
          const face = `Grid line ${k + 1}, bay ${gridX[i]}–${gridX[i + 1]}`;
          brace(P(i, f, k), P(i + 1, f + 1, k), V(0, 0, 1), t + 0.34 + j(), f + 1, face);
          brace(P(i + 1, f, k), P(i, f + 1, k), V(0, 0, 1), t + 0.34 + j(), f + 1, face);
        }
      }
      if (f % 2 === 0) for (const i of [0, nx - 1]) {
        const face = `Grid line ${gridX[i]}, bay 1–2`;
        brace(P(i, f, 0), P(i, f + 1, 1), V(1, 0, 0), t + 0.34 + j(), f + 1, face);
        brace(P(i, f, 1), P(i, f + 1, 0), V(1, 0, 0), t + 0.34 + j(), f + 1, face);
      }
    }

    const matFor: Record<Key, THREE_NS.Material> = {
      column: mats.column, beam: mats.beam, brace: mats.brace, endPlate: mats.plate, basePlate: mats.plate,
      capPlate: mats.plate, splice: mats.plate, gusset: mats.plate, bolt: mats.bolt, weldV: mats.weld, weldH: mats.weld
    };

    const structure = new THREE.Group();
    (Object.keys(parts) as Key[]).forEach(key => {
      const list = parts[key];
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geos[key], matFor[key], list.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      list.forEach((p, index) => this.members.push({ mesh, index, pos: p.pos, quat: p.quat, length: p.len, delay: p.delay }));
      this.memberInfo.set(mesh, list.map(p => p.info));
      this.pickables.push(mesh);
      structure.add(mesh);
    });
    this.buildDuration = Math.max(...this.members.map(m => m.delay)) + MEMBER_ANIM;

    const plates = parts.endPlate.length + parts.basePlate.length + parts.capPlate.length + parts.splice.length + parts.gusset.length;
    this.summary.set([
      ['Columns', `${parts.column.length}`],
      ['Beams', `${parts.beam.length}`],
      ['X-braces', `${parts.brace.length}`],
      ['Plates', `${plates}`],
      ['Bolts', `${parts.bolt.length}`],
      ['Weld beads', `${parts.weldV.length + parts.weldH.length}`]
    ]);
    this.partCount.set(this.members.length);

    // Site grid under the building
    this.grid = new THREE.GridHelper(15, 15);
    const gm = this.grid.material as THREE_NS.LineBasicMaterial;
    gm.vertexColors = false;   // GridHelper ships grey vertex colours that would tint the accent
    gm.transparent = true;
    gm.depthWrite = false;
    this.grid.position.y = -height / 2;
    structure.add(this.grid);
    this.disposables.push(this.grid.geometry, gm);

    // Scan ring that sweeps up the finished frame
    const pad = 0.45;
    const ringGeo = new THREE.BufferGeometry().setFromPoints([
      V(-ox - pad, 0, -oz - pad), V(ox + pad, 0, -oz - pad), V(ox + pad, 0, oz + pad), V(-ox - pad, 0, oz + pad)
    ]);
    this.scanRing = new THREE.LineLoop(ringGeo, mats.scan);
    this.scanRing.visible = false;
    structure.add(this.scanRing);
    this.disposables.push(ringGeo);

    structure.rotation.set(0.18, -0.65, 0);
    this.structure = structure;
    this.pivot!.add(structure);
    this.updateMembers();
  }

  /** Translucent overlays drawn over the hovered / selected member. */
  private buildHighlights() {
    const THREE = this.THREE!;
    const make = (opacity: number) => {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      mesh.matrixAutoUpdate = false;
      mesh.visible = false;
      mesh.renderOrder = 10;
      this.structure!.add(mesh);
      this.disposables.push(mat);
      return mesh;
    };
    this.hoverHl = make(0.35);
    this.selectHl = make(0.7);
    this.mats['highlightHover'] = this.hoverHl.material as THREE_NS.MeshBasicMaterial;
    this.mats['highlightSelect'] = this.selectHl.material as THREE_NS.MeshBasicMaterial;
  }

  private buildDust() {
    const THREE = this.THREE!;
    const count = this.isSmall ? 220 : 600;
    const pos = new Float32Array(count * 3);
    for (let n = 0; n < count; n++) {
      pos[n * 3] = (Math.random() - 0.5) * 60;
      pos[n * 3 + 1] = (Math.random() - 0.5) * 34;
      pos[n * 3 + 2] = (Math.random() - 0.5) * 20 - 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.14, map: this.dotTexture(), transparent: true, depthWrite: false,
      sizeAttenuation: true, blending: THREE.AdditiveBlending
    });
    this.mats['dust'] = mat;
    this.dust = new THREE.Points(geo, mat);
    this.scene!.add(this.dust);
    this.disposables.push(geo, mat);
  }

  private dotTexture(): THREE_NS.CanvasTexture {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new this.THREE!.CanvasTexture(c);
    this.disposables.push(tex);
    return tex;
  }

  /* ---------------------------------------------------------------- theme & layout */

  private applyTheme() {
    if (!this.THREE || !this.scene) return;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const pal = PALETTES[dark ? 'dark' : 'light'];
    const color = (key: string, hex: number) => (this.mats[key] as any)?.color?.setHex(hex);

    color('column', pal.column);
    color('beam', pal.beam);
    color('brace', pal.brace);
    color('plate', pal.plate);
    color('bolt', pal.bolt);
    color('weld', pal.weld);
    (this.mats['weld'] as THREE_NS.MeshStandardMaterial | undefined)?.emissive.setHex(pal.weldGlow);
    color('scan', pal.accent);
    color('highlightHover', pal.highlight);
    color('highlightSelect', pal.highlight);
    color('dust', pal.dust);
    (this.mats['dust'] as THREE_NS.PointsMaterial).opacity = pal.dustOpacity;
    (this.mats['dust'] as THREE_NS.PointsMaterial).blending = dark ? this.THREE.AdditiveBlending : this.THREE.NormalBlending;
    this.mats['dust'].needsUpdate = true;

    if (this.grid) {
      const gm = this.grid.material as THREE_NS.LineBasicMaterial;
      gm.color.setHex(pal.accent);
      gm.opacity = dark ? 0.16 : 0.22;
    }
    this.scene.environmentIntensity = pal.envIntensity;
    // Depth fog (matches the page background) so members at the back recede.
    this.fogColor = pal.fog;
    this.updateFog();
    this.keyLight?.color.setHex(pal.key);
    this.rimLight?.color.setHex(pal.rim);

    if (!this.running) this.renderFrame(0);
  }

  private fogColor = 0x020617;
  /** Background mode fades the back of the frame; explore mode turns fog off so everything is legible. */
  private updateFog() {
    if (!this.THREE || !this.scene) return;
    this.scene.fog = this.explore() ? null : new this.THREE.Fog(this.fogColor, 27, 38);
  }

  /**
   * The element's box without the translate of in-progress CSS transforms on it or its
   * ancestors (e.g. the scroll-reveal slide-in), so placement matches where it will settle.
   */
  private layoutRect(el: HTMLElement): { left: number; top: number; width: number; height: number } {
    const r = el.getBoundingClientRect();
    let left = r.left, top = r.top;
    const stop = this.host.nativeElement.parentElement;
    for (let node: HTMLElement | null = el; node && node !== stop; node = node.parentElement) {
      const t = getComputedStyle(node).transform;
      if (t && t !== 'none') {
        const m = new DOMMatrixReadOnly(t);
        left -= m.m41;
        top -= m.m42;
      }
    }
    return { left, top, width: r.width, height: r.height };
  }

  /** Visible world size at the resting camera distance. */
  private worldSize(w: number, h: number) {
    const worldH = 2 * CAM_DIST * Math.tan((this.camera!.fov * Math.PI) / 360);
    return { worldH, worldW: worldH * (w / h) };
  }

  private resize() {
    if (!this.renderer || !this.camera || !this.pivot) return;
    const hostEl = this.host.nativeElement;
    const w = hostEl.clientWidth, h = hostEl.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.computeHome(w, h);
    const target = this.explore() ? this.explorePlacement(w, h) : { pos: this.homePos!, scale: this.homeScale };
    if (this.tween) {
      this.tween.toPos.copy(target.pos);
      this.tween.toScale = target.scale;
    } else {
      this.pivot.position.copy(target.pos);
      this.pivot.scale.setScalar(target.scale);
    }
  }

  /** Centre the structure behind the anchor element (the profile photo) and size it to frame it. */
  private computeHome(w: number, h: number) {
    const hostEl = this.host.nativeElement;
    const { worldH, worldW } = this.worldSize(w, h);
    const hostRect = hostEl.getBoundingClientRect();
    const anchor = hostEl.parentElement?.querySelector<HTMLElement>(this.anchor);

    let cx = w * 0.72, cy = h * 0.5, size = Math.min(w, h) * 0.45;
    if (anchor) {
      const r = this.layoutRect(anchor);
      cx = r.left + r.width / 2 - hostRect.left;
      cy = r.top + r.height / 2 - hostRect.top;
      size = Math.max(anchor.offsetWidth, anchor.offsetHeight);
    }
    this.homePos!.set((cx / w - 0.5) * worldW, -(cy / h - 0.5) * worldH, 0);

    const targetPx = size * (this.isSmall ? 1.3 : 1.7);
    const targetWorld = (targetPx / h) * worldH;
    // Fit whichever is larger: the height, or the width seen at an angle.
    const extent = Math.max(this.structureHeight, this.structureWidth * 0.8);
    let scale = targetWorld / (extent * 1.1);

    // When the text sits beside the photo, don't let the frame spread under the text.
    const text = hostEl.parentElement?.querySelector<HTMLElement>('.hero-content .col-lg-6');
    if (text) {
      const textRight = text.getBoundingClientRect().right - hostRect.left;
      const room = cx - textRight + 24;                    // px from photo centre to the text edge
      if (textRight < cx && room > 0) {
        const halfDiag = Math.hypot(this.structureWidth, this.structureDepth) / 2;
        const maxScale = ((room / w) * worldW) / halfDiag;
        scale = Math.min(scale, maxScale);
      }
    }
    // Keep the base plates inside the hero (on phones the photo sits near its bottom edge).
    const roomBelow = h - cy - 20;
    if (roomBelow > 0) {
      const maxScaleV = ((roomBelow / h) * worldH) / (this.structureHeight / 2 + this.structureDepth * 0.6 + 0.8);
      scale = Math.min(scale, maxScaleV);
    }
    this.homeScale = scale;
  }

  /**
   * Explore mode (full-screen viewer): size the model to the free area that the toolbar and info
   * panel leave, and shift the camera's projection so the model is centred in that area.
   * The model itself stays at the origin, so orbiting rotates it around its own centre.
   */
  private explorePlacement(w: number, h: number) {
    const narrow = w < 768;
    // Screen space taken by the UI: toolbar on top, panel on the left (desktop) or bottom (phone).
    const top = narrow ? 120 : 110;
    const panelLeft = narrow ? 0 : Math.min(340, w * 0.4) + 64;
    const panelBottom = narrow ? Math.min(250, h * 0.36) : 0;
    const freeW = w - panelLeft;
    const freeH = h - top - panelBottom;

    // Shift the image so the model's centre lands in the middle of the free area.
    const dx = panelLeft / 2;
    const dy = (top - panelBottom) / 2;
    this.camera!.setViewOffset(w, h, -dx, -dy, w, h);

    const { worldH } = this.worldSize(w, h);
    const worldPerPx = worldH / h;
    const diag = Math.hypot(this.structureWidth, this.structureDepth) + 0.8;
    // Generous margins: perspective and the tilted 3/4 view make the frame look larger than its box.
    const scale = Math.min(
      (0.68 * freeH * worldPerPx) / (this.structureHeight + 1.2),
      (0.7 * freeW * worldPerPx) / diag
    );
    return { pos: new this.THREE!.Vector3(0, 0, 0), scale };
  }

  /** Viewport size for the full-screen viewer (the host may not have resized yet). */
  private viewport() {
    return { w: window.innerWidth, h: window.innerHeight };
  }

  private bindEvents() {
    const hostEl = this.host.nativeElement;

    const ro = new ResizeObserver(() => {
      this.resize();
      if (!this.running) this.renderFrame(0);
    });
    ro.observe(hostEl);
    this.cleanup.push(() => ro.disconnect());

    // Layout around the photo can still shift (fonts loading, reveal animations finishing).
    // The structure is placed from untransformed layout, so re-centre whenever a transition ends.
    const section = hostEl.parentElement;
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform' || this.explore()) return;
      this.resize();
      if (!this.running) this.renderFrame(0);
    };
    section?.addEventListener('transitionend', onTransitionEnd);
    this.cleanup.push(() => section?.removeEventListener('transitionend', onTransitionEnd));

    const io = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
      this.inView ? this.start() : this.stop();
    });
    io.observe(hostEl);
    this.cleanup.push(() => io.disconnect());

    const onVisibility = () => (document.hidden ? this.stop() : this.start());
    document.addEventListener('visibilitychange', onVisibility);
    this.cleanup.push(() => document.removeEventListener('visibilitychange', onVisibility));

    const onPointer = (e: PointerEvent) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    this.cleanup.push(() => window.removeEventListener('pointermove', onPointer));

    const mo = new MutationObserver(() => this.applyTheme());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.cleanup.push(() => mo.disconnect());
  }

  /* ---------------------------------------------------------------- explore mode */

  private async enterExplore() {
    if (!this.renderer || !this.camera || !this.pivot) return;   // init() re-calls once loaded

    // Skip the remaining build animation: the model should be complete to explore.
    if (!this.buildDone) {
      this.elapsed = Math.max(this.elapsed, this.buildDuration);
      this.updateMembers();
      this.buildDone = true;
    }
    this.pickables.forEach(m => m.computeBoundingSphere());
    this.updateFog();

    const canvas = this.canvasRef.nativeElement;
    const reduced = this.motion.reducedMotion();
    const { w, h } = this.viewport();
    this.loadError.set(false);
    // Escape works even before (or without) the controls loading.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.exitExplore.emit();
    };
    document.addEventListener('keydown', onKey);
    this.exploreCleanup.push(() => document.removeEventListener('keydown', onKey));
    this.tweenTo(this.explorePlacement(w, h), reduced ? 0 : 0.7);
    this.start();
    setTimeout(() => this.exitBtn?.nativeElement.focus({ preventScroll: true }), 60);

    let OrbitControls: typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
    try {
      ({ OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js'));
    } catch (err) {
      // e.g. offline, or a dev server with a stale dependency cache. Stay open and say so,
      // rather than silently closing (which looks like the button does nothing).
      console.warn('3D controls failed to load', err);
      if (this.explore()) this.loadError.set(true);
      return;
    }
    if (!this.explore() || this.destroyed || this.controls) return;   // closed again while loading
    const controls = new OrbitControls(this.camera, canvas);
    controls.enableDamping = !reduced;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.9;
    controls.zoomToCursor = true;      // zoom towards the part under the pointer, to inspect bolts & welds
    controls.minDistance = 6;
    controls.maxDistance = 55;
    controls.screenSpacePanning = true;
    controls.target.set(0, 0, 0);
    controls.update();
    this.controls = controls;
    this.bindExploreEvents(canvas);
  }

  private leaveExplore() {
    this.exploreCleanup.forEach(fn => fn());
    this.exploreCleanup = [];
    this.controls?.dispose();
    this.controls = undefined;
    this.loadError.set(false);
    this.clearSelection();
    this.setHighlight(this.hoverHl, null);
    this.autoRotate.set(false);
    this.canvasRef.nativeElement.style.cursor = '';
    if (!this.camera || !this.pivot) return;

    this.camera.clearViewOffset();
    this.camera.position.set(0, 0, CAM_DIST);
    this.camera.lookAt(0, 0, 0);
    this.updateFog();
    const canvas = this.canvasRef.nativeElement;
    this.computeHome(canvas.clientWidth, canvas.clientHeight);
    this.tweenTo({ pos: this.homePos!, scale: this.homeScale }, this.motion.reducedMotion() ? 0 : 0.7);
    this.start();
    if (!this.running) this.renderFrame(0);
  }

  private tweenTo(target: { pos: THREE_NS.Vector3; scale: number }, duration: number) {
    if (!this.pivot) return;
    if (duration <= 0) {
      this.tween = undefined;
      this.pivot.position.copy(target.pos);
      this.pivot.scale.setScalar(target.scale);
      return;
    }
    this.tween = {
      fromPos: this.pivot.position.clone(), toPos: target.pos.clone(),
      fromScale: this.pivot.scale.x, toScale: target.scale, t: 0, duration
    };
  }

  private bindExploreEvents(canvas: HTMLCanvasElement) {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') this.hoverAt = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      this.hoverAt = null;
      this.setHighlight(this.hoverHl, null);
      canvas.style.cursor = '';
    };
    const onDown = (e: PointerEvent) => (this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() });
    const onUp = (e: PointerEvent) => {
      const d = this.downAt;
      this.downAt = null;
      // A click/tap, not the end of a drag
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 500) return;
      const hit = this.pick(e.clientX, e.clientY);
      if (hit) {
        this.selected.set(this.memberInfo.get(hit.mesh)?.[hit.id] ?? null);
        this.setHighlight(this.selectHl, hit);
      } else {
        this.clearSelection();
      }
      if (!this.running) this.renderFrame(0);
    };
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
    canvas.addEventListener('pointerdown', onDown, { passive: true });
    canvas.addEventListener('pointerup', onUp, { passive: true });
    this.exploreCleanup.push(() => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
    });
  }

  private pick(clientX: number, clientY: number): { mesh: THREE_NS.InstancedMesh; id: number } | null {
    if (!this.raycaster || !this.camera) return null;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ndc!.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc!, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, false).find(h => h.instanceId !== undefined);
    return hit ? { mesh: hit.object as THREE_NS.InstancedMesh, id: hit.instanceId! } : null;
  }

  /** Overlay a highlight shell on one instance (slightly enlarged so it wraps the member). */
  private setHighlight(hl: THREE_NS.Mesh | undefined, hit: { mesh: THREE_NS.InstancedMesh; id: number } | null) {
    if (!hl) return;
    if (!hit) {
      hl.visible = false;
      return;
    }
    hl.geometry = hit.mesh.geometry;          // shared, never disposed here
    hit.mesh.getMatrixAt(hit.id, hl.matrix);
    hl.matrix.multiply(this.m4!.makeScale(1.12, 1.12, 1.02));
    hl.matrixWorldNeedsUpdate = true;
    hl.visible = true;
  }

  resetView() {
    if (!this.controls || !this.camera) return;
    this.camera.position.set(0, 0, CAM_DIST);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.spin = 0;
    if (!this.running) this.renderFrame(0);
  }

  toggleSpin() {
    this.autoRotate.update(v => !v);
  }

  clearSelection() {
    this.selected.set(null);
    this.setHighlight(this.selectHl, null);
  }

  /* ---------------------------------------------------------------- animation */

  private start() {
    if (this.running || !this.inView || document.hidden || !this.renderer) return;
    if (this.motion.reducedMotion() && !this.explore()) {
      this.elapsed = Math.max(this.elapsed, this.buildDuration + 1);
      this.renderFrame(0);
      return;
    }
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      if (this.motion.reducedMotion() && !this.explore()) {
        // Setting turned on while animating: jump to the finished frame and hold still.
        this.stop();
        this.start();
        return;
      }
      // Real elapsed time (capped) so the build finishes on schedule even on slow devices.
      const dt = Math.min((now - this.lastTime) / 1000, 0.5);
      this.lastTime = now;
      this.renderFrame(dt);
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  /** Place every member according to the build timeline (drop in from above + grow). */
  private updateMembers() {
    const m4 = this.m4!, v = this.v3!, s = this.s3!;
    const touched = new Set<THREE_NS.InstancedMesh>();
    for (const mem of this.members) {
      const t = Math.min(Math.max((this.elapsed - mem.delay) / MEMBER_ANIM, 0), 1);
      const e = 1 - Math.pow(1 - t, 3);
      const k = Math.max(e, 0.0001);
      v.copy(mem.pos);
      v.y += (1 - e) * 2.2;
      s.set(k, k, mem.length * k);
      m4.compose(v, mem.quat, s);
      mem.mesh.setMatrixAt(mem.index, m4);
      touched.add(mem.mesh);
    }
    touched.forEach(m => (m.instanceMatrix.needsUpdate = true));
  }

  private renderFrame(dt: number) {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.elapsed += dt;
    const exploring = this.explore();

    if (!this.buildDone) {
      this.updateMembers();
      if (this.elapsed >= this.buildDuration) this.buildDone = true;
    }
    if (this.scanRing) this.scanRing.visible = this.buildDone && !exploring;

    if (this.tween && this.pivot) {
      const tw = this.tween;
      tw.t = Math.min(tw.t + dt / tw.duration, 1);
      const e = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - Math.pow(-2 * tw.t + 2, 3) / 2;
      this.pivot.position.lerpVectors(tw.fromPos, tw.toPos, e);
      this.pivot.scale.setScalar(tw.fromScale + (tw.toScale - tw.fromScale) * e);
      if (tw.t >= 1) this.tween = undefined;
    }

    // Background mode: slow spin + pointer parallax. Explore mode: the visitor drives the camera.
    const ease = Math.min(1, dt * 2.5);
    const tx = exploring ? 0 : this.pointer.y * 0.12;
    const ty = exploring ? 0 : this.pointer.x * 0.3;
    this.tilt.x += (tx - this.tilt.x) * ease;
    this.tilt.y += (ty - this.tilt.y) * ease;
    if (!exploring) this.spin += dt * 0.09;
    else if (this.autoRotate()) this.spin += dt * 0.3;

    if (this.structure) {
      this.structure.rotation.y = -0.65 + this.spin + this.tilt.y;
      this.structure.rotation.x = 0.18 + this.tilt.x;
      this.structure.position.y = this.buildDone && !exploring ? Math.sin(this.elapsed * 0.6) * 0.08 : 0;
    }
    if (this.scanRing?.visible) {
      const h = this.structureHeight;
      const t = ((this.elapsed - this.buildDuration) * 0.16) % 1;
      this.scanRing.position.y = -h / 2 + t * h;
      (this.mats['scan'] as THREE_NS.LineBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.9;
    }
    if (this.dust) {
      this.dust.rotation.y = this.elapsed * 0.015 + this.tilt.y * 0.3;
      this.dust.rotation.x = this.tilt.x * 0.3;
    }

    this.controls?.update();

    // Hover picking once per frame (not per pointer event).
    if (exploring && this.hoverAt && !this.downAt) {
      this.scene.updateMatrixWorld();
      const hit = this.pick(this.hoverAt.x, this.hoverAt.y);
      this.setHighlight(this.hoverHl, hit);
      this.canvasRef.nativeElement.style.cursor = hit ? 'pointer' : '';
    }

    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (!this.isBrowser) return;   // nothing was started during server rendering
    this.stop();
    this.exploreCleanup.forEach(fn => fn());
    this.controls?.dispose();
    this.cleanup.forEach(fn => fn());
    this.disposables.forEach(d => d.dispose());
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
