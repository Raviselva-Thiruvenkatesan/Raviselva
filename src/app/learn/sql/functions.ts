import { Lesson } from '../learn.types';
import { sql } from './sql';

export const FUNCTIONS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'string-functions',
    title: 'Working with text: string functions',
    summary: 'Measure, cut, search, replace and join text with T-SQL’s string functions. Positions start at 1, LEN ignores trailing spaces, and NULL needs care.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Text arrives messy: names in the wrong case, phone numbers with spaces, emails you need the domain of. T-SQL has a toolbox of string functions for cleaning and reshaping it inside a query. Two rules hold for all of them: **positions start at 1**, and a **NULL input gives a NULL result** (except where noted).' },
      { type: 'widget', name: 'sql-string' },
      { type: 'table', head: ['Function', 'Returns', 'Example → result'], rows: [
        ['`LEN(s)`', 'number of characters, ignoring trailing spaces', '`LEN(\'Sand \')` → 4'],
        ['`LEFT(s, n)` / `RIGHT(s, n)`', 'the first / last n characters', '`LEFT(\'Sand 25 kg\', 4)` → Sand'],
        ['`SUBSTRING(s, start, length)`', 'length characters from position start', '`SUBSTRING(\'Plywood\', 4, 4)` → wood'],
        ['`CHARINDEX(find, s [, start])`', 'position of find in s, or 0', '`CHARINDEX(\'@\', \'ben@x.com\')` → 4'],
        ['`REPLACE(s, find, with)`', 's with every find replaced', '`REPLACE(\'0113 496\', \' \', \'\')` → 0113496'],
        ['`UPPER(s)` / `LOWER(s)`', 'changed case', '`UPPER(\'york\')` → YORK'],
        ['`TRIM(s)` / `LTRIM` / `RTRIM`', 's without surrounding spaces', '`TRIM(\'  7  \')` → 7'],
        ['`CONCAT(a, b, …)`', 'joined text; NULL counts as empty', '`CONCAT(\'A\', NULL, \'B\')` → AB'],
        ['`CONCAT_WS(sep, a, b, …)`', 'joined with a separator; NULLs skipped', '`CONCAT_WS(\', \', \'Leeds\', NULL, \'UK\')` → Leeds, UK'],
        ['`REPLICATE(s, n)`', 's repeated n times', '`REPLICATE(\'ab\', 3)` → ababab']
      ] },
      { type: 'h2', text: 'Reshaping names' },
      { type: 'code', code: sql`
SELECT FirstName, LastName,
       UPPER(LastName) + N', ' + LEFT(FirstName, 1) + N'.' AS Label,
       LEN(FirstName + LastName) AS Letters
FROM dbo.Customers
WHERE CustomerId <= 4;`, output: 'FirstName  LastName  Label       Letters\n---------  --------  ----------  -------\nAsha       Patel     PATEL, A.         9\nBen        Carter    CARTER, B.        9\nChloe      Evans     EVANS, C.        10\nDev        Singh     SINGH, D.         8' },
      { type: 'h2', text: 'Cutting at a character' },
      { type: 'p', text: '`CHARINDEX` finds where something is; `LEFT` and `SUBSTRING` cut there. The first word of each product name ends at the first space. Adding a space to the end (`Name + N\' \'`) makes sure there always is one:' },
      { type: 'code', code: sql`
SELECT Name,
       CHARINDEX(N' ', Name) AS FirstSpace,
       LEFT(Name, CHARINDEX(N' ', Name + N' ') - 1) AS FirstWord
FROM dbo.Products
WHERE CategoryId IN (2, 3);`, output: 'Name                 FirstSpace  FirstWord\n-------------------  ----------  ---------\nCement 25 kg                  7  Cement\nSand 25 kg                    5  Sand\nTimber 2x4 2.4 m              7  Timber\nPlywood sheet 18 mm           8  Plywood' },
      { type: 'p', text: 'The same idea splits an email address into the part before and after the `@`. Ben has no email, so every expression on it is NULL, without any error:' },
      { type: 'code', code: sql`
SELECT FirstName, Email,
       LEFT(Email, CHARINDEX(N'@', Email) - 1) AS UserName,
       SUBSTRING(Email, CHARINDEX(N'@', Email) + 1, 100) AS Domain
FROM dbo.Customers
WHERE CustomerId IN (1, 2, 6);`, output: 'FirstName  Email              UserName  Domain\n---------  -----------------  --------  -----------\nAsha       asha@example.com   asha      example.com\nBen        NULL               NULL      NULL\nFarid      farid@example.com  farid     example.com' },
      { type: 'note', kind: 'tip', text: 'Giving SUBSTRING a length longer than what is left (100 here) is fine: it returns everything up to the end. It is the usual way to say “the rest of the string”.' },
      { type: 'h2', text: 'Cleaning and joining' },
      { type: 'p', text: '`REPLACE` removes or swaps characters, and `CONCAT_WS` builds text from parts while skipping the NULL ones, so no stray commas appear:' },
      { type: 'code', code: sql`
SELECT FirstName,
       REPLACE(Phone, ' ', '') AS DialString,
       CONCAT_WS(N' | ', City, Email, Phone) AS Contact
FROM dbo.Customers
WHERE CustomerId IN (2, 3, 5);`, output: 'FirstName  DialString   Contact\n---------  -----------  -------------------------\nBen        01904555010  York | 01904 555 010\nChloe      NULL         Leeds | chloe@example.com\nElla       NULL         ella@example.com' },
      { type: 'h2', text: 'Splitting a list' },
      { type: 'p', text: '`STRING_SPLIT` turns one delimited string into rows, one per item. It is a **table-valued function**, so it goes in FROM, not in the SELECT list, and its column is called `value`:' },
      { type: 'code', code: sql`
SELECT TRIM(value) AS Item
FROM STRING_SPLIT(N'cement, sand ,timber,  paint', N',');`, output: 'Item\n------\ncement\nsand\ntimber\npaint' },
      { type: 'note', kind: 'info', text: 'Its opposite, `STRING_AGG`, joins many rows into one string. It is an aggregate function, so it appears in the Grouping module.' },
      { type: 'h2', text: 'Collation: does case matter?' },
      { type: 'p', text: 'Whether `\'A\' = \'a\'`, and whether `REPLACE` and `CHARINDEX` care about case, is decided by the **collation** of the column or database. The default for English-language installs, `SQL_Latin1_General_CP1_CI_AS`, is **C**ase-**I**nsensitive and **A**ccent-**S**ensitive. You can override it for one comparison:' },
      { type: 'code', code: sql`
SELECT IIF(N'Leeds' = N'LEEDS', 'equal', 'different') AS DefaultCollation,
       IIF(N'Leeds' = N'LEEDS' COLLATE Latin1_General_CS_AS, 'equal', 'different') AS CaseSensitive;`, output: 'DefaultCollation  CaseSensitive\n----------------  -------------\nequal             different' },
      { type: 'quiz', question: 'What does `CHARINDEX(\'z\', \'Hammer\')` return?', options: ['NULL', '-1', '0', 'An error'], answer: 2, explain: 'CHARINDEX returns 0 when the text is not found. Positions start at 1, so 0 can never be a real position.' },
      { type: 'quiz', question: '`LEN(\'abc   \')` is…', options: ['6', '3', '0', 'NULL'], answer: 1, explain: 'LEN ignores trailing spaces. DATALENGTH would count them (6 bytes for varchar).' },
      { type: 'exercise', task: 'For every customer, show their name as `Patel, A.` (surname, comma, initial) and the part of their email before the `@` as `UserName`. Customers without an email should show NULL for UserName.', hint: 'LastName + N\', \' + LEFT(FirstName, 1) + N\'.\' for the label. LEFT(Email, CHARINDEX(N\'@\', Email) - 1) is NULL automatically when Email is NULL.', solution: sql`
SELECT LastName + N', ' + LEFT(FirstName, 1) + N'.' AS Name,
       LEFT(Email, CHARINDEX(N'@', Email) - 1) AS UserName
FROM dbo.Customers;`, output: 'Name        UserName\n----------  --------\nPatel, A.   asha\nCarter, B.  NULL\nEvans, C.   chloe\nSingh, D.   dev\nBrown, E.   ella\nKhan, F.    farid\nLee, G.     NULL\nMüller, Z.  zoe' }
    ],
    keyPoints: [
      'Positions start at 1; CHARINDEX returns 0 when nothing is found.',
      'LEN counts characters and ignores trailing spaces; DATALENGTH counts bytes.',
      'CHARINDEX + LEFT / SUBSTRING cut text at a character; SUBSTRING with a long length means “to the end”.',
      'Most functions return NULL for a NULL input; CONCAT treats NULL as empty and CONCAT_WS skips it.',
      'The collation decides whether comparisons, REPLACE and CHARINDEX care about case.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'numbers-and-maths',
    title: 'Numbers: integer division, rounding and decimal precision',
    summary: 'Arithmetic on whole numbers and decimals: why 17 / 5 is 3, how ROUND, CEILING and FLOOR behave (also with negatives), what type a calculation returns, and how to avoid dividing by zero.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'SQL Server does arithmetic in the **types of its operands**. Two `int`s give an `int`; mix in a `decimal` and you get a decimal with a precision and scale worked out by rules. Most surprises in calculations come from those two facts.' },
      { type: 'h2', text: 'Integer division and remainder' },
      { type: 'p', text: 'Screws come in boxes of 200. How many full boxes is 1,050 screws, and how many are left over?' },
      { type: 'code', code: sql`
SELECT 1050 / 200 AS FullBoxes,
       1050 % 200 AS LeftOver,
       1050 / 200.0 AS ExactBoxes,
       CEILING(1050 / 200.0) AS BoxesToBuy;`, output: 'FullBoxes  LeftOver  ExactBoxes  BoxesToBuy\n---------  --------  ----------  ----------\n        5        50    5.250000           6' },
      { type: 'p', text: 'With two `int`s, `/` gives the whole part and `%` the remainder. Writing `200.0` makes it a decimal, so the division keeps its fraction. `CEILING` then rounds up, because you cannot buy a quarter of a box.' },
      { type: 'h2', text: 'Rounding' },
      { type: 'widget', name: 'round-lab' },
      { type: 'table', head: ['Function', 'Does', '2.5', '-2.5'], rows: [
        ['`ROUND(x, 0)`', 'nearest; halves away from zero', '3.0', '-3.0'],
        ['`ROUND(x, 0, 1)`', 'cut off (truncate)', '2.0', '-2.0'],
        ['`CEILING(x)`', 'up, towards +∞', '3', '-2'],
        ['`FLOOR(x)`', 'down, towards −∞', '2', '-3'],
        ['`CAST(x AS int)`', 'cut off, towards zero', '2', '-2']
      ] },
      { type: 'p', text: '`ROUND` keeps the original type, so its result still has the same number of decimal places, filled with zeros. To store or show a price with exactly two places, cast it:' },
      { type: 'code', code: sql`
SELECT Name, Price,
       Price * 1.2 AS RawIncVat,
       ROUND(Price * 1.2, 2) AS Rounded,
       CAST(Price * 1.2 AS decimal(10,2)) AS IncVat
FROM dbo.Products
WHERE CategoryId = 1;`, output: 'Name              Price  RawIncVat  Rounded  IncVat\n----------------  -----  ---------  -------  ------\nClaw hammer       18.50     22.200   22.200   22.20\nCordless drill    89.00    106.800  106.800  106.80\nTape measure 8 m   9.75     11.700   11.700   11.70' },
      { type: 'note', kind: 'info', text: 'Casting to a smaller scale also rounds (half away from zero), so `CAST(10.725 AS decimal(10,2))` is 10.73. Casting to `int`, on the other hand, truncates. Two conversions, two different rules.' },
      { type: 'h2', text: 'What type does a calculation return?' },
      { type: 'p', text: 'For decimals, SQL Server works out the result’s **precision** (total digits) and **scale** (digits after the point) from the operands. Multiplying adds the scales; dividing gives at least 6 decimal places. You can ask SQL Server what it chose:' },
      { type: 'code', code: sql`
SELECT SQL_VARIANT_PROPERTY(CAST(10 AS decimal(10,2)) * CAST(3 AS decimal(10,2)), 'Scale') AS MultiplyScale,
       SQL_VARIANT_PROPERTY(CAST(10 AS decimal(10,2)) / CAST(3 AS decimal(10,2)), 'Scale') AS DivideScale,
       CAST(10 AS decimal(10,2)) / CAST(3 AS decimal(10,2)) AS Quotient;`, output: 'MultiplyScale  DivideScale         Quotient\n-------------  -----------  ---------------\n4              13           3.3333333333333' },
      { type: 'h2', text: 'Line totals and percentages' },
      { type: 'code', code: sql`
SELECT OrderId, ProductId, Quantity, UnitPrice,
       Quantity * UnitPrice AS LineTotal,
       Quantity * 100 / 40 AS PctOf40Int,
       Quantity * 100.0 / 40 AS PctOf40
FROM dbo.OrderItems
WHERE OrderId = 4;`, output: 'OrderId  ProductId  Quantity  UnitPrice  LineTotal  PctOf40Int     PctOf40\n-------  ---------  --------  ---------  ---------  ----------  ----------\n      4          6        40       6.80     272.00         100  100.000000\n      4          7         6      42.00     252.00          15   15.000000' },
      { type: 'p', text: '`Quantity * 100 / 40` is all `int`, so 6 × 100 / 40 = 15, not 15.0. Writing `100.0` makes the whole expression decimal. Where you put the `.0` matters: `Quantity * 100 / 40.0` would also work, but `Quantity / 40 * 100.0` would already have lost the fraction in `Quantity / 40`.' },
      { type: 'h2', text: 'Dividing by zero' },
      { type: 'p', text: 'Division by zero stops the whole query. `NULLIF(x, 0)` turns a zero divisor into NULL, and dividing by NULL simply gives NULL:' },
      { type: 'code', code: sql`
SELECT Name, Price, Stock,
       Price / NULLIF(Stock, 0) AS PricePerUnitInStock
FROM dbo.Products
WHERE ProductId IN (8, 9, 12);`, output: 'Name               Price  Stock  PricePerUnitInStock\n-----------------  -----  -----  -------------------\nWood screws (200)  11.90    150      0.0793333333333\nWall plugs (100)    4.50      0                 NULL\nSafety goggles      6.80      0                 NULL' },
      { type: 'h2', text: 'Other maths functions' },
      { type: 'code', code: sql`
SELECT ABS(-4.5) AS AbsValue,
       POWER(2, 10) AS TwoToTen,
       SQRT(3.0 * 3.0 + 4.0 * 4.0) AS Hypotenuse,
       ROUND(PI() * POWER(0.15, 2), 4) AS ColumnAreaM2,
       SIGN(-7) AS SignOfMinus7;`, output: 'AbsValue  TwoToTen  Hypotenuse  ColumnAreaM2  SignOfMinus7\n--------  --------  ----------  ------------  ------------\n     4.5      1024           5        0.0628            -1' },
      { type: 'note', kind: 'info', text: 'SQRT, PI, POWER of a decimal and the trigonometric functions (SIN, COS, ATN2, …) work in `float`. That is fine for geometry; round or cast the result before storing it as money.' },
      { type: 'quiz', question: 'What is `SELECT 7 / 2 * 2;`?', options: ['7', '6', '7.0', '8'], answer: 1, explain: '7 / 2 is 3 in integer arithmetic, then 3 × 2 = 6.' },
      { type: 'quiz', question: 'What is `FLOOR(-2.5)`?', options: ['-2', '-3', '-2.5', '2'], answer: 1, explain: 'FLOOR goes down towards minus infinity, so -2.5 becomes -3. CEILING would give -2.' },
      { type: 'quiz', question: 'Which expression returns 2.5?', options: ['`5 / 2`', '`CAST(5 / 2 AS decimal(4,1))`', '`5 / 2.0`', '`ROUND(5 / 2, 1)`'], answer: 2, explain: 'Only `5 / 2.0` divides as decimals. The others divide as integers first (giving 2) and convert afterwards.' },
      { type: 'exercise', task: 'A builder needs 2,300 wall plugs, which come in boxes of 100 at 4.50 a box. Return the number of boxes to buy as `Boxes`, the total cost as `Cost`, and how many plugs will be spare as `Spare`.', hint: 'CEILING(2300 / 100.0) gives the boxes. Multiply by the price for the cost, and subtract 2300 from boxes × 100 for the spares.', solution: sql`
SELECT CEILING(2300 / 100.0) AS Boxes,
       CEILING(2300 / 100.0) * 4.50 AS Cost,
       CEILING(2300 / 100.0) * 100 - 2300 AS Spare;`, output: 'Boxes    Cost  Spare\n-----  ------  -----\n   23  103.50      0' }
    ],
    keyPoints: [
      'int / int is an int: 17 / 5 = 3, and % gives the remainder. Add `.0` to one side to keep fractions.',
      'ROUND rounds halves away from zero and keeps the scale; CEILING goes up, FLOOR goes down, CAST to int cuts off.',
      'Decimal results have their own precision and scale: multiplying adds scales, dividing gives at least 6 places.',
      'Cast to `decimal(10,2)` to store or show a value with exactly two places.',
      '`x / NULLIF(y, 0)` avoids a divide-by-zero error.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'dates-and-times',
    title: 'Dates and times',
    summary: 'Take dates apart, add to them, measure between them and build them from parts. Plus why DATEDIFF counts boundaries, how to filter by month properly, and how to handle time zones.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Orders, deliveries, invoices and memberships all hang off dates. T-SQL has a full set of date functions; most of them take a **datepart** argument such as `year`, `month`, `day`, `week`, `hour` or `minute`.' },
      { type: 'h2', text: 'The current date and time' },
      { type: 'code', code: sql`
SELECT SYSDATETIME()       AS LocalNow,       -- datetime2(7), the server's clock
       SYSDATETIMEOFFSET() AS LocalWithZone,  -- datetimeoffset
       SYSUTCDATETIME()    AS UtcNow,
       CAST(SYSDATETIME() AS date) AS Today,
       GETDATE()           AS OlderStyle;     -- datetime, less precise`, title: 'Now.sql' },
      { type: 'p', text: 'No output is shown because yours will differ. Every sample below uses fixed dates, so you get exactly the results printed.' },
      { type: 'h2', text: 'Taking dates apart' },
      { type: 'code', code: sql`
SELECT OrderId, OrderDate,
       YEAR(OrderDate) AS Yr,
       MONTH(OrderDate) AS Mon,
       DATENAME(month, OrderDate) AS MonthName,
       DATENAME(weekday, OrderDate) AS DayName,
       DATEPART(quarter, OrderDate) AS Qtr
FROM dbo.Orders
WHERE OrderId IN (1, 4, 8);`, output: 'OrderId  OrderDate     Yr  Mon  MonthName  DayName   Qtr\n-------  ----------  ----  ---  ---------  --------  ---\n      1  2024-02-03  2024    2  February   Saturday    1\n      4  2024-03-15  2024    3  March      Friday      1\n      8  2024-05-18  2024    5  May        Saturday    2' },
      { type: 'h2', text: 'Adding to dates' },
      { type: 'p', text: '`DATEADD(part, n, date)` moves a date forward (or back, with a negative n). Adding a month to 31 January lands on the last day of February, because there is no 31 February:' },
      { type: 'code', code: sql`
DECLARE @d date = '2024-01-31';

SELECT DATEADD(day, 30, @d)    AS Plus30Days,
       DATEADD(month, 1, @d)   AS PlusOneMonth,
       DATEADD(month, -2, @d)  AS MinusTwoMonths,
       DATEADD(year, 1, CAST('2024-02-29' AS date)) AS LeapDayPlusYear;`, output: 'Plus30Days  PlusOneMonth  MinusTwoMonths  LeapDayPlusYear\n----------  ------------  --------------  ---------------\n2024-03-01  2024-02-29    2023-11-30      2025-02-28' },
      { type: 'note', kind: 'tip', text: 'Declare a `date` variable or cast the literal, as above. `DATEADD(month, 1, \'2024-01-31\')` treats the bare string as the older `datetime` type and returns a time of midnight along with the date.' },
      { type: 'h2', text: 'Measuring between dates' },
      { type: 'p', text: '`DATEDIFF(part, start, end)` does **not** measure whole periods. It counts how many period **boundaries** lie between the dates: midnights for days, 1 Januaries for years. See it on a timeline:' },
      { type: 'widget', name: 'datediff-line' },
      { type: 'code', code: sql`
SELECT DATEDIFF(year, '2023-12-31', '2024-01-01') AS YearsOneDayApart,
       DATEDIFF(year, '2024-01-01', '2024-12-31') AS YearsAlmostAYear,
       DATEDIFF(day,  '2024-02-03', '2024-07-01') AS Days;`, output: 'YearsOneDayApart  YearsAlmostAYear  Days\n----------------  ----------------  ----\n               1                 0   149' },
      { type: 'p', text: 'For whole years, as in an age or a length of membership, subtract one when this year’s anniversary has not arrived yet:' },
      { type: 'code', code: sql`
DECLARE @asOf date = '2024-09-01';

SELECT FirstName, JoinedOn,
       DATEDIFF(year, JoinedOn, @asOf) AS BoundaryCount,
       DATEDIFF(year, JoinedOn, @asOf)
         - IIF(DATEADD(year, DATEDIFF(year, JoinedOn, @asOf), JoinedOn) > @asOf, 1, 0) AS WholeYears
FROM dbo.Customers
WHERE CustomerId IN (1, 4, 6);`, output: 'FirstName  JoinedOn    BoundaryCount  WholeYears\n---------  ----------  -------------  ----------\nAsha       2023-03-02              1           1\nDev        2023-08-23              1           1\nFarid      2023-11-30              1           0' },
      { type: 'h2', text: 'Building dates' },
      { type: 'code', code: sql`
DECLARE @d date = '2024-02-10';

SELECT DATEFROMPARTS(YEAR(@d), MONTH(@d), 1) AS FirstOfMonth,
       EOMONTH(@d) AS LastOfMonth,
       EOMONTH(@d, 1) AS LastOfNextMonth,
       DATEFROMPARTS(2024, 12, 25) AS Christmas;`, output: 'FirstOfMonth  LastOfMonth  LastOfNextMonth  Christmas\n------------  -----------  ---------------  ----------\n2024-02-01    2024-02-29   2024-03-31       2024-12-25' },
      { type: 'h2', text: 'Filtering by a month: use a range' },
      { type: 'p', text: 'Two ways to find May 2024’s orders return the same rows:' },
      { type: 'code', code: sql`
-- 1. Functions on the column
SELECT OrderId, OrderDate FROM dbo.Orders
WHERE YEAR(OrderDate) = 2024 AND MONTH(OrderDate) = 5;

-- 2. A half-open range: from the 1st, up to (not including) the next 1st
SELECT OrderId, OrderDate FROM dbo.Orders
WHERE OrderDate >= '2024-05-01' AND OrderDate < '2024-06-01';`, output: 'OrderId  OrderDate\n-------  ----------\n      7  2024-05-05\n      8  2024-05-18\n\nOrderId  OrderDate\n-------  ----------\n      7  2024-05-05\n      8  2024-05-18' },
      { type: 'p', text: 'Prefer the second. Wrapping the column in a function means SQL Server must calculate it for every row, so an index on OrderDate cannot be used to jump to May. The range also works unchanged if the column later gains a time of day. The Indexes module calls this being **sargable**.' },
      { type: 'h2', text: 'Formatting for display' },
      { type: 'code', code: sql`
SELECT OrderDate,
       CONVERT(varchar(10), OrderDate, 103) AS British,
       CONVERT(varchar(10), OrderDate, 101) AS American,
       FORMAT(OrderDate, 'dddd d MMMM yyyy', 'en-GB') AS Long
FROM dbo.Orders
WHERE OrderId = 1;`, output: 'OrderDate   British     American    Long\n----------  ----------  ----------  ------------------------\n2024-02-03  03/02/2024  02/03/2024  Saturday 3 February 2024' },
      { type: 'note', kind: 'warn', text: 'Format dates as late as possible, ideally in the application. A formatted date is text: it sorts wrongly (01/03 before 31/01) and needs converting back for any date maths. `FORMAT` is also much slower than `CONVERT` on large result sets.' },
      { type: 'h2', text: 'Time zones' },
      { type: 'p', text: '`datetime2` has no time zone. `AT TIME ZONE` attaches one, using Windows zone names, and handles summer time for you. Here a UK delivery slot is converted to UTC and to India time:' },
      { type: 'code', code: sql`
DECLARE @slot datetime2(0) = '2024-06-12 14:30:00';

SELECT @slot AT TIME ZONE 'GMT Standard Time' AS UkTime,
       @slot AT TIME ZONE 'GMT Standard Time' AT TIME ZONE 'UTC' AS Utc,
       @slot AT TIME ZONE 'GMT Standard Time' AT TIME ZONE 'India Standard Time' AS India;`, output: 'UkTime                      Utc                         India\n--------------------------  --------------------------  --------------------------\n2024-06-12 14:30:00 +01:00  2024-06-12 13:30:00 +00:00  2024-06-12 19:00:00 +05:30' },
      { type: 'quiz', question: 'What is `DATEDIFF(month, \'2024-01-31\', \'2024-02-01\')`?', options: ['0', '1', '0.03', 'An error'], answer: 1, explain: 'The two dates are one day apart, but a month boundary (1 February) lies between them, and DATEDIFF counts boundaries.' },
      { type: 'quiz', question: 'Why is `WHERE OrderDate >= \'2024-05-01\' AND OrderDate < \'2024-06-01\'` better than `WHERE MONTH(OrderDate) = 5 AND YEAR(OrderDate) = 2024`?', options: ['It returns more rows', 'It can use an index on OrderDate', 'MONTH() is deprecated', 'It is shorter'], answer: 1, explain: 'A plain comparison on the column lets SQL Server seek in an index. A function on the column forces it to compute the value for every row.' },
      { type: 'exercise', task: 'For each **Shipped** order, show the `OrderId`, the `OrderDate`, the payment due date 30 days later as `DueDate`, and the last day of the order’s month as `MonthEnd`.', hint: 'DATEADD(day, 30, OrderDate) and EOMONTH(OrderDate). Filter on Status.', solution: sql`
SELECT OrderId, OrderDate,
       DATEADD(day, 30, OrderDate) AS DueDate,
       EOMONTH(OrderDate) AS MonthEnd
FROM dbo.Orders
WHERE Status = 'Shipped';`, output: 'OrderId  OrderDate   DueDate     MonthEnd\n-------  ----------  ----------  ----------\n      1  2024-02-03  2024-03-04  2024-02-29\n      2  2024-02-10  2024-03-11  2024-02-29\n      3  2024-03-01  2024-03-31  2024-03-31\n      4  2024-03-15  2024-04-14  2024-03-31\n      5  2024-04-02  2024-05-02  2024-04-30\n      7  2024-05-05  2024-06-04  2024-05-31\n     10  2024-06-12  2024-07-12  2024-06-30' }
    ],
    keyPoints: [
      'YEAR, MONTH, DATEPART and DATENAME take dates apart; DATEFROMPARTS and EOMONTH build them.',
      'DATEADD adds whole parts and clips to the end of shorter months.',
      'DATEDIFF counts boundaries crossed, not whole periods: one day can be “1 year”.',
      'Filter date ranges with `>= start AND < next start`, not functions on the column.',
      'Format only for display; keep dates as dates. Use datetimeoffset or AT TIME ZONE when time zones matter.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'case-expressions',
    title: 'Decisions inside a query: CASE and IIF',
    summary: 'Turn values into labels, bands and custom sort orders with CASE. Learn the two forms, why the order of WHENs matters, what a missing ELSE does, and the shortcuts IIF and CHOOSE.',
    minutes: 13,
    blocks: [
      { type: 'p', text: '`CASE` is SQL’s if-then-else. It is an **expression**: it produces one value per row, so it can go anywhere a value can: in SELECT, ORDER BY, WHERE, even inside other functions.' },
      { type: 'h2', text: 'Searched CASE' },
      { type: 'p', text: 'The **searched** form tests a list of conditions. SQL Server tries them from the top and returns the result of the **first** one that is true:' },
      { type: 'code', code: sql`
SELECT Name, Stock,
       CASE
           WHEN Stock = 0   THEN N'Out of stock'
           WHEN Stock < 20  THEN N'Low'
           WHEN Stock < 100 THEN N'OK'
           ELSE N'Plenty'
       END AS StockLevel
FROM dbo.Products
WHERE ProductId <= 6 OR Stock = 0;`, output: 'Name              Stock  StockLevel\n----------------  -----  ------------\nClaw hammer          40  OK\nCordless drill       12  Low\nTape measure 8 m     65  OK\nCement 25 kg        300  Plenty\nSand 25 kg          220  Plenty\nTimber 2x4 2.4 m    500  Plenty\nWall plugs (100)      0  Out of stock\nSafety goggles        0  Out of stock' },
      { type: 'p', text: 'Reorder the WHENs and switch the ELSE off to see why the order matters:' },
      { type: 'widget', name: 'case-flow' },
      { type: 'note', kind: 'warn', text: 'Without an ELSE, rows that match no WHEN get NULL. Even when you think every case is covered, an ELSE makes the intent explicit, for example `ELSE N\'Unknown\'`.' },
      { type: 'h2', text: 'Simple CASE' },
      { type: 'p', text: 'When every test compares the same expression with `=`, the **simple** form is shorter. It cannot test ranges or NULL (because `= NULL` is never true):' },
      { type: 'code', code: sql`
SELECT OrderId, Status,
       CASE Status
           WHEN 'Shipped'   THEN N'On its way or delivered'
           WHEN 'Pending'   THEN N'Waiting to be packed'
           WHEN 'Cancelled' THEN N'Cancelled by customer'
           ELSE N'Check status'
       END AS ForCustomer
FROM dbo.Orders
WHERE OrderId IN (5, 6, 8);`, output: 'OrderId  Status     ForCustomer\n-------  ---------  -----------------------\n      5  Shipped    On its way or delivered\n      6  Cancelled  Cancelled by customer\n      8  Pending    Waiting to be packed' },
      { type: 'h2', text: 'CASE in ORDER BY: a custom sort' },
      { type: 'p', text: 'The warehouse wants pending orders first, then shipped, then cancelled. Alphabetical order would not give that, but a CASE that turns each status into a number does:' },
      { type: 'code', code: sql`
SELECT OrderId, OrderDate, Status
FROM dbo.Orders
ORDER BY CASE Status WHEN 'Pending' THEN 1 WHEN 'Shipped' THEN 2 ELSE 3 END,
         OrderDate DESC;`, output: 'OrderId  OrderDate   Status\n-------  ----------  ---------\n      9  2024-06-01  Pending\n      8  2024-05-18  Pending\n     10  2024-06-12  Shipped\n      7  2024-05-05  Shipped\n      5  2024-04-02  Shipped\n      4  2024-03-15  Shipped\n      3  2024-03-01  Shipped\n      2  2024-02-10  Shipped\n      1  2024-02-03  Shipped\n      6  2024-04-20  Cancelled' },
      { type: 'h2', text: 'One result type' },
      { type: 'p', text: 'All the results of a CASE must share one type. If they differ, SQL Server converts them all to the type with the highest **precedence**, and int beats text. Mixing a number and a word therefore fails as soon as the word comes up:' },
      { type: 'code', code: sql`
SELECT Name,
       CASE WHEN Stock > 0 THEN Stock ELSE 'none' END AS StockShown
FROM dbo.Products;`, output: 'Msg 245, Level 16, State 1, Line 1\nConversion failed when converting the varchar value \'none\' to data type int.' },
      { type: 'p', text: 'Make every branch text instead: `CASE WHEN Stock > 0 THEN CAST(Stock AS varchar(10)) ELSE \'none\' END`. Type precedence is the subject of the next lesson.' },
      { type: 'h2', text: 'IIF and CHOOSE' },
      { type: 'p', text: '`IIF(test, ifTrue, ifFalse)` is shorthand for a CASE with one WHEN and an ELSE. `CHOOSE(n, a, b, c, …)` picks the nth item of a list (counting from 1). Both are rewritten into CASE behind the scenes.' },
      { type: 'code', code: sql`
SELECT Name, Price,
       IIF(Price >= 40, N'Big ticket', N'Everyday') AS Kind,
       CHOOSE(CategoryId, N'Tools', N'Building', N'Timber', N'Fixings', N'Paint', N'Safety') AS Category
FROM dbo.Products
WHERE ProductId IN (2, 5, 7, 11);`, output: 'Name                 Price  Kind        Category\n-------------------  -----  ----------  --------\nCordless drill       89.00  Big ticket  Tools\nSand 25 kg            4.10  Everyday    Building\nPlywood sheet 18 mm  42.00  Big ticket  Timber\nPaint roller set     12.50  Everyday    Paint' },
      { type: 'note', kind: 'info', text: 'Hard-coding category names in CHOOSE is only a demo: the names belong in the Categories table, and a join (next module) fetches them. CASE is best for rules that are genuinely about logic, such as stock levels, not for data that should live in a table.' },
      { type: 'quiz', question: 'A product has Stock = 0. What does `CASE WHEN Stock < 100 THEN \'OK\' WHEN Stock = 0 THEN \'Out\' END` return?', options: ['Out', 'OK', 'NULL', 'Both'], answer: 1, explain: 'The first true WHEN wins. 0 < 100 is true, so the second WHEN is never checked.' },
      { type: 'quiz', question: 'What does a CASE return for a row that matches no WHEN and has no ELSE?', options: ['An empty string', '0', 'NULL', 'An error'], answer: 2, explain: 'The implicit ELSE is NULL.' },
      { type: 'exercise', task: 'Put every product into a price band: under 5 is `Budget`, under 20 is `Standard`, under 60 is `Premium`, anything else is `Trade only`. Show `Name`, `Price` and `Band`, sorted by price.', hint: 'A searched CASE with the WHENs in rising order, so each catches only what the previous ones did not.', solution: sql`
SELECT Name, Price,
       CASE
           WHEN Price < 5  THEN N'Budget'
           WHEN Price < 20 THEN N'Standard'
           WHEN Price < 60 THEN N'Premium'
           ELSE N'Trade only'
       END AS Band
FROM dbo.Products
ORDER BY Price;`, output: 'Name                 Price  Band\n-------------------  -----  ----------\nSand 25 kg            4.10  Budget\nWall plugs (100)      4.50  Budget\nTimber 2x4 2.4 m      6.80  Standard\nSafety goggles        6.80  Standard\nCement 25 kg          7.20  Standard\nTape measure 8 m      9.75  Standard\nWood screws (200)    11.90  Standard\nPaint roller set     12.50  Standard\nClaw hammer          18.50  Standard\nPlywood sheet 18 mm  42.00  Premium\nMasonry paint 10 L   54.00  Premium\nCordless drill       89.00  Trade only' }
    ],
    keyPoints: [
      'CASE is an expression: one value per row, usable in SELECT, ORDER BY, WHERE and inside functions.',
      'Searched CASE (`CASE WHEN cond THEN …`) tests conditions; simple CASE (`CASE x WHEN value THEN …`) compares one expression for equality.',
      'WHENs are tried top to bottom and the first true one wins: put the narrowest first.',
      'No ELSE means NULL for unmatched rows; all branches must share one type.',
      'IIF and CHOOSE are shortcuts that become CASE.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'conversion',
    title: 'Converting types: CAST, CONVERT and TRY_CAST',
    summary: 'When SQL Server converts for you and when you must ask, the rules of data type precedence, date styles with CONVERT, safe conversion with TRY_CAST, and the traps in empty strings and imported text.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Every value has a type, and combining values of different types needs a **conversion**. Sometimes SQL Server does it silently (**implicit** conversion); sometimes you must ask for it (**explicit** conversion, with CAST or CONVERT). Knowing which happens, and in which direction, avoids a whole class of bugs.' },
      { type: 'h2', text: 'Data type precedence' },
      { type: 'p', text: 'When an operator meets two different types, the one with lower **precedence** is converted to the one with higher precedence. Numbers outrank text, so `+` between text and an int is addition, not joining:' },
      { type: 'code', code: sql`
SELECT '10' + 5    AS TextPlusInt,
       '10' + '5'  AS TextPlusText,
       CONCAT('10', 5) AS Joined,
       10 + 2.5    AS IntPlusDecimal;`, output: 'TextPlusInt  TextPlusText  Joined  IntPlusDecimal\n-----------  ------------  ------  --------------\n         15  105           105               12.5' },
      { type: 'table', head: ['Higher precedence wins', 'Examples'], rows: [
        ['date and time types', '`datetimeoffset` > `datetime2` > `datetime` > `date`'],
        ['approximate numbers', '`float` > `real`'],
        ['exact numbers', '`decimal` > `money` > `bigint` > `int` > `smallint` > `tinyint` > `bit`'],
        ['text (lowest)', '`nvarchar` > `nchar` > `varchar` > `char`']
      ] },
      { type: 'p', text: 'So `\'abc\' + 5` fails: SQL Server tries to turn \'abc\' into an int. And comparing a `varchar` column with an `int` value converts **the column**, row by row, which is both slow and a source of conversion errors.' },
      { type: 'h2', text: 'CAST and CONVERT' },
      { type: 'p', text: '`CAST(x AS type)` is standard SQL. `CONVERT(type, x [, style])` is T-SQL’s version, with an optional **style** number that controls how dates and numbers are written as text or read from it:' },
      { type: 'code', code: sql`
SELECT CAST('42' AS int) AS CastText,
       CAST(18.5 AS varchar(10)) AS NumberAsText,
       CONVERT(varchar(10), CAST('2024-12-31' AS date), 103) AS Style103,
       CONVERT(varchar(8),  CAST('2024-12-31' AS date), 112) AS Style112,
       CONVERT(date, '31/12/2024', 103) AS ReadBritish;`, output: 'CastText  NumberAsText  Style103    Style112  ReadBritish\n--------  ------------  ----------  --------  -----------\n      42  18.5          31/12/2024  20241231  2024-12-31' },
      { type: 'table', head: ['Style', 'Format', 'Example'], rows: [
        ['23', 'yyyy-mm-dd', '2024-12-31'],
        ['103', 'dd/mm/yyyy (British)', '31/12/2024'],
        ['101', 'mm/dd/yyyy (US)', '12/31/2024'],
        ['112', 'yyyymmdd (ISO basic)', '20241231'],
        ['120', 'yyyy-mm-dd hh:mi:ss', '2024-12-31 14:30:00']
      ] },
      { type: 'h2', text: 'TRY_CAST: convert or give NULL' },
      { type: 'p', text: 'CAST stops the whole query at the first value it cannot convert. `TRY_CAST` and `TRY_CONVERT` return NULL instead, which makes them ideal for checking imported data. Explore which texts convert to which types:' },
      { type: 'widget', name: 'convert-matrix' },
      { type: 'p', text: 'A typical use: a spreadsheet was imported as text, and you need to find the rows that will not convert before loading them into a real table:' },
      { type: 'code', code: sql`
CREATE TABLE #Import (RowNo int, PriceText varchar(20), DateText varchar(20));
INSERT INTO #Import (RowNo, PriceText, DateText) VALUES
    (1, '12.50', '2024-07-01'),
    (2, ' 7',    '2024-07-02'),
    (3, 'n/a',   '2024-07-03'),
    (4, '9.99',  '2024-07-32'),
    (5, '',      '');

SELECT RowNo, PriceText, DateText,
       TRY_CAST(PriceText AS decimal(10,2)) AS Price,
       TRY_CAST(DateText AS date) AS TheDate
FROM #Import
WHERE TRY_CAST(PriceText AS decimal(10,2)) IS NULL
   OR TRY_CAST(DateText AS date) IS NULL;`, output: 'RowNo  PriceText  DateText    Price  TheDate\n-----  ---------  ----------  -----  ----------\n    3  n/a        2024-07-03   NULL  2024-07-03\n    4  9.99       2024-07-32   9.99  NULL\n    5                          NULL  1900-01-01' },
      { type: 'h2', text: 'The empty-string trap' },
      { type: 'p', text: 'Look again at row 5 above. It was caught only because its blank price failed to become a decimal; its blank date became **1 January 1900** without complaint. An empty string converts to 0 as an int and to 1900-01-01 as a date, so blank cells in an import can quietly become real-looking values:' },
      { type: 'code', code: sql`
SELECT CAST('' AS int) AS EmptyAsInt,
       CAST('' AS date) AS EmptyAsDate,
       TRY_CAST(NULLIF(TRIM(''), '') AS date) AS Safe;`, output: 'EmptyAsInt  EmptyAsDate  Safe\n----------  -----------  ----\n         0  1900-01-01   NULL' },
      { type: 'p', text: '`NULLIF(TRIM(x), \'\')` turns blanks (and all-space values) into NULL first, so they stay unknown instead of becoming 0 or 1900-01-01.' },
      { type: 'h2', text: 'FORMAT for display' },
      { type: 'p', text: '`FORMAT(value, pattern, culture)` uses .NET format strings, with a culture for currency symbols and separators. Use it for display only:' },
      { type: 'code', code: sql`
SELECT Name,
       FORMAT(Price, 'C', 'en-GB') AS UkPrice,
       FORMAT(Price, 'C', 'de-DE') AS GermanPrice,
       FORMAT(Stock, 'N0') AS StockWithSeparators
FROM dbo.Products
WHERE ProductId IN (2, 6);`, output: 'Name              UkPrice  GermanPrice  StockWithSeparators\n----------------  -------  -----------  -------------------\nCordless drill    £89.00   89,00 €      12\nTimber 2x4 2.4 m  £6.80    6,80 €       500' },
      { type: 'quiz', question: 'What is `SELECT \'3\' + 4;`?', options: ['34', '7', 'An error', '\'3\' + 4 as text'], answer: 1, explain: 'int has higher precedence than varchar, so \'3\' is converted to 3 and the result is 7.' },
      { type: 'quiz', question: 'What does `TRY_CAST(\'2024-02-30\' AS date)` return?', options: ['2024-03-01', '2024-02-29', 'NULL', 'An error'], answer: 2, explain: 'There is no 30 February. TRY_CAST returns NULL instead of raising an error.' },
      { type: 'quiz', question: 'What does `CAST(\'\' AS int)` return?', options: ['NULL', '0', 'An error', 'An empty string'], answer: 1, explain: 'An empty string converts to 0 for int. Use NULLIF(x, \'\') first when blank means unknown.' },
      { type: 'exercise', task: 'Imported prices arrive as text. Convert each one safely to `decimal(10,2)`: blanks and all-space values should become NULL, and so should anything that is not a number. Use the values `\'12.50\'`, `\' 7\'`, `\'n/a\'`, `\'\'` and `\'   \'`.', hint: 'Put the values in a VALUES list in FROM: FROM (VALUES (\'12.50\'), (\' 7\'), …) AS v(PriceText). Then TRY_CAST(NULLIF(TRIM(PriceText), \'\') AS decimal(10,2)).', solution: sql`
SELECT PriceText,
       TRY_CAST(NULLIF(TRIM(PriceText), '') AS decimal(10,2)) AS Price
FROM (VALUES ('12.50'), (' 7'), ('n/a'), (''), ('   ')) AS v(PriceText);`, output: 'PriceText  Price\n---------  -----\n12.50      12.50\n 7          7.00\nn/a         NULL\n            NULL\n            NULL' }
    ],
    keyPoints: [
      'Mixed types are converted towards the higher precedence type: numbers beat text, so \'10\' + 5 = 15.',
      'CAST is standard; CONVERT adds style numbers for dates (103 British, 112 yyyymmdd, 23 ISO).',
      'TRY_CAST / TRY_CONVERT return NULL instead of failing: use them to find bad imported rows.',
      'Empty strings become 0 or 1900-01-01: wrap with NULLIF(TRIM(x), \'\') first.',
      'FORMAT is for display only, and slow; keep values in their real types for storage and maths.'
    ]
  }
];
