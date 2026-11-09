import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, PRODUCTS, money } from './sql-data';

/** The garden shed kit from the lesson: Parts and Bom rows, exactly as inserted there. */
const PARTS: Record<number, { name: string; productId: number | null }> = {
  1: { name: 'Garden shed kit', productId: null }, 2: { name: 'Wall panel', productId: null }, 3: { name: 'Roof panel', productId: null },
  4: { name: 'Floor', productId: null }, 5: { name: 'Timber 2x4 2.4 m', productId: 6 }, 6: { name: 'Plywood sheet 18 mm', productId: 7 },
  7: { name: 'Wood screws (200)', productId: 8 }
};
const BOM: [number, number, number][] = [[1, 2, 4], [1, 3, 2], [1, 4, 1], [1, 7, 3], [2, 5, 5], [2, 6, 1], [3, 5, 3], [3, 6, 1], [4, 5, 6], [4, 6, 2]];

interface Out { parent: number; child: number; qty: number; total: number; lvl: number; step: number }

/** Run the recursive CTE: the anchor, then each step from the rows of the step before, until a step finds nothing. */
function explode(): Out[][] {
  const steps: Out[][] = [BOM.filter(b => b[0] === 1).map(([parent, child, qty]) => ({ parent, child, qty, total: qty, lvl: 1, step: 0 }))];
  while (steps[steps.length - 1].length) {
    const prev = steps[steps.length - 1], n = steps.length;
    steps.push(prev.flatMap(e => BOM.filter(b => b[0] === e.child).map(([parent, child, qty]) => ({ parent, child, qty, total: e.total * qty, lvl: e.lvl + 1, step: n }))));
  }
  return steps;
}
const STEPS = explode();
const byName = (a: Out, b: Out) => a.lvl - b.lvl || PARTS[a.parent].name.localeCompare(PARTS[b.parent].name) || PARTS[a.child].name.localeCompare(PARTS[b.child].name);

/** A bill of materials exploded one recursion step at a time, quantities multiplied on the way down. */
@Component({
  selector: 'w-bom-explode',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Exploding the shed kit</h3></div>
      <div class="w-controls" role="group" aria-label="Recursion step">
        @for (s of steps; track $index; let k = $index) {
          <button type="button" class="w-btn small" [class.on]="si() === k" [attr.aria-pressed]="si() === k" (click)="si.set(k)">{{ k === 0 ? 'Anchor' : 'Step ' + k }}</button>
        }
        <label class="check"><input type="checkbox" [checked]="list()" (change)="list.set(!list())" [disabled]="si() < steps.length - 1" /> Shopping list</label>
      </div>

      <ul class="tree" aria-label="Bill of materials">
        <li><span class="node root">Garden shed kit</span>
          <ul>
            @for (a of top; track a.child) {
              <li>
                <span class="node" [class.new]="si() === 0" [class.shelf]="isShelf(a.child)">{{ name(a.child) }} <b>×{{ a.qty }}</b></span>
                @if (kids(a.child).length) {
                  <ul>
                    @for (b of kids(a.child); track b.child) {
                      <li>
                        @if (si() >= 1) {
                          <span class="node shelf" [class.new]="si() === 1">{{ name(b.child) }} <b>×{{ b.qty }}</b> <span class="mul">{{ a.qty }} × {{ b.qty }} = {{ a.qty * b.qty }}</span></span>
                        } @else {
                          <span class="node ghost">…</span>
                        }
                      </li>
                    }
                  </ul>
                }
              </li>
            }
          </ul>
        </li>
      </ul>

      @if (list() && si() === steps.length - 1) {
        <app-sql-grid [cols]="['Name', 'Qty', 'Price', 'Cost']" [rows]="shopping()" label="Shopping list" />
      } @else {
        <app-sql-grid [cols]="['Lvl', 'PartOf', 'Name', 'TotalQty']" [rows]="rows()" [rowClass]="rowClass()" label="Rows produced so far" />
      }
      <div class="w-msg" [class.info]="si() < steps.length - 1" [class.ok]="si() === steps.length - 1" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; }
    .check input { accent-color: #8b5cf6; }
    .tree, .tree ul { list-style: none; margin: 0; padding-left: 1.1rem; }
    .tree { padding-left: 0; margin: 0.6rem 0 0.8rem; font-size: 0.8rem; }
    .tree li { position: relative; margin: 3px 0; }
    .tree ul li::before { content: ''; position: absolute; left: -0.8rem; top: 0.75em; width: 0.6rem; border-top: 1px solid var(--border-color); }
    .tree ul { border-left: 1px solid var(--border-color); margin-left: 0.4rem; }
    .node { display: inline-block; padding: 1px 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); }
    .node.root { font-weight: 700; }
    .node.shelf { border-style: dashed; }
    .node.new { background: rgba(139, 92, 246, 0.16); border-color: #8b5cf6; }
    .node.ghost { color: var(--text-muted); border-style: dotted; }
    .node b { color: #8b5cf6; }
    .mul { font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.7rem; color: var(--text-muted); margin-left: 0.35em; }
    .w-msg { margin-top: 0.7rem; }
  `]
})
export class BomExplodeWidget {
  readonly steps = STEPS;
  readonly top = STEPS[0];
  si = signal(0);
  list = signal(false);

  kids(child: number) { return BOM.filter(b => b[0] === child).map(([, c, qty]) => ({ child: c, qty })); }
  name(id: number) { return PARTS[id].name; }
  isShelf(id: number) { return PARTS[id].productId !== null; }

  private produced = computed(() => STEPS.slice(0, this.si() + 1).flat().sort(byName));
  rows = computed<Cell[][]>(() => this.produced().map(o => [o.lvl, PARTS[o.parent].name, PARTS[o.child].name, o.total]));
  rowClass = computed(() => this.produced().map(o => (o.step === this.si() ? 'pick' : '')));

  shopping = computed<Cell[][]>(() => {
    const all = STEPS.flat().filter(o => PARTS[o.child].productId !== null);
    return [...new Set(all.map(o => o.child))].map(id => {
      const p = PRODUCTS.find(x => x.ProductId === PARTS[id].productId)!, qty = all.filter(o => o.child === id).reduce((s, o) => s + o.total, 0);
      return { name: p.Name, qty, price: p.Price, cost: qty * p.Price };
    }).sort((a, b) => b.cost - a.cost).map(x => [x.name, x.qty, money(x.price), money(x.cost)]);
  });

  message = computed(() => {
    const k = this.si(), last = STEPS.length - 1, n = STEPS[k].length;
    if (k === 0) return `The anchor reads the Bom rows whose parent is the kit (part 1): ${n} rows at level 1. TotalQty is just Qty here.`;
    if (k < last) return `Step ${k} joins Bom to the ${STEPS[k - 1].length} rows of the step before (purple are new) and multiplies: 4 wall panels × 5 lengths = 20. Screws have no parts of their own, so they produce nothing.`;
    return `Step ${k} joins Bom to the ${STEPS[k - 1].length} shelf items from step ${k - 1}, but none of them has parts, so it produces 0 rows and the recursion stops. ${this.list() ? 'Grouped by product: 32 timber, 8 plywood, 3 boxes of screws, 589.30 in all.' : 'Tick “Shopping list” to add up each product.'}`;
  });
}
