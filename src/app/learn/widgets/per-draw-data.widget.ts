import { Component, computed, signal } from '@angular/core';

type Method = 'rewrite' | 'push' | 'separate';
interface Obj { name: string; color: string; x: number }
const OBJECTS: Obj[] = [
  { name: 'red, left', color: '#ef4444', x: 50 },
  { name: 'green, middle', color: '#22c55e', x: 150 },
  { name: 'blue, right', color: '#3b82f6', x: 250 }
];
interface Step { side: 'CPU' | 'GPU'; text: string; write?: number; draw?: number }

function steps(m: Method): Step[] {
  const out: Step[] = [];
  OBJECTS.forEach((o, i) => {
    if (m === 'rewrite') out.push({ side: 'CPU', text: `Write uniform buffer = ${o.name}`, write: i }, { side: 'CPU', text: `Record draw ${i + 1}` });
    if (m === 'push') out.push({ side: 'CPU', text: `Record push constants (${o.name}) and draw ${i + 1}` });
    if (m === 'separate') out.push({ side: 'CPU', text: `Write buffer ${'ABC'[i]} = ${o.name}; record bind set ${'ABC'[i]} and draw ${i + 1}` });
  });
  out.push({ side: 'CPU', text: 'Submit' });
  OBJECTS.forEach((_, i) => out.push({ side: 'GPU', text: `Run draw ${i + 1}`, draw: i }));
  return out;
}

/** Step through recording and running three draws, giving each its own data in three different ways. */
@Component({
  selector: 'w-per-draw-data',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Each draw its own values</h3></div>
      <div class="w-controls" role="group" aria-label="Method">
        @for (m of methods; track m.id) { <button type="button" class="w-btn small" [class.on]="method() === m.id" [attr.aria-pressed]="method() === m.id" (click)="pick(m.id)">{{ m.label }}</button> }
      </div>
      <ol class="steps">
        @for (s of list(); track $index; let i = $index) {
          <li [class.done]="i < at()" [class.now]="i === at()"><span class="side" [class.gpu]="s.side === 'GPU'">{{ s.side }}</span>{{ s.text }}{{ i < at() && s.draw !== undefined ? ' → reads ' + drawnWith()[s.draw].name : '' }}</li>
        }
      </ol>
      @if (method() === 'rewrite') {
        <p class="w-hint">Uniform buffer now holds: <b>{{ buffer() === null ? 'nothing yet' : objects[buffer()!].name }}</b></p>
      }
      <svg viewBox="0 0 300 90" class="screen" role="img" [attr.aria-label]="'Result: ' + resultText()">
        <rect x="0" y="0" width="300" height="90" class="bg" />
        @for (d of drawn(); track $index) {
          <polygon [attr.points]="tri(objects[d.with].x)" [attr.fill]="objects[d.with].color" class="tri" />
        }
        @for (o of objects; track o.name) { <circle [attr.cx]="o.x" cy="50" r="2" class="mark" /> }
      </svg>
      <div class="w-controls">
        <button type="button" class="w-btn" [disabled]="at() >= list().length" (click)="at.set(at() + 1)"><i class="bi bi-skip-forward" aria-hidden="true"></i> Step</button>
        <button type="button" class="w-btn" [disabled]="at() >= list().length" (click)="at.set(list().length)">Run all</button>
        <button type="button" class="w-btn" (click)="at.set(0)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset</button>
      </div>
      <div class="w-msg" [class.info]="at() < list().length" [class.ok]="at() >= list().length && method() !== 'rewrite'" [class.err]="at() >= list().length && method() === 'rewrite'" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .steps { list-style: none; padding: 0; margin: 0.4rem 0; display: flex; flex-direction: column; gap: 3px; font-size: 0.8rem; }
    .steps li { padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border-color); opacity: 0.6; }
    .steps li.done { opacity: 1; border-color: #10b981; }
    .steps li.now { opacity: 1; border-color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
    .side { display: inline-block; min-width: 2.6rem; font-weight: 800; font-size: 0.7rem; color: #7c3aed; }
    .side.gpu { color: #0891b2; }
    .screen { width: 100%; max-width: 420px; display: block; margin: 0.4rem auto; border-radius: 8px; }
    .bg { fill: #0f172a; }
    .tri { opacity: 0.92; }
    .mark { fill: #475569; }
  `]
})
export class PerDrawDataWidget {
  readonly objects = OBJECTS;
  readonly methods: { id: Method; label: string }[] = [
    { id: 'rewrite', label: 'Rewrite one uniform buffer' },
    { id: 'push', label: 'Push constants' },
    { id: 'separate', label: 'One uniform buffer per object' }
  ];
  method = signal<Method>('rewrite');
  at = signal(0);
  list = computed(() => steps(this.method()));
  pick(m: Method) { this.method.set(m); this.at.set(0); }

  /** The uniform buffer's content after the CPU steps done so far. */
  buffer = computed(() => {
    let b: number | null = null;
    this.list().slice(0, this.at()).forEach(s => { if (s.write !== undefined) b = s.write; });
    return b as number | null;
  });
  /** What each draw reads when it runs on the GPU. */
  drawnWith = computed(() => OBJECTS.map((_, i) => {
    if (this.method() !== 'rewrite') return OBJECTS[i];
    return OBJECTS[this.buffer() ?? OBJECTS.length - 1];
  }));
  drawn = computed(() => this.list().slice(0, this.at())
    .filter(s => s.draw !== undefined)
    .map(s => ({ draw: s.draw!, with: this.method() === 'rewrite' ? (this.buffer() ?? 0) : s.draw! })));
  tri(x: number) { return `${x},22 ${x + 28},70 ${x - 28},70`; }
  resultText = computed(() => this.drawn().length ? this.drawn().map(d => OBJECTS[d.with].name).join('; ') : 'empty');
  message = computed(() => {
    const done = this.at() >= this.list().length;
    if (!done) {
      const s = this.list()[this.at()];
      return s.side === 'GPU' ? 'The CPU has finished; the GPU now runs the draws in order.' : 'The CPU is recording. Nothing has been drawn yet.';
    }
    if (this.method() === 'rewrite') return 'Only one triangle is visible: all three draws ran after the CPU’s last write, so all read “blue, right” and were drawn on top of each other.';
    if (this.method() === 'push') return 'Each draw carries its own values inside the command buffer: no buffers, no descriptor sets.';
    return 'This works too, but costs a buffer region and a descriptor set (or a dynamic offset) per object, and a bind per draw.';
  });
}
