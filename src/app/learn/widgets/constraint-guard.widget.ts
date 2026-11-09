import { Component } from '@angular/core';
import { Scenario, ScenarioLabComponent } from './scenario-lab.component';

const COLS = ['SupplierId', 'Name', 'Email', 'Rating', 'CategoryId'];
const FIRST = [1, 'Northern Timber', 'sales@ntimber.example', 4, 3];
const ins = (values: string) => `INSERT INTO dbo.Suppliers (SupplierId, Name, Email, Rating, CategoryId)\nVALUES (${values});`;

/** Every result and message below was produced by SQL Server 2022. */
const SCENARIOS: Scenario[] = [
  { label: 'A valid row', sql: ins('2, N\'Pennine Fixings\', N\'orders@pennine.example\', 5, 4'),
    cols: COLS, rows: [FIRST, [2, 'Pennine Fixings', 'orders@pennine.example', 5, 4]], rowClass: ['', 'on'],
    note: 'Every rule passes: a new id, a name, an email nobody else has, a rating from 1 to 5 and a category that exists.' },
  { label: 'Defaults', sql: 'INSERT INTO dbo.Suppliers (SupplierId, Name)\nVALUES (2, N\'Yorkshire Paints\');',
    cols: COLS, rows: [FIRST, [2, 'Yorkshire Paints', null, 3, null]], rowClass: ['', 'on'],
    note: 'Rating was left out, so its DEFAULT (3) was used. Email and CategoryId allow NULL and have no default, so they are NULL.' },
  { label: 'PRIMARY KEY', sql: ins('1, N\'Yorkshire Paints\', N\'hello@ypaints.example\', 4, 5'),
    error: 'Msg 2627, Level 14: Violation of PRIMARY KEY constraint \'PK_Suppliers\'. Cannot insert duplicate key in object \'dbo.Suppliers\'. The duplicate key value is (1).',
    note: 'SupplierId 1 is taken. A primary key is unique and never NULL, so every row can be found by it.' },
  { label: 'NOT NULL', sql: ins('2, NULL, N\'hello@ypaints.example\', 4, 5'),
    error: 'Msg 515, Level 16: Cannot insert the value NULL into column \'Name\', table \'BuildMart.dbo.Suppliers\'; column does not allow nulls. INSERT fails.',
    note: 'Name is NOT NULL: a supplier without a name is not allowed.' },
  { label: 'UNIQUE', sql: ins('2, N\'Yorkshire Paints\', N\'sales@ntimber.example\', 4, 5'),
    error: 'Msg 2627, Level 14: Violation of UNIQUE KEY constraint \'UQ_Suppliers_Email\'. Cannot insert duplicate key in object \'dbo.Suppliers\'. The duplicate key value is (sales@ntimber.example).',
    note: 'That email already belongs to Northern Timber.' },
  { label: 'UNIQUE and NULL', sql: 'INSERT INTO dbo.Suppliers (SupplierId, Name) VALUES (2, N\'Yorkshire Paints\');\nINSERT INTO dbo.Suppliers (SupplierId, Name) VALUES (3, N\'Dales Plumbing\');',
    error: 'Msg 2627, Level 14: Violation of UNIQUE KEY constraint \'UQ_Suppliers_Email\'. Cannot insert duplicate key in object \'dbo.Suppliers\'. The duplicate key value is (<NULL>).',
    note: 'A surprise: in SQL Server a UNIQUE constraint allows only one NULL. The first supplier without an email went in; the second did not. A filtered unique index (WHERE Email IS NOT NULL) allows many.' },
  { label: 'CHECK', sql: ins('2, N\'Yorkshire Paints\', N\'hello@ypaints.example\', 9, 5'),
    error: 'Msg 547, Level 16: The INSERT statement conflicted with the CHECK constraint "CK_Suppliers_Rating". The conflict occurred in database "BuildMart", table "dbo.Suppliers", column \'Rating\'.',
    note: 'The rule Rating BETWEEN 1 AND 5 is false for 9.' },
  { label: 'FOREIGN KEY', sql: ins('2, N\'Yorkshire Paints\', N\'hello@ypaints.example\', 4, 99'),
    error: 'Msg 547, Level 16: The INSERT statement conflicted with the FOREIGN KEY constraint "FK_Suppliers_Categories". The conflict occurred in database "BuildMart", table "dbo.Categories", column \'CategoryId\'.',
    note: 'There is no category 99. A foreign key only accepts values that exist in the table it points at (or NULL).' }
];

@Component({
  selector: 'w-constraint-guard',
  standalone: true,
  imports: [ScenarioLabComponent],
  template: `<app-scenario-lab heading="Which rule stops the row?" setup="dbo.Suppliers already holds one row: (1, Northern Timber, sales@ntimber.example, 4, 3). Try to add another." [scenarios]="scenarios" />`
})
export class ConstraintGuardWidget {
  readonly scenarios = SCENARIOS;
}
