import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, signal
} from '@angular/core';
import type * as THREE_NS from 'three';

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
    weld: 0xfb923c, weldGlow: 0xc2410c, accent: 0x38bdf8, dust: 0x8b5cf6,
    key: 0xdbe4ff, rim: 0x38bdf8, envIntensity: 0.4, dustOpacity: 0.6, fog: 0x020617
  },
  light: {
    column: 0x64748b, beam: 0x5a5fc8, brace: 0xe09a22, plate: 0x9aa5b8, bolt: 0xf1f5f9,
    weld: 0xf97316, weldGlow: 0x7c2d12, accent: 0x8b5cf6, dust: 0x6366f1,
    key: 0xffffff, rim: 0xa78bfa, envIntensity: 0.8, dustOpacity: 0.4, fog: 0xf8fafc
  }
};

/** One steel member: final transform plus when it gets erected during the build animation. */
interface Member {
  mesh: THREE_NS.InstancedMesh;
  index: number;
  pos: THREE_NS.Vector3;
  quat: THREE_NS.Quaternion;
  length: number;
  delay: number;
}

const BUILD_STEP = 0.42;      // seconds between storeys
const MEMBER_ANIM = 0.75;     // seconds for one member to drop into place

/**
 * Background WebGL scene for the hero: a steel-framed building (I-section columns and beams with
 * bolted end plates and weld beads, base plates with anchor bolts, splice plates, gusseted X-bracing) that erects itself storey by storey and then turns slowly behind the
 * profile photo. Three.js is lazy-loaded, rendering pauses off-screen / in hidden tabs, and
 * reduced-motion visitors get the finished structure as a still frame.
 */
@Component({
  selector: 'app-hero-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas [class.ready]="ready()" aria-hidden="true"></canvas>`,
  styles: [`
    :host { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
    canvas { width: 100%; height: 100%; display: block; opacity: 0; transition: opacity 1s ease; }
    canvas.ready { opacity: 1; }
  `]
})
export class HeroSceneComponent implements AfterViewInit, OnDestroy {
  /** CSS selector (inside the hero) of the element the structure should sit behind. */
  @Input() anchor = '.profile-container';

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  ready = signal(false);

  private THREE?: Three;
  private renderer?: THREE_NS.WebGLRenderer;
  private scene?: THREE_NS.Scene;
  private camera?: THREE_NS.PerspectiveCamera;
  private pivot?: THREE_NS.Group;          // positioned behind the photo
  private structure?: THREE_NS.Group;      // rotates
  private dust?: THREE_NS.Points;
  private scanRing?: THREE_NS.LineLoop;
  private grid?: THREE_NS.GridHelper;
  private keyLight?: THREE_NS.DirectionalLight;
  private rimLight?: THREE_NS.DirectionalLight;
  private mats: Record<string, THREE_NS.Material & { color?: THREE_NS.Color; opacity?: number }> = {};
  private disposables: Array<{ dispose(): void }> = [];

  private members: Member[] = [];
  private buildDone = false;
  private buildDuration = 0;
  private structureHeight = 0;
  private structureWidth = 0;
  private structureDepth = 0;

  private frameId = 0;
  private running = false;
  private inView = true;
  private destroyed = false;
  private lastTime = 0;
  private elapsed = 0;

  private pointer = { x: 0, y: 0 };
  private tilt = { x: 0, y: 0 };

  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly isSmall = window.matchMedia('(max-width: 768px)').matches;
  private cleanup: Array<() => void> = [];

