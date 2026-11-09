import { Lesson } from '../learn.types';
import { sql } from './sql';

export const JOINS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'relationships-keys',
    title: 'Relationships and foreign keys',
    summary: 'Why BuildMart’s data is spread over five tables, how primary and foreign keys tie them together, and the three kinds of relationship: one-to-many, many-to-many and one-to-one.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'An order in BuildMart is not one row. Who placed it lives in **Customers**, when and its status in **Orders**, what was bought in **OrderItems**, and what those products are in **Products**. Each fact is stored once, in the table it belongs to, and **keys** link the pieces back together.' },
      { type: 'table', head: ['Key', 'What it is', 'In BuildMart'], rows: [
        ['**Primary key**', 'the column(s) that identify each row; unique and never NULL', '`Customers.CustomerId`, `Orders.OrderId`'],
        ['**Foreign key**', 'a column holding another table’s primary key value, so it points at one row there', '`Orders.CustomerId` → `Customers.CustomerId`'],
        ['**Composite key**', 'a primary key made of more than one column', '`OrderItems (OrderId, ProductId)`']
      ] },
      { type: 'widget', name: 'key-follow' },
      { type: 'h2', text: 'Following the keys by hand' },
      { type: 'p', text: 'Without joins, putting order 7 back together takes four queries. Each one takes a value from the previous result and looks it up in the next table:' },
      { type: 'code', code: sql`
SELECT OrderId, CustomerId, OrderDate, Status FROM dbo.Orders WHERE OrderId = 7;
SELECT CustomerId, FirstName, LastName, City FROM dbo.Customers WHERE CustomerId = 4;
SELECT OrderId, ProductId, Quantity, UnitPrice FROM dbo.OrderItems WHERE OrderId = 7;
SELECT ProductId, Name, Price FROM dbo.Products WHERE ProductId IN (4, 8);`, output: 'OrderId  CustomerId  OrderDate   Status\n-------  ----------  ----------  -------\n      7           4  2024-05-05  Shipped\n\nCustomerId  FirstName  LastName  City\n----------  ---------  --------  --------\n         4  Dev        Singh     Bradford\n\nOrderId  ProductId  Quantity  UnitPrice\n-------  ---------  --------  ---------\n      7          4        20       7.00\n      7          8         5      11.90\n\nProductId  Name               Price\n---------  -----------------  -----\n        4  Cement 25 kg        7.20\n        8  Wood screws (200)  11.90' },
      { type: 'p', text: 'You had to read the 4 and the 4, 8 off the screen and type them into the next query. A **join** does those lookups inside one query, which is the rest of this module.' },
      { type: 'h2', text: 'Three kinds of relationship' },
      { type: 'table', head: ['Kind', 'Meaning', 'How it is built', 'Example'], rows: [
        ['**One-to-many**', 'one row here, any number of rows there', 'a foreign key on the “many” side', 'one customer, many orders'],
        ['**Many-to-many**', 'many on both sides', 'a third **junction table** with two foreign keys', 'orders ↔ products, through OrderItems'],
        ['**One-to-one**', 'at most one row on each side', 'a foreign key that is also the primary key (or UNIQUE)', 'a customer and their login']
      ] },
      { type: 'p', text: 'One-to-many is by far the most common. The foreign key always goes on the “many” side: an order holds its CustomerId, because a customer cannot hold a list of order numbers in one column.' },
      { type: 'p', text: 'Many-to-many needs a table in the middle. An order contains many products and a product appears on many orders, so each **pair** gets a row in OrderItems. Its composite primary key `(OrderId, ProductId)` stops the same product being listed twice on one order, and the pair is a good place for facts that belong to it, such as Quantity and UnitPrice.' },
      { type: 'h2', text: 'A one-to-one relationship' },
      { type: 'p', text: 'Login details are only needed by the website, so they can live in their own table. Making CustomerId both the primary key and a foreign key allows **at most one** login per customer:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.CustomerLogins (
    CustomerId int          NOT NULL
        CONSTRAINT PK_CustomerLogins PRIMARY KEY
        CONSTRAINT FK_CustomerLogins_Customers REFERENCES dbo.Customers (CustomerId),
    UserName   nvarchar(40) NOT NULL UNIQUE,
    LastLogin  datetime2(0) NULL
);

INSERT INTO dbo.CustomerLogins (CustomerId, UserName) VALUES (1, N'asha.p');
INSERT INTO dbo.CustomerLogins (CustomerId, UserName) VALUES (1, N'asha.second');`, output: 'Msg 2627, Level 14, State 1, Line 10\nViolation of PRIMARY KEY constraint \'PK_CustomerLogins\'. Cannot insert duplicate key in object \'dbo.CustomerLogins\'. The duplicate key value is (1).' },
      { type: 'note', kind: 'info', text: 'Real one-to-one tables are rare. Use one to split off columns that are large, rarely read or more sensitive (a password hash, say), or that only some rows have.' },
      { type: 'h2', text: 'Natural or surrogate keys?' },
      { type: 'p', text: 'A **natural key** is a real-world value that is already unique, such as an email address or a product barcode. A **surrogate key** is a number made up by the database, such as an IDENTITY column. BuildMart uses surrogate keys everywhere, and that is the usual choice:' },
      { type: 'ul', items: [
        'Natural values change: people change email address, and every foreign key pointing at the old one would have to change too. A surrogate never needs to.',
        'A small `int` makes foreign keys and indexes smaller and faster than a long text value.',
        'Keep the natural value unique anyway with a **UNIQUE** constraint, as CustomerLogins does with UserName.'
      ] },
      { type: 'h2', text: 'Listing the relationships of a database' },
      { type: 'p', text: 'SQL Server keeps every foreign key in its catalog views, so you can list the relationships of a database you have never seen before:' },
      { type: 'code', code: sql`
SELECT OBJECT_NAME(parent_object_id) AS ChildTable,
       COL_NAME(parent_object_id, parent_column_id) AS ForeignKey,
       OBJECT_NAME(referenced_object_id) AS ParentTable,
       COL_NAME(referenced_object_id, referenced_column_id) AS PointsAt
