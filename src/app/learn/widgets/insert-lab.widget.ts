import { Component } from '@angular/core';
import { Scenario, ScenarioLabComponent } from './scenario-lab.component';

/** Every result and message below was produced by SQL Server 2022 on a fresh BuildMart. */
const SCENARIOS: Scenario[] = [
  { label: 'One row', sql: 'INSERT INTO dbo.Categories (CategoryId, Name)\nVALUES (8, N\'Garden\');\n\nSELECT * FROM dbo.Categories WHERE CategoryId >= 6;',
    cols: ['CategoryId', 'Name'], rows: [[6, 'Safety'], [7, 'Plumbing'], [8, 'Garden']], rowClass: ['', '', 'on'],
    note: 'The column list says which columns the values go into, in order: 8 goes into CategoryId, Garden into Name.' },
  { label: 'Several rows', sql: 'INSERT INTO dbo.Categories (CategoryId, Name)\nVALUES (8, N\'Garden\'),\n       (9, N\'Electrical\');\n\nSELECT * FROM dbo.Categories WHERE CategoryId >= 6;',
    cols: ['CategoryId', 'Name'], rows: [[6, 'Safety'], [7, 'Plumbing'], [8, 'Garden'], [9, 'Electrical']], rowClass: ['', '', 'on', 'on'],
    note: 'One INSERT can add many rows: one bracketed list per row, separated by commas. Either all of them are added or none are.' },
  { label: 'IDENTITY fills the key', sql: 'INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)\nVALUES (N\'Spirit level\', 1, 15.00, 20, N\'each\', \'2024-07-01\');\n\nSELECT ProductId, Name, Price FROM dbo.Products WHERE ProductId >= 11;',
    cols: ['ProductId', 'Name', 'Price'], rows: [[11, 'Paint roller set', '12.50'], [12, 'Safety goggles', '6.80'], [13, 'Spirit level', '15.00']], rowClass: ['', '', 'on'],
    note: 'ProductId is an IDENTITY column, so you leave it out and SQL Server numbers the new row itself: 13.' },
  { label: 'Too few values', sql: 'INSERT INTO dbo.Categories (CategoryId, Name)\nVALUES (8);',
    error: 'Msg 109, Level 15: There are more columns in the INSERT statement than values specified in the VALUES clause. The number of values in the VALUES clause must match the number of columns specified in the INSERT statement.',
    note: 'Two columns listed, one value given. The counts must match exactly.' },
  { label: 'A required column left out', sql: 'INSERT INTO dbo.Products (Name, Price)\nVALUES (N\'Spirit level\', 15.00);',
    error: 'Msg 515, Level 16: Cannot insert the value NULL into column \'AddedOn\', table \'BuildMart.dbo.Products\'; column does not allow nulls. INSERT fails.',
    note: 'Columns you leave out get NULL (or their DEFAULT). Stock, Unit and AddedOn are NOT NULL with no default, so the row is refused. SQL Server names the first one it trips over.' },
  { label: 'A value for IDENTITY', sql: 'INSERT INTO dbo.Products (ProductId, Name, CategoryId, Price, Stock, Unit, AddedOn)\nVALUES (13, N\'Spirit level\', 1, 15.00, 20, N\'each\', \'2024-07-01\');',
    error: 'Msg 544, Level 16: Cannot insert explicit value for identity column in table \'Products\' when IDENTITY_INSERT is set to OFF.',
    note: 'You cannot choose the number for an IDENTITY column (unless you switch IDENTITY_INSERT on, which is for data migrations).' },
  { label: 'Wrong type', sql: 'INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)\nVALUES (N\'Spirit level\', 1, N\'cheap\', 20, N\'each\', \'2024-07-01\');',
    error: 'Msg 8114, Level 16: Error converting data type nvarchar to numeric.',
    note: 'Price is decimal(10,2), and the text cheap cannot be converted to a number. Column types protect the data on every INSERT.' }
];

@Component({
  selector: 'w-insert-lab',
  standalone: true,
  imports: [ScenarioLabComponent],
  template: `<app-scenario-lab heading="Try some INSERT statements" setup="Each statement runs on a fresh copy of BuildMart." [scenarios]="scenarios" />`
})
export class InsertLabWidget {
  readonly scenarios = SCENARIOS;
}
