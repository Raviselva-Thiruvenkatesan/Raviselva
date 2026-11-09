import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell } from './sql-data';

interface Table { name: string; key: string; cols: string[]; rows: Cell[][] }
interface Stage { tab: string; title: string; tables: Table[]; text: string }

const ASHA = 'asha@example.com';
const NEW_EMAIL = 'asha.p@example.com';

const STAGES: Stage[] = [
  {
    tab: 'Unnormalised', title: 'One sheet, lists in cells',
    tables: [{
      name: 'OrderSheet', key: 'OrderId', cols: ['OrderId', 'OrderDate', 'Customer', 'Email', 'Products', 'Quantities'], rows: [
        [1, '2024-02-03', 'Asha Patel', ASHA, 'Claw hammer, Tape measure 8 m', '1, 2'],
        [2, '2024-02-10', 'Ben Carter', null, 'Cement 25 kg, Sand 25 kg', '10, 10'],
        [3, '2024-03-01', 'Asha Patel', ASHA, 'Cordless drill, Wood screws (200)', '1, 2']
      ]
    }],
    text: 'The Products and Quantities cells hold lists. You cannot join on them, index them or add them up without cutting text apart, and nothing keeps the two lists the same length. First normal form (1NF): one value per cell, no repeating groups, and a key that identifies each row.'
  },
  {
    tab: '1NF', title: 'One row per order line',
    tables: [{
      name: 'OrderLines', key: 'OrderId + ProductId', cols: ['OrderId', 'ProductId', 'OrderDate', 'Customer', 'Email', 'Product', 'CategoryId', 'Category', 'Quantity'], rows: [
        [1, 1, '2024-02-03', 'Asha Patel', ASHA, 'Claw hammer', 1, 'Tools', 1],
        [1, 3, '2024-02-03', 'Asha Patel', ASHA, 'Tape measure 8 m', 1, 'Tools', 2],
        [2, 4, '2024-02-10', 'Ben Carter', null, 'Cement 25 kg', 2, 'Building', 10],
        [2, 5, '2024-02-10', 'Ben Carter', null, 'Sand 25 kg', 2, 'Building', 10],
        [3, 2, '2024-03-01', 'Asha Patel', ASHA, 'Cordless drill', 1, 'Tools', 1],
        [3, 8, '2024-03-01', 'Asha Patel', ASHA, 'Wood screws (200)', 4, 'Fixings', 2]
      ]
    }],
    text: 'Every cell holds one value, and OrderId + ProductId identifies a row. But OrderDate, Customer and Email depend only on OrderId, and Product and Category only on ProductId: on part of the key. So Asha’s email is stored four times. You also cannot add a product nobody has ordered (no OrderId to put in the key), and deleting Ben’s order lines deletes everything you knew about Ben. Second normal form (2NF): every column depends on the whole key.'
  },
  {
    tab: '2NF', title: 'Split by what each column depends on',
    tables: [
      { name: 'Orders', key: 'OrderId', cols: ['OrderId', 'OrderDate', 'Customer', 'Email'], rows: [
        [1, '2024-02-03', 'Asha Patel', ASHA], [2, '2024-02-10', 'Ben Carter', null], [3, '2024-03-01', 'Asha Patel', ASHA]] },
      { name: 'OrderItems', key: 'OrderId + ProductId', cols: ['OrderId', 'ProductId', 'Quantity'], rows: [[1, 1, 1], [1, 3, 2], [2, 4, 10], [2, 5, 10], [3, 2, 1], [3, 8, 2]] },
      { name: 'Products', key: 'ProductId', cols: ['ProductId', 'Name', 'CategoryId', 'Category'], rows: [
        [1, 'Claw hammer', 1, 'Tools'], [2, 'Cordless drill', 1, 'Tools'], [3, 'Tape measure 8 m', 1, 'Tools'],
        [4, 'Cement 25 kg', 2, 'Building'], [5, 'Sand 25 kg', 2, 'Building'], [8, 'Wood screws (200)', 4, 'Fixings']] }
    ],
    text: 'Each column now depends on its table’s whole key. Some still depend on it only indirectly: Email belongs to the customer, not to the order (OrderId → Customer → Email), and the category name belongs to the CategoryId (ProductId → CategoryId → Category). Asha’s email is still stored twice and “Tools” three times. Third normal form (3NF): no column depends on another non-key column.'
  },
  {
    tab: '3NF', title: 'Every fact stored once',
    tables: [
      { name: 'Customers', key: 'CustomerId', cols: ['CustomerId', 'Name', 'Email'], rows: [[1, 'Asha Patel', ASHA], [2, 'Ben Carter', null]] },
      { name: 'Orders', key: 'OrderId', cols: ['OrderId', 'CustomerId', 'OrderDate'], rows: [[1, 1, '2024-02-03'], [2, 2, '2024-02-10'], [3, 1, '2024-03-01']] },
      { name: 'OrderItems', key: 'OrderId + ProductId', cols: ['OrderId', 'ProductId', 'Quantity'], rows: [[1, 1, 1], [1, 3, 2], [2, 4, 10], [2, 5, 10], [3, 2, 1], [3, 8, 2]] },
      { name: 'Products', key: 'ProductId', cols: ['ProductId', 'Name', 'CategoryId'], rows: [
        [1, 'Claw hammer', 1], [2, 'Cordless drill', 1], [3, 'Tape measure 8 m', 1], [4, 'Cement 25 kg', 2], [5, 'Sand 25 kg', 2], [8, 'Wood screws (200)', 4]] },
      { name: 'Categories', key: 'CategoryId', cols: ['CategoryId', 'Name'], rows: [[1, 'Tools'], [2, 'Building'], [4, 'Fixings']] }
    ],
    text: 'Every non-key column depends on the key, the whole key and nothing but the key. Each fact lives in exactly one row, so it cannot disagree with itself, and a customer or product can exist before anyone orders. This is BuildMart’s design; joins put the original sheet back together whenever you need it.'
  }
];