FROM sys.foreign_key_columns
ORDER BY ChildTable, ForeignKey;`, output: 'ChildTable  ForeignKey  ParentTable  PointsAt\n----------  ----------  -----------  ----------\nOrderItems  OrderId     Orders       OrderId\nOrderItems  ProductId   Products     ProductId\nOrders      CustomerId  Customers    CustomerId\nProducts    CategoryId  Categories   CategoryId' },
      { type: 'note', kind: 'warn', text: 'SQL Server indexes primary keys automatically, but **not** foreign keys. Joins and the foreign key checks on DELETE both search the foreign key column, so on a big table it usually needs an index of its own. The Indexes module shows how.' },
      { type: 'quiz', question: 'Teachers teach many classes, and each class has one teacher. Where does the foreign key go?', options: ['Teachers.ClassId', 'Classes.TeacherId', 'In a junction table TeacherClasses', 'In both tables'], answer: 1, explain: 'This is one-to-many, so the foreign key goes on the “many” side: each class stores its one TeacherId. A junction table is only needed for many-to-many.' },
      { type: 'quiz', question: 'Students take many courses, and courses have many students. What do you need?', options: ['Students.CourseId', 'Courses.StudentId', 'A junction table with StudentId and CourseId', 'A comma-separated list of course IDs in Students'], answer: 2, explain: 'Many-to-many needs a junction table, one row per student-course pair, with a composite primary key (StudentId, CourseId). A list in one column cannot be joined, indexed or checked by a foreign key.' },
      { type: 'exercise', task: 'Without using a join, find out who placed order 9 (first and last name) and the names of the products on it. Use one query per lookup.', hint: 'Orders gives you the CustomerId; OrderItems with OrderId = 9 gives the ProductIds; then look those up in Customers and Products.', solution: sql`
SELECT CustomerId FROM dbo.Orders WHERE OrderId = 9;
SELECT FirstName, LastName FROM dbo.Customers WHERE CustomerId = 2;
SELECT ProductId, Quantity FROM dbo.OrderItems WHERE OrderId = 9;
SELECT Name FROM dbo.Products WHERE ProductId = 9;`, output: 'CustomerId\n----------\n         2\n\nFirstName  LastName\n---------  --------\nBen        Carter\n\nProductId  Quantity\n---------  --------\n        9         4\n\nName\n----------------\nWall plugs (100)' }
    ],
    keyPoints: [
      'A primary key identifies each row; a foreign key holds another table’s primary key value and points at one row there.',
      'One-to-many: the foreign key goes on the “many” side.',
      'Many-to-many: a junction table with two foreign keys and a composite primary key.',
      'One-to-one: a foreign key that is also the primary key (or UNIQUE).',
      'Surrogate keys (IDENTITY) are the usual choice; keep natural values unique with UNIQUE.',
      'Foreign keys are not indexed automatically.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'inner-join',
    title: 'INNER JOIN: matching rows across tables',
    summary: 'Combine rows from two or more tables where a condition matches: join syntax, table aliases, joining four tables at once, ambiguous columns, and why a wrong ON condition fails silently.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'A join puts rows from two tables side by side. `INNER JOIN` returns one row for every **pair** of rows, one from each table, for which the `ON` condition is true. Rows that find no partner are left out.' },
      { type: 'code', code: sql`
SELECT o.OrderId, o.OrderDate, c.FirstName, c.LastName
FROM dbo.Orders AS o
INNER JOIN dbo.Customers AS c
    ON c.CustomerId = o.CustomerId
ORDER BY o.OrderId;`, output: 'OrderId  OrderDate   FirstName  LastName\n-------  ----------  ---------  --------\n      1  2024-02-03  Asha       Patel\n      2  2024-02-10  Ben        Carter\n      3  2024-03-01  Asha       Patel\n      4  2024-03-15  Dev        Singh\n      5  2024-04-02  Farid      Khan\n      6  2024-04-20  Chloe      Evans\n      7  2024-05-05  Dev        Singh\n      8  2024-05-18  Zoë        Müller\n      9  2024-06-01  Ben        Carter\n     10  2024-06-12  Farid      Khan' },
      { type: 'ul', items: [
        '`o` and `c` are **table aliases**. They are short names for the tables in this query, and `o.OrderDate` means “OrderDate from Orders”.',
        '`ON` says which rows belong together, almost always a foreign key = the primary key it points at.',
        '`INNER` is optional: a plain `JOIN` is an inner join.'
      ] },
      { type: 'widget', name: 'join-inner' },
      { type: 'p', text: 'A customer with two orders appears twice, once paired with each order. A customer with no orders (Ella, Grace) does not appear at all. That is what “inner” means: only matched rows. The next lesson keeps the unmatched ones.' },
      { type: 'h2', text: 'Ambiguous column names' },
      { type: 'p', text: 'Both tables have a CustomerId column. If you name it without saying which table, SQL Server refuses:' },
      { type: 'code', code: sql`
SELECT OrderId, CustomerId, FirstName
FROM dbo.Orders AS o
JOIN dbo.Customers AS c ON c.CustomerId = o.CustomerId;`, output: 'Msg 209, Level 16, State 1, Line 1\nAmbiguous column name \'CustomerId\'.' },
      { type: 'note', kind: 'tip', text: 'Prefix every column in a join query with its alias, even the ones that are not ambiguous today. Someone may add a column with the same name to the other table later, and then the query stops working.' },
      { type: 'h2', text: 'Joining more than two tables' },
      { type: 'p', text: 'Each extra `JOIN` brings in one more table, with its own `ON` condition linking it to a table already in the query. This follows the path order → customer, order → lines → products, and works out each line’s total:' },
      { type: 'code', code: sql`
SELECT o.OrderId, c.FirstName, p.Name AS Product,
       oi.Quantity, oi.UnitPrice,
       oi.Quantity * oi.UnitPrice AS LineTotal
FROM dbo.Orders AS o
JOIN dbo.Customers  AS c  ON c.CustomerId = o.CustomerId
JOIN dbo.OrderItems AS oi ON oi.OrderId   = o.OrderId
JOIN dbo.Products   AS p  ON p.ProductId  = oi.ProductId
WHERE o.OrderId <= 3
ORDER BY o.OrderId, p.Name;`, output: 'OrderId  FirstName  Product            Quantity  UnitPrice  LineTotal\n-------  ---------  -----------------  --------  ---------  ---------\n      1  Asha       Claw hammer               1      18.50      18.50\n      1  Asha       Tape measure 8 m          2       9.75      19.50\n      2  Ben        Cement 25 kg             10       7.20      72.00\n      2  Ben        Sand 25 kg               10       4.10      41.00\n      3  Asha       Cordless drill            1      89.00      89.00\n      3  Asha       Wood screws (200)         2      11.90      23.80' },
      { type: 'p', text: 'The order of the tables in the FROM clause does not change the result of inner joins. Start wherever reads naturally. Here the question is about products, so the query starts from the order lines and fetches the rest:' },
      { type: 'code', code: sql`
