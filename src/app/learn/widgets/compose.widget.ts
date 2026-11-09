import { Component, computed, signal } from '@angular/core';
import { C, S } from './drag-plane';
import { M, mApply, mInv, mMirror, mMove, mMul, mRot, mScale } from './affine';
import { F_SHAPE } from './matrix-2d.widget';
import { P, short } from './vec-plane';

type OpK = 'rot' | 'move' | 'stretch' | 'mirror';

const OPS: { k: OpK; label: string; m: M }[] = [
  { k: 'rot', label: 'Rotate 90°', m: mRot(90) },
  { k: 'move', label: 'Move (2, 1)', m: mMove(2, 1) },
  { k: 'stretch', label: 'Stretch X ×1.5', m: mScale(1.5, 1) },
  { k: 'mirror', label: 'Mirror in Y axis', m: mMirror(90) }
];
const opOf = (k: OpK) => OPS.find(o => o.k === k)!;
const SHAPE: P[] = F_SHAPE.map(p => ({ x: 0.5 + p.x * 0.75, y: 0.5 + p.y * 0.75 }));
const same = (a: M, b: M) => (['a', 'b', 'c', 'd', 'tx', 'ty'] as const).every(k => Math.abs(a[k] - b[k]) < 1e-9);

/** Two transforms in either order: the product, the other order, and the inverse. */
@Component({
  selector: 'w-compose',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Order matters: composing transforms</h3></div>
      <div class="w-controls" role="group" aria-label="First transform">
        <span class="small fw-bold">First, A:</span>
        @for (o of ops; track o.k) {
          <button type="button" class="w-btn" [class.on]="first() === o.k" [attr.aria-pressed]="first() === o.k" (click)="first.set(o.k)">{{ o.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Second transform">
        <span class="small fw-bold">Then, B:</span>
        @for (o of ops; track o.k) {
          <button type="button" class="w-btn" [class.on]="second() === o.k" [attr.aria-pressed]="second() === o.k" (click)="second.set(o.k)">{{ o.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Steps">
        <button type="button" class="w-btn" (click)="swap()">Swap the order</button>
        @for (s of stages; track s.n) {
          <button type="button" class="w-btn" [class.on]="stage() === s.n" [attr.aria-pressed]="stage() === s.n" (click)="stage.set(s.n)">{{ s.label }}</button>
        }
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <polygon [attr.points]="line(shape)" class="ghost" />
          @if (stage() === 2 && !commute()) {
            <polygon [attr.points]="line(other())" class="other" />
            <text [attr.x]="px(centre(other()).x)" [attr.y]="py(centre(other()).y)" text-anchor="middle" class="lbl">A·B</text>
          }
          @if (stage() >= 1) {
            <polygon [attr.points]="line(mid())" class="mid" [class.faint]="stage() === 2" />
          }
          @if (stage() === 3) {
            <polygon [attr.points]="line(final())" class="mid faint" />
          }
          <polygon [attr.points]="line(current())" class="shape" [class.back]="stage() === 3" />
          @if (stage() === 2) {
            <text [attr.x]="px(centre(final()).x)" [attr.y]="py(centre(final()).y)" text-anchor="middle" class="hl-t">B·A</text>
          }
        </svg>
        <div class="tscroll">
          <table class="wtable mono"><tbody>
            <tr><th>A</th><td>{{ m3(a()) }}</td></tr>
            <tr><th>B</th><td>{{ m3(b()) }}</td></tr>
            <tr class="hl"><th>M = B·A</th><td>{{ m3(ba()) }}</td></tr>
            <tr><th>A·B</th><td>{{ m3(ab()) }}</td></tr>
            <tr><th>M⁻¹ = A⁻¹·B⁻¹</th><td>{{ inv() ? m3(inv()!) : 'none' }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.info]="!commute()" [class.ok]="commute()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .ghost { fill: none; stroke: var(--text-muted); stroke-width: 1.5; stroke-dasharray: 4 3; }
    .mid { fill: rgba(139, 92, 246, 0.15); stroke: #8b5cf6; stroke-width: 1.5; }
    .mid.faint { opacity: 0.5; }
    .shape { fill: rgba(59, 130, 246, 0.3); stroke: #3b82f6; stroke-width: 2; stroke-linejoin: round; }
    .shape.back { fill: rgba(16, 185, 129, 0.3); stroke: #10b981; }
    .other { fill: rgba(245, 158, 11, 0.12); stroke: #f59e0b; stroke-width: 2; stroke-dasharray: 5 3; }
    .wtable td { white-space: nowrap; }
  `]
})
export class ComposeWidget {
  readonly grid = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  readonly ops = OPS;
  readonly shape = SHAPE;
  readonly stages = [{ n: 0, label: 'Start' }, { n: 1, label: 'After A' }, { n: 2, label: 'After B' }, { n: 3, label: 'Undo with M⁻¹' }];

  first = signal<OpK>('rot');
  second = signal<OpK>('move');
  stage = signal(2);

  a = computed(() => opOf(this.first()).m);
  b = computed(() => opOf(this.second()).m);
  ba = computed(() => mMul(this.b(), this.a()));
  ab = computed(() => mMul(this.a(), this.b()));
  inv = computed(() => mInv(this.ba()));
  commute = computed(() => same(this.ab(), this.ba()));
  mid = computed(() => SHAPE.map(p => mApply(this.a(), p)));
  final = computed(() => SHAPE.map(p => mApply(this.ba(), p)));
  other = computed(() => SHAPE.map(p => mApply(this.ab(), p)));
  current = computed(() => {
    switch (this.stage()) {
      case 0: return SHAPE;
      case 1: return this.mid();
      case 2: return this.final();
      default: { const i = this.inv()!; return this.final().map(p => mApply(i, p)); }
    }
  });

  message = computed(() => {
    const A = opOf(this.first()).label, B = opOf(this.second()).label;
    if (this.stage() === 3) return `M⁻¹ undoes the last step first: A⁻¹·B⁻¹, like taking off shoes before socks. The shape is back where it started.`;
    if (this.first() === this.second()) return `Doing “${A}” twice is M = A·A. A transform always commutes with itself.`;
    if (this.commute()) return `“${A}” then “${B}” gives the same as the other order: these two commute. That is the exception, not the rule.`;
    return `“${A}” then “${B}” is M = B·A: the matrix applied first sits on the right. The orange outline is the other order, A·B, and it ends up somewhere else.`;
  });

  swap() { const f = this.first(); this.first.set(this.second()); this.second.set(f); }
  centre(p: P[]): P { return { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length }; }
  m3(m: M) { const f = (v: number) => short(v, 3); return `[${f(m.a)} ${f(m.c)} ${f(m.tx)}] [${f(m.b)} ${f(m.d)} ${f(m.ty)}]`; }
  px(x: number) { return C + x * S; }
  py(y: number) { return C - y * S; }
  line(pts: P[]) { return pts.map(p => `${this.px(p.x)},${this.py(p.y)}`).join(' '); }
}
