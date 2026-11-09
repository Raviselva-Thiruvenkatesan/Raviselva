import { Lesson } from '../learn.types';
import { sql } from './sql';

export const GROUPING: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'aggregates',
    title: 'Aggregates: COUNT, SUM, AVG, MIN and MAX',
    summary: 'Turn many rows into one answer: the five everyday aggregate functions, what COUNT(*) and COUNT(column) really count, how NULLs are skipped, the integer AVG trap, and STRING_AGG for building lists.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Every query so far returned one result row per table row (or per matched pair). An **aggregate function** does the opposite: it reads many rows and returns **one value** that summarises them.' },
      { type: 'code', code: sql`
SELECT COUNT(*)   AS Products,
       SUM(Stock) AS UnitsInStock,
       MIN(Price) AS Cheapest,
       MAX(Price) AS Dearest,
       AVG(Price) AS AveragePrice
FROM dbo.Products;`, output: 'Products  UnitsInStock  Cheapest  Dearest  AveragePrice\n--------  ------------  --------  -------  ------------\n      12          1422      4.10    89.00     22.254166' },
      { type: 'table', head: ['Function', 'Returns', 'Works on'], rows: [
        ['`COUNT(*)`', 'the number of rows', 'any rows'],
        ['`COUNT(col)`', 'the number of rows where col is **not NULL**', 'any type'],
        ['`SUM(col)`', 'the total', 'numbers'],
        ['`AVG(col)`', 'the mean: SUM ÷ COUNT(col)', 'numbers'],
        ['`MIN(col)` / `MAX(col)`', 'the smallest / largest value', 'numbers, text and dates']
      ] },
      { type: 'h2', text: 'What COUNT counts' },
      { type: 'p', text: '`COUNT(*)` counts rows. `COUNT(column)` counts the rows where that column has a value, so it skips NULLs. `COUNT(DISTINCT column)` counts the different values:' },
      { type: 'code', code: sql`
SELECT COUNT(*)             AS Customers,
       COUNT(City)          AS WithCity,
       COUNT(DISTINCT City) AS Cities,
       COUNT(Email)         AS WithEmail,
       COUNT(Phone)         AS WithPhone
FROM dbo.Customers;`, output: 'Warning: Null value is eliminated by an aggregate or other SET operation.\n\nCustomers  WithCity  Cities  WithEmail  WithPhone\n---------  --------  ------  ---------  ---------\n        8         7       4          6          5' },
      { type: 'p', text: 'The warning above the result is SQL Server telling you it ignored some NULLs. It is not an error, and SSMS shows it on the Messages tab.' },
      { type: 'widget', name: 'agg-null' },
      { type: 'h2', text: 'Every aggregate except COUNT(*) skips NULLs' },
      { type: 'p', text: 'SUM, AVG, MIN and MAX ignore NULLs, as if those rows were not there. That is usually what you want, but it changes the meaning of AVG. Here a table of delivery charges has one charge not yet known:' },
      { type: 'code', code: sql`
CREATE TABLE #Charges (OrderId int, Charge decimal(6,2) NULL);
INSERT INTO #Charges VALUES (1, 5.00), (2, 10.00), (3, NULL), (4, 9.00);

SELECT AVG(Charge)              AS AvgKnown,
       SUM(Charge) / COUNT(*)   AS AvgOverAll,
       AVG(ISNULL(Charge, 0))   AS AvgNullAsZero
FROM #Charges;`, output: 'Warning: Null value is eliminated by an aggregate or other SET operation.\n\nAvgKnown  AvgOverAll  AvgNullAsZero\n--------  ----------  -------------\n8.000000    6.000000       6.000000' },
      { type: 'p', text: '`AVG(Charge)` divides 24 by the **3** known charges. Dividing by all 4 rows, or treating the missing charge as 0, gives 6. Decide which question you are asking: “the average of the charges we know” or “the average per order”.' },
      { type: 'h2', text: 'The integer AVG trap' },
      { type: 'p', text: 'AVG returns the same type as its input. Stock is an `int`, so the average is an int too, and the fraction is thrown away:' },
      { type: 'code', code: sql`
SELECT SUM(Stock)                      AS Total,
       COUNT(*)                        AS Products,
       AVG(Stock)                      AS IntAverage,
       AVG(CAST(Stock AS decimal(9,2))) AS RealAverage
FROM dbo.Products;`, output: 'Total  Products  IntAverage  RealAverage\n-----  --------  ----------  -----------\n 1422        12         118   118.500000' },
      { type: 'note', kind: 'warn', text: '1422 ÷ 12 is 118.5, but `AVG(Stock)` says 118. Whenever you average an integer column, convert it first: `AVG(CAST(col AS decimal(…)))` or `AVG(col * 1.0)`.' },
      { type: 'h2', text: 'Aggregates over a filter or a join' },
      { type: 'p', text: 'WHERE runs **before** the aggregate, so it picks which rows are summarised. Joins work the same way. This totals the value of every shipped order line:' },
      { type: 'code', code: sql`
SELECT COUNT(*)                     AS Lines,
       COUNT(DISTINCT o.OrderId)    AS Orders,
       SUM(oi.Quantity * oi.UnitPrice) AS Revenue
FROM dbo.Orders AS o
JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
WHERE o.Status = 'Shipped';`, output: 'Lines  Orders  Revenue\n-----  ------  -------\n   14       7  1199.15' },
      { type: 'p', text: 'MIN and MAX also work on text (alphabetical order) and dates (earliest and latest):' },
      { type: 'code', code: sql`
SELECT MIN(OrderDate) AS FirstOrder,
       MAX(OrderDate) AS LastOrder,
       DATEDIFF(day, MIN(OrderDate), MAX(OrderDate)) AS DaysTrading,
       MIN(Status)    AS FirstStatusAlphabetically
FROM dbo.Orders;`, output: 'FirstOrder  LastOrder   DaysTrading  FirstStatusAlphabetically\n----------  ----------  -----------  -------------------------\n2024-02-03  2024-06-12          130  Cancelled' },
      { type: 'h2', text: 'When there are no rows' },
      { type: 'p', text: 'An aggregate over zero rows still returns one row. COUNT says 0, but SUM, AVG, MIN and MAX have nothing to work with and return NULL. Plumbing has no products:' },
      { type: 'code', code: sql`
SELECT COUNT(*) AS Products, SUM(Stock) AS Units, MAX(Price) AS Dearest
FROM dbo.Products
WHERE CategoryId = 7;`, output: 'Products  Units  Dearest\n--------  -----  -------\n       0   NULL     NULL' },
      { type: 'note', kind: 'tip', text: 'Wrap SUM in `ISNULL(SUM(x), 0)` when a report must show 0 instead of NULL for an empty set.' },
      { type: 'h2', text: 'Building a list with STRING_AGG' },
      { type: 'p', text: '`STRING_AGG` (SQL Server 2017+) joins the values of many rows into one string, with a separator. `WITHIN GROUP (ORDER BY …)` sets the order of the list:' },
      { type: 'code', code: sql`
SELECT STRING_AGG(Name, N', ') WITHIN GROUP (ORDER BY Name) AS OutOfStock
FROM dbo.Products
WHERE Stock = 0;`, output: 'OutOfStock\n--------------------------------\nSafety goggles, Wall plugs (100)' },
      { type: 'h2', text: 'Aggregates and plain columns do not mix' },
      { type: 'p', text: 'An aggregate collapses all rows into one, so a plain column has no single value to show beside it. Which product name should go next to MAX(Price)? SQL Server refuses to guess:' },
      { type: 'code', code: sql`
SELECT Name, MAX(Price) AS Dearest
FROM dbo.Products;`, output: 'Msg 8120, Level 16, State 1, Line 1\nColumn \'dbo.Products.Name\' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.' },
      { type: 'p', text: 'There are two fixes, depending on the question. If you want one result per category, that is **GROUP BY**, the next lesson. If you want the name of the dearest product, find the maximum first and then the row that has it, which is a **subquery**, two lessons on.' },
      { type: 'quiz', question: 'Customers has 8 rows, and Email is NULL in 2 of them. What does `SELECT COUNT(Email) FROM dbo.Customers` return?', options: ['8', '6', '2', 'NULL'], answer: 1, explain: 'COUNT(column) counts only the rows where the column is not NULL: 8 − 2 = 6. COUNT(*) would return 8.' },
      { type: 'quiz', question: 'A column Score is `int`, with the values 1, 2 and 2. What does `AVG(Score)` return?', options: ['1.67', '1', '2', '1.666667'], answer: 1, explain: 'AVG of an int returns an int, and the fraction is cut off, not rounded: 5 ÷ 3 = 1. Use AVG(Score * 1.0) for 1.666666.' },
      { type: 'exercise', task: 'For order 4, show in one row: the number of lines, the total number of items (sum of Quantity), the order value (sum of Quantity × UnitPrice), and the product names as a comma-separated list in alphabetical order.', hint: 'Join OrderItems to Products, filter on OrderId = 4, and use COUNT(*), SUM(…) and STRING_AGG(…) WITHIN GROUP (ORDER BY …).', solution: sql`
SELECT COUNT(*)                        AS Lines,
       SUM(oi.Quantity)                AS Items,
       SUM(oi.Quantity * oi.UnitPrice) AS OrderValue,
       STRING_AGG(p.Name, N', ') WITHIN GROUP (ORDER BY p.Name) AS Products
FROM dbo.OrderItems AS oi
JOIN dbo.Products AS p ON p.ProductId = oi.ProductId
WHERE oi.OrderId = 4;`, output: 'Lines  Items  OrderValue  Products\n-----  -----  ----------  -------------------------------------\n    2     46      524.00  Plywood sheet 18 mm, Timber 2x4 2.4 m' }
    ],
    keyPoints: [
      'An aggregate turns many rows into one value: COUNT, SUM, AVG, MIN, MAX.',
      'COUNT(*) counts rows; COUNT(col) skips NULLs; COUNT(DISTINCT col) counts different values.',
      'SUM, AVG, MIN and MAX ignore NULLs, which changes what AVG means.',
      'AVG of an integer column returns an integer: convert to decimal first.',
      'Over zero rows, COUNT returns 0 and the others return NULL.',
      'STRING_AGG joins values into a list; WITHIN GROUP sets the order.',
      'A plain column cannot sit next to an aggregate without GROUP BY (Msg 8120).'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'group-by-having',
    title: 'GROUP BY and HAVING',
    summary: 'One summary row per group: GROUP BY on columns and expressions, the order in which SQL Server runs a query, WHERE versus HAVING, counting empty groups correctly, and subtotals with ROLLUP.',
    minutes: 17,
    blocks: [
      { type: 'p', text: '`GROUP BY` sorts the rows into **groups** that share the same value, and then the aggregates run once per group. You get one result row per group instead of one for the whole table:' },
      { type: 'code', code: sql`
SELECT CategoryId,
       COUNT(*)   AS Products,
       SUM(Stock) AS Units,
       MAX(Price) AS Dearest
FROM dbo.Products
GROUP BY CategoryId
ORDER BY CategoryId;`, output: 'CategoryId  Products  Units  Dearest\n----------  --------  -----  -------\n         1         3    117    89.00\n         2         2    520     7.20\n         3         2    580    42.00\n         4         2    150    11.90\n         5         2     55    54.00\n         6         1      0     6.80' },
      { type: 'widget', name: 'group-buckets' },
      { type: 'h2', text: 'The rule for the SELECT list' },
      { type: 'p', text: 'After grouping, each result row stands for a whole group. So every column in SELECT must be either **in the GROUP BY** (it has one value per group) or **inside an aggregate** (it is summarised). Anything else is an error:' },
      { type: 'code', code: sql`
SELECT CategoryId, Name, COUNT(*) AS Products
FROM dbo.Products
GROUP BY CategoryId;`, output: 'Msg 8120, Level 16, State 1, Line 1\nColumn \'dbo.Products.Name\' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.' },
      { type: 'p', text: 'To show the category name, join Categories and group by the name as well. Grouping by both CategoryId and Name makes the same groups, since each id has one name:' },
      { type: 'code', code: sql`
SELECT c.CategoryId, c.Name,
       COUNT(*)     AS Products,
       AVG(p.Price) AS AvgPrice
FROM dbo.Products AS p
JOIN dbo.Categories AS c ON c.CategoryId = p.CategoryId
GROUP BY c.CategoryId, c.Name
ORDER BY Products DESC, c.Name;`, output: 'CategoryId  Name      Products   AvgPrice\n----------  --------  --------  ---------\n         1  Tools            3  39.083333\n         2  Building         2   5.650000\n         4  Fixings          2   8.200000\n         5  Paint            2  33.250000\n         3  Timber           2  24.400000\n         6  Safety           1   6.800000' },
      { type: 'h2', text: 'The order SQL Server runs a query in' },
      { type: 'p', text: 'You write SELECT first, but SQL Server works through the clauses in a different order. This **logical order** explains most of the rules in this lesson:' },
      { type: 'table', head: ['Step', 'Clause', 'What it does'], rows: [
        ['1', '`FROM` / `JOIN`', 'collects the rows'],
        ['2', '`WHERE`', 'keeps the rows that pass, one row at a time'],
        ['3', '`GROUP BY`', 'puts the rows into groups'],
        ['4', '`HAVING`', 'keeps the **groups** that pass'],
        ['5', '`SELECT`', 'works out the columns and gives them their aliases'],
        ['6', '`ORDER BY`', 'sorts the result']
      ] },
      { type: 'p', text: 'So WHERE cannot use an aggregate (the groups do not exist yet), and HAVING cannot use a SELECT alias (it has not been given yet). ORDER BY runs last, so it can use either.' },
      { type: 'h2', text: 'WHERE filters rows, HAVING filters groups' },
      { type: 'p', text: 'Which customers have spent more than 100 on shipped orders? The status test is about single rows, so it goes in WHERE. The spending test is about a group total, so it goes in HAVING:' },
      { type: 'code', code: sql`
SELECT o.CustomerId,
       COUNT(DISTINCT o.OrderId)       AS Orders,
       SUM(oi.Quantity * oi.UnitPrice) AS Spent
FROM dbo.Orders AS o
JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
WHERE o.Status = 'Shipped'
GROUP BY o.CustomerId
HAVING SUM(oi.Quantity * oi.UnitPrice) > 100
ORDER BY Spent DESC;`, output: 'CustomerId  Orders   Spent\n----------  ------  ------\n         4       2  723.50\n         6       2  211.85\n         1       2  150.80\n         2       1  113.00' },
      { type: 'p', text: 'Putting the aggregate test in WHERE fails, because WHERE runs before there are any groups to add up:' },
      { type: 'code', code: sql`
SELECT CategoryId, COUNT(*) AS Products
FROM dbo.Products
WHERE COUNT(*) >= 2
GROUP BY CategoryId;`, output: 'Msg 147, Level 15, State 1, Line 3\nAn aggregate may not appear in the WHERE clause unless it is in a subquery contained in a HAVING clause or a select list, and the column being aggregated is an outer reference.' },
      { type: 'p', text: 'And HAVING cannot use the alias from SELECT, so repeat the expression:' },
      { type: 'code', code: sql`
SELECT CategoryId, COUNT(*) AS Products
FROM dbo.Products
GROUP BY CategoryId
HAVING Products >= 2;`, output: 'Msg 207, Level 16, State 1, Line 4\nInvalid column name \'Products\'.' },
      { type: 'note', kind: 'tip', text: 'A test that does not need an aggregate belongs in WHERE, even though HAVING would accept a grouped column. Filtering rows before grouping means less work, and it says what you mean.' },
      { type: 'h2', text: 'Grouping by an expression' },
      { type: 'p', text: 'You can group by anything you can calculate. Orders per month, using the first day of each month as the group:' },
      { type: 'code', code: sql`
SELECT DATEFROMPARTS(YEAR(OrderDate), MONTH(OrderDate), 1) AS Month,
       COUNT(*) AS Orders
FROM dbo.Orders
GROUP BY DATEFROMPARTS(YEAR(OrderDate), MONTH(OrderDate), 1)
ORDER BY Month;`, output: 'Month       Orders\n----------  ------\n2024-02-01       2\n2024-03-01       2\n2024-04-01       2\n2024-05-01       2\n2024-06-01       2' },
      { type: 'p', text: 'January has no orders, so it has no rows to group and does not appear. A group only exists if at least one row falls into it. The recursive CTE lesson shows how to list every month, including the empty ones.' },
      { type: 'h2', text: 'Counting empty groups correctly' },
      { type: 'p', text: 'To include categories with no products you need a LEFT JOIN. But then **which** COUNT you use matters:' },
      { type: 'code', code: sql`
SELECT c.Name,
       COUNT(*)           AS CountStar,
       COUNT(p.ProductId) AS CountProducts
FROM dbo.Categories AS c
LEFT JOIN dbo.Products AS p ON p.CategoryId = c.CategoryId
GROUP BY c.Name
ORDER BY c.Name;`, output: 'Warning: Null value is eliminated by an aggregate or other SET operation.\n\nName      CountStar  CountProducts\n--------  ---------  -------------\nBuilding          2              2\nFixings           2              2\nPaint             2              2\nPlumbing          1              0\nSafety            1              1\nTimber            2              2\nTools             3              3' },
      { type: 'p', text: 'Plumbing has no products, but the LEFT JOIN still gives it one row, with NULLs in every Products column. `COUNT(*)` counts that row and says 1. `COUNT(p.ProductId)` skips the NULL and says 0, which is the right answer.' },
      { type: 'note', kind: 'warn', text: 'After an outer join, count a column from the outer side (ideally its key), never `*`.' },
      { type: 'h2', text: 'Groups of groups' },
      { type: 'p', text: 'GROUP BY with several columns makes one group for each **combination** that occurs. Orders by customer and status:' },
      { type: 'code', code: sql`
SELECT CustomerId, Status, COUNT(*) AS Orders
FROM dbo.Orders
GROUP BY CustomerId, Status
ORDER BY CustomerId, Status;`, output: 'CustomerId  Status     Orders\n----------  ---------  ------\n         1  Shipped         2\n         2  Pending         1\n         2  Shipped         1\n         3  Cancelled       1\n         4  Shipped         2\n         6  Shipped         2\n         8  Pending         1' },
      { type: 'h2', text: 'Subtotals with ROLLUP' },
      { type: 'p', text: '`GROUP BY ROLLUP (a)` adds an extra row with the grand total. In that row the grouped column is NULL, and `GROUPING(a)` returns 1 to tell a total row from a real NULL:' },
      { type: 'code', code: sql`
SELECT CASE WHEN GROUPING(Status) = 1 THEN 'All orders' ELSE Status END AS Status,
       COUNT(*) AS Orders
FROM dbo.Orders
GROUP BY ROLLUP (Status);`, output: 'Status      Orders\n----------  ------\nCancelled        1\nPending          2\nShipped          7\nAll orders      10' },
      { type: 'quiz', question: 'You want categories whose products have an average price above 20. Where does `AVG(Price) > 20` go?', options: ['WHERE', 'HAVING', 'GROUP BY', 'ON'], answer: 1, explain: 'It tests an aggregate over a group, so it must go in HAVING. WHERE runs before grouping and cannot use aggregates.' },
      { type: 'quiz', question: 'After `Categories LEFT JOIN Products`, a category with no products shows 1 in one column and 0 in another. Which expression gave the 0?', options: ['COUNT(*)', 'COUNT(c.CategoryId)', 'COUNT(p.ProductId)', 'COUNT(1)'], answer: 2, explain: 'The unmatched category still has one joined row, with NULL in every Products column. COUNT(p.ProductId) skips that NULL; the others count the row.' },
      { type: 'exercise', task: 'For each product that has been ordered more than once (on more than one order line), show its name, the number of lines, the total quantity sold and the total value (Quantity × UnitPrice). Sort by total value, highest first.', hint: 'Join OrderItems to Products, GROUP BY the product id and name, and use HAVING COUNT(*) > 1.', solution: sql`
SELECT p.Name,
       COUNT(*)                        AS Lines,
       SUM(oi.Quantity)                AS QtySold,
       SUM(oi.Quantity * oi.UnitPrice) AS Value
FROM dbo.OrderItems AS oi
JOIN dbo.Products AS p ON p.ProductId = oi.ProductId
GROUP BY p.ProductId, p.Name
HAVING COUNT(*) > 1
ORDER BY Value DESC;`, output: 'Name                 Lines  QtySold   Value\n-------------------  -----  -------  ------\nTimber 2x4 2.4 m         2       52  353.60\nPlywood sheet 18 mm      2        8  336.00\nCement 25 kg             2       30  212.00\nWood screws (200)        2        7   83.30\nClaw hammer              2        2   37.00\nTape measure 8 m         2        3   29.25' }
    ],
    keyPoints: [
      'GROUP BY makes one result row per group; aggregates run once per group.',
      'Every SELECT column must be grouped or aggregated (Msg 8120).',
      'Logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY.',
      'WHERE filters rows before grouping; HAVING filters groups after.',
      'HAVING cannot use SELECT aliases; ORDER BY can.',
      'After an outer join, count a column from the outer table, not *.',
      'ROLLUP adds total rows; GROUPING() tells them apart.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'subqueries',
    title: 'Subqueries: scalar, list and correlated',
    summary: 'A query inside a query: single-value subqueries in WHERE and SELECT, lists with IN, derived tables in FROM, and correlated subqueries that run once for each outer row.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'A **subquery** is a SELECT in brackets, used inside another statement. SQL Server runs it and uses its result as a value, a list or a table. Which products cost more than the average?' },
      { type: 'code', code: sql`
SELECT Name, Price
FROM dbo.Products
WHERE Price > (SELECT AVG(Price) FROM dbo.Products)
ORDER BY Price DESC;`, output: 'Name                 Price\n-------------------  -----\nCordless drill       89.00\nMasonry paint 10 L   54.00\nPlywood sheet 18 mm  42.00' },
      { type: 'p', text: 'You could not write `WHERE Price > AVG(Price)`: WHERE cannot use aggregates. The subquery works out the average first (22.254166) as a separate query, and the outer query compares each row with that number.' },
      { type: 'table', head: ['Kind', 'Returns', 'Used with'], rows: [
        ['**Scalar**', 'one value (one row, one column)', '`=`, `<`, `>`, in SELECT, anywhere a value fits'],
        ['**List**', 'one column, any number of rows', '`IN`, `NOT IN`'],
        ['**Table** (derived table)', 'rows and columns', '`FROM (…) AS alias`'],
        ['**Correlated**', 'any of the above, once per outer row', 'refers to a column of the outer query']
      ] },
      { type: 'h2', text: 'Scalar subqueries' },
      { type: 'p', text: 'A subquery that returns one value can go wherever a value can, including the SELECT list:' },
      { type: 'code', code: sql`
SELECT Name, Price,
       (SELECT MAX(Price) FROM dbo.Products) AS Dearest,
       CAST(Price * 100 / (SELECT MAX(Price) FROM dbo.Products) AS decimal(5,1)) AS PctOfDearest
FROM dbo.Products
WHERE CategoryId = 1;`, output: 'Name              Price  Dearest  PctOfDearest\n----------------  -----  -------  ------------\nClaw hammer       18.50    89.00          20.8\nCordless drill    89.00    89.00         100.0\nTape measure 8 m   9.75    89.00          11.0' },
      { type: 'p', text: 'This is also the answer to the last lesson’s puzzle, “which product is the dearest?”: find the maximum, then the row that has it.' },
      { type: 'code', code: sql`
SELECT Name, Price
FROM dbo.Products
WHERE Price = (SELECT MAX(Price) FROM dbo.Products);`, output: 'Name            Price\n--------------  -----\nCordless drill  89.00' },
      { type: 'p', text: 'If a subquery used with `=` returns more than one row, the statement fails when it runs:' },
      { type: 'code', code: sql`
SELECT Name
FROM dbo.Products
WHERE CategoryId = (SELECT CategoryId FROM dbo.Categories WHERE Name LIKE N'T%');`, output: 'Msg 512, Level 16, State 1, Line 1\nSubquery returned more than 1 value. This is not permitted when the subquery follows =, !=, <, <= , >, >= or when the subquery is used as an expression.' },
      { type: 'p', text: '“Tools” and “Timber” both start with T. A scalar subquery that returns no rows is not an error: it gives NULL, and a comparison with NULL is never true, so the outer query quietly returns nothing.' },
      { type: 'h2', text: 'Lists with IN' },
      { type: 'p', text: 'A subquery that returns one column of many rows can feed `IN`. Which customers have bought a Tools product?' },
      { type: 'code', code: sql`
SELECT FirstName, LastName
FROM dbo.Customers
WHERE CustomerId IN (
    SELECT o.CustomerId
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    JOIN dbo.Products   AS p  ON p.ProductId = oi.ProductId
    WHERE p.CategoryId = 1
)
ORDER BY FirstName;`, output: 'FirstName  LastName\n---------  --------\nAsha       Patel\nFarid      Khan\nZoë        Müller' },
      { type: 'p', text: 'Asha bought three tools, but she appears once. IN only asks “is this value in the list?”, so duplicates in the list do not repeat rows. A join to the same tables would have returned Asha three times.' },
      { type: 'h2', text: 'Derived tables: a subquery in FROM' },
      { type: 'p', text: 'A subquery in FROM is treated as a table for the rest of the query. It must have an alias, and every column must have a name. This finds the average order value, which needs two levels of aggregation: first the total of each order, then the average of those totals:' },
      { type: 'code', code: sql`
SELECT COUNT(*)             AS Orders,
       AVG(t.OrderTotal)    AS AvgOrderValue,
       MAX(t.OrderTotal)    AS BiggestOrder
FROM (
    SELECT OrderId, SUM(Quantity * UnitPrice) AS OrderTotal
    FROM dbo.OrderItems
    GROUP BY OrderId
) AS t;`, output: 'Orders  AvgOrderValue  BiggestOrder\n------  -------------  ------------\n    10     133.325000        524.00' },
      { type: 'p', text: 'Leave out the column name and SQL Server stops you:' },
      { type: 'code', code: sql`
SELECT AVG(t.OrderTotal)
FROM (
    SELECT OrderId, SUM(Quantity * UnitPrice)
    FROM dbo.OrderItems
    GROUP BY OrderId
) AS t;`, output: 'Msg 8155, Level 16, State 2, Line 6\nNo column name was specified for column 2 of \'t\'.\n\nMsg 207, Level 16, State 1, Line 1\nInvalid column name \'OrderTotal\'.' },
      { type: 'h2', text: 'Correlated subqueries' },
      { type: 'p', text: 'The subqueries so far could run on their own. A **correlated** subquery refers to a column of the outer query, so it has a different answer for each outer row. Conceptually it runs once per row. Which products cost more than the average **of their own category**?' },
      { type: 'code', code: sql`
SELECT p.Name, p.CategoryId, p.Price
FROM dbo.Products AS p
WHERE p.Price > (
    SELECT AVG(p2.Price)
    FROM dbo.Products AS p2
    WHERE p2.CategoryId = p.CategoryId
)
ORDER BY p.CategoryId;`, output: 'Name                 CategoryId  Price\n-------------------  ----------  -----\nCordless drill                1  89.00\nCement 25 kg                  2   7.20\nPlywood sheet 18 mm           3  42.00\nWood screws (200)             4  11.90\nMasonry paint 10 L            5  54.00' },
      { type: 'widget', name: 'correlated' },
      { type: 'p', text: 'The two aliases are essential. `p` is the product being tested and `p2` ranges over the products in its category. Without them, `CategoryId = CategoryId` would compare p2 with itself and always be true.' },
      { type: 'p', text: 'A correlated subquery in SELECT adds a calculated value for each row, here each customer’s number of orders and latest order date:' },
      { type: 'code', code: sql`
SELECT c.FirstName,
       (SELECT COUNT(*)       FROM dbo.Orders AS o WHERE o.CustomerId = c.CustomerId) AS Orders,
       (SELECT MAX(OrderDate) FROM dbo.Orders AS o WHERE o.CustomerId = c.CustomerId) AS LastOrder
FROM dbo.Customers AS c
ORDER BY c.CustomerId;`, output: 'FirstName  Orders  LastOrder\n---------  ------  ----------\nAsha            2  2024-03-01\nBen             2  2024-06-01\nChloe           1  2024-04-20\nDev             2  2024-05-05\nElla            0  NULL\nFarid           2  2024-06-12\nGrace           0  NULL\nZoë             1  2024-05-18' },
      { type: 'p', text: 'Customers with no orders get 0 and NULL, with no LEFT JOIN needed: the subquery simply finds no rows for them.' },
      { type: 'note', kind: 'info', text: '“Runs once per row” is how to **think** about a correlated subquery, not how it is executed. The query optimiser usually rewrites it as a join, so it is often as fast as the join you would write by hand. Check the execution plan rather than avoiding them on principle.' },
      { type: 'quiz', question: 'What happens when a subquery compared with `=` returns three rows?', options: ['The first row is used', 'The comparison is NULL', 'Msg 512: Subquery returned more than 1 value', 'The outer row is repeated three times'], answer: 2, explain: 'With =, <, > and the like, the subquery must return at most one value. SQL Server raises error 512 at run time. Use IN for a list.' },
      { type: 'quiz', question: 'What makes a subquery correlated?', options: ['It is in the SELECT list', 'It uses an aggregate', 'It refers to a column of the outer query', 'It has an alias'], answer: 2, explain: 'A correlated subquery uses a value from the current outer row (such as p.CategoryId), so its result changes from row to row. Position and aggregates do not matter.' },
      { type: 'exercise', task: 'List the orders whose total value is above the average order value, with the order id and its total. Use a derived table for the order totals and a scalar subquery for the average.', hint: 'Group OrderItems by OrderId inside FROM (…) AS t. In WHERE, compare t.OrderTotal with (SELECT AVG(…) FROM (…) AS x), which needs the totals a second time.', solution: sql`
SELECT t.OrderId, t.OrderTotal
FROM (
    SELECT OrderId, SUM(Quantity * UnitPrice) AS OrderTotal
    FROM dbo.OrderItems
    GROUP BY OrderId
) AS t
WHERE t.OrderTotal > (
    SELECT AVG(x.OrderTotal)
    FROM (
        SELECT SUM(Quantity * UnitPrice) AS OrderTotal
        FROM dbo.OrderItems
        GROUP BY OrderId
    ) AS x
)
ORDER BY t.OrderTotal DESC;`, output: 'OrderId  OrderTotal\n-------  ----------\n      4      524.00\n      7      199.50' }
    ],
    keyPoints: [
      'A scalar subquery returns one value and fits anywhere a value does.',
      'With =, more than one row is error 512; no rows gives NULL.',
      'IN (subquery) tests membership and never duplicates outer rows.',
      'A derived table needs an alias and a name for every column.',
      'A correlated subquery refers to the outer row and is evaluated per row (logically).',
      'Aliases keep the inner and outer copies of a table apart.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'exists',
    title: 'EXISTS and NOT EXISTS',
    summary: 'Ask “is there at least one matching row?”: EXISTS and NOT EXISTS, how they compare with IN and joins, and the NULL trap that makes NOT IN return nothing at all.',
    minutes: 14,
    blocks: [
      { type: 'p', text: '`EXISTS (subquery)` is true if the subquery returns **at least one row**, and false if it returns none. It does not care what the rows contain. Which customers have placed an order?' },
      { type: 'code', code: sql`
SELECT c.CustomerId, c.FirstName
FROM dbo.Customers AS c
WHERE EXISTS (
    SELECT 1
    FROM dbo.Orders AS o
    WHERE o.CustomerId = c.CustomerId
)
ORDER BY c.CustomerId;`, output: 'CustomerId  FirstName\n----------  ---------\n         1  Asha\n         2  Ben\n         3  Chloe\n         4  Dev\n         6  Farid\n         8  Zoë' },
      { type: 'ul', items: [
        'The subquery is correlated: `o.CustomerId = c.CustomerId` ties it to the customer being tested.',
        '`SELECT 1` is a convention. The select list of an EXISTS subquery is never used, so `SELECT *` or `SELECT 1` behave the same.',
        'SQL Server can stop looking as soon as it finds the first matching row. Asha has two orders, but one is enough.'
      ] },
      { type: 'widget', name: 'exists-probe' },
      { type: 'h2', text: 'NOT EXISTS: rows with no match' },
      { type: 'p', text: '`NOT EXISTS` keeps the rows for which the subquery finds nothing. Customers who have never ordered:' },
      { type: 'code', code: sql`
SELECT c.CustomerId, c.FirstName, c.JoinedOn
FROM dbo.Customers AS c
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Orders AS o WHERE o.CustomerId = c.CustomerId
);`, output: 'CustomerId  FirstName  JoinedOn\n----------  ---------  ----------\n         5  Ella       2023-09-14\n         7  Grace      2024-01-08' },
      { type: 'p', text: 'This is called an **anti-join**. It gives the same answer as the LEFT JOIN … WHERE key IS NULL pattern from the outer joins lesson, and says what you mean more directly.' },
      { type: 'h2', text: 'Conditions inside the subquery' },
      { type: 'p', text: 'The subquery can be as detailed as you need. Customers who have a shipped order containing Timber:' },
      { type: 'code', code: sql`
SELECT c.FirstName, c.City
FROM dbo.Customers AS c
WHERE EXISTS (
    SELECT 1
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId  = o.OrderId
    JOIN dbo.Products   AS p  ON p.ProductId = oi.ProductId
    WHERE o.CustomerId = c.CustomerId
      AND o.Status     = 'Shipped'
      AND p.CategoryId = 3
);`, output: 'FirstName  City\n---------  --------\nDev        Bradford\nFarid      York' },
      { type: 'p', text: 'And EXISTS and NOT EXISTS combine with AND and OR like any other test. Customers who have ordered, but have nothing pending:' },
      { type: 'code', code: sql`
SELECT c.FirstName
FROM dbo.Customers AS c
WHERE EXISTS     (SELECT 1 FROM dbo.Orders AS o WHERE o.CustomerId = c.CustomerId)
  AND NOT EXISTS (SELECT 1 FROM dbo.Orders AS o WHERE o.CustomerId = c.CustomerId AND o.Status = 'Pending')
ORDER BY c.FirstName;`, output: 'FirstName\n---------\nAsha\nChloe\nDev\nFarid' },
      { type: 'h2', text: 'EXISTS or a join?' },
      { type: 'p', text: 'A join returns one row for every match, so a customer with two matching orders appears twice. EXISTS (a **semi-join**) returns each outer row at most once:' },
      { type: 'code', code: sql`
SELECT c.FirstName
FROM dbo.Customers AS c
JOIN dbo.Orders AS o ON o.CustomerId = c.CustomerId
WHERE o.Status = 'Shipped'
ORDER BY c.FirstName;

SELECT c.FirstName
FROM dbo.Customers AS c
WHERE EXISTS (SELECT 1 FROM dbo.Orders AS o
              WHERE o.CustomerId = c.CustomerId AND o.Status = 'Shipped')
ORDER BY c.FirstName;`, output: 'FirstName\n---------\nAsha\nAsha\nBen\nDev\nDev\nFarid\nFarid\n\nFirstName\n---------\nAsha\nBen\nDev\nFarid' },
      { type: 'p', text: 'Adding DISTINCT to the join would hide the duplicates, but it does extra work to remove rows that EXISTS never makes. Use a join when you need columns from the other table; use EXISTS when you only need to know whether a match exists.' },
      { type: 'h2', text: 'The NOT IN trap' },
      { type: 'p', text: '`NOT IN (subquery)` looks like it should do the same as NOT EXISTS, and with BuildMart’s data it does. Which categories have no products?' },
      { type: 'code', code: sql`
SELECT Name
FROM dbo.Categories
WHERE CategoryId NOT IN (SELECT CategoryId FROM dbo.Products);`, output: 'Name\n--------\nPlumbing' },
      { type: 'p', text: 'Now add a product with no category (a gift voucher, CategoryId NULL) and run the same query again:' },
      { type: 'code', code: sql`
INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (N'Gift voucher', NULL, 25.00, 100, N'each', '2024-07-01');

SELECT Name
FROM dbo.Categories
WHERE CategoryId NOT IN (SELECT CategoryId FROM dbo.Products);`, output: 'Name\n----' },
      { type: 'p', text: 'Nothing at all. `7 NOT IN (1, 2, 3, 4, 5, 6, NULL)` means `7 <> 1 AND 7 <> 2 AND … AND 7 <> NULL`. The last test is unknown, and an AND with an unknown part is never true. One NULL in the list makes NOT IN fail for **every** row.' },
      { type: 'code', code: sql`
INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (N'Gift voucher', NULL, 25.00, 100, N'each', '2024-07-01');

SELECT c.Name
FROM dbo.Categories AS c
WHERE NOT EXISTS (SELECT 1 FROM dbo.Products AS p WHERE p.CategoryId = c.CategoryId);`, output: 'Name\n--------\nPlumbing' },
      { type: 'p', text: 'NOT EXISTS only asks whether a matching row exists. The voucher’s NULL matches no category, so it simply does not count.' },
      { type: 'note', kind: 'warn', text: 'Prefer NOT EXISTS to NOT IN with a subquery. If you do use NOT IN, add `WHERE col IS NOT NULL` inside the subquery. IN (without NOT) is safe: a NULL in the list just never matches.' },
      { type: 'quiz', question: 'The list returned by a subquery is (1, 2, NULL). Which outer value makes `x NOT IN (subquery)` true?', options: ['1', '3', 'NULL', 'None of them'], answer: 3, explain: 'x NOT IN (1, 2, NULL) includes the test x <> NULL, which is unknown, so the whole condition is never true. No row passes.' },
      { type: 'quiz', question: 'Why is `SELECT 1` used inside EXISTS?', options: ['It makes the query faster', 'EXISTS needs a number', 'The select list is ignored, so 1 is just a short placeholder', 'It limits the subquery to one row'], answer: 2, explain: 'EXISTS only checks whether any row is returned. The select list is never evaluated, so SELECT 1, SELECT * and SELECT NULL all behave the same.' },
      { type: 'exercise', task: 'List the products (name and stock) that have never been sold on a shipped order. Use NOT EXISTS.', hint: 'Inside NOT EXISTS, join OrderItems to Orders and match oi.ProductId = p.ProductId AND o.Status = \'Shipped\'.', solution: sql`
SELECT p.Name, p.Stock
FROM dbo.Products AS p
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.OrderItems AS oi
    JOIN dbo.Orders AS o ON o.OrderId = oi.OrderId
    WHERE oi.ProductId = p.ProductId
      AND o.Status = 'Shipped'
)
ORDER BY p.Name;`, output: 'Name              Stock\n----------------  -----\nSafety goggles        0\nWall plugs (100)      0' }
    ],
    keyPoints: [
      'EXISTS is true if the subquery returns at least one row; its select list is ignored.',
      'NOT EXISTS finds rows with no match (an anti-join).',
      'EXISTS returns each outer row once; a join repeats it for every match.',
      'One NULL in a NOT IN list makes it return no rows at all.',
      'Prefer NOT EXISTS, or filter NULLs out of the NOT IN subquery.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'ctes',
    title: 'Common table expressions (WITH)',
    summary: 'Name a query and use it like a table: WITH syntax, chaining several CTEs step by step, using one CTE twice, the semicolon rule, scope, and how CTEs compare with derived tables, temp tables and views.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A **common table expression** (CTE) gives a query a name, at the top of a statement, so the main query can use it like a table. It is a derived table moved to the front, where it is easier to read:' },
      { type: 'code', code: sql`
WITH OrderTotals AS (
    SELECT OrderId, SUM(Quantity * UnitPrice) AS Total
    FROM dbo.OrderItems
    GROUP BY OrderId
)
SELECT o.OrderId, c.FirstName, t.Total
FROM OrderTotals AS t
JOIN dbo.Orders    AS o ON o.OrderId    = t.OrderId
JOIN dbo.Customers AS c ON c.CustomerId = o.CustomerId
WHERE t.Total > 100
ORDER BY t.Total DESC;`, output: 'OrderId  FirstName   Total\n-------  ---------  ------\n      4  Dev        524.00\n      7  Dev        199.50\n      5  Farid      120.50\n      2  Ben        113.00\n      3  Asha       112.80\n      8  Zoë        102.50' },
      { type: 'p', text: 'Read it top to bottom: first work out each order’s total, then use those totals. With a derived table, the first step would be buried in the middle of the FROM clause.' },
      { type: 'h2', text: 'Several CTEs, one step at a time' },
      { type: 'p', text: 'Separate several CTEs with commas. Each one can use the ones above it, so a complicated question becomes a series of small, named steps:' },
      { type: 'code', code: sql`
WITH OrderTotals AS (
    SELECT OrderId, SUM(Quantity * UnitPrice) AS Total
    FROM dbo.OrderItems
    GROUP BY OrderId
),
CustomerTotals AS (
    SELECT o.CustomerId, COUNT(*) AS Orders, SUM(t.Total) AS Spent
    FROM OrderTotals AS t
    JOIN dbo.Orders AS o ON o.OrderId = t.OrderId
    WHERE o.Status <> 'Cancelled'
    GROUP BY o.CustomerId
),
Average AS (
    SELECT AVG(Spent) AS AvgSpent FROM CustomerTotals
)
SELECT c.FirstName, ct.Orders, ct.Spent, a.AvgSpent
FROM CustomerTotals AS ct
JOIN dbo.Customers AS c ON c.CustomerId = ct.CustomerId
CROSS JOIN Average AS a
WHERE ct.Spent > a.AvgSpent
ORDER BY ct.Spent DESC;`, output: 'FirstName  Orders   Spent    AvgSpent\n---------  ------  ------  ----------\nDev             2  723.50  263.930000' },
      { type: 'widget', name: 'cte-chain' },
      { type: 'note', kind: 'tip', text: 'To debug a chain of CTEs, change the final SELECT to `SELECT * FROM CustomerTotals` (or any step) and run it. Each step can be checked on its own.' },
      { type: 'h2', text: 'Naming the columns' },
      { type: 'p', text: 'You can name a CTE’s columns in brackets after its name instead of with aliases inside. Every column needs a name one way or the other:' },
      { type: 'code', code: sql`
WITH MonthlyOrders (Month, Orders) AS (
    SELECT DATEFROMPARTS(YEAR(OrderDate), MONTH(OrderDate), 1), COUNT(*)
    FROM dbo.Orders
    GROUP BY DATEFROMPARTS(YEAR(OrderDate), MONTH(OrderDate), 1)
)
SELECT Month, Orders
FROM MonthlyOrders
WHERE Orders >= 2
ORDER BY Month;`, output: 'Month       Orders\n----------  ------\n2024-02-01       2\n2024-03-01       2\n2024-04-01       2\n2024-05-01       2\n2024-06-01       2' },
      { type: 'h2', text: 'Using a CTE twice' },
      { type: 'p', text: 'A CTE can be referenced more than once in the main query, which a derived table cannot without being written out again. Comparing each month with the month before means joining the monthly figures to themselves:' },
      { type: 'code', code: sql`
WITH Monthly AS (
    SELECT MONTH(o.OrderDate) AS M, SUM(oi.Quantity * oi.UnitPrice) AS Revenue
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    GROUP BY MONTH(o.OrderDate)
)
SELECT cur.M AS Month, cur.Revenue, prev.Revenue AS PrevMonth,
       cur.Revenue - prev.Revenue AS Change
FROM Monthly AS cur
LEFT JOIN Monthly AS prev ON prev.M = cur.M - 1
ORDER BY cur.M;`, output: 'Month  Revenue  PrevMonth   Change\n-----  -------  ---------  -------\n    2   151.00       NULL     NULL\n    3   636.80     151.00   485.80\n    4   134.10     636.80  -502.70\n    5   302.00     134.10   167.90\n    6   109.35     302.00  -192.65' },
      { type: 'note', kind: 'info', text: 'A CTE is not stored. It is expanded into the query wherever it is used, much like a view, so a CTE used twice is usually worked out twice. If a step is expensive and used often, a temporary table may be faster.' },
      { type: 'h2', text: 'The semicolon rule' },
      { type: 'p', text: '`WITH` has other meanings in T-SQL (such as table hints), so the statement **before** a CTE must end with a semicolon:' },
      { type: 'code', code: sql`
SELECT COUNT(*) AS Orders FROM dbo.Orders
WITH Recent AS (SELECT * FROM dbo.Orders WHERE OrderDate >= '2024-06-01')
SELECT OrderId FROM Recent;`, output: 'Msg 336, Level 15, State 1, Line 2\nIncorrect syntax near \'Recent\'. If this is intended to be a common table expression, you need to explicitly terminate the previous statement with a semi-colon.' },
      { type: 'p', text: 'That is why you often see CTEs written as `;WITH`. Ending every statement with a semicolon, as this course does, avoids the problem.' },
      { type: 'h2', text: 'A CTE lives for one statement' },
      { type: 'p', text: 'A CTE exists only for the single statement that follows it. The next statement cannot see it:' },
      { type: 'code', code: sql`
WITH Pending AS (SELECT OrderId FROM dbo.Orders WHERE Status = 'Pending')
SELECT COUNT(*) AS PendingOrders FROM Pending;

SELECT * FROM Pending;`, output: 'PendingOrders\n-------------\n            2\n\nMsg 208, Level 16, State 1, Line 4\nInvalid object name \'Pending\'.' },
      { type: 'h2', text: 'Changing data through a CTE' },
      { type: 'p', text: 'The statement after a CTE can be an UPDATE or DELETE, which changes the underlying table. This is a clear way to say “find these rows, then change them”:' },
      { type: 'code', code: sql`
WITH OutOfStock AS (
    SELECT ProductId, Name, Stock
    FROM dbo.Products
    WHERE Stock = 0
)
UPDATE OutOfStock SET Stock = 25;

SELECT Name, Stock FROM dbo.Products WHERE ProductId IN (9, 12);`, output: 'Name              Stock\n----------------  -----\nWall plugs (100)     25\nSafety goggles       25' },
      { type: 'h2', text: 'CTE, derived table, temp table or view?' },
      { type: 'table', head: ['', 'Lives for', 'Reusable', 'Use it for'], rows: [
        ['**Derived table**', 'one query', 'no', 'a small one-off step inside FROM'],
        ['**CTE**', 'one statement', 'within that statement', 'readable step-by-step queries, recursion'],
        ['**Temp table** `#t`', 'the session', 'by later statements', 'a result that is expensive or needed many times; it can be indexed'],
        ['**View**', 'until dropped', 'by anyone', 'a query the whole team uses (the Views module)']
      ] },
      { type: 'quiz', question: 'A batch has two statements after a CTE definition. Which of them can use the CTE?', options: ['Both', 'Only the first', 'Only the second', 'Neither'], answer: 1, explain: 'A CTE belongs to the single statement that immediately follows it. Use a temp table if several statements need the same result.' },
      { type: 'quiz', question: '`SELECT 1 AS x` is followed on the next line by `WITH t AS (…) SELECT …`, and the batch fails. Why?', options: ['A batch can only have one statement', 'The statement before WITH must end with a semicolon', 'CTEs cannot follow SELECT', 'The CTE needs a column list'], answer: 1, explain: 'WITH is ambiguous in T-SQL, so the previous statement must be terminated with a semicolon. Error 336 says so.' },
      { type: 'exercise', task: 'Using two CTEs, list each category name with its share of total revenue as a percentage (one decimal place). The first CTE should total revenue per category; the second the grand total. Include only categories that have sales, highest share first.', hint: 'CategoryRevenue: join OrderItems to Products, GROUP BY CategoryId. Total: SELECT SUM(Revenue) FROM CategoryRevenue. Then join Categories and CROSS JOIN Total.', solution: sql`
WITH CategoryRevenue AS (
    SELECT p.CategoryId, SUM(oi.Quantity * oi.UnitPrice) AS Revenue
    FROM dbo.OrderItems AS oi
    JOIN dbo.Products AS p ON p.ProductId = oi.ProductId
    GROUP BY p.CategoryId
),
Total AS (
    SELECT SUM(Revenue) AS AllRevenue FROM CategoryRevenue
)
SELECT c.Name, cr.Revenue,
       CAST(cr.Revenue * 100 / t.AllRevenue AS decimal(4,1)) AS PctOfRevenue
FROM CategoryRevenue AS cr
JOIN dbo.Categories AS c ON c.CategoryId = cr.CategoryId
CROSS JOIN Total AS t
ORDER BY cr.Revenue DESC;`, output: 'Name      Revenue  PctOfRevenue\n--------  -------  ------------\nTimber     689.60          51.7\nBuilding   253.00          19.0\nTools      155.25          11.6\nPaint      120.50           9.0\nFixings    101.30           7.6\nSafety      13.60           1.0' }
    ],
    keyPoints: [
      'WITH name AS (query) names a query for the statement that follows.',
      'Chain CTEs with commas; each can use the ones above it.',
      'A CTE can be referenced several times in its statement.',
      'The statement before WITH must end with a semicolon.',
      'A CTE lasts for one statement and is not stored; use a temp table for reuse.',
      'UPDATE and DELETE can target a CTE to change the underlying table.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'recursive-ctes',
    title: 'Recursive CTEs: hierarchies and bills of materials',
    summary: 'A CTE that refers to itself: the anchor and recursive members, generating numbers and dates, walking down and up a management hierarchy, exploding a bill of materials, and MAXRECURSION.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'A **recursive CTE** refers to its own name. It has two parts joined by `UNION ALL`: an **anchor** query that produces the starting rows, and a **recursive** query that produces new rows from the rows of the previous step. It repeats until a step produces no rows.' },
      { type: 'code', code: sql`
WITH Numbers AS (
    SELECT 1 AS n            -- anchor: the first row
    UNION ALL
    SELECT n + 1             -- recursive: one new row from the last one
    FROM Numbers
    WHERE n < 5              -- stops when this is false
)
SELECT n FROM Numbers;`, output: 'n\n-\n1\n2\n3\n4\n5' },
      { type: 'table', head: ['Step', 'Input rows', 'Output rows'], rows: [
        ['anchor', '(none)', 'n = 1'],
        ['1', 'n = 1', 'n = 2'],
        ['2', 'n = 2', 'n = 3'],
        ['3', 'n = 3', 'n = 4'],
        ['4', 'n = 4', 'n = 5'],
        ['5', 'n = 5', 'none, because 5 < 5 is false: stop']
      ] },
      { type: 'p', text: 'Each step only sees the rows the **previous** step produced, not the whole result so far. The final result is all the steps stacked together.' },
      { type: 'h2', text: 'Filling in missing months' },
      { type: 'p', text: 'The GROUP BY lesson showed that January has no orders and so no row. Generate every month of the half-year first, then LEFT JOIN the orders to it:' },
      { type: 'code', code: sql`
WITH Months AS (
    SELECT CAST('2024-01-01' AS date) AS MonthStart
    UNION ALL
    SELECT DATEADD(month, 1, MonthStart)
    FROM Months
    WHERE MonthStart < '2024-06-01'
)
SELECT m.MonthStart, COUNT(o.OrderId) AS Orders
FROM Months AS m
LEFT JOIN dbo.Orders AS o
    ON o.OrderDate >= m.MonthStart
   AND o.OrderDate <  DATEADD(month, 1, m.MonthStart)
GROUP BY m.MonthStart
ORDER BY m.MonthStart;`, output: 'Warning: Null value is eliminated by an aggregate or other SET operation.\n\nMonthStart  Orders\n----------  ------\n2024-01-01       0\n2024-02-01       2\n2024-03-01       2\n2024-04-01       2\n2024-05-01       2\n2024-06-01       2' },
      { type: 'note', kind: 'warn', text: 'The anchor and recursive parts must produce the same column types. Without the CAST, the anchor would be varchar text and DATEADD would return a datetime, and SQL Server reports error 240, “Types don’t match between the anchor and the recursive part”.' },
      { type: 'h2', text: 'Walking down a hierarchy' },
      { type: 'p', text: 'A table that refers to itself, such as staff with a ManagerId, holds a tree. A plain self join finds one level; a recursive CTE finds all of them:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Staff (
    StaffId   int          NOT NULL PRIMARY KEY,
    Name      nvarchar(40) NOT NULL,
    JobTitle  nvarchar(40) NOT NULL,
    ManagerId int          NULL REFERENCES dbo.Staff (StaffId)
);
INSERT INTO dbo.Staff VALUES
    (1, N'Maya',  N'Managing director', NULL),
    (2, N'Omar',  N'Store manager',     1),
    (3, N'Lena',  N'Finance manager',   1),
    (4, N'Tom',   N'Yard supervisor',   2),
    (5, N'Priya', N'Sales lead',        2),
    (6, N'Sam',   N'Forklift driver',   4),
    (7, N'Kofi',  N'Sales assistant',   5),
    (8, N'Ruth',  N'Accounts clerk',    3);` },
      { type: 'p', text: 'Start from the person at the top (no manager) and, at each step, find the people whose manager was found in the step before:' },
      { type: 'code', code: sql`
WITH Org AS (
    SELECT StaffId, Name, JobTitle, 0 AS Lvl,
           CAST(Name AS nvarchar(200)) AS Path
    FROM dbo.Staff
    WHERE ManagerId IS NULL
    UNION ALL
    SELECT s.StaffId, s.Name, s.JobTitle, o.Lvl + 1,
           CAST(o.Path + N' > ' + s.Name AS nvarchar(200))
    FROM dbo.Staff AS s
    JOIN Org AS o ON s.ManagerId = o.StaffId
)
SELECT REPLICATE(N'    ', Lvl) + Name AS Person, JobTitle, Lvl, Path
FROM Org
ORDER BY Path;`, output: 'Person            JobTitle           Lvl  Path\n----------------  -----------------  ---  --------------------------\nMaya              Managing director    0  Maya\n    Lena          Finance manager      1  Maya > Lena\n        Ruth      Accounts clerk       2  Maya > Lena > Ruth\n    Omar          Store manager        1  Maya > Omar\n        Priya     Sales lead           2  Maya > Omar > Priya\n            Kofi  Sales assistant      3  Maya > Omar > Priya > Kofi\n        Tom       Yard supervisor      2  Maya > Omar > Tom\n            Sam   Forklift driver      3  Maya > Omar > Tom > Sam' },
      { type: 'ul', items: [
        '**Lvl** counts the steps from the top: the anchor is 0, and each recursive step adds 1.',
        '**Path** builds the chain of names. Sorting by it puts everyone under their manager, and REPLICATE indents them by level.',
        'The CAST to nvarchar(200) matters: the anchor and recursive parts must have exactly the same type, and Name alone is only nvarchar(40).'
      ] },
      { type: 'h2', text: 'Walking up' },
      { type: 'p', text: 'Turn the join around to go from one person up to the top. Start with Kofi and, at each step, find the manager of the previous row:' },
      { type: 'code', code: sql`
WITH Chain AS (
    SELECT StaffId, Name, ManagerId, 0 AS StepsUp
    FROM dbo.Staff
    WHERE Name = N'Kofi'
    UNION ALL
    SELECT m.StaffId, m.Name, m.ManagerId, c.StepsUp + 1
    FROM dbo.Staff AS m
    JOIN Chain AS c ON m.StaffId = c.ManagerId
)
SELECT StepsUp, Name FROM Chain;`, output: 'StepsUp  Name\n-------  -----\n      0  Kofi\n      1  Priya\n      2  Omar\n      3  Maya' },
      { type: 'h2', text: 'Exploding a bill of materials' },
      { type: 'p', text: 'A **bill of materials** (BOM) says what each thing is made of. BuildMart sells a garden shed kit. The kit is made of panels, and the panels are made of products off the shelf:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Parts (
    PartId    int          NOT NULL PRIMARY KEY,
    Name      nvarchar(40) NOT NULL,
    ProductId int          NULL REFERENCES dbo.Products (ProductId)  -- set for shelf items
);
CREATE TABLE dbo.Bom (
    ParentId int NOT NULL REFERENCES dbo.Parts (PartId),
    ChildId  int NOT NULL REFERENCES dbo.Parts (PartId),
    Qty      int NOT NULL,
    PRIMARY KEY (ParentId, ChildId)
);
INSERT INTO dbo.Parts VALUES
    (1, N'Garden shed kit', NULL), (2, N'Wall panel', NULL),
    (3, N'Roof panel', NULL),      (4, N'Floor', NULL),
    (5, N'Timber 2x4 2.4 m', 6),   (6, N'Plywood sheet 18 mm', 7),
    (7, N'Wood screws (200)', 8);
INSERT INTO dbo.Bom VALUES
    (1, 2, 4), (1, 3, 2), (1, 4, 1), (1, 7, 3),
    (2, 5, 5), (2, 6, 1),
    (3, 5, 3), (3, 6, 1),
    (4, 5, 6), (4, 6, 2);` },
      { type: 'p', text: 'Exploding the kit means following the tree down and **multiplying** the quantities on the way: 4 wall panels each need 5 lengths of timber, so the kit needs 20 for its walls.' },
      { type: 'code', code: sql`
WITH Explode AS (
    SELECT b.ParentId, b.ChildId, b.Qty AS TotalQty, 1 AS Lvl
    FROM dbo.Bom AS b
    WHERE b.ParentId = 1
    UNION ALL
    SELECT b.ParentId, b.ChildId, e.TotalQty * b.Qty, e.Lvl + 1
    FROM dbo.Bom AS b
    JOIN Explode AS e ON b.ParentId = e.ChildId
)
SELECT e.Lvl, par.Name AS PartOf, pt.Name, e.TotalQty
FROM Explode AS e
JOIN dbo.Parts AS pt  ON pt.PartId  = e.ChildId
JOIN dbo.Parts AS par ON par.PartId = e.ParentId
ORDER BY e.Lvl, par.Name, pt.Name;`, output: 'Lvl  PartOf           Name                 TotalQty\n---  ---------------  -------------------  --------\n  1  Garden shed kit  Floor                       1\n  1  Garden shed kit  Roof panel                  2\n  1  Garden shed kit  Wall panel                  4\n  1  Garden shed kit  Wood screws (200)           3\n  2  Floor            Plywood sheet 18 mm         2\n  2  Floor            Timber 2x4 2.4 m            6\n  2  Roof panel       Plywood sheet 18 mm         2\n  2  Roof panel       Timber 2x4 2.4 m            6\n  2  Wall panel       Plywood sheet 18 mm         4\n  2  Wall panel       Timber 2x4 2.4 m           20' },
      { type: 'widget', name: 'bom-explode' },
      { type: 'p', text: 'Timber appears three times, once under each panel. To get a shopping list, keep only the shelf items, add up each one, and price it from Products:' },
      { type: 'code', code: sql`
WITH Explode AS (
    SELECT b.ChildId, b.Qty AS TotalQty
    FROM dbo.Bom AS b
    WHERE b.ParentId = 1
    UNION ALL
    SELECT b.ChildId, e.TotalQty * b.Qty
    FROM dbo.Bom AS b
    JOIN Explode AS e ON b.ParentId = e.ChildId
)
SELECT pr.Name, SUM(e.TotalQty) AS Qty, pr.Price,
       SUM(e.TotalQty) * pr.Price AS Cost
FROM Explode AS e
JOIN dbo.Parts    AS pt ON pt.PartId    = e.ChildId
JOIN dbo.Products AS pr ON pr.ProductId = pt.ProductId
GROUP BY pr.Name, pr.Price
ORDER BY Cost DESC;`, output: 'Name                 Qty  Price    Cost\n-------------------  ---  -----  ------\nPlywood sheet 18 mm    8  42.00  336.00\nTimber 2x4 2.4 m      32   6.80  217.60\nWood screws (200)      3  11.90   35.70' },
      { type: 'p', text: 'The kit takes 32 lengths of timber, 8 plywood sheets and 3 boxes of screws, which cost 589.30 at today’s prices.' },
      { type: 'h2', text: 'MAXRECURSION: the safety net' },
      { type: 'p', text: 'If the recursive part never stops producing rows, the query would run for ever. SQL Server stops it after **100** recursive steps by default:' },
      { type: 'code', code: sql`
WITH Numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM Numbers WHERE n < 200
)
SELECT MAX(n) AS Highest FROM Numbers;`, output: 'Msg 530, Level 16, State 1, Line 1\nThe statement terminated. The maximum recursion 100 has been exhausted before statement completion.' },
      { type: 'p', text: 'When you really need more steps, raise the limit for this query with `OPTION (MAXRECURSION n)`, up to 32767, or 0 for no limit:' },
      { type: 'code', code: sql`
WITH Numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM Numbers WHERE n < 200
)
SELECT MAX(n) AS Highest FROM Numbers
OPTION (MAXRECURSION 200);`, output: 'Highest\n-------\n    200' },
      { type: 'note', kind: 'warn', text: 'Bad data can create a loop: if Sam were made Maya’s manager, walking down the tree would go round for ever. The limit turns that into an error instead of a hung server. Keep it, and do not set 0 unless you are sure the recursion ends.' },
      { type: 'quiz', question: 'In each recursive step, which rows does the recursive part join to?', options: ['All rows produced so far', 'Only the rows produced by the previous step', 'Only the anchor rows', 'The whole underlying table'], answer: 1, explain: 'Each step works on the rows the step before produced. That is why the recursion stops once a step produces nothing new.' },
      { type: 'quiz', question: 'A recursive CTE fails with “Types don’t match between the anchor and the recursive part”. What usually fixes it?', options: ['Use UNION instead of UNION ALL', 'Add OPTION (MAXRECURSION 0)', 'CAST the columns in both parts to the same type and length', 'Add ORDER BY to the anchor'], answer: 2, explain: 'Each column must have exactly the same type in both parts. A growing string or a date built from text is the usual culprit; CAST both sides to, say, nvarchar(200) or date.' },
      { type: 'exercise', task: 'Using the Staff table from this lesson, list everyone who works under Omar, directly or indirectly, with how many levels below him they are. Do not include Omar himself.', hint: 'The anchor selects the people whose ManagerId is Omar’s StaffId (2), at level 1. The recursive part joins Staff to the CTE on s.ManagerId = previous.StaffId.', solution: sql`
WITH UnderOmar AS (
    SELECT StaffId, Name, 1 AS LevelsBelow
    FROM dbo.Staff
    WHERE ManagerId = 2
    UNION ALL
    SELECT s.StaffId, s.Name, u.LevelsBelow + 1
    FROM dbo.Staff AS s
    JOIN UnderOmar AS u ON s.ManagerId = u.StaffId
)
SELECT Name, LevelsBelow
FROM UnderOmar
ORDER BY LevelsBelow, Name;`, output: 'Name   LevelsBelow\n-----  -----------\nPriya            1\nTom              1\nKofi             2\nSam              2' }
    ],
    keyPoints: [
      'A recursive CTE is an anchor query UNION ALL a recursive query that refers to the CTE.',
      'Each step works on the rows produced by the previous step; it stops when a step produces none.',
      'Generate numbers and dates, then LEFT JOIN data to fill in gaps.',
      'Walk down a hierarchy by joining children to the previous level; walk up by joining managers.',
      'A bill of materials multiplies quantities on the way down.',
      'Anchor and recursive columns must have exactly the same types.',
      'MAXRECURSION (default 100) stops runaway recursion; raise it with OPTION (MAXRECURSION n).'
    ]
  }
];