  // scratch objects
  private m4?: THREE_NS.Matrix4;
  private v3?: THREE_NS.Vector3;
  private s3?: THREE_NS.Vector3;

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit() {
    if (!this.supportsWebGL()) return;
    const start = () => this.zone.runOutsideAngular(() => this.init());
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
    this.camera.position.set(0, 0, 30);
    this.camera.lookAt(0, 0, 0);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.keyLight.position.set(-6, 10, 8);
    this.rimLight = new THREE.DirectionalLight(0xffffff, 3.2);
    this.rimLight.position.set(8, 4, -10);
    scene.add(this.keyLight, this.rimLight, new THREE.AmbientLight(0xffffff, 0.15));

    this.pivot = new THREE.Group();
    scene.add(this.pivot);
    this.buildStructure();
    this.buildDust();
    this.applyTheme();
    this.resize();
    this.bindEvents();

    if (this.reducedMotion) this.elapsed = this.buildDuration + 1;
    this.renderFrame(0);
    this.zone.run(() => this.ready.set(true));
    this.start();
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
    this.mats = mats;

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
    type Part = { pos: THREE_NS.Vector3; quat: THREE_NS.Quaternion; len: number; delay: number };
    const parts: Record<Key, Part[]> = {
      column: [], beam: [], brace: [], endPlate: [], basePlate: [], capPlate: [],
      splice: [], gusset: [], bolt: [], weldV: [], weldH: []
    };
    const Zaxis = V(0, 0, 1);
    const qFor = (dir: THREE_NS.Vector3) => new THREE.Quaternion().setFromUnitVectors(Zaxis, dir.clone().normalize());
    const qId = new THREE.Quaternion();
    const qUp = qFor(V(0, 1, 0));
    const add = (set: Key, pos: THREE_NS.Vector3, quat: THREE_NS.Quaternion, delay: number, len = 1) =>
      parts[set].push({ pos, quat, len, delay });
    /** A point at a local offset inside a frame given by (origin, quat). */
    const local = (origin: THREE_NS.Vector3, quat: THREE_NS.Quaternion, x: number, y: number, z: number) =>
      V(x, y, z).applyQuaternion(quat).add(origin);

    let jitter = 0;
    const j = () => (jitter = (jitter + 0.037) % 0.18);

    /** A beam between two column centres, with bolted end plates and weld beads at both ends. */
    const beam = (a: THREE_NS.Vector3, b: THREE_NS.Vector3, delay: number) => {
      const dir = V().subVectors(b, a).normalize();
      // Along X the beam frames into the column web; along Z it bears on the flange face.
      const clear = Math.abs(dir.x) > 0.5 ? COL.tw / 2 : COL.d / 2;
      const q = qFor(dir);
      const a2 = a.clone().addScaledVector(dir, clear + EP.t);
      const b2 = b.clone().addScaledVector(dir, -(clear + EP.t));
      add('beam', a2.clone().add(b2).multiplyScalar(0.5), q, delay, a2.distanceTo(b2));

      const ends: Array<[THREE_NS.Vector3, number]> = [[a, 1], [b, -1]];
      for (const [end, s] of ends) {
        const c = end.clone().addScaledVector(dir, s * (clear + EP.t / 2));
        const d = delay + 0.12;
        add('endPlate', c, q, d);
        // 8 bolts: 2 rows outside the flanges, 2 rows between them
        for (const x of [-0.062, 0.062]) for (const y of [-0.152, -0.05, 0.05, 0.152])
          add('bolt', local(c, q, x, y, s * (EP.t / 2 + BOLT_LEN / 2 - 0.01)), q, d + 0.08);
        // Fillet welds: both sides of the web and along both flanges
        const wz = s * (EP.t / 2 + 0.011);
        for (const x of [-(BM.tw / 2 + 0.011), BM.tw / 2 + 0.011]) add('weldV', local(c, q, x, 0, wz), q, d + 0.12);
        for (const y of [-(BM.d / 2 + 0.01), BM.d / 2 + 0.01]) add('weldH', local(c, q, 0, y, wz), q, d + 0.12);
      }
    };

    /** An X-brace diagonal with gusset plates and bolts at both ends; n = face normal. */
    const brace = (a: THREE_NS.Vector3, b: THREE_NS.Vector3, n: THREE_NS.Vector3, delay: number) => {
      const dir = V().subVectors(b, a).normalize();
      const a2 = a.clone().addScaledVector(dir, 0.34);
      const b2 = b.clone().addScaledVector(dir, -0.34);
      add('brace', a2.clone().add(b2).multiplyScalar(0.5), qFor(dir), delay, a2.distanceTo(b2) + 0.16);
      const qn = qFor(n);
      const ends: Array<[THREE_NS.Vector3, number]> = [[a, 1], [b, -1]];
      for (const [end, s] of ends) {
        const g = end.clone().addScaledVector(dir, s * 0.3);
        add('gusset', g, qn, delay - 0.05);
        for (const o of [-0.07, 0.07]) add('bolt', g.clone().addScaledVector(dir, s * o), qn, delay + 0.1);
      }
    };

    for (let f = 0; f < floors; f++) {
      const t = f * BUILD_STEP;
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const base = P(i, f, k);
        const top = P(i, f + 1, k);
        const d = t + j();
        add('column', base.clone().add(top).multiplyScalar(0.5), qUp, d, storey);

        if (f === 0) {
          add('basePlate', base.clone().setY(base.y + 0.03), qId, d - 0.1);
          for (const x of [-0.22, 0.22]) for (const z of [-0.22, 0.22])          // anchor bolts
            add('bolt', V(base.x + x, base.y + 0.08, base.z + z), qUp, d, 1.6);
        }
        // Bolted flange splice plates every second storey
        if (f > 0 && f % 2 === 0) {
          for (const s of [-1, 1]) {
            const c = V(base.x, base.y + 0.05, base.z + s * (COL.d / 2 + 0.011));
            add('splice', c, qId, d + 0.05);
            for (const x of [-0.08, 0.08]) for (const y of [-0.11, 0.11])
              add('bolt', V(c.x + x, c.y + y, c.z + s * 0.02), qId, d + 0.12);
          }
        }
        if (f === floors - 1) add('capPlate', top.clone().setY(top.y + 0.018), qId, d + 0.3);
      }

      const lvl = f + 1;
      for (let k = 0; k < nz; k++) for (let i = 0; i < nx - 1; i++) beam(P(i, lvl, k), P(i + 1, lvl, k), t + 0.22 + j());
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz - 1; k++) beam(P(i, lvl, k), P(i, lvl, k + 1), t + 0.22 + j());

