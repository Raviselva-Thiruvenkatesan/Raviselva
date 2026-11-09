import { Lesson } from '../learn.types';
import { sql } from './sql';

export const CHANGING_DATA: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'create-table',
    title: 'Creating tables and choosing types',
    summary: 'Write CREATE TABLE statements: columns, types, NULL rules and a primary key. Plus computed columns, temporary tables and scripts you can safely run twice.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'So far you have read BuildMart’s tables. Now you will build your own. `CREATE TABLE` names the table and lists its columns, each with a **type** and a **NULL rule**. BuildMart is about to start buying from suppliers, so it needs a Suppliers table:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Suppliers (
    SupplierId  int           NOT NULL IDENTITY PRIMARY KEY,
    Name        nvarchar(60)  NOT NULL,
    Phone       varchar(20)   NULL,
    CreditLimit decimal(10,2) NOT NULL,
    Rating      tinyint       NULL,
    CreatedAt   datetime2(0)  NOT NULL
);

SELECT * FROM dbo.Suppliers;`, output: 'SupplierId  Name  Phone  CreditLimit  Rating  CreatedAt\n----------  ----  -----  -----------  ------  ---------' },
      { type: 'p', text: 'The table exists and is empty: the SELECT shows its columns and no rows. Line by line:' },
      { type: 'ul', items: [
        '`dbo.Suppliers`: always include the schema when you create something.',
        '`NOT NULL` / `NULL`: whether a value is required. If you leave it out, SQL Server usually assumes NULL is allowed, so say it every time.',
        '`IDENTITY`: SQL Server numbers new rows itself (1, 2, 3, …). It has its own lesson later in this module.',
        '`PRIMARY KEY`: the column that identifies each row. It must be unique and can never be NULL.'
      ] },
      { type: 'h2', text: 'Design it yourself' },
      { type: 'p', text: 'The design below starts with several classic mistakes. Fix the types, NULL rules and key until the warnings disappear:' },
      { type: 'widget', name: 'table-designer' },
      { type: 'h2', text: 'Choosing a type: a checklist' },
      { type: 'table', head: ['The data is…', 'Use', 'Not'], rows: [
        ['an id or a count', '`int` (or `bigint` for billions)', 'text, `float`'],
        ['money, a price, a measurement', '`decimal(p, s)`', '`float`, `money` (it rounds oddly in division)'],
        ['text a person types', '`nvarchar(n)` with a realistic n', '`nvarchar(max)` “just in case”'],
        ['a code you control (`Shipped`, `GB`)', '`varchar(n)` or `char(n)`', '`nvarchar(max)`'],
        ['a phone number, a postcode, an account number', '`varchar(n)`: it is text that happens to contain digits', '`int` (loses leading zeros)'],
        ['a date', '`date`', 'text'],
        ['a moment in time', '`datetime2(0)` (to the second) or `datetimeoffset`', 'text, the older `datetime`'],
        ['yes / no', '`bit`', '`char(1)` with Y and N']
      ] },
      { type: 'h2', text: 'Primary keys: natural or surrogate?' },
      { type: 'p', text: 'A **natural key** is a real-world value that is already unique, such as an ISBN or a country code. A **surrogate key** is a number made up for the purpose, such as `SupplierId`. Natural keys sound neat but have a habit of changing (people change email addresses, companies change names) or turning out not to be unique. Most tables use a surrogate `int IDENTITY` key and add a UNIQUE constraint on the natural value; the Constraints lesson shows how.' },
      { type: 'h2', text: 'Computed columns' },
      { type: 'p', text: 'A column can be defined as an expression of other columns. It is worked out whenever you read it, so it can never disagree with them:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.QuoteLines (
    QuoteLineId int           NOT NULL IDENTITY PRIMARY KEY,
    Product     nvarchar(60)  NOT NULL,
    Quantity    int           NOT NULL,
    UnitPrice   decimal(10,2) NOT NULL,
    LineTotal   AS (Quantity * UnitPrice)
);

INSERT INTO dbo.QuoteLines (Product, Quantity, UnitPrice)
VALUES (N'Cement 25 kg', 20, 7.20), (N'Sand 25 kg', 15, 4.10);

SELECT Product, Quantity, UnitPrice, LineTotal FROM dbo.QuoteLines;`, output: 'Product       Quantity  UnitPrice  LineTotal\n------------  --------  ---------  ---------\nCement 25 kg        20       7.20     144.00\nSand 25 kg          15       4.10      61.50' },
      { type: 'note', kind: 'info', text: 'The INSERT is the next lesson’s topic; here it just puts two rows in so you can see LineTotal worked out. Notice that it never names LineTotal: you cannot write to a computed column.' },
      { type: 'h2', text: 'Temporary tables' },
      { type: 'p', text: 'A table whose name starts with `#` is **temporary**: it lives in `tempdb`, only your connection can see it, and it disappears when you disconnect. It is handy for holding intermediate results while you work something out.' },
      { type: 'code', code: sql`
CREATE TABLE #Basket (
    ProductId int NOT NULL,
    Quantity  int NOT NULL
);

INSERT INTO #Basket (ProductId, Quantity) VALUES (4, 10), (5, 10);

SELECT * FROM #Basket;`, output: 'ProductId  Quantity\n---------  --------\n        4        10\n        5        10' },
      { type: 'h2', text: 'Scripts you can run twice' },
      { type: 'p', text: 'Run the same CREATE TABLE twice and the second run fails, because the name is taken:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Products (ProductId int);`, output: 'Msg 2714, Level 16, State 6, Line 1\nThere is already an object named \'Products\' in the database.' },
      { type: 'p', text: '`DROP TABLE IF EXISTS` removes a table only when it is there, which is how BuildMart’s setup script can be re-run to reset everything. Use it in scripts that build test data; never casually against real data, because the rows go with the table.' },
      { type: 'code', code: sql`
DROP TABLE IF EXISTS dbo.Deliveries;

CREATE TABLE dbo.Deliveries (
    DeliveryId  int          NOT NULL IDENTITY PRIMARY KEY,
    OrderId     int          NOT NULL,
    DeliveredOn date         NULL
);

SELECT name FROM sys.tables WHERE name = 'Deliveries';`, output: 'name\n----------\nDeliveries' },
      { type: 'quiz', question: 'Which type suits a UK phone number such as 01904 555 010?', options: ['`int`', '`bigint`', '`varchar(20)`', '`decimal(11,0)`'], answer: 2, explain: 'A phone number is text made of digits: numeric types drop the leading 0 and cannot hold spaces or a + sign.' },
      { type: 'quiz', question: 'What happens to a `#Basket` table when your SSMS window disconnects?', options: ['It is saved in BuildMart', 'It is dropped automatically', 'Other users can still see it', 'It becomes a view'], answer: 1, explain: 'Local temporary tables belong to one connection and are dropped when it closes.' },
      { type: 'exercise', task: 'Create a table `dbo.Vans` for BuildMart’s delivery vans: `VanId` (a whole-number IDENTITY primary key), `Registration` (up to 8 characters, required), `PayloadKg` (a whole number, required) and `LastServiced` (a date, may be unknown). Then list its columns and NULL rules from `INFORMATION_SCHEMA.COLUMNS`.', hint: 'Registration plates are codes you control, so `varchar(8)` fits. Order the column list by ORDINAL_POSITION.', solution: sql`
CREATE TABLE dbo.Vans (
    VanId        int        NOT NULL IDENTITY PRIMARY KEY,
    Registration varchar(8) NOT NULL,
    PayloadKg    int        NOT NULL,
    LastServiced date       NULL
);

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Vans'
ORDER BY ORDINAL_POSITION;`, output: 'COLUMN_NAME   DATA_TYPE  IS_NULLABLE\n------------  ---------  -----------\nVanId         int        NO\nRegistration  varchar    NO\nPayloadKg     int        NO\nLastServiced  date       YES' }
    ],
    keyPoints: [
      '`CREATE TABLE schema.Name (column type NULL|NOT NULL, …)`; say NULL or NOT NULL for every column.',
      'Choose types by what the data means: ids `int`, money `decimal`, people’s text `nvarchar(n)`, codes `varchar`, dates `date`.',
      'Every table needs a primary key: unique, never NULL, ideally a short surrogate `int IDENTITY`.',
      'Computed columns (`AS expression`) are worked out on read and cannot be written to.',
      '`#Temp` tables live only for your connection; `DROP TABLE IF EXISTS` makes setup scripts re-runnable.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'insert',
    title: 'Adding rows with INSERT',
    summary: 'Add one row or many with INSERT … VALUES, copy rows with INSERT … SELECT, create a table from a query with SELECT INTO, and see the new rows with OUTPUT.',
    minutes: 14,
    blocks: [
      { type: 'p', text: '`INSERT` adds rows to a table. Name the table, list the columns you are filling, and give the values in the same order:' },
      { type: 'code', code: sql`
INSERT INTO dbo.Categories (CategoryId, Name)
VALUES (8, N'Garden');

SELECT * FROM dbo.Categories WHERE CategoryId >= 7;`, output: 'CategoryId  Name\n----------  --------\n         7  Plumbing\n         8  Garden' },
      { type: 'p', text: 'Try the statements below, including the ones that fail. Each runs on a fresh BuildMart, and every message is SQL Server’s own:' },
      { type: 'widget', name: 'insert-lab' },
      { type: 'h2', text: 'Columns you leave out' },
      { type: 'p', text: 'A column missing from the list gets its **DEFAULT** value if it has one, an IDENTITY number if it is an IDENTITY column, and otherwise NULL. If it is NOT NULL with no default, the whole INSERT fails. Products needs every column except ProductId:' },
      { type: 'code', code: sql`
INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (N'Spirit level 600 mm', 1, 15.00, 20, N'each', '2024-07-01'),
       (N'Mortar mix 20 kg',    2,  6.40, 90, N'bag',  '2024-07-01');

SELECT ProductId, Name, Price, Stock FROM dbo.Products WHERE ProductId > 11;`, output: 'ProductId  Name                 Price  Stock\n---------  -------------------  -----  -----\n       12  Safety goggles        6.80      0\n       13  Spirit level 600 mm  15.00     20\n       14  Mortar mix 20 kg      6.40     90' },
      { type: 'note', kind: 'warn', text: 'You may leave out the column list (`INSERT INTO dbo.Categories VALUES (8, N\'Garden\')`), and the values then go into every column in table order. Do not: the statement breaks, or worse, silently puts values in the wrong columns, as soon as someone adds or reorders a column. Always list the columns.' },
      { type: 'h2', text: 'INSERT … SELECT: copy rows from a query' },
      { type: 'p', text: 'Instead of VALUES, an INSERT can take the result of a SELECT. Every row the query returns is inserted. Here BuildMart keeps a list of products to reorder:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Reorders (
    ProductId int          NOT NULL PRIMARY KEY,
    Name      nvarchar(60) NOT NULL,
    Quantity  int          NOT NULL
);

INSERT INTO dbo.Reorders (ProductId, Name, Quantity)
SELECT ProductId, Name, 100
FROM dbo.Products
WHERE Stock < 20;

SELECT * FROM dbo.Reorders;`, output: 'ProductId  Name              Quantity\n---------  ----------------  --------\n        2  Cordless drill         100\n        9  Wall plugs (100)       100\n       12  Safety goggles         100' },
      { type: 'h2', text: 'SELECT … INTO: a new table from a query' },
      { type: 'p', text: '`SELECT … INTO NewTable` creates the table and fills it in one go, copying column names and types from the query. It is perfect for a quick backup copy before you change something. It does not copy keys, constraints or indexes.' },
      { type: 'code', code: sql`
SELECT ProductId, Name, Price
INTO dbo.PriceBackup
FROM dbo.Products
WHERE CategoryId = 5;

SELECT * FROM dbo.PriceBackup;`, output: 'ProductId  Name                Price\n---------  ------------------  -----\n       10  Masonry paint 10 L  54.00\n       11  Paint roller set    12.50' },
      { type: 'h2', text: 'OUTPUT: see what was inserted' },
      { type: 'p', text: 'The `OUTPUT` clause returns the rows an INSERT just added, including values SQL Server filled in itself, such as IDENTITY numbers. It goes between the column list and VALUES:' },
      { type: 'code', code: sql`
INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
OUTPUT inserted.ProductId, inserted.Name
VALUES (N'Garden spade', 1, 24.00, 15, N'each', '2024-07-01'),
       (N'Leaf rake',    1, 16.50, 10, N'each', '2024-07-01');`, output: 'ProductId  Name\n---------  ------------\n       13  Garden spade\n       14  Leaf rake' },
      { type: 'quiz', question: 'Which columns can you leave out of an INSERT?', options: ['Any column', 'Only the primary key', 'Columns that allow NULL, have a DEFAULT, or are IDENTITY or computed', 'None: every column must be listed'], answer: 2, explain: 'A missing column needs a value from somewhere: a default, an IDENTITY number, a computed expression, or NULL if it is allowed.' },
      { type: 'quiz', question: 'What does `SELECT * INTO dbo.Copy FROM dbo.Products;` do if dbo.Copy already exists?', options: ['Adds the rows to it', 'Replaces it', 'Fails: SELECT INTO always creates a new table', 'Merges matching rows'], answer: 2, explain: 'SELECT INTO creates the table, so the name must be free. To add rows to an existing table, use INSERT … SELECT.' },
      { type: 'exercise', task: 'BuildMart opens a garden section. Add category 8, `Garden`, then add two products in it in one INSERT: a `Garden hose 30 m` at 27.99 (stock 18, unit `each`) and `Compost 40 L` at 5.49 (stock 60, unit `bag`), both added on 2024-07-01. Finish by listing the Garden products.', hint: 'Two INSERT statements: one into Categories, one into Products with two rows in VALUES. Filter the final SELECT on CategoryId = 8.', solution: sql`
INSERT INTO dbo.Categories (CategoryId, Name)
VALUES (8, N'Garden');

INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (N'Garden hose 30 m', 8, 27.99, 18, N'each', '2024-07-01'),
       (N'Compost 40 L',     8,  5.49, 60, N'bag',  '2024-07-01');

SELECT ProductId, Name, Price, Stock, Unit
FROM dbo.Products
WHERE CategoryId = 8;`, output: 'ProductId  Name              Price  Stock  Unit\n---------  ----------------  -----  -----  ----\n       13  Garden hose 30 m  27.99     18  each\n       14  Compost 40 L       5.49     60  bag' }
    ],
    keyPoints: [
      '`INSERT INTO table (columns) VALUES (…), (…)` adds one or many rows; the value count must match the column count.',
      'Always list the columns, so the statement keeps working when the table changes.',
      'Left-out columns get their DEFAULT, an IDENTITY number, or NULL; NOT NULL columns without a default must be given.',
      '`INSERT … SELECT` copies query results into an existing table; `SELECT … INTO` creates a new one.',
      '`OUTPUT inserted.*` returns the new rows, including generated ids.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'update-delete',
    title: 'Changing and removing rows: UPDATE and DELETE',
    summary: 'Change values with UPDATE and remove rows with DELETE, always with a WHERE clause. Preview with SELECT, use a transaction as a safety net, and see what foreign keys protect.',
    minutes: 16,
    blocks: [
      { type: 'p', text: '`UPDATE` changes values in existing rows. `SET` says which columns get which new values, and `WHERE` says which rows. The WHERE clause is exactly the one you know from SELECT:' },
      { type: 'code', code: sql`
UPDATE dbo.Products
SET Price = 19.99, Stock = Stock + 10
WHERE ProductId = 1;

SELECT @@ROWCOUNT AS RowsUpdated;

SELECT ProductId, Name, Price, Stock FROM dbo.Products WHERE ProductId = 1;`, output: 'RowsUpdated\n-----------\n          1\n\nProductId  Name         Price  Stock\n---------  -----------  -----  -----\n        1  Claw hammer  19.99     50' },
      { type: 'p', text: '`Stock = Stock + 10` reads the old value and writes a new one. Every expression in SET sees the row as it was **before** the update, so the order of the assignments does not matter. `@@ROWCOUNT` tells you how many rows the last statement touched; read it straight away, because the next statement replaces it.' },
      { type: 'widget', name: 'update-delete' },
      { type: 'h2', text: 'The missing WHERE' },
      { type: 'p', text: 'Without WHERE, UPDATE and DELETE affect **every row in the table**. It is the most expensive typo in SQL, and SSMS has no undo button. Three habits protect you:' },
      { type: 'ol', items: [
        '**Write the SELECT first.** Write `SELECT * FROM dbo.Products WHERE …`, check the rows, then change only the first line into `UPDATE … SET …` or `DELETE`.',
        '**Check the row count.** SSMS prints “(n rows affected)”. If you expected 3 and it says 12, stop.',
        '**Use a transaction** when the change matters, so you can look before you commit.'
      ] },
      { type: 'h2', text: 'A transaction as a safety net' },
      { type: 'p', text: '`BEGIN TRANSACTION` starts a unit of work. Nothing is final until `COMMIT`; `ROLLBACK` undoes everything since BEGIN. Here a price rise is checked, found to be wrong, and undone:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;

UPDATE dbo.Products SET Price = Price * 1.10;   -- oops: no WHERE

SELECT TOP (3) Name, Price FROM dbo.Products ORDER BY ProductId;

ROLLBACK;   -- undo it

SELECT TOP (3) Name, Price FROM dbo.Products ORDER BY ProductId;`, output: 'Name              Price\n----------------  -----\nClaw hammer       20.35\nCordless drill    97.90\nTape measure 8 m  10.73\n\nName              Price\n----------------  -----\nClaw hammer       18.50\nCordless drill    89.00\nTape measure 8 m   9.75' },
      { type: 'note', kind: 'warn', text: 'While a transaction is open, the rows it changed stay **locked**, and other users who need them must wait. Look, decide, and COMMIT or ROLLBACK straight away; never leave a transaction open while you go for lunch. The Master level module covers transactions and locking in depth.' },
      { type: 'h2', text: 'OUTPUT: old and new values' },
      { type: 'p', text: 'In an UPDATE, `OUTPUT` can return each row’s value before (`deleted.`) and after (`inserted.`) the change, a built-in audit of what you did:' },
      { type: 'code', code: sql`
UPDATE dbo.Products
SET Price = Price * 1.10
OUTPUT inserted.ProductId, deleted.Price AS OldPrice, inserted.Price AS NewPrice
WHERE CategoryId = 1;`, output: 'ProductId  OldPrice  NewPrice\n---------  --------  --------\n        1     18.50     20.35\n        2     89.00     97.90\n        3      9.75     10.73' },
      { type: 'p', text: 'The new prices are rounded to two decimals as they are stored in the `decimal(10,2)` column: 9.75 × 1.10 = 10.725 becomes 10.73.' },
      { type: 'h2', text: 'DELETE' },
      { type: 'p', text: '`DELETE FROM table WHERE …` removes whole rows. Ella (customer 5) has never placed an order, so she can be removed:' },
      { type: 'code', code: sql`
DELETE FROM dbo.Customers
WHERE CustomerId = 5;

SELECT @@ROWCOUNT AS RowsDeleted;`, output: 'RowsDeleted\n-----------\n          1' },
      { type: 'p', text: 'Asha (customer 1) has orders. Her orders point at her through a **foreign key**, and SQL Server will not leave them pointing at a customer who no longer exists:' },
      { type: 'code', code: sql`
DELETE FROM dbo.Customers
WHERE CustomerId = 1;`, output: 'Msg 547, Level 16, State 0, Line 1\nThe DELETE statement conflicted with the REFERENCE constraint "FK__Orders__Customer__3E52440B". The conflict occurred in database "BuildMart", table "dbo.Orders", column \'CustomerId\'.' },
      { type: 'p', text: 'The strange constraint name was made up by SQL Server, because the setup script did not name the foreign key; on your server the hex digits at the end will differ. Foreign keys are a safety net for DELETE in the same way that types are a safety net for INSERT. The Constraints lesson shows how to choose what happens instead (for example, deleting the orders too).' },
      { type: 'h2', text: 'DELETE or TRUNCATE?' },
      { type: 'table', head: ['', '`DELETE FROM t`', '`TRUNCATE TABLE t`'], rows: [
        ['Removes', 'the rows matching WHERE (all if none)', 'every row; no WHERE allowed'],
        ['Speed on big tables', 'slow: logs every row', 'fast: frees whole pages'],
        ['IDENTITY counter', 'keeps counting', 'resets to the seed'],
        ['Table referenced by a foreign key', 'allowed if no rows are referenced', 'not allowed at all'],
        ['Triggers (Programmability module)', 'fire', 'do not fire']
      ] },
      { type: 'quiz', question: 'After `UPDATE dbo.Products SET Stock = 0 WHERE Unit = N\'tin\';` what does `SELECT @@ROWCOUNT;` return?', options: ['12', '1, the number of tins', '0', 'The new stock value'], answer: 1, explain: 'Only the masonry paint is sold by the tin, so one row was updated, and @@ROWCOUNT reports the rows the last statement touched.' },
      { type: 'quiz', question: 'In `SET Price = Price * 2, Stock = Price`, which Price does Stock get?', options: ['The doubled price', 'The old price', 'It depends on the column order', 'An error'], answer: 1, explain: 'All expressions in SET read the row as it was before the update, so Stock gets the old price.' },
      { type: 'exercise', task: 'Orders that have been Pending since before 1 June 2024 are to be cancelled. Update their `Status` to `Cancelled`, report how many rows changed, then list every order’s id, date and status.', hint: 'Two conditions in WHERE: Status = \'Pending\' AND OrderDate < \'2024-06-01\'. Read @@ROWCOUNT straight after the UPDATE.', solution: sql`
UPDATE dbo.Orders
SET Status = 'Cancelled'
WHERE Status = 'Pending' AND OrderDate < '2024-06-01';

SELECT @@ROWCOUNT AS RowsUpdated;

SELECT OrderId, OrderDate, Status FROM dbo.Orders;`, output: 'RowsUpdated\n-----------\n          1\n\nOrderId  OrderDate   Status\n-------  ----------  ---------\n      1  2024-02-03  Shipped\n      2  2024-02-10  Shipped\n      3  2024-03-01  Shipped\n      4  2024-03-15  Shipped\n      5  2024-04-02  Shipped\n      6  2024-04-20  Cancelled\n      7  2024-05-05  Shipped\n      8  2024-05-18  Cancelled\n      9  2024-06-01  Pending\n     10  2024-06-12  Shipped' }
    ],
    keyPoints: [
      '`UPDATE t SET col = expr, … WHERE …` changes values; every SET expression sees the old row.',
      '`DELETE FROM t WHERE …` removes rows; without WHERE, both statements hit every row.',
      'Preview with SELECT, check the row count, and wrap important changes in BEGIN TRANSACTION … COMMIT / ROLLBACK.',
      '`OUTPUT deleted.x, inserted.x` shows values before and after.',
      'Foreign keys stop deletes that would leave rows pointing at nothing; TRUNCATE is all-or-nothing and resets IDENTITY.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'constraints',
    title: 'Constraints: primary keys, UNIQUE, CHECK and DEFAULT',
    summary: 'Make the database enforce your rules: primary and foreign keys, UNIQUE, CHECK, DEFAULT and NOT NULL. Name them, add them to existing tables, and choose what happens when a parent row is deleted.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Application code has bugs, and data arrives from imports, scripts and other programs. **Constraints** are rules the database itself enforces on every INSERT and UPDATE, from every source. A rule written as a constraint cannot be forgotten.' },
      { type: 'table', head: ['Constraint', 'Rule', 'Example'], rows: [
        ['`NOT NULL`', 'a value is required', 'every supplier has a Name'],
        ['`PRIMARY KEY`', 'unique and not NULL; identifies the row', 'SupplierId'],
        ['`UNIQUE`', 'no two rows share the value', 'no two suppliers share an Email'],
        ['`CHECK`', 'a condition must not be false', 'Rating BETWEEN 1 AND 5'],
        ['`DEFAULT`', 'the value used when none is given', 'Rating defaults to 3'],
        ['`FOREIGN KEY`', 'the value must exist in another table', 'CategoryId must be a real category']
      ] },
      { type: 'h2', text: 'A table with every kind' },
      { type: 'p', text: 'Give each constraint a name with the `CONSTRAINT` keyword. A common pattern is `PK_Table`, `UQ_Table_Column`, `CK_Table_Column`, `DF_Table_Column` and `FK_Child_Parent`. Error messages then tell you exactly which rule failed, and you can drop or change the constraint later by name.' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Suppliers (
    SupplierId int           NOT NULL CONSTRAINT PK_Suppliers PRIMARY KEY,
    Name       nvarchar(60)  NOT NULL,
    Email      nvarchar(100) NULL CONSTRAINT UQ_Suppliers_Email UNIQUE,
    Rating     tinyint       NOT NULL CONSTRAINT DF_Suppliers_Rating DEFAULT 3
                             CONSTRAINT CK_Suppliers_Rating CHECK (Rating BETWEEN 1 AND 5),
    CategoryId int           NULL CONSTRAINT FK_Suppliers_Categories
                             REFERENCES dbo.Categories (CategoryId)
);

INSERT INTO dbo.Suppliers (SupplierId, Name, Email, Rating, CategoryId)
VALUES (1, N'Northern Timber', N'sales@ntimber.example', 4, 3);

INSERT INTO dbo.Suppliers (SupplierId, Name)
VALUES (2, N'Pennine Fixings');

SELECT * FROM dbo.Suppliers;`, output: 'SupplierId  Name             Email                  Rating  CategoryId\n----------  ---------------  ---------------------  ------  ----------\n         1  Northern Timber  sales@ntimber.example       4           3\n         2  Pennine Fixings  NULL                        3        NULL' },
      { type: 'p', text: 'Pennine Fixings got Rating 3 from the DEFAULT. Now try to break the rules:' },
      { type: 'widget', name: 'constraint-guard' },
      { type: 'note', kind: 'info', text: 'A CHECK passes when its condition is TRUE **or UNKNOWN**. `CHECK (Rating BETWEEN 1 AND 5)` would let a NULL rating through if the column allowed NULL. Pair CHECK with NOT NULL when a value is required.' },
      { type: 'h2', text: 'Adding a constraint to an existing table' },
      { type: 'p', text: '`ALTER TABLE … ADD CONSTRAINT` adds a rule later. SQL Server first checks the rows already there, and refuses if any break it. After that, every change is checked:' },
      { type: 'code', code: sql`
ALTER TABLE dbo.Products
    ADD CONSTRAINT CK_Products_Price CHECK (Price > 0);
GO
UPDATE dbo.Products SET Price = -5 WHERE ProductId = 1;`, output: 'Msg 547, Level 16, State 0, Line 1\nThe UPDATE statement conflicted with the CHECK constraint "CK_Products_Price". The conflict occurred in database "BuildMart", table "dbo.Products", column \'Price\'.' },
      { type: 'h2', text: 'What happens to children when a parent goes?' },
      { type: 'p', text: 'By default a foreign key **refuses** to delete a parent row that still has children: you saw that when deleting a customer with orders. You can choose another action when you create the key:' },
      { type: 'table', head: ['ON DELETE …', 'Deleting a parent row…'], rows: [
        ['`NO ACTION` (default)', 'fails while any child row points at it'],
        ['`CASCADE`', 'deletes the child rows too'],
        ['`SET NULL`', 'sets the child’s foreign key column to NULL'],
        ['`SET DEFAULT`', 'sets it to the column’s DEFAULT']
      ] },
      { type: 'code', code: sql`
CREATE TABLE dbo.Quotes (
    QuoteId    int  NOT NULL CONSTRAINT PK_Quotes PRIMARY KEY,
    CustomerId int  NOT NULL
);
CREATE TABLE dbo.QuoteItems (
    QuoteId   int NOT NULL CONSTRAINT FK_QuoteItems_Quotes
              REFERENCES dbo.Quotes (QuoteId) ON DELETE CASCADE,
    ProductId int NOT NULL,
    Quantity  int NOT NULL,
    CONSTRAINT PK_QuoteItems PRIMARY KEY (QuoteId, ProductId)
);

INSERT INTO dbo.Quotes (QuoteId, CustomerId) VALUES (1, 4), (2, 6);
INSERT INTO dbo.QuoteItems (QuoteId, ProductId, Quantity) VALUES (1, 4, 30), (1, 5, 30), (2, 10, 3);

DELETE FROM dbo.Quotes WHERE QuoteId = 1;

SELECT * FROM dbo.QuoteItems;`, output: 'QuoteId  ProductId  Quantity\n-------  ---------  --------\n      2         10         3' },
      { type: 'p', text: 'Deleting quote 1 took its two items with it. CASCADE suits parts that make no sense on their own, such as the lines of a quote. It is dangerous for anything with a life of its own: you would not want deleting a category to delete its products.' },
      { type: 'note', kind: 'tip', text: 'Notice the two-column primary key `PRIMARY KEY (QuoteId, ProductId)`: a **composite key**, written as a separate line in the table definition. The same product can appear on many quotes, but only once on each.' },
      { type: 'h2', text: 'Unique, but with many NULLs' },
      { type: 'p', text: 'SQL Server treats NULLs as equal for UNIQUE constraints, so it allows only one NULL. When the rule is “unique when present”, use a **filtered unique index** instead:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Contacts (
    ContactId int           NOT NULL IDENTITY CONSTRAINT PK_Contacts PRIMARY KEY,
    Name      nvarchar(60)  NOT NULL,
    Email     nvarchar(100) NULL
);
CREATE UNIQUE INDEX UX_Contacts_Email ON dbo.Contacts (Email) WHERE Email IS NOT NULL;

INSERT INTO dbo.Contacts (Name, Email)
VALUES (N'Ben', NULL), (N'Grace', NULL), (N'Asha', N'asha@example.com');

SELECT * FROM dbo.Contacts;`, output: 'ContactId  Name   Email\n---------  -----  ----------------\n        1  Ben    NULL\n        2  Grace  NULL\n        3  Asha   asha@example.com' },
      { type: 'quiz', question: 'A CHECK constraint is `CHECK (Discount <= 50)` and Discount allows NULL. What happens when you insert NULL?', options: ['It fails', 'It succeeds: UNKNOWN passes a CHECK', 'NULL is converted to 0', 'It depends on ANSI settings'], answer: 1, explain: 'CHECK rejects only FALSE. NULL <= 50 is UNKNOWN, so the row is accepted.' },
      { type: 'quiz', question: 'Which foreign key action fits Orders → Customers in a shop?', options: ['ON DELETE CASCADE', 'ON DELETE SET NULL', 'NO ACTION (the default)', 'No foreign key at all'], answer: 2, explain: 'Deleting a customer should not silently delete their order history. NO ACTION forces a deliberate decision.' },
      { type: 'exercise', task: 'Stock can never be negative. Add a CHECK constraint named `CK_Products_Stock` that enforces this, then show that an UPDATE which takes 50 claw hammers from a stock of 40 is refused.', hint: 'ALTER TABLE dbo.Products ADD CONSTRAINT … CHECK (Stock >= 0). Put GO between the ALTER and the UPDATE.', solution: sql`
ALTER TABLE dbo.Products
    ADD CONSTRAINT CK_Products_Stock CHECK (Stock >= 0);
GO
UPDATE dbo.Products SET Stock = Stock - 50 WHERE ProductId = 1;`, output: 'Msg 547, Level 16, State 0, Line 1\nThe UPDATE statement conflicted with the CHECK constraint "CK_Products_Stock". The conflict occurred in database "BuildMart", table "dbo.Products", column \'Stock\'.' }
    ],
    keyPoints: [
      'Constraints are rules the database enforces on every change, from every program.',
      'Name them (`PK_`, `UQ_`, `CK_`, `DF_`, `FK_`) so errors and later changes are clear.',
      'CHECK rejects only FALSE; NULL passes, so pair it with NOT NULL when a value is required.',
      'Foreign keys refuse orphan rows by default; ON DELETE CASCADE / SET NULL change that, use them deliberately.',
      'UNIQUE allows one NULL in SQL Server; a filtered unique index (`WHERE col IS NOT NULL`) allows many.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'identity-sequences',
    title: 'IDENTITY, sequences and generated keys',
    summary: 'How IDENTITY numbers rows, why gaps are normal, how to get the id you just inserted, when a SEQUENCE is the better tool, and how to copy rows with their original ids.',
    minutes: 13,
    blocks: [
      { type: 'p', text: '`IDENTITY(seed, increment)` makes SQL Server number new rows: the first gets the seed, each later one adds the increment. Plain `IDENTITY` means `IDENTITY(1, 1)`. The counter belongs to the table, and SQL Server makes sure no two rows ever get the same number, even when many users insert at once.' },
      { type: 'widget', name: 'identity-gaps' },
      { type: 'h2', text: 'Gaps are normal' },
      { type: 'p', text: 'A number is taken as soon as an INSERT starts. If the INSERT fails or is rolled back, the number is not given back. Deleted rows leave holes too. Here a failed insert burns number 3 and a delete removes 4:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Notes (
    NoteId int          NOT NULL IDENTITY(1, 1) PRIMARY KEY,
    Body   nvarchar(20) NOT NULL
);
INSERT INTO dbo.Notes (Body) VALUES (N'first'), (N'second');
INSERT INTO dbo.Notes (Body) VALUES (NULL);   -- fails: Body is NOT NULL
GO
INSERT INTO dbo.Notes (Body) VALUES (N'third');
DELETE FROM dbo.Notes WHERE NoteId = 4;
INSERT INTO dbo.Notes (Body) VALUES (N'fourth');

SELECT * FROM dbo.Notes;`, output: 'Msg 515, Level 16, State 2, Line 6\nCannot insert the value NULL into column \'Body\', table \'BuildMart.dbo.Notes\'; column does not allow nulls. INSERT fails.\n\nNoteId  Body\n------  ------\n     1  first\n     2  second\n     5  fourth' },
      { type: 'note', kind: 'warn', text: 'IDENTITY promises unique, increasing numbers. It never promises gap-free ones. If the law says invoice numbers must not skip, generate them yourself inside a transaction; never use IDENTITY for them.' },
      { type: 'h2', text: 'Which id did I just get?' },
      { type: 'p', text: 'After inserting a row you usually need its new id, for example to insert the order lines of a new order. `SCOPE_IDENTITY()` returns the last IDENTITY value made by your own statement in your own scope:' },
      { type: 'code', code: sql`
INSERT INTO dbo.Orders (CustomerId, OrderDate, Status)
VALUES (7, '2024-07-02', 'Pending');

DECLARE @OrderId int = SCOPE_IDENTITY();

INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
VALUES (@OrderId, 1, 1, 18.50), (@OrderId, 3, 1, 9.75);

SELECT OrderId, ProductId, Quantity FROM dbo.OrderItems WHERE OrderId = @OrderId;`, output: 'OrderId  ProductId  Quantity\n-------  ---------  --------\n     11          1         1\n     11          3         1' },
      { type: 'p', text: '`DECLARE @OrderId int = …` creates a **variable** to hold the id for the next statement; variables get their own lesson in the Programmability module.' },
      { type: 'table', head: ['Function', 'Returns', 'Safe?'], rows: [
        ['`SCOPE_IDENTITY()`', 'the last id made in your scope (your batch or procedure)', 'Yes: the normal choice for one row'],
        ['`@@IDENTITY`', 'the last id made on your connection, in any scope', 'No: a trigger inserting into another table changes it'],
        ['`IDENT_CURRENT(\'t\')`', 'the last id made for table t by anyone', 'No: another user’s insert changes it'],
        ['`OUTPUT inserted.Id`', 'every new id, one row each', 'Yes: the choice for many rows']
      ] },
      { type: 'h2', text: 'SEQUENCE: a counter of its own' },
      { type: 'p', text: 'A **sequence** is a numbering object that is not tied to any table. You ask it for the next value with `NEXT VALUE FOR`, and you can use it as a column’s DEFAULT, in several tables, or before you insert anything:' },
      { type: 'code', code: sql`
CREATE SEQUENCE dbo.DocumentNo AS int START WITH 5000 INCREMENT BY 1;
GO
CREATE TABLE dbo.Invoices (
    InvoiceNo int  NOT NULL CONSTRAINT DF_Invoices_No DEFAULT (NEXT VALUE FOR dbo.DocumentNo) PRIMARY KEY,
    OrderId   int  NOT NULL
);
CREATE TABLE dbo.CreditNotes (
    CreditNo  int  NOT NULL CONSTRAINT DF_CreditNotes_No DEFAULT (NEXT VALUE FOR dbo.DocumentNo) PRIMARY KEY,
    OrderId   int  NOT NULL
);

INSERT INTO dbo.Invoices (OrderId) VALUES (1), (2);
INSERT INTO dbo.CreditNotes (OrderId) VALUES (6);
INSERT INTO dbo.Invoices (OrderId) VALUES (3);

SELECT 'Invoice' AS Doc, InvoiceNo AS No, OrderId FROM dbo.Invoices
UNION ALL
SELECT 'Credit note', CreditNo, OrderId FROM dbo.CreditNotes;`, output: 'Doc            No  OrderId\n-----------  ----  -------\nInvoice      5000        1\nInvoice      5001        2\nInvoice      5003        3\nCredit note  5002        6' },
      { type: 'p', text: 'Invoices and credit notes share one series of document numbers, so no number is used twice across the two tables. (`UNION ALL` stacks two results; it is covered in the Joins module.)' },
      { type: 'h2', text: 'Copying rows with their ids' },
      { type: 'p', text: 'Sometimes you must keep the original numbers, for example when moving data from an old system. `SET IDENTITY_INSERT table ON` allows explicit values for one table at a time; switch it off straight afterwards:' },
      { type: 'code', code: sql`
SET IDENTITY_INSERT dbo.Products ON;

INSERT INTO dbo.Products (ProductId, Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (100, N'Legacy item', 1, 1.00, 0, N'each', '2020-01-01');

SET IDENTITY_INSERT dbo.Products OFF;

INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (N'New item', 1, 2.00, 5, N'each', '2024-07-01');

SELECT ProductId, Name FROM dbo.Products WHERE ProductId > 12;`, output: 'ProductId  Name\n---------  -----------\n      100  Legacy item\n      101  New item' },
      { type: 'p', text: 'Once a larger value has been inserted, the counter jumps past it: the next automatic id is 101.' },
      { type: 'note', kind: 'info', text: 'Some systems use `uniqueidentifier` (GUID) keys, created with `NEWID()`. They can be generated anywhere, even on a phone before syncing, but they are 16 bytes instead of 4 and random GUIDs scatter inserts across an index. Use `NEWSEQUENTIALID()` as the default if you choose GUID keys.' },
      { type: 'quiz', question: 'An INSERT into a table with IDENTITY fails on a CHECK constraint. What happens to the number it was going to use?', options: ['It is reused by the next insert', 'It is lost, leaving a gap', 'The counter goes back by one', 'The table is locked'], answer: 1, explain: 'IDENTITY values are not part of the transaction, so a failed or rolled-back insert leaves a gap.' },
      { type: 'quiz', question: 'Which is the safest way to get the ids of 50 rows inserted in one statement?', options: ['`SCOPE_IDENTITY()`', '`@@IDENTITY`', '`IDENT_CURRENT`', '`OUTPUT inserted.Id`'], answer: 3, explain: 'SCOPE_IDENTITY returns only the last value. OUTPUT returns every inserted row’s id.' },
      { type: 'exercise', task: 'Create a sequence `dbo.TicketNo` that starts at 500 and goes up by 5. Create a table `dbo.SupportTickets` whose `TicketNo` defaults to the next sequence value, with a required `Subject nvarchar(80)`. Insert three tickets in one statement and list them.', hint: 'CREATE SEQUENCE … START WITH 500 INCREMENT BY 5; then a GO before CREATE TABLE. Use DEFAULT (NEXT VALUE FOR dbo.TicketNo).', solution: sql`
CREATE SEQUENCE dbo.TicketNo AS int START WITH 500 INCREMENT BY 5;
GO
CREATE TABLE dbo.SupportTickets (
    TicketNo int          NOT NULL DEFAULT (NEXT VALUE FOR dbo.TicketNo) PRIMARY KEY,
    Subject  nvarchar(80) NOT NULL
);

INSERT INTO dbo.SupportTickets (Subject)
VALUES (N'Damaged delivery'), (N'Wrong colour paint'), (N'Invoice query');

SELECT * FROM dbo.SupportTickets;`, output: 'TicketNo  Subject\n--------  ------------------\n     500  Damaged delivery\n     505  Wrong colour paint\n     510  Invoice query' }
    ],
    keyPoints: [
      '`IDENTITY(seed, increment)` numbers rows automatically; you cannot write to it unless IDENTITY_INSERT is on.',
      'Failed inserts, rollbacks and deletes leave gaps; IDENTITY is unique, not gap-free.',
      'Use `SCOPE_IDENTITY()` for the id of one new row and `OUTPUT inserted.Id` for many; avoid `@@IDENTITY`.',
      'A SEQUENCE is a counter of its own: `NEXT VALUE FOR`, usable as a DEFAULT and shared between tables.',
      'TRUNCATE resets IDENTITY to the seed; DELETE does not.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'alter-drop',
    title: 'Changing tables safely: ALTER and DROP',
    summary: 'Add, change, rename and remove columns on tables that already hold data. See which changes are instant, which fail, and which silently lose data, and how to make schema changes you can undo.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Tables change over a system’s life: a new column here, a longer name there. `ALTER TABLE` changes a table in place, keeping its data. Some changes are harmless, some are refused, and a few quietly destroy data. Try them on BuildMart’s products:' },
      { type: 'widget', name: 'alter-impact' },
      { type: 'h2', text: 'Adding columns' },
      { type: 'p', text: 'A new column that allows NULL is added instantly, with NULL in every existing row. A NOT NULL column needs a DEFAULT so the existing rows have a value:' },
      { type: 'code', code: sql`
ALTER TABLE dbo.Customers ADD Newsletter bit NOT NULL
    CONSTRAINT DF_Customers_Newsletter DEFAULT 0;
GO
SELECT TOP (3) CustomerId, FirstName, Newsletter FROM dbo.Customers;`, output: 'CustomerId  FirstName  Newsletter\n----------  ---------  ----------\n         1  Asha       0\n         2  Ben        0\n         3  Chloe      0' },
      { type: 'note', kind: 'info', text: 'The `GO` matters: SQL Server compiles a whole batch before running it, so a SELECT in the same batch as the ALTER would not know about the new column yet.' },
      { type: 'h2', text: 'Changing a column' },
      { type: 'p', text: '`ALTER COLUMN` changes a column’s type, length or NULL rule. Widening (`nvarchar(60)` to `nvarchar(100)`, `int` to `bigint`) is always safe. Narrowing is checked against the data and refused if anything would be cut. Changing to a different kind of type converts every value with the normal conversion rules, and **those can lose data without an error**, as the decimal-to-int example in the widget shows.' },
      { type: 'note', kind: 'warn', text: 'Always restate the NULL rule in ALTER COLUMN. `ALTER TABLE dbo.Products ALTER COLUMN Name nvarchar(100);` makes Name nullable, because NULL is the default when you do not say.' },
      { type: 'h2', text: 'Renaming' },
      { type: 'p', text: 'Renaming uses the system procedure `sp_rename`, not ALTER TABLE. SQL Server warns you, because every query, view and procedure that uses the old name breaks:' },
      { type: 'code', code: sql`
EXEC sp_rename 'dbo.Customers.Phone', 'PhoneNumber', 'COLUMN';
GO
SELECT TOP (2) CustomerId, FirstName, PhoneNumber FROM dbo.Customers;`, output: 'Caution: Changing any part of an object name could break scripts and stored procedures.\n\nCustomerId  FirstName  PhoneNumber\n----------  ---------  -------------\n         1  Asha       0113 496 0001\n         2  Ben        01904 555 010' },
      { type: 'h2', text: 'Dropping columns, constraints and tables' },
      { type: 'p', text: '`ALTER TABLE … DROP COLUMN` removes a column and its data. A column that a constraint uses cannot be dropped until the constraint is, which is where named constraints pay off: you can drop them by name. Tables are dropped with `DROP TABLE`, children before parents, because a table referenced by a foreign key cannot be dropped:' },
      { type: 'code', code: sql`
ALTER TABLE dbo.Customers ADD Region nvarchar(20) NULL
    CONSTRAINT DF_Customers_Region DEFAULT N'North';
GO
ALTER TABLE dbo.Customers DROP COLUMN Region;   -- fails: the default uses it
GO
ALTER TABLE dbo.Customers DROP CONSTRAINT DF_Customers_Region;
ALTER TABLE dbo.Customers DROP COLUMN Region;
SELECT COUNT(*) AS RegionColumns FROM sys.columns
WHERE object_id = OBJECT_ID('dbo.Customers') AND name = 'Region';`, output: 'Msg 5074, Level 16, State 1, Line 1\nThe object \'DF_Customers_Region\' is dependent on column \'Region\'.\n\nMsg 4922, Level 16, State 9, Line 1\nALTER TABLE DROP COLUMN Region failed because one or more objects access this column.\n\nRegionColumns\n-------------\n            0' },
      { type: 'h2', text: 'Schema changes you can undo' },
      { type: 'p', text: 'In SQL Server, `CREATE`, `ALTER` and `DROP` take part in transactions like any INSERT or UPDATE. Wrap a risky change in a transaction, look at the result, and roll it back if it is wrong, data included:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;

ALTER TABLE dbo.Products DROP COLUMN Unit;
SELECT COUNT(*) AS UnitColumns FROM sys.columns
WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'Unit';

ROLLBACK;

SELECT TOP (2) Name, Unit FROM dbo.Products ORDER BY ProductId;`, output: 'UnitColumns\n-----------\n          0\n\nName            Unit\n--------------  ----\nClaw hammer     each\nCordless drill  each' },
      { type: 'p', text: 'For changes to a live system, the professional routine is: script the change, run it on a copy of the database first, take a backup, run it in a transaction, check, then commit. Tools such as SQL Server Data Tools and migration frameworks (EF Core migrations, DbUp, Flyway) turn those scripts into versioned, repeatable steps.' },
      { type: 'quiz', question: 'Which change can lose data without any error?', options: ['`nvarchar(60)` to `nvarchar(100)`', '`decimal(10,2)` to `int`', '`nvarchar(60)` to `nvarchar(10)` when names are longer', 'Adding a NULL column'], answer: 1, explain: 'Converting decimal to int cuts off the fraction for every row and reports success. Shrinking text that would be cut is refused with an error.' },
      { type: 'quiz', question: 'Why add `GO` between an ALTER TABLE that adds a column and a SELECT that reads it?', options: ['GO commits the transaction', 'SQL Server compiles the whole batch first, before the column exists', 'SELECT cannot follow ALTER on the same line', 'It is only style'], answer: 1, explain: 'Without GO, the batch is compiled before the ALTER runs, so the new column name is unknown and compilation fails.' },
      { type: 'exercise', task: 'BuildMart starts recording barcodes. Add a column `Barcode varchar(13) NULL` to Products, set it to `5012345678900` for the claw hammer (product 1), and make sure no two products can ever share a barcode while still allowing many products without one. Show the first two products with their barcodes.', hint: 'ALTER TABLE … ADD, then GO, an UPDATE, and a filtered unique index (WHERE Barcode IS NOT NULL), because a UNIQUE constraint would allow only one NULL.', solution: sql`
ALTER TABLE dbo.Products ADD Barcode varchar(13) NULL;
GO
UPDATE dbo.Products SET Barcode = '5012345678900' WHERE ProductId = 1;

CREATE UNIQUE INDEX UX_Products_Barcode ON dbo.Products (Barcode) WHERE Barcode IS NOT NULL;

SELECT TOP (2) ProductId, Name, Barcode FROM dbo.Products ORDER BY ProductId;`, output: 'ProductId  Name            Barcode\n---------  --------------  -------------\n        1  Claw hammer     5012345678900\n        2  Cordless drill  NULL' }
    ],
    keyPoints: [
      'Adding a NULL column is instant; a NOT NULL column needs a DEFAULT on a table with rows.',
      'Widening a column is safe; narrowing is checked; changing the kind of type can silently lose data.',
      'Restate NULL / NOT NULL in ALTER COLUMN, and put GO before using a new column in the same script.',
      'Name constraints so they can be dropped; drop child tables before their parents.',
      'DDL is transactional in SQL Server: BEGIN TRANSACTION, change, check, then COMMIT or ROLLBACK.'
    ]
  }
];