SELECT c.FirstName, c.City, p.Name AS Product, o.OrderDate
FROM dbo.OrderItems AS oi
JOIN dbo.Products   AS p   ON p.ProductId    = oi.ProductId
JOIN dbo.Categories AS cat ON cat.CategoryId = p.CategoryId
JOIN dbo.Orders     AS o   ON o.OrderId      = oi.OrderId
JOIN dbo.Customers  AS c   ON c.CustomerId   = o.CustomerId
WHERE cat.Name = N'Tools'
ORDER BY o.OrderDate;`, output: 'FirstName  City       Product           OrderDate\n---------  ---------  ----------------  ----------\nAsha       Leeds      Claw hammer       2024-02-03\nAsha       Leeds      Tape measure 8 m  2024-02-03\nAsha       Leeds      Cordless drill    2024-03-01\nZoë        Harrogate  Claw hammer       2024-05-18\nFarid      York       Tape measure 8 m  2024-06-12' },
      { type: 'h2', text: 'ON can test more than keys' },
      { type: 'p', text: 'The ON condition can be any true-or-false test. This one pairs each order line with its product only when the price paid was lower than the list price, which finds discounts:' },
      { type: 'code', code: sql`
SELECT oi.OrderId, p.Name, p.Price AS ListPrice, oi.UnitPrice AS PricePaid
FROM dbo.OrderItems AS oi
JOIN dbo.Products AS p
    ON p.ProductId = oi.ProductId
   AND oi.UnitPrice < p.Price;`, output: 'OrderId  Name          ListPrice  PricePaid\n-------  ------------  ---------  ---------\n      7  Cement 25 kg       7.20       7.00' },
      { type: 'note', kind: 'warn', text: 'A wrong ON condition does not cause an error. In the widget above, `o.OrderId = c.CustomerId` returns eight tidy-looking rows that are all wrong. Always join a foreign key to the primary key it references, and check a few rows by hand.' },
      { type: 'h2', text: 'The old comma syntax' },
      { type: 'p', text: 'Older code lists the tables with commas and puts the join condition in WHERE. It gives the same result:' },
      { type: 'code', code: sql`
SELECT o.OrderId, c.FirstName
FROM dbo.Orders AS o, dbo.Customers AS c
WHERE c.CustomerId = o.CustomerId
  AND o.Status = 'Pending';`, output: 'OrderId  FirstName\n-------  ---------\n      8  Zoë\n      9  Ben' },
      { type: 'p', text: 'Prefer `JOIN … ON`. It keeps each join condition next to its table, separate from the filters, and if you forget a condition you get a syntax error. With commas, a forgotten condition silently pairs every row with every row (a CROSS JOIN, two lessons on).' },
      { type: 'quiz', question: 'Customers has 8 rows and Orders has 10, and every order has a valid CustomerId. How many rows does `Customers JOIN Orders ON o.CustomerId = c.CustomerId` return?', options: ['8', '10', '18', '80'], answer: 1, explain: 'Each order matches exactly one customer, so there is one row per order: 10. Customers without orders are not included and customers with several orders repeat.' },
      { type: 'quiz', question: 'Why does `SELECT CustomerId FROM dbo.Orders o JOIN dbo.Customers c ON …` fail?', options: ['CustomerId is a key', 'Both tables have a CustomerId column, so the name is ambiguous', 'Aliases cannot be used in SELECT', 'Joins need SELECT *'], answer: 1, explain: 'Msg 209: ambiguous column name. Write o.CustomerId or c.CustomerId. Prefixing every column in a join query is a good habit.' },
      { type: 'exercise', task: 'List the lines of all **Pending** orders: the order number, the customer’s first name, the product name and the quantity, sorted by order number and then product name.', hint: 'Join Orders, Customers, OrderItems and Products, then filter on o.Status.', solution: sql`
SELECT o.OrderId, c.FirstName, p.Name AS Product, oi.Quantity
FROM dbo.Orders AS o
JOIN dbo.Customers  AS c  ON c.CustomerId = o.CustomerId
JOIN dbo.OrderItems AS oi ON oi.OrderId   = o.OrderId
JOIN dbo.Products   AS p  ON p.ProductId  = oi.ProductId
WHERE o.Status = 'Pending'
ORDER BY o.OrderId, p.Name;`, output: 'OrderId  FirstName  Product              Quantity\n-------  ---------  -------------------  --------\n      8  Zoë        Claw hammer                 1\n      8  Zoë        Plywood sheet 18 mm         2\n      9  Ben        Wall plugs (100)            4' }
    ],
    keyPoints: [
      'INNER JOIN returns one row for every pair of rows for which ON is true; unmatched rows are dropped.',
      'Use table aliases and prefix every column: o.OrderId, c.FirstName.',
      'Join a foreign key to the primary key it references; a wrong condition still runs, with wrong results.',
      'Add one JOIN … ON per extra table. For inner joins, the order of the tables does not change the result.',
      'Prefer JOIN … ON to commas in FROM: a forgotten condition becomes an error instead of a CROSS JOIN.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'outer-joins',
    title: 'LEFT, RIGHT and FULL OUTER JOIN',
    summary: 'Keep the rows that find no match: LEFT, RIGHT and FULL joins, NULLs for the missing side, finding rows with no partner, and the two classic mistakes that turn an outer join back into an inner one.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'An inner join hides customers who never ordered. Often those are exactly the rows you want: products that never sold, categories with nothing in them. An **outer join** keeps every row of one table (or both) and fills the columns of the missing partner with NULL.' },
      { type: 'code', code: sql`
SELECT c.FirstName, o.OrderId, o.OrderDate
FROM dbo.Customers AS c
LEFT JOIN dbo.Orders AS o
    ON o.CustomerId = c.CustomerId
ORDER BY c.CustomerId, o.OrderId;`, output: 'FirstName  OrderId  OrderDate\n---------  -------  ----------\nAsha             1  2024-02-03\nAsha             3  2024-03-01\nBen              2  2024-02-10\nBen              9  2024-06-01\nChloe            6  2024-04-20\nDev              4  2024-03-15\nDev              7  2024-05-05\nElla          NULL  NULL\nFarid            5  2024-04-02\nFarid           10  2024-06-12\nGrace         NULL  NULL\nZoë              8  2024-05-18' },
      { type: 'p', text: '`LEFT JOIN` (or `LEFT OUTER JOIN`) keeps every row of the table on its left, here Customers. Ella and Grace now appear once each, with NULL in the Orders columns.' },
      { type: 'h2', text: 'Finding rows with no partner' },
      { type: 'p', text: 'The NULLs are useful: keep only the rows where the right side is missing, and you have the customers who never ordered. Test a column that cannot be NULL in a real match, such as the right table’s primary key:' },
      { type: 'code', code: sql`