      // X-bracing: alternating bays on the long faces, end bays on the short faces
      for (let i = 0; i < nx - 1; i++) {
        if ((i + f) % 2) continue;
        for (const k of [0, nz - 1]) {
          brace(P(i, f, k), P(i + 1, f + 1, k), V(0, 0, 1), t + 0.34 + j());
          brace(P(i + 1, f, k), P(i, f + 1, k), V(0, 0, 1), t + 0.34 + j());
        }
      }
      if (f % 2 === 0) for (const i of [0, nx - 1]) {
        brace(P(i, f, 0), P(i, f + 1, 1), V(1, 0, 0), t + 0.34 + j());
        brace(P(i, f, 1), P(i, f + 1, 0), V(1, 0, 0), t + 0.34 + j());
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
      structure.add(mesh);
    });
    this.buildDuration = Math.max(...this.members.map(m => m.delay)) + MEMBER_ANIM;

    // Site grid under the building
    this.grid = new THREE.GridHelper(15, 15);
    const gm = this.grid.material as THREE_NS.LineBasicMaterial;
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
    this.scene.fog = new this.THREE.Fog(pal.fog, 27, 38);
    this.keyLight?.color.setHex(pal.key);
    this.rimLight?.color.setHex(pal.rim);

    if (!this.running) this.renderFrame(0);
  }

  /** Centre the structure behind the anchor element (the profile photo) and size it to frame it. */
  private resize() {
    if (!this.renderer || !this.camera || !this.pivot) return;
    const hostEl = this.host.nativeElement;
    const w = hostEl.clientWidth, h = hostEl.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const worldH = 2 * this.camera.position.z * Math.tan((this.camera.fov * Math.PI) / 360);
    const worldW = worldH * this.camera.aspect;
    const hostRect = hostEl.getBoundingClientRect();
    const anchor = hostEl.parentElement?.querySelector<HTMLElement>(this.anchor);

    let cx = w * 0.72, cy = h * 0.5, size = Math.min(w, h) * 0.45;
    if (anchor) {
      // offsetWidth/Height ignore the scroll-reveal transform
      const r = anchor.getBoundingClientRect();
      cx = r.left + r.width / 2 - hostRect.left;
      cy = r.top + r.height / 2 - hostRect.top;
      size = Math.max(anchor.offsetWidth, anchor.offsetHeight);
    }
    this.pivot.position.set((cx / w - 0.5) * worldW, -(cy / h - 0.5) * worldH, 0);

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
    this.pivot.scale.setScalar(scale);
  }

  private bindEvents() {
    const hostEl = this.host.nativeElement;

    const ro = new ResizeObserver(() => {
      this.resize();
      if (!this.running) this.renderFrame(0);
    });
    ro.observe(hostEl);
    this.cleanup.push(() => ro.disconnect());

    // The photo slides in with a reveal animation; re-centre once it has settled.
    const settle = setTimeout(() => this.resize(), 1200);
    this.cleanup.push(() => clearTimeout(settle));

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

  /* ---------------------------------------------------------------- animation */

  private start() {
    if (this.running || !this.inView || document.hidden || !this.renderer) return;
    if (this.reducedMotion) {
      this.renderFrame(0);
      return;
    }
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
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

    if (!this.buildDone) {
      this.updateMembers();
      if (this.elapsed >= this.buildDuration) {
        this.buildDone = true;
        if (this.scanRing) this.scanRing.visible = true;
      }
    }

    const ease = Math.min(1, dt * 2.5);
    this.tilt.x += (this.pointer.y * 0.12 - this.tilt.x) * ease;
    this.tilt.y += (this.pointer.x * 0.3 - this.tilt.y) * ease;

    if (this.structure) {
      this.structure.rotation.y = -0.65 + this.elapsed * 0.09 + this.tilt.y;
      this.structure.rotation.x = 0.18 + this.tilt.x;
      this.structure.position.y = this.buildDone ? Math.sin(this.elapsed * 0.6) * 0.08 : 0;
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

    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.stop();
    this.cleanup.forEach(fn => fn());
    this.disposables.forEach(d => d.dispose());
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