/** Normalise a flat order sheet step by step, and watch an update anomaly appear (and disappear) along the way. */
@Component({
  selector: 'w-normal-forms',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From one sheet to third normal form</h3></div>
      <div class="w-controls" role="tablist" aria-label="Normal form">
        @for (s of stages; track s.tab; let i = $index) {
          <button type="button" role="tab" class="w-btn" [class.on]="si() === i" [attr.aria-selected]="si() === i" (click)="si.set(i)">{{ s.tab }}</button>
        }
      </div>
      <div class="w-controls">
        <label class="check"><input type="checkbox" [checked]="changed()" (change)="changed.set(!changed())" />
          Asha changes her email: <span class="mono">UPDATE … WHERE OrderId = 1</span>{{ si() === 3 ? ' (Customers: WHERE CustomerId = 1)' : '' }}</label>
      </div>
      <p class="stitle">{{ stage().title }}</p>
      @for (t of tables(); track t.name) {
        <div class="tbl"><span class="tn">{{ t.name }}</span> <span class="key">key: {{ t.key }}</span></div>
        <app-sql-grid [cols]="t.cols" [rows]="t.rows" [rowClass]="t.cls" [label]="t.name" />
      }
      @if (changed()) {
        <div class="w-msg" [class.err]="stale() > 0" [class.ok]="stale() === 0" aria-live="polite"><span>{{ anomaly() }}</span></div>
      }
      <div class="w-msg info"><span>{{ stage().text }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .check { display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 0.84rem; cursor: pointer; }
    .check input { accent-color: #ef4444; }
    .check .mono { font-size: 0.76rem; }
    .stitle { font-weight: 700; margin: 0.4rem 0 0.2rem; }
    .tbl { display: flex; gap: 0.6rem; align-items: baseline; margin: 0.7rem 0 0.3rem; }
    .tn { font-weight: 700; font-size: 0.86rem; }
    .key { font-size: 0.74rem; color: var(--text-muted); }
    .w-msg { margin-top: 0.7rem; }
  `]
})
export class NormalFormsWidget {
  readonly stages = STAGES;
  si = signal(0);
  changed = signal(false);

  stage = computed(() => STAGES[this.si()]);

  /** With the change on, the rows of order 1 (or Asha's Customers row) get the new email; amber marks the copies left behind. */
  tables = computed(() => this.stage().tables.map(t => {
    const e = t.cols.indexOf('Email'), o = t.cols.indexOf('OrderId');
    const cls: string[] = [];
    const rows = t.rows.map(r => {
      if (e < 0 || r[e] !== ASHA || !this.changed()) { cls.push(''); return r; }
      if (o < 0 || r[o] === 1) { cls.push('pick'); return r.map((v, k) => (k === e ? NEW_EMAIL : v)); }
      cls.push('tie');
      return r;
    });
    return { ...t, rows, cls };
  }));

  stale = computed(() => this.tables().reduce((n, t) => n + t.cls.filter(c => c === 'tie').length, 0));

  anomaly = computed(() => {
    const n = this.stale();
    if (n === 0) return 'One row changed, and Asha’s email is now right everywhere, because it is stored in one place only.';
    return `Update anomaly: order 1 now has the new email (purple), but ${n} other row${n === 1 ? ' still has' : 's still have'} the old one (amber). Which is right? The database now disagrees with itself, and every query that reads Asha’s email may give a different answer.`;
  });
}
