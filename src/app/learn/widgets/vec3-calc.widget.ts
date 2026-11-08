import { Component, computed, signal } from '@angular/core';
import { short } from './vec-plane';

type V = [number, number, number];

const PRESETS: { label: string; a: V; b: V }[] = [
  { label: 'Wall direction × up', a: [4, 3, 0], b: [0, 0, 1] },
  { label: 'Roof edges', a: [4, 0, 0], b: [0, 4, 3] },
  { label: 'Parallel', a: [1, 2, 3], b: [2, 4, 6] },
  { label: 'Perpendicular', a: [2, 0, 0], b: [0, 0, 5] },
  { label: 'Zero vector', a: [0, 0, 0], b: [1, 1, 1] }
];

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.sqrt(dot(a, a));

/** Every Vec3 operation from the lesson, on two vectors you type in. */
@Component({
  selector: 'w-vec3-calc',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Vec3 calculator</h3></div>
      <p class="w-hint">Type two vectors, or pick a preset. Every row is one member of the <code>Vec3</code> struct below.</p>
      <div class="w-controls" role="group" aria-label="Presets">
        @for (pr of presets; track pr.label) { <button type="button" class="w-btn" (click)="load(pr.a, pr.b)">{{ pr.label }}</button> }
      </div>
      <div class="inputs mb-3">
        @for (row of rows; track row.name) {
          <div class="vrow">
            <span class="vn mono" [class.ca]="row.name === 'a'" [class.cb]="row.name === 'b'">{{ row.name }} =</span>
            @for (i of idx; track i) {
              <input type="number" step="0.5" class="w-field mono" [value]="row.v()[i]" (input)="set(row.name, i, $any($event.target).value)"
                     [attr.aria-label]="row.name + '.' + names[i]" />
            }
          </div>
        }
      </div>
      <div class="tscroll">
        <table class="wtable mono"><tbody>
          <tr><th>a + b</th><td>{{ fmt(sum()) }}</td></tr>
          <tr><th>a − b</th><td>{{ fmt(diff()) }}</td></tr>
          <tr><th>a.Length, b.Length</th><td>{{ short(la(), 4) }}, {{ short(lb(), 4) }}</td></tr>
          <tr><th>a.Normalize()</th><td [class.hl]="!la()">{{ la() ? fmt(unitA(), 4) : 'throws: the zero vector has no direction' }}</td></tr>
          <tr><th>Dot(a, b)</th><td>{{ short(d(), 4) }}</td></tr>
          <tr><th>AngleTo(a, b)</th><td [class.hl]="!la() || !lb()">{{ la() && lb() ? short(angle(), 2) + '°' : 'undefined (zero vector)' }}</td></tr>
          <tr><th>Cross(a, b)</th><td [class.ok]="!!cl()">{{ fmt(c()) }}</td></tr>
          <tr><th>Cross(b, a)</th><td>{{ fmt(neg(c())) }}</td></tr>
          <tr><th>|a × b| (area)</th><td>{{ short(cl(), 4) }}</td></tr>
          <tr><th>Dot(a × b, a), Dot(a × b, b)</th><td>{{ short(dot(c(), a()), 6) }}, {{ short(dot(c(), b()), 6) }}</td></tr>
        </tbody></table>
      </div>
      <div class="w-msg" [class.ok]="state() === 'ok'" [class.info]="state() === 'par'" [class.err]="state() === 'zero'" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .inputs { display: flex; flex-direction: column; gap: 8px; }
    .vrow { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; }
    .vn { font-weight: 800; width: 2.6em; flex: none; }
    .vrow input { width: 0; flex: 1 1 0; max-width: 110px; }
    .ca { color: #3b82f6; } .cb { color: #8b5cf6; }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
  `]
})
export class Vec3CalcWidget {
  readonly presets = PRESETS;
  readonly idx = [0, 1, 2];
  readonly names = ['X', 'Y', 'Z'];
  readonly short = short;
  readonly dot = dot;

  a = signal<V>([4, 3, 0]);
  b = signal<V>([0, 0, 1]);
  readonly rows = [{ name: 'a' as const, v: this.a }, { name: 'b' as const, v: this.b }];

  sum = computed(() => add(this.a(), this.b()));
  diff = computed(() => sub(this.a(), this.b()));
  la = computed(() => len(this.a()));
  lb = computed(() => len(this.b()));
  unitA = computed<V>(() => this.a().map(x => x / this.la()) as V);
  d = computed(() => dot(this.a(), this.b()));
  angle = computed(() => (Math.acos(Math.max(-1, Math.min(1, this.d() / (this.la() * this.lb())))) * 180) / Math.PI);
  c = computed(() => cross(this.a(), this.b()));
  cl = computed(() => len(this.c()));
  state = computed(() => (!this.la() || !this.lb() ? 'zero' : this.cl() < 1e-9 ? 'par' : 'ok'));

  message = computed(() => {
    switch (this.state()) {
      case 'zero': return 'One vector is zero. Its length is 0, so Normalize must throw (or return a flag) and an angle means nothing. Guard against this in every helper.';
      case 'par': return 'a × b = 0: the vectors are parallel, so there is no unique perpendicular. Computing a normal from these two edges would fail: check the cross product’s length before normalising it.';
      default: return `a × b = ${this.fmt(this.c())} is perpendicular to both (both dot products are 0), and its length ${short(this.cl(), 3)} is the area of the parallelogram they span. Swapping the order flips its sign.`;
    }
  });

  fmt(v: V, d = 3) { return `(${v.map(x => short(x, d)).join(', ')})`; }
  neg(v: V): V { return v.map(x => -x) as V; }

  set(name: 'a' | 'b', i: number, raw: string) {
    const x = parseFloat(raw);
    if (!Number.isFinite(x)) return;
    (name === 'a' ? this.a : this.b).update(v => v.map((y, k) => (k === i ? x : y)) as V);
  }

  load(a: V, b: V) {
    this.a.set([...a]);
    this.b.set([...b]);
  }
}
