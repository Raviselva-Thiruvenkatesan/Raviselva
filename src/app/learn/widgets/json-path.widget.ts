import { Component, computed, signal } from '@angular/core';

/** The order from the lesson. */
const DOC = {
  orderRef: 'WEB-1001',
  customer: { name: 'Asha Patel', city: 'Leeds' },
  lines: [{ productId: 6, qty: 10 }, { productId: 8, qty: 2 }],
  giftWrap: true,
  note: null
};
const PRETTY = JSON.stringify(DOC, null, 2);
const PATHS = ['$.orderRef', '$.customer', '$.customer.city', '$.lines', '$.lines[0]', '$.lines[1].qty', '$.lines[2].qty', '$.giftWrap', '$.note', '$.OrderRef'];

const E_PROP = 'Msg 13608: Property cannot be found on the specified JSON path.';
const E_SCALAR = 'Msg 13623: Scalar value cannot be found in the specified JSON path.';
const E_OBJ = 'Msg 13624: Object or array cannot be found in the specified JSON path.';

type Found = { ok: true; v: unknown } | { ok: false };
/** Follow a path like $.a.b[1].c through the document; property names are case-sensitive. */
function walk(path: string): Found {
  let v: unknown = DOC;
  for (const [, name, idx] of path.slice(1).matchAll(/\.(\w+)|\[(\d+)\]/g)) {
    if (name !== undefined) {
      if (v === null || typeof v !== 'object' || Array.isArray(v) || !(name in v)) return { ok: false };
      v = (v as Record<string, unknown>)[name];
    } else {
      if (!Array.isArray(v) || +idx >= v.length) return { ok: false };
      v = v[+idx];
    }
  }
  return { ok: true, v };
}

interface Res { text: string; kind: 'val' | 'null' | 'err' }

/** Try paths against one document with JSON_VALUE and JSON_QUERY, in lax or strict mode. */
@Component({
  selector: 'w-json-path',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Reading a JSON path</h3></div>
      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn small mono" [class.on]="!strict()" [attr.aria-pressed]="!strict()" (click)="strict.set(false)">lax (default)</button>
        <button type="button" class="w-btn small mono" [class.on]="strict()" [attr.aria-pressed]="strict()" (click)="strict.set(true)">strict</button>
      </div>
      <div class="w-controls" role="group" aria-label="Path">
        @for (p of paths; track p) {
          <button type="button" class="w-btn small mono" [class.on]="path() === p" [attr.aria-pressed]="path() === p" (click)="path.set(p)">{{ p }}</button>
        }
      </div>
      <div class="cols">
        <pre class="doc mono" aria-label="The JSON document">{{ pretty }}</pre>
        <div class="res">
          @for (r of results(); track r.fn) {
            <div class="fn mono">{{ r.fn }}(&#64;j, '{{ strict() ? 'strict ' : '' }}{{ path() }}')</div>
            <div class="out mono" [class.null]="r.res.kind === 'null'" [class.err]="r.res.kind === 'err'">{{ r.res.text }}</div>
          }
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 3px 9px; }
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 0.7rem; margin: 0.6rem 0 0.2rem; }
    @media (max-width: 620px) { .cols { grid-template-columns: 1fr; } }
    .doc { font-size: 0.74rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0; white-space: pre; overflow-x: auto; }
    .res { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .fn { font-size: 0.74rem; color: var(--text-muted); overflow-wrap: anywhere; }
    .out { font-size: 0.8rem; padding: 5px 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); overflow-wrap: anywhere; margin-bottom: 0.4rem; }
    .out.null { color: var(--text-muted); font-style: italic; }
    .out.err { color: #ef4444; border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.06); }
    .w-msg { margin-top: 0.5rem; }
  `]
})
export class JsonPathWidget {
  readonly paths = PATHS;
  readonly pretty = PRETTY;
  strict = signal(false);
  path = signal('$.customer');

  private found = computed(() => walk(this.path()));

  /** JSON_VALUE wants a scalar, JSON_QUERY an object or array; a JSON null gives NULL in both modes. */
  results = computed(() => {
    const f = this.found(), s = this.strict();
    const nul: Res = { text: 'NULL', kind: 'null' };
    let val: Res, qry: Res;
    if (!f.ok) val = qry = s ? { text: E_PROP, kind: 'err' } : nul;
    else if (f.v === null) val = qry = nul;
    else if (typeof f.v === 'object') {
      val = s ? { text: E_SCALAR, kind: 'err' } : nul;
      qry = { text: JSON.stringify(f.v), kind: 'val' };
    } else {
      val = { text: String(f.v), kind: 'val' };
      qry = s ? { text: E_OBJ, kind: 'err' } : nul;
    }
    return [{ fn: 'JSON_VALUE', res: val }, { fn: 'JSON_QUERY', res: qry }];
  });

  message = computed(() => {
    const f = this.found(), p = this.path(), s = this.strict();
    if (p === '$.OrderRef') return s ? 'Paths are case-sensitive: OrderRef is not orderRef. Strict mode turns the typo into an error you will notice.' : 'Paths are case-sensitive: OrderRef is not orderRef, so lax mode quietly returns NULL. Switch to strict to see the typo caught.';
    if (!f.ok) return s ? 'lines has only two elements, [0] and [1], so [2] does not exist and strict mode raises an error.' : 'Arrays count from 0: lines has [0] and [1] only. Lax mode returns NULL for a path that leads nowhere.';
    if (f.v === null) return 'The property exists but holds JSON null. Both functions return NULL, even in strict mode: the path was found.';
    if (typeof f.v === 'object') return `${Array.isArray(f.v) ? 'An array' : 'An object'} is not a scalar, so JSON_VALUE ${s ? 'raises an error' : 'returns NULL'}. JSON_QUERY returns it as JSON text, ready for OPENJSON or another JSON function.`;
    return `A ${typeof f.v === 'boolean' ? 'true/false' : typeof f.v === 'number' ? 'number' : 'string'} is a scalar, so JSON_VALUE returns it as nvarchar text${typeof f.v === 'string' ? '' : ' (CAST it to use it as a number or bit)'}. JSON_QUERY wants an object or array, so it ${s ? 'raises an error' : 'returns NULL'}.`;
  });
}
