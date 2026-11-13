import { Component, computed, signal } from '@angular/core';

type Order = 'loaded' | 'pipeline' | 'full' | 'engine';
interface Draw { name: string; pipeline: 'Opaque' | 'Glass'; material: string; mesh: 'Box' | 'Cylinder'; distance: number }

const DRAWS: Draw[] = [
  { name: 'Glass screen', pipeline: 'Glass', material: 'Glass', mesh: 'Box', distance: 9 },
  { name: 'Column 1', pipeline: 'Opaque', material: 'Steel', mesh: 'Cylinder', distance: 7 },
  { name: 'Slab', pipeline: 'Opaque', material: 'Concrete', mesh: 'Box', distance: 10 },
  { name: 'Column 2', pipeline: 'Opaque', material: 'Steel', mesh: 'Cylinder', distance: 6 },
  { name: 'Wall', pipeline: 'Opaque', material: 'Brick', mesh: 'Box', distance: 13 },
  { name: 'Column 3', pipeline: 'Opaque', material: 'Steel', mesh: 'Cylinder', distance: 6 },
  { name: 'Glass door', pipeline: 'Glass', material: 'Glass', mesh: 'Box', distance: 11 },
  { name: 'Column 4', pipeline: 'Opaque', material: 'Steel', mesh: 'Cylinder', distance: 7 },
  { name: 'Ceiling', pipeline: 'Opaque', material: 'Concrete', mesh: 'Box', distance: 10 },
  { name: 'Beam', pipeline: 'Opaque', material: 'Steel', mesh: 'Box', distance: 8 }
];

/** The same ten draws in four orders: how many pipeline, material and mesh changes each order costs, and whether glass blends correctly. */
@Component({
  selector: 'w-draw-sort',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Sorting the draw list</h3></div>
      <div class="w-controls" role="group" aria-label="Draw order">
        @for (o of orders; track o.id) { <button type="button" class="w-btn small" [class.on]="order() === o.id" [attr.aria-pressed]="order() === o.id" (click)="order.set(o.id)">{{ o.label }}</button> }
      </div>
      <div class="tscroll"><table class="wtable">
        <thead><tr><th scope="col">#</th><th scope="col">Object</th><th scope="col">Pipeline</th><th scope="col">Material</th><th scope="col">Mesh</th><th scope="col">Binds</th></tr></thead>
        <tbody>
          @for (r of rows(); track r.d.name; let i = $index) {
            <tr [class.hl]="r.late">
              <td>{{ i + 1 }}</td><td class="l">{{ r.d.name }}</td>
              <td [class.hl]="r.p"><span class="dot" [class.glass]="r.d.pipeline === 'Glass'"></span>{{ r.d.pipeline }}</td>
              <td [class.hl]="r.m">{{ r.d.material }}</td><td [class.hl]="r.mesh">{{ r.d.mesh }}</td>
              <td class="mono">{{ r.binds }}</td>
            </tr>
          }
        </tbody>
      </table></div>
      <p class="w-hint">Highlighted cells are state changes: P a pipeline bind, M new material values, B new vertex and index buffers. Pipeline changes cost the most, then buffers, then material values.</p>
      <div class="stats">
        <span class="chip" [class.ok]="totals().p <= 2">{{ totals().p }} pipeline binds</span>
        <span class="chip" [class.ok]="totals().m <= 4">{{ totals().m }} material changes</span>
        <span class="chip" [class.ok]="totals().mesh <= 4">{{ totals().mesh }} mesh binds</span>
      </div>
      <div class="w-msg" [class.ok]="glassOk()" [class.err]="!glassOk()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .wtable { font-size: 0.76rem; }
    .wtable td.l { text-align: left; }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #8b5cf6; margin-right: 4px; }
    .dot.glass { background: #38bdf8; }
    .stats { display: flex; flex-wrap: wrap; gap: 6px; margin: 0.4rem 0; }
  `]
})
export class DrawSortWidget {
  readonly orders: { id: Order; label: string }[] = [
    { id: 'loaded', label: 'As loaded' }, { id: 'pipeline', label: 'By pipeline' },
    { id: 'full', label: 'By pipeline, material, mesh' }, { id: 'engine', label: 'Engine: opaque sorted, then glass far to near' }
  ];
  order = signal<Order>('loaded');

  private sorted = computed(() => {
    const key = (d: Draw) => `${d.pipeline}|${d.material}|${d.mesh}`;
    const list = [...DRAWS];
    switch (this.order()) {
      case 'pipeline': return list.sort((a, b) => (a.pipeline === b.pipeline ? 0 : a.pipeline === 'Glass' ? 1 : -1));
      case 'full': return list.sort((a, b) => key(a).localeCompare(key(b)));
      case 'engine': return [...list.filter(d => d.pipeline === 'Opaque').sort((a, b) => key(a).localeCompare(key(b))),
                             ...list.filter(d => d.pipeline === 'Glass').sort((a, b) => b.distance - a.distance)];
      default: return list;
    }
  });

  rows = computed(() => {
    return this.sorted().map((d, i, all) => {
      const prev = i > 0 ? all[i - 1] : null;
      const p = !prev || prev.pipeline !== d.pipeline, m = !prev || prev.material !== d.material, mesh = !prev || prev.mesh !== d.mesh;
      const late = d.pipeline === 'Opaque' && all.slice(0, i).some(x => x.pipeline === 'Glass');     // drawn over earlier glass
      return { d, p, m, mesh, late, binds: [p ? 'P' : '', m ? 'M' : '', mesh ? 'B' : ''].filter(Boolean).join(' ') || '–' };
    });
  });

  totals = computed(() => ({ p: this.rows().filter(r => r.p).length, m: this.rows().filter(r => r.m).length, mesh: this.rows().filter(r => r.mesh).length }));
  glassOk = computed(() => {
    const r = this.rows().map(x => x.d), glass = r.filter(d => d.pipeline === 'Glass');
    const lastOpaque = r.map(d => d.pipeline).lastIndexOf('Opaque'), firstGlass = r.findIndex(d => d.pipeline === 'Glass');
    return firstGlass > lastOpaque && glass.every((g, i) => i === 0 || glass[i - 1].distance >= g.distance);
  });

  message = computed(() => {
    const t = this.totals();
    if (this.glassOk()) return `${t.p} pipeline binds, ${t.mesh} mesh binds, and the glass is blended over finished opaque objects, farthest first. This is the order the engine’s SceneRenderer.Sort produces.`;
    const late = this.rows().filter(r => r.late).map(r => r.d.name);
    if (late.length) return `${t.p} pipeline binds. Wrong picture: ${late.join(', ')} ${late.length > 1 ? 'are' : 'is'} drawn after glass, so where the glass covers ${late.length > 1 ? 'them' : 'it'} the blend is lost (rows with a tinted background).`;
    return `${t.p} pipeline binds and every opaque object comes first, but the two glass panels are not drawn farthest first, so where they overlap the blend is in the wrong order.`;
  });
}
