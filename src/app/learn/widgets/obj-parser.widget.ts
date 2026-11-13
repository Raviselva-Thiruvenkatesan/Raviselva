import { Component, computed, signal } from '@angular/core';

type V3 = [number, number, number];
interface Parsed { positions: V3[]; uvs: number; normals: number; faces: number; corners: number; vertices: number; tris: { t: [V3, V3, V3]; flip: boolean }[]; flipped: number; errors: string[] }

const PRESETS: { label: string; text: string }[] = [
  { label: 'Cube, flat normals', text: `# 8 positions, 6 normals: every corner of every face is different
v -1 -1 -1
v 1 -1 -1
v 1 1 -1
v -1 1 -1
v -1 -1 1
v 1 -1 1
v 1 1 1
v -1 1 1
vn 0 -1 0
vn 1 0 0
vn 0 1 0
vn -1 0 0
vn 0 0 1
vn 0 0 -1
f 1//1 2//1 6//1 5//1
f 2//2 3//2 7//2 6//2
f 3//3 4//3 8//3 7//3
f 4//4 1//4 5//4 8//4
f 5//5 6//5 7//5 8//5
f 1//6 4//6 3//6 2//6` },
  { label: 'Cube, positions only', text: `# No normals: corners that share a position share a vertex
v -1 -1 -1
v 1 -1 -1
v 1 1 -1
v -1 1 -1
v -1 -1 1
v 1 -1 1
v 1 1 1
v -1 1 1
f 1 2 6 5
f 2 3 7 6
f 3 4 8 7
f 4 1 5 8
f 5 6 7 8
f 1 4 3 2` },
  { label: 'L-shaped slab', text: `# One 6-sided face. Try starting the face at another corner: f 1 2 3 4 5 6 vs f 3 4 5 6 1 2
v 4 0 0
v 4 2 0
v 2 2 0
v 2 4 0
v 0 4 0
v 0 0 0
f 1 2 3 4 5 6` },
  { label: 'Negative indices', text: `# -1 is the latest position, -2 the one before, ...
v 0 0 0
v 2 0 0
v 2 2 0
v 0 2 0
f -4 -3 -2 -1` }
];