SELECT c.CustomerId, c.FirstName, c.JoinedOn
FROM dbo.Customers AS c
LEFT JOIN dbo.Orders AS o ON o.CustomerId = c.CustomerId
WHERE o.OrderId IS NULL;`, output: 'CustomerId  FirstName  JoinedOn\n----------  ---------  ----------\n         5  Ella       2023-09-14\n         7  Grace      2024-01-08' },
      { type: 'h2', text: 'All four join types' },
      { type: 'widget', name: 'join-outer' },
      { type: 'table', head: ['Join', 'Keeps unmatched rows from', 'Missing side is'], rows: [
        ['`INNER JOIN`', 'neither table', '(never missing)'],
        ['`LEFT JOIN`', 'the left table', 'NULL on the right'],
        ['`RIGHT JOIN`', 'the right table', 'NULL on the left'],
        ['`FULL JOIN`', 'both tables', 'NULL on either side']
      ] },
      { type: 'p', text: 'Plumbing is a category with no products yet. A LEFT JOIN from Categories shows it, and `COALESCE` replaces the NULL with something readable:' },
      { type: 'code', code: sql`
SELECT cat.Name AS Category, COALESCE(p.Name, N'(no products)') AS Product
FROM dbo.Categories AS cat
LEFT JOIN dbo.Products AS p ON p.CategoryId = cat.CategoryId
WHERE cat.CategoryId >= 5
ORDER BY cat.CategoryId, p.Name;`, output: 'Category  Product\n--------  ------------------\nPaint     Masonry paint 10 L\nPaint     Paint roller set\nSafety    Safety goggles\nPlumbing  (no products)' },
      { type: 'p', text: '`RIGHT JOIN` is the same as LEFT JOIN with the two tables swapped, so `Products RIGHT JOIN Categories` gives the result above. Most people only use LEFT JOIN and write the table whose rows must all be kept first; a query mixing LEFT and RIGHT is hard to read.' },
      { type: 'p', text: '`FULL JOIN` keeps unmatched rows from both sides. Products.CategoryId allows NULL, so add a gift voucher that belongs to no category, then list everything that has no partner:' },
      { type: 'code', code: sql`
INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (N'Gift voucher', NULL, 20.00, 100, N'each', '2024-06-01');

SELECT cat.Name AS Category, p.Name AS Product
FROM dbo.Categories AS cat
FULL JOIN dbo.Products AS p ON p.CategoryId = cat.CategoryId
WHERE cat.CategoryId IS NULL OR p.ProductId IS NULL
ORDER BY Category;`, output: 'Category  Product\n--------  ------------\nNULL      Gift voucher\nPlumbing  NULL' },
      { type: 'h2', text: 'Mistake 1: filtering the outer table in WHERE' },
      { type: 'p', text: 'Show every customer with their pending order, if they have one. Putting the status test in WHERE looks right, but returns only two customers:' },
      { type: 'code', code: sql`
SELECT c.FirstName, o.OrderId, o.Status
FROM dbo.Customers AS c
LEFT JOIN dbo.Orders AS o ON o.CustomerId = c.CustomerId
WHERE o.Status = 'Pending';`, output: 'FirstName  OrderId  Status\n---------  -------  -------\nZoë              8  Pending\nBen              9  Pending' },
      { type: 'p', text: 'WHERE runs **after** the join. For customers without a pending order, `o.Status` is NULL or another status, the test is not true, and the row is thrown away, the very rows the LEFT JOIN kept. Move the test into ON: then it only decides which orders match, and every customer survives:' },
      { type: 'code', code: sql`
SELECT c.FirstName, o.OrderId, o.Status
FROM dbo.Customers AS c
LEFT JOIN dbo.Orders AS o
    ON o.CustomerId = c.CustomerId
   AND o.Status = 'Pending'
ORDER BY c.CustomerId;`, output: 'FirstName  OrderId  Status\n---------  -------  -------\nAsha          NULL  NULL\nBen              9  Pending\nChloe         NULL  NULL\nDev           NULL  NULL\nElla          NULL  NULL\nFarid         NULL  NULL\nGrace         NULL  NULL\nZoë              8  Pending' },
      { type: 'note', kind: 'tip', text: 'Rule of thumb for a LEFT JOIN: conditions on the **right** table go in ON; conditions on the **left** table go in WHERE. The one exception is the deliberate `WHERE right.Key IS NULL` that finds unmatched rows.' },
      { type: 'h2', text: 'Mistake 2: an inner join after an outer join' },
      { type: 'p', text: 'Ella and Grace survive the LEFT JOIN to Orders with a NULL OrderId. The next inner join needs `oi.OrderId = o.OrderId`, NULL matches nothing, and they are gone again:' },
      { type: 'code', code: sql`
SELECT c.FirstName, o.OrderId, oi.ProductId
FROM dbo.Customers AS c
LEFT JOIN dbo.Orders AS o ON o.CustomerId = c.CustomerId
JOIN dbo.OrderItems AS oi ON oi.OrderId = o.OrderId
WHERE c.CustomerId IN (5, 6, 7)
ORDER BY c.CustomerId, o.OrderId, oi.ProductId;`, output: 'FirstName  OrderId  ProductId\n---------  -------  ---------\nFarid            5         10\nFarid            5         11\nFarid           10          3\nFarid           10          6' },
      { type: 'p', text: 'Once a table has been outer joined, every join hanging off it must be an outer join too:' },
      { type: 'code', code: sql`
