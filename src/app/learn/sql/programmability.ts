import { Lesson } from '../learn.types';
import { sql } from './sql';

export const PROGRAMMABILITY: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'views',
    title: 'Views',
    summary: 'Save a query under a name and use it like a table: creating views, naming their columns, why ORDER BY is not allowed, the SELECT * trap, updating through a view, WITH CHECK OPTION, SCHEMABINDING and views for security.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'You have written the same join between Products and Categories many times. A **view** saves a SELECT under a name. After that you can query the view as if it were a table, and SQL Server runs the saved SELECT for you.' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.ProductList
AS
SELECT p.ProductId, p.Name, c.Name AS Category, p.Price, p.Stock
FROM dbo.Products AS p
LEFT JOIN dbo.Categories AS c ON c.CategoryId = p.CategoryId;
GO
SELECT Name, Category, Price
FROM dbo.ProductList
WHERE Category = N'Tools'
ORDER BY Price DESC;`, output: 'Name              Category  Price\n----------------  --------  -----\nCordless drill    Tools     89.00\nClaw hammer       Tools     18.50\nTape measure 8 m  Tools      9.75' },
      { type: 'p', text: '`CREATE OR ALTER` creates the view, or replaces it if it already exists, so you can run the script again. The `GO` line ends the batch: a CREATE VIEW must be in a batch of its own, which the next lesson explains.' },
      { type: 'p', text: 'A view stores **no data**, only its SELECT. Every query against it runs that SELECT again, so a view always shows the current rows. SQL Server merges the view’s SELECT into your query before it plans it, so a view is usually no slower than writing the join yourself.' },
      { type: 'h2', text: 'Every column needs a name' },
      { type: 'p', text: 'A view is used like a table, so each of its columns needs a name. An expression without an alias stops the view being created:' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.OrderTotals
AS
SELECT o.OrderId, o.CustomerId, o.OrderDate, o.Status,
       SUM(i.Quantity * i.UnitPrice)
FROM dbo.Orders AS o
JOIN dbo.OrderItems AS i ON i.OrderId = o.OrderId
GROUP BY o.OrderId, o.CustomerId, o.OrderDate, o.Status;`, output: 'Msg 4511, Level 16, State 1, Procedure OrderTotals, Line 3\nCreate View or Function failed because no column name was specified for column 5.' },
      { type: 'p', text: 'Name the expressions and the view works. Views can then be joined and grouped like any table. Here one view answers a question that would otherwise need a join inside a join:' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.OrderTotals
AS
SELECT o.OrderId, o.CustomerId, o.OrderDate, o.Status,
       COUNT(*) AS Lines,
       SUM(i.Quantity * i.UnitPrice) AS Total
FROM dbo.Orders AS o
JOIN dbo.OrderItems AS i ON i.OrderId = o.OrderId
GROUP BY o.OrderId, o.CustomerId, o.OrderDate, o.Status;
GO
SELECT c.FirstName, COUNT(*) AS Orders, SUM(t.Total) AS Spent
FROM dbo.OrderTotals AS t
JOIN dbo.Customers AS c ON c.CustomerId = t.CustomerId
WHERE t.Status <> 'Cancelled'
GROUP BY c.CustomerId, c.FirstName
ORDER BY Spent DESC;`, output: 'FirstName  Orders   Spent\n---------  ------  ------\nDev             2  723.50\nFarid           2  211.85\nAsha            2  150.80\nBen             2  131.00\nZoë             1  102.50' },
      { type: 'h2', text: 'No ORDER BY inside a view' },
      { type: 'p', text: 'A view is a set of rows, like a table, and a set has no order. SQL Server refuses an ORDER BY in a view:' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.DearProducts
AS
SELECT Name, Price
FROM dbo.Products
WHERE Price > 20
ORDER BY Price DESC;`, output: 'Msg 1033, Level 15, State 1, Procedure DearProducts, Line 6\nThe ORDER BY clause is invalid in views, inline functions, derived tables, subqueries, and common table expressions, unless TOP, OFFSET or FOR XML is also specified.' },
      { type: 'p', text: 'Sort in the query that reads the view: `SELECT * FROM dbo.DearProducts ORDER BY Price DESC`.' },
      { type: 'note', kind: 'warn', text: 'You may see `SELECT TOP (100) PERCENT … ORDER BY` used to get round this error. It is accepted, but the optimizer drops the sort, because TOP 100 PERCENT keeps every row anyway. The rows come back in **no guaranteed order**. The only ORDER BY that orders a result is the one on the outer query.' },
      { type: 'h2', text: 'The SELECT * trap' },
      { type: 'p', text: 'When a view is created, SQL Server records its column list. `SELECT *` is expanded **once**, at that moment. Columns added to the table later do not appear in the view:' },
      { type: 'code', code: sql`
DROP TABLE IF EXISTS dbo.Suppliers;
CREATE TABLE dbo.Suppliers (
    SupplierId int          NOT NULL PRIMARY KEY,
    Name       nvarchar(60) NOT NULL
);
INSERT INTO dbo.Suppliers VALUES (1, N'Northern Timber'), (2, N'Fixings Direct');
GO
CREATE OR ALTER VIEW dbo.SupplierList AS SELECT * FROM dbo.Suppliers;
GO
ALTER TABLE dbo.Suppliers ADD Phone varchar(20) NULL;
GO
SELECT * FROM dbo.SupplierList;        -- no Phone column

EXEC sp_refreshview N'dbo.SupplierList';
SELECT * FROM dbo.SupplierList;        -- now it has one`, output: 'SupplierId  Name\n----------  ---------------\n         1  Northern Timber\n         2  Fixings Direct\n\nSupplierId  Name             Phone\n----------  ---------------  -----\n         1  Northern Timber  NULL\n         2  Fixings Direct   NULL' },
      { type: 'p', text: '`sp_refreshview` makes SQL Server read the table’s columns again. It is better not to need it: list the columns in a view, so that the view only changes when you change it.' },
      { type: 'h2', text: 'Changing data through a view' },
      { type: 'p', text: 'You can INSERT, UPDATE and DELETE through a view when SQL Server can trace every changed column back to **one** base table. The view’s WHERE still applies, so an UPDATE through a view only reaches the rows the view shows:' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.CheapProducts
AS
SELECT ProductId, Name, Price, Stock
FROM dbo.Products
WHERE Price < 10.00;
GO
UPDATE dbo.CheapProducts SET Stock = Stock + 100 WHERE ProductId = 9;  -- Wall plugs: in the view
UPDATE dbo.CheapProducts SET Stock = Stock + 100 WHERE ProductId = 2;  -- Cordless drill: not in it

SELECT ProductId, Name, Price, Stock
FROM dbo.Products
WHERE ProductId IN (2, 9);`, output: 'ProductId  Name              Price  Stock\n---------  ----------------  -----  -----\n        2  Cordless drill    89.00     12\n        9  Wall plugs (100)   4.50    100' },
      { type: 'p', text: 'The second UPDATE changed nothing: the drill costs 89.00, so it is not in the view. Now raise the price of something that is in the view, past the view’s own limit:' },
      { type: 'code', code: sql`
UPDATE dbo.CheapProducts SET Price = 10.50 WHERE ProductId = 3;  -- Tape measure, was 9.75

SELECT ProductId, Name, Price
FROM dbo.CheapProducts
ORDER BY Price DESC;`, output: 'ProductId  Name              Price\n---------  ----------------  -----\n        4  Cement 25 kg       7.20\n        6  Timber 2x4 2.4 m   6.80\n       12  Safety goggles     6.80\n        9  Wall plugs (100)   4.50\n        5  Sand 25 kg         4.10' },
      { type: 'p', text: 'The update worked, and the tape measure **disappeared** from the view that changed it. Sometimes that is what you want. When it is not, add `WITH CHECK OPTION`: SQL Server then rejects any change through the view that would move a row out of it.' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.CheapProducts
AS
SELECT ProductId, Name, Price, Stock
FROM dbo.Products
WHERE Price < 10.00
WITH CHECK OPTION;
GO
UPDATE dbo.CheapProducts SET Price = 10.50 WHERE ProductId = 4;  -- Cement: would leave the view
UPDATE dbo.CheapProducts SET Price = 7.50  WHERE ProductId = 4;  -- still under 10.00: allowed

SELECT ProductId, Name, Price FROM dbo.CheapProducts WHERE ProductId = 4;`, output: 'Msg 550, Level 16, State 1, Line 1\nThe attempted insert or update failed because the target view either specifies WITH CHECK OPTION or spans a view that specifies WITH CHECK OPTION and one or more rows resulting from the operation did not qualify under the CHECK OPTION constraint.\nThe statement has been terminated.\n\nProductId  Name          Price\n---------  ------------  -----\n        4  Cement 25 kg   7.50' },
      { type: 'widget', name: 'view-check' },
      { type: 'p', text: 'A change that touches columns from two tables cannot go through a view, and neither can a change to a column that is calculated or comes from GROUP BY. SQL Server finds these problems when it compiles the batch, so the whole batch is rejected. That is why each statement below has its own batch:' },
      { type: 'code', code: sql`
UPDATE dbo.ProductList
SET Name = N'Claw hammer 16 oz', Category = N'Hand tools'
WHERE ProductId = 1;
GO
UPDATE dbo.OrderTotals SET Total = 0 WHERE OrderId = 1;
GO
UPDATE dbo.ProductList                 -- one table only: allowed
SET Name = N'Claw hammer 16 oz'
WHERE ProductId = 1;

SELECT ProductId, Name, Category FROM dbo.ProductList WHERE ProductId = 1;`, output: 'Msg 4405, Level 16, State 1, Line 1\nView or function \'dbo.ProductList\' is not updatable because the modification affects multiple base tables.\nMsg 4406, Level 16, State 1, Line 1\nUpdate or insert of view or function \'dbo.OrderTotals\' failed because it contains a derived or constant field.\n\nProductId  Name               Category\n---------  -----------------  --------\n        1  Claw hammer 16 oz  Tools' },
      { type: 'note', kind: 'info', text: 'When a view cannot be updated directly, an **INSTEAD OF trigger** can take the change and apply it to the base tables in your own way. The Triggers lesson at the end of this module shows one.' },
      { type: 'h2', text: 'SCHEMABINDING: protect what the view depends on' },
      { type: 'p', text: 'Normally nothing stops someone changing or dropping a table that a view reads, and the view then fails when it is next used. `WITH SCHEMABINDING` ties the view to the columns it uses, so they cannot be changed while the view exists. It needs two-part names (`dbo.Products`) and an explicit column list:' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.PriceList
WITH SCHEMABINDING
AS
SELECT ProductId, Name, Price
FROM dbo.Products;
GO
ALTER TABLE dbo.Products ALTER COLUMN Name nvarchar(80) NOT NULL;
GO
DROP VIEW dbo.PriceList;   -- so the BuildMart reset script can drop Products again`, output: 'Msg 5074, Level 16, State 1, Line 1\nThe object \'PriceList\' is dependent on column \'Name\'.\nMsg 4922, Level 16, State 9, Line 1\nALTER TABLE ALTER COLUMN Name failed because one or more objects access this column.' },
      { type: 'p', text: 'Schema binding is also required before a view can be **indexed**: a unique clustered index on a view stores its result, like a table, and SQL Server keeps it up to date on every change. That is a performance tool for the Indexes module.' },
      { type: 'h2', text: 'Views for security' },
      { type: 'p', text: 'A view can show some columns and rows of a table and hide the rest. Give a team permission on the view, not the table, and they can only ever see what the view shows:' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.CustomerDirectory
AS
SELECT CustomerId, FirstName, LastName, City   -- no Email or Phone
FROM dbo.Customers;
GO
SELECT * FROM dbo.CustomerDirectory WHERE City = N'York';`, output: 'CustomerId  FirstName  LastName  City\n----------  ---------  --------  ----\n         2  Ben        Carter    York\n         6  Farid      Khan      York' },
      { type: 'p', text: 'With `GRANT SELECT ON dbo.CustomerDirectory TO SalesTeam;` the SalesTeam role can read the directory without any permission on dbo.Customers. Logins, roles and permissions are covered in the Master level module.' },
      { type: 'quiz', question: 'What does a view store?', options: ['A copy of the rows, refreshed every night', 'Only its SELECT statement: the rows are read from the tables each time', 'An index on the base tables', 'The rows, as long as the view has ORDER BY'], answer: 1, explain: 'An ordinary view is a saved query. Each query against it reads the current rows of the base tables. Only an indexed view stores rows.' },
      { type: 'quiz', question: 'A view shows products with Price < 10, without CHECK OPTION. You set a product’s price to 15 through the view. What happens?', options: ['An error, because 15 is not under 10', 'The update succeeds and the product disappears from the view', 'Nothing: 0 rows are updated', 'The view’s WHERE is changed to Price < 15'], answer: 1, explain: 'Without WITH CHECK OPTION the change is allowed, and the row no longer matches the view’s WHERE. With CHECK OPTION it would fail with Msg 550.' },
      { type: 'exercise', task: 'Create a view dbo.CategoryStock with one row per category that has products: the category Name as Category, the number of products as Products, and the value of the stock (Price × Stock, added up) as StockValue. Then use it to list the categories whose stock is worth more than 1,000, the most valuable first.', hint: 'GROUP BY inside the view, with an alias for each expression. The ORDER BY and the 1,000 filter go in the query that reads the view.', solution: sql`
CREATE OR ALTER VIEW dbo.CategoryStock
AS
SELECT c.Name AS Category,
       COUNT(*) AS Products,
       SUM(p.Price * p.Stock) AS StockValue
FROM dbo.Products AS p
JOIN dbo.Categories AS c ON c.CategoryId = p.CategoryId
GROUP BY c.Name;
GO
SELECT Category, Products, StockValue
FROM dbo.CategoryStock
WHERE StockValue > 1000
ORDER BY StockValue DESC;`, output: 'Category  Products  StockValue\n--------  --------  ----------\nTimber           2     6760.00\nBuilding         2     3152.00\nTools            3     2490.50\nFixings          2     2235.00\nPaint            2     1725.00' }
    ],
    keyPoints: [
      'A view is a saved SELECT that you query like a table; it stores no rows and always shows current data.',
      'Use CREATE OR ALTER VIEW, in a batch of its own, and give every column a name.',
      'ORDER BY is not allowed in a view: sort in the outer query. TOP 100 PERCENT … ORDER BY does not order anything.',
      'SELECT * in a view is expanded once, at creation; list the columns instead.',
      'You can change data through a view when the change touches one base table; the view’s WHERE limits which rows are reached.',
      'WITH CHECK OPTION rejects changes that would move a row out of the view (Msg 550).',
      'WITH SCHEMABINDING stops the base columns being changed while the view exists, and is required for indexed views.',
      'Views can hide columns and rows: grant permission on the view instead of the table.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'tsql-batches-variables',
    title: 'T-SQL batches, variables and control flow',
    summary: 'T-SQL as a programming language: batches and GO, variables and how far they reach, the difference between SET and SELECT assignment, PRINT, IF … ELSE, WHILE loops with BREAK, and table variables versus temporary tables.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'So far every script has been a list of queries. T-SQL, SQL Server’s dialect of SQL, is also a small programming language: it has variables, IF and WHILE. They are what stored procedures, functions and triggers are made of, so this lesson comes first.' },
      { type: 'h2', text: 'Variables' },
      { type: 'p', text: '`DECLARE` creates a variable. Its name starts with `@`, it has a data type, and it can be given a starting value. Without one it starts as NULL.' },
      { type: 'code', code: sql`
DECLARE @MinPrice decimal(10,2) = 10.00;

SELECT Name, Price
FROM dbo.Products
WHERE Price >= @MinPrice
ORDER BY Price;`, output: 'Name                 Price\n-------------------  -----\nWood screws (200)    11.90\nPaint roller set     12.50\nClaw hammer          18.50\nPlywood sheet 18 mm  42.00\nMasonry paint 10 L   54.00\nCordless drill       89.00' },
      { type: 'h2', text: 'Batches and GO' },
      { type: 'p', text: 'A **batch** is the block of text that SSMS sends to SQL Server in one go. `GO` is not T-SQL at all: SSMS (and sqlcmd) look for lines that say GO, cut the script there, and send the pieces one after another. Each batch is compiled and run on its own, and a variable lives only until the end of its batch:' },
      { type: 'code', code: sql`
DECLARE @City nvarchar(40) = N'Leeds';
SELECT COUNT(*) AS Customers FROM dbo.Customers WHERE City = @City;
GO
SELECT COUNT(*) AS Customers FROM dbo.Customers WHERE City = @City;`, output: 'Customers\n---------\n        3\n\nMsg 137, Level 15, State 2, Line 1\nMust declare the scalar variable "@City".' },
      { type: 'p', text: 'Some statements must be the **first** statement in their batch: CREATE VIEW, CREATE PROCEDURE, CREATE FUNCTION and CREATE TRIGGER. That is why the previous lesson put GO after each view. Without it, the whole batch fails to compile, so even the PRINT before the CREATE never runs:' },
      { type: 'code', code: sql`
PRINT N'Creating the view…';
CREATE OR ALTER VIEW dbo.LeedsCustomers
AS
SELECT FirstName, LastName FROM dbo.Customers WHERE City = N'Leeds';`, output: 'Msg 111, Level 15, State 1, Line 2\n\'CREATE VIEW\' must be the first statement in a query batch.' },
      { type: 'widget', name: 'batch-split' },
      { type: 'note', kind: 'tip', text: 'In SSMS, `GO 5` runs the batch above it five times, which is handy for quick test data. It works because GO belongs to SSMS, not to SQL Server.' },
      { type: 'h2', text: 'SET or SELECT to assign' },
      { type: 'p', text: 'There are two ways to put a value into a variable. `SET` assigns one variable. `SELECT` can assign several at once, straight from a query:' },
      { type: 'code', code: sql`
DECLARE @Products int, @AvgPrice decimal(10,2);

SELECT @Products = COUNT(*), @AvgPrice = AVG(Price)
FROM dbo.Products;

PRINT CONCAT(N'Products: ', @Products, N', average price: ', @AvgPrice);`, output: 'Products: 12, average price: 22.25' },
      { type: 'p', text: '`PRINT` sends a line of text to the Messages tab instead of returning a result set. It is useful for following what a script does. Build the text with `CONCAT`, because `+` tries to turn the text into a number as soon as one side is a number:' },
      { type: 'code', code: sql`
DECLARE @Products int = 12;
PRINT N'Products: ' + @Products;`, output: 'Msg 245, Level 16, State 1, Line 2\nConversion failed when converting the nvarchar value \'Products: \' to data type int.' },
      { type: 'p', text: 'The two forms of assignment behave differently when the query returns no rows, or more than one:' },
      { type: 'code', code: sql`
DECLARE @Name nvarchar(60) = N'(nothing yet)';

SELECT @Name = Name FROM dbo.Products WHERE Price > 1000;   -- no rows
SELECT @Name AS AfterSelect;

SET @Name = (SELECT Name FROM dbo.Products WHERE Price > 1000);
SELECT @Name AS AfterSet;

SET @Name = (SELECT Name FROM dbo.Products WHERE CategoryId = 1);  -- three rows`, output: 'AfterSelect\n-------------\n(nothing yet)\n\nAfterSet\n--------\nNULL\n\nMsg 512, Level 16, State 1, Line 9\nSubquery returned more than 1 value. This is not permitted when the subquery follows =, !=, <, <= , >, >= or when the subquery is used as an expression.' },
      { type: 'table', head: ['Query returns', '`SELECT @v = col …`', '`SET @v = (SELECT col …)`'], rows: [
        ['one row', 'the value', 'the value'],
        ['no rows', '**unchanged**: keeps its old value', 'NULL'],
        ['several rows', 'one of them, with no error (which one is not defined)', 'error Msg 512']
      ] },
      { type: 'note', kind: 'warn', text: 'The “unchanged” case causes real bugs: inside a loop, a lookup that finds nothing leaves the value from the previous pass in the variable. When a lookup might find nothing, use SET with a subquery, or check `@@ROWCOUNT` straight after the SELECT.' },
      { type: 'h2', text: 'IF … ELSE' },
      { type: 'p', text: '`IF` runs the next statement only when its condition is true. `ELSE` gives the other path, and `ELSE IF` chains more tests:' },
      { type: 'code', code: sql`
DECLARE @ProductId int = 9, @Stock int;

SELECT @Stock = Stock FROM dbo.Products WHERE ProductId = @ProductId;

IF @Stock = 0
    PRINT N'Out of stock: reorder now';
ELSE IF @Stock < 20
    PRINT N'Low stock';
ELSE
    PRINT N'In stock';`, output: 'Out of stock: reorder now' },
      { type: 'p', text: 'IF controls **one** statement. Indenting the next line does not make it part of the IF. To run several statements, wrap them in `BEGIN … END`:' },
      { type: 'code', code: sql`
IF 1 = 0
    PRINT N'A: inside the IF';
    PRINT N'B: looks inside, but always runs';

IF 1 = 0
BEGIN
    PRINT N'C: inside the IF';
    PRINT N'D: inside the IF too';
END;`, output: 'B: looks inside, but always runs' },
      { type: 'p', text: '`IF EXISTS (subquery)` is the usual way to test for rows. It stops reading as soon as one row is found:' },
      { type: 'code', code: sql`
IF EXISTS (SELECT 1 FROM dbo.Orders WHERE Status = 'Pending')
    SELECT OrderId, CustomerId, OrderDate
    FROM dbo.Orders
    WHERE Status = 'Pending';
ELSE
    PRINT N'No pending orders';`, output: 'OrderId  CustomerId  OrderDate\n-------  ----------  ----------\n      8           8  2024-05-18\n      9           2  2024-06-01' },
      { type: 'h2', text: 'WHILE loops' },
      { type: 'p', text: '`WHILE` repeats a statement, usually a BEGIN … END block, as long as its condition is true. `BREAK` leaves the loop and `CONTINUE` jumps back to the test. This loop walks through the out-of-stock products one at a time, in ProductId order:' },
      { type: 'code', code: sql`
DECLARE @Id int = 0, @Name nvarchar(60);

WHILE 1 = 1
BEGIN
    SELECT TOP (1) @Id = ProductId, @Name = Name
    FROM dbo.Products
    WHERE ProductId > @Id AND Stock = 0
    ORDER BY ProductId;

    IF @@ROWCOUNT = 0 BREAK;      -- nothing found: we are done

    PRINT CONCAT(N'Reorder #', @Id, N': ', @Name);
END;`, output: 'Reorder #9: Wall plugs (100)\nReorder #12: Safety goggles' },
      { type: 'p', text: '`@@ROWCOUNT` holds the number of rows the previous statement affected. Here it detects the “no rows” case that would otherwise leave @Id unchanged and loop for ever.' },
      { type: 'note', kind: 'tip', text: 'SQL is built to work on **sets** of rows. A loop that handles one row per pass is often hundreds of times slower than one statement that handles them all. Use loops for work that really is step by step (calling a procedure per row, processing in batches of 10,000), not for things one UPDATE can do.' },
      { type: 'h2', text: 'Table variables and temporary tables' },
      { type: 'p', text: 'A **table variable** is declared like a variable and used like a table. A **temporary table** (`#name`) is a real table in tempdb that lasts until your session ends or you drop it:' },
      { type: 'code', code: sql`
DECLARE @Low TABLE (ProductId int PRIMARY KEY, Name nvarchar(60), Stock int);

INSERT INTO @Low (ProductId, Name, Stock)
SELECT ProductId, Name, Stock FROM dbo.Products WHERE Stock < 30;

SELECT * FROM @Low ORDER BY Stock;`, output: 'ProductId  Name                Stock\n---------  ------------------  -----\n        9  Wall plugs (100)        0\n       12  Safety goggles          0\n        2  Cordless drill         12\n       10  Masonry paint 10 L     25' },
      { type: 'p', text: 'They look alike but behave differently. A table variable ends with its batch, has no statistics (so the optimizer guesses its row count), and, surprisingly, **ignores ROLLBACK**:' },
      { type: 'code', code: sql`
DECLARE @Log TABLE (Msg nvarchar(50));
CREATE TABLE #Log (Msg nvarchar(50));

BEGIN TRANSACTION;
    INSERT INTO @Log VALUES (N'kept by the table variable');
    INSERT INTO #Log VALUES (N'kept by the temp table');
ROLLBACK;

SELECT (SELECT COUNT(*) FROM @Log) AS TableVariableRows,
       (SELECT COUNT(*) FROM #Log) AS TempTableRows;

DROP TABLE #Log;`, output: 'TableVariableRows  TempTableRows\n-----------------  -------------\n                1              0' },
      { type: 'table', head: ['', 'Table variable `@t`', 'Temp table `#t`'], rows: [
        ['Lives until', 'the end of the batch', 'the end of the session, or DROP'],
        ['Statistics', 'none: estimates are guesses', 'yes: good plans for big sets'],
        ['ROLLBACK', 'ignored', 'undone like any table'],
        ['Indexes', 'inline PRIMARY KEY / UNIQUE / INDEX', 'any index, added any time'],
        ['Good for', 'small sets, keeping a log through a rollback', 'larger intermediate results']
      ] },
      { type: 'quiz', question: '`SELECT @Total = Price FROM dbo.Products WHERE ProductId = 999;` finds no product. @Total held 5.00 before. What does it hold after?', options: ['NULL', '0', '5.00', 'An error is raised'], answer: 2, explain: 'A SELECT assignment that returns no rows does not touch the variable, so it keeps 5.00. SET @Total = (SELECT …) would set it to NULL.' },
      { type: 'quiz', question: 'Why does a variable declared before GO not exist after it?', options: ['GO commits the transaction', 'GO ends the batch, and variables last only for their batch', 'GO clears the cache', 'Variables must be declared in every statement'], answer: 1, explain: 'GO splits the script into batches that are sent separately. Each batch starts with no variables.' },
      { type: 'exercise', task: 'Using variables and IF, look up the number of orders for the customer with CustomerId 2. If there are none, PRINT “No orders”. Otherwise PRINT a line like “Ben has 2 orders”, using the customer’s first name.', hint: 'SELECT both values into variables first: @Name from Customers and @Orders with COUNT(*) from Orders. COUNT(*) always returns a row, so @Orders is never left unchanged. Build the message with CONCAT.', solution: sql`
DECLARE @CustomerId int = 2, @Name nvarchar(40), @Orders int;

SELECT @Name = FirstName FROM dbo.Customers WHERE CustomerId = @CustomerId;
SELECT @Orders = COUNT(*) FROM dbo.Orders WHERE CustomerId = @CustomerId;

IF @Orders = 0
    PRINT N'No orders';
ELSE
    PRINT CONCAT(@Name, N' has ', @Orders, N' orders');`, output: 'Ben has 2 orders' }
    ],
    keyPoints: [
      'DECLARE @name type = value creates a variable; without a value it starts as NULL.',
      'GO is an SSMS command, not T-SQL: it splits the script into batches that are compiled and run separately.',
      'Variables last only until the end of their batch (Msg 137 after GO).',
      'CREATE VIEW, PROCEDURE, FUNCTION and TRIGGER must be the first statement in their batch (Msg 111).',
      'SELECT @v = … leaves the variable unchanged when no rows come back; SET @v = (subquery) gives NULL, and fails on several rows.',
      'Build PRINT messages with CONCAT; + with a number tries to convert the text.',
      'IF and WHILE control one statement: use BEGIN … END for several. BREAK leaves a loop; @@ROWCOUNT tells you if the last statement found rows.',
      'Table variables end with the batch, have no statistics and ignore ROLLBACK; temp tables are real tables in tempdb.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'stored-procedures',
    title: 'Stored procedures and parameters',
    summary: 'Save T-SQL as a procedure and call it with EXEC: input parameters, defaults, named and positional calls, OUTPUT parameters and the forgotten-OUTPUT trap, return codes, checking input with THROW, and the missing-GO trap.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'A **stored procedure** is a named block of T-SQL saved in the database. Applications call procedures instead of sending SQL text: the code lives in one place, it can take parameters, and users can be allowed to run it without any permission on the tables it touches.' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.GetProductsByCategory
    @CategoryId int
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ProductId, Name, Price, Stock
    FROM dbo.Products
    WHERE CategoryId = @CategoryId
    ORDER BY Price DESC;
END;
GO
EXEC dbo.GetProductsByCategory @CategoryId = 1;`, output: 'ProductId  Name              Price  Stock\n---------  ----------------  -----  -----\n        2  Cordless drill    89.00     12\n        1  Claw hammer       18.50     40\n        3  Tape measure 8 m   9.75     65' },
      { type: 'p', text: '`SET NOCOUNT ON` stops the “(3 rows affected)” message after each statement. Those messages are extra network traffic and can confuse some client libraries, so it is the usual first line of a procedure.' },
      { type: 'h2', text: 'Calling with parameters' },
      { type: 'p', text: 'You can pass parameters by **name** or by **position**. Named calls are clearer and keep working if someone adds a parameter later. A parameter with no default must be given:' },
      { type: 'code', code: sql`
EXEC dbo.GetProductsByCategory 4;                -- by position
EXEC dbo.GetProductsByCategory @CategoryId = 6;  -- by name
EXEC dbo.GetProductsByCategory;                  -- missing`, output: 'ProductId  Name               Price  Stock\n---------  -----------------  -----  -----\n        8  Wood screws (200)  11.90    150\n        9  Wall plugs (100)    4.50      0\n\nProductId  Name            Price  Stock\n---------  --------------  -----  -----\n       12  Safety goggles   6.80      0\n\nMsg 201, Level 16, State 4, Procedure dbo.GetProductsByCategory, Line 0\nProcedure or function \'GetProductsByCategory\' expects parameter \'@CategoryId\', which was not supplied.' },
      { type: 'h2', text: 'Defaults' },
      { type: 'p', text: 'Give a parameter a default and callers can leave it out. A NULL default is the usual way to make a filter optional:' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.GetProductsByCategory
    @CategoryId int,
    @MaxPrice   decimal(10,2) = NULL     -- optional
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ProductId, Name, Price, Stock
    FROM dbo.Products
    WHERE CategoryId = @CategoryId
      AND (@MaxPrice IS NULL OR Price <= @MaxPrice)
    ORDER BY Price DESC;
END;
GO
EXEC dbo.GetProductsByCategory @CategoryId = 1;
EXEC dbo.GetProductsByCategory @CategoryId = 1, @MaxPrice = 20;`, output: 'ProductId  Name              Price  Stock\n---------  ----------------  -----  -----\n        2  Cordless drill    89.00     12\n        1  Claw hammer       18.50     40\n        3  Tape measure 8 m   9.75     65\n\nProductId  Name              Price  Stock\n---------  ----------------  -----  -----\n        1  Claw hammer       18.50     40\n        3  Tape measure 8 m   9.75     65' },
      { type: 'h2', text: 'OUTPUT parameters' },
      { type: 'p', text: 'A procedure can return values through parameters marked `OUTPUT`. This one adds stock and hands back the new level. The caller must say `OUTPUT` too:' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.AddStock
    @ProductId int,
    @Qty       int = 1,
    @NewStock  int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Products
    SET Stock = Stock + @Qty
    WHERE ProductId = @ProductId;

    SELECT @NewStock = Stock FROM dbo.Products WHERE ProductId = @ProductId;
END;
GO
DECLARE @Stock int;

EXEC dbo.AddStock @ProductId = 9, @Qty = 50, @NewStock = @Stock OUTPUT;
SELECT @Stock AS WithOutput;

EXEC dbo.AddStock @ProductId = 9, @Qty = 50, @NewStock = @Stock;
SELECT @Stock AS WithoutOutput,
       (SELECT Stock FROM dbo.Products WHERE ProductId = 9) AS RealStock;`, output: 'WithOutput\n----------\n        50\n\nWithoutOutput  RealStock\n-------------  ---------\n           50        100' },
      { type: 'p', text: 'Look closely at the second call. Without the word OUTPUT at the call, the value is **not** copied back. There is no error and no warning: the variable keeps whatever it held before (50), while the real stock moved on to 100.' },
      { type: 'note', kind: 'warn', text: 'Forgetting OUTPUT at the call is one of the most common procedure bugs. The procedure works, the data changes, and the caller silently reads a stale or NULL value.' },
      { type: 'h2', text: 'Return codes and checking input' },
      { type: 'p', text: '`RETURN n` ends a procedure and hands back an integer status. By convention 0 means success. For a real error, raise one with `THROW`: it stops the procedure and the caller sees the message (the Error handling lesson covers THROW in full).' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.AddStock
    @ProductId int,
    @Qty       int = 1,
    @NewStock  int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @Qty <= 0
        THROW 50001, N'Quantity must be at least 1.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE ProductId = @ProductId)
        RETURN 1;                        -- no such product

    UPDATE dbo.Products
    SET Stock = Stock + @Qty
    WHERE ProductId = @ProductId;

    SELECT @NewStock = Stock FROM dbo.Products WHERE ProductId = @ProductId;
    RETURN 0;
END;
GO
DECLARE @rc int, @Stock int;

EXEC @rc = dbo.AddStock @ProductId = 99, @Qty = 5, @NewStock = @Stock OUTPUT;
SELECT @rc AS ReturnCode, @Stock AS NewStock;

EXEC @rc = dbo.AddStock @ProductId = 12, @NewStock = @Stock OUTPUT;   -- @Qty defaults to 1
SELECT @rc AS ReturnCode, @Stock AS NewStock;

EXEC @rc = dbo.AddStock 12, -5, @Stock OUTPUT;`, output: 'ReturnCode  NewStock\n----------  --------\n         1      NULL\n\nReturnCode  NewStock\n----------  --------\n         0         1\n\nMsg 50001, Level 16, State 1, Procedure dbo.AddStock, Line 10\nQuantity must be at least 1.' },
      { type: 'p', text: 'In a positional call you cannot just skip a parameter in the middle. Write the keyword `DEFAULT` in its place: `EXEC dbo.AddStock 12, DEFAULT, @Stock OUTPUT;`.' },
      { type: 'widget', name: 'proc-call' },
      { type: 'h2', text: 'Saving results from a procedure' },
      { type: 'p', text: 'A procedure’s result set can be captured with `INSERT … EXEC`. The table must have matching columns:' },
      { type: 'code', code: sql`
CREATE TABLE #Tools (ProductId int, Name nvarchar(60), Price decimal(10,2), Stock int);

INSERT INTO #Tools
EXEC dbo.GetProductsByCategory @CategoryId = 1;

SELECT COUNT(*) AS Tools, SUM(Price * Stock) AS StockValue FROM #Tools;
DROP TABLE #Tools;`, output: 'Tools  StockValue\n-----  ----------\n    3     2441.75' },
      { type: 'note', kind: 'tip', text: 'If you often need to filter or join a procedure’s result, it should probably be a view or a table-valued function instead (next lesson). Those can be used directly in FROM; a procedure cannot.' },
      { type: 'h2', text: 'The missing GO trap' },
      { type: 'p', text: 'A procedure’s body runs to the **end of the batch**, not to the end of the BEGIN … END block. Forget the GO after a procedure and the test lines below it become part of the procedure:' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.CountOrders
AS
    SELECT COUNT(*) AS Orders FROM dbo.Orders;

SELECT TOP (2) OrderId, Status FROM dbo.Orders ORDER BY OrderId;   -- meant as a test
GO
EXEC dbo.CountOrders;`, output: 'Orders\n------\n    10\n\nOrderId  Status\n-------  -------\n      1  Shipped\n      2  Shipped' },
      { type: 'p', text: 'The CREATE ran, but the test SELECT did not run: it was saved inside the procedure, so every call now returns two result sets. If the test line had been `EXEC dbo.CountOrders;`, the procedure would call itself until SQL Server stopped it at 32 levels deep (Msg 217). Always put GO straight after a procedure.' },
      { type: 'quiz', question: 'A procedure has `@Total money OUTPUT`. The caller runs `EXEC dbo.CalcTotal @Total = @t;`. What is in @t afterwards?', options: ['The value the procedure set', 'Whatever @t held before the call', 'An error is raised', 'Always 0'], answer: 1, explain: 'Without OUTPUT at the call, the parameter is input only. The procedure’s value is thrown away and @t is not changed.' },
      { type: 'quiz', question: 'Which call is wrong for `dbo.AddStock @ProductId int, @Qty int = 1, @NewStock int OUTPUT`?', options: ['EXEC dbo.AddStock @ProductId = 3, @NewStock = @s OUTPUT;', 'EXEC dbo.AddStock 3, DEFAULT, @s OUTPUT;', 'EXEC dbo.AddStock 3, @s OUTPUT;', 'EXEC dbo.AddStock @NewStock = @s OUTPUT, @ProductId = 3;'], answer: 2, explain: 'By position, @s lands in the second parameter, @Qty, and @NewStock is missing. Use DEFAULT to skip @Qty, or name the parameters.' },
      { type: 'exercise', task: 'Write a procedure dbo.CustomerOrders that takes @CustomerId and an optional @Status (default NULL, meaning all statuses) and returns that customer’s OrderId, OrderDate and Status, oldest first. Call it for customer 4 with no status, then for customer 2 with status Pending.', hint: 'Use the same optional-filter pattern as @MaxPrice: (@Status IS NULL OR Status = @Status). Put GO after the procedure, before the calls.', solution: sql`
CREATE OR ALTER PROCEDURE dbo.CustomerOrders
    @CustomerId int,
    @Status     varchar(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT OrderId, OrderDate, Status
    FROM dbo.Orders
    WHERE CustomerId = @CustomerId
      AND (@Status IS NULL OR Status = @Status)
    ORDER BY OrderDate;
END;
GO
EXEC dbo.CustomerOrders @CustomerId = 4;
EXEC dbo.CustomerOrders @CustomerId = 2, @Status = 'Pending';`, output: 'OrderId  OrderDate   Status\n-------  ----------  -------\n      4  2024-03-15  Shipped\n      7  2024-05-05  Shipped\n\nOrderId  OrderDate   Status\n-------  ----------  -------\n      9  2024-06-01  Pending' }
    ],
    keyPoints: [
      'A stored procedure is named, saved T-SQL; call it with EXEC and parameters.',
      'Start procedures with SET NOCOUNT ON; use CREATE OR ALTER so scripts can be rerun.',
      'Pass parameters by name for clarity; a parameter without a default must be supplied (Msg 201).',
      'A NULL default plus (@p IS NULL OR col = @p) makes a filter optional.',
      'OUTPUT is needed in both the definition and the call; forget it at the call and the value is silently lost.',
      'RETURN gives an integer status (0 = success); THROW raises a real error.',
      'INSERT … EXEC captures a procedure’s result set into a table.',
      'A procedure runs to the end of its batch: always put GO after it.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'user-defined-functions',
    title: 'Scalar and table-valued functions',
    summary: 'Your own functions: scalar functions that return one value, inline table-valued functions that work like views with parameters, multi-statement table-valued functions, what functions are not allowed to do, and why inline functions are usually the fast choice.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'A **user-defined function** (UDF) takes parameters and returns either one value or a table. Unlike a procedure, it is used **inside** a query: in the SELECT list, in WHERE, or in FROM.' },
      { type: 'table', head: ['Kind', 'Returns', 'Used in'], rows: [
        ['Scalar function', 'one value', 'SELECT, WHERE, ORDER BY, CHECK constraints …'],
        ['Inline table-valued function', 'a table, from one SELECT', 'FROM and APPLY, like a view with parameters'],
        ['Multi-statement table-valued function', 'a table variable it fills step by step', 'FROM and APPLY']
      ] },
      { type: 'h2', text: 'Scalar functions' },
      { type: 'code', code: sql`
CREATE OR ALTER FUNCTION dbo.PriceWithVat (@Price decimal(10,2))
RETURNS decimal(10,2)
AS
BEGIN
    RETURN ROUND(@Price * 1.20, 2);
END;
GO
SELECT Name, Price, dbo.PriceWithVat(Price) AS WithVat
FROM dbo.Products
WHERE dbo.PriceWithVat(Price) > 50
ORDER BY Price DESC;`, output: 'Name                 Price  WithVat\n-------------------  -----  -------\nCordless drill       89.00   106.80\nMasonry paint 10 L   54.00    64.80\nPlywood sheet 18 mm  42.00    50.40' },
      { type: 'p', text: 'The body is a BEGIN … END block that must end with RETURN. When you call the function you **must** include the schema. Without it, SQL Server looks for a built-in function of that name:' },
      { type: 'code', code: sql`
SELECT Name, PriceWithVat(Price) AS WithVat FROM dbo.Products;`, output: 'Msg 195, Level 15, State 10, Line 1\n\'PriceWithVat\' is not a recognized built-in function name.' },
      { type: 'h2', text: 'Inline table-valued functions' },
      { type: 'p', text: 'An inline table-valued function is a single SELECT with parameters. Think of it as a view you can pass values to:' },
      { type: 'code', code: sql`
CREATE OR ALTER FUNCTION dbo.OrdersFor (@CustomerId int)
RETURNS TABLE
AS
RETURN
    SELECT o.OrderId, o.OrderDate, o.Status,
           SUM(i.Quantity * i.UnitPrice) AS Total
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS i ON i.OrderId = o.OrderId
    WHERE o.CustomerId = @CustomerId
    GROUP BY o.OrderId, o.OrderDate, o.Status;
GO
SELECT * FROM dbo.OrdersFor(4) ORDER BY OrderDate;`, output: 'OrderId  OrderDate   Status    Total\n-------  ----------  -------  ------\n      4  2024-03-15  Shipped  524.00\n      7  2024-05-05  Shipped  199.50' },
      { type: 'p', text: 'Because it returns a table, it goes in FROM, and it can be joined, filtered and grouped like one. With `CROSS APPLY` it runs once per row of another table, which you met in the APPLY lesson:' },
      { type: 'code', code: sql`
SELECT c.FirstName, f.OrderId, f.Total
FROM dbo.Customers AS c
CROSS APPLY dbo.OrdersFor(c.CustomerId) AS f
WHERE f.Status = 'Shipped' AND f.Total > 100
ORDER BY f.Total DESC;`, output: 'FirstName  OrderId   Total\n---------  -------  ------\nDev              4  524.00\nDev              7  199.50\nFarid            5  120.50\nBen              2  113.00\nAsha             3  112.80' },
      { type: 'p', text: 'SQL Server **expands** an inline function into the calling query, as it does with a view. The optimizer sees the whole thing and can use indexes, so an inline function costs nothing extra.' },
      { type: 'widget', name: 'udf-kinds' },
      { type: 'h2', text: 'Multi-statement table-valued functions' },
      { type: 'p', text: 'When the result needs several steps, a multi-statement function declares a table variable, fills it, and returns it:' },
      { type: 'code', code: sql`
CREATE OR ALTER FUNCTION dbo.StockReport (@Below int)
RETURNS @Report TABLE (ProductId int, Name nvarchar(60), Stock int, Advice nvarchar(20))
AS
BEGIN
    INSERT INTO @Report (ProductId, Name, Stock)
    SELECT ProductId, Name, Stock FROM dbo.Products WHERE Stock < @Below;

    UPDATE @Report SET Advice = N'Reorder now' WHERE Stock = 0;
    UPDATE @Report SET Advice = N'Reorder soon' WHERE Advice IS NULL;
    RETURN;
END;
GO
SELECT * FROM dbo.StockReport(30) ORDER BY Stock;`, output: 'ProductId  Name                Stock  Advice\n---------  ------------------  -----  ------------\n        9  Wall plugs (100)        0  Reorder now\n       12  Safety goggles          0  Reorder now\n        2  Cordless drill         12  Reorder soon\n       10  Masonry paint 10 L     25  Reorder soon' },
      { type: 'p', text: 'This is easy to read, but the function is a black box to the optimizer: it runs the body, fills the table variable, and only then carries on. Most multi-statement functions can be rewritten as one SELECT (here a CASE would do). Prefer the inline form.' },
      { type: 'h2', text: 'What functions cannot do' },
      { type: 'p', text: 'A function must not change anything outside itself. It cannot INSERT, UPDATE or DELETE real tables, call a procedure that does, or use TRY … CATCH. Changing its own table variable, as above, is allowed. The rule is checked when you create the function:' },
      { type: 'code', code: sql`
CREATE OR ALTER FUNCTION dbo.TakeStock (@ProductId int)
RETURNS int
AS
BEGIN
    UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = @ProductId;
    RETURN 1;
END;`, output: 'Msg 443, Level 16, State 15, Procedure TakeStock, Line 5\nInvalid use of a side-effecting operator \'UPDATE\' within a function.' },
      { type: 'p', text: 'Use a stored procedure when you need to change data.' },
      { type: 'h2', text: 'Scalar functions and performance' },
      { type: 'p', text: 'A scalar function used in a query used to run **once per row**, as a separate call, and it stopped the query using parallel plans. On a million rows that was very slow. SQL Server 2019 added **scalar UDF inlining**: simple scalar functions are now merged into the query like inline functions. Not every function qualifies. One that reads the current time, for example, cannot be inlined, and `sys.sql_modules` tells you which ones can:' },
      { type: 'code', code: sql`
CREATE OR ALTER FUNCTION dbo.DaysSince (@d date)
RETURNS int
AS
BEGIN
    RETURN DATEDIFF(day, @d, GETDATE());
END;
GO
SELECT OBJECT_NAME(object_id) AS FunctionName, is_inlineable
FROM sys.sql_modules
WHERE OBJECT_NAME(object_id) IN (N'PriceWithVat', N'DaysSince')
ORDER BY FunctionName;`, output: 'FunctionName  is_inlineable\n------------  -------------\nDaysSince     0\nPriceWithVat  1' },
      { type: 'note', kind: 'tip', text: 'When performance matters, the safest choice is an inline table-valued function, even for a single value: `CROSS APPLY dbo.Fn(col) AS f` and then `f.Value`. Inline functions are always expanded, on every version of SQL Server.' },
      { type: 'table', head: ['', 'Stored procedure', 'Function'], rows: [
        ['Called with', '`EXEC`', 'inside a query'],
        ['Can change data', 'yes', 'no'],
        ['Returns', 'result sets, OUTPUT parameters, a return code', 'one value, or one table'],
        ['TRY … CATCH, transactions', 'yes', 'no'],
        ['Use in FROM or WHERE', 'no', 'yes']
      ] },
      { type: 'quiz', question: 'Why does `SELECT PriceWithVat(Price) FROM dbo.Products` fail when dbo.PriceWithVat exists?', options: ['Functions cannot be used in SELECT', 'User-defined scalar functions must be called with their schema: dbo.PriceWithVat', 'The function needs EXEC', 'Price must be cast first'], answer: 1, explain: 'Without the schema, SQL Server looks only for a built-in function named PriceWithVat, and there is none (Msg 195).' },
      { type: 'quiz', question: 'Which kind of function does the optimizer always expand into the calling query, like a view?', options: ['Scalar function', 'Inline table-valued function', 'Multi-statement table-valued function', 'None of them'], answer: 1, explain: 'An inline TVF is a single SELECT, so it is merged into the query. Scalar functions are inlined only when they qualify (SQL Server 2019+); multi-statement ones never are.' },
      { type: 'exercise', task: 'Write an inline table-valued function dbo.ProductsInCategory(@CategoryName nvarchar(40)) that returns the Name and Price of the products in the category with that name. Use it to list the Timber products, cheapest first.', hint: 'RETURNS TABLE AS RETURN SELECT … with a join to Categories and WHERE c.Name = @CategoryName. The ORDER BY goes in the query that calls it.', solution: sql`
CREATE OR ALTER FUNCTION dbo.ProductsInCategory (@CategoryName nvarchar(40))
RETURNS TABLE
AS
RETURN
    SELECT p.Name, p.Price
    FROM dbo.Products AS p
    JOIN dbo.Categories AS c ON c.CategoryId = p.CategoryId
    WHERE c.Name = @CategoryName;
GO
SELECT Name, Price
FROM dbo.ProductsInCategory(N'Timber')
ORDER BY Price;`, output: 'Name                 Price\n-------------------  -----\nTimber 2x4 2.4 m      6.80\nPlywood sheet 18 mm  42.00' }
    ],
    keyPoints: [
      'Scalar functions return one value; table-valued functions return a table and go in FROM or APPLY.',
      'Call scalar UDFs with their schema (dbo.Fn), or SQL Server looks for a built-in (Msg 195).',
      'An inline TVF is one SELECT with parameters, a view with parameters, and is expanded into the query for free.',
      'A multi-statement TVF fills a table variable step by step; the optimizer cannot see inside it.',
      'Functions cannot change data, call procedures that do, or use TRY … CATCH (Msg 443).',
      'SQL Server 2019+ inlines simple scalar functions; sys.sql_modules.is_inlineable shows which.',
      'When in doubt, write an inline table-valued function.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'error-handling',
    title: 'Error handling: TRY...CATCH and THROW',
    summary: 'What SQL Server does when a statement fails, why a failed statement does not stop the batch or undo a transaction, TRY … CATCH and the ERROR_ functions, THROW and RAISERROR, XACT_ABORT and doomed transactions, the errors CATCH cannot see, and a procedure template that gets it right.',
    minutes: 19,
    blocks: [
      { type: 'p', text: 'BuildMart should never sell stock it does not have. Add a CHECK constraint so that Stock can never go below zero. The rest of this lesson tries to break it.' },
      { type: 'code', code: sql`
ALTER TABLE dbo.Products DROP CONSTRAINT IF EXISTS CK_Products_Stock;
ALTER TABLE dbo.Products ADD CONSTRAINT CK_Products_Stock CHECK (Stock >= 0);` },
      { type: 'h2', text: 'By default, an error does not stop the script' },
      { type: 'p', text: 'A customer buys 2 cordless drills (12 in stock) and 5 boxes of wall plugs (none in stock). Run the two updates as a plain script:' },
      { type: 'code', code: sql`
UPDATE dbo.Products SET Stock = Stock - 2 WHERE ProductId = 2;  -- Cordless drill
UPDATE dbo.Products SET Stock = Stock - 5 WHERE ProductId = 9;  -- Wall plugs
PRINT N'Script finished';

SELECT ProductId, Name, Stock FROM dbo.Products WHERE ProductId IN (2, 9);`, output: 'Msg 547, Level 16, State 0, Line 2\nThe UPDATE statement conflicted with the CHECK constraint "CK_Products_Stock". The conflict occurred in database "BuildMart", table "dbo.Products", column \'Stock\'.\nThe statement has been terminated.\nScript finished\n\nProductId  Name              Stock\n---------  ----------------  -----\n        2  Cordless drill       10\n        9  Wall plugs (100)      0' },
      { type: 'p', text: 'Most errors, like this constraint violation, end **only the statement** that failed. SQL Server then runs the next line as if nothing had happened. The drills were taken out of stock and the wall plugs were not: half a sale.' },
      { type: 'p', text: 'A transaction does not fix this by itself. `BEGIN TRANSACTION … COMMIT` groups the statements, but the failed statement does not cancel the transaction, so COMMIT happily saves the half that worked:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;
    UPDATE dbo.Products SET Stock = Stock - 2 WHERE ProductId = 2;
    UPDATE dbo.Products SET Stock = Stock - 5 WHERE ProductId = 9;
COMMIT;

SELECT ProductId, Name, Stock FROM dbo.Products WHERE ProductId IN (2, 9);`, output: 'Msg 547, Level 16, State 0, Line 3\nThe UPDATE statement conflicted with the CHECK constraint "CK_Products_Stock". The conflict occurred in database "BuildMart", table "dbo.Products", column \'Stock\'.\nThe statement has been terminated.\n\nProductId  Name              Stock\n---------  ----------------  -----\n        2  Cordless drill        8\n        9  Wall plugs (100)      0' },
      { type: 'h2', text: 'TRY … CATCH' },
      { type: 'p', text: 'Put the statements in a `BEGIN TRY` block. When an error happens inside it, SQL Server jumps straight to the `BEGIN CATCH` block, and the rest of the TRY block is skipped. In CATCH you roll back and report:' },
      { type: 'code', code: sql`
BEGIN TRY
    BEGIN TRANSACTION;
        UPDATE dbo.Products SET Stock = Stock - 2 WHERE ProductId = 2;
        UPDATE dbo.Products SET Stock = Stock - 5 WHERE ProductId = 9;
    COMMIT;
    PRINT N'Sale saved';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    PRINT CONCAT(N'Sale cancelled: error ', ERROR_NUMBER(), N' on line ', ERROR_LINE());
END CATCH;

SELECT ProductId, Name, Stock FROM dbo.Products WHERE ProductId IN (2, 9);`, output: 'Sale cancelled: error 547 on line 4\n\nProductId  Name              Stock\n---------  ----------------  -----\n        2  Cordless drill        8\n        9  Wall plugs (100)      0' },
      { type: 'p', text: 'The drill stock did not move this time: the first update was undone by the ROLLBACK. `@@TRANCOUNT` is the number of open transactions; checking it before ROLLBACK avoids a second error when the failure happened before BEGIN TRANSACTION.' },
      { type: 'p', text: 'Inside CATCH, a set of functions describes the error. Outside a CATCH block they return NULL.' },
      { type: 'code', code: sql`
BEGIN TRY
    SELECT 10 / 0 AS Result;
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER()   AS Number,
           ERROR_SEVERITY() AS Severity,
           ERROR_STATE()    AS State,
           ERROR_LINE()     AS Line,
           ERROR_MESSAGE()  AS Message;
END CATCH;`, output: 'Result\n------\n\nNumber  Severity  State  Line  Message\n------  --------  -----  ----  ---------------------------------\n  8134        16      1     2  Divide by zero error encountered.' },
      { type: 'p', text: 'The empty **Result** grid is real: the SELECT had started, and sent its column heading, before the division failed. Then the CATCH block ran and returned its own result. Errors are graded by **severity**:' },
      { type: 'table', head: ['Severity', 'Meaning'], rows: [
        ['0–10', 'information and warnings: not caught by CATCH, shown as messages'],
        ['11–16', 'errors the user can fix: constraint violations, bad data, THROW. Caught by CATCH'],
        ['17–19', 'resource or software problems, such as running out of space'],
        ['20–25', 'fatal: the connection is closed']
      ] },
      { type: 'h2', text: 'Raising your own errors: THROW' },
      { type: 'p', text: '`THROW number, message, state;` raises an error. Use numbers from 50000 up for your own errors. Inside CATCH, `THROW;` on its own **re-raises** the error that was caught, with its original number and message. That lets you clean up and still tell the caller what went wrong:' },
      { type: 'code', code: sql`
DECLARE @Qty int = 0;

BEGIN TRY
    IF @Qty <= 0
        THROW 50001, N'Quantity must be at least 1.', 1;
    PRINT N'Not reached';
END TRY
BEGIN CATCH
    PRINT CONCAT(N'Logged: ', ERROR_MESSAGE());
    THROW;   -- pass the same error on to the caller
END CATCH;`, output: 'Logged: Quantity must be at least 1.\nMsg 50001, Level 16, State 1, Line 5\nQuantity must be at least 1.' },
      { type: 'note', kind: 'warn', text: 'The statement **before** THROW must end with a semicolon. Without it, `PRINT N\'x\' THROW;` is read as something else and fails with a confusing syntax error. Ending every statement with ; avoids the problem.' },
      { type: 'p', text: 'Older code uses `RAISERROR`. It can fill in values like printf, `%s` for text and `%d` for whole numbers, and its severity can be anything:' },
      { type: 'code', code: sql`
RAISERROR(N'Product %d has only %d in stock.', 16, 1, 9, 0);
RAISERROR(N'Just a warning: severity 10 is not an error.', 10, 1);
PRINT N'Still running';`, output: 'Msg 50000, Level 16, State 1, Line 1\nProduct 9 has only 0 in stock.\nJust a warning: severity 10 is not an error.\nStill running' },
      { type: 'table', head: ['', '`THROW`', '`RAISERROR`'], rows: [
        ['Re-raise the caught error', '`THROW;`', 'not possible: you build a new error'],
        ['Severity', 'always 16', 'any; 10 or less is only a message'],
        ['printf-style values', 'no (use FORMATMESSAGE or CONCAT)', 'yes: %s, %d'],
        ['Error number', 'your own, 50000 and up', 'always 50000 for a text message'],
        ['Use in new code', 'yes', 'for warnings and progress messages']
      ] },
      { type: 'h2', text: 'XACT_ABORT: make errors stop everything' },
      { type: 'p', text: '`SET XACT_ABORT ON` changes the default. Any runtime error now ends the **whole batch** and rolls back the open transaction. A script with a transaction is all-or-nothing even without TRY … CATCH:' },
      { type: 'code', code: sql`
SET XACT_ABORT ON;

BEGIN TRANSACTION;
    UPDATE dbo.Products SET Stock = Stock - 2 WHERE ProductId = 2;
    UPDATE dbo.Products SET Stock = Stock - 5 WHERE ProductId = 9;
COMMIT;
PRINT N'Not reached';
GO
SET XACT_ABORT OFF;
SELECT ProductId, Name, Stock, @@TRANCOUNT AS OpenTransactions
FROM dbo.Products WHERE ProductId IN (2, 9);`, output: 'Msg 547, Level 16, State 0, Line 5\nThe UPDATE statement conflicted with the CHECK constraint "CK_Products_Stock". The conflict occurred in database "BuildMart", table "dbo.Products", column \'Stock\'.\n\nProductId  Name              Stock  OpenTransactions\n---------  ----------------  -----  ----------------\n        2  Cordless drill        8                 0\n        9  Wall plugs (100)      0                 0' },
      { type: 'p', text: 'With XACT_ABORT ON **and** TRY … CATCH, an error in the TRY block still jumps to CATCH, but the transaction is now **doomed**: it can only be rolled back. `XACT_STATE()` tells you: 1 means a healthy open transaction, 0 none, and -1 doomed. Trying to commit a doomed transaction is itself an error:' },
      { type: 'code', code: sql`
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;
        UPDATE dbo.Products SET Stock = Stock - 5 WHERE ProductId = 9;
    COMMIT;
END TRY
BEGIN CATCH
    PRINT CONCAT(N'XACT_STATE() = ', XACT_STATE());
    COMMIT;   -- wrong: a doomed transaction can only be rolled back
END CATCH;
GO
SET XACT_ABORT OFF;
IF @@TRANCOUNT > 0 ROLLBACK;`, output: 'XACT_STATE() = -1\nMsg 3930, Level 16, State 1, Line 10\nThe current transaction cannot be committed and cannot support operations that write to the log file. Roll back the transaction.' },
      { type: 'widget', name: 'try-catch-flow' },
      { type: 'h2', text: 'Errors CATCH cannot see' },
      { type: 'p', text: 'TRY … CATCH only catches errors that happen while the TRY block **runs**. An error found while the batch is being **compiled**, such as a syntax error, stops the batch before TRY starts. A table that does not exist is a trap: the name is checked only when that statement is about to run, and that error is not caught at the same level either:' },
      { type: 'code', code: sql`
BEGIN TRY
    SELECT * FROM dbo.NoSuchTable;
END TRY
BEGIN CATCH
    PRINT N'Caught it';
END CATCH;`, output: 'Msg 208, Level 16, State 1, Line 2\nInvalid object name \'dbo.NoSuchTable\'.' },
      { type: 'p', text: 'The same error **is** caught when it happens one level down, inside a procedure or dynamic SQL called from the TRY block:' },
      { type: 'code', code: sql`
BEGIN TRY
    EXEC sp_executesql N'SELECT * FROM dbo.NoSuchTable';
END TRY
BEGIN CATCH
    PRINT CONCAT(N'Caught ', ERROR_NUMBER(), N': ', ERROR_MESSAGE());
END CATCH;`, output: 'Caught 208: Invalid object name \'dbo.NoSuchTable\'.' },
      { type: 'h2', text: 'A procedure template' },
      { type: 'p', text: 'Put it all together and most data-changing procedures can follow one shape: XACT_ABORT ON, one transaction inside TRY, and a CATCH that rolls back and re-throws so the caller hears about it.' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.SellProduct
    @ProductId int,
    @Qty       int
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @Qty <= 0
            THROW 50001, N'Quantity must be at least 1.', 1;

        BEGIN TRANSACTION;
            UPDATE dbo.Products SET Stock = Stock - @Qty WHERE ProductId = @ProductId;
            IF @@ROWCOUNT = 0
                THROW 50002, N'No such product.', 1;
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;
GO
EXEC dbo.SellProduct @ProductId = 3, @Qty = 5;
SELECT Name, Stock FROM dbo.Products WHERE ProductId = 3;
EXEC dbo.SellProduct @ProductId = 9, @Qty = 1;`, output: 'Name              Stock\n----------------  -----\nTape measure 8 m     60\n\nMsg 547, Level 16, State 0, Procedure dbo.SellProduct, Line 14\nThe UPDATE statement conflicted with the CHECK constraint "CK_Products_Stock". The conflict occurred in database "BuildMart", table "dbo.Products", column \'Stock\'.' },
      { type: 'note', kind: 'info', text: 'The error message names the procedure and the line inside it where the error happened, which makes problems much easier to find. In SSMS you can double-click it to jump to the line.' },
      { type: 'quiz', question: 'Without TRY … CATCH or XACT_ABORT, the second of three statements inside BEGIN TRANSACTION … COMMIT fails with a constraint violation. What is saved?', options: ['Nothing: the transaction is rolled back', 'Statements 1 and 3', 'Only statement 1', 'Nothing: the batch stops at the error'], answer: 1, explain: 'The failed statement is ended on its own; the batch carries on, statement 3 runs, and COMMIT saves both 1 and 3.' },
      { type: 'quiz', question: 'With XACT_ABORT ON, an error in a TRY block jumps to CATCH. What does XACT_STATE() return there?', options: ['1: the transaction can be committed', '0: there is no transaction', '-1: the transaction is doomed and can only be rolled back', 'NULL'], answer: 2, explain: 'XACT_ABORT makes every error doom the transaction. COMMIT fails (Msg 3930); only ROLLBACK is possible.' },
      { type: 'exercise', task: 'Write a script that, in one transaction, adds 10 to the stock of product 1 and takes 999 from the stock of product 3 (which breaks the CHECK constraint). Use TRY … CATCH so that neither change is kept, and print the error message in CATCH. Finish with a SELECT of both products’ stock.', hint: 'BEGIN TRY, BEGIN TRANSACTION, the two UPDATEs, COMMIT, END TRY; then BEGIN CATCH with IF @@TRANCOUNT > 0 ROLLBACK and PRINT ERROR_MESSAGE().', solution: sql`
BEGIN TRY
    BEGIN TRANSACTION;
        UPDATE dbo.Products SET Stock = Stock + 10  WHERE ProductId = 1;
        UPDATE dbo.Products SET Stock = Stock - 999 WHERE ProductId = 3;
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    PRINT ERROR_MESSAGE();
END CATCH;

SELECT ProductId, Name, Stock FROM dbo.Products WHERE ProductId IN (1, 3);`, output: 'The UPDATE statement conflicted with the CHECK constraint "CK_Products_Stock". The conflict occurred in database "BuildMart", table "dbo.Products", column \'Stock\'.\n\nProductId  Name              Stock\n---------  ----------------  -----\n        1  Claw hammer          40\n        3  Tape measure 8 m     60' }
    ],
    keyPoints: [
      'By default most errors end only the failing statement; the batch and the transaction carry on.',
      'BEGIN TRANSACTION alone is not all-or-nothing: COMMIT saves whatever succeeded.',
      'TRY … CATCH jumps to CATCH on an error; roll back there with IF @@TRANCOUNT > 0 ROLLBACK.',
      'ERROR_NUMBER, ERROR_MESSAGE, ERROR_LINE, ERROR_PROCEDURE … describe the error inside CATCH.',
      'THROW n, msg, state raises your own error (50000+); THROW; on its own re-raises the caught one.',
      'SET XACT_ABORT ON makes any error abort the batch and roll back; in CATCH the transaction is doomed (XACT_STATE() = -1).',
      'Compile errors and missing objects in the same scope are not caught; they are one level down.',
      'Template: SET XACT_ABORT ON; TRY { BEGIN TRAN … COMMIT } CATCH { IF @@TRANCOUNT > 0 ROLLBACK; THROW; }.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'triggers',
    title: 'Triggers',
    summary: 'Code that runs by itself when data changes: AFTER triggers, the inserted and deleted tables, the single-row trigger bug, an audit trail, blocking changes with THROW, INSTEAD OF triggers on views, managing triggers, and when not to use them.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'A **trigger** is a special procedure attached to a table. Nobody calls it: SQL Server runs it automatically whenever an INSERT, UPDATE or DELETE changes the table. BuildMart wants a history of every price change, whoever makes it, from whatever application. That is a classic job for a trigger.' },
      { type: 'code', code: sql`
DROP TABLE IF EXISTS dbo.PriceHistory;
CREATE TABLE dbo.PriceHistory (
    ChangeId  int           NOT NULL IDENTITY PRIMARY KEY,
    ProductId int           NOT NULL,
    OldPrice  decimal(10,2) NOT NULL,
    NewPrice  decimal(10,2) NOT NULL,
    ChangedAt datetime2(0)  NOT NULL DEFAULT SYSDATETIME()
);` },
      { type: 'h2', text: 'inserted and deleted' },
      { type: 'p', text: 'Inside a trigger, two read-only tables hold the rows the statement changed. They have the same columns as the table:' },
      { type: 'table', head: ['Statement', '`inserted` holds', '`deleted` holds'], rows: [
        ['INSERT', 'the new rows', 'nothing'],
        ['UPDATE', 'the rows **after** the change', 'the same rows **before** the change'],
        ['DELETE', 'nothing', 'the removed rows']
      ] },
      { type: 'p', text: 'So an UPDATE trigger can compare old and new values by joining deleted to inserted on the key. Here is the trigger most people write first. It looks right:' },
      { type: 'code', code: sql`
CREATE OR ALTER TRIGGER dbo.trg_Products_PriceHistory
ON dbo.Products
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id int, @Old decimal(10,2), @New decimal(10,2);

    SELECT @Id = i.ProductId, @Old = d.Price, @New = i.Price
    FROM inserted AS i
    JOIN deleted AS d ON d.ProductId = i.ProductId;

    IF @Old <> @New
        INSERT INTO dbo.PriceHistory (ProductId, OldPrice, NewPrice)
        VALUES (@Id, @Old, @New);
END;
GO
UPDATE dbo.Products SET Price = 19.99 WHERE ProductId = 1;          -- one row
UPDATE dbo.Products SET Price = Price * 1.10 WHERE CategoryId = 5;  -- two rows

SELECT COUNT(*) AS PricesChanged, (SELECT COUNT(*) FROM dbo.PriceHistory) AS RowsLogged
FROM dbo.Products
WHERE ProductId = 1 OR CategoryId = 5;`, output: 'PricesChanged  RowsLogged\n-------------  ----------\n            3           2' },
      { type: 'p', text: 'Three prices changed but only two were logged. A trigger runs **once per statement**, not once per row. The second UPDATE changed two paint products, so inserted held two rows, and `SELECT @Id = …` kept only one of them.' },
      { type: 'note', kind: 'warn', text: 'If a trigger puts columns from inserted or deleted into variables, it is almost certainly wrong. Always write triggers as set-based statements that handle every row in inserted and deleted.' },
      { type: 'p', text: 'The correct version is shorter. One INSERT … SELECT handles any number of rows, and the WHERE skips updates that did not change the price:' },
      { type: 'code', code: sql`
CREATE OR ALTER TRIGGER dbo.trg_Products_PriceHistory
ON dbo.Products
AFTER UPDATE
AS
BEGIN
    IF @@ROWCOUNT = 0 RETURN;     -- the statement changed no rows
    SET NOCOUNT ON;

    INSERT INTO dbo.PriceHistory (ProductId, OldPrice, NewPrice)
    SELECT i.ProductId, d.Price, i.Price
    FROM inserted AS i
    JOIN deleted AS d ON d.ProductId = i.ProductId
    WHERE i.Price <> d.Price;
END;
GO
TRUNCATE TABLE dbo.PriceHistory;

UPDATE dbo.Products SET Price = Price * 1.10 WHERE CategoryId = 5;  -- two prices
UPDATE dbo.Products SET Stock = Stock + 1 WHERE ProductId = 2;      -- no price change
UPDATE dbo.Products SET Price = 5 WHERE CategoryId = 7;             -- no rows at all

SELECT ChangeId, ProductId, OldPrice, NewPrice FROM dbo.PriceHistory ORDER BY ChangeId;`, output: 'ChangeId  ProductId  OldPrice  NewPrice\n--------  ---------  --------  --------\n       1         11     13.75     15.13\n       2         10     59.40     65.34' },
      { type: 'p', text: 'A trigger fires even when the statement changes no rows, as the last UPDATE did. `IF @@ROWCOUNT = 0 RETURN;` skips the work in that case. It must be the **first** line, because SET and most other statements reset @@ROWCOUNT.' },
      { type: 'h2', text: 'An audit trail for every change' },
      { type: 'p', text: 'One trigger can fire for several kinds of statement. To tell them apart, look at which of the two tables has rows: a FULL OUTER JOIN of inserted and deleted covers all three cases in one statement.' },
      { type: 'code', code: sql`
DROP TABLE IF EXISTS dbo.ProductAudit;
CREATE TABLE dbo.ProductAudit (
    AuditId   int           NOT NULL IDENTITY PRIMARY KEY,
    Action    varchar(6)    NOT NULL,
    ProductId int           NOT NULL,
    OldPrice  decimal(10,2) NULL,
    NewPrice  decimal(10,2) NULL
);
GO
CREATE OR ALTER TRIGGER dbo.trg_Products_Audit
ON dbo.Products
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    IF @@ROWCOUNT = 0 RETURN;
    SET NOCOUNT ON;

    INSERT INTO dbo.ProductAudit (Action, ProductId, OldPrice, NewPrice)
    SELECT CASE WHEN d.ProductId IS NULL THEN 'INSERT'
                WHEN i.ProductId IS NULL THEN 'DELETE'
                ELSE 'UPDATE' END,
           COALESCE(i.ProductId, d.ProductId), d.Price, i.Price
    FROM inserted AS i
    FULL OUTER JOIN deleted AS d ON d.ProductId = i.ProductId
    ORDER BY COALESCE(i.ProductId, d.ProductId);   -- AuditIds follow ProductId
END;
GO
INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (N'Spirit level 600 mm', 1, 15.00, 20, N'each', '2024-07-01'),
       (N'Wood glue 1 L',       4,  8.40, 35, N'bottle', '2024-07-01');

UPDATE dbo.Products SET Price = 14.50 WHERE ProductId = 13;
DELETE FROM dbo.Products WHERE ProductId > 12;

SELECT AuditId, Action, ProductId, OldPrice, NewPrice
FROM dbo.ProductAudit
ORDER BY AuditId;`, output: 'AuditId  Action  ProductId  OldPrice  NewPrice\n-------  ------  ---------  --------  --------\n      1  INSERT         13      NULL     15.00\n      2  INSERT         14      NULL      8.40\n      3  UPDATE         13     15.00     14.50\n      4  DELETE         13     14.50      NULL\n      5  DELETE         14      8.40      NULL' },
      { type: 'widget', name: 'trigger-audit' },
      { type: 'h2', text: 'Blocking a change' },
      { type: 'p', text: 'An AFTER trigger runs **inside** the statement’s transaction, after the change is made but before it is committed. If the trigger raises an error, the change is undone. That allows rules a CHECK constraint cannot express, such as comparing the old and new value:' },
      { type: 'code', code: sql`
CREATE OR ALTER TRIGGER dbo.trg_Products_PriceGuard
ON dbo.Products
AFTER UPDATE
AS
BEGIN
    IF @@ROWCOUNT = 0 RETURN;
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1
               FROM inserted AS i
               JOIN deleted AS d ON d.ProductId = i.ProductId
               WHERE i.Price > d.Price * 1.5)
        THROW 50010, N'A price rise of more than half needs approval.', 1;
END;
GO
UPDATE dbo.Products SET Price = Price * 2 WHERE ProductId = 5;   -- Sand: 4.10 -> 8.20
PRINT N'Not reached';
GO
SELECT Name, Price FROM dbo.Products WHERE ProductId = 5;`, output: 'Msg 50010, Level 16, State 1, Procedure trg_Products_PriceGuard, Line 13\nA price rise of more than half needs approval.\n\nName        Price\n----------  -----\nSand 25 kg   4.10' },
      { type: 'p', text: 'The error in the trigger rolled back the UPDATE and ended the batch, so the PRINT never ran. Inside a trigger, XACT_ABORT is on by default.' },
      { type: 'h2', text: 'INSTEAD OF triggers' },
      { type: 'p', text: 'An **INSTEAD OF** trigger runs in place of the statement: the change itself never happens unless the trigger makes it. Its main use is making a view writable when SQL Server cannot do it alone. This view shows category names, so an INSERT into it cannot know the CategoryId. The trigger looks it up:' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW dbo.ProductCatalogue
AS
SELECT p.ProductId, p.Name, c.Name AS Category, p.Price
FROM dbo.Products AS p
JOIN dbo.Categories AS c ON c.CategoryId = p.CategoryId;
GO
CREATE OR ALTER TRIGGER dbo.trg_ProductCatalogue_Insert
ON dbo.ProductCatalogue
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
    SELECT i.Name, c.CategoryId, i.Price, 0, N'each', '2024-07-01'
    FROM inserted AS i
    JOIN dbo.Categories AS c ON c.Name = i.Category;
END;
GO
INSERT INTO dbo.ProductCatalogue (Name, Category, Price)
VALUES (N'Pipe wrench', N'Plumbing', 16.00),
       (N'Ear defenders', N'Safety', 11.50);

SELECT ProductId, Name, Category, Price
FROM dbo.ProductCatalogue
WHERE ProductId > 12
ORDER BY ProductId;`, output: 'ProductId  Name           Category  Price\n---------  -------------  --------  -----\n       15  Ear defenders  Safety    11.50\n       16  Pipe wrench    Plumbing  16.00' },
      { type: 'p', text: 'The ProductIds start at 15, not 13: the two products inserted and deleted in the audit example used 13 and 14, and IDENTITY never reuses a value.' },
      { type: 'h2', text: 'Managing triggers' },
      { type: 'p', text: 'Triggers are easy to forget, because nothing in an INSERT or UPDATE shows that one will run. `sys.triggers` lists them, and a trigger can be switched off and on without dropping it:' },
      { type: 'code', code: sql`
DISABLE TRIGGER dbo.trg_Products_PriceGuard ON dbo.Products;

SELECT t.name AS TriggerName, OBJECT_NAME(t.parent_id) AS OnObject,
       t.is_instead_of_trigger AS InsteadOf, t.is_disabled AS Disabled
FROM sys.triggers AS t
ORDER BY t.name;

ENABLE TRIGGER dbo.trg_Products_PriceGuard ON dbo.Products;`, output: 'TriggerName                  OnObject          InsteadOf  Disabled\n---------------------------  ----------------  ---------  --------\ntrg_ProductCatalogue_Insert  ProductCatalogue  1          0\ntrg_Products_Audit           Products          0          0\ntrg_Products_PriceGuard      Products          0          1\ntrg_Products_PriceHistory    Products          0          0' },
      { type: 'p', text: 'dbo.Products now has three AFTER UPDATE triggers. They all run, but in an order you should not rely on. (`sp_settriggerorder` can choose the first and last.)' },
      { type: 'h2', text: 'When not to use a trigger' },
      { type: 'p', text: 'Triggers are hidden: a simple UPDATE can set off several of them, they make every change slower, and their errors surprise people. Use the simplest tool that works:' },
      { type: 'table', head: ['Need', 'Better tool'], rows: [
        ['A rule about one row’s values', 'CHECK constraint'],
        ['A value must exist in another table', 'FOREIGN KEY'],
        ['A default value', 'DEFAULT constraint'],
        ['Return the changed rows to the caller', 'the OUTPUT clause'],
        ['Full row history with point-in-time queries', 'temporal tables (Master level module)'],
        ['Compare old and new values, or audit every change from any source', 'a trigger']
      ] },
      { type: 'quiz', question: 'An UPDATE changes 50 rows. How many times does an AFTER UPDATE trigger on the table run?', options: ['50 times, once per row', 'Once, with 50 rows in inserted and deleted', 'Not at all; triggers are only for INSERT', 'Once per column changed'], answer: 1, explain: 'T-SQL triggers fire once per statement. inserted and deleted hold all 50 rows, so the trigger must handle sets.' },
      { type: 'quiz', question: 'Inside an UPDATE trigger, where do you find the price before the change?', options: ['inserted.Price', 'deleted.Price', 'dbo.Products.Price', 'OLD.Price'], answer: 1, explain: 'deleted holds the rows as they were before the UPDATE; inserted holds them after it.' },
      { type: 'exercise', task: 'Create a table dbo.StockAlerts (ProductId int, Name nvarchar(60)) and an AFTER UPDATE trigger on dbo.Products that adds a row to it for every product whose Stock drops from above zero to zero. Test it by setting Stock = 0 for products 1 and 3 in one UPDATE, then select the alerts.', hint: 'Join inserted to deleted on ProductId and keep the rows where d.Stock > 0 AND i.Stock = 0. Use one INSERT … SELECT so both products are recorded.', solution: sql`
DROP TABLE IF EXISTS dbo.StockAlerts;
CREATE TABLE dbo.StockAlerts (ProductId int, Name nvarchar(60));
GO
CREATE OR ALTER TRIGGER dbo.trg_Products_StockAlert
ON dbo.Products
AFTER UPDATE
AS
BEGIN
    IF @@ROWCOUNT = 0 RETURN;
    SET NOCOUNT ON;

    INSERT INTO dbo.StockAlerts (ProductId, Name)
    SELECT i.ProductId, i.Name
    FROM inserted AS i
    JOIN deleted AS d ON d.ProductId = i.ProductId
    WHERE d.Stock > 0 AND i.Stock = 0;
END;
GO
UPDATE dbo.Products SET Stock = 0 WHERE ProductId IN (1, 3);

SELECT ProductId, Name FROM dbo.StockAlerts ORDER BY ProductId;`, output: 'ProductId  Name\n---------  ----------------\n        1  Claw hammer\n        3  Tape measure 8 m' }
    ],
    keyPoints: [
      'A trigger runs automatically for INSERT, UPDATE or DELETE on its table or view.',
      'inserted holds new rows, deleted old rows; an UPDATE fills both.',
      'Triggers fire once per statement: never copy inserted or deleted into variables; write set-based code.',
      'Start with IF @@ROWCOUNT = 0 RETURN; then SET NOCOUNT ON.',
      'AFTER triggers run inside the statement’s transaction: THROW in a trigger undoes the change and ends the batch.',
      'INSTEAD OF triggers replace the statement; they make complex views writable.',
      'sys.triggers lists triggers; DISABLE / ENABLE TRIGGER switch them off and on.',
      'Prefer constraints, OUTPUT or temporal tables when they do the job; triggers are hidden and add cost.'
    ]
  }
];