/** Parse OBJ text as the lesson's ObjLoader does: fan triangulation and (v, vt, vn) deduplication. */
@Component({
  selector: 'w-obj-parser',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Parse an OBJ file</h3></div>
      <div class="w-controls" role="group" aria-label="Examples">
        @for (p of presets; track p.label) { <button type="button" class="w-btn small" (click)="text.set(p.text)">{{ p.label }}</button> }
      </div>
      <div class="cols">
        <textarea class="mono src" spellcheck="false" aria-label="OBJ text" [value]="text()" (input)="text.set($any($event.target).value)"></textarea>
        <div>
          <svg viewBox="-60 -60 120 120" class="view" role="img" [attr.aria-label]="parsed().tris.length + ' triangles'">
            @for (t of projected(); track $index) { <polygon [attr.points]="t.points" [class.flip]="t.flip" class="tri" /> }
          </svg>
          <label class="w-field"><span>Turn the view: {{ turn() }}°</span>
            <input type="range" min="0" max="360" step="5" [value]="turn()" (input)="turn.set(+$any($event.target).value)" /></label>
        </div>
      </div>
      <div class="stats mono">
        <span>{{ parsed().positions.length }} positions</span><span>{{ parsed().uvs }} uvs</span><span>{{ parsed().normals }} normals</span>
        <span>{{ parsed().faces }} faces</span><span>{{ parsed().corners }} corners</span>
        <span><b>{{ parsed().vertices }} vertices</b></span><span><b>{{ parsed().tris.length }} triangles</b></span>
      </div>
      <div class="w-msg" [class.err]="bad()" [class.info]="!bad()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .cols { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 10px; margin: 0.4rem 0; }
    @media (max-width: 600px) { .cols { grid-template-columns: 1fr; } }
    .src { width: 100%; min-height: 220px; box-sizing: border-box; font-size: 0.74rem; line-height: 1.35; padding: 6px 8px; border-radius: 8px;
           border: 1.5px solid var(--border-color); background: var(--bg-main); color: var(--text-main); resize: vertical; }
    .view { width: 100%; max-width: 260px; display: block; margin: 0 auto; border-radius: 8px; border: 1.5px solid var(--border-color); }
    .tri { fill: rgba(139, 92, 246, 0.18); stroke: #8b5cf6; stroke-width: 0.6; stroke-linejoin: round; }
    .tri.flip { fill: rgba(239, 68, 68, 0.35); stroke: #ef4444; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.78rem; font-weight: 600; max-width: 260px; margin: 4px auto 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .stats { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.76rem; margin: 0.3rem 0; }
  `]
})
export class ObjParserWidget {
  readonly presets = PRESETS;
  text = signal(PRESETS[0].text);
  turn = signal(30);

  parsed = computed<Parsed>(() => {
    const positions: V3[] = [], errors: string[] = [], tris: { t: [V3, V3, V3]; flip: boolean }[] = [];
    let uvs = 0, normals = 0, faces = 0, corners = 0, flipped = 0;
    const unique = new Map<string, number>();
    const index = (s: string, count: number) => { const i = parseInt(s, 10); return i > 0 ? i - 1 : count + i; };
    this.text().split('\n').forEach((raw, lineNo) => {
      const parts = raw.trim().split(/\s+/).filter(Boolean);
      if (!parts.length || parts[0].startsWith('#')) return;
      const nums = parts.slice(1).map(Number);
      switch (parts[0]) {
        case 'v': if (nums.length < 3 || nums.some(isNaN)) errors.push(`line ${lineNo + 1}: a position needs 3 numbers`); else positions.push([nums[0], nums[1], nums[2]]); break;
        case 'vt': uvs++; break;
        case 'vn': normals++; break;
        case 'f': {
          faces++;
          const ids: number[] = [];
          for (const token of parts.slice(1)) {
            corners++;
            const [p, t = '', n = ''] = token.split('/');
            const pi = index(p, positions.length);
            if (isNaN(pi) || pi < 0 || pi >= positions.length) { errors.push(`line ${lineNo + 1}: “${token}” refers to a position that does not exist`); return; }
            const key = `${pi}/${t}/${n}`;
            if (!unique.has(key)) unique.set(key, unique.size);
            ids.push(pi);
          }
          if (ids.length < 3) { errors.push(`line ${lineNo + 1}: a face needs at least 3 corners`); return; }
          const area = (a: V3, b: V3, c: V3) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
          const faceArea = ids.slice(1, -1).reduce((s, _, i) => s + area(positions[ids[0]], positions[ids[i + 1]], positions[ids[i + 2]]), 0);
          for (let i = 1; i + 1 < ids.length; i++) {
            const t: [V3, V3, V3] = [positions[ids[0]], positions[ids[i]], positions[ids[i + 1]]];
            // A fan triangle wound against its face means the fan cut outside the polygon (checked for faces seen from above)
            const flip = ids.length > 3 && Math.sign(area(...t)) * Math.sign(faceArea) < 0;
            if (flip) flipped++;
            tris.push({ t, flip });
          }
          break;
        }
        default: break;                             // o, g, s, usemtl, mtllib: ignored by this reader
      }
    });
    return { positions, uvs, normals, faces, corners, vertices: unique.size, tris, flipped, errors };
  });

  projected = computed(() => {
    const a = this.turn() * Math.PI / 180, ps = this.parsed().positions;
    if (!ps.length) return [];
    const c = [0, 1, 2].map(k => ps.reduce((s, p) => s + p[k], 0) / ps.length);
    const r = Math.max(1e-6, ...ps.map(p => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])));
    const proj = (p: V3) => {
      const x = (p[0] - c[0]) / r, y = (p[1] - c[1]) / r, z = (p[2] - c[2]) / r;
      const rx = x * Math.cos(a) - y * Math.sin(a), ry = x * Math.sin(a) + y * Math.cos(a);
      return [rx * 42, -(z * 0.85 + ry * 0.45) * 42];         // a simple oblique view from above
    };
    return this.parsed().tris.map(({ t, flip }) => ({ points: t.map(proj).map(p => p.map(v => v.toFixed(1)).join(',')).join(' '), flip }));
  });

  bad = computed(() => this.parsed().errors.length > 0 || this.parsed().flipped > 0);
  message = computed(() => {
    const p = this.parsed();
    if (p.errors.length) return p.errors[0];
    if (p.flipped) return `${p.flipped} fan triangle${p.flipped > 1 ? 's wind' : ' winds'} the wrong way round (red): the polygon is not convex, and the fan from its first corner cuts outside it. Start the face at another corner, or triangulate it properly (ear clipping).`;
    if (!p.tris.length) return 'No faces yet.';
    const saved = p.corners - p.vertices;
    return `${p.corners} face corners became ${p.vertices} GPU vertices` + (saved ? `: ${saved} corners repeated an earlier (position, uv, normal) combination and were merged.` : ': no two corners had the same (position, uv, normal), so nothing could be merged.') +
      ` ${p.tris.length} triangles need ${p.tris.length * 3} indices.`;
  });
}