SELECT c.FirstName, o.OrderId, oi.ProductId
FROM dbo.Customers AS c
LEFT JOIN dbo.Orders     AS o  ON o.CustomerId = c.CustomerId
LEFT JOIN dbo.OrderItems AS oi ON oi.OrderId   = o.OrderId
WHERE c.CustomerId IN (5, 6, 7)
ORDER BY c.CustomerId, o.OrderId, oi.ProductId;`, output: 'FirstName  OrderId  ProductId\n---------  -------  ---------\nElla          NULL       NULL\nFarid            5         10\nFarid            5         11\nFarid           10          3\nFarid           10          6\nGrace         NULL       NULL' },
      { type: 'quiz', question: '`Customers LEFT JOIN Orders … WHERE o.Status = \'Shipped\'` returns the same rows as…', options: ['A FULL JOIN with the same WHERE', 'An INNER JOIN with the same WHERE', 'The LEFT JOIN without the WHERE', 'A CROSS JOIN'], answer: 1, explain: 'The WHERE test fails on every NULL-extended row, so only matched rows remain: exactly what an INNER JOIN returns. Put the test in ON to keep all customers.' },
      { type: 'quiz', question: 'How do you find products that appear on no order line?', options: ['Products JOIN OrderItems WHERE oi.OrderId IS NULL', 'Products LEFT JOIN OrderItems WHERE oi.OrderId IS NULL', 'Products LEFT JOIN OrderItems WHERE oi.OrderId = NULL', 'OrderItems LEFT JOIN Products WHERE p.ProductId IS NULL'], answer: 1, explain: 'Keep every product with a LEFT JOIN, then keep only those whose order-line columns are NULL. `= NULL` is never true, and an inner join has already dropped the unmatched products.' },
      { type: 'exercise', task: 'List every customer with their **shipped** orders (OrderId and OrderDate). Customers who have no shipped order must still appear, with NULLs. Sort by CustomerId, then OrderId.', hint: 'LEFT JOIN Orders, and put both the key match and the Status test in ON.', solution: sql`
SELECT c.FirstName, o.OrderId, o.OrderDate
FROM dbo.Customers AS c
LEFT JOIN dbo.Orders AS o
    ON o.CustomerId = c.CustomerId
   AND o.Status = 'Shipped'
ORDER BY c.CustomerId, o.OrderId;`, output: 'FirstName  OrderId  OrderDate\n---------  -------  ----------\nAsha             1  2024-02-03\nAsha             3  2024-03-01\nBen              2  2024-02-10\nChloe         NULL  NULL\nDev              4  2024-03-15\nDev              7  2024-05-05\nElla          NULL  NULL\nFarid            5  2024-04-02\nFarid           10  2024-06-12\nGrace         NULL  NULL\nZoë           NULL  NULL' }
    ],
    keyPoints: [
      'LEFT JOIN keeps every row of the left table; unmatched rows get NULL in the right table’s columns.',
      'RIGHT JOIN is LEFT JOIN with the tables swapped; FULL JOIN keeps unmatched rows from both sides.',
      'LEFT JOIN … WHERE right.Key IS NULL finds rows with no partner.',
      'Conditions on the right table belong in ON; in WHERE they turn the outer join into an inner join.',
      'After an outer join, the joins that hang off that table must be outer joins too.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'self-cross-joins',
    title: 'Self joins and CROSS JOIN',
    summary: 'Join a table to itself to compare its rows or walk a hierarchy, and use CROSS JOIN to pair every row with every row on purpose. Plus how to list each pair only once.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Nothing says the two sides of a join must be different tables. A **self join** uses the same table twice, under two aliases, to compare its rows with each other. A **CROSS JOIN** has no condition at all: every row of one side with every row of the other.' },
      { type: 'widget', name: 'pair-matrix' },
      { type: 'h2', text: 'Comparing rows of one table' },
      { type: 'p', text: 'Which customers live in the same city? Take Customers twice, as `c1` and `c2`, and match on City. Without more conditions you also get everyone paired with themself, and every pair twice. `c2.CustomerId > c1.CustomerId` keeps each pair once:' },
      { type: 'code', code: sql`
SELECT c1.FirstName AS Customer, c2.FirstName AS SameCityAs, c1.City
FROM dbo.Customers AS c1
JOIN dbo.Customers AS c2
    ON c2.City = c1.City
   AND c2.CustomerId > c1.CustomerId
ORDER BY c1.City, c1.CustomerId, c2.CustomerId;`, output: 'Customer  SameCityAs  City\n--------  ----------  -----\nAsha      Chloe       Leeds\nAsha      Grace       Leeds\nChloe     Grace       Leeds\nBen       Farid       York' },
      { type: 'p', text: 'The same pattern finds products that share a price:' },
      { type: 'code', code: sql`
SELECT a.Name, b.Name AS SamePriceAs, a.Price
FROM dbo.Products AS a
JOIN dbo.Products AS b
    ON b.Price = a.Price
   AND b.ProductId > a.ProductId;`, output: 'Name              SamePriceAs     Price\n----------------  --------------  -----\nTimber 2x4 2.4 m  Safety goggles   6.80' },
      { type: 'h2', text: 'Hierarchies: a foreign key to the same table' },
      { type: 'p', text: 'Staff have managers, and managers are staff. So the Staff table gets a **ManagerId** column that is a foreign key to its own primary key. The owner has no manager, so it allows NULL:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Staff (
    StaffId   int          NOT NULL PRIMARY KEY,
    Name      nvarchar(40) NOT NULL,
    JobTitle  nvarchar(40) NOT NULL,
    ManagerId int          NULL REFERENCES dbo.Staff (StaffId)
);
INSERT INTO dbo.Staff (StaffId, Name, JobTitle, ManagerId) VALUES
    (1, N'Mira',  N'Owner',           NULL),
    (2, N'Tom',   N'Store manager',   1),
    (3, N'Priya', N'Yard supervisor', 2),
    (4, N'Sam',   N'Sales assistant', 2),
    (5, N'Leo',   N'Yard hand',       3),
    (6, N'Nina',  N'Bookkeeper',      1);

SELECT s.Name AS Employee, s.JobTitle, m.Name AS Manager
FROM dbo.Staff AS s
LEFT JOIN dbo.Staff AS m ON m.StaffId = s.ManagerId
ORDER BY s.StaffId;`, output: 'Employee  JobTitle         Manager\n--------  ---------------  -------\nMira      Owner            NULL\nTom       Store manager    Mira\nPriya     Yard supervisor  Tom\nSam       Sales assistant  Tom\nLeo       Yard hand        Priya\nNina      Bookkeeper       Mira' },
      { type: 'p', text: '`s` is the employee and `m` is the same table playing the manager. It is a LEFT JOIN so that Mira, who has no manager, is not lost. Each extra level up needs one more join; for a whole tree of any depth there are recursive CTEs, in the next module.' },
      { type: 'h2', text: 'CROSS JOIN: every combination' },
      { type: 'p', text: 'Sometimes you really do want every combination. A quantity price list for building materials pairs each product with each quantity. The quantities do not live in a table, so a `VALUES` list in FROM makes a small table on the spot:' },
      { type: 'code', code: sql`
SELECT p.Name, q.Qty, p.Price * q.Qty AS Total
FROM dbo.Products AS p
CROSS JOIN (VALUES (1), (10), (50)) AS q (Qty)
WHERE p.CategoryId = 2
ORDER BY p.Name, q.Qty;`, output: 'Name          Qty   Total\n------------  ---  ------\nCement 25 kg    1    7.20\nCement 25 kg   10   72.00\nCement 25 kg   50  360.00\nSand 25 kg      1    4.10\nSand 25 kg     10   41.00\nSand 25 kg     50  205.00' },
      { type: 'p', text: 'A CROSS JOIN of m rows with n rows returns m × n rows. That is useful for building calendars, grids, and “every store × every product” checklists. It is also what a forgotten join condition produces, which is why the row count is worth a glance whenever a join result looks too big.' },
      { type: 'note', kind: 'warn', text: 'Two tables of 10,000 rows cross joined make 100,000,000 rows. If a query is unexpectedly slow and returns far too many rows, look for a table in FROM with no join condition.' },
      { type: 'quiz', question: 'Customers has 8 rows and Categories has 7. How many rows does `Customers CROSS JOIN Categories` return?', options: ['8', '15', '56', '7'], answer: 2, explain: 'Every customer with every category: 8 × 7 = 56.' },
      { type: 'quiz', question: 'In a self join listing pairs, why use `c2.CustomerId > c1.CustomerId` rather than `<>`?', options: ['`<>` is not allowed in ON', '`<>` still returns each pair twice, once in each order', '`>` is faster', '`<>` also returns each row with itself'], answer: 1, explain: '`<>` removes the row-with-itself pairs, but Asha–Chloe and Chloe–Asha are both still there. Requiring one ID to be larger keeps exactly one of the two.' },
      { type: 'exercise', task: 'A builder wants two **different** products from the **same category** that cost less than 20 together. List each such pair once, with both names and the combined price.', hint: 'Join Products to itself on CategoryId, keep each pair once with b.ProductId > a.ProductId, and filter on a.Price + b.Price < 20.', solution: sql`
