import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Life = 'Singleton' | 'Scoped' | 'Transient';
type Svc = 'IClock' | 'IUnitOfWork' | 'IReportBuilder';
interface Node { label: string; children: Node[] }
interface Req { tree?: Node; error?: string }

const IMPL: Record<Svc, string> = { IClock: 'SystemClock', IUnitOfWork: 'UnitOfWork', IReportBuilder: 'ReportBuilder' };
const DEPS: Record<Svc, Svc[]> = { IClock: [], IUnitOfWork: [], IReportBuilder: ['IUnitOfWork', 'IClock'] };

/** Register three services with different lifetimes, run requests, and see which instances the container hands out. */
@Component({
  selector: 'w-di-lifetimes',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The container and lifetimes</h3></div>
      <p class="w-hint">Each request creates a <strong>scope</strong> and resolves <span class="mono">ReportController(IReportBuilder, IUnitOfWork)</span>. <span class="mono">ReportBuilder</span> itself needs <span class="mono">IUnitOfWork</span> and <span class="mono">IClock</span>.</p>
      <div class="regs">
        @for (s of svcs; track s) {
          <label class="w-field mono">services.Add…&lt;{{ s }}, {{ impl[s] }}&gt;
            <select [ngModel]="life()[s]" (ngModelChange)="setLife(s, $event)" [attr.aria-label]="s + ' lifetime'">
              @for (l of lives; track l) { <option [value]="l">Add{{ l }}</option> }
            </select>
          </label>
        }
      </div>
      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="addRequest()" [disabled]="count() >= 3"><i class="bi bi-plus-lg" aria-hidden="true"></i> Handle a request</button>
        <button type="button" class="w-btn" (click)="count.set(START)" [disabled]="count() === START">Reset</button>
      </div>

      <div class="reqs">
        @for (r of requests(); track $index; let i = $index) {
          <div class="req">
            <div class="w-label">Request {{ i + 1 }} (scope {{ i + 1 }})</div>
            @if (r.error) { <div class="small w-err mono">{{ r.error }}</div> }
            @if (r.tree; as t) {
              <div class="mono tree">
                <div>{{ t.label }}</div>
                @for (c of t.children; track $index) {
                  <div class="l1" [class]="tone(c.label)">{{ c.label }}</div>
                  @for (g of c.children; track $index) { <div class="l2" [class]="tone(g.label)">{{ g.label }}</div> }
                }
              </div>
            }
          </div>
        }
      </div>
      <div class="w-msg" [class.err]="problem()" [class.info]="!problem()" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .regs { display: grid; gap: 6px; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 760px) { .regs { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .regs .w-field { font-size: 0.72rem; word-break: break-word; }
    .reqs { display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 760px) { .reqs { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .req { padding: 8px 10px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); min-width: 0; }
    .tree { font-size: 0.74rem; display: grid; gap: 2px; }
    .l1 { padding-left: 0.8rem; } .l2 { padding-left: 1.8rem; }
    .t-Singleton { color: #059669; } .t-Scoped { color: #0284c7; } .t-Transient { color: #b45309; }
  `]
})
export class DiLifetimesWidget {
  readonly svcs: Svc[] = ['IClock', 'IUnitOfWork', 'IReportBuilder'];
  readonly lives: Life[] = ['Singleton', 'Scoped', 'Transient'];
  readonly impl = IMPL;
  life = signal<Record<Svc, Life>>({ IClock: 'Singleton', IUnitOfWork: 'Scoped', IReportBuilder: 'Transient' });
  /** Two requests by default, so scoped vs singleton differences are visible straight away. */
  readonly START = 2;
  count = signal(this.START);

  setLife(s: Svc, l: Life) { this.life.update(x => ({ ...x, [s]: l })); }
  addRequest() { this.count.update(c => Math.min(3, c + 1)); }
  tone(label: string) { return 't-' + (/\((\w+)\)$/.exec(label)?.[1] ?? ''); }

  /** A singleton that depends on a shorter-lived service, if any. `scoped` = the container refuses it. */
  captive = computed(() => {
    const l = this.life();
    for (const svc of this.svcs) {
      if (l[svc] !== 'Singleton') continue;
      const dep = DEPS[svc].find(d => l[d] !== 'Singleton');
      if (dep) return { svc, dep, scoped: l[dep] === 'Scoped' };
    }
    return undefined;
  });

  requests = computed<Req[]>(() => {
    const l = this.life();
    const c = this.captive();
    if (c?.scoped) {
      const error = `InvalidOperationException: Cannot consume scoped service '${c.dep}' from singleton '${c.svc}'.`;
      return Array.from({ length: this.count() }, () => ({ error }));
    }
    const counters: Record<string, number> = {};
    const singletons = new Map<Svc, string>();
    const out: Req[] = [];
    for (let r = 0; r < this.count(); r++) {
      const scoped = new Map<Svc, string>();
      const resolve = (s: Svc): Node => {
        const life = l[s];
        const cache = life === 'Singleton' ? singletons : life === 'Scoped' ? scoped : null;
        const existing = cache?.get(s);
        let id = existing;
        let children: Node[] = [];
        if (!id) {
          children = DEPS[s].map(resolve);
          counters[s] = (counters[s] ?? 0) + 1;
          id = `${IMPL[s]} #${counters[s]}`;
          cache?.set(s, id);
        }
        return { label: `${s} → ${id}${existing ? ' (reused)' : ''} (${life})`, children };
      };
      out.push({ tree: { label: 'ReportController', children: [resolve('IReportBuilder'), resolve('IUnitOfWork')] } });
    }
    return out;
  });

  problem = computed(() => {
    const l = this.life();
    return !!this.captive() || l.IUnitOfWork === 'Transient' || l.IUnitOfWork === 'Singleton';
  });

  note = computed(() => {
    const l = this.life();
    const c = this.captive();
    if (c) {
      return c.scoped
        ? `Captive dependency: a singleton lives for the whole app, so it would hold one request's ${IMPL[c.dep]} for ever. ASP.NET Core's scope validation stops the app with this error.`
        : `The singleton ${IMPL[c.svc]} captured one ${IMPL[c.dep]} when it was created and reuses it in every request. That is rarely what a transient registration intended.`;
    }
    if (l.IUnitOfWork === 'Transient') return 'Bug: the controller and the builder got DIFFERENT UnitOfWork objects in the same request, so their changes are saved in two separate transactions.';
    if (l.IUnitOfWork === 'Singleton') return 'Bug: every request shares one UnitOfWork (like one DbContext for the whole app). It is not thread-safe and keeps growing. Use Scoped.';
    return 'Singleton: one for the app. Scoped: one per request, shared inside it. Transient: a new one every time it is asked for.';
  });
}
