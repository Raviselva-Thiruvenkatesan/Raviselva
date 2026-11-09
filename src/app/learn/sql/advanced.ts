import { Lesson } from '../learn.types';
import { sql } from './sql';

export const ADVANCED: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'window-ranking',
    title: 'Window functions: ROW_NUMBER, RANK and NTILE',
    summary: 'Number and rank rows without losing them: the OVER clause, ROW_NUMBER, RANK and DENSE_RANK with ties, PARTITION BY for ranking inside groups, the top-N-per-group pattern, removing duplicates, and NTILE for bands.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'GROUP BY answers questions about groups, but it collapses the rows: you get one row per group and the details are gone. A **window function** computes a value over a set of rows (the *window*) and writes it **next to every row**. Nothing is collapsed.' },
      { type: 'p', text: 'You can tell a window function by its `OVER (…)` clause. The simplest one numbers the rows in the order you give:' },
      { type: 'code', code: sql`
SELECT ROW_NUMBER() OVER (ORDER BY Price DESC, ProductId) AS Pos,
       Name, Price
FROM dbo.Products
ORDER BY Pos;`, output: 'Pos  Name                 Price\n---  -------------------  -----\n  1  Cordless drill       89.00\n  2  Masonry paint 10 L   54.00\n  3  Plywood sheet 18 mm  42.00\n  4  Claw hammer          18.50\n  5  Paint roller set     12.50\n  6  Wood screws (200)    11.90\n  7  Tape measure 8 m      9.75\n  8  Cement 25 kg          7.20\n  9  Timber 2x4 2.4 m      6.80\n 10  Safety goggles        6.80\n 11  Wall plugs (100)      4.50\n 12  Sand 25 kg            4.10' },
      { type: 'p', text: 'The `ORDER BY` inside `OVER` says how to number the rows. It is separate from the `ORDER BY` at the end of the query, which only sorts the result. They are often the same, but they do not have to be.' },
      { type: 'h2', text: 'Ties: ROW_NUMBER, RANK and DENSE_RANK' },
      { type: 'p', text: 'Timber 2x4 and Safety goggles both cost 6.80. The three numbering functions treat that tie differently:' },
      { type: 'code', code: sql`
SELECT Name, Price,
       ROW_NUMBER() OVER (ORDER BY Price DESC, ProductId) AS RowNum,
       RANK()       OVER (ORDER BY Price DESC)            AS Rnk,
       DENSE_RANK() OVER (ORDER BY Price DESC)            AS DenseRnk
FROM dbo.Products
ORDER BY Price DESC, ProductId;`, output: 'Name                 Price  RowNum  Rnk  DenseRnk\n-------------------  -----  ------  ---  --------\nCordless drill       89.00       1    1         1\nMasonry paint 10 L   54.00       2    2         2\nPlywood sheet 18 mm  42.00       3    3         3\nClaw hammer          18.50       4    4         4\nPaint roller set     12.50       5    5         5\nWood screws (200)    11.90       6    6         6\nTape measure 8 m      9.75       7    7         7\nCement 25 kg          7.20       8    8         8\nTimber 2x4 2.4 m      6.80       9    9         9\nSafety goggles        6.80      10    9         9\nWall plugs (100)      4.50      11   11        10\nSand 25 kg            4.10      12   12        11' },
      { type: 'table', head: ['Function', 'On a tie', 'After a tie'], rows: [
        ['`ROW_NUMBER()`', 'different numbers (1, 2, 3 …) every row', 'carries on'],
        ['`RANK()`', 'the same number', 'skips: 9, 9, **11**, like a sports table'],
        ['`DENSE_RANK()`', 'the same number', 'no gap: 9, 9, **10**']
      ] },
      { type: 'note', kind: 'warn', text: 'If the ORDER BY in OVER has ties, ROW_NUMBER gives the tied rows their numbers in **no guaranteed order**, and two runs can differ. Add a unique column (here ProductId) as a tiebreaker whenever the exact numbers matter.' },
      { type: 'widget', name: 'rank-ties' },
      { type: 'h2', text: 'PARTITION BY: start again for every group' },
      { type: 'p', text: '`PARTITION BY` splits the rows into groups, like GROUP BY, but **without** collapsing them. The numbering restarts at 1 in each group:' },
      { type: 'code', code: sql`
SELECT c.Name AS Category, p.Name, p.Price,
       ROW_NUMBER() OVER (PARTITION BY p.CategoryId
                          ORDER BY p.Price DESC) AS PosInCategory
FROM dbo.Products AS p
JOIN dbo.Categories AS c ON c.CategoryId = p.CategoryId
WHERE p.CategoryId <= 4
ORDER BY p.CategoryId, PosInCategory;`, output: 'Category  Name                 Price  PosInCategory\n--------  -------------------  -----  -------------\nTools     Cordless drill       89.00              1\nTools     Claw hammer          18.50              2\nTools     Tape measure 8 m      9.75              3\nBuilding  Cement 25 kg          7.20              1\nBuilding  Sand 25 kg            4.10              2\nTimber    Plywood sheet 18 mm  42.00              1\nTimber    Timber 2x4 2.4 m      6.80              2\nFixings   Wood screws (200)    11.90              1\nFixings   Wall plugs (100)      4.50              2' },
      { type: 'h2', text: 'Top N per group' },
      { type: 'p', text: '“The dearest product in each category” is one of the most common questions in SQL. The obvious attempt fails:' },
      { type: 'code', code: sql`
SELECT CategoryId, Name, Price
FROM dbo.Products
WHERE ROW_NUMBER() OVER (PARTITION BY CategoryId ORDER BY Price DESC) = 1;`, output: 'Msg 4108, Level 15, State 1, Line 3\nWindowed functions can only appear in the SELECT or ORDER BY clauses.' },
      { type: 'p', text: 'Window functions are computed in the SELECT step, which runs **after** WHERE (the order you met in the GROUP BY lesson). So WHERE cannot see them. Compute the number in a CTE, and filter in the query that reads it:' },
      { type: 'code', code: sql`
WITH Ranked AS (
    SELECT CategoryId, Name, Price,
           ROW_NUMBER() OVER (PARTITION BY CategoryId ORDER BY Price DESC) AS Pos
    FROM dbo.Products
)
SELECT CategoryId, Name, Price
FROM Ranked
WHERE Pos = 1
ORDER BY CategoryId;`, output: 'CategoryId  Name                 Price\n----------  -------------------  -----\n         1  Cordless drill       89.00\n         2  Cement 25 kg          7.20\n         3  Plywood sheet 18 mm  42.00\n         4  Wood screws (200)    11.90\n         5  Masonry paint 10 L   54.00\n         6  Safety goggles        6.80' },
      { type: 'p', text: 'Change `Pos = 1` to `Pos <= 2` for the top two, and so on. To keep **ties** in a top N, filter on RANK instead of ROW_NUMBER. The nine dearest products by ROW_NUMBER would drop one of the two 6.80 products at random; RANK keeps both:' },
      { type: 'code', code: sql`
WITH Ranked AS (
    SELECT Name, Price, RANK() OVER (ORDER BY Price DESC) AS Rnk
    FROM dbo.Products
)
SELECT Rnk, Name, Price
FROM Ranked
WHERE Rnk <= 9
ORDER BY Rnk, Name;`, output: 'Rnk  Name                 Price\n---  -------------------  -----\n  1  Cordless drill       89.00\n  2  Masonry paint 10 L   54.00\n  3  Plywood sheet 18 mm  42.00\n  4  Claw hammer          18.50\n  5  Paint roller set     12.50\n  6  Wood screws (200)    11.90\n  7  Tape measure 8 m      9.75\n  8  Cement 25 kg          7.20\n  9  Safety goggles        6.80\n  9  Timber 2x4 2.4 m      6.80' },
      { type: 'note', kind: 'tip', text: 'For a top N over the **whole** table, `SELECT TOP (9) WITH TIES … ORDER BY Price DESC` does the same job. The window version is the one that also works per group.' },
      { type: 'h2', text: 'Removing duplicates' },
      { type: 'p', text: 'ROW_NUMBER is also the standard way to delete duplicate rows. Number the rows inside each group of duplicates, keep number 1, and delete the rest. You can DELETE through a CTE that reads a single table:' },
      { type: 'code', code: sql`
CREATE TABLE #Signups (SignupId int, Email nvarchar(100), SignedUp date);
INSERT INTO #Signups VALUES
    (1, N'asha@example.com',  '2024-01-05'),
    (2, N'ben@example.com',   '2024-01-09'),
    (3, N'asha@example.com',  '2024-02-11'),
    (4, N'chloe@example.com', '2024-02-20'),
    (5, N'asha@example.com',  '2024-03-02'),
    (6, N'ben@example.com',   '2024-03-15');

WITH Numbered AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY Email
                                 ORDER BY SignedUp DESC) AS n
    FROM #Signups
)
DELETE FROM Numbered WHERE n > 1;   -- keeps each email's latest signup

SELECT * FROM #Signups ORDER BY SignupId;`, output: 'SignupId  Email              SignedUp\n--------  -----------------  ----------\n       4  chloe@example.com  2024-02-20\n       5  asha@example.com   2024-03-02\n       6  ben@example.com    2024-03-15' },
      { type: 'h2', text: 'NTILE: split into bands' },
      { type: 'p', text: '`NTILE(n)` deals the ordered rows into n groups of (nearly) equal size and returns the group number. 12 products into 4 price bands gives 3 per band:' },
      { type: 'code', code: sql`
SELECT NTILE(4) OVER (ORDER BY Price DESC, ProductId) AS Band,
       Name, Price
FROM dbo.Products
ORDER BY Band, Price DESC;`, output: 'Band  Name                 Price\n----  -------------------  -----\n   1  Cordless drill       89.00\n   1  Masonry paint 10 L   54.00\n   1  Plywood sheet 18 mm  42.00\n   2  Claw hammer          18.50\n   2  Paint roller set     12.50\n   2  Wood screws (200)    11.90\n   3  Tape measure 8 m      9.75\n   3  Cement 25 kg          7.20\n   3  Timber 2x4 2.4 m      6.80\n   4  Safety goggles        6.80\n   4  Wall plugs (100)      4.50\n   4  Sand 25 kg            4.10' },
      { type: 'p', text: 'When the rows do not divide evenly, the **first** groups get one row more. 12 rows into 5 bands is 3 + 3 + 2 + 2 + 2:' },
      { type: 'code', code: sql`
SELECT Band, COUNT(*) AS Products, MIN(Price) AS Lowest, MAX(Price) AS Highest
FROM (
    SELECT NTILE(5) OVER (ORDER BY Price DESC, ProductId) AS Band, Price
    FROM dbo.Products
) AS b
GROUP BY Band
ORDER BY Band;`, output: 'Band  Products  Lowest  Highest\n----  --------  ------  -------\n   1         3   42.00    89.00\n   2         3   11.90    18.50\n   3         2    7.20     9.75\n   4         2    6.80     6.80\n   5         2    4.10     4.50' },
      { type: 'quiz', question: 'Prices in descending order are 10, 8, 8, 5. What are RANK() and DENSE_RANK() for the 5?', options: ['RANK 3, DENSE_RANK 3', 'RANK 4, DENSE_RANK 3', 'RANK 4, DENSE_RANK 4', 'RANK 3, DENSE_RANK 4'], answer: 1, explain: 'RANK skips after a tie (1, 2, 2, 4); DENSE_RANK does not (1, 2, 2, 3).' },
      { type: 'quiz', question: 'Why does `WHERE ROW_NUMBER() OVER (…) = 1` fail?', options: ['ROW_NUMBER needs PARTITION BY', 'Window functions are computed in SELECT, after WHERE has run', 'WHERE cannot compare with numbers', 'It works only in SQL Server 2022'], answer: 1, explain: 'WHERE runs before the SELECT list is computed, so the row number does not exist yet. Compute it in a CTE or derived table and filter outside.' },
      { type: 'exercise', task: 'Show each customer’s most recent order: the customer’s first name, the OrderId and the OrderDate. Only customers who have orders, sorted by first name.', hint: 'In a CTE, number each customer’s orders with ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate DESC), then keep number 1 and join Customers.', solution: sql`
WITH Latest AS (
    SELECT CustomerId, OrderId, OrderDate,
           ROW_NUMBER() OVER (PARTITION BY CustomerId
                              ORDER BY OrderDate DESC) AS n
    FROM dbo.Orders
)
SELECT c.FirstName, l.OrderId, l.OrderDate
FROM Latest AS l
JOIN dbo.Customers AS c ON c.CustomerId = l.CustomerId
WHERE l.n = 1
ORDER BY c.FirstName;`, output: 'FirstName  OrderId  OrderDate\n---------  -------  ----------\nAsha             3  2024-03-01\nBen              9  2024-06-01\nChloe            6  2024-04-20\nDev              7  2024-05-05\nFarid           10  2024-06-12\nZoë              8  2024-05-18' }
    ],
    keyPoints: [
      'A window function computes over a set of rows and keeps every row: you know it by OVER (…).',
      'ROW_NUMBER numbers 1, 2, 3; RANK repeats on ties and skips; DENSE_RANK repeats without gaps.',
      'Add a unique tiebreaker to the ORDER BY in OVER when ROW_NUMBER must be repeatable.',
      'PARTITION BY restarts the window for each group without collapsing rows.',
      'Window functions cannot go in WHERE: compute them in a CTE and filter outside.',
      'Top N per group: ROW_NUMBER (or RANK to keep ties) in a CTE, then WHERE Pos <= N.',
      'Delete duplicates by numbering inside each group and deleting n > 1 through the CTE.',
      'NTILE(n) deals rows into n bands; the first bands get the extra rows.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'window-aggregates',
    title: 'Running totals, moving averages, LAG and LEAD',
    summary: 'Aggregates as window functions: totals and shares beside each row, running totals, the frame (ROWS versus RANGE), moving averages, comparing with the previous or next row using LAG and LEAD, and the LAST_VALUE trap.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'SUM, COUNT, AVG, MIN and MAX can all be used with `OVER`. Then they do not collapse the rows: each row gets the aggregate of its window. With `PARTITION BY`, the window is the row’s group:' },
      { type: 'code', code: sql`
SELECT Name, CategoryId, Stock,
       SUM(Stock) OVER (PARTITION BY CategoryId) AS CategoryStock,
       CAST(100.0 * Stock / SUM(Stock) OVER (PARTITION BY CategoryId)
            AS decimal(5,1)) AS PctOfCategory
FROM dbo.Products
WHERE CategoryId <= 3
ORDER BY CategoryId, ProductId;`, output: 'Name                 CategoryId  Stock  CategoryStock  PctOfCategory\n-------------------  ----------  -----  -------------  -------------\nClaw hammer                   1     40            117           34.2\nCordless drill                1     12            117           10.3\nTape measure 8 m              1     65            117           55.6\nCement 25 kg                  2    300            520           57.7\nSand 25 kg                    2    220            520           42.3\nTimber 2x4 2.4 m              3    500            580           86.2\nPlywood sheet 18 mm           3     80            580           13.8' },
      { type: 'p', text: 'With GROUP BY you would get the totals or the products, not both. Here every product keeps its row and can be compared with its group, so a percentage of the total is one expression.' },
      { type: 'h2', text: 'Running totals' },
      { type: 'p', text: 'The examples below use each order’s total, from a CTE like the one in the CTE lesson (cancelled orders left out). Add `ORDER BY` inside OVER and the window changes: each row sees only the rows **up to itself**. That is a running total:' },
      { type: 'code', code: sql`
WITH t AS (
    SELECT o.OrderId, o.OrderDate, SUM(oi.Quantity * oi.UnitPrice) AS Total
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    WHERE o.Status <> 'Cancelled'
    GROUP BY o.OrderId, o.OrderDate
)
SELECT OrderId, OrderDate, Total,
       SUM(Total) OVER (ORDER BY OrderDate
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS RunningTotal
FROM t
ORDER BY OrderDate;`, output: 'OrderId  OrderDate    Total  RunningTotal\n-------  ----------  ------  ------------\n      1  2024-02-03   38.00         38.00\n      2  2024-02-10  113.00        151.00\n      3  2024-03-01  112.80        263.80\n      4  2024-03-15  524.00        787.80\n      5  2024-04-02  120.50        908.30\n      7  2024-05-05  199.50       1107.80\n      8  2024-05-18  102.50       1210.30\n      9  2024-06-01   18.00       1228.30\n     10  2024-06-12   91.35       1319.65' },
      { type: 'h2', text: 'The frame' },
      { type: 'p', text: 'The part after ORDER BY is the **frame**: which rows of the partition, counted from the current row, go into the aggregate.' },
      { type: 'table', head: ['Frame', 'Rows in the window'], rows: [
        ['`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`', 'from the first row to this one: a running total'],
        ['`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`', 'this row and the two before it: a moving window of 3'],
        ['`ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING`', 'the row before, this row and the row after'],
        ['`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`', 'the whole partition (the same as no ORDER BY)']
      ] },
      { type: 'widget', name: 'window-frame' },
      { type: 'h2', text: 'ROWS versus RANGE: the default frame' },
      { type: 'p', text: 'If you write ORDER BY in OVER and **no** frame, SQL Server uses `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. RANGE counts by **value**, not by position: every row with the same ORDER BY value is “the current row”. With ties, the running total jumps a whole group at a time. Here the orders are numbered by month:' },
      { type: 'code', code: sql`
WITH t AS (
    SELECT o.OrderId, o.OrderDate, SUM(oi.Quantity * oi.UnitPrice) AS Total
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    WHERE o.Status <> 'Cancelled'
    GROUP BY o.OrderId, o.OrderDate
)
SELECT OrderId, MONTH(OrderDate) AS Mon, Total,
       SUM(Total) OVER (ORDER BY MONTH(OrderDate)) AS DefaultRange,
       SUM(Total) OVER (ORDER BY MONTH(OrderDate), OrderId
                        ROWS UNBOUNDED PRECEDING) AS RowsFrame
FROM t
ORDER BY Mon, OrderId;`, output: 'OrderId  Mon   Total  DefaultRange  RowsFrame\n-------  ---  ------  ------------  ---------\n      1    2   38.00        151.00      38.00\n      2    2  113.00        151.00     151.00\n      3    3  112.80        787.80     263.80\n      4    3  524.00        787.80     787.80\n      5    4  120.50        908.30     908.30\n      7    5  199.50       1210.30    1107.80\n      8    5  102.50       1210.30    1210.30\n      9    6   18.00       1319.65    1228.30\n     10    6   91.35       1319.65    1319.65' },
      { type: 'p', text: 'Both orders in February get 151.00 under RANGE, because they share the value 2. ROWS goes one row at a time. `ROWS UNBOUNDED PRECEDING` is short for “… AND CURRENT ROW”.' },
      { type: 'note', kind: 'tip', text: 'Write the frame out with ROWS whenever you mean a running total. It is what you expect, and it is also faster: the RANGE default makes SQL Server keep its window worktable on disk rather than in memory.' },
      { type: 'h2', text: 'Moving averages' },
      { type: 'p', text: 'A moving average smooths out jumps by averaging each value with its neighbours. Here each order is averaged with the two before it. The first two rows have fewer than three rows in their frame, so they average what there is:' },
      { type: 'code', code: sql`
WITH t AS (
    SELECT o.OrderId, o.OrderDate, SUM(oi.Quantity * oi.UnitPrice) AS Total
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    WHERE o.Status <> 'Cancelled'
    GROUP BY o.OrderId, o.OrderDate
)
SELECT OrderId, Total,
       COUNT(*)   OVER (ORDER BY OrderDate ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS InFrame,
       AVG(Total) OVER (ORDER BY OrderDate ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS MovingAvg3
FROM t
ORDER BY OrderDate;`, output: 'OrderId   Total  InFrame  MovingAvg3\n-------  ------  -------  ----------\n      1   38.00        1   38.000000\n      2  113.00        2   75.500000\n      3  112.80        3   87.933333\n      4  524.00        3  249.933333\n      5  120.50        3  252.433333\n      7  199.50        3  281.333333\n      8  102.50        3  140.833333\n      9   18.00        3  106.666666\n     10   91.35        3   70.616666' },
      { type: 'h2', text: 'LAG and LEAD: the row before and the row after' },
      { type: 'p', text: '`LAG(col)` returns the value of col from the **previous** row in the window’s order, and `LEAD(col)` from the **next** one. There is no frame to think about. This compares every order with the one before:' },
      { type: 'code', code: sql`
WITH t AS (
    SELECT o.OrderId, o.OrderDate, SUM(oi.Quantity * oi.UnitPrice) AS Total
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    WHERE o.Status <> 'Cancelled'
    GROUP BY o.OrderId, o.OrderDate
)
SELECT OrderId, OrderDate, Total,
       LAG(Total) OVER (ORDER BY OrderDate)         AS PrevTotal,
       Total - LAG(Total) OVER (ORDER BY OrderDate) AS Change,
       DATEDIFF(day, LAG(OrderDate) OVER (ORDER BY OrderDate), OrderDate) AS DaysSincePrev,
       LEAD(OrderId) OVER (ORDER BY OrderDate)      AS NextOrder
FROM t
ORDER BY OrderDate;`, output: 'OrderId  OrderDate    Total  PrevTotal   Change  DaysSincePrev  NextOrder\n-------  ----------  ------  ---------  -------  -------------  ---------\n      1  2024-02-03   38.00       NULL     NULL           NULL          2\n      2  2024-02-10  113.00      38.00    75.00              7          3\n      3  2024-03-01  112.80     113.00    -0.20             20          4\n      4  2024-03-15  524.00     112.80   411.20             14          5\n      5  2024-04-02  120.50     524.00  -403.50             18          7\n      7  2024-05-05  199.50     120.50    79.00             33          8\n      8  2024-05-18  102.50     199.50   -97.00             13          9\n      9  2024-06-01   18.00     102.50   -84.50             14         10\n     10  2024-06-12   91.35      18.00    73.35             11       NULL' },
      { type: 'p', text: 'The first row has no previous row, so LAG returns NULL; the last has no next row, so LEAD does. Two optional arguments change that: `LAG(col, offset, default)`. `LAG(Total, 1, 0)` looks one row back and gives 0 instead of NULL; `LAG(Total, 3)` looks three rows back.' },
      { type: 'p', text: 'With PARTITION BY, LAG stays inside the group. How long did each repeat customer wait between orders?' },
      { type: 'code', code: sql`
SELECT CustomerId, OrderId, OrderDate,
       LAG(OrderDate) OVER (PARTITION BY CustomerId ORDER BY OrderDate) AS PrevOrder,
       DATEDIFF(day,
                LAG(OrderDate) OVER (PARTITION BY CustomerId ORDER BY OrderDate),
                OrderDate) AS DaysBetween
FROM dbo.Orders
WHERE CustomerId IN (1, 2, 4, 6)
ORDER BY CustomerId, OrderDate;`, output: 'CustomerId  OrderId  OrderDate   PrevOrder   DaysBetween\n----------  -------  ----------  ----------  -----------\n         1        1  2024-02-03  NULL               NULL\n         1        3  2024-03-01  2024-02-03           27\n         2        2  2024-02-10  NULL               NULL\n         2        9  2024-06-01  2024-02-10          112\n         4        4  2024-03-15  NULL               NULL\n         4        7  2024-05-05  2024-03-15           51\n         6        5  2024-04-02  NULL               NULL\n         6       10  2024-06-12  2024-04-02           71' },
      { type: 'h2', text: 'FIRST_VALUE and the LAST_VALUE trap' },
      { type: 'p', text: '`FIRST_VALUE(col)` and `LAST_VALUE(col)` return col from the first and last row of the **frame**. That word matters. With ORDER BY and no frame, the frame ends at the current row, so LAST_VALUE just returns the current row:' },
      { type: 'code', code: sql`
SELECT CategoryId, Name, Price,
       FIRST_VALUE(Name) OVER (PARTITION BY CategoryId ORDER BY Price) AS Cheapest,
       LAST_VALUE(Name)  OVER (PARTITION BY CategoryId ORDER BY Price) AS Dearest_Wrong,
       LAST_VALUE(Name)  OVER (PARTITION BY CategoryId ORDER BY Price
                               ROWS BETWEEN UNBOUNDED PRECEDING
                                        AND UNBOUNDED FOLLOWING)  AS Dearest
FROM dbo.Products
WHERE CategoryId IN (1, 2)
ORDER BY CategoryId, Price;`, output: 'CategoryId  Name              Price  Cheapest          Dearest_Wrong     Dearest\n----------  ----------------  -----  ----------------  ----------------  --------------\n         1  Tape measure 8 m   9.75  Tape measure 8 m  Tape measure 8 m  Cordless drill\n         1  Claw hammer       18.50  Tape measure 8 m  Claw hammer       Cordless drill\n         1  Cordless drill    89.00  Tape measure 8 m  Cordless drill    Cordless drill\n         2  Sand 25 kg         4.10  Sand 25 kg        Sand 25 kg        Cement 25 kg\n         2  Cement 25 kg       7.20  Sand 25 kg        Cement 25 kg      Cement 25 kg' },
      { type: 'note', kind: 'warn', text: 'LAST_VALUE almost always needs `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. An easier route is FIRST_VALUE with the order reversed: `FIRST_VALUE(Name) OVER (PARTITION BY CategoryId ORDER BY Price DESC)`.' },
      { type: 'h2', text: 'Naming a window (SQL Server 2022)' },
      { type: 'p', text: 'When several functions share one window, SQL Server 2022 lets you define it once with a `WINDOW` clause, after HAVING and before ORDER BY. `OVER w` uses it as it is; `OVER (w ROWS …)` adds a frame to it. ROW_NUMBER must use the plain version, because ranking functions do not accept a frame. Here the Tools products are taken in the order they were added:' },
      { type: 'code', code: sql`
SELECT Name, AddedOn, Stock, Price,
       ROW_NUMBER() OVER w                          AS Pos,
       SUM(Stock)   OVER (w ROWS UNBOUNDED PRECEDING) AS StockSoFar,
       MIN(Price)   OVER (w ROWS UNBOUNDED PRECEDING) AS LowestSoFar
FROM dbo.Products
WHERE CategoryId = 1
WINDOW w AS (PARTITION BY CategoryId ORDER BY AddedOn, ProductId)
ORDER BY Pos;`, output: 'Name              AddedOn     Stock  Price  Pos  StockSoFar  LowestSoFar\n----------------  ----------  -----  -----  ---  ----------  -----------\nClaw hammer       2023-01-15     40  18.50    1          40        18.50\nTape measure 8 m  2023-01-15     65   9.75    2         105         9.75\nCordless drill    2023-02-01     12  89.00    3         117         9.75' },
      { type: 'quiz', question: 'A query uses `AVG(x) OVER (ORDER BY d ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`. How many rows are averaged for the very first row?', options: ['3', '1', '0: it returns NULL', '2'], answer: 1, explain: 'There are no rows before the first one, so the frame holds only the current row. The moving average starts with 1 row, then 2, then 3 from the third row on.' },
      { type: 'quiz', question: '`LAST_VALUE(Name) OVER (ORDER BY Price)` returns the current row’s Name on every row. Why?', options: ['LAST_VALUE needs PARTITION BY', 'The default frame ends at the current row', 'ORDER BY Price is ascending', 'LAST_VALUE ignores ORDER BY'], answer: 1, explain: 'With ORDER BY and no frame, the frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, so the last row of the frame is the current row (or its last tie). Add ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING.' },
      { type: 'exercise', task: 'For every order that is not cancelled, show the customer’s first name, the OrderId, the order total and that customer’s running total of spending, in date order. Sort by first name, then date.', hint: 'Start from the order totals CTE with CustomerId added. Then SUM(Total) OVER (PARTITION BY CustomerId ORDER BY OrderDate ROWS UNBOUNDED PRECEDING).', solution: sql`
WITH t AS (
    SELECT o.OrderId, o.CustomerId, o.OrderDate,
           SUM(oi.Quantity * oi.UnitPrice) AS Total
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    WHERE o.Status <> 'Cancelled'
    GROUP BY o.OrderId, o.CustomerId, o.OrderDate
)
SELECT c.FirstName, t.OrderId, t.Total,
       SUM(t.Total) OVER (PARTITION BY t.CustomerId ORDER BY t.OrderDate
                          ROWS UNBOUNDED PRECEDING) AS CustomerRunning
FROM t
JOIN dbo.Customers AS c ON c.CustomerId = t.CustomerId
ORDER BY c.FirstName, t.OrderDate;`, output: 'FirstName  OrderId   Total  CustomerRunning\n---------  -------  ------  ---------------\nAsha             1   38.00            38.00\nAsha             3  112.80           150.80\nBen              2  113.00           113.00\nBen              9   18.00           131.00\nDev              4  524.00           524.00\nDev              7  199.50           723.50\nFarid            5  120.50           120.50\nFarid           10   91.35           211.85\nZoë              8  102.50           102.50' }
    ],
    keyPoints: [
      'SUM, COUNT, AVG, MIN and MAX with OVER keep every row and add the aggregate of its window.',
      'PARTITION BY alone: the whole group. Add ORDER BY: the frame stops at the current row.',
      'The frame (ROWS BETWEEN … AND …) picks which rows around the current one count.',
      'ORDER BY with no frame means RANGE … CURRENT ROW: ties are added together. Write ROWS for running totals.',
      'A moving average is AVG over ROWS BETWEEN n PRECEDING AND CURRENT ROW.',
      'LAG and LEAD read the previous and next row; LAG(col, offset, default) avoids NULLs.',
      'LAST_VALUE needs a frame to UNBOUNDED FOLLOWING, or use FIRST_VALUE with the order reversed.',
      'SQL Server 2022 can name a shared window with the WINDOW clause.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'pivot-unpivot',
    title: 'PIVOT and UNPIVOT',
    summary: 'Turn rows into columns for a cross-tab report and back again: the PIVOT operator and its hidden grouping, conditional aggregation as the flexible alternative, building a dynamic PIVOT safely, and UNPIVOT with its NULL behaviour.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Queries return **long** data: one row per fact. People often want **wide** data, a cross-tab with one row per thing and one column per period. Here is the sales value of each category per month, the long way:' },
      { type: 'code', code: sql`
SELECT c.Name AS Category,
       LEFT(DATENAME(month, o.OrderDate), 3) AS Mon,
       SUM(oi.Quantity * oi.UnitPrice) AS Value
FROM dbo.Orders AS o
JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
JOIN dbo.Products   AS p  ON p.ProductId = oi.ProductId
JOIN dbo.Categories AS c  ON c.CategoryId = p.CategoryId
WHERE o.Status <> 'Cancelled'
GROUP BY c.Name, LEFT(DATENAME(month, o.OrderDate), 3), MONTH(o.OrderDate)
ORDER BY c.Name, MONTH(o.OrderDate);`, output: 'Category  Mon   Value\n--------  ---  ------\nBuilding  Feb  113.00\nBuilding  May  140.00\nFixings   Mar   23.80\nFixings   May   59.50\nFixings   Jun   18.00\nPaint     Apr  120.50\nTimber    Mar  524.00\nTimber    May   84.00\nTimber    Jun   81.60\nTools     Feb   38.00\nTools     Mar   89.00\nTools     May   18.50\nTools     Jun    9.75' },
      { type: 'h2', text: 'The PIVOT operator' },
      { type: 'p', text: '`PIVOT` turns the values of one column (Mon) into column headings and puts an aggregate in each cell:' },
      { type: 'code', code: sql`
SELECT Category, [Feb], [Mar], [Apr], [May], [Jun]
FROM (
    SELECT c.Name AS Category,
           LEFT(DATENAME(month, o.OrderDate), 3) AS Mon,
           oi.Quantity * oi.UnitPrice AS Value
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    JOIN dbo.Products   AS p  ON p.ProductId = oi.ProductId
    JOIN dbo.Categories AS c  ON c.CategoryId = p.CategoryId
    WHERE o.Status <> 'Cancelled'
) AS src
PIVOT (SUM(Value) FOR Mon IN ([Feb], [Mar], [Apr], [May], [Jun])) AS pv
ORDER BY Category;`, output: 'Category     Feb     Mar     Apr     May    Jun\n--------  ------  ------  ------  ------  -----\nBuilding  113.00    NULL    NULL  140.00   NULL\nFixings     NULL   23.80    NULL   59.50  18.00\nPaint       NULL    NULL  120.50    NULL   NULL\nTimber      NULL  524.00    NULL   84.00  81.60\nTools      38.00   89.00    NULL   18.50   9.75' },
      { type: 'p', text: 'Read the PIVOT clause as: “sum Value, spreading it **for** each Mon **in** these columns”. The pieces are:' },
      { type: 'ul', items: [
        'the **source**: a derived table (or CTE) with exactly the columns PIVOT needs;',
        'the **aggregate**: `SUM(Value)`, which fills each cell;',
        'the **spreading column**: `FOR Mon`, whose values become headings;',
        'the **column list**: `IN ([Feb], …)`, typed out in full. Values not in the list are ignored.'
      ] },
      { type: 'p', text: 'Every other column of the source (here only Category) is a **grouping column**: PIVOT makes one row per different value. A cell with no rows is NULL, not 0.' },
      { type: 'widget', name: 'pivot-turn' },
      { type: 'h2', text: 'The hidden grouping trap' },
      { type: 'p', text: 'PIVOT never says which columns it groups by: it groups by **all** the source columns it was not told about. Select the source straight from a table, or add one innocent column, and the rows no longer merge:' },
      { type: 'code', code: sql`
SELECT Category, [Feb], [Mar], [Apr], [May], [Jun]
FROM (
    SELECT c.Name AS Category, o.OrderId,      -- one extra column
           LEFT(DATENAME(month, o.OrderDate), 3) AS Mon,
           oi.Quantity * oi.UnitPrice AS Value
    FROM dbo.Orders AS o
    JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
    JOIN dbo.Products   AS p  ON p.ProductId = oi.ProductId
    JOIN dbo.Categories AS c  ON c.CategoryId = p.CategoryId
    WHERE o.Status <> 'Cancelled'
) AS src
PIVOT (SUM(Value) FOR Mon IN ([Feb], [Mar], [Apr], [May], [Jun])) AS pv
ORDER BY Category;`, output: 'Category     Feb     Mar     Apr     May    Jun\n--------  ------  ------  ------  ------  -----\nBuilding  113.00    NULL    NULL    NULL   NULL\nBuilding    NULL    NULL    NULL  140.00   NULL\nFixings     NULL   23.80    NULL    NULL   NULL\nFixings     NULL    NULL    NULL   59.50   NULL\nFixings     NULL    NULL    NULL    NULL  18.00\nPaint       NULL    NULL  120.50    NULL   NULL\nTimber      NULL  524.00    NULL    NULL   NULL\nTimber      NULL    NULL    NULL   84.00   NULL\nTimber      NULL    NULL    NULL    NULL  81.60\nTools      38.00    NULL    NULL    NULL   NULL\nTools       NULL   89.00    NULL    NULL   NULL\nTools       NULL    NULL    NULL   18.50   NULL\nTools       NULL    NULL    NULL    NULL   9.75' },
      { type: 'note', kind: 'warn', text: 'OrderId is not in the outer SELECT, but it is still a grouping column, so Tools now has one row per order. Always feed PIVOT from a derived table or CTE that holds only the grouping columns, the spreading column and the value.' },
      { type: 'h2', text: 'Conditional aggregation: the flexible alternative' },
      { type: 'p', text: 'The same cross-tab can be written with GROUP BY and one `CASE` per column. It is longer, but the grouping is visible, each column can have its own aggregate or default, and totals are easy:' },
      { type: 'code', code: sql`
SELECT c.Name AS Category,
       SUM(CASE WHEN MONTH(o.OrderDate) = 2 THEN oi.Quantity * oi.UnitPrice ELSE 0 END) AS Feb,
       SUM(CASE WHEN MONTH(o.OrderDate) = 3 THEN oi.Quantity * oi.UnitPrice ELSE 0 END) AS Mar,
       SUM(CASE WHEN MONTH(o.OrderDate) = 4 THEN oi.Quantity * oi.UnitPrice ELSE 0 END) AS Apr,
       SUM(CASE WHEN MONTH(o.OrderDate) = 5 THEN oi.Quantity * oi.UnitPrice ELSE 0 END) AS May,
       SUM(CASE WHEN MONTH(o.OrderDate) = 6 THEN oi.Quantity * oi.UnitPrice ELSE 0 END) AS Jun,
       SUM(oi.Quantity * oi.UnitPrice) AS Total
FROM dbo.Orders AS o
JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
JOIN dbo.Products   AS p  ON p.ProductId = oi.ProductId
JOIN dbo.Categories AS c  ON c.CategoryId = p.CategoryId
WHERE o.Status <> 'Cancelled'
GROUP BY c.Name
ORDER BY c.Name;`, output: 'Category     Feb     Mar     Apr     May    Jun   Total\n--------  ------  ------  ------  ------  -----  ------\nBuilding  113.00    0.00    0.00  140.00   0.00  253.00\nFixings     0.00   23.80    0.00   59.50  18.00  101.30\nPaint       0.00    0.00  120.50    0.00   0.00  120.50\nTimber      0.00  524.00    0.00   84.00  81.60  689.60\nTools      38.00   89.00    0.00   18.50   9.75  155.25' },
      { type: 'p', text: '`ELSE 0` turns the empty cells into 0. Leave it out and they are NULL, as with PIVOT. Counting works the same way: `COUNT(CASE WHEN … THEN 1 END)` counts the rows where the condition holds, because COUNT skips the NULLs the CASE returns otherwise.' },
      { type: 'h2', text: 'A dynamic PIVOT' },
      { type: 'p', text: 'PIVOT needs its column list written in the query. If the columns depend on the data (every month that has orders, say), build the query as text and run it with `sp_executesql`. `QUOTENAME` puts each value in square brackets so that a strange value cannot break, or inject into, the SQL:' },
      { type: 'code', code: sql`
DECLARE @cols nvarchar(max), @query nvarchar(max);

SELECT @cols = STRING_AGG(QUOTENAME(Status), N', ') WITHIN GROUP (ORDER BY Status)
FROM (SELECT DISTINCT Status FROM dbo.Orders) AS s;

SET @query = N'
SELECT CustomerId, ' + @cols + N'
FROM (SELECT CustomerId, Status, OrderId FROM dbo.Orders) AS src
PIVOT (COUNT(OrderId) FOR Status IN (' + @cols + N')) AS pv
ORDER BY CustomerId;';

PRINT @cols;
EXEC sp_executesql @query;`, output: '[Cancelled], [Pending], [Shipped]\n\nCustomerId  Cancelled  Pending  Shipped\n----------  ---------  -------  -------\n         1          0        0        2\n         2          0        1        1\n         3          1        0        0\n         4          0        0        2\n         6          0        0        2\n         8          0        1        0' },
      { type: 'note', kind: 'info', text: 'Here COUNT fills the cells, so empty cells are 0 rather than NULL: COUNT over no rows is 0. Building SQL from text is covered properly, with its injection risks, in the security lesson.' },
      { type: 'h2', text: 'UNPIVOT: columns back into rows' },
      { type: 'p', text: '`UNPIVOT` does the reverse: it turns a set of columns into two columns, one holding the old column name and one the value. A stocktake sheet arrives wide, one column per product:' },
      { type: 'code', code: sql`
CREATE TABLE #Stocktake (Shop nvarchar(20), Hammers int, Drills int, Tapes int);
INSERT INTO #Stocktake VALUES
    (N'Leeds', 12, 3, 20),
    (N'York',   8, NULL, 15);

SELECT Shop, Product, Qty
FROM #Stocktake
UNPIVOT (Qty FOR Product IN (Hammers, Drills, Tapes)) AS u
ORDER BY Shop, Product;`, output: 'Shop   Product  Qty\n-----  -------  ---\nLeeds  Drills     3\nLeeds  Hammers   12\nLeeds  Tapes     20\nYork   Hammers    8\nYork   Tapes     15' },
      { type: 'p', text: 'Six cells went in, five rows came out: **UNPIVOT drops NULLs**. York’s drill count is missing, and so is the row. If you need it, use `CROSS APPLY` with a `VALUES` list instead, which keeps every cell. APPLY is the next lesson:' },
      { type: 'code', code: sql`
CREATE TABLE #Stocktake (Shop nvarchar(20), Hammers int, Drills int, Tapes int);
INSERT INTO #Stocktake VALUES
    (N'Leeds', 12, 3, 20),
    (N'York',   8, NULL, 15);

SELECT s.Shop, v.Product, v.Qty
FROM #Stocktake AS s
CROSS APPLY (VALUES (N'Hammers', s.Hammers),
                    (N'Drills',  s.Drills),
                    (N'Tapes',   s.Tapes)) AS v(Product, Qty)
ORDER BY s.Shop, v.Product;`, output: 'Shop   Product   Qty\n-----  -------  ----\nLeeds  Drills      3\nLeeds  Hammers    12\nLeeds  Tapes      20\nYork   Drills   NULL\nYork   Hammers     8\nYork   Tapes      15' },
      { type: 'note', kind: 'info', text: 'UNPIVOT needs all the columns it reads to have the same type. If they differ (int and decimal, nvarchar(20) and nvarchar(40)), CAST them to one type in a derived table first, or you get error 8167.' },
      { type: 'quiz', question: 'A PIVOT source has the columns Region, Year, Quarter and Sales, and the PIVOT is `SUM(Sales) FOR Quarter IN ([Q1], [Q2], [Q3], [Q4])`. One row per what?', options: ['Region', 'Year', 'Region and Year', 'Quarter'], answer: 2, explain: 'PIVOT groups by every source column it is not told about. Sales is aggregated and Quarter is spread, so Region and Year are both grouping columns.' },
      { type: 'quiz', question: 'What happens to a NULL cell when you UNPIVOT?', options: ['It becomes a row with Value NULL', 'It becomes 0', 'It produces no row', 'UNPIVOT fails with an error'], answer: 2, explain: 'UNPIVOT skips NULL values. Use CROSS APPLY (VALUES …) if you need a row for every cell.' },
      { type: 'exercise', task: 'Using conditional aggregation, show one row per order status with three columns counting that status’s orders in Q1 (Jan–Mar), Q2 (Apr–Jun) and in total. Sort by status.', hint: 'GROUP BY Status, and COUNT(CASE WHEN MONTH(OrderDate) <= 3 THEN 1 END) for Q1. The NULL warning is expected: it comes from the CASEs that return NULL.', solution: sql`
SELECT Status,
       COUNT(CASE WHEN MONTH(OrderDate) BETWEEN 1 AND 3 THEN 1 END) AS Q1,
       COUNT(CASE WHEN MONTH(OrderDate) BETWEEN 4 AND 6 THEN 1 END) AS Q2,
       COUNT(*) AS Total
FROM dbo.Orders
GROUP BY Status
ORDER BY Status;`, output: 'Warning: Null value is eliminated by an aggregate or other SET operation.\n\nStatus     Q1  Q2  Total\n---------  --  --  -----\nCancelled   0   1      1\nPending     0   2      2\nShipped     4   3      7' }
    ],
    keyPoints: [
      'PIVOT turns the values of one column into columns, with an aggregate in each cell.',
      'The column list in IN (…) must be typed out; values not listed are ignored.',
      'PIVOT groups by every source column it is not told about: feed it from a narrow derived table.',
      'Empty cells are NULL with SUM (0 with COUNT).',
      'Conditional aggregation (SUM(CASE …) with GROUP BY) does the same, with visible grouping and easy totals.',
      'A dynamic PIVOT builds the column list with STRING_AGG(QUOTENAME(…)) and runs it with sp_executesql.',
      'UNPIVOT turns columns into rows and drops NULLs; CROSS APPLY (VALUES …) keeps them.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'apply',
    title: 'CROSS APPLY and OUTER APPLY',
    summary: 'Run a query once per row of another: CROSS APPLY and OUTER APPLY, why a join cannot do it, top N per row, naming calculations, splitting strings with STRING_SPLIT, and unpivoting with VALUES.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A join combines two tables that each make sense **on their own**. Sometimes the right-hand side depends on the left-hand row: “the two dearest products **of this category**”. `APPLY` runs a table expression once for each row on its left, and that expression can use the left row’s columns:' },
      { type: 'code', code: sql`
SELECT c.Name AS Category, t.Name, t.Price
FROM dbo.Categories AS c
CROSS APPLY (
    SELECT TOP (2) p.Name, p.Price
    FROM dbo.Products AS p
    WHERE p.CategoryId = c.CategoryId
    ORDER BY p.Price DESC
) AS t
ORDER BY c.CategoryId, t.Price DESC;`, output: 'Category  Name                 Price\n--------  -------------------  -----\nTools     Cordless drill       89.00\nTools     Claw hammer          18.50\nBuilding  Cement 25 kg          7.20\nBuilding  Sand 25 kg            4.10\nTimber    Plywood sheet 18 mm  42.00\nTimber    Timber 2x4 2.4 m      6.80\nFixings   Wood screws (200)    11.90\nFixings   Wall plugs (100)      4.50\nPaint     Masonry paint 10 L   54.00\nPaint     Paint roller set     12.50\nSafety    Safety goggles        6.80' },
      { type: 'p', text: 'For each category, the inner query runs with that category’s id and returns up to two rows. Each is joined to the category row. Safety has only one product, so it gets one row; Plumbing has none, so it disappears, just as with an inner join.' },
      { type: 'h2', text: 'OUTER APPLY keeps every left row' },
      { type: 'p', text: '`OUTER APPLY` is to CROSS APPLY what LEFT JOIN is to INNER JOIN: a left row whose inner query returns nothing is kept, with NULLs:' },
      { type: 'code', code: sql`
SELECT c.Name AS Category, t.Name, t.Price
FROM dbo.Categories AS c
OUTER APPLY (
    SELECT TOP (1) p.Name, p.Price
    FROM dbo.Products AS p
    WHERE p.CategoryId = c.CategoryId
    ORDER BY p.Price DESC
) AS t
ORDER BY c.CategoryId;`, output: 'Category  Name                 Price\n--------  -------------------  -----\nTools     Cordless drill       89.00\nBuilding  Cement 25 kg          7.20\nTimber    Plywood sheet 18 mm  42.00\nFixings   Wood screws (200)    11.90\nPaint     Masonry paint 10 L   54.00\nSafety    Safety goggles        6.80\nPlumbing  NULL                  NULL' },
      { type: 'widget', name: 'apply-runner' },
      { type: 'h2', text: 'Why a join cannot do this' },
      { type: 'p', text: 'A derived table on the right of a JOIN is worked out on its own, before it is matched with anything. It cannot see the left table’s columns:' },
      { type: 'code', code: sql`
SELECT c.Name AS Category, t.Name, t.Price
FROM dbo.Categories AS c
JOIN (
    SELECT TOP (2) p.Name, p.Price, p.CategoryId
    FROM dbo.Products AS p
    WHERE p.CategoryId = c.CategoryId
    ORDER BY p.Price DESC
) AS t ON t.CategoryId = c.CategoryId;`, output: 'Msg 4104, Level 16, State 1, Line 6\nThe multi-part identifier "c.CategoryId" could not be bound.' },
      { type: 'p', text: 'Moving the filter into ON does not help either: then TOP (2) picks the two dearest products of the **whole** table before any matching happens. APPLY is the operator that lets the right side depend on the left row, which is called a **lateral** join in other databases.' },
      { type: 'note', kind: 'tip', text: 'Top N per group can be done with ROW_NUMBER (previous lessons) or with APPLY. With an index on (CategoryId, Price), APPLY reads just N rows per category, which wins when there are few groups and many rows. ROW_NUMBER reads everything once and wins when there are many small groups.' },
      { type: 'h2', text: 'Each customer’s latest order' },
      { type: 'p', text: 'The inner query can return several columns, which a scalar subquery in SELECT cannot. OUTER APPLY keeps the customers who have never ordered:' },
      { type: 'code', code: sql`
SELECT c.FirstName, lo.OrderId, lo.OrderDate, lo.Status
FROM dbo.Customers AS c
OUTER APPLY (
    SELECT TOP (1) o.OrderId, o.OrderDate, o.Status
    FROM dbo.Orders AS o
    WHERE o.CustomerId = c.CustomerId
    ORDER BY o.OrderDate DESC
) AS lo
ORDER BY c.CustomerId;`, output: 'FirstName  OrderId  OrderDate   Status\n---------  -------  ----------  ---------\nAsha             3  2024-03-01  Shipped\nBen              9  2024-06-01  Pending\nChloe            6  2024-04-20  Cancelled\nDev              7  2024-05-05  Shipped\nElla          NULL  NULL        NULL\nFarid           10  2024-06-12  Shipped\nGrace         NULL  NULL        NULL\nZoë              8  2024-05-18  Pending' },
      { type: 'h2', text: 'Naming a calculation' },
      { type: 'p', text: 'A column alias from SELECT cannot be used in the same SELECT, in WHERE or in GROUP BY. CROSS APPLY with a one-row `SELECT` (no FROM) gives a calculation a name that every later clause can use, so you write it only once:' },
      { type: 'code', code: sql`
SELECT oi.OrderId, oi.ProductId, v.Net, g.Vat, g.Gross
FROM dbo.OrderItems AS oi
CROSS APPLY (SELECT oi.Quantity * oi.UnitPrice AS Net) AS v
CROSS APPLY (SELECT CAST(v.Net * 0.20 AS decimal(10,2)) AS Vat,
                    CAST(v.Net * 1.20 AS decimal(10,2)) AS Gross) AS g
WHERE g.Gross > 200
ORDER BY g.Gross DESC;`, output: 'OrderId  ProductId     Net    Vat   Gross\n-------  ---------  ------  -----  ------\n      4          6  272.00  54.40  326.40\n      4          7  252.00  50.40  302.40' },
      { type: 'p', text: 'The second APPLY uses `v.Net` from the first: each APPLY can see everything to its left. This costs nothing: the optimiser folds the expressions into the query as if you had written them out.' },
      { type: 'h2', text: 'APPLY with a table-valued function: STRING_SPLIT' },
      { type: 'p', text: 'The right side of APPLY can be a **table-valued function** that takes the left row’s columns as arguments. `STRING_SPLIT(text, separator)` is one built into SQL Server: it returns one row per piece in a column called `value`:' },
      { type: 'code', code: sql`
CREATE TABLE #Tags (ProductId int, Tags nvarchar(100));
INSERT INTO #Tags VALUES (1, N'hand tool,steel'), (2, N'power tool,cordless,18V'), (6, N'timber');

SELECT t.ProductId, p.Name, s.value AS Tag
FROM #Tags AS t
JOIN dbo.Products AS p ON p.ProductId = t.ProductId
CROSS APPLY STRING_SPLIT(t.Tags, N',') AS s
ORDER BY t.ProductId, s.value;`, output: 'ProductId  Name              Tag\n---------  ----------------  ----------\n        1  Claw hammer       hand tool\n        1  Claw hammer       steel\n        2  Cordless drill    18V\n        2  Cordless drill    cordless\n        2  Cordless drill    power tool\n        6  Timber 2x4 2.4 m  timber' },
      { type: 'note', kind: 'info', text: 'STRING_SPLIT returns the pieces in no guaranteed order. In SQL Server 2022, `STRING_SPLIT(text, N\',\', 1)` adds an `ordinal` column with each piece’s position. Storing lists in one column breaks first normal form; this is how you deal with them when they arrive that way.' },
      { type: 'h2', text: 'Unpivoting with VALUES' },
      { type: 'p', text: 'As the PIVOT lesson showed, `CROSS APPLY (VALUES …)` turns columns into rows and, unlike UNPIVOT, keeps NULLs (here filtered out on purpose). One row per way to reach each customer:' },
      { type: 'code', code: sql`
SELECT c.FirstName, v.Method, v.Contact
FROM dbo.Customers AS c
CROSS APPLY (VALUES ('Email', CAST(c.Email AS nvarchar(100))),
                    ('Phone', CAST(c.Phone AS nvarchar(100)))) AS v(Method, Contact)
WHERE v.Contact IS NOT NULL
  AND c.CustomerId <= 4
ORDER BY c.CustomerId, v.Method;`, output: 'FirstName  Method  Contact\n---------  ------  -----------------\nAsha       Email   asha@example.com\nAsha       Phone   0113 496 0001\nBen        Phone   01904 555 010\nChloe      Email   chloe@example.com\nDev        Email   dev@example.com\nDev        Phone   01274 555 220' },
      { type: 'quiz', question: 'Categories has 7 rows. Plumbing has no products, Safety has 1, every other category has 2 or 3. How many rows does `Categories CROSS APPLY (SELECT TOP (2) … WHERE p.CategoryId = c.CategoryId)` return?', options: ['14', '12', '11', '7'], answer: 2, explain: 'Five categories return 2 rows each (10), Safety returns 1 and Plumbing returns none: 11. With OUTER APPLY, Plumbing would add a row of NULLs, giving 12.' },
      { type: 'quiz', question: 'Which of these can APPLY do that a JOIN to a derived table cannot?', options: ['Join on more than one column', 'Let the inner query use the outer row’s columns', 'Return NULLs for unmatched rows', 'Join more than two tables'], answer: 1, explain: 'A derived table is evaluated on its own and cannot reference the outer query. APPLY evaluates its right side once per left row, with that row’s columns available.' },
      { type: 'exercise', task: 'For every product in categories 1 and 3, show the product name and the most recent order that included it (OrderId and OrderDate), or NULLs if it was never ordered. Sort by ProductId.', hint: 'Products OUTER APPLY (SELECT TOP (1) o.OrderId, o.OrderDate FROM OrderItems JOIN Orders WHERE oi.ProductId = p.ProductId ORDER BY o.OrderDate DESC).', solution: sql`
SELECT p.Name, lo.OrderId, lo.OrderDate
FROM dbo.Products AS p
OUTER APPLY (
    SELECT TOP (1) o.OrderId, o.OrderDate
    FROM dbo.OrderItems AS oi
    JOIN dbo.Orders AS o ON o.OrderId = oi.OrderId
    WHERE oi.ProductId = p.ProductId
    ORDER BY o.OrderDate DESC
) AS lo
WHERE p.CategoryId IN (1, 3)
ORDER BY p.ProductId;`, output: 'Name                 OrderId  OrderDate\n-------------------  -------  ----------\nClaw hammer                8  2024-05-18\nCordless drill             3  2024-03-01\nTape measure 8 m          10  2024-06-12\nTimber 2x4 2.4 m          10  2024-06-12\nPlywood sheet 18 mm        8  2024-05-18' }
    ],
    keyPoints: [
      'APPLY runs its right side once per left row, and that side can use the left row’s columns.',
      'CROSS APPLY drops left rows with no result; OUTER APPLY keeps them with NULLs.',
      'A derived table in a JOIN cannot see the outer columns: that is what APPLY is for.',
      'TOP (n) … ORDER BY inside APPLY gives the top N per row, with as many columns as you like.',
      'CROSS APPLY (SELECT expr AS name) names a calculation once for SELECT, WHERE and ORDER BY.',
      'APPLY feeds the left row into table-valued functions such as STRING_SPLIT.',
      'CROSS APPLY (VALUES …) unpivots columns into rows and keeps NULLs.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'json-in-sql',
    title: 'JSON in SQL Server',
    summary: 'Read, shred, build and change JSON with T-SQL: ISJSON, JSON_VALUE versus JSON_QUERY, lax and strict paths, OPENJSON with and without a schema, FOR JSON PATH, JSON_MODIFY, and JSON_OBJECT and JSON_ARRAY.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'APIs, logs and web front ends speak **JSON**. SQL Server stores JSON as ordinary text (`nvarchar`) and has functions to check it, read values out of it, turn it into rows and build it from rows. This lesson uses one order as it might arrive from a web shop:' },
      { type: 'code', code: sql`
DECLARE @j nvarchar(max) = N'{
  "orderRef": "WEB-1001",
  "customer": { "name": "Asha Patel", "city": "Leeds" },
  "lines": [
    { "productId": 6, "qty": 10 },
    { "productId": 8, "qty": 2 }
  ],
  "giftWrap": true,
  "note": null
}';

SELECT ISJSON(@j)                          AS Valid,
       JSON_VALUE(@j, '$.orderRef')        AS OrderRef,
       JSON_VALUE(@j, '$.customer.city')   AS City,
       JSON_VALUE(@j, '$.lines[1].qty')    AS SecondQty,
       JSON_VALUE(@j, '$.giftWrap')        AS GiftWrap;`, output: 'Valid  OrderRef  City   SecondQty  GiftWrap\n-----  --------  -----  ---------  --------\n    1  WEB-1001  Leeds  2          true' },
      { type: 'p', text: 'A **path** starts at `$`, the whole document. `.name` steps into a property and `[n]` into an array element, counting from **0**. JSON_VALUE always returns `nvarchar(4000)` text, so `true` comes back as the text “true” and numbers need a CAST before you do sums with them.' },
      { type: 'h2', text: 'JSON_VALUE or JSON_QUERY' },
      { type: 'p', text: 'There are two reading functions, and each returns NULL when you use the wrong one:' },
      { type: 'table', head: ['Function', 'Returns', 'Given an object or array', 'Given a scalar'], rows: [
        ['`JSON_VALUE`', 'a scalar: text, number, true/false', 'NULL', 'the value as text'],
        ['`JSON_QUERY`', 'an object or array, as JSON text', 'the JSON fragment', 'NULL']
      ] },
      { type: 'code', code: sql`
DECLARE @j nvarchar(max) = N'{"customer":{"name":"Asha Patel","city":"Leeds"},"lines":[{"productId":6,"qty":10},{"productId":8,"qty":2}]}';

SELECT JSON_VALUE(@j, '$.customer')      AS ValueOfObject,
       JSON_QUERY(@j, '$.customer')      AS QueryOfObject,
       JSON_QUERY(@j, '$.customer.name') AS QueryOfScalar,
       JSON_QUERY(@j, '$.lines[0]')      AS FirstLine;`, output: 'ValueOfObject  QueryOfObject                         QueryOfScalar  FirstLine\n-------------  ------------------------------------  -------------  ------------------------\nNULL           {"name":"Asha Patel","city":"Leeds"}  NULL           {"productId":6,"qty":10}' },
      { type: 'widget', name: 'json-path' },
      { type: 'h2', text: 'lax and strict' },
      { type: 'p', text: 'By default a path is in **lax** mode: if the property is missing, or is the wrong kind for the function, you get NULL. That is convenient, but it hides typing mistakes. Put `strict` at the start of the path and the same problems raise an error:' },
      { type: 'code', code: sql`
DECLARE @j nvarchar(max) = N'{"orderRef":"WEB-1001","customer":{"name":"Asha Patel"}}';

SELECT JSON_VALUE(@j, '$.orderref') AS LaxTypo;            -- paths are case-sensitive
SELECT JSON_VALUE(@j, 'strict $.orderref') AS StrictTypo;`, output: 'LaxTypo\n-------\nNULL\n\nMsg 13608, Level 16, State 2, Line 4\nProperty cannot be found on the specified JSON path.' },
      { type: 'note', kind: 'warn', text: 'JSON property names are **case-sensitive**, even though your database collation is not: `$.orderref` does not find `orderRef`. In lax mode that is a silent NULL. Use strict in code that must not quietly carry on.' },
      { type: 'h2', text: 'OPENJSON: JSON into rows' },
      { type: 'p', text: '`OPENJSON` is a table-valued function. On its own it returns one row per property or array element, with its key, value and type (0 null, 1 string, 2 number, 3 true/false, 4 array, 5 object):' },
      { type: 'code', code: sql`
DECLARE @j nvarchar(max) = N'{"orderRef":"WEB-1001","customer":{"name":"Asha Patel"},"lines":[{"productId":6,"qty":10}],"giftWrap":true,"note":null}';

SELECT [key], value, type
FROM OPENJSON(@j);`, output: 'key       value                       type\n--------  --------------------------  ----\norderRef  WEB-1001                       1\ncustomer  {"name":"Asha Patel"}          5\nlines     [{"productId":6,"qty":10}]     4\ngiftWrap  true                           3\nnote      NULL                           0' },
      { type: 'p', text: 'Add a `WITH` clause and you choose the columns, their types and the path each one comes from. Point OPENJSON at the array and every element becomes a typed row, ready to join to real tables:' },
      { type: 'code', code: sql`
DECLARE @j nvarchar(max) = N'{"orderRef":"WEB-1001","lines":[{"productId":6,"qty":10},{"productId":8,"qty":2}]}';

SELECT l.ProductId, p.Name, l.Qty, p.Price, l.Qty * p.Price AS LineValue
FROM OPENJSON(@j, '$.lines')
     WITH (ProductId int '$.productId',
           Qty       int '$.qty') AS l
JOIN dbo.Products AS p ON p.ProductId = l.ProductId;`, output: 'ProductId  Name               Qty  Price  LineValue\n---------  -----------------  ---  -----  ---------\n        6  Timber 2x4 2.4 m    10   6.80      68.00\n        8  Wood screws (200)    2  11.90      23.80' },
      { type: 'p', text: 'This is how a stored procedure can take a whole order with all its lines as **one** JSON parameter and insert it with `INSERT … SELECT … FROM OPENJSON(…)`.' },
      { type: 'h2', text: 'JSON in a column' },
      { type: 'p', text: 'When JSON lives in a table, OPENJSON is used with CROSS APPLY, one document per row. A `CHECK (ISJSON(col) = 1)` constraint keeps bad text out:' },
      { type: 'code', code: sql`
CREATE TABLE #WebEvents (
    EventId int IDENTITY PRIMARY KEY,
    Payload nvarchar(max) NOT NULL CHECK (ISJSON(Payload) = 1)
);
INSERT INTO #WebEvents (Payload) VALUES
    (N'{"type":"search","terms":["drill","cordless"]}'),
    (N'{"type":"view","productId":2}'),
    (N'{"type":"search","terms":["paint"]}');

SELECT e.EventId, t.value AS Term
FROM #WebEvents AS e
CROSS APPLY OPENJSON(e.Payload, '$.terms') AS t
WHERE JSON_VALUE(e.Payload, '$.type') = 'search'
ORDER BY e.EventId, t.[key];`, output: 'EventId  Term\n-------  --------\n      1  drill\n      1  cordless\n      3  paint' },
      { type: 'note', kind: 'tip', text: 'To search a JSON property quickly, add a computed column, `ALTER TABLE … ADD EventType AS JSON_VALUE(Payload, \'$.type\')`, and index it. SQL Server then uses the index for `WHERE JSON_VALUE(Payload, \'$.type\') = …`.' },
      { type: 'h2', text: 'FOR JSON: rows into JSON' },
      { type: 'p', text: 'Add `FOR JSON PATH` to a query and the result becomes one JSON array, one object per row. Dots in the column aliases make nested objects, and a subquery with its own FOR JSON makes a nested array:' },
      { type: 'code', code: sql`
SELECT (
    SELECT o.OrderId        AS id,
           o.OrderDate      AS [date],
           c.FirstName      AS [customer.name],
           c.City           AS [customer.city],
           (SELECT oi.ProductId AS productId, oi.Quantity AS qty
            FROM dbo.OrderItems AS oi
            WHERE oi.OrderId = o.OrderId
            ORDER BY oi.ProductId
            FOR JSON PATH)  AS lines
    FROM dbo.Orders AS o
    JOIN dbo.Customers AS c ON c.CustomerId = o.CustomerId
    WHERE o.OrderId IN (1, 4)
    ORDER BY o.OrderId
    FOR JSON PATH
) AS Json;`, output: 'Json\n----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n[{"id":1,"date":"2024-02-03","customer":{"name":"Asha","city":"Leeds"},"lines":[{"productId":1,"qty":1},{"productId":3,"qty":2}]},{"id":4,"date":"2024-03-15","customer":{"name":"Dev","city":"Bradford"},"lines":[{"productId":6,"qty":40},{"productId":7,"qty":6}]}]' },
      { type: 'p', text: 'Columns that are NULL are left out of the object unless you add `INCLUDE_NULL_VALUES`, and `WITHOUT_ARRAY_WRAPPER` drops the outer `[ ]` when you know there is one row. Wrapping the query in `SELECT (…) AS Json` gives the result a normal column name.' },
      { type: 'h2', text: 'Changing JSON: JSON_MODIFY' },
      { type: 'p', text: '`JSON_MODIFY(json, path, newValue)` returns a copy of the document with one value changed. `append` adds to an array, and NULL removes a property in lax mode:' },
      { type: 'code', code: sql`
DECLARE @j nvarchar(max) = N'{"orderRef":"WEB-1001","status":"new","tags":["web"]}';

SET @j = JSON_MODIFY(@j, '$.status', 'paid');
SET @j = JSON_MODIFY(@j, 'append $.tags', 'priority');
SET @j = JSON_MODIFY(@j, '$.paidOn', '2024-07-01');
SET @j = JSON_MODIFY(@j, '$.orderRef', NULL);

SELECT @j AS Changed;`, output: 'Changed\n-----------------------------------------------------------------\n{"status":"paid","tags":["web","priority"],"paidOn":"2024-07-01"}' },
      { type: 'h2', text: 'JSON_OBJECT and JSON_ARRAY (SQL Server 2022)' },
      { type: 'p', text: 'For a small document from a few values, SQL Server 2022 has constructors. Unlike FOR JSON, they keep real JSON types: a bit becomes `true`, and a nested JSON_ARRAY stays an array:' },
      { type: 'code', code: sql`
SELECT JSON_OBJECT('id': ProductId,
                   'name': Name,
                   'inStock': CAST(CASE WHEN Stock > 0 THEN 1 ELSE 0 END AS bit),
                   'sizes': JSON_ARRAY(Unit, 'trade pack')) AS Doc
FROM dbo.Products
WHERE ProductId IN (1, 9)
ORDER BY ProductId;`, output: 'Doc\n-------------------------------------------------------------------------------\n{"id":1,"name":"Claw hammer","inStock":true,"sizes":["each","trade pack"]}\n{"id":9,"name":"Wall plugs (100)","inStock":false,"sizes":["box","trade pack"]}' },
      { type: 'quiz', question: 'What does `JSON_VALUE(@j, \'$.customer\')` return when customer is an object?', options: ['The object as JSON text', 'NULL in lax mode', 'The first property of the object', 'An empty string'], answer: 1, explain: 'JSON_VALUE only returns scalars. For an object or array it returns NULL in lax mode (an error in strict mode). Use JSON_QUERY for objects and arrays.' },
      { type: 'quiz', question: 'Which path reads the qty of the first line in `{"lines":[{"qty":10},{"qty":2}]}`?', options: ['$.lines[1].qty', '$.lines.qty', '$.lines[0].qty', 'lines[0].qty'], answer: 2, explain: 'Paths start with $ and array indexes count from 0, so the first element is [0].' },
      { type: 'exercise', task: 'Given `{"delivery":[{"productId":4,"qty":50},{"productId":5,"qty":40},{"productId":9,"qty":25}]}`, show each delivered product’s name, its current Stock, the delivered qty and the stock after the delivery.', hint: 'OPENJSON(@d, \'$.delivery\') WITH (ProductId int \'$.productId\', Qty int \'$.qty\'), joined to Products.', solution: sql`
DECLARE @d nvarchar(max) = N'{"delivery":[{"productId":4,"qty":50},{"productId":5,"qty":40},{"productId":9,"qty":25}]}';

SELECT p.Name, p.Stock, d.Qty, p.Stock + d.Qty AS NewStock
FROM OPENJSON(@d, '$.delivery')
     WITH (ProductId int '$.productId', Qty int '$.qty') AS d
JOIN dbo.Products AS p ON p.ProductId = d.ProductId
ORDER BY p.ProductId;`, output: 'Name              Stock  Qty  NewStock\n----------------  -----  ---  --------\nCement 25 kg        300   50       350\nSand 25 kg          220   40       260\nWall plugs (100)      0   25        25' }
    ],
    keyPoints: [
      'JSON is stored as nvarchar; ISJSON checks it and a CHECK constraint can enforce it.',
      'Paths start at $, use .name and [index], count from 0 and are case-sensitive.',
      'JSON_VALUE reads scalars (as nvarchar), JSON_QUERY reads objects and arrays; the wrong one gives NULL.',
      'Lax paths return NULL for problems; strict paths raise errors.',
      'OPENJSON turns JSON into rows; WITH gives typed columns; use CROSS APPLY for JSON in a column.',
      'FOR JSON PATH builds JSON from rows; dotted aliases nest objects and subqueries nest arrays.',
      'JSON_MODIFY changes, appends to and removes from a document.',
      'JSON_OBJECT and JSON_ARRAY (2022) build small documents with real JSON types.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'merge-upsert',
    title: 'MERGE, upserts and the OUTPUT clause',
    summary: 'Insert-or-update in one statement: the two-statement upsert, MERGE with its three WHEN clauses, $action in OUTPUT, saving OUTPUT into a table, a full sync with NOT MATCHED BY SOURCE, and the traps: duplicate source rows, unscoped deletes and concurrency.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'A supplier sends a price list each week. Some products are already in our table and need their price and stock updated; some are new and must be inserted. “Update if it exists, insert if it doesn’t” is called an **upsert**. The feed for this lesson:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.SupplierFeed (
    Name       nvarchar(60)  NOT NULL,
    CategoryId int           NOT NULL,
    Price      decimal(10,2) NOT NULL,
    Stock      int           NOT NULL,
    Unit       nvarchar(10)  NOT NULL
);
INSERT INTO dbo.SupplierFeed VALUES
    (N'Claw hammer',  1, 19.50,  55, N'each'),   -- dearer, more stock
    (N'Cement 25 kg', 2,  7.20, 300, N'bag'),    -- unchanged
    (N'Sand 25 kg',   2,  4.30, 260, N'bag'),    -- dearer, more stock
    (N'Garden spade', 1, 24.00,  15, N'each'),   -- new
    (N'Pipe cutter',  7, 16.50,  10, N'each');   -- new`
      },
      { type: 'h2', text: 'The upsert in two statements' },
      { type: 'p', text: 'Without MERGE, an upsert is an UPDATE of the rows that match, then an INSERT of the rows that do not:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;

UPDATE p
SET    p.Price = f.Price, p.Stock = f.Stock
FROM   dbo.Products AS p
JOIN   dbo.SupplierFeed AS f ON f.Name = p.Name
WHERE  p.Price <> f.Price OR p.Stock <> f.Stock;

INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
SELECT f.Name, f.CategoryId, f.Price, f.Stock, f.Unit, '2024-07-01'
FROM   dbo.SupplierFeed AS f
WHERE  NOT EXISTS (SELECT 1 FROM dbo.Products AS p WHERE p.Name = f.Name);

COMMIT;

SELECT ProductId, Name, Price, Stock
FROM dbo.Products
WHERE ProductId IN (1, 4, 5) OR ProductId > 12
ORDER BY ProductId;`, output: 'ProductId  Name          Price  Stock\n---------  ------------  -----  -----\n        1  Claw hammer   19.50     55\n        4  Cement 25 kg   7.20    300\n        5  Sand 25 kg     4.30    260\n       13  Garden spade  24.00     15\n       14  Pipe cutter   16.50     10' },
      { type: 'p', text: 'This is clear and works well. The `WHERE` on the UPDATE skips rows that would not change, such as the cement. The transaction makes the pair all-or-nothing.' },
      { type: 'h2', text: 'MERGE: one statement' },
      { type: 'p', text: '`MERGE` compares a **target** table with a **source** on a join condition, and says what to do in each case:' },
      { type: 'code', code: sql`
MERGE dbo.Products AS t
USING dbo.SupplierFeed AS s
   ON t.Name = s.Name
WHEN MATCHED AND (t.Price <> s.Price OR t.Stock <> s.Stock) THEN
    UPDATE SET t.Price = s.Price, t.Stock = s.Stock
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Name, CategoryId, Price, Stock, Unit, AddedOn)
    VALUES (s.Name, s.CategoryId, s.Price, s.Stock, s.Unit, '2024-07-01')
OUTPUT $action AS Action, inserted.ProductId, inserted.Name,
       deleted.Price AS OldPrice, inserted.Price AS NewPrice;`, output: 'Action  ProductId  Name          OldPrice  NewPrice\n------  ---------  ------------  --------  --------\nINSERT         13  Garden spade      NULL     24.00\nINSERT         14  Pipe cutter       NULL     16.50\nUPDATE          1  Claw hammer      18.50     19.50\nUPDATE          5  Sand 25 kg        4.10      4.30' },
      { type: 'table', head: ['Clause', 'The row is', 'Allowed actions'], rows: [
        ['`WHEN MATCHED [AND …]`', 'in both target and source', 'UPDATE or DELETE'],
        ['`WHEN NOT MATCHED [BY TARGET] [AND …]`', 'in the source only', 'INSERT'],
        ['`WHEN NOT MATCHED BY SOURCE [AND …]`', 'in the target only', 'UPDATE or DELETE']
      ] },
      { type: 'p', text: 'In `OUTPUT`, `$action` says what happened to each row: INSERT, UPDATE or DELETE. `deleted.` holds the values before and `inserted.` the values after, so OldPrice is NULL for the inserts. The cement matched, but its `AND` test was false, so nothing happened to it and it is not in the output.' },
      { type: 'note', kind: 'warn', text: 'A MERGE statement **must** end with a semicolon. Leave it off and you get error 10713.' },
      { type: 'widget', name: 'merge-sync' },
      { type: 'h2', text: 'OUTPUT INTO: keep a record' },
      { type: 'p', text: '`OUTPUT … INTO` writes the output rows into a table (or table variable) instead of returning them. It works on INSERT, UPDATE, DELETE and MERGE, and makes a change log in the same statement. Here a 10% price rise on Paint is logged:' },
      { type: 'code', code: sql`
DECLARE @log TABLE (ProductId int, OldPrice decimal(10,2), NewPrice decimal(10,2));

UPDATE dbo.Products
SET Price = CAST(Price * 1.10 AS decimal(10,2))
OUTPUT inserted.ProductId, deleted.Price, inserted.Price INTO @log
WHERE CategoryId = 5;

SELECT l.ProductId, p.Name, l.OldPrice, l.NewPrice, l.NewPrice - l.OldPrice AS Rise
FROM @log AS l
JOIN dbo.Products AS p ON p.ProductId = l.ProductId
ORDER BY l.ProductId;`, output: 'ProductId  Name                OldPrice  NewPrice  Rise\n---------  ------------------  --------  --------  ----\n       10  Masonry paint 10 L     54.00     59.40  5.40\n       11  Paint roller set       12.50     13.75  1.25' },
      { type: 'h2', text: 'A full sync: NOT MATCHED BY SOURCE' },
      { type: 'p', text: 'The third clause handles rows that are in the target but **missing from the source**. It turns MERGE into a sync that makes the target match the source exactly. A branch keeps its own stock table, and a stocktake has just counted the shelves:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.BranchStock (ProductId int PRIMARY KEY, Qty int NOT NULL);
INSERT INTO dbo.BranchStock VALUES (1, 40), (3, 65), (9, 5), (12, 0);

CREATE TABLE dbo.Stocktake (ProductId int NOT NULL, Qty int NOT NULL);
INSERT INTO dbo.Stocktake VALUES (1, 38), (3, 65), (5, 20), (12, 6);`
      },
      { type: 'code', code: sql`
MERGE dbo.BranchStock AS t
USING dbo.Stocktake AS s
   ON t.ProductId = s.ProductId
WHEN MATCHED AND t.Qty <> s.Qty THEN
    UPDATE SET t.Qty = s.Qty
WHEN NOT MATCHED BY TARGET THEN
    INSERT (ProductId, Qty) VALUES (s.ProductId, s.Qty)
WHEN NOT MATCHED BY SOURCE THEN
    DELETE
OUTPUT $action AS Action,
       COALESCE(inserted.ProductId, deleted.ProductId) AS ProductId,
       deleted.Qty AS OldQty, inserted.Qty AS NewQty;

SELECT * FROM dbo.BranchStock ORDER BY ProductId;`, output: 'Action  ProductId  OldQty  NewQty\n------  ---------  ------  ------\nINSERT          5    NULL      20\nUPDATE          1      40      38\nDELETE          9       5    NULL\nUPDATE         12       0       6\n\nProductId  Qty\n---------  ---\n        1   38\n        3   65\n        5   20\n       12    6' },
      { type: 'p', text: 'Product 9 was on the branch’s list but not counted, so it was deleted. For a DELETE, `inserted.` is all NULL, which is why ProductId comes from whichever side has it.' },
      { type: 'h2', text: 'Trap 1: an unscoped NOT MATCHED BY SOURCE' },
      { type: 'p', text: '“In the target but not in the source” means **every** target row the source does not mention. Sync a feed that covers one category into the whole Products table and every other product is a candidate for deletion. Scope the target with a CTE, so MERGE only sees the rows the source is about:' },
      { type: 'code', code: sql`
WITH Building AS (
    SELECT * FROM dbo.Products WHERE CategoryId = 2
)
MERGE Building AS t
USING (SELECT Name, Price FROM dbo.SupplierFeed WHERE CategoryId = 2) AS s
   ON t.Name = s.Name
WHEN MATCHED AND t.Price <> s.Price THEN
    UPDATE SET t.Price = s.Price
WHEN NOT MATCHED BY SOURCE THEN
    UPDATE SET t.Stock = 0          -- not in the feed: mark as unavailable
OUTPUT $action AS Action, inserted.Name, inserted.Price, inserted.Stock;`, output: 'Action  Name        Price  Stock\n------  ----------  -----  -----\nUPDATE  Sand 25 kg   4.30    220' },
      { type: 'p', text: 'Both Building products are in the feed, so the NOT MATCHED BY SOURCE clause found nothing to do. Without the CTE it would have zeroed the stock of all ten other products.' },
      { type: 'h2', text: 'Trap 2: duplicate source rows' },
      { type: 'p', text: 'Each target row may be changed only **once** by a MERGE. If two source rows match the same target row, SQL Server cannot know which one wins, and stops:' },
      { type: 'code', code: sql`
CREATE TABLE #Prices (Name nvarchar(60), Price decimal(10,2));
INSERT INTO #Prices VALUES (N'Claw hammer', 19.50), (N'Claw hammer', 19.95);

MERGE dbo.Products AS t
USING #Prices AS s ON t.Name = s.Name
WHEN MATCHED THEN UPDATE SET t.Price = s.Price;`, output: 'Msg 8672, Level 16, State 1, Line 4\nThe MERGE statement attempted to UPDATE or DELETE the same row more than once. This happens when a target row matches more than one source row. A MERGE statement cannot UPDATE/DELETE the same row of the target table multiple times. Refine the ON clause to ensure a target row matches at most one source row, or use the GROUP BY clause to group the source rows.' },
      { type: 'p', text: 'Fix the source first: decide which row wins (the latest, the highest) with ROW_NUMBER or GROUP BY in a CTE, and MERGE from that.' },
      { type: 'h2', text: 'Trap 3: two sessions at once' },
      { type: 'p', text: 'MERGE is one statement, but it is not safe against a race by default. Two sessions can both find “not matched” for the same new product and both insert it, giving a duplicate or a key violation. For an upsert that runs concurrently, add a lock hint to the target:' },
      { type: 'code', code: sql`
MERGE dbo.Products WITH (HOLDLOCK) AS t
USING (VALUES (N'Garden spade', 1, 24.00, 15, N'each'))
      AS s (Name, CategoryId, Price, Stock, Unit)
   ON t.Name = s.Name
WHEN MATCHED THEN
    UPDATE SET t.Price = s.Price, t.Stock = s.Stock
WHEN NOT MATCHED THEN
    INSERT (Name, CategoryId, Price, Stock, Unit, AddedOn)
    VALUES (s.Name, s.CategoryId, s.Price, s.Stock, s.Unit, '2024-07-01')
OUTPUT $action AS Action, inserted.ProductId, inserted.Name;`, output: 'Action  ProductId  Name\n------  ---------  ------------\nINSERT         13  Garden spade' },
      { type: 'p', text: '`HOLDLOCK` (the same as SERIALIZABLE for this table) keeps a lock on the key range it checked until the statement ends, so a second session waits instead of inserting the same name. The same applies to the two-statement upsert: use `WITH (UPDLOCK, HOLDLOCK)` on the existence check inside the transaction. Locking is covered in the transactions module.' },
      { type: 'note', kind: 'info', text: 'Many teams prefer the two-statement upsert for everyday work. It is easier to read and debug, and MERGE has had bugs over the years with some features (filtered indexes, triggers, indexed views). MERGE shines for real syncs with all three clauses and an OUTPUT log.' },
      { type: 'quiz', question: 'In a MERGE, a row exists in the target but not in the source. Which clause handles it?', options: ['WHEN MATCHED', 'WHEN NOT MATCHED BY TARGET', 'WHEN NOT MATCHED BY SOURCE', 'No clause: such rows are ignored'], answer: 2, explain: 'NOT MATCHED BY SOURCE means the source has no row for it. NOT MATCHED (BY TARGET) is the opposite: in the source, missing from the target.' },
      { type: 'quiz', question: 'In the OUTPUT of a MERGE, what is in `deleted.Qty` for a row that was inserted?', options: ['The new Qty', '0', 'NULL', 'The source Qty'], answer: 2, explain: 'deleted holds the row as it was before the change. An inserted row had no “before”, so all its deleted. columns are NULL. For a deleted row it is the other way round.' },
      { type: 'exercise', task: 'Upsert a single product with MERGE: set the Cordless drill’s Price to 84.00 and its Stock to 20 if it exists, or insert it in category 1 with Unit \'each\' if not. Return the action, ProductId, old price and new price.', hint: 'USING (VALUES (N\'Cordless drill\', 84.00, 20)) AS s (Name, Price, Stock), ON t.Name = s.Name, then WHEN MATCHED … WHEN NOT MATCHED … OUTPUT $action, …', solution: sql`
MERGE dbo.Products AS t
USING (VALUES (N'Cordless drill', 84.00, 20)) AS s (Name, Price, Stock)
   ON t.Name = s.Name
WHEN MATCHED THEN
    UPDATE SET t.Price = s.Price, t.Stock = s.Stock
WHEN NOT MATCHED THEN
    INSERT (Name, CategoryId, Price, Stock, Unit, AddedOn)
    VALUES (s.Name, 1, s.Price, s.Stock, N'each', '2024-07-01')
OUTPUT $action AS Action, inserted.ProductId,
       deleted.Price AS OldPrice, inserted.Price AS NewPrice;`, output: 'Action  ProductId  OldPrice  NewPrice\n------  ---------  --------  --------\nUPDATE          2     89.00     84.00' }
    ],
    keyPoints: [
      'An upsert updates the rows that exist and inserts the rest: UPDATE … JOIN, then INSERT … WHERE NOT EXISTS, in a transaction.',
      'MERGE does it in one statement: target, USING source, ON condition, and WHEN clauses.',
      'WHEN MATCHED (update/delete), NOT MATCHED BY TARGET (insert), NOT MATCHED BY SOURCE (update/delete).',
      'OUTPUT $action, deleted.* and inserted.* show what happened to each row; OUTPUT INTO saves it.',
      'MERGE must end with a semicolon.',
      'Scope NOT MATCHED BY SOURCE with a CTE on the target, or it touches every row the source omits.',
      'A target row matched by two source rows is an error: deduplicate the source first.',
      'Concurrent upserts need WITH (HOLDLOCK), or UPDLOCK, HOLDLOCK on the two-statement version.'
    ]
  }
];