SELECT a.Name, b.Name AS AndAlso, a.Price + b.Price AS Together
FROM dbo.Products AS a
JOIN dbo.Products AS b
    ON b.CategoryId = a.CategoryId
   AND b.ProductId > a.ProductId
WHERE a.Price + b.Price < 20;`, output: 'Name               AndAlso           Together\n-----------------  ----------------  --------\nCement 25 kg       Sand 25 kg           11.30\nWood screws (200)  Wall plugs (100)     16.40' }
    ],
    keyPoints: [
      'A self join uses one table twice under two aliases.',
      'To list pairs once, require one key to be greater than the other.',
      'Hierarchies use a foreign key to the same table; LEFT JOIN keeps the top of the tree.',
      'CROSS JOIN returns every combination: m × n rows.',
      'A VALUES list in FROM makes a small table inside the query.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'set-operators',
    title: 'UNION, INTERSECT and EXCEPT',
    summary: 'Stack and compare whole query results: UNION and UNION ALL, INTERSECT, EXCEPT, the rules both queries must follow, and how set operators treat duplicates and NULL.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Joins put columns side by side. **Set operators** work on whole rows instead: they take two queries with the same columns and combine their results top to bottom.' },
      { type: 'widget', name: 'set-venn' },
      { type: 'table', head: ['Operator', 'Returns', 'Duplicates'], rows: [
        ['`UNION`', 'rows from either query', 'removed'],
        ['`UNION ALL`', 'all rows from both queries', 'kept'],
        ['`INTERSECT`', 'rows found in both', 'removed'],
        ['`EXCEPT`', 'rows of the first query not in the second', 'removed']
      ] },
      { type: 'h2', text: 'UNION and UNION ALL' },
      { type: 'code', code: sql`
SELECT City FROM dbo.Customers WHERE CustomerId <= 4
UNION
SELECT City FROM dbo.Customers WHERE CustomerId >= 5
ORDER BY City;

SELECT City FROM dbo.Customers WHERE CustomerId <= 4
UNION ALL
SELECT City FROM dbo.Customers WHERE CustomerId >= 5
ORDER BY City;`, output: 'City\n---------\nNULL\nBradford\nHarrogate\nLeeds\nYork\n\nCity\n---------\nNULL\nBradford\nHarrogate\nLeeds\nLeeds\nLeeds\nYork\nYork' },
      { type: 'p', text: 'UNION removes duplicates across **and within** the two results: Leeds appears three times in the input but once in the output. UNION ALL just stacks them. Removing duplicates means sorting or hashing every row, so use UNION ALL when duplicates cannot happen or do not matter.' },
      { type: 'h2', text: 'The rules' },
      { type: 'ul', items: [
        'Both queries return the **same number of columns**, matched by position, not by name.',
        'Matching columns need compatible types; the result uses the type with the higher precedence.',
        'Column **names come from the first query**.',
        'There is one `ORDER BY`, at the very end, and it sorts the combined result.'
      ] },
      { type: 'code', code: sql`
SELECT CustomerId, FirstName FROM dbo.Customers
UNION
SELECT OrderId FROM dbo.Orders;`, output: 'Msg 205, Level 16, State 1, Line 1\nAll queries combined using a UNION, INTERSECT or EXCEPT operator must have an equal number of expressions in their target lists.' },
      { type: 'p', text: 'Matching a text column with a number makes SQL Server convert the text to a number (number types have the higher precedence), which fails at run time:' },
      { type: 'code', code: sql`
SELECT FirstName FROM dbo.Customers WHERE CustomerId = 1
UNION ALL
SELECT OrderId FROM dbo.Orders WHERE OrderId = 1;`, output: 'Msg 245, Level 16, State 1, Line 1\nConversion failed when converting the nvarchar value \'Asha\' to data type int.' },
      { type: 'p', text: 'UNION ALL is often used to build one list from different sources, with a literal column saying where each row came from. The names and the ORDER BY use the first query’s column names:' },
      { type: 'code', code: sql`
SELECT N'Joined' AS Event, FirstName AS Who, JoinedOn AS OnDate
FROM dbo.Customers
WHERE JoinedOn >= '2024-01-01'
UNION ALL
SELECT N'Ordered', c.FirstName, o.OrderDate
FROM dbo.Orders AS o
JOIN dbo.Customers AS c ON c.CustomerId = o.CustomerId
WHERE o.OrderDate < '2024-03-01'
ORDER BY OnDate;`, output: 'Event    Who    OnDate\n-------  -----  ----------\nJoined   Grace  2024-01-08\nOrdered  Asha   2024-02-03\nOrdered  Ben    2024-02-10\nJoined   Zoë    2024-02-15' },
      { type: 'h2', text: 'INTERSECT and EXCEPT' },
      { type: 'p', text: 'Which products sold in the first quarter but not in the second? Each query can be as complex as you like, joins included:' },
      { type: 'code', code: sql`
SELECT p.ProductId, p.Name
FROM dbo.Products AS p
JOIN dbo.OrderItems AS oi ON oi.ProductId = p.ProductId
JOIN dbo.Orders     AS o  ON o.OrderId    = oi.OrderId
WHERE o.OrderDate < '2024-04-01'
EXCEPT
SELECT p.ProductId, p.Name
FROM dbo.Products AS p
JOIN dbo.OrderItems AS oi ON oi.ProductId = p.ProductId
JOIN dbo.Orders     AS o  ON o.OrderId    = oi.OrderId
WHERE o.OrderDate >= '2024-04-01'
ORDER BY ProductId;`, output: 'ProductId  Name\n---------  --------------\n        2  Cordless drill\n        5  Sand 25 kg' },
      { type: 'p', text: 'EXCEPT is also the shortest way to find keys with no partner, the same question as the LEFT JOIN … IS NULL pattern from the outer joins lesson:' },
      { type: 'code', code: sql`
SELECT CustomerId FROM dbo.Customers
EXCEPT
SELECT CustomerId FROM dbo.Orders;`, output: 'CustomerId\n----------\n         5\n         7' },
      { type: 'h2', text: 'Set operators and NULL' },
      { type: 'p', text: 'In WHERE and ON, `NULL = NULL` is unknown, so NULLs never match. Set operators are different: they treat two NULLs as **the same value**. Ella (customer 5) has no city and is in both halves here, so NULL is in the intersection:' },
      { type: 'code', code: sql`
