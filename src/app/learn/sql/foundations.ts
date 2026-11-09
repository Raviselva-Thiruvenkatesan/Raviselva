import { Lesson } from '../learn.types';
import { sql } from './sql';

export const FOUNDATIONS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'what-is-a-database',
    title: 'What is a database? SQL Server, SSMS and the BuildMart sample',
    summary: 'What a relational database is, how SQL Server organises one, how to install the free tools, and how to create the BuildMart database that every lesson uses.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A **database** is an organised store of data that many people and programs can read and change at the same time, safely. A **relational** database keeps that data in **tables**: named grids where every row is one thing (one product, one customer, one order) and every column is one fact about it (its name, its price, the date it was added).' },
      { type: 'p', text: '**SQL Server** is Microsoft’s relational database engine. You talk to it in **SQL** (Structured Query Language), the standard language for relational databases. SQL Server’s version of SQL is called **T-SQL** (Transact-SQL): standard SQL plus extras such as variables, loops and error handling.' },
      { type: 'p', text: 'One SQL Server holds many databases, each database groups its tables into schemas, and each table holds rows. Click through the levels below. The tables are the ones you will create in a moment.' },
      { type: 'widget', name: 'db-anatomy' },
      { type: 'h2', text: 'Why not just use a spreadsheet?' },
      { type: 'p', text: 'A spreadsheet is also a grid of rows and columns, and for a short list it is fine. A database earns its keep once data is shared, large or important:' },
      { type: 'table', head: ['', 'Spreadsheet', 'Database'], rows: [
        ['Types', 'Any cell can hold anything: a price column can contain “TBC”', 'Every column has a type; SQL Server rejects a price of “TBC”'],
        ['Many users', 'One person edits at a time, or copies drift apart', 'Hundreds of users and programs read and write at once'],
        ['Relationships', 'Copy the customer’s name onto every order row', 'Store the customer once; orders point at it by id'],
        ['Size', 'Slows down at a few hundred thousand rows', 'Billions of rows, with indexes to find any of them fast'],
        ['Safety', 'A crash half-way through a change can leave a mess', 'Transactions: a change happens completely or not at all'],
        ['Questions', 'Filters and formulas, by hand', 'One SQL query, which a program can run too']
      ] },
      { type: 'h2', text: 'Install the tools (free)' },
      { type: 'ol', items: [
        '**SQL Server 2022 Developer** (full features, free for learning and development) or **Express** (free, smaller). Download either from Microsoft’s SQL Server downloads page and choose the Basic installation.',
        '**SQL Server Management Studio (SSMS)**, the main tool for writing queries and managing databases. VS Code with the **mssql** extension works too.',
        'Open SSMS. In **Connect to Server**, type `localhost` as the server name (or `localhost\\SQLEXPRESS` for Express), choose **Windows Authentication**, tick **Trust server certificate**, and click Connect.',
        'Click **New Query**. You now have an editor connected to your server. Type T-SQL and press **F5** (or click Execute) to run it.'
      ] },
      { type: 'h2', text: 'Create the BuildMart database' },
      { type: 'p', text: 'Every lesson in this course queries one small database: **BuildMart**, a shop that sells building supplies. It has categories, products, customers, orders and order lines. Copy the script below into a new query window and run all of it with F5. You do not need to understand it yet: the Creating and changing data module explains every line.' },
      { type: 'code', title: 'BuildMart.sql', code: sql`
-- BuildMart: the sample database used in every lesson.
-- Run the whole script in SSMS (F5). Run it again at any time to reset the data.
IF DB_ID(N'BuildMart') IS NULL
    CREATE DATABASE BuildMart;
GO
USE BuildMart;
GO
DROP TABLE IF EXISTS dbo.OrderItems, dbo.Orders, dbo.Customers, dbo.Products, dbo.Categories;
GO
CREATE TABLE dbo.Categories (
    CategoryId int          NOT NULL PRIMARY KEY,
    Name       nvarchar(40) NOT NULL
);

CREATE TABLE dbo.Products (
    ProductId  int           NOT NULL IDENTITY PRIMARY KEY,
    Name       nvarchar(60)  NOT NULL,
    CategoryId int           NULL REFERENCES dbo.Categories (CategoryId),
    Price      decimal(10,2) NOT NULL,
    Stock      int           NOT NULL,
    Unit       nvarchar(10)  NOT NULL,
    AddedOn    date          NOT NULL
);

CREATE TABLE dbo.Customers (
    CustomerId int           NOT NULL IDENTITY PRIMARY KEY,
    FirstName  nvarchar(40)  NOT NULL,
    LastName   nvarchar(40)  NOT NULL,
    City       nvarchar(40)  NULL,
    Email      nvarchar(100) NULL,
    Phone      varchar(20)   NULL,
    JoinedOn   date          NOT NULL
);

CREATE TABLE dbo.Orders (
    OrderId    int         NOT NULL IDENTITY PRIMARY KEY,
    CustomerId int         NOT NULL REFERENCES dbo.Customers (CustomerId),
    OrderDate  date        NOT NULL,
    Status     varchar(10) NOT NULL
);

CREATE TABLE dbo.OrderItems (
    OrderId   int           NOT NULL REFERENCES dbo.Orders (OrderId),
    ProductId int           NOT NULL REFERENCES dbo.Products (ProductId),
    Quantity  int           NOT NULL,
    UnitPrice decimal(10,2) NOT NULL,
    PRIMARY KEY (OrderId, ProductId)
);
GO
INSERT INTO dbo.Categories (CategoryId, Name) VALUES
    (1, N'Tools'), (2, N'Building'), (3, N'Timber'), (4, N'Fixings'),
    (5, N'Paint'), (6, N'Safety'), (7, N'Plumbing');

INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn) VALUES
    (N'Claw hammer',          1, 18.50,  40, N'each', '2023-01-15'),
    (N'Cordless drill',       1, 89.00,  12, N'each', '2023-02-01'),
    (N'Tape measure 8 m',     1,  9.75,  65, N'each', '2023-01-15'),
    (N'Cement 25 kg',         2,  7.20, 300, N'bag',  '2023-03-10'),
    (N'Sand 25 kg',           2,  4.10, 220, N'bag',  '2023-03-10'),
    (N'Timber 2x4 2.4 m',     3,  6.80, 500, N'each', '2023-04-05'),
    (N'Plywood sheet 18 mm',  3, 42.00,  80, N'sheet','2023-04-05'),
    (N'Wood screws (200)',    4, 11.90, 150, N'box',  '2023-05-20'),
    (N'Wall plugs (100)',     4,  4.50,   0, N'box',  '2023-05-20'),
    (N'Masonry paint 10 L',   5, 54.00,  25, N'tin',  '2023-06-12'),
    (N'Paint roller set',     5, 12.50,  30, N'each', '2023-06-12'),
    (N'Safety goggles',       6,  6.80,   0, N'each', '2023-07-01');

INSERT INTO dbo.Customers (FirstName, LastName, City, Email, Phone, JoinedOn) VALUES
    (N'Asha',  N'Patel',  N'Leeds',     N'asha@example.com',  '0113 496 0001', '2023-03-02'),
    (N'Ben',   N'Carter', N'York',      NULL,                 '01904 555 010', '2023-05-19'),
    (N'Chloe', N'Evans',  N'Leeds',     N'chloe@example.com', NULL,            '2023-06-07'),
    (N'Dev',   N'Singh',  N'Bradford',  N'dev@example.com',   '01274 555 220', '2023-08-23'),
    (N'Ella',  N'Brown',  NULL,         N'ella@example.com',  NULL,            '2023-09-14'),
    (N'Farid', N'Khan',   N'York',      N'farid@example.com', '01904 555 777', '2023-11-30'),
    (N'Grace', N'Lee',    N'Leeds',     NULL,                 NULL,            '2024-01-08'),
    (N'Zoë',   N'Müller', N'Harrogate', N'zoe@example.com',   '01423 555 123', '2024-02-15');

INSERT INTO dbo.Orders (CustomerId, OrderDate, Status) VALUES
    (1, '2024-02-03', 'Shipped'), (2, '2024-02-10', 'Shipped'), (1, '2024-03-01', 'Shipped'),
    (4, '2024-03-15', 'Shipped'), (6, '2024-04-02', 'Shipped'), (3, '2024-04-20', 'Cancelled'),
    (4, '2024-05-05', 'Shipped'), (8, '2024-05-18', 'Pending'), (2, '2024-06-01', 'Pending'),
    (6, '2024-06-12', 'Shipped');

INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice) VALUES
    (1, 1, 1, 18.50), (1, 3, 2, 9.75),
    (2, 4, 10, 7.20), (2, 5, 10, 4.10),
    (3, 2, 1, 89.00), (3, 8, 2, 11.90),
    (4, 6, 40, 6.80), (4, 7, 6, 42.00),
    (5, 10, 2, 54.00), (5, 11, 1, 12.50),
    (6, 12, 2, 6.80),
    (7, 4, 20, 7.00), (7, 8, 5, 11.90),
    (8, 7, 2, 42.00), (8, 1, 1, 18.50),
    (9, 9, 4, 4.50),
    (10, 3, 1, 9.75), (10, 6, 12, 6.80);
GO
SELECT 'BuildMart is ready' AS Result;`, output: 'Result\n------------------\nBuildMart is ready' },
      { type: 'note', kind: 'tip', text: 'F5 runs the whole window. If you select some text first, F5 runs only the selection. That is how you will run one query at a time from a window full of them.' },
      { type: 'note', kind: 'info', text: 'Lines that start with `--` are comments, and `GO` is not T-SQL at all: it tells SSMS to send everything above it to the server as one **batch**, then carry on. Some statements, such as `CREATE DATABASE` followed by `USE`, must be in separate batches.' },
      { type: 'h2', text: 'Your first query' },
      { type: 'p', text: 'With BuildMart created, ask it a question. Which products cost more than 40?' },
      { type: 'code', code: sql`
USE BuildMart;

SELECT Name, Price
FROM dbo.Products
WHERE Price > 40;`, output: 'Name                 Price\n-------------------  -----\nCordless drill       89.00\nPlywood sheet 18 mm  42.00\nMasonry paint 10 L   54.00' },
      { type: 'p', text: 'Read it almost as English: **select** the name and price **from** the products table **where** the price is over 40. Notice what you did not say: which file to open, how to loop over rows, or how to test each one. SQL is **declarative**. You describe the result you want, and SQL Server works out how to produce it.' },
      { type: 'p', text: '`USE BuildMart;` makes BuildMart the current database for the rest of the window. Every later sample assumes you have run it once. The name `dbo.Products` is the **schema** (`dbo`) and the **table** (`Products`).' },
      { type: 'h2', text: 'What SQL Server does with your query' },
      { type: 'ol', items: [
        '**Parse**: check the text is valid T-SQL. A typo such as `SELEC` stops here.',
        '**Bind**: look up every name. A table or column that does not exist stops here.',
        '**Optimise**: choose a plan: which index to use, in what order to read tables. For big queries this is where the cleverness is.',
        '**Execute**: run the plan and stream the rows back to SSMS, which shows them in the Results tab.'
      ] },
      { type: 'h2', text: 'The kinds of SQL statement' },
      { type: 'table', head: ['Family', 'Statements', 'What they do', 'Where in this course'], rows: [
        ['Query', '`SELECT`', 'Read data', 'Foundations onwards'],
        ['Data manipulation (DML)', '`INSERT`, `UPDATE`, `DELETE`, `MERGE`', 'Change the rows in tables', 'Creating and changing data'],
        ['Data definition (DDL)', '`CREATE`, `ALTER`, `DROP`', 'Create and change tables and other objects', 'Creating and changing data'],
        ['Access control (DCL)', '`GRANT`, `REVOKE`, `DENY`', 'Decide who may do what', 'Master level'],
        ['Transactions', '`BEGIN TRAN`, `COMMIT`, `ROLLBACK`', 'Group changes so they succeed or fail together', 'Master level']
      ] },
      { type: 'h2', text: 'The database describes itself' },
      { type: 'p', text: 'SQL Server keeps information about every object in **system views**. `sys.tables` lists the tables in the current database, so you can query it like any other table:' },
      { type: 'code', code: sql`
SELECT name
FROM sys.tables
ORDER BY name;`, output: 'name\n----------\nCategories\nCustomers\nOrderItems\nOrders\nProducts' },
      { type: 'quiz', question: 'What is T-SQL?', options: ['A different database from SQL Server', 'SQL Server’s dialect of SQL: standard SQL plus extras', 'A tool for drawing tables', 'The file format of a database backup'], answer: 1, explain: 'T-SQL (Transact-SQL) is the language SQL Server understands: standard SQL with additions such as variables, control flow and error handling.' },
      { type: 'quiz', question: 'In `dbo.Products`, what is `dbo`?', options: ['The database', 'The server', 'The schema', 'A column'], answer: 2, explain: '`dbo` is the schema, a named group of objects inside the database. `dbo` (database owner) is the default schema.' },
      { type: 'quiz', question: 'SQL is called declarative because…', options: ['you declare variables before using them', 'you describe the result you want and the engine decides how to get it', 'every statement must end with a semicolon', 'it only reads data and never changes it'], answer: 1, explain: 'You state what you want; the query optimiser chooses the steps (the plan).' },
      { type: 'exercise', task: 'Write a query that returns the `FirstName`, `LastName` and `City` of every customer in BuildMart.', hint: 'List the three columns after SELECT, separated by commas, and read FROM dbo.Customers. No WHERE is needed.', solution: sql`
SELECT FirstName, LastName, City
FROM dbo.Customers;`, output: 'FirstName  LastName  City\n---------  --------  ---------\nAsha       Patel     Leeds\nBen        Carter    York\nChloe      Evans     Leeds\nDev        Singh     Bradford\nElla       Brown     NULL\nFarid      Khan      York\nGrace      Lee       Leeds\nZoë        Müller    Harrogate' }
    ],
    keyPoints: [
      'A relational database stores data in tables of rows and columns; every column has a type.',
      'SQL Server holds databases, databases hold schemas, schemas hold tables: `BuildMart.dbo.Products`.',
      'T-SQL is SQL Server’s dialect of SQL. SSMS is the main tool for writing and running it; F5 runs the window or the selection.',
      'SQL is declarative: you describe the result, the optimiser picks the plan.',
      'Run the BuildMart script once; every lesson’s queries run against it, and running it again resets the data.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'tables-and-data-types',
    title: 'Tables, rows, columns and data types',
    summary: 'Every column has a data type that decides what it can hold, how much space it takes and what goes wrong at the edges. Learn the types you will use every day and how to choose between them.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A table is a set of **rows**, and every row has the same **columns**. Each column has a **name**, a **data type**, and a rule about whether it may be left empty (**NULL**) or not. The type is a promise: SQL Server will never let a `date` column hold the word “soon”, or a `tinyint` hold 300.' },
      { type: 'p', text: 'Here is how the Products table you created is defined. You can ask SQL Server for this at any time:' },
      { type: 'code', code: sql`
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH AS MaxLength,
       NUMERIC_PRECISION AS [Precision], NUMERIC_SCALE AS Scale, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Products'
ORDER BY ORDINAL_POSITION;`, output: 'COLUMN_NAME  DATA_TYPE  MaxLength  Precision  Scale  IS_NULLABLE\n-----------  ---------  ---------  ---------  -----  -----------\nProductId    int             NULL         10      0  NO\nName         nvarchar          60       NULL   NULL  NO\nCategoryId   int             NULL         10      0  YES\nPrice        decimal         NULL         10      2  NO\nStock        int             NULL         10      0  NO\nUnit         nvarchar          10       NULL   NULL  NO\nAddedOn      date            NULL       NULL   NULL  NO' },
      { type: 'note', kind: 'info', text: '`[Precision]` is in square brackets because PRECISION is a reserved word in T-SQL. Brackets let you use any name, even one with spaces, as a column alias. `ORDER BY` keeps the columns in table order; it gets its own lesson at the end of this module.' },
      { type: 'h2', text: 'The types you will use most' },
      { type: 'table', head: ['Type', 'Holds', 'Size', 'Use it for'], rows: [
        ['`int`', 'Whole numbers, about ±2.1 billion', '4 bytes', 'Ids, counts, quantities: the default whole number'],
        ['`bigint` / `smallint` / `tinyint`', 'Bigger or smaller whole numbers', '8 / 2 / 1 bytes', 'Huge counters; small codes (tinyint is 0–255)'],
        ['`decimal(p, s)`', 'Exact decimals: p digits in all, s after the point', '5–17 bytes', 'Money, prices, measurements'],
        ['`float`', 'Approximate binary numbers', '8 bytes', 'Scientific and geometric values, never money'],
        ['`bit`', '0, 1 or NULL', '1 byte per 8 columns', 'Yes/no flags'],
        ['`nvarchar(n)`', 'Unicode text up to n characters', '2 bytes per character', 'Names, descriptions: anything people type'],
        ['`varchar(n)`', 'Text in one code page, up to n characters', '1 byte per character', 'Codes and data you control, such as `Shipped`'],
        ['`char(n)` / `nchar(n)`', 'Text of exactly n characters, padded with spaces', 'n or 2n bytes', 'Fixed codes such as country codes `GB`'],
        ['`date`', 'A calendar date', '3 bytes', 'Birthdays, order dates'],
        ['`datetime2(p)`', 'Date and time, to 100 ns', '6–8 bytes', 'Timestamps (prefer it to the older `datetime`)'],
        ['`datetimeoffset`', 'Date, time and time-zone offset', '10 bytes', 'Times that must be compared across time zones'],
        ['`uniqueidentifier`', 'A 16-byte GUID', '16 bytes', 'Ids generated outside the database']
      ] },
      { type: 'p', text: 'Pick a type, then a value, and see exactly what SQL Server stores, or the error it raises. Every result was produced by SQL Server 2022.' },
      { type: 'widget', name: 'type-fit' },
      { type: 'h2', text: 'Text: varchar or nvarchar?' },
      { type: 'p', text: '`varchar` stores one byte per character from a single **code page** (on most servers, Western European). Characters outside it are replaced, without any error. `nvarchar` stores **Unicode**, so it can hold any language. A text literal needs an `N` in front (`N\'…\'`) to be Unicode too:' },
      { type: 'code', code: sql`
SELECT 'Łódź' AS WithoutN, N'Łódź' AS WithN,
       LEN(N'Łódź') AS Characters, DATALENGTH(N'Łódź') AS Bytes;`, output: 'WithoutN  WithN  Characters  Bytes\n--------  -----  ----------  -----\nLódz      Łódź            4      8' },
      { type: 'p', text: 'Without the `N`, the literal is `varchar`, and Ł and ź are swapped for the nearest Latin letters as soon as the literal is read, before it is used anywhere. `LEN` counts characters; `DATALENGTH` counts bytes, two per character for `nvarchar`.' },
      { type: 'note', kind: 'tip', text: 'Use `nvarchar` for anything a person types: names, addresses, descriptions. BuildMart stores customer names as `nvarchar` because of customers like Zoë Müller. Use `varchar` for values you fully control, such as status codes.' },
      { type: 'h2', text: 'Numbers: exact or approximate?' },
      { type: 'p', text: '`decimal` stores numbers exactly, digit by digit. `float` stores the nearest **binary fraction**, which is fast and has a huge range but cannot hold 0.1 exactly, just as 1/3 cannot be written exactly in decimal.' },
      { type: 'code', code: sql`
SELECT IIF(CAST(0.1 AS float) + CAST(0.2 AS float) = 0.3, 'equal', 'not equal') AS FloatTest,
       IIF(CAST(0.1 AS decimal(10,2)) + CAST(0.2 AS decimal(10,2)) = 0.3, 'equal', 'not equal') AS DecimalTest;`, output: 'FloatTest  DecimalTest\n---------  -----------\nnot equal  equal' },
      { type: 'p', text: '`IIF(test, a, b)` returns `a` when the test is true and `b` otherwise; you will meet it properly in the Functions module. With `float`, 0.1 + 0.2 comes out a hair above 0.3, so the test fails. That is why prices in BuildMart are `decimal(10,2)`: up to 10 digits, 2 of them after the point.' },
      { type: 'p', text: 'Whole-number types have their own surprise. Converting a decimal to `int` cuts off the fraction instead of rounding, and dividing one `int` by another gives an `int`:' },
      { type: 'code', code: sql`
SELECT CAST(12.7 AS int) AS CutOff,
       7 / 2 AS IntDivision,
       7 / 2.0 AS DecimalDivision;`, output: 'CutOff  IntDivision  DecimalDivision\n------  -----------  ---------------\n    12            3         3.500000' },
      { type: 'note', kind: 'warn', text: '`7 / 2` is 3, not 3.5, because both sides are `int`. Make one side a decimal (`7 / 2.0`, or `CAST(x AS decimal(10,2))`) when you want a fraction. Averages of integer columns trip people up the same way.' },
      { type: 'h2', text: 'Dates' },
      { type: 'p', text: 'Store dates in `date` or `datetime2` columns, never as text: only real date columns sort correctly, reject 30 February, and work with date functions. Write date literals as `\'yyyy-mm-dd\'` or `\'yyyymmdd\'`. Other formats such as `\'03/04/2024\'` mean different days depending on the server’s language settings.' },
      { type: 'code', code: sql`
SELECT CAST('2024-02-29' AS date) AS LeapDay,
       CAST('20241231' AS date) AS NewYearsEve,
       CAST('2024-06-12 14:30:00' AS datetime2(0)) AS Delivery;`, output: 'LeapDay     NewYearsEve  Delivery\n----------  -----------  -------------------\n2024-02-29  2024-12-31   2024-06-12 14:30:00' },
      { type: 'quiz', question: 'Which type should a product price column use?', options: ['`float`', '`int`', '`decimal(10,2)`', '`nvarchar(20)`'], answer: 2, explain: '`decimal` is exact, so sums of prices come out right to the penny. `float` is approximate, `int` cannot hold pence, and text cannot be added up.' },
      { type: 'quiz', question: 'What does `SELECT 9 / 4;` return?', options: ['2.25', '2', '3', 'An error'], answer: 1, explain: 'Both operands are `int`, so the result is an `int` and the fraction is dropped: 2.' },
      { type: 'quiz', question: 'A customer’s surname is inserted as `N\'Wołowski\'` into a `varchar(40)` column. What is stored?', options: ['Wołowski', 'Wolowski', 'An error', 'NULL'], answer: 1, explain: 'ł is not in the Western European code page, so the conversion to `varchar` replaces it with the nearest letter, silently. An `nvarchar` column would keep it.' },
      { type: 'exercise', task: 'Using `INFORMATION_SCHEMA.COLUMNS`, list each column of the **Customers** table with its name, data type, maximum length and whether it allows NULL, in table order.', hint: 'Start from the Products query above. Change the table name in the WHERE clause and drop the precision and scale columns.', solution: sql`
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH AS MaxLength, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Customers'
ORDER BY ORDINAL_POSITION;`, output: 'COLUMN_NAME  DATA_TYPE  MaxLength  IS_NULLABLE\n-----------  ---------  ---------  -----------\nCustomerId   int             NULL  NO\nFirstName    nvarchar          40  NO\nLastName     nvarchar          40  NO\nCity         nvarchar          40  YES\nEmail        nvarchar         100  YES\nPhone        varchar           20  YES\nJoinedOn     date            NULL  NO' }
    ],
    keyPoints: [
      'Every column has a name, a type and a NULL rule; the type decides what values are allowed.',
      'Use `int` for whole numbers, `decimal(p, s)` for money and measurements, `float` only for approximate science or geometry.',
      'Use `nvarchar` (and `N\'…\'` literals) for text people type; `varchar` silently changes characters outside its code page.',
      'Converting to `int` cuts off the fraction, and `int / int` is an `int`: 7 / 2 = 3.',
      'Store dates in `date` or `datetime2`, and write literals as `\'yyyy-mm-dd\'`.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'select-basics',
    title: 'Your first SELECT: columns, aliases and expressions',
    summary: 'Choose columns, rename them, calculate new ones and join text together. Plus the order SQL Server really processes a query in, and why an alias cannot be used in WHERE.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Every query that reads data is a `SELECT`. Its simplest form names the columns you want and the table they come from. The result is always a new table: rows and columns that exist only until SSMS shows them.' },
      { type: 'code', code: sql`
SELECT CategoryId, Name
FROM dbo.Categories;`, output: 'CategoryId  Name\n----------  --------\n         1  Tools\n         2  Building\n         3  Timber\n         4  Fixings\n         5  Paint\n         6  Safety\n         7  Plumbing' },
      { type: 'p', text: 'The **SELECT list** decides the shape of the result: which columns, in what order, with what names. Try it on the Products table:' },
      { type: 'widget', name: 'select-builder' },
      { type: 'h2', text: 'SELECT * and why to avoid it in real code' },
      { type: 'p', text: '`SELECT *` means “every column”. It is perfect for a quick look at a table in SSMS. In application code, list the columns: the query then returns the same shape even after someone adds a column, it reads less data, and anyone reading it can see what is used.' },
      { type: 'h2', text: 'Aliases: renaming columns' },
      { type: 'p', text: '`AS` gives a column a new name in the result. The table is not changed. An alias with a space or a reserved word needs square brackets.' },
      { type: 'code', code: sql`
SELECT Name AS Product, Price AS [Unit price], Unit
FROM dbo.Products
WHERE CategoryId = 3;`, output: 'Product              Unit price  Unit\n-------------------  ----------  -----\nTimber 2x4 2.4 m           6.80  each\nPlywood sheet 18 mm       42.00  sheet' },
      { type: 'h2', text: 'Calculated columns' },
      { type: 'p', text: 'A SELECT list can contain **expressions**, worked out for every row as the result is produced. Nothing is stored. Here is the value of the stock on the shelf for each paint product:' },
      { type: 'code', code: sql`
SELECT Name, Price, Stock, Price * Stock AS StockValue
FROM dbo.Products
WHERE CategoryId = 5;`, output: 'Name                Price  Stock  StockValue\n------------------  -----  -----  ----------\nMasonry paint 10 L  54.00     25     1350.00\nPaint roller set    12.50     30      375.00' },
      { type: 'p', text: 'Arithmetic uses `+ - * /` and `%` (remainder). The usual precedence applies: `*`, `/` and `%` before `+` and `-`, with parentheses to change it.' },
      { type: 'h2', text: 'Joining text together' },
      { type: 'p', text: 'Use `+` or `CONCAT` to join strings. `CONCAT` also converts numbers for you and treats NULL as empty text, which `+` does not (more on NULL in two lessons). You can also put fixed values, called **literals**, in the SELECT list.' },
      { type: 'code', code: sql`
SELECT FirstName + N' ' + LastName AS FullName,
       CONCAT(FirstName, N' joined on ', JoinedOn) AS Note,
       N'BuildMart' AS Shop
FROM dbo.Customers
WHERE CustomerId <= 3;`, output: 'FullName     Note                        Shop\n-----------  --------------------------  ---------\nAsha Patel   Asha joined on 2023-03-02   BuildMart\nBen Carter   Ben joined on 2023-05-19    BuildMart\nChloe Evans  Chloe joined on 2023-06-07  BuildMart' },
      { type: 'p', text: '`CONCAT` turned the `JoinedOn` date into text by itself. With `+`, SQL Server would try to turn the text into a date instead, and fail.' },
      { type: 'p', text: 'A SELECT does not even need a table. Without FROM it returns a single row, which makes SQL Server a handy calculator:' },
      { type: 'code', code: sql`
SELECT 2 + 3 * 4 AS Answer, (2 + 3) * 4 AS WithBrackets, 17 % 5 AS Remainder;`, output: 'Answer  WithBrackets  Remainder\n------  ------------  ---------\n    14            20          2' },
      { type: 'h2', text: 'The order SQL Server reads a query in' },
      { type: 'p', text: 'You write `SELECT` first, but it is not processed first. The **logical processing order** is:' },
      { type: 'ol', items: [
        '`FROM`: which table(s) the rows come from.',
        '`WHERE`: keep only the rows that pass the test.',
        '`SELECT`: work out the columns and expressions, and apply aliases.',
        '`ORDER BY`: sort the result (lesson 6).'
      ] },
      { type: 'p', text: 'Because WHERE runs before SELECT, an alias made in the SELECT list does not exist yet when WHERE is checked:' },
      { type: 'code', code: sql`
SELECT Name, Price * Stock AS StockValue
FROM dbo.Products
WHERE StockValue > 1000;`, output: 'Msg 207, Level 16, State 1, Line 1\nInvalid column name \'StockValue\'.' },
      { type: 'p', text: 'Repeat the expression in the WHERE clause instead (`WHERE Price * Stock > 1000`). ORDER BY runs after SELECT, so it is the one clause where the alias does work.' },
      { type: 'h2', text: 'Style that pays off' },
      { type: 'ul', items: [
        'Write keywords in capitals (`SELECT`, `FROM`, `WHERE`) and names as they are defined. SQL Server does not care; readers do.',
        'Put each clause on its own line.',
        'End statements with a semicolon. It is optional for most statements today, but required before some (such as a `WITH` common table expression), and Microsoft recommends it.',
        'Comment with `--` to the end of the line, or `/* … */` across lines.'
      ] },
      { type: 'quiz', question: 'Which clause is logically processed first?', options: ['SELECT', 'WHERE', 'FROM', 'ORDER BY'], answer: 2, explain: 'FROM comes first (which rows exist), then WHERE (which survive), then SELECT (what to show), then ORDER BY.' },
      { type: 'quiz', question: 'What does `SELECT Price * Stock AS StockValue FROM dbo.Products;` change in the Products table?', options: ['It adds a StockValue column', 'It updates Stock', 'Nothing: the column exists only in the result', 'It renames Price'], answer: 2, explain: 'Calculated columns and aliases exist only in the result set. To change a table you need ALTER TABLE or UPDATE.' },
      { type: 'exercise', task: 'BuildMart charges 20% VAT on top of its prices. For every product in category 1 (Tools), show the `Name`, the `Price`, and the price including VAT as `PriceIncVat`.', hint: 'Multiply the price by 1.2 in the SELECT list and give it an alias. Filter with WHERE CategoryId = 1.', solution: sql`
SELECT Name, Price, Price * 1.2 AS PriceIncVat
FROM dbo.Products
WHERE CategoryId = 1;`, output: 'Name              Price  PriceIncVat\n----------------  -----  -----------\nClaw hammer       18.50       22.200\nCordless drill    89.00      106.800\nTape measure 8 m   9.75       11.700' },
      { type: 'note', kind: 'info', text: 'The result has three decimal places (22.200) because SQL Server keeps every digit the multiplication can produce: 2 decimals from Price plus 1 from 1.2. Rounding it to pence is a job for `ROUND` or a cast to `decimal(10,2)`, both in the Functions module.' }
    ],
    keyPoints: [
      'The SELECT list decides the shape of the result: which columns, in what order, with what names.',
      '`SELECT *` is for quick looks; list columns in real code.',
      '`AS` renames a column in the result only; use `[brackets]` for names with spaces or reserved words.',
      'Expressions such as `Price * Stock` are calculated per row and stored nowhere.',
      'Logical order: FROM → WHERE → SELECT → ORDER BY, so aliases cannot be used in WHERE.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'where-filtering',
    title: 'Filtering rows with WHERE',
    summary: 'Keep only the rows you want with comparisons, AND, OR and NOT, ranges with BETWEEN, lists with IN, and patterns with LIKE. Plus the precedence rule that catches everyone once.',
    minutes: 15,
    blocks: [
      { type: 'p', text: '`WHERE` holds a condition that SQL Server tests against every row from the FROM clause. Rows where it is **true** are kept; the rest are dropped before the SELECT list is worked out.' },
      { type: 'table', head: ['Operator', 'Meaning', 'Example'], rows: [
        ['`=`', 'equal to', '`CategoryId = 3`'],
        ['`<>` or `!=`', 'not equal to', '`Unit <> N\'each\'`'],
        ['`<`  `<=`', 'less than (or equal)', '`Price <= 10`'],
        ['`>`  `>=`', 'greater than (or equal)', '`AddedOn >= \'2023-05-01\'`'],
        ['`BETWEEN a AND b`', 'from a to b, both included', '`Price BETWEEN 5 AND 10`'],
        ['`IN (…)`', 'equal to any value in the list', '`CategoryId IN (3, 4)`'],
        ['`LIKE`', 'matches a text pattern', '`Name LIKE N\'%paint%\'`'],
        ['`IS NULL`', 'has no value (next lesson)', '`Email IS NULL`']
      ] },
      { type: 'widget', name: 'where-lab' },
      { type: 'h2', text: 'Comparing numbers, text and dates' },
      { type: 'code', code: sql`
SELECT Name, Stock
FROM dbo.Products
WHERE Stock = 0;`, output: 'Name              Stock\n----------------  -----\nWall plugs (100)      0\nSafety goggles        0' },
      { type: 'p', text: 'Text comparisons follow the column’s **collation**. The default on most servers is case-insensitive, so `N\'BAG\'` finds `bag`. Dates compare in calendar order, as long as the column is a real date type:' },
      { type: 'code', code: sql`
SELECT Name, Unit, AddedOn
FROM dbo.Products
WHERE Unit = N'BAG' OR AddedOn >= '2023-06-01';`, output: 'Name                Unit  AddedOn\n------------------  ----  ----------\nCement 25 kg        bag   2023-03-10\nSand 25 kg          bag   2023-03-10\nMasonry paint 10 L  tin   2023-06-12\nPaint roller set    each  2023-06-12\nSafety goggles      each  2023-07-01' },
      { type: 'h2', text: 'AND, OR and the precedence trap' },
      { type: 'p', text: '`AND` is true only when both sides are true; `OR` is true when either side is. When you mix them, **AND is applied first**, just as × comes before + in arithmetic. Say you want tools or paint, but only the expensive ones:' },
      { type: 'code', code: sql`
-- Wrong: read as  CategoryId = 1  OR  (CategoryId = 5 AND Price > 20)
SELECT Name, CategoryId, Price
FROM dbo.Products
WHERE CategoryId = 1 OR CategoryId = 5 AND Price > 20;`, output: 'Name                CategoryId  Price\n------------------  ----------  -----\nClaw hammer                  1  18.50\nCordless drill               1  89.00\nTape measure 8 m             1   9.75\nMasonry paint 10 L           5  54.00' },
      { type: 'p', text: 'All three tools came back, cheap or not, because the price test was attached only to paint. Parentheses say what you mean:' },
      { type: 'code', code: sql`
SELECT Name, CategoryId, Price
FROM dbo.Products
WHERE (CategoryId = 1 OR CategoryId = 5) AND Price > 20;`, output: 'Name                CategoryId  Price\n------------------  ----------  -----\nCordless drill               1  89.00\nMasonry paint 10 L           5  54.00' },
      { type: 'note', kind: 'tip', text: 'Whenever a WHERE clause has both AND and OR, add parentheses, even when the default order happens to be right. The next person to read it will thank you.' },
      { type: 'h2', text: 'IN and BETWEEN' },
      { type: 'p', text: '`IN` is a short way to write several `=` tests joined by OR. `BETWEEN` is a range that **includes both ends**. Both have a `NOT` form.' },
      { type: 'code', code: sql`
SELECT Name, CategoryId, Price
FROM dbo.Products
WHERE CategoryId IN (3, 4)
  AND Price BETWEEN 4.50 AND 11.90;`, output: 'Name               CategoryId  Price\n-----------------  ----------  -----\nTimber 2x4 2.4 m            3   6.80\nWood screws (200)           4  11.90\nWall plugs (100)            4   4.50' },
      { type: 'note', kind: 'warn', text: 'BETWEEN with date and time values is a classic bug: `OrderTime BETWEEN \'2024-06-01\' AND \'2024-06-30\'` misses everything after midnight at the start of 30 June. For time ranges use a half-open range instead: `>= \'2024-06-01\' AND < \'2024-07-01\'`.' },
      { type: 'h2', text: 'Patterns with LIKE' },
      { type: 'table', head: ['Wildcard', 'Matches', 'Example', 'Finds'], rows: [
        ['`%`', 'any run of characters, even none', '`N\'%paint%\'`', 'Masonry paint 10 L, Paint roller set'],
        ['`_`', 'exactly one character', '`N\'_and%\'`', 'Sand 25 kg'],
        ['`[abc]`', 'one character from the set', '`N\'[CT]%\'`', 'names starting with C or T'],
        ['`[^abc]`', 'one character not in the set', '`N\'[^A-S]%\'`', 'names starting after S'],
      ] },
      { type: 'code', code: sql`
SELECT Name
FROM dbo.Products
WHERE Name LIKE N'[CT]%' AND Name NOT LIKE N'%kg';`, output: 'Name\n----------------\nClaw hammer\nCordless drill\nTape measure 8 m\nTimber 2x4 2.4 m' },
      { type: 'p', text: 'A pattern that starts with `%` forces SQL Server to check every row, because an index cannot help find text in the middle of a value. On a few thousand rows that is fine; on millions, it is the first thing to look at when a search is slow.' },
      { type: 'quiz', question: '`WHERE a = 1 OR b = 2 AND c = 3` is read as…', options: ['`(a = 1 OR b = 2) AND c = 3`', '`a = 1 OR (b = 2 AND c = 3)`', 'an error: you must use parentheses', 'it depends on the server settings'], answer: 1, explain: 'AND binds tighter than OR, so the AND pair is grouped first.' },
      { type: 'quiz', question: 'Which prices does `Price BETWEEN 6.80 AND 9.75` include?', options: ['Only prices strictly between the two', '6.80 and 9.75 and everything between', '6.80 but not 9.75', '9.75 but not 6.80'], answer: 1, explain: 'BETWEEN includes both ends: it means `Price >= 6.80 AND Price <= 9.75`.' },
      { type: 'quiz', question: 'Which names match `LIKE N\'_a%\'`?', options: ['Names containing an a anywhere', 'Names whose second letter is a', 'Names starting with a', 'Names ending in a'], answer: 1, explain: '`_` matches exactly one character, then `a`, then `%` matches the rest: the second character must be a, as in Sand or Wall plugs.' },
      { type: 'exercise', task: 'A builder wants timber or fixings (categories 3 and 4) that cost under 10 and are in stock. Show `Name`, `Price` and `Stock`.', hint: 'Combine an IN test, a price test and a stock test with AND. No parentheses are needed when every condition is joined with AND.', solution: sql`
SELECT Name, Price, Stock
FROM dbo.Products
WHERE CategoryId IN (3, 4)
  AND Price < 10
  AND Stock > 0;`, output: 'Name              Price  Stock\n----------------  -----  -----\nTimber 2x4 2.4 m   6.80    500' }
    ],
    keyPoints: [
      'WHERE tests every row and keeps only those where the condition is true.',
      'AND is applied before OR; use parentheses whenever you mix them.',
      '`IN (…)` is a list of `=` tests; `BETWEEN a AND b` includes both ends.',
      '`LIKE` patterns: `%` any run of characters, `_` one character, `[…]` one from a set.',
      'Text comparisons follow the collation, usually case-insensitive; dates need real date columns and `\'yyyy-mm-dd\'` literals.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'null-values',
    title: 'NULL and three-valued logic',
    summary: 'NULL means “unknown”, not zero or empty. See why `= NULL` never matches, how NULL spreads through expressions, the NOT IN trap, and the functions that replace NULL with a real value.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Some BuildMart customers have not given a phone number, an email address or even a city. Those cells hold **NULL**: a marker that means **no value is known**. NULL is not zero, and it is not empty text (`N\'\'`). It is the absence of a value.' },
      { type: 'code', code: sql`
SELECT FirstName, City, Email, Phone
FROM dbo.Customers;`, output: 'FirstName  City       Email              Phone\n---------  ---------  -----------------  -------------\nAsha       Leeds      asha@example.com   0113 496 0001\nBen        York       NULL               01904 555 010\nChloe      Leeds      chloe@example.com  NULL\nDev        Bradford   dev@example.com    01274 555 220\nElla       NULL       ella@example.com   NULL\nFarid      York       farid@example.com  01904 555 777\nGrace      Leeds      NULL               NULL\nZoë        Harrogate  zoe@example.com    01423 555 123' },
      { type: 'h2', text: 'Three-valued logic' },
      { type: 'p', text: 'Is an unknown city equal to Leeds? SQL Server cannot say yes or no, so the answer is a third truth value: **UNKNOWN**. Any comparison with NULL (`=`, `<>`, `<`, …) gives UNKNOWN. WHERE keeps a row only when the condition is TRUE, so UNKNOWN rows are dropped, exactly like FALSE ones.' },
      { type: 'widget', name: 'null-logic' },
      { type: 'h2', text: 'IS NULL, not = NULL' },
      { type: 'p', text: '`= NULL` asks “is this equal to an unknown value?”, which is always UNKNOWN, so this query returns no rows at all, even though three customers have no phone:' },
      { type: 'code', code: sql`
SELECT FirstName, Phone
FROM dbo.Customers
WHERE Phone = NULL;`, output: 'FirstName  Phone\n---------  -----' },
      { type: 'p', text: 'The right test is `IS NULL` (or `IS NOT NULL`). It asks “is a value missing?”, which always has a TRUE or FALSE answer:' },
      { type: 'code', code: sql`
SELECT FirstName, Phone
FROM dbo.Customers
WHERE Phone IS NULL;`, output: 'FirstName  Phone\n---------  -----\nChloe      NULL\nElla       NULL\nGrace      NULL' },
      { type: 'h2', text: 'The missing row' },
      { type: 'p', text: 'Ella’s city is NULL. Ask for customers in Leeds and she is not there. Ask for customers **not** in Leeds and she is still not there:' },
      { type: 'code', code: sql`
SELECT FirstName, City
FROM dbo.Customers
WHERE City <> N'Leeds';`, output: 'FirstName  City\n---------  ---------\nBen        York\nDev        Bradford\nFarid      York\nZoë        Harrogate' },
      { type: 'p', text: 'Three customers live in Leeds and four live elsewhere, which adds up to 7 of the 8. Whenever a column allows NULL, a condition and its opposite do not cover every row. Decide where the NULL rows belong and say so: `WHERE City <> N\'Leeds\' OR City IS NULL`.' },
      { type: 'h2', text: 'NULL spreads through expressions' },
      { type: 'p', text: 'Arithmetic or `+` with a NULL gives NULL: 5 plus an unknown number is unknown. `CONCAT` is the exception; it treats NULL as empty text.' },
      { type: 'code', code: sql`
SELECT 5 + NULL AS AddNull,
       N'Phone: ' + NULL AS PlusNull,
       CONCAT(N'Phone: ', NULL) AS ConcatNull;`, output: 'AddNull  PlusNull  ConcatNull\n-------  --------  ----------\n   NULL  NULL      Phone:' },
      { type: 'h2', text: 'Replacing NULL: ISNULL and COALESCE' },
      { type: 'p', text: '`ISNULL(x, fallback)` returns x, or the fallback when x is NULL. `COALESCE(a, b, c, …)` returns the first value in its list that is not NULL, so it can try several columns in turn:' },
      { type: 'code', code: sql`
SELECT FirstName,
       ISNULL(City, N'(unknown)') AS City,
       COALESCE(Phone, Email, 'no contact details') AS BestContact
FROM dbo.Customers;`, output: 'FirstName  City       BestContact\n---------  ---------  ------------------\nAsha       Leeds      0113 496 0001\nBen        York       01904 555 010\nChloe      Leeds      chloe@example.com\nDev        Bradford   01274 555 220\nElla       (unknown)  ella@example.com\nFarid      York       01904 555 777\nGrace      Leeds      no contact details\nZoë        Harrogate  01423 555 123' },
      { type: 'p', text: 'Grace has neither a phone nor an email, so COALESCE falls through to the text at the end. `COALESCE` is standard SQL and takes any number of arguments; `ISNULL` is T-SQL only and takes exactly two. `NULLIF(a, b)` goes the other way: it returns NULL when a equals b, which is handy to avoid dividing by zero: `x / NULLIF(Stock, 0)`.' },
      { type: 'h2', text: 'The NOT IN trap' },
      { type: 'p', text: '`City NOT IN (N\'Leeds\', NULL)` means `City <> N\'Leeds\' AND City <> NULL`. The second test is always UNKNOWN, so the whole condition can never be TRUE:' },
      { type: 'code', code: sql`
SELECT FirstName, City
FROM dbo.Customers
WHERE City NOT IN (N'Leeds', NULL);`, output: 'FirstName  City\n---------  ----' },
      { type: 'note', kind: 'warn', text: 'Nobody types a NULL into an IN list on purpose. It arrives from a subquery: `WHERE x NOT IN (SELECT y FROM …)` returns nothing at all as soon as one y is NULL. The Grouping and subqueries module shows `NOT EXISTS`, which does not have this problem.' },
      { type: 'table', head: ['Expression', 'Result'], rows: [
        ['`NULL = NULL`', 'UNKNOWN'],
        ['`NULL <> 5`', 'UNKNOWN'],
        ['`NULL IS NULL`', 'TRUE'],
        ['`TRUE AND UNKNOWN`', 'UNKNOWN'],
        ['`FALSE AND UNKNOWN`', 'FALSE'],
        ['`TRUE OR UNKNOWN`', 'TRUE'],
        ['`NOT UNKNOWN`', 'UNKNOWN'],
        ['`5 + NULL`', 'NULL']
      ] },
      { type: 'quiz', question: 'How many rows does `SELECT * FROM dbo.Customers WHERE Email = NULL;` return?', options: ['2, the customers without email', '6, the customers with email', '0', 'All 8'], answer: 2, explain: '`Email = NULL` is UNKNOWN for every row, and WHERE only keeps TRUE. Use `Email IS NULL`.' },
      { type: 'quiz', question: 'What is `COALESCE(NULL, NULL, N\'x\', N\'y\')`?', options: ['NULL', 'x', 'y', 'An error'], answer: 1, explain: 'COALESCE returns the first argument that is not NULL: x.' },
      { type: 'quiz', question: '`FALSE AND UNKNOWN` is…', options: ['TRUE', 'FALSE', 'UNKNOWN', 'NULL'], answer: 1, explain: 'One FALSE is enough to make an AND false, whatever the other side is.' },
      { type: 'exercise', task: 'Find the customers who have a city but no email address, so the shop can post them a catalogue. Show `FirstName`, `LastName` and `City`, plus a `Phone` column that shows `(none)` when the phone is missing.', hint: 'Two NULL tests joined with AND: one IS NOT NULL, one IS NULL. Use ISNULL for the phone column.', solution: sql`
SELECT FirstName, LastName, City, ISNULL(Phone, '(none)') AS Phone
FROM dbo.Customers
WHERE City IS NOT NULL AND Email IS NULL;`, output: 'FirstName  LastName  City   Phone\n---------  --------  -----  -------------\nBen        Carter    York   01904 555 010\nGrace      Lee       Leeds  (none)' }
    ],
    keyPoints: [
      'NULL means unknown or missing: not zero, not empty text.',
      'Comparisons with NULL give UNKNOWN, and WHERE keeps only TRUE rows, so test with `IS NULL` / `IS NOT NULL`.',
      'A condition and its opposite miss the NULL rows; decide where they belong.',
      'NULL spreads through `+` and arithmetic; `CONCAT` treats it as empty text.',
      '`ISNULL` and `COALESCE` replace NULL with a value; `NOT IN` with a NULL in the list returns nothing.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'sorting-and-paging',
    title: 'Sorting and paging: ORDER BY, TOP, OFFSET and DISTINCT',
    summary: 'Sort results by one or more columns, take the first few rows, page through a long list and remove duplicates. And why a query without ORDER BY has no order at all.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A table has no built-in order, and neither does a query result, unless you ask for one. Rows often come back in the order they were inserted, which makes it easy to believe that order is guaranteed. It is not: add an index, or let the table grow until SQL Server reads it in parallel, and the order changes. **Only ORDER BY guarantees the order of a result.**' },
      { type: 'h2', text: 'ORDER BY' },
      { type: 'p', text: '`ORDER BY` sorts by one or more columns, each `ASC` (smallest first, the default) or `DESC` (largest first). With several columns, the second sorts only rows that tie on the first:' },
      { type: 'code', code: sql`
SELECT Name, CategoryId, Price
FROM dbo.Products
WHERE CategoryId IN (1, 2, 3)
ORDER BY CategoryId, Price DESC;`, output: 'Name                 CategoryId  Price\n-------------------  ----------  -----\nCordless drill                1  89.00\nClaw hammer                   1  18.50\nTape measure 8 m              1   9.75\nCement 25 kg                  2   7.20\nSand 25 kg                    2   4.10\nPlywood sheet 18 mm           3  42.00\nTimber 2x4 2.4 m              3   6.80' },
      { type: 'p', text: 'ORDER BY is processed after SELECT, so it can use aliases and expressions, and even columns that are not in the SELECT list. NULL counts as smaller than any value, so NULLs come first in ascending order:' },
      { type: 'code', code: sql`
SELECT FirstName, City, JoinedOn
FROM dbo.Customers
ORDER BY City, JoinedOn DESC;`, output: 'FirstName  City       JoinedOn\n---------  ---------  ----------\nElla       NULL       2023-09-14\nDev        Bradford   2023-08-23\nZoë        Harrogate  2024-02-15\nGrace      Leeds      2024-01-08\nChloe      Leeds      2023-06-07\nAsha       Leeds      2023-03-02\nFarid      York       2023-11-30\nBen        York       2023-05-19' },
      { type: 'h2', text: 'TOP, WITH TIES and OFFSET … FETCH' },
      { type: 'p', text: 'Sort, then choose how many rows to return. Turn on WITH TIES, switch to paging, and watch what happens when the cut falls between two rows with the same price:' },
      { type: 'widget', name: 'sort-page' },
      { type: 'p', text: '`TOP (n)` returns the first n rows of the sorted result. Two products cost 6.80, so “the three cheapest” is ambiguous. `WITH TIES` settles it by including every row that ties with the last one:' },
      { type: 'code', code: sql`
SELECT TOP (3) WITH TIES Name, Price
FROM dbo.Products
ORDER BY Price;`, output: 'Name              Price\n----------------  -----\nSand 25 kg         4.10\nWall plugs (100)   4.50\nTimber 2x4 2.4 m   6.80\nSafety goggles     6.80' },
      { type: 'p', text: 'For pages of results, as on a web page with Next and Previous buttons, use `OFFSET … FETCH`. It goes after ORDER BY and needs it. Here is page 2, four products per page:' },
      { type: 'code', code: sql`
SELECT ProductId, Name, Price
FROM dbo.Products
ORDER BY Price, ProductId
OFFSET 4 ROWS FETCH NEXT 4 ROWS ONLY;`, output: 'ProductId  Name               Price\n---------  -----------------  -----\n        4  Cement 25 kg        7.20\n        3  Tape measure 8 m    9.75\n        8  Wood screws (200)  11.90\n       11  Paint roller set   12.50' },
      { type: 'note', kind: 'warn', text: 'Sort pages by something unique. Ordered by Price alone, the two products at 6.80 can swap places between one page request and the next, so a customer could see one twice and miss the other. Adding `ProductId` as a tie-breaker gives every row a fixed position.' },
      { type: 'h2', text: 'DISTINCT' },
      { type: 'p', text: '`SELECT DISTINCT` removes duplicate rows from the result. Rows count as duplicates only if **every** column in the SELECT list matches, and DISTINCT treats NULLs as equal to each other:' },
      { type: 'code', code: sql`
SELECT DISTINCT City
FROM dbo.Customers
ORDER BY City;`, output: 'City\n---------\nNULL\nBradford\nHarrogate\nLeeds\nYork' },
      { type: 'code', code: sql`
SELECT DISTINCT CategoryId, Unit
FROM dbo.Products
WHERE CategoryId <= 3
ORDER BY CategoryId;`, output: 'CategoryId  Unit\n----------  -----\n         1  each\n         2  bag\n         3  each\n         3  sheet' },
      { type: 'h2', text: 'The full logical order' },
      { type: 'ol', items: [
        '`FROM`: the source rows',
        '`WHERE`: filter rows',
        '`SELECT`: work out columns and aliases',
        '`DISTINCT`: remove duplicate rows',
        '`ORDER BY`: sort',
        '`TOP` / `OFFSET … FETCH`: keep only some of the sorted rows'
      ] },
      { type: 'p', text: 'This is why `TOP` without `ORDER BY` is a gamble: it takes the first rows of an unsorted result, which can be any rows. The Grouping module adds `GROUP BY` and `HAVING` between WHERE and SELECT.' },
      { type: 'quiz', question: 'A query has no ORDER BY. In what order do the rows come back?', options: ['Primary key order', 'Insertion order', 'No guaranteed order', 'Alphabetical order'], answer: 2, explain: 'Without ORDER BY the order is whatever the plan happens to produce, and it can change. Often it looks like key order, which is what makes the mistake easy to make.' },
      { type: 'quiz', question: 'In ascending order, where do NULLs appear in SQL Server?', options: ['First', 'Last', 'They are left out', 'Wherever they were inserted'], answer: 0, explain: 'SQL Server sorts NULL as lower than any value: first in ASC, last in DESC.' },
      { type: 'quiz', question: 'Which clause skips 20 rows and returns the next 10?', options: ['`TOP (10, 20)`', '`LIMIT 10 OFFSET 20`', '`OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY`', '`SKIP 20 TAKE 10`'], answer: 2, explain: 'T-SQL uses OFFSET … FETCH after ORDER BY. LIMIT is MySQL and PostgreSQL syntax.' },
      { type: 'exercise', task: 'Show the three cheapest products that are **in stock**, cheapest first. Where two cost the same, sort them by name. Return `Name`, `Price` and `Stock`.', hint: 'Filter with WHERE Stock > 0, sort with ORDER BY Price, Name, and take TOP (3).', solution: sql`
SELECT TOP (3) Name, Price, Stock
FROM dbo.Products
WHERE Stock > 0
ORDER BY Price, Name;`, output: 'Name              Price  Stock\n----------------  -----  -----\nSand 25 kg         4.10    220\nTimber 2x4 2.4 m   6.80    500\nCement 25 kg       7.20    300' }
    ],
    keyPoints: [
      'Only ORDER BY guarantees the order of a result; without it, any order is possible.',
      'Sort by several columns, each ASC or DESC; NULLs sort first in ascending order.',
      '`TOP (n)` takes the first n sorted rows; `WITH TIES` adds rows that tie with the last one.',
      '`OFFSET … FETCH` pages through results; sort by something unique so pages do not overlap.',
      '`DISTINCT` removes rows that match in every selected column.',
      'Logical order: FROM → WHERE → SELECT → DISTINCT → ORDER BY → TOP / OFFSET.'
    ]
  }
];
