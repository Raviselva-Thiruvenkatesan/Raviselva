import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface BeamData { Mark: string; Profile: string; LengthM: number; IsPrimary: boolean; Tags: string[] }
type Key = keyof BeamData;
const KEYS: Key[] = ['Mark', 'Profile', 'LengthM', 'IsPrimary', 'Tags'];
const camel = (k: string) => k[0].toLowerCase() + k.slice(1);

/** Serialize an object to JSON with options, then edit JSON and deserialize it back. */
@Component({
  selector: 'w-json-lab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Object ⇄ JSON</h3></div>

      <div class="w-controls">
        <label class="small d-inline-flex gap-1 align-items-center"><input type="checkbox" [checked]="indented()" (change)="indented.set(!indented())"> <span class="mono">WriteIndented = true</span></label>
        <label class="small d-inline-flex gap-1 align-items-center"><input type="checkbox" [checked]="camelCase()" (change)="camelCase.set(!camelCase())"> <span class="mono">PropertyNamingPolicy = CamelCase</span></label>
      </div>

      <div class="w-grid two">
        <div>
          <div class="w-label">C# object: var beam = new Beam {{ '{' }} … {{ '}' }}</div>
          <div class="fields">
            <label class="w-field">Mark <input class="mono" [ngModel]="obj().Mark" (ngModelChange)="set('Mark', $event)"></label>
            <label class="w-field">Profile <input class="mono" [ngModel]="obj().Profile" (ngModelChange)="set('Profile', $event)"></label>
            <label class="w-field">LengthM <input class="mono" type="number" step="0.1" [ngModel]="obj().LengthM" (ngModelChange)="set('LengthM', +$event || 0)"></label>
            <label class="w-field">IsPrimary <select [ngModel]="obj().IsPrimary ? 'true' : 'false'" (ngModelChange)="set('IsPrimary', $event === 'true')"><option value="true">true</option><option value="false">false</option></select></label>
          </div>
          <div class="small text-muted mt-1">Tags = [{{ obj().Tags.join(', ') }}]</div>
          <button type="button" class="w-btn primary mt-2" (click)="serialize()"><i class="bi bi-arrow-right" aria-hidden="true"></i> JsonSerializer.Serialize(beam, options)</button>
        </div>
        <div>
          <div class="w-label">JSON text (edit it, then deserialize)</div>
          <textarea class="json mono" rows="9" [ngModel]="json()" (ngModelChange)="json.set($event)" spellcheck="false" aria-label="JSON text"></textarea>
          <button type="button" class="w-btn mt-2" (click)="deserialize()"><i class="bi bi-arrow-left" aria-hidden="true"></i> JsonSerializer.Deserialize&lt;Beam&gt;(json, options)</button>
        </div>
      </div>

      <div class="w-msg" [class.err]="err()" [class.ok]="!err()" aria-live="polite">
        <i class="bi" [class.bi-x-octagon]="err()" [class.bi-check-circle]="!err()" aria-hidden="true"></i><span>{{ msg() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .fields { display: grid; gap: 8px; grid-template-columns: 1fr 1fr; }
    .fields input, .fields select { width: 100%; }
    .json { width: 100%; font-size: 0.8rem; line-height: 1.5; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border-color); background: #0b1020; color: #c3e88d; resize: vertical; }
    .json:focus { outline: 2px solid rgba(139, 92, 246, 0.45); }
  `]
})
export class JsonLabWidget {
  obj = signal<BeamData>({ Mark: 'B12', Profile: 'IPE300', LengthM: 6.5, IsPrimary: true, Tags: ['level-2', 'grid-C'] });
  indented = signal(true);
  camelCase = signal(true);
  json = signal('');
  msg = signal('Press Serialize to turn the object into JSON text.');
  err = signal(false);

  constructor() { this.serialize(); }

  set<K extends Key>(k: K, v: BeamData[K]) {
    this.obj.update(o => ({ ...o, [k]: v }));
  }

  private name(k: string) { return this.camelCase() ? camel(k) : k; }

  serialize() {
    const o = this.obj();
    const out: Record<string, unknown> = {};
    for (const k of KEYS) out[this.name(k)] = o[k];
    this.json.set(JSON.stringify(out, null, this.indented() ? 2 : undefined));
    this.err.set(false);
    this.msg.set(`Serialized ${KEYS.length} public properties. ${this.camelCase() ? 'Names were converted to camelCase, the usual style for web APIs.' : 'Names keep their C# PascalCase.'}`);
  }

  deserialize() {
    let data: unknown;
    try {
      data = JSON.parse(this.json());
    } catch (e) {
      this.err.set(true);
      this.msg.set(`JsonException: the text is not valid JSON (${(e as Error).message}). Check quotes, commas and brackets.`);
      return;
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      this.err.set(true);
      this.msg.set('JsonException: expected a JSON object { … } for a Beam.');
      return;
    }
    const src = data as Record<string, unknown>;
    const next: BeamData = { Mark: '', Profile: '', LengthM: 0, IsPrimary: false, Tags: [] };
    const missing: string[] = [];
    for (const k of KEYS) {
      const jsonName = this.name(k);
      if (!(jsonName in src)) { missing.push(jsonName); continue; }
      const v = src[jsonName];
      const want = k === 'LengthM' ? 'number' : k === 'IsPrimary' ? 'boolean' : k === 'Tags' ? 'array' : 'string';
      const got = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
      if (got !== want && !(got === 'null' && (want === 'string' || want === 'array'))) {
        const net = { number: 'System.Double', boolean: 'System.Boolean', array: 'System.String[]', string: 'System.String' }[want];
        this.err.set(true);
        this.msg.set(`JsonException: The JSON value could not be converted to ${net}. Path: $.${jsonName}`);
        return;
      }
      (next as unknown as Record<string, unknown>)[k] = v ?? (want === 'array' ? [] : '');
    }
    this.obj.set(next);
    this.err.set(false);
    const unknown = Object.keys(src).filter(n => !KEYS.some(k => this.name(k) === n));
    this.msg.set(['Deserialized into a new Beam object (left side updated).',
      missing.length ? `Not found in the JSON, so left at default: ${missing.join(', ')}.` : '',
      unknown.length ? `Ignored unknown properties: ${unknown.join(', ')}.` : ''].filter(x => x).join(' '));
  }
}