SELECT City FROM dbo.Customers WHERE CustomerId <= 5
INTERSECT
SELECT City FROM dbo.Customers WHERE CustomerId >= 5
ORDER BY City;`, output: 'City\n-----\nNULL\nLeeds\nYork' },
      { type: 'note', kind: 'info', text: 'INTERSECT is evaluated before UNION and EXCEPT, the way × comes before +. When you mix operators, add parentheses around the queries to make the order obvious.' },
      { type: 'quiz', question: 'Query A returns 5 rows and query B returns 3 rows, with 2 rows in common and no duplicates within either. How many rows does A UNION ALL B return?', options: ['5', '6', '8', '10'], answer: 2, explain: 'UNION ALL keeps everything: 5 + 3 = 8. UNION would return 6 (the 2 shared rows once each).' },
      { type: 'quiz', question: 'Which set operator gives a different result when you swap the two queries?', options: ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'], answer: 3, explain: 'A EXCEPT B is the rows of A missing from B; B EXCEPT A is the opposite. The others are symmetrical (UNION ALL only changes the order of the rows, which is not guaranteed anyway without ORDER BY).' },
      { type: 'exercise', task: 'Show the ProductId and Name of every product that **no customer from Leeds** has ever ordered, sorted by ProductId.', hint: 'All products EXCEPT the products on orders placed by Leeds customers. The second query joins Products, OrderItems, Orders and Customers.', solution: sql`
SELECT ProductId, Name FROM dbo.Products
EXCEPT
SELECT p.ProductId, p.Name
FROM dbo.Products AS p
JOIN dbo.OrderItems AS oi ON oi.ProductId = p.ProductId
JOIN dbo.Orders     AS o  ON o.OrderId    = oi.OrderId
JOIN dbo.Customers  AS c  ON c.CustomerId = o.CustomerId
WHERE c.City = N'Leeds'
ORDER BY ProductId;`, output: 'ProductId  Name\n---------  -------------------\n        4  Cement 25 kg\n        5  Sand 25 kg\n        6  Timber 2x4 2.4 m\n        7  Plywood sheet 18 mm\n        9  Wall plugs (100)\n       10  Masonry paint 10 L\n       11  Paint roller set' }
    ],
    keyPoints: [
      'UNION, INTERSECT and EXCEPT remove duplicates; UNION ALL keeps every row and is faster.',
      'Both queries need the same number of columns with compatible types; names come from the first query.',
      'One ORDER BY at the very end sorts the combined result.',
      'Only EXCEPT depends on the order of the two queries.',
      'Set operators treat NULLs as equal to each other, unlike = in WHERE and ON.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'normalisation',
    title: 'Designing tables: normalisation',
    summary: 'Why one big table goes wrong, and how first, second and third normal form split it into tables where every fact is stored once. Plus when copying a value is correct, and when to denormalise on purpose.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'You now know how to put tables back together with joins. This lesson is about the other half: deciding **which tables to have** in the first place. The rules are called **normalisation**, and their goal is simple: store every fact once.' },
      { type: 'h2', text: 'What goes wrong in one big table' },
      { type: 'p', text: 'Here is an order sheet with the customer’s details on every line. Asha changes her email address, and the update is made for order 1 only:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.OrderSheet (
    OrderId   int           NOT NULL,
    ProductId int           NOT NULL,
    Customer  nvarchar(80)  NOT NULL,
    Email     nvarchar(100) NULL,
    Product   nvarchar(60)  NOT NULL,
    Quantity  int           NOT NULL,
    PRIMARY KEY (OrderId, ProductId)
);
INSERT INTO dbo.OrderSheet VALUES
    (1, 1, N'Asha Patel', N'asha@example.com', N'Claw hammer',       1),
    (1, 3, N'Asha Patel', N'asha@example.com', N'Tape measure 8 m',  2),
    (3, 2, N'Asha Patel', N'asha@example.com', N'Cordless drill',    1),
    (3, 8, N'Asha Patel', N'asha@example.com', N'Wood screws (200)', 2);

UPDATE dbo.OrderSheet SET Email = N'asha.p@example.com' WHERE OrderId = 1;

SELECT DISTINCT Customer, Email FROM dbo.OrderSheet;`, output: 'Customer    Email\n----------  ------------------\nAsha Patel  asha.p@example.com\nAsha Patel  asha@example.com' },
      { type: 'p', text: 'Asha now has two email addresses, and the database cannot tell you which is right. Repeated data causes three kinds of trouble, called **anomalies**:' },
      { type: 'table', head: ['Anomaly', 'What happens'], rows: [
        ['**Update**', 'a fact stored in many rows is changed in some of them, and the copies disagree'],
        ['**Insert**', 'you cannot record a new customer or product until someone places an order'],
        ['**Delete**', 'deleting a customer’s only order also deletes everything you knew about the customer']
      ] },
      { type: 'h2', text: 'The normal forms' },
      { type: 'widget', name: 'normal-forms' },
      { type: 'table', head: ['Form', 'Rule', 'Fix when broken'], rows: [
        ['**1NF**', 'one value per cell, no repeating groups (Product1, Product2, …), and a primary key', 'one row per item'],
        ['**2NF**', '1NF, and every column depends on the **whole** key, not part of a composite key', 'move the columns to a table keyed by that part'],
        ['**3NF**', '2NF, and no column depends on another non-key column', 'move the dependent columns to a table of their own']
      ] },
      { type: 'p', text: 'A classic summary: every column must depend on **the key, the whole key, and nothing but the key**. In practice, ask of each column: “Is this a fact about what this table’s key identifies?” Email is a fact about a customer, not about an order line, so it belongs in Customers.' },
      { type: 'h2', text: 'Putting it back together' },
      { type: 'p', text: 'Normalised tables do not lose the sheet: joins rebuild it whenever it is needed, from facts stored once:' },
      { type: 'code', code: sql`
SELECT o.OrderId, o.OrderDate, c.FirstName + N' ' + c.LastName AS Customer,
       c.Email, p.Name AS Product, cat.Name AS Category, oi.Quantity
FROM dbo.Orders AS o
JOIN dbo.Customers  AS c   ON c.CustomerId   = o.CustomerId
JOIN dbo.OrderItems AS oi  ON oi.OrderId     = o.OrderId
JOIN dbo.Products   AS p   ON p.ProductId    = oi.ProductId
JOIN dbo.Categories AS cat ON cat.CategoryId = p.CategoryId
WHERE o.OrderId <= 3
ORDER BY o.OrderId, p.ProductId;`, output: 'OrderId  OrderDate   Customer    Email             Product            Category  Quantity\n-------  ----------  ----------  ----------------  -----------------  --------  --------\n      1  2024-02-03  Asha Patel  asha@example.com  Claw hammer        Tools            1\n      1  2024-02-03  Asha Patel  asha@example.com  Tape measure 8 m   Tools            2\n      2  2024-02-10  Ben Carter  NULL              Cement 25 kg       Building        10\n      2  2024-02-10  Ben Carter  NULL              Sand 25 kg         Building        10\n      3  2024-03-01  Asha Patel  asha@example.com  Cordless drill     Tools            1\n      3  2024-03-01  Asha Patel  asha@example.com  Wood screws (200)  Fixings          2' },
      { type: 'p', text: 'Now the email change is one row in Customers, and every order sees it at once:' },
      { type: 'code', code: sql`
UPDATE dbo.Customers SET Email = N'asha.p@example.com' WHERE CustomerId = 1;

SELECT o.OrderId, c.FirstName, c.Email
FROM dbo.Orders AS o
JOIN dbo.Customers AS c ON c.CustomerId = o.CustomerId
WHERE c.CustomerId = 1;`, output: 'OrderId  FirstName  Email\n-------  ---------  ------------------\n      1  Asha       asha.p@example.com\n      3  Asha       asha.p@example.com' },
      { type: 'h2', text: 'Not every copy is a duplicate' },
      { type: 'p', text: 'OrderItems stores a UnitPrice, although Products has a Price. That is not a 3NF mistake, because they are **different facts**: the price paid on that day, and the price today. Cement was sold at a discount on order 7, and if the price rises tomorrow, old orders must keep the price they were charged:' },
      { type: 'code', code: sql`
SELECT oi.OrderId, o.OrderDate, p.Name, oi.UnitPrice AS PricePaid, p.Price AS PriceToday
FROM dbo.OrderItems AS oi
JOIN dbo.Orders   AS o ON o.OrderId   = oi.OrderId
JOIN dbo.Products AS p ON p.ProductId = oi.ProductId
WHERE p.ProductId = 4;`, output: 'OrderId  OrderDate   Name          PricePaid  PriceToday\n-------  ----------  ------------  ---------  ----------\n      2  2024-02-10  Cement 25 kg       7.20        7.20\n      7  2024-05-05  Cement 25 kg       7.00        7.20' },
      { type: 'p', text: 'The same goes for a delivery address copied onto an order: the customer may move later, but the parcel went to the old address. Ask whether the value can legitimately differ from the original. If it can, it is a separate fact and it is fine to store it.' },
      { type: 'h2', text: 'Designing a many-to-many relationship' },
      { type: 'p', text: 'BuildMart wants to record suppliers. A product can come from several suppliers and a supplier sells many products, so this is many-to-many and needs a junction table. The cost price depends on the pair (the same product costs different amounts from different suppliers), so it lives there:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.Suppliers (
    SupplierId int          NOT NULL IDENTITY PRIMARY KEY,
    Name       nvarchar(60) NOT NULL,
    Phone      varchar(20)  NULL
);

