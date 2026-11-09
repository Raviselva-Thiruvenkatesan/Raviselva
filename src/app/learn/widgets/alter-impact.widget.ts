import { Component } from '@angular/core';
import { Cell } from './sql-data';
import { Scenario, ScenarioLabComponent } from './scenario-lab.component';

const BASE = ['ProductId', 'Name', 'CategoryId', 'Price', 'Stock', 'Unit', 'AddedOn'];
const ROWS: Cell[][] = [
  [1, 'Claw hammer', 1, '18.50', 40, 'each', '2023-01-15'],
  [2, 'Cordless drill', 1, '89.00', 12, 'each', '2023-02-01'],
  [3, 'Tape measure 8 m', 1, '9.75', 65, 'each', '2023-01-15']
];
const SHOW = '\nGO\nSELECT TOP (3) * FROM dbo.Products ORDER BY ProductId;';

/** Every result and message below was produced by SQL Server 2022 on a fresh BuildMart (12 products). */
const SCENARIOS: Scenario[] = [
  { label: 'Add a NULL column', sql: 'ALTER TABLE dbo.Products ADD Barcode varchar(13) NULL;' + SHOW,
    cols: [...BASE, 'Barcode'], rows: ROWS.map(r => [...r, null]),
    note: 'Instant, even on a huge table: existing rows simply have no barcode yet.' },
  { label: 'Add NOT NULL, no default', sql: 'ALTER TABLE dbo.Products ADD WeightKg decimal(6,2) NOT NULL;',
    error: 'Msg 4901, Level 16: ALTER TABLE only allows columns to be added that can contain nulls, or have a DEFAULT definition specified, or the column being added is an identity or timestamp column, or alternatively if none of the previous conditions are satisfied the table must be empty to allow addition of this column. Column \'WeightKg\' cannot be added to non-empty table \'Products\' because it does not satisfy these conditions.',
    note: 'The 12 existing rows would need a weight, and none is given. Add it as NULL, fill it in, then make it NOT NULL; or give a DEFAULT.' },
  { label: 'Add NOT NULL with DEFAULT', sql: 'ALTER TABLE dbo.Products\n    ADD IsActive bit NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT 1;' + SHOW,
    cols: [...BASE, 'IsActive'], rows: ROWS.map(r => [...r, 1]),
    note: 'With a DEFAULT, every existing row gets the value 1, so NOT NULL is satisfied.' },
  { label: 'Widen a column', sql: 'ALTER TABLE dbo.Products ALTER COLUMN Name nvarchar(100) NOT NULL;' + SHOW,
    cols: BASE, rows: ROWS,
    note: 'Making a column longer never loses data. Restate NOT NULL: ALTER COLUMN without it makes the column nullable.' },
  { label: 'Shrink a column', sql: 'ALTER TABLE dbo.Products ALTER COLUMN Name nvarchar(10) NOT NULL;',
    error: 'Msg 2628, Level 16: String or binary data would be truncated in table \'BuildMart.dbo.Products\', column \'Name\'. Truncated value: \'\'.',
    note: 'Names such as Cordless drill are longer than 10 characters, so SQL Server refuses rather than cutting them.' },
  { label: 'Change decimal to int', sql: 'ALTER TABLE dbo.Products ALTER COLUMN Price int NOT NULL;' + SHOW,
    cols: BASE, rows: ROWS.map(r => [r[0], r[1], r[2], [18, 89, 9][ROWS.indexOf(r)], r[4], r[5], r[6]]), rowClass: ['tie', '', 'tie'], warn: true,
    note: 'Dangerous: no error, but every price lost its pence. 18.50 became 18 and 9.75 became 9 (cut off, not rounded). There is no undo apart from a backup.' },
  { label: 'Rename a column', sql: 'EXEC sp_rename \'dbo.Products.Stock\', \'QtyInStock\', \'COLUMN\';' + SHOW,
    cols: ['ProductId', 'Name', 'CategoryId', 'Price', 'QtyInStock', 'Unit', 'AddedOn'], rows: ROWS, warn: true,
    note: 'SQL Server warns: “Caution: Changing any part of an object name could break scripts and stored procedures.” Every query that says Stock is now broken.' },
  { label: 'Drop a column', sql: 'ALTER TABLE dbo.Products DROP COLUMN Unit;' + SHOW,
    cols: ['ProductId', 'Name', 'CategoryId', 'Price', 'Stock', 'AddedOn'], rows: ROWS.map(r => [r[0], r[1], r[2], r[3], r[4], r[6]]),
    note: 'The column and all its data are gone for good.' },
  { label: 'Drop a key column', sql: 'ALTER TABLE dbo.Products DROP COLUMN CategoryId;',
    error: 'Msg 5074, Level 16: The object \'FK__Products__Catego__398D8EEE\' is dependent on column \'CategoryId\'.\nMsg 4922, Level 16: ALTER TABLE DROP COLUMN CategoryId failed because one or more objects access this column.',
    note: 'A foreign key uses the column, so it must be dropped first. The odd name is one SQL Server made up because the setup script did not name the constraint; the random part differs on every server.' },
  { label: 'Drop a referenced table', sql: 'DROP TABLE dbo.Categories;',
    error: 'Msg 3726, Level 16: Could not drop object \'dbo.Categories\' because it is referenced by a FOREIGN KEY constraint.',
    note: 'Products points at Categories. SQL Server will not leave products pointing at categories that no longer exist.' }
];

@Component({
  selector: 'w-alter-impact',
  standalone: true,
  imports: [ScenarioLabComponent],
  template: `<app-scenario-lab heading="Change a table that already has data" setup="Each statement runs on a fresh BuildMart, where dbo.Products holds 12 rows. The grid shows the first three rows afterwards." [scenarios]="scenarios" />`
})
export class AlterImpactWidget {
  readonly scenarios = SCENARIOS;
}
