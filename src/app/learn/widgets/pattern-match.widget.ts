import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Val { label: string; kind: 'null' | 'beam' | 'column' | 'int' | 'string' | 'double'; len?: number; n?: number; s?: string }

const VALUES: Val[] = [
  { label: 'null', kind: 'null' },
  { label: 'new Beam(9.5)', kind: 'beam', len: 9.5 },
  { label: 'new Beam(4.0)', kind: 'beam', len: 4 },
  { label: 'new Column(3.2)', kind: 'column', len: 3.2 },
  { label: '42', kind: 'int', n: 42 },
  { label: '-7', kind: 'int', n: -7 },
  { label: '""', kind: 'string', s: '' },
  { label: '"IPE300"', kind: 'string', s: 'IPE300' },
  { label: '2.5', kind: 'double', n: 2.5 }
];

const ARMS = [
  { line: 3, pat: 'null', test: (v: Val) => v.kind === 'null', res: '"nothing"' },
  { line: 4, pat: 'Beam { Length: > 8 }', test: (v: Val) => v.kind === 'beam' && v.len! > 8, res: '"long beam"' },
  { line: 5, pat: 'Beam b', test: (v: Val) => v.kind === 'beam', res: '$"beam {b.Length} m"' },
  { line: 6, pat: 'Column', test: (v: Val) => v.kind === 'column', res: '"column"' },
  { line: 7, pat: 'int n when n < 0', test: (v: Val) => v.kind === 'int' && v.n! < 0, res: '"negative int"' },
  { line: 8, pat: 'int and (> 0 and < 100)', test: (v: Val) => v.kind === 'int' && v.n! > 0 && v.n! < 100, res: '"small int"' },
  { line: 9, pat: 'string { Length: 0 }', test: (v: Val) => v.kind === 'string' && v.s === '', res: '"empty text"' },
  { line: 10, pat: 'string s', test: (v: Val) => v.kind === 'string', res: '$"text: {s}"' },
  { line: 11, pat: '_', test: () => true, res: '"something else"' }
];

/** Pick a value and see which arm of a switch expression matches first. */
@Component({
  selector: 'w-pattern-match',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which pattern matches?</h3></div>
      <p class="w-hint">Patterns are tested <strong>top to bottom</strong>; the first one that matches wins. Pick a value for <span class="mono">obj</span>.</p>
      <div class="w-controls" role="group" aria-label="Value">
        <span class="small text-muted mono">object? obj =</span>
        @for (v of values; track v.label) {
          <button type="button" class="w-btn mono" [class.on]="sel().label === v.label" (click)="sel.set(v)" [attr.aria-pressed]="sel().label === v.label">{{ v.label }}</button>
        }
      </div>
      <div class="w-grid two">
        <app-code [code]="code" title="Describe.cs" [compact]="true" [copyable]="false" [active]="[hit().line]" [marked]="tried()" [output]="output()" />
        <div class="arms">
          @for (a of arms; track a.line; let i = $index) {
            <div class="arm" [class.hit]="i === hitIndex()" [class.no]="i < hitIndex()" [class.skip]="i > hitIndex()">
              <span class="mono">{{ a.pat }}</span>
              <small>{{ i < hitIndex() ? 'no match' : i === hitIndex() ? 'MATCH' : 'not tested' }}</small>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .arms { display: grid; gap: 4px; align-content: start; }
    .arm { display: flex; justify-content: space-between; gap: 8px; padding: 5px 10px; border-radius: 8px; border: 1.5px solid var(--border-color); font-size: 0.8rem; transition: all 0.2s; }
    .arm small { color: var(--text-muted); white-space: nowrap; }
    .arm.no { opacity: 0.7; }
    .arm.skip { opacity: 0.35; }
    .arm.hit { border-color: #10b981; background: rgba(16, 185, 129, 0.14); font-weight: 700; }
    .arm.hit small { color: #059669; }
  `]
})
export class PatternMatchWidget {
  values = VALUES;
  arms = ARMS;
  sel = signal<Val>(VALUES[1]);

  code = [
    'string Describe(object? obj) => obj switch',
    '{',
    ...ARMS.map((a, i) => `    ${a.pat} => ${a.res}${i < ARMS.length - 1 ? ',' : ''}`),
    '};'
  ].join('\n');

  hitIndex = computed(() => ARMS.findIndex(a => a.test(this.sel())));
  hit = computed(() => ARMS[this.hitIndex()]);
  tried = computed(() => ARMS.slice(0, this.hitIndex()).map(a => a.line));

  output = computed(() => {
    const v = this.sel();
    switch (this.hit().line) {
      case 3: return 'nothing';
      case 4: return 'long beam';
      case 5: return `beam ${v.len} m`;
      case 6: return 'column';
      case 7: return 'negative int';
      case 8: return 'small int';
      case 9: return 'empty text';
      case 10: return `text: ${v.s}`;
      default: return 'something else';
    }
  });
}