CREATE TABLE dbo.ProductSuppliers (
    ProductId  int           NOT NULL REFERENCES dbo.Products (ProductId),
    SupplierId int           NOT NULL REFERENCES dbo.Suppliers (SupplierId),
    CostPrice  decimal(10,2) NOT NULL,
    PRIMARY KEY (ProductId, SupplierId)
);` },
      { type: 'h2', text: 'Denormalising on purpose' },
      { type: 'p', text: 'Normalised tables are the right default for data that changes (OLTP systems such as a shop). Sometimes you copy data deliberately:' },
      { type: 'ul', items: [
        '**Reporting tables and data warehouses** are read far more often than they are written, so they store pre-joined, repeated data to make reports fast.',
        '**Snapshots** such as UnitPrice above, which record a value as it was.',
        '**Totals kept for speed**, such as an order total stored next to its lines, but only with a reliable way (a trigger or a single code path) to keep it in step.'
      ] },
      { type: 'note', kind: 'tip', text: 'Normalise first, then denormalise only for a measured reason. Going the other way, fixing a database full of inconsistent copies, is far more work.' },
      { type: 'quiz', question: 'OrderItems(OrderId, ProductId, Quantity, ProductName) has the key (OrderId, ProductId). Which normal form does ProductName break?', options: ['1NF', '2NF', '3NF', 'None'], answer: 1, explain: 'ProductName depends on ProductId alone, which is only part of the composite key: a 2NF violation. Keep it in Products.' },
      { type: 'quiz', question: 'Deliveries(DeliveryId, OrderId, DriverId, DriverPhone) has the key DeliveryId. What is wrong?', options: ['Nothing', 'It breaks 1NF', 'It breaks 2NF', 'It breaks 3NF: DriverPhone depends on DriverId, not on DeliveryId'], answer: 3, explain: 'DeliveryId → DriverId → DriverPhone is a transitive dependency. The key is a single column, so 2NF is fine, but DriverPhone is a fact about the driver and belongs in a Drivers table.' },
      { type: 'exercise', task: 'A delivery firm keeps one table: `Deliveries(DeliveryId, DeliveryDate, DriverName, DriverPhone, VanReg, VanCapacityKg)`. Each driver can drive any van. Redesign it in third normal form with CREATE TABLE statements, using surrogate keys and foreign keys.', hint: 'Driver details depend on the driver, and van details on the van. Make Drivers and Vans tables, and give Deliveries a DriverId and a VanId. Keep VanReg unique.', solution: sql`
CREATE TABLE dbo.Drivers (
    DriverId int          NOT NULL IDENTITY PRIMARY KEY,
    Name     nvarchar(60) NOT NULL,
    Phone    varchar(20)  NULL
);

CREATE TABLE dbo.Vans (
    VanId      int        NOT NULL IDENTITY PRIMARY KEY,
    Reg        varchar(8) NOT NULL UNIQUE,
    CapacityKg int        NOT NULL
);

CREATE TABLE dbo.Deliveries (
    DeliveryId   int  NOT NULL IDENTITY PRIMARY KEY,
    DeliveryDate date NOT NULL,
    DriverId     int  NOT NULL REFERENCES dbo.Drivers (DriverId),
    VanId        int  NOT NULL REFERENCES dbo.Vans (VanId)
);` }
    ],
    keyPoints: [
      'Normalisation stores every fact once, so it cannot disagree with itself.',
      'Repeated data causes update, insert and delete anomalies.',
      '1NF: one value per cell and a key. 2NF: depend on the whole key. 3NF: depend on nothing but the key.',
      'Joins rebuild the combined view whenever you need it.',
      'A copy that can legitimately differ, such as the price paid, is a separate fact, not a duplicate.',
      'Denormalise deliberately, for a measured reason, and keep the copies in step.'
    ]
  }
];
