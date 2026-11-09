import { Lesson } from '../learn.types';
import { sql } from './sql';

export const PERFORMANCE: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'how-data-is-stored',
    title: 'How SQL Server stores data: pages, heaps and B-trees',
    summary: 'What is underneath a table: 8 KB pages, rows per page, logical reads, heaps that must be read from end to end, and the B-tree that finds one row in three reads.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'Until now you have told SQL Server **what** you want. This module is about **how** it finds it, and why one query takes a millisecond while another, returning the same rows, takes seconds. Almost all of the difference comes from one number: how many pages the query has to read.' },
      { type: 'p', text: 'The BuildMart tables are far too small to show this: each one fits on a single page. The script below creates `dbo.Sales`, with 100,000 made-up sales. `GENERATE_SERIES` returns the numbers 1 to 100,000, and arithmetic on each number fills the columns. Note that the table has no primary key yet; that is on purpose.' },
      { type: 'code', title: 'Create dbo.Sales (100,000 rows)', code: sql`
DROP TABLE IF EXISTS dbo.Sales;
CREATE TABLE dbo.Sales (
    SaleId     int           NOT NULL,
    SaleDate   date          NOT NULL,
    CustomerId int           NOT NULL,
    ProductId  int           NOT NULL,
    Quantity   int           NOT NULL,
    Amount     decimal(10,2) NOT NULL,
    Channel    varchar(10)   NOT NULL,
    Notes      char(100)     NULL
);
INSERT INTO dbo.Sales (SaleId, SaleDate, CustomerId, ProductId, Quantity, Amount, Channel)
SELECT value,
       DATEADD(day, value * 37 % 1096, '2022-01-01'),
       value * 7919 % 5000 + 1,
       value % 12 + 1,
       value % 7 + 1,
       value * 31 % 9000 / 100.0 + 1,
       CASE value % 10 WHEN 0 THEN 'Phone' WHEN 1 THEN 'Shop' WHEN 2 THEN 'Shop' ELSE 'Web' END
FROM GENERATE_SERIES(1, 100000);

SELECT COUNT(*) AS SalesRows, MIN(SaleDate) AS FirstDay, MAX(SaleDate) AS LastDay
FROM dbo.Sales;`, output: 'SalesRows  FirstDay    LastDay\n---------  ----------  ----------\n   100000  2022-01-01  2024-12-31' },
      { type: 'note', kind: 'info', text: '`GENERATE_SERIES` needs SQL Server 2022. On an older version, replace `FROM GENERATE_SERIES(1, 100000)` with `FROM (SELECT TOP (100000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS value FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS n`.' },
      { type: 'p', text: 'The data has a pattern you can rely on later: 5,000 customers with 20 sales each, 12 products, dates from 2022-01-01 to 2024-12-31, and three channels (Web 70%, Shop 20%, Phone 10%).' },
      { type: 'note', kind: 'info', text: 'The page counts, reads and plans in this module come from SQL Server 2022 running each query on a single thread. On your machine some may differ by a page or two, and plans may include **Parallelism** operators when SQL Server spreads a big query over several cores. The patterns are the same, and the patterns are what matter.' },

      { type: 'h2', text: 'Pages: the unit SQL Server reads' },
      { type: 'p', text: 'SQL Server stores every table in **pages** of 8 KB (8,192 bytes). A page starts with a 96-byte header, then the rows, and ends with a small **slot array**: 2 bytes per row, saying where on the page each row starts. That leaves about 8,060 bytes for rows. A row must fit on one page (long `varchar(max)` values are stored on separate pages).' },
      { type: 'p', text: 'SQL Server reads and writes **whole pages**, never single rows. To read one row, it reads the page the row is on. `sys.dm_db_index_physical_stats` shows how many pages a table uses:' },
      { type: 'code', code: sql`
SELECT index_type_desc, page_count, record_count,
       avg_record_size_in_bytes AS AvgRowBytes
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID(N'dbo.Sales'), NULL, NULL, 'DETAILED');`, output: 'index_type_desc  page_count  record_count  AvgRowBytes\n---------------  ----------  ------------  -----------\nHEAP                   1786        100000        142.4' },
      { type: 'p', text: 'Each row takes about 142 bytes, plus 2 bytes in the slot array. 8,060 ÷ 144 is 56 rows per page, and 100,000 ÷ 56 is 1,786 pages: about 14 MB.' },

      { type: 'h2', text: 'Wider rows, more pages' },
      { type: 'p', text: '`Notes` is `char(100)`. A `char` column always takes its full length, even when it holds NULL, so every row carries 100 bytes it does not use. Compare a copy of the table where Notes is `varchar(100)`, which stores only what is there:' },
      { type: 'code', code: sql`
DROP TABLE IF EXISTS dbo.SalesSlim;
SELECT SaleId, SaleDate, CustomerId, ProductId, Quantity, Amount, Channel,
       CAST(Notes AS varchar(100)) AS Notes
INTO dbo.SalesSlim
FROM dbo.Sales;

SELECT OBJECT_NAME(object_id) AS TableName, page_count,
       avg_record_size_in_bytes AS AvgRowBytes
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETAILED')
WHERE object_id IN (OBJECT_ID(N'dbo.Sales'), OBJECT_ID(N'dbo.SalesSlim'));

DROP TABLE dbo.SalesSlim;`, output: 'TableName  page_count  AvgRowBytes\n---------  ----------  -----------\nSales            1786        142.4\nSalesSlim         550         42.4' },
      { type: 'p', text: 'The same 100,000 rows fit on less than a third as many pages. Every query that reads the whole table does that much less work, and more of the table fits in memory. Choosing the narrowest type that fits the data is a performance decision, not only a tidy one.' },

      { type: 'h2', text: 'Logical reads: how much work a query did' },
      { type: 'p', text: '`SET STATISTICS IO ON` makes SQL Server report, for each table a query touched, how many pages it read. In SSMS the report appears on the **Messages** tab.' },
      { type: 'ul', items: [
        '**logical reads**: pages read from memory (the buffer pool). Every page a query uses counts here, whether or not it had to come from disk first.',
        '**physical reads** and **read-ahead reads**: pages that first had to be fetched from disk. They depend on what happens to be in memory, so they change from run to run.',
        '**Scan count**: how many times the table or index was entered.'
      ] },
      { type: 'p', text: 'Logical reads is the number to watch when you tune a query: it measures the work itself and is the same every time you run the query. Find one sale:' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT SaleId, SaleDate, CustomerId, Amount
FROM dbo.Sales
WHERE SaleId = 4321;
SET STATISTICS IO OFF;`, output: 'SaleId  SaleDate    CustomerId  Amount\n------  ----------  ----------  ------\n  4321  2024-08-15        3000   80.51\n\nTable \'Sales\'. Scan count 1, logical reads 1786, physical reads 283, page server reads 0, read-ahead reads 1711, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'One row, and 1,786 pages read: every page of the table. The table is a **heap**, a table without a clustered index. Its rows are stored wherever there was space, in no order, so SQL Server cannot know which page holds SaleId 4321. The only way to find it is to read every page and check every row. The same is true for any WHERE on a heap.' },
      { type: 'note', kind: 'info', text: 'Pages are allocated in groups of eight, called **extents** (64 KB). Special pages called **IAM** pages record which extents belong to each table, and a heap scan reads the extents in that order. Heaps are fine for staging tables that are loaded and then read in full; for tables you search, you want an index.' },

      { type: 'h2', text: 'B-trees: finding a row without reading them all' },
      { type: 'p', text: 'An **index** keeps rows sorted by a key and builds a tree of pages above them, so SQL Server can go straight to the right page. Create a clustered index on SaleId and look at the pages again:' },
      { type: 'code', code: sql`
CREATE UNIQUE CLUSTERED INDEX CX_Sales ON dbo.Sales (SaleId);

SELECT index_type_desc, index_level, page_count, record_count
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID(N'dbo.Sales'), NULL, NULL, 'DETAILED')
ORDER BY index_level DESC;`, output: 'index_type_desc  index_level  page_count  record_count\n---------------  -----------  ----------  ------------\nCLUSTERED INDEX            2           1             3\nCLUSTERED INDEX            1           3          1786\nCLUSTERED INDEX            0        1786        100000' },
      { type: 'p', text: 'The index has three levels:' },
      { type: 'ul', items: [
        '**Level 2, the root**: one page with 3 entries, one for each page on the level below. Each entry holds the first SaleId on that page and the page’s address.',
        '**Level 1, intermediate**: 3 pages with 1,786 entries, one for each leaf page.',
        '**Level 0, the leaf level**: 1,786 pages holding the rows themselves, now sorted by SaleId.'
      ] },
      { type: 'p', text: 'Together these form a **B-tree** (balanced tree): every leaf page is the same distance from the root. Now find the same sale again:' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT SaleId, SaleDate, CustomerId, Amount
FROM dbo.Sales
WHERE SaleId = 4321;
SET STATISTICS IO OFF;`, output: 'SaleId  SaleDate    CustomerId  Amount\n------  ----------  ----------  ------\n  4321  2024-08-15        3000   80.51\n\nTable \'Sales\'. Scan count 0, logical reads 3, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'Three logical reads instead of 1,786: the root, one intermediate page and one leaf page. Reading down the tree like this is called a **seek**. Reading all the leaf pages is a **scan**. (Scan count 0 in the report means the index was entered once, for a single-value seek.)' },
      { type: 'widget', name: 'btree-pages' },
      { type: 'p', text: 'Trees stay shallow as tables grow, because each index page holds hundreds of entries. Each extra level multiplies the number of rows the tree can reach by several hundred, so even tables with billions of rows usually need only four or five levels, which means four or five reads to find one row.' },

      { type: 'h2', text: 'Ranges follow the leaf chain' },
      { type: 'p', text: 'Each leaf page also stores the address of the page before and after it, so the leaf level is a linked chain in key order. For a range, SQL Server seeks to the first row and then reads along the chain until it passes the end of the range:' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Total
FROM dbo.Sales
WHERE SaleId BETWEEN 1001 AND 2000;
SET STATISTICS IO OFF;`, output: 'SalesRows     Total\n---------  --------\n     1000  47925.00\n\nTable \'Sales\'. Scan count 1, logical reads 22, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: '1,000 rows at 56 rows a page is about 18 leaf pages, plus the root and an intermediate page on the way down. The cost of a range seek grows with the number of rows it returns, not with the size of the table.' },

      { type: 'quiz', question: 'A query reads 3 rows from a table of 50,000 pages and reports 50,000 logical reads. What is the most likely reason?', options: ['The pages were not in memory', 'There is no index SQL Server can seek on for that WHERE, so it scanned every page', 'The rows are very wide', 'STATISTICS IO counts every page in the database'], answer: 1, explain: 'Logical reads count pages read, wherever they came from. Reading every page to return 3 rows means a scan: no usable index for that WHERE (or a heap).' },
      { type: 'quiz', question: 'Why is logical reads a better measure than elapsed time when you compare two versions of a query?', options: ['It is always smaller', 'It counts the work done and is the same on every run, while time depends on the cache, other users and the machine', 'It includes CPU time', 'Elapsed time is not available in SQL Server'], answer: 1, explain: 'Time varies with what is cached and what else is running. Logical reads count pages touched, so the same query gives the same number every time.' },
      { type: 'exercise', task: 'With STATISTICS IO on, find the sales with SaleId 10, 50000 and 99999 in one query (WHERE SaleId IN …), returning SaleId and Amount. Before you run it, predict the scan count and the logical reads.', hint: 'Each value is a separate seek down the 3-level tree.', solution: sql`
SET STATISTICS IO ON;
SELECT SaleId, Amount
FROM dbo.Sales
WHERE SaleId IN (10, 50000, 99999);
SET STATISTICS IO OFF;`, output: 'SaleId  Amount\n------  ------\n    10    4.10\n 50000   21.00\n 99999   40.69\n\nTable \'Sales\'. Scan count 3, logical reads 9, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' }
    ],
    keyPoints: [
      'Tables are stored in 8 KB pages. SQL Server reads whole pages, so query cost is measured in pages.',
      'Narrower rows mean more rows per page and fewer pages to read. char(n) always uses n bytes.',
      'SET STATISTICS IO ON reports logical reads: the pages a query touched. It is the steadiest measure of a query’s work.',
      'A heap has no order: finding any row means scanning every page.',
      'An index is a B-tree: root, intermediate levels and leaf pages. A seek reads one page per level.',
      'Leaf pages are linked in key order, so a range seek reads only the pages that hold the range.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'clustered-indexes',
    title: 'Clustered indexes',
    summary: 'The clustered index is the table itself, sorted by its key. Seeks and range scans on the key, why ORDER BY on the key is free, how to choose a clustering key, page splits and fragmentation, and rebuilding with a fill factor.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'The last lesson ended with a clustered index on SaleId. Its leaf level holds the **whole rows**, in key order. That is the defining feature of a clustered index: it does not point to the table, it **is** the table. Because rows can only be stored in one order, a table can have only one clustered index.' },
      { type: 'p', text: 'This script rebuilds `dbo.Sales`, this time with a primary key, so you can start here:' },
      { type: 'code', title: 'Create dbo.Sales with a primary key', code: sql`
DROP TABLE IF EXISTS dbo.Sales;
CREATE TABLE dbo.Sales (
    SaleId     int           NOT NULL CONSTRAINT PK_Sales PRIMARY KEY,
    SaleDate   date          NOT NULL,
    CustomerId int           NOT NULL,
    ProductId  int           NOT NULL,
    Quantity   int           NOT NULL,
    Amount     decimal(10,2) NOT NULL,
    Channel    varchar(10)   NOT NULL,
    Notes      char(100)     NULL
);
INSERT INTO dbo.Sales (SaleId, SaleDate, CustomerId, ProductId, Quantity, Amount, Channel)
SELECT value,
       DATEADD(day, value * 37 % 1096, '2022-01-01'),
       value * 7919 % 5000 + 1,
       value % 12 + 1,
       value % 7 + 1,
       value * 31 % 9000 / 100.0 + 1,
       CASE value % 10 WHEN 0 THEN 'Phone' WHEN 1 THEN 'Shop' WHEN 2 THEN 'Shop' ELSE 'Web' END
FROM GENERATE_SERIES(1, 100000);

SELECT name, type_desc, is_unique, is_primary_key
FROM sys.indexes
WHERE object_id = OBJECT_ID(N'dbo.Sales');`, output: 'name      type_desc  is_unique  is_primary_key\n--------  ---------  ---------  --------------\nPK_Sales  CLUSTERED  1          1' },
      { type: 'p', text: 'A PRIMARY KEY creates a **clustered** index unless the table already has one or you write `PRIMARY KEY NONCLUSTERED`. That is why every BuildMart table is already clustered on its key. Those indexes have names like `PK__Products__B40CC6CD…`, generated by SQL Server; naming the constraint, as here, gives the index a name you can use in scripts.' },

      { type: 'h2', text: 'Seeks and range scans on the key' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT SaleDate, Amount FROM dbo.Sales WHERE SaleId = 777;

SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Total
FROM dbo.Sales
WHERE SaleId BETWEEN 10001 AND 12000;
SET STATISTICS IO OFF;`, output: 'SaleDate    Amount\n----------  ------\n2022-09-11   61.87\n\nTable \'Sales\'. Scan count 0, logical reads 3, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows     Total\n---------  --------\n     2000  92290.00\n\nTable \'Sales\'. Scan count 1, logical reads 40, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'One row costs one read per level of the tree. 2,000 neighbouring rows cost the trip down plus the leaf pages that hold them, about 2,000 ÷ 56.' },

      { type: 'h2', text: 'ORDER BY on the key is free' },
      { type: 'p', text: 'The leaf level is already in SaleId order, so SQL Server can return rows in that order just by reading along the chain. Sorting on any other column needs a **Sort** step. `SET SHOWPLAN_TEXT ON` shows the plan SQL Server would use instead of running the query; the next lessons look at plans in detail.' },
      { type: 'code', code: sql`
SET SHOWPLAN_TEXT ON;
GO
SELECT TOP (5) SaleId, Amount FROM dbo.Sales ORDER BY SaleId;
SELECT TOP (5) SaleId, Amount FROM dbo.Sales ORDER BY Amount DESC;
GO
SET SHOWPLAN_TEXT OFF;`, output: 'StmtText\n-------------------------------------------------------------\nSELECT TOP (5) SaleId, Amount FROM dbo.Sales ORDER BY SaleId;\n\nStmtText\n---------------------------------------------------------------------------------------------------\n  |--Top(TOP EXPRESSION:((5)))\n       |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[Sales].[PK_Sales]), ORDERED FORWARD)\n\nStmtText\n------------------------------------------------------------------\nSELECT TOP (5) SaleId, Amount FROM dbo.Sales ORDER BY Amount DESC;\n\nStmtText\n----------------------------------------------------------------------------------\n  |--Sort(TOP 5, ORDER BY:([BuildMart].[dbo].[Sales].[Amount] DESC))\n       |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[Sales].[PK_Sales]))' },
      { type: 'p', text: 'The first plan reads the first rows of the index in order (`ORDERED FORWARD`) and stops after five. The second must read all 100,000 rows to find the five largest amounts, through a **Top N Sort** (the `Sort(TOP 5, …)` line), which keeps only the five largest it has seen so far.' },
      { type: 'note', kind: 'warn', text: 'The clustered index does **not** promise any order for a query without ORDER BY. A scan may come back in key order today and in another order tomorrow (for example when the query runs in parallel). If you need an order, write ORDER BY; when it matches the key, it costs nothing.' },

      { type: 'h2', text: 'Other columns still scan' },
      { type: 'p', text: 'The tree is sorted by SaleId only. A search on any other column cannot use it to seek:' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Total
FROM dbo.Sales
WHERE SaleDate = '2023-06-01';
SET STATISTICS IO OFF;`, output: 'SalesRows    Total\n---------  -------\n       91  4269.76\n\nTable \'Sales\'. Scan count 1, logical reads 1794, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'Every page is read again. The next lesson adds nonclustered indexes for searches like this; first, the question of which column the clustered index should be on.' },

      { type: 'h2', text: 'Choosing the clustering key' },
      { type: 'table', head: ['Property', 'Why it matters'], rows: [
        ['Narrow', 'The clustering key is copied into every nonclustered index row (next lesson). A 4-byte int costs far less than a 16-byte GUID or a 50-character name.'],
        ['Unique', 'If the key is not unique, SQL Server adds a hidden 4-byte **uniquifier** to duplicate rows to tell them apart.'],
        ['Static', 'Changing a key value moves the row to another place in the tree and changes every nonclustered index that holds it.'],
        ['Ever-increasing', 'New rows go at the end of the last page, so no page has to be split to make room in the middle.']
      ] },
      { type: 'p', text: 'An `int` or `bigint` IDENTITY column has all four, which is why it is the usual choice. An email address fails on narrow and static; a random GUID fails on narrow and ever-increasing.' },
      { type: 'p', text: 'Clustering on something else can still be right when most queries read ranges of it. A reporting table that is almost always read by date can be clustered on the date. Compare a copy of Sales clustered on SaleDate:' },
      { type: 'code', code: sql`
DROP TABLE IF EXISTS dbo.SalesByDate;
SELECT * INTO dbo.SalesByDate FROM dbo.Sales;
CREATE CLUSTERED INDEX CX_SalesByDate ON dbo.SalesByDate (SaleDate);

SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Total
FROM dbo.SalesByDate
WHERE SaleDate >= '2023-06-01' AND SaleDate < '2023-07-01';
SET STATISTICS IO OFF;

SELECT OBJECT_NAME(object_id) AS TableName, page_count,
       avg_record_size_in_bytes AS AvgRowBytes
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETAILED')
WHERE object_id IN (OBJECT_ID(N'dbo.Sales'), OBJECT_ID(N'dbo.SalesByDate'))
  AND index_level = 0;`, output: 'SalesRows      Total\n---------  ---------\n     2737  125870.80\n\nTable \'SalesByDate\'. Scan count 1, logical reads 55, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nTableName    page_count  AvgRowBytes\n-----------  ----------  -----------\nSales              1786        142.4\nSalesByDate        1887      149.356' },
      { type: 'p', text: 'A month of sales now costs a few dozen reads instead of a full scan. The price shows in the second result: SaleDate is not unique (about 91 sales a day), so most rows carry a uniquifier and the rows are a little longer. Writing `CREATE UNIQUE CLUSTERED INDEX … (SaleDate, SaleId)` avoids the uniquifier and gives the same range seeks.' },

      { type: 'h2', text: 'Page splits' },
      { type: 'p', text: 'A clustered index keeps its rows in key order, so each new row has one correct page. If that page is full, SQL Server **splits** it: it allocates a new page, moves about half the rows there and links it into the chain. A split costs extra writes and log records, and it leaves two half-empty pages. The new page is usually far away in the file, so the chain no longer runs in file order: the index is **fragmented**.' },
      { type: 'widget', name: 'page-split' },
      { type: 'p', text: 'Here is the same effect in SQL Server. Two tables get the same 10,000 keys, inserted one row at a time: one table in ascending order, the other in a scrambled order. Each row has a 400-byte filler so that pages fill up quickly.' },
      { type: 'code', code: sql`
DROP TABLE IF EXISTS dbo.SeqKeys, dbo.RandKeys;
CREATE TABLE dbo.SeqKeys  (Id int NOT NULL CONSTRAINT PK_SeqKeys  PRIMARY KEY, Filler char(400) NOT NULL DEFAULT '');
CREATE TABLE dbo.RandKeys (Id int NOT NULL CONSTRAINT PK_RandKeys PRIMARY KEY, Filler char(400) NOT NULL DEFAULT '');

SET NOCOUNT ON;
DECLARE @n int = 1;
BEGIN TRANSACTION;
WHILE @n <= 10000
BEGIN
    INSERT INTO dbo.SeqKeys (Id)  VALUES (@n);                 -- 1, 2, 3, …
    INSERT INTO dbo.RandKeys (Id) VALUES (@n * 7919 % 10007);  -- 7919, 5831, 3743, …
    SET @n += 1;
END;
COMMIT;

SELECT OBJECT_NAME(object_id) AS TableName, page_count,
       CAST(avg_page_space_used_in_percent AS decimal(5,1)) AS PctFull,
       CAST(avg_fragmentation_in_percent AS decimal(5,1)) AS PctFragmented
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETAILED')
WHERE object_id IN (OBJECT_ID(N'dbo.SeqKeys'), OBJECT_ID(N'dbo.RandKeys'))
  AND index_level = 0;`, output: 'TableName  page_count  PctFull  PctFragmented\n---------  ----------  -------  -------------\nSeqKeys           527     96.8            0.2\nRandKeys          747     68.3           99.1' },
      { type: 'p', text: 'The ascending keys always landed at the end of the last page, so the pages are packed full and in order. The scrambled keys caused splits all over the index: more pages, each only partly full, and most of them out of order. Every scan of that table reads more pages than it needs to.' },
      { type: 'note', kind: 'tip', text: 'A `uniqueidentifier` key filled with `NEWID()` behaves like the scrambled table: every insert lands at a random place. If you need a GUID key, `NEWSEQUENTIALID()` as the column default generates increasing values; or keep an IDENTITY as the clustering key and store the GUID in a nonclustered unique index.' },

      { type: 'h2', text: 'Rebuilding an index, and fill factor' },
      { type: 'p', text: '`ALTER INDEX … REBUILD` builds the index again from scratch: pages packed in key order, with no fragmentation. `REORGANIZE` is a lighter option that shuffles and compacts the leaf pages in place.' },
      { type: 'code', code: sql`
ALTER INDEX PK_RandKeys ON dbo.RandKeys REBUILD;

SELECT OBJECT_NAME(object_id) AS TableName, page_count,
       CAST(avg_page_space_used_in_percent AS decimal(5,1)) AS PctFull,
       CAST(avg_fragmentation_in_percent AS decimal(5,1)) AS PctFragmented
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID(N'dbo.RandKeys'), NULL, NULL, 'DETAILED')
WHERE index_level = 0;`, output: 'TableName  page_count  PctFull  PctFragmented\n---------  ----------  -------  -------------\nRandKeys          527     96.8            0.0' },
      { type: 'p', text: 'A rebuild can also leave room on each page with **FILLFACTOR**: `ALTER INDEX PK_RandKeys ON dbo.RandKeys REBUILD WITH (FILLFACTOR = 80)` fills leaf pages to 80%, so the next random inserts find space without splitting. The cost is 25% more pages for every scan to read. Use it only on indexes that really receive inserts in the middle; an IDENTITY key should stay at 100%.' },
      { type: 'note', kind: 'warn', text: 'Do not rebuild every index every night by habit. On modern storage, out-of-order pages matter far less than half-empty ones. Look at page density (`avg_page_space_used_in_percent`) and at what your queries do before scheduling rebuilds.' },

      { type: 'quiz', question: 'How many clustered indexes can a table have?', options: ['One, because the clustered index is the table’s rows in key order', 'One per column', 'Up to 999', 'As many as it has unique columns'], answer: 0, explain: 'The leaf level of the clustered index holds the rows themselves, and rows can be stored in only one order.' },
      { type: 'quiz', question: 'Why is an ever-increasing IDENTITY a good clustering key for a table with many inserts?', options: ['IDENTITY values are compressed', 'New rows always go at the end, so pages fill in order without splits', 'It makes the table a heap', 'It lets SQL Server skip the log'], answer: 1, explain: 'Each new key is higher than all existing ones, so it goes on the last page. Pages fill up completely and in order, with no splits in the middle.' },
      { type: 'exercise', task: 'Make a copy of Sales named dbo.SalesByMonth with a UNIQUE clustered index on (SaleDate, SaleId). With STATISTICS IO on, count the sales and add up Amount for March 2023 on both dbo.Sales and dbo.SalesByMonth, and compare the reads. Drop the copy at the end.', hint: 'SELECT * INTO creates the copy as a heap; then CREATE UNIQUE CLUSTERED INDEX. Use a half-open range: SaleDate >= \'2023-03-01\' AND SaleDate < \'2023-04-01\'.', solution: sql`
DROP TABLE IF EXISTS dbo.SalesByMonth;
SELECT * INTO dbo.SalesByMonth FROM dbo.Sales;
CREATE UNIQUE CLUSTERED INDEX CX_SalesByMonth ON dbo.SalesByMonth (SaleDate, SaleId);

SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Total
FROM dbo.Sales
WHERE SaleDate >= '2023-03-01' AND SaleDate < '2023-04-01';

SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Total
FROM dbo.SalesByMonth
WHERE SaleDate >= '2023-03-01' AND SaleDate < '2023-04-01';
SET STATISTICS IO OFF;

DROP TABLE dbo.SalesByMonth;`, output: 'SalesRows      Total\n---------  ---------\n     2829  130188.01\n\nTable \'Sales\'. Scan count 1, logical reads 1794, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows      Total\n---------  ---------\n     2829  130188.01\n\nTable \'SalesByMonth\'. Scan count 1, logical reads 55, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' }
    ],
    keyPoints: [
      'A clustered index’s leaf level is the table: full rows in key order. One per table.',
      'A PRIMARY KEY is clustered by default. Name your constraints so the index has a usable name.',
      'Seeks and range seeks on the clustering key are cheap, and ORDER BY on the key needs no sort.',
      'A good clustering key is narrow, unique, static and ever-increasing: an IDENTITY int or bigint.',
      'Inserting into the middle of full pages causes page splits: half-empty pages out of order.',
      'REBUILD repacks an index; FILLFACTOR leaves free space, at the cost of more pages to read.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'nonclustered-indexes',
    title: 'Nonclustered and covering indexes',
    summary: 'Extra indexes for the searches the clustered index cannot answer: how a nonclustered index finds rows, key lookups, covering indexes with INCLUDE, the tipping point, column order in composite indexes, unique and filtered indexes, and what indexes cost.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'The BuildMart call centre looks up sales by customer all day. The clustered index is on SaleId, so every one of those lookups scans the table. This lesson adds indexes for searches like that. Start from a fresh `dbo.Sales`:' },
      { type: 'code', title: 'Create dbo.Sales with a primary key', code: sql`
DROP TABLE IF EXISTS dbo.Sales;
CREATE TABLE dbo.Sales (
    SaleId     int           NOT NULL CONSTRAINT PK_Sales PRIMARY KEY,
    SaleDate   date          NOT NULL,
    CustomerId int           NOT NULL,
    ProductId  int           NOT NULL,
    Quantity   int           NOT NULL,
    Amount     decimal(10,2) NOT NULL,
    Channel    varchar(10)   NOT NULL,
    Notes      char(100)     NULL
);
INSERT INTO dbo.Sales (SaleId, SaleDate, CustomerId, ProductId, Quantity, Amount, Channel)
SELECT value,
       DATEADD(day, value * 37 % 1096, '2022-01-01'),
       value * 7919 % 5000 + 1,
       value % 12 + 1,
       value % 7 + 1,
       value * 31 % 9000 / 100.0 + 1,
       CASE value % 10 WHEN 0 THEN 'Phone' WHEN 1 THEN 'Shop' WHEN 2 THEN 'Shop' ELSE 'Web' END
FROM GENERATE_SERIES(1, 100000);` },
      { type: 'p', text: 'Here is the call centre’s question for customer 3000: how many sales, how much, and the last sale date.' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Spent, MAX(SaleDate) AS LastSale
FROM dbo.Sales
WHERE CustomerId = 3000;
SET STATISTICS IO OFF;`, output: 'SalesRows    Spent  LastSale\n---------  -------  ----------\n       20  1000.20  2024-12-21\n\nTable \'Sales\'. Scan count 1, logical reads 1794, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'Twenty rows, and every page read. Add a **nonclustered index** on CustomerId:' },
      { type: 'code', code: sql`
CREATE INDEX IX_Sales_CustomerId ON dbo.Sales (CustomerId);

SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Spent, MAX(SaleDate) AS LastSale
FROM dbo.Sales
WHERE CustomerId = 3000;
SET STATISTICS IO OFF;`, output: 'SalesRows    Spent  LastSale\n---------  -------  ----------\n       20  1000.20  2024-12-21\n\nTable \'Sales\'. Scan count 1, logical reads 62, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'From a full scan to a few dozen reads. `CREATE INDEX` makes a nonclustered index unless you say otherwise.' },

      { type: 'h2', text: 'What a nonclustered index holds' },
      { type: 'p', text: 'A nonclustered index is a separate B-tree. Its leaf rows hold the index key (CustomerId) and a **row locator** that leads back to the full row. On a clustered table, the locator is the **clustering key**, SaleId. (On a heap it is the row’s physical address, the RID.) The leaf rows are short, so the index is much smaller than the table:' },
      { type: 'code', code: sql`
SELECT i.name AS IndexName, s.index_level, s.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID(N'dbo.Sales'), NULL, NULL, 'DETAILED') AS s
JOIN sys.indexes AS i ON i.object_id = s.object_id AND i.index_id = s.index_id
ORDER BY i.index_id, s.index_level;`, output: 'IndexName            index_level  page_count\n-------------------  -----------  ----------\nPK_Sales                       0        1786\nPK_Sales                       1           6\nPK_Sales                       2           1\nIX_Sales_CustomerId            0         174\nIX_Sales_CustomerId            1           1' },
      { type: 'p', text: 'So the query works in two steps. It **seeks** the small index to find the 20 SaleIds for customer 3000. The index has no Amount or SaleDate, so for each of the 20 rows it then seeks the clustered index by SaleId to fetch them. That second step is a **key lookup**. The plan shows both:' },
      { type: 'code', code: sql`
SET SHOWPLAN_TEXT ON;
GO
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Spent, MAX(SaleDate) AS LastSale
FROM dbo.Sales
WHERE CustomerId = 3000;
GO
SET SHOWPLAN_TEXT OFF;`, output: 'StmtText\n---------------------------------------------------------------------------------------------------------------------\nSELECT COUNT(*) AS SalesRows, SUM(Amount) AS Spent, MAX(SaleDate) AS LastSale\nFROM dbo.Sales\nWHERE CustomerId = 3000;\n\nStmtText\n-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n  |--Compute Scalar(DEFINE:([Expr1002]=CONVERT_IMPLICIT(int,[Expr1013],0), [Expr1003]=CASE WHEN [Expr1013]=(0) THEN NULL ELSE [Expr1014] END))\n       |--Stream Aggregate(DEFINE:([Expr1013]=Count(*), [Expr1014]=SUM([BuildMart].[dbo].[Sales].[Amount]), [Expr1004]=MAX([BuildMart].[dbo].[Sales].[SaleDate])))\n            |--Nested Loops(Inner Join, OUTER REFERENCES:([BuildMart].[dbo].[Sales].[SaleId]))\n                 |--Index Seek(OBJECT:([BuildMart].[dbo].[Sales].[IX_Sales_CustomerId]), SEEK:([BuildMart].[dbo].[Sales].[CustomerId]=(3000)) ORDERED FORWARD)\n                 |--Clustered Index Seek(OBJECT:([BuildMart].[dbo].[Sales].[PK_Sales]), SEEK:([BuildMart].[dbo].[Sales].[SaleId]=[BuildMart].[dbo].[Sales].[SaleId]) LOOKUP ORDERED FORWARD)' },
      { type: 'p', text: 'Read the plan from the innermost lines: an **Index Seek** on IX_Sales_CustomerId, then a **Nested Loops** join that, for each row found, runs a **Clustered Index Seek** marked `LOOKUP` on PK_Sales. Each lookup is a trip down the clustered index: about 3 reads per row, which explains most of the reads above.' },

      { type: 'h2', text: 'Covering indexes: INCLUDE' },
      { type: 'p', text: 'If the index itself holds every column the query needs, there are no lookups: the index **covers** the query. Columns that are only needed in the result, not for searching, go in an `INCLUDE` list. They are stored in the leaf rows but are not part of the key.' },
      { type: 'code', code: sql`
CREATE INDEX IX_Sales_CustomerId ON dbo.Sales (CustomerId)
    INCLUDE (SaleDate, Amount)
    WITH (DROP_EXISTING = ON);

SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Spent, MAX(SaleDate) AS LastSale
FROM dbo.Sales
WHERE CustomerId = 3000;
SET STATISTICS IO OFF;`, output: 'SalesRows    Spent  LastSale\n---------  -------  ----------\n       20  1000.20  2024-12-21\n\nTable \'Sales\'. Scan count 1, logical reads 2, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: '`DROP_EXISTING = ON` replaces the index in one step. Now the 20 rows sit next to each other in the index leaf, with everything the query needs, so it costs the trip down and nothing else.' },
      { type: 'table', head: ['', 'Key columns', 'INCLUDE columns'], rows: [
        ['Stored in', 'Every level of the tree', 'Leaf level only'],
        ['Sorted', 'Yes, in key order', 'No'],
        ['Can be sought (WHERE, JOIN)', 'Yes', 'No, only read once the row is found'],
        ['Limits', 'Up to 32 columns, 1,700 bytes', 'Up to 1,023 columns']
      ] },

      { type: 'h2', text: 'The tipping point' },
      { type: 'p', text: 'Lookups are cheap for a few rows, but each costs about three random reads. A scan of the whole table costs about 1,800 reads, however many rows match. So once a query returns more than a few hundred rows, a seek with lookups would cost more than a scan, and the optimizer stops using the index. The widget uses an index on CustomerId alone, so every row found needs a lookup:' },
      { type: 'widget', name: 'lookup-tipping' },
      { type: 'p', text: 'The point where the plan switches is the **tipping point**: here between 500 and 600 rows, about half a percent of the table. A non-covering index is only useful for queries that are very selective. When a useful query returns many rows, make the index cover it instead.' },

      { type: 'h2', text: 'Composite indexes: column order matters' },
      { type: 'p', text: 'An index can have several key columns. Rows are sorted by the first column, then by the second within each value of the first, like a phone book sorted by surname, then first name. That order decides which searches can seek:' },
      { type: 'code', code: sql`
CREATE INDEX IX_Sales_Product_Date ON dbo.Sales (ProductId, SaleDate);

SET STATISTICS IO ON;
-- 1. both columns: seek straight to product 4, June 2023
SELECT COUNT(*) AS SalesRows FROM dbo.Sales
WHERE ProductId = 4 AND SaleDate >= '2023-06-01' AND SaleDate < '2023-07-01';

-- 2. the first column alone: seek to product 4, read all its dates
SELECT COUNT(*) AS SalesRows FROM dbo.Sales
WHERE ProductId = 4;

-- 3. the second column alone: June 2023 is spread through all 12 products
SELECT COUNT(*) AS SalesRows FROM dbo.Sales
WHERE SaleDate >= '2023-06-01' AND SaleDate < '2023-07-01';
SET STATISTICS IO OFF;`, output: 'SalesRows\n---------\n      213\n\nTable \'Sales\'. Scan count 1, logical reads 4, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows\n---------\n     8334\n\nTable \'Sales\'. Scan count 1, logical reads 21, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows\n---------\n     2737\n\nTable \'Sales\'. Scan count 1, logical reads 213, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'Queries 1 and 2 seek, because they give the leading column. Query 3 does not: finding a date in an index sorted by product first is like finding everyone called “Ben” in a phone book. SQL Server reads the whole index instead (still cheaper than the table, because the index is narrow). The usual rule: put columns tested with `=` first, then the column tested with a range.' },

      { type: 'h2', text: 'Unique and filtered indexes' },
      { type: 'p', text: 'A **unique** index also enforces a rule: no two rows may have the same key. A **filtered** index has a WHERE and holds only the rows that match it. Together they solve a common problem: emails must be unique, but many customers have none.' },
      { type: 'code', code: sql`
CREATE UNIQUE INDEX UX_Customers_Email ON dbo.Customers (Email)
    WHERE Email IS NOT NULL;

INSERT INTO dbo.Customers (FirstName, LastName, City, Email, JoinedOn)
VALUES (N'Hana', N'Ito', N'Leeds', NULL, '2024-03-01');      -- another NULL: fine

INSERT INTO dbo.Customers (FirstName, LastName, City, Email, JoinedOn)
VALUES (N'Ian', N'Ross', N'York', N'asha@example.com', '2024-03-02');`, output: 'Msg 2601, Level 14, State 1, Line 7\nCannot insert duplicate key row in object \'dbo.Customers\' with unique index \'UX_Customers_Email\'. The duplicate key value is (asha@example.com).\nThe statement has been terminated.' },
      { type: 'p', text: 'A plain UNIQUE constraint would allow only one NULL. The filtered index ignores the rows without an email, so it only checks the real addresses. Filtered indexes are also handy for small, hot subsets, such as `WHERE Status = \'Pending\'`.' },

      { type: 'h2', text: 'What indexes cost' },
      { type: 'p', text: 'Every index is a copy of some of the table’s data that SQL Server must keep correct. Each INSERT and DELETE changes every index on the table, and an UPDATE changes every index that contains a changed column. Indexes also take disk space and memory, and give the optimizer more plans to consider.' },
      { type: 'p', text: 'So index for the queries you actually run. This query shows how each index has been used since SQL Server started (the numbers depend on your workload):' },
      { type: 'code', code: sql`
SELECT i.name AS IndexName, u.user_seeks, u.user_scans, u.user_lookups, u.user_updates
FROM sys.indexes AS i
LEFT JOIN sys.dm_db_index_usage_stats AS u
       ON u.object_id = i.object_id AND u.index_id = i.index_id AND u.database_id = DB_ID()
WHERE i.object_id = OBJECT_ID(N'dbo.Sales');` },
      { type: 'p', text: 'An index with many `user_updates` and no seeks, scans or lookups is paid for on every write and never used. It is a candidate for dropping.' },

      { type: 'quiz', question: 'A nonclustered index on CustomerId is used for `SELECT Amount FROM dbo.Sales WHERE CustomerId = 3000`. What does SQL Server do for each matching row?', options: ['Nothing more: the index holds Amount', 'A key lookup into the clustered index, using the SaleId stored in the index row', 'A scan of the whole table', 'A lookup in the statistics'], answer: 1, explain: 'The index leaf holds CustomerId and the clustering key, SaleId. Amount is only in the clustered index, so each row needs a key lookup, unless Amount is INCLUDEd.' },
      { type: 'quiz', question: 'An index has the key (LastName, FirstName). Which search can it seek?', options: ['WHERE FirstName = N\'Ben\'', 'WHERE LastName = N\'Carter\'', 'WHERE FirstName LIKE N\'B%\'', 'None of them'], answer: 1, explain: 'An index can seek on its leading column. FirstName is sorted only within each LastName, so a search on FirstName alone must scan the index.' },
      { type: 'exercise', task: 'Reports often run this query: `SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Total FROM dbo.Sales WHERE Channel = \'Phone\' AND SaleDate >= \'2024-06-01\' AND SaleDate < \'2024-07-01\'`. Create the index that lets it run with the fewest reads, then run it with STATISTICS IO on.', hint: 'Equality column first, then the range column, and INCLUDE the column that is only added up.', solution: sql`
CREATE INDEX IX_Sales_Channel_Date ON dbo.Sales (Channel, SaleDate)
    INCLUDE (Amount);

SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Amount) AS Total
FROM dbo.Sales
WHERE Channel = 'Phone' AND SaleDate >= '2024-06-01' AND SaleDate < '2024-07-01';
SET STATISTICS IO OFF;`, output: 'SalesRows     Total\n---------  --------\n      274  12684.40\n\nTable \'Sales\'. Scan count 1, logical reads 5, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' }
    ],
    keyPoints: [
      'A nonclustered index is a separate B-tree: key columns plus the clustering key (or a RID on a heap).',
      'Columns the index lacks are fetched with key lookups, about three reads per row.',
      'INCLUDE adds columns to the leaf level so the index covers the query and needs no lookups.',
      'Past the tipping point (often around 1% of rows) lookups cost more than a scan, and the index is ignored.',
      'In a composite index, the leading column decides what can be sought: equality columns first, then a range.',
      'Unique and filtered indexes enforce rules and index subsets. Every index slows down writes, so index for real queries.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'execution-plans',
    title: 'Reading execution plans',
    summary: 'How SQL Server turns a query into a plan of operators, and how to read one: estimated and actual plans, the access operators, the three join operators, aggregates and sorts, costs, and what to look for first.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'SQL is declarative: you say what you want, not how to get it. The **query optimizer** decides the how. It considers ways of running the query (which index, which join method, in which order), estimates the cost of each from statistics about the data, and picks a cheap one. The result is an **execution plan**: a tree of operators that pass rows to each other.' },
      { type: 'p', text: 'Start from a fresh Sales table with one nonclustered index, and a small table of returned sales:' },
      { type: 'code', title: 'Create dbo.Sales and dbo.SaleReturns', code: sql`
DROP TABLE IF EXISTS dbo.SaleReturns, dbo.Sales;
CREATE TABLE dbo.Sales (
    SaleId     int           NOT NULL CONSTRAINT PK_Sales PRIMARY KEY,
    SaleDate   date          NOT NULL,
    CustomerId int           NOT NULL,
    ProductId  int           NOT NULL,
    Quantity   int           NOT NULL,
    Amount     decimal(10,2) NOT NULL,
    Channel    varchar(10)   NOT NULL,
    Notes      char(100)     NULL
);
INSERT INTO dbo.Sales (SaleId, SaleDate, CustomerId, ProductId, Quantity, Amount, Channel)
SELECT value,
       DATEADD(day, value * 37 % 1096, '2022-01-01'),
       value * 7919 % 5000 + 1,
       value % 12 + 1,
       value % 7 + 1,
       value * 31 % 9000 / 100.0 + 1,
       CASE value % 10 WHEN 0 THEN 'Phone' WHEN 1 THEN 'Shop' WHEN 2 THEN 'Shop' ELSE 'Web' END
FROM GENERATE_SERIES(1, 100000);

CREATE INDEX IX_Sales_CustomerId ON dbo.Sales (CustomerId);

CREATE TABLE dbo.SaleReturns (
    SaleId     int          NOT NULL CONSTRAINT PK_SaleReturns PRIMARY KEY,
    ReturnedOn date         NOT NULL,
    Reason     nvarchar(40) NOT NULL
);
INSERT INTO dbo.SaleReturns (SaleId, ReturnedOn, Reason)
SELECT SaleId, DATEADD(day, 14, SaleDate), N'Damaged'
FROM dbo.Sales
WHERE SaleId % 20 = 0;` },

      { type: 'h2', text: 'Getting a plan' },
      { type: 'ul', items: [
        '**Estimated plan** (SSMS: Ctrl+L, or Display Estimated Execution Plan): the plan the optimizer would use. The query does not run.',
        '**Actual plan** (SSMS: Ctrl+M, Include Actual Execution Plan, then run): the same plan after the query has run, with the real number of rows each operator produced.',
        '**In a script**: `SET SHOWPLAN_TEXT ON` returns the estimated plan as text instead of running the queries. It must be in a batch of its own, so it is followed by GO.'
      ] },
      { type: 'code', code: sql`
SET SHOWPLAN_TEXT ON;
GO
SELECT c.FirstName, o.OrderDate
FROM dbo.Orders AS o
JOIN dbo.Customers AS c ON c.CustomerId = o.CustomerId
WHERE o.Status = 'Pending';
GO
SET SHOWPLAN_TEXT OFF;`, output: 'StmtText\n---------------------------------------------------------------------------------------------------------------------------------------\nSELECT c.FirstName, o.OrderDate\nFROM dbo.Orders AS o\nJOIN dbo.Customers AS c ON c.CustomerId = o.CustomerId\nWHERE o.Status = \'Pending\';\n\nStmtText\n-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n  |--Nested Loops(Inner Join, OUTER REFERENCES:([o].[CustomerId]))\n       |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[Orders].[PK__Orders__C3905BCFAE1579C2] AS [o]), WHERE:([BuildMart].[dbo].[Orders].[Status] as [o].[Status]=\'Pending\'))\n       |--Clustered Index Seek(OBJECT:([BuildMart].[dbo].[Customers].[PK__Customer__A4AE64D8EB2B6A42] AS [c]), SEEK:([c].[CustomerId]=[BuildMart].[dbo].[Orders].[CustomerId] as [o].[CustomerId]) ORDERED FORWARD)' },
      { type: 'p', text: 'How to read the text form:' },
      { type: 'ul', items: [
        'Each `|--` line is one operator. The lines indented under an operator are its inputs.',
        'Rows flow **upwards**: the most indented operators run first and pass their rows to the line above.',
        'Here: scan Orders keeping the Pending rows, and for each one (Nested Loops) seek Customers by its key.'
      ] },
      { type: 'p', text: 'The graphical plan in SSMS shows the same tree turned on its side: the first operator to produce rows is on the **right**, and rows flow **right to left** to the SELECT on the left. Arrow thickness shows how many rows pass. Hover over an operator for its details.' },

      { type: 'h2', text: 'Operators that read tables' },
      { type: 'table', head: ['Operator', 'What it does'], rows: [
        ['Table Scan', 'Reads every page of a heap.'],
        ['Clustered Index Scan', 'Reads every leaf page of the clustered index, which is the whole table.'],
        ['Index Scan', 'Reads every leaf page of a nonclustered index (smaller than the table).'],
        ['Clustered Index Seek / Index Seek', 'Goes down the tree to the rows for a key or range. A seek can still read many rows if the range is wide.'],
        ['Key Lookup', 'Fetches a row from the clustered index for a row found in a nonclustered index. In text plans it is a Clustered Index Seek with LOOKUP.'],
        ['RID Lookup', 'The same for a heap, using the row’s address.']
      ] },
      { type: 'note', kind: 'info', text: 'Each operator also shows a **predicate**. A `SEEK:` predicate is used to navigate the tree. A `WHERE:` predicate is checked on every row the operator reads. A scan with a WHERE predicate reads everything and throws most of it away.' },

      { type: 'h2', text: 'The three join operators' },
      { type: 'p', text: 'Whatever join you write, SQL Server runs it with one of three physical operators:' },
      { type: 'table', head: ['Operator', 'How it works', 'Good when'], rows: [
        ['Nested Loops', 'For each row of the outer (top) input, search the inner (bottom) input.', 'The outer input is small and the inner one has an index on the join column.'],
        ['Merge Join', 'Reads both inputs sorted on the join column and zips them together.', 'Both inputs are already sorted on the join key, for example both clustered on it.'],
        ['Hash Match', 'Builds a hash table from the smaller input, then probes it with each row of the larger.', 'Large inputs with no useful order or index. Needs memory.']
      ] },
      { type: 'p', text: '**Nested Loops.** Only two customers live in York, and IX_Sales_CustomerId can find each one’s sales directly. So SQL Server reads the York customers and, for each, seeks the index:' },
      { type: 'code', code: sql`
SET SHOWPLAN_TEXT ON;
GO
SELECT c.FirstName, COUNT(*) AS SalesRows
FROM dbo.Customers AS c
JOIN dbo.Sales AS s ON s.CustomerId = c.CustomerId
WHERE c.City = N'York'
GROUP BY c.FirstName;
GO
SET SHOWPLAN_TEXT OFF;`, output: 'StmtText\n-----------------------------------------------------------------------------------------------------------------------------------------------------------------\nSELECT c.FirstName, COUNT(*) AS SalesRows\nFROM dbo.Customers AS c\nJOIN dbo.Sales AS s ON s.CustomerId = c.CustomerId\nWHERE c.City = N\'York\'\nGROUP BY c.FirstName;\n\nStmtText\n-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n  |--Compute Scalar(DEFINE:([Expr1002]=CONVERT_IMPLICIT(int,[Expr1005],0)))\n       |--Stream Aggregate(GROUP BY:([c].[FirstName]) DEFINE:([Expr1005]=Count(*)))\n            |--Nested Loops(Inner Join, OUTER REFERENCES:([c].[CustomerId]))\n                 |--Sort(ORDER BY:([c].[FirstName] ASC))\n                 |    |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[Customers].[PK__Customer__A4AE64D82EF48356] AS [c]), WHERE:([BuildMart].[dbo].[Customers].[City] as [c].[City]=N\'York\'))\n                 |--Index Seek(OBJECT:([BuildMart].[dbo].[Sales].[IX_Sales_CustomerId] AS [s]), SEEK:([s].[CustomerId]=[BuildMart].[dbo].[Customers].[CustomerId] as [c].[CustomerId]) ORDERED FORWARD)' },
      { type: 'p', text: '**Merge Join.** Sales and SaleReturns are both clustered on SaleId, so both can be read in SaleId order and matched in a single pass:' },
      { type: 'code', code: sql`
SET SHOWPLAN_TEXT ON;
GO
SELECT COUNT(*) AS Returned, SUM(s.Amount) AS Refunded
FROM dbo.Sales AS s
JOIN dbo.SaleReturns AS r ON r.SaleId = s.SaleId;
GO
SET SHOWPLAN_TEXT OFF;`, output: 'StmtText\n----------------------------------------------------------------------------------------------------------------------------\nSELECT COUNT(*) AS Returned, SUM(s.Amount) AS Refunded\nFROM dbo.Sales AS s\nJOIN dbo.SaleReturns AS r ON r.SaleId = s.SaleId;\n\nStmtText\n------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n  |--Compute Scalar(DEFINE:([Expr1002]=CONVERT_IMPLICIT(int,[Expr1010],0), [Expr1003]=CASE WHEN [Expr1010]=(0) THEN NULL ELSE [Expr1011] END))\n       |--Stream Aggregate(DEFINE:([Expr1010]=Count(*), [Expr1011]=SUM([BuildMart].[dbo].[Sales].[Amount] as [s].[Amount])))\n            |--Merge Join(Inner Join, MERGE:([r].[SaleId])=([s].[SaleId]), RESIDUAL:([BuildMart].[dbo].[Sales].[SaleId] as [s].[SaleId]=[BuildMart].[dbo].[SaleReturns].[SaleId] as [r].[SaleId]))\n                 |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[SaleReturns].[PK_SaleReturns] AS [r]), ORDERED FORWARD)\n                 |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[Sales].[PK_Sales] AS [s]), ORDERED FORWARD)' },
      { type: 'p', text: '**Hash Match.** Which sales were above that customer’s own average? The derived table works out 5,000 averages, in no useful order, and they are joined to all 100,000 sales:' },
      { type: 'code', code: sql`
SET SHOWPLAN_TEXT ON;
GO
SELECT COUNT(*) AS AboveAverage
FROM dbo.Sales AS s
JOIN (SELECT CustomerId, AVG(Amount) AS AvgAmount
      FROM dbo.Sales
      GROUP BY CustomerId) AS a ON a.CustomerId = s.CustomerId
WHERE s.Amount > a.AvgAmount;
GO
SET SHOWPLAN_TEXT OFF;`, output: 'StmtText\n-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\nSELECT COUNT(*) AS AboveAverage\nFROM dbo.Sales AS s\nJOIN (SELECT CustomerId, AVG(Amount) AS AvgAmount\n      FROM dbo.Sales\n      GROUP BY CustomerId) AS a ON a.CustomerId = s.CustomerId\nWHERE s.Amount > a.AvgAmount;\n\nStmtText\n-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n  |--Compute Scalar(DEFINE:([Expr1004]=CONVERT_IMPLICIT(int,[Expr1013],0)))\n       |--Stream Aggregate(DEFINE:([Expr1013]=Count(*)))\n            |--Hash Match(Inner Join, HASH:([BuildMart].[dbo].[Sales].[CustomerId])=([s].[CustomerId]), RESIDUAL:([BuildMart].[dbo].[Sales].[CustomerId] as [s].[CustomerId]=[BuildMart].[dbo].[Sales].[CustomerId] AND [BuildMart].[dbo].[Sales].[Amount] as [s].[Amount]>[Expr1003]))\n                 |--Compute Scalar(DEFINE:([Expr1003]=CASE WHEN [Expr1011]=(0) THEN NULL ELSE [Expr1012]/CONVERT_IMPLICIT(decimal(19,0),[Expr1011],0) END))\n                 |    |--Hash Match(Aggregate, HASH:([BuildMart].[dbo].[Sales].[CustomerId]) DEFINE:([Expr1011]=COUNT(*), [Expr1012]=SUM([BuildMart].[dbo].[Sales].[Amount])))\n                 |         |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[Sales].[PK_Sales]))\n                 |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[Sales].[PK_Sales] AS [s]))' },
      { type: 'p', text: 'Note how the plans also aggregate: a **Stream Aggregate** works on rows that arrive sorted by the GROUP BY columns and needs almost no memory; a **Hash Match (Aggregate)** builds a hash table of groups, as the last plan does to work out the 5,000 averages before it joins them. The same operator name covers both jobs; the word in brackets (Inner Join or Aggregate) tells you which.' },

      { type: 'h2', text: 'Sorts and their cost' },
      { type: 'p', text: 'A **Sort** operator must read all its input before it can return the first row, and it needs memory for it. ORDER BY, DISTINCT, GROUP BY and Merge Join can all add one when no index provides the order. If the memory granted is too small, the sort **spills** to tempdb and slows down sharply; the actual plan then shows a warning on the Sort.' },

      { type: 'h2', text: 'Costs are estimates' },
      { type: 'p', text: 'The graphical plan shows a cost percentage on each operator. It is the optimizer’s **estimate**, based on the rows it expected, not a measurement. It is still a good place to start: look at the most expensive operators first.' },
      { type: 'p', text: 'The most useful thing in an **actual** plan is the comparison of **estimated** and **actual** rows. When they differ by a factor of ten or more, the optimizer chose the plan for a different query from the one that ran. The widget shows actual plans from SQL Server with both numbers:' },
      { type: 'widget', name: 'plan-reader' },

      { type: 'h2', text: 'What to look for first' },
      { type: 'ul', items: [
        '**Scans of big tables** when you expected a handful of rows: a missing index, or a WHERE the index cannot use (next lesson).',
        '**Key Lookups** with many executions: make the index cover the query.',
        '**Estimated vs actual rows** far apart: statistics are stale or the predicate cannot be estimated.',
        '**Warnings** (a yellow triangle): implicit conversions, sorts or hashes that spilled, missing statistics.',
        '**Missing index** suggestions (green text above the plan): useful hints, but check them before you create anything.'
      ] },

      { type: 'quiz', question: 'In a graphical execution plan in SSMS, where does the data flow start?', options: ['At the left, with the SELECT operator', 'At the right: the rightmost operators read the data and pass rows to the left', 'At the top', 'At the operator with the highest cost'], answer: 1, explain: 'Plans are read right to left: the operators that read tables are on the right, and rows flow left to the SELECT.' },
      { type: 'quiz', question: 'Which join operator suits a small outer input and an index on the inner input’s join column?', options: ['Hash Match', 'Merge Join', 'Nested Loops', 'Sort'], answer: 2, explain: 'Nested Loops runs one seek on the inner input per outer row. With few outer rows and an index, that is very cheap.' },
      { type: 'exercise', task: 'Get the estimated plan (SET SHOWPLAN_TEXT ON) for a query that returns each Channel with the total Amount of its 2024 sales, largest total first. Which operator reads the table, and how does SQL Server group the rows?', hint: 'GROUP BY Channel with WHERE SaleDate >= \'2024-01-01\' AND SaleDate < \'2025-01-01\' and ORDER BY the total DESC. Remember the GO lines around SHOWPLAN_TEXT.', solution: sql`
SET SHOWPLAN_TEXT ON;
GO
SELECT Channel, SUM(Amount) AS Total
FROM dbo.Sales
WHERE SaleDate >= '2024-01-01' AND SaleDate < '2025-01-01'
GROUP BY Channel
ORDER BY Total DESC;
GO
SET SHOWPLAN_TEXT OFF;`, output: 'StmtText\n----------------------------------------------------------------------------------------------------------------------------------------------------\nSELECT Channel, SUM(Amount) AS Total\nFROM dbo.Sales\nWHERE SaleDate >= \'2024-01-01\' AND SaleDate < \'2025-01-01\'\nGROUP BY Channel\nORDER BY Total DESC;\n\nStmtText\n-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n  |--Sort(ORDER BY:([Expr1002] DESC))\n       |--Hash Match(Aggregate, HASH:([BuildMart].[dbo].[Sales].[Channel]), RESIDUAL:([BuildMart].[dbo].[Sales].[Channel] = [BuildMart].[dbo].[Sales].[Channel]) DEFINE:([Expr1002]=SUM([BuildMart].[dbo].[Sales].[Amount])))\n            |--Clustered Index Scan(OBJECT:([BuildMart].[dbo].[Sales].[PK_Sales]), WHERE:([BuildMart].[dbo].[Sales].[SaleDate]>=\'2024-01-01\' AND [BuildMart].[dbo].[Sales].[SaleDate]<\'2025-01-01\'))' }
    ],
    keyPoints: [
      'The optimizer turns a query into a plan of operators, choosing by estimated cost.',
      'Estimated plans show the choice; actual plans add the real row counts. SHOWPLAN_TEXT gives the plan as text.',
      'Read text plans from the innermost line up, and graphical plans from right to left.',
      'Scans read everything; seeks navigate the tree; lookups fetch missing columns one row at a time.',
      'Nested Loops suits small outer inputs with an index, Merge Join sorted inputs, Hash Match large unsorted ones.',
      'Compare estimated and actual rows: a big gap means the plan was chosen for the wrong amount of data.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'sargability-statistics',
    title: 'Sargable queries and statistics',
    summary: 'Why a WHERE that wraps the column in a function cannot use an index, how to rewrite it, implicit conversions, and the statistics the optimizer uses to estimate rows: histograms, automatic updates, and what stale statistics do to a plan.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'An index only helps if SQL Server can use it to seek. Whether it can depends on how you write the WHERE. A predicate that can use an index seek is called **sargable**, from “Search ARGument ABLE”. Start from a fresh table with three nonclustered indexes:' },
      { type: 'code', title: 'Create dbo.Sales with three indexes', code: sql`
DROP TABLE IF EXISTS dbo.Sales;
CREATE TABLE dbo.Sales (
    SaleId     int           NOT NULL CONSTRAINT PK_Sales PRIMARY KEY,
    SaleDate   date          NOT NULL,
    CustomerId int           NOT NULL,
    ProductId  int           NOT NULL,
    Quantity   int           NOT NULL,
    Amount     decimal(10,2) NOT NULL,
    Channel    varchar(10)   NOT NULL,
    Notes      char(100)     NULL
);
INSERT INTO dbo.Sales (SaleId, SaleDate, CustomerId, ProductId, Quantity, Amount, Channel)
SELECT value,
       DATEADD(day, value * 37 % 1096, '2022-01-01'),
       value * 7919 % 5000 + 1,
       value % 12 + 1,
       value % 7 + 1,
       value * 31 % 9000 / 100.0 + 1,
       CASE value % 10 WHEN 0 THEN 'Phone' WHEN 1 THEN 'Shop' WHEN 2 THEN 'Shop' ELSE 'Web' END
FROM GENERATE_SERIES(1, 100000);

CREATE INDEX IX_Sales_SaleDate ON dbo.Sales (SaleDate);
CREATE INDEX IX_Sales_Channel  ON dbo.Sales (Channel);
CREATE INDEX IX_Sales_Amount   ON dbo.Sales (Amount);` },

      { type: 'h2', text: 'Keep the column alone' },
      { type: 'p', text: 'Both queries below count the sales of June 2023. The first wraps SaleDate in functions; the second compares the bare column with a range:' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows FROM dbo.Sales
WHERE YEAR(SaleDate) = 2023 AND MONTH(SaleDate) = 6;

SELECT COUNT(*) AS SalesRows FROM dbo.Sales
WHERE SaleDate >= '2023-06-01' AND SaleDate < '2023-07-01';
SET STATISTICS IO OFF;`, output: 'SalesRows\n---------\n     2737\n\nTable \'Sales\'. Scan count 1, logical reads 163, physical reads 1, page server reads 0, read-ahead reads 161, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows\n---------\n     2737\n\nTable \'Sales\'. Scan count 1, logical reads 8, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'Same answer, very different work. The index is sorted by SaleDate, not by `YEAR(SaleDate)`. To find the rows where a function of the column has some value, SQL Server must compute the function for **every** row, so it scans the whole index. With the bare column, it seeks to 2023-06-01 and stops at 2023-07-01.' },
      { type: 'p', text: 'The rule: **do the arithmetic on the other side**. Leave the indexed column alone and move the calculation to the constant or parameter:' },
      { type: 'table', head: ['Not sargable', 'Sargable rewrite'], rows: [
        ['`WHERE YEAR(SaleDate) = 2023`', '`WHERE SaleDate >= \'2023-01-01\' AND SaleDate < \'2024-01-01\'`'],
        ['`WHERE DATEADD(day, 30, SaleDate) > GETDATE()`', '`WHERE SaleDate > DATEADD(day, -30, GETDATE())`'],
        ['`WHERE Amount * 1.2 > 60`', '`WHERE Amount > 50`'],
        ['`WHERE LEFT(Name, 3) = N\'Cem\'`', '`WHERE Name LIKE N\'Cem%\'`'],
        ['`WHERE ISNULL(City, N\'\') = N\'Leeds\'`', '`WHERE City = N\'Leeds\'`'],
        ['`WHERE CONVERT(char(8), SaleDate, 112) = \'20230601\'`', '`WHERE SaleDate = \'2023-06-01\'`']
      ] },
      { type: 'note', kind: 'tip', text: 'One function is the exception: `CAST(DateTimeColumn AS date) = \'2023-06-01\'` can still seek, because SQL Server converts it into a range itself. It is the only common case; do not count on it for anything else.' },
      { type: 'widget', name: 'sarg-check' },

      { type: 'h2', text: 'LIKE and leading wildcards' },
      { type: 'p', text: '`LIKE \'Sh%\'` is a range: everything from “Sh” up to just before “Si”, so it can seek. `LIKE \'%op\'` can match anywhere in the sort order, so every row must be checked:' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows FROM dbo.Sales WHERE Channel LIKE 'Sh%';
SELECT COUNT(*) AS SalesRows FROM dbo.Sales WHERE Channel LIKE '%op';
SET STATISTICS IO OFF;`, output: 'SalesRows\n---------\n    20000\n\nTable \'Sales\'. Scan count 1, logical reads 48, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows\n---------\n    20000\n\nTable \'Sales\'. Scan count 1, logical reads 218, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },

      { type: 'h2', text: 'Implicit conversions' },
      { type: 'p', text: 'Channel is `varchar`. Compare it with an `nvarchar` value (with the N prefix) and the two types do not match. nvarchar has the higher data type precedence, so SQL Server converts the **column**, row by row:' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows FROM dbo.Sales WHERE Channel = 'Phone';
SELECT COUNT(*) AS SalesRows FROM dbo.Sales WHERE Channel = N'Phone';
SET STATISTICS IO OFF;
GO
SET SHOWPLAN_TEXT ON;
GO
SELECT COUNT(*) AS SalesRows FROM dbo.Sales WHERE Channel = N'Phone';
GO
SET SHOWPLAN_TEXT OFF;`, output: 'SalesRows\n---------\n    10000\n\nTable \'Sales\'. Scan count 1, logical reads 26, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows\n---------\n    10000\n\nTable \'Sales\'. Scan count 1, logical reads 218, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nStmtText\n---------------------------------------------------------------------\nSELECT COUNT(*) AS SalesRows FROM dbo.Sales WHERE Channel = N\'Phone\';\n\nStmtText\n----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n  |--Compute Scalar(DEFINE:([Expr1002]=CONVERT_IMPLICIT(int,[Expr1006],0)))\n       |--Stream Aggregate(DEFINE:([Expr1006]=Count(*)))\n            |--Index Scan(OBJECT:([BuildMart].[dbo].[Sales].[IX_Sales_Channel]),  WHERE:(CONVERT_IMPLICIT(nvarchar(10),[BuildMart].[dbo].[Sales].[Channel],0)=N\'Phone\'))' },
      { type: 'p', text: 'The plan shows `CONVERT_IMPLICIT(nvarchar(10), [Channel], 0)` inside a scan. This happens often with applications: .NET strings are sent as nvarchar by default, so a parameter compared with a varchar column can silently turn every seek into a scan. Match parameter types to column types.' },
      { type: 'note', kind: 'info', text: 'How bad it is depends on the collation. With a Windows collation (such as `Latin1_General_CI_AS`), SQL Server can still seek, using a range it works out at run time. With an SQL collation (such as `SQL_Latin1_General_CP1_CI_AS`, the default on many servers), it must scan, as here. Either way, the plan shows a warning.' },

      { type: 'h2', text: 'Statistics: what the optimizer knows' },
      { type: 'p', text: 'To choose between a seek with lookups and a scan, the optimizer needs to know **how many rows** a predicate will return before it runs. It gets that from **statistics**: a summary of the values in a column, kept for every index and for other columns used in WHERE clauses.' },
      { type: 'p', text: 'The core of a statistic is a **histogram** of the first key column, with up to 200 steps. Channel has only three values, so its histogram has three steps:' },
      { type: 'code', code: sql`
DBCC SHOW_STATISTICS (N'dbo.Sales', IX_Sales_Channel) WITH HISTOGRAM;`, output: 'RANGE_HI_KEY  RANGE_ROWS  EQ_ROWS  DISTINCT_RANGE_ROWS  AVG_RANGE_ROWS\n------------  ----------  -------  -------------------  --------------\nPhone                  0    10000                    0               1\nShop                   0    20000                    0               1\nWeb                    0    70000                    0               1\n\nDBCC execution completed. If DBCC printed error messages, contact your system administrator.' },
      { type: 'ul', items: [
        '**RANGE_HI_KEY**: the top value of the step.',
        '**EQ_ROWS**: rows equal to that value.',
        '**RANGE_ROWS** and **DISTINCT_RANGE_ROWS**: rows (and distinct values) between this step and the one before.',
        '**AVG_RANGE_ROWS**: the estimate for one value inside the range.'
      ] },
      { type: 'p', text: 'For `Channel = \'Phone\'` the optimizer reads 10,000 straight from the histogram: far too many for lookups. For a date column with 1,096 values, each histogram step covers a range of days, and the estimate for one day inside a step is that step’s average. `sys.dm_db_stats_properties` shows how big each statistic is and how much the table has changed since it was built:' },
      { type: 'code', code: sql`
SELECT s.name AS StatName, p.rows, p.rows_sampled, p.steps, p.modification_counter
FROM sys.stats AS s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) AS p
WHERE s.object_id = OBJECT_ID(N'dbo.Sales')
ORDER BY s.stats_id;`, output: 'StatName             rows  rows_sampled  steps  modification_counter\n-----------------  ------  ------------  -----  --------------------\nPK_Sales             NULL          NULL   NULL                  NULL\nIX_Sales_SaleDate  100000        100000    200                     0\nIX_Sales_Channel   100000        100000      3                     0\nIX_Sales_Amount    100000        100000      3                     0' },
      { type: 'p', text: 'Statistics on an index are built with a full scan when the index is created. PK_Sales shows NULLs because its index was created on the empty table, before the INSERT; its statistics will be filled in the first time a query needs them. `modification_counter` counts the changed rows since then. When enough rows have changed, SQL Server **updates the statistics automatically** the next time a query needs them. On a table this size the threshold is about √(1,000 × rows): 10,000 changes for 100,000 rows.' },

      { type: 'h2', text: 'Stale statistics, bad plans' },
      { type: 'p', text: 'Now load a big batch: 5,000 sales on one new day, 2025-01-15. That is below the threshold, so the statistics are not updated, and the histogram still ends at 2024-12-31.' },
      { type: 'code', code: sql`
INSERT INTO dbo.Sales (SaleId, SaleDate, CustomerId, ProductId, Quantity, Amount, Channel)
SELECT 100000 + value, '2025-01-15', value % 5000 + 1, value % 12 + 1, 1, 9.99, 'Web'
FROM GENERATE_SERIES(1, 5000);

SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Quantity) AS Items
FROM dbo.Sales
WHERE SaleDate = '2025-01-15';
SET STATISTICS IO OFF;`, output: 'SalesRows  Items\n---------  -----\n     5000   5000\n\nTable \'Sales\'. Scan count 1, logical reads 15011, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'Because the statistics know nothing about that day, the optimizer guessed about 91 rows, the average for one day, and chose a seek on IX_Sales_SaleDate with a key lookup per row (Quantity is not in the index). The query found 5,000 rows, so it paid for 5,000 lookups: several times the cost of reading the whole table. Update the statistics and run it again:' },
      { type: 'code', code: sql`
UPDATE STATISTICS dbo.Sales IX_Sales_SaleDate WITH FULLSCAN;

SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows, SUM(Quantity) AS Items
FROM dbo.Sales
WHERE SaleDate = '2025-01-15';
SET STATISTICS IO OFF;`, output: 'SalesRows  Items\n---------  -----\n     5000   5000\n\nTable \'Sales\'. Scan count 1, logical reads 1883, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'With the right estimate, the optimizer chose a scan, the cheaper plan for 5,000 rows. Updating statistics also makes the plans that depend on them compile again. Most systems update statistics in a nightly maintenance job as well as automatically, and tables that receive large loads benefit from an `UPDATE STATISTICS` straight after the load.' },
      { type: 'note', kind: 'warn', text: 'This “ascending key” problem is common: new rows usually have the newest dates and IDs, which are exactly the values the histogram has not seen yet. Queries for “today” are the ones most likely to get a bad estimate.' },

      { type: 'quiz', question: 'Which WHERE clause can seek an index on OrderDate?', options: ['WHERE YEAR(OrderDate) = 2024', 'WHERE DATEDIFF(day, OrderDate, GETDATE()) < 7', 'WHERE OrderDate >= DATEADD(day, -7, GETDATE())', 'WHERE CONVERT(varchar(10), OrderDate, 120) LIKE \'2024%\''], answer: 2, explain: 'Only the third leaves OrderDate alone on one side; the calculation is done once on GETDATE(). The others apply a function to every row’s OrderDate.' },
      { type: 'quiz', question: 'A query’s actual plan shows 1 estimated row and 40,000 actual rows on an index seek with key lookups. What is the first thing to check?', options: ['Whether the server needs more memory', 'Whether the statistics on that index are out of date', 'Whether the table needs a heap', 'Whether STATISTICS IO is on'], answer: 1, explain: 'A huge gap between estimated and actual rows usually means the statistics do not describe the data: often new rows beyond the end of the histogram.' },
      { type: 'exercise', task: 'This query counts the sales of December 2024: `SELECT COUNT(*) AS SalesRows FROM dbo.Sales WHERE DATEPART(year, SaleDate) = 2024 AND DATEPART(month, SaleDate) = 12;`. Rewrite it to be sargable and compare the reads of both versions.', hint: 'December 2024 is SaleDate >= \'2024-12-01\' AND SaleDate < \'2025-01-01\'.', solution: sql`
SET STATISTICS IO ON;
SELECT COUNT(*) AS SalesRows
FROM dbo.Sales
WHERE DATEPART(year, SaleDate) = 2024 AND DATEPART(month, SaleDate) = 12;

SELECT COUNT(*) AS SalesRows
FROM dbo.Sales
WHERE SaleDate >= '2024-12-01' AND SaleDate < '2025-01-01';
SET STATISTICS IO OFF;`, output: 'SalesRows\n---------\n     2827\n\nTable \'Sales\'. Scan count 1, logical reads 171, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows\n---------\n     2827\n\nTable \'Sales\'. Scan count 1, logical reads 7, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' }
    ],
    keyPoints: [
      'A predicate is sargable when the column stands alone, so an index on it can be sought.',
      'Functions and arithmetic on the column force a scan: move the calculation to the other side.',
      'LIKE \'abc%\' can seek; LIKE \'%abc\' cannot.',
      'Comparing a varchar column with nvarchar converts the column (CONVERT_IMPLICIT), often turning a seek into a scan.',
      'Statistics hold a histogram of up to 200 steps; the optimizer uses them to estimate rows and choose a plan.',
      'Stale statistics, especially for new values beyond the histogram, cause bad estimates and bad plans. UPDATE STATISTICS fixes them.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'query-tuning',
    title: 'Finding and fixing slow queries',
    summary: 'A method for tuning: find the queries that cost the most, measure, read the plan, change one thing and measure again. Missing-index suggestions, fixing a sort with the right index, and parameter sniffing with its fixes.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'This lesson puts the module together into a method you can use on a real system:' },
      { type: 'ol', items: [
        '**Find** the queries that cost the most in total, not the one someone complained about last.',
        '**Measure** one of them: logical reads with STATISTICS IO, and time.',
        '**Read the plan**: scans, lookups, sorts, estimate gaps, warnings.',
        '**Change one thing**: an index, a rewrite, a statistics update.',
        '**Measure again**, and check that nothing else got worse.'
      ] },
      { type: 'p', text: 'Start from a fresh Sales table. This time there is one very large customer: customer 1 is a trade account with 20,000 extra sales.' },
      { type: 'code', title: 'Create dbo.Sales with a trade account', code: sql`
DROP TABLE IF EXISTS dbo.Sales;
CREATE TABLE dbo.Sales (
    SaleId     int           NOT NULL CONSTRAINT PK_Sales PRIMARY KEY,
    SaleDate   date          NOT NULL,
    CustomerId int           NOT NULL,
    ProductId  int           NOT NULL,
    Quantity   int           NOT NULL,
    Amount     decimal(10,2) NOT NULL,
    Channel    varchar(10)   NOT NULL,
    Notes      char(100)     NULL
);
INSERT INTO dbo.Sales (SaleId, SaleDate, CustomerId, ProductId, Quantity, Amount, Channel)
SELECT value,
       DATEADD(day, value * 37 % 1096, '2022-01-01'),
       CASE WHEN value > 100000 THEN 1 ELSE value * 7919 % 5000 + 1 END,
       value % 12 + 1,
       value % 7 + 1,
       value * 31 % 9000 / 100.0 + 1,
       CASE value % 10 WHEN 0 THEN 'Phone' WHEN 1 THEN 'Shop' WHEN 2 THEN 'Shop' ELSE 'Web' END
FROM GENERATE_SERIES(1, 120000);

SELECT CASE WHEN CustomerId = 1 THEN 'Customer 1' ELSE 'Each other customer' END AS Who,
       MAX(n) AS SalesRows
FROM (SELECT CustomerId, COUNT(*) AS n FROM dbo.Sales GROUP BY CustomerId) AS c
GROUP BY CASE WHEN CustomerId = 1 THEN 'Customer 1' ELSE 'Each other customer' END;`, output: 'Who                  SalesRows\n-------------------  ---------\nCustomer 1               20020\nEach other customer         20' },

      { type: 'h2', text: 'Step 1: find the expensive queries' },
      { type: 'p', text: 'SQL Server keeps figures for every cached plan in `sys.dm_exec_query_stats`. This lists the ten statements that have done the most logical reads in total since their plans were cached (your results depend on what has run):' },
      { type: 'code', code: sql`
SELECT TOP (10)
       qs.execution_count,
       qs.total_logical_reads,
       qs.total_logical_reads / qs.execution_count AS avg_reads,
       qs.total_elapsed_time / qs.execution_count / 1000 AS avg_ms,
       SUBSTRING(t.text, qs.statement_start_offset / 2 + 1,
                 (CASE qs.statement_end_offset WHEN -1 THEN DATALENGTH(t.text)
                       ELSE qs.statement_end_offset END - qs.statement_start_offset) / 2 + 1) AS statement_text
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS t
ORDER BY qs.total_logical_reads DESC;` },
      { type: 'p', text: 'Sort by **total**, not average: a query that does 2,000 reads and runs 50,000 times a day matters more than a 100,000-read report that runs once. The cache forgets plans when the server restarts or memory runs short, so for history use the **Query Store**: it records plans and run-time figures in the database itself, and is on by default for new databases in SQL Server 2022. In SSMS, open the database’s Query Store folder and choose **Top Resource Consuming Queries**.' },

      { type: 'h2', text: 'Steps 2 to 5 on one query' },
      { type: 'p', text: 'The website shows each customer their five most recent purchases. Measure it:' },
      { type: 'code', code: sql`
SET STATISTICS IO ON;
SELECT TOP (5) SaleDate, Amount
FROM dbo.Sales
WHERE CustomerId = 3000
ORDER BY SaleDate DESC;
SET STATISTICS IO OFF;`, output: 'SaleDate    Amount\n----------  ------\n2024-12-21   10.51\n2024-08-15   80.51\n2024-07-22   90.51\n2024-06-28   10.51\n2024-06-04   20.51\n\nTable \'Sales\'. Scan count 1, logical reads 2152, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'Every page for five rows. The plan would show a Clustered Index Scan with a WHERE predicate, and a Top N Sort. While compiling it, the optimizer noticed that an index would have helped, and recorded a **missing index** suggestion:' },
      { type: 'code', code: sql`
SELECT d.equality_columns, d.inequality_columns, d.included_columns,
       CAST(s.avg_user_impact AS int) AS est_improvement_pct
FROM sys.dm_db_missing_index_details AS d
JOIN sys.dm_db_missing_index_groups AS g ON g.index_handle = d.index_handle
JOIN sys.dm_db_missing_index_group_stats AS s ON s.group_handle = g.index_group_handle
WHERE d.database_id = DB_ID() AND d.object_id = OBJECT_ID(N'dbo.Sales');`, output: 'equality_columns  inequality_columns  included_columns  est_improvement_pct\n----------------  ------------------  ----------------  -------------------\n[CustomerId]      NULL                NULL                               99' },
      { type: 'p', text: 'Treat suggestions as hints. This one asks for an index on CustomerId alone. That would find the customer’s 20 rows, but each would still need a key lookup for SaleDate and Amount, and then a sort. With SaleDate as the **second key column**, sorted descending, the rows are already in the order the query wants, and SQL Server can read the first five and stop:' },
      { type: 'code', code: sql`
CREATE INDEX IX_Sales_Customer_Date ON dbo.Sales (CustomerId, SaleDate DESC)
    INCLUDE (Amount);

SET STATISTICS IO ON;
SELECT TOP (5) SaleDate, Amount
FROM dbo.Sales
WHERE CustomerId = 3000
ORDER BY SaleDate DESC;
SET STATISTICS IO OFF;`, output: 'SaleDate    Amount\n----------  ------\n2024-12-21   10.51\n2024-08-15   80.51\n2024-07-22   90.51\n2024-06-28   10.51\n2024-06-04   20.51\n\nTable \'Sales\'. Scan count 1, logical reads 2, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'A few reads instead of a full scan, with no sort. Before keeping the index, ask what it costs: one more structure to maintain on every insert. For a query the website runs on every page view, that is an easy trade.' },
      { type: 'note', kind: 'tip', text: 'Change one thing at a time and measure after each change. If you add three indexes and rewrite the query at once, you will not know which change helped, and you may keep indexes that do nothing.' },

      { type: 'h2', text: 'Parameter sniffing' },
      { type: 'p', text: 'Stored procedures (and parameterized queries from applications) are compiled once and their plan is reused. The optimizer builds that plan for the parameter values of the **first** call: it “sniffs” them. That is usually good, since compiling costs time. It goes wrong when values need very different plans. Customer 3000 has 20 sales; customer 1 has over 20,000.' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.CustomerSummary @CustomerId int
AS
SELECT COUNT(*) AS SalesRows, SUM(Quantity) AS Items, SUM(Amount) AS Spent
FROM dbo.Sales
WHERE CustomerId = @CustomerId;
GO
SET STATISTICS IO ON;
EXEC dbo.CustomerSummary @CustomerId = 3000;   -- compiled for 20 rows
EXEC dbo.CustomerSummary @CustomerId = 1;      -- reuses that plan
SET STATISTICS IO OFF;`, output: 'SalesRows  Items    Spent\n---------  -----  -------\n       20     83  1000.20\n\nTable \'Sales\'. Scan count 1, logical reads 62, physical reads 3, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows  Items      Spent\n---------  -----  ---------\n    20020  80086  921000.00\n\nTable \'Sales\'. Scan count 1, logical reads 60127, physical reads 5, page server reads 0, read-ahead reads 22, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'The first call compiled a plan for 20 rows: seek IX_Sales_Customer_Date, then a key lookup per row, because Quantity is not in the index. The second call reused it for over 20,000 rows, so it did over 20,000 lookups. Now clear the procedure’s plan and call it in the other order:' },
      { type: 'code', code: sql`
EXEC sp_recompile N'dbo.CustomerSummary';
GO
SET STATISTICS IO ON;
EXEC dbo.CustomerSummary @CustomerId = 1;      -- compiled for 20,000 rows
EXEC dbo.CustomerSummary @CustomerId = 3000;   -- reuses that plan
SET STATISTICS IO OFF;`, output: 'Object \'dbo.CustomerSummary\' was successfully marked for recompilation.\n\nSalesRows  Items      Spent\n---------  -----  ---------\n    20020  80086  921000.00\n\nTable \'Sales\'. Scan count 1, logical reads 2152, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows  Items    Spent\n---------  -----  -------\n       20     83  1000.20\n\nTable \'Sales\'. Scan count 1, logical reads 2152, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },
      { type: 'p', text: 'Now the plan is a scan, fine for customer 1 but wasteful for the 4,999 ordinary customers. The same procedure is fast or slow depending on which call happened to compile it. That is why parameter sniffing problems seem to come and go, often after a restart or a statistics update clears the plan.' },
      { type: 'widget', name: 'param-sniff' },
      { type: 'p', text: 'The fixes, best first:' },
      { type: 'ul', items: [
        '**Make one plan good for every value.** Here, adding Quantity to the index’s INCLUDE list removes the lookups, and the seek is then right for both customers.',
        '**OPTION (RECOMPILE)** on the statement: compile a fresh plan on every call, for its own values. It costs compile time on every run, so use it for queries that run rarely or vary hugely.',
        '**OPTIMIZE FOR UNKNOWN**, or `OPTIMIZE FOR (@CustomerId = 3000)`: plan for an average or a chosen value instead of the first one.',
        'SQL Server 2022 also has **Parameter Sensitive Plan optimization**, which can keep several plans for one query when the statistics show very uneven data. It needs compatibility level 160 and only kicks in for strongly skewed columns.'
      ] },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.CustomerSummary @CustomerId int
AS
SELECT COUNT(*) AS SalesRows, SUM(Quantity) AS Items, SUM(Amount) AS Spent
FROM dbo.Sales
WHERE CustomerId = @CustomerId
OPTION (RECOMPILE);
GO
SET STATISTICS IO ON;
EXEC dbo.CustomerSummary @CustomerId = 3000;
EXEC dbo.CustomerSummary @CustomerId = 1;
SET STATISTICS IO OFF;`, output: 'SalesRows  Items    Spent\n---------  -----  -------\n       20     83  1000.20\n\nTable \'Sales\'. Scan count 1, logical reads 62, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.\n\nSalesRows  Items      Spent\n---------  -----  ---------\n    20020  80086  921000.00\n\nTable \'Sales\'. Scan count 1, logical reads 2152, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' },

      { type: 'h2', text: 'A tuning checklist' },
      { type: 'table', head: ['What you see', 'Likely cause', 'What to try'], rows: [
        ['Scan of a big table for a few rows', 'No index on the WHERE columns', 'An index with the equality columns first'],
        ['Scan although an index exists', 'Non-sargable WHERE or implicit conversion', 'Leave the column alone; match data types'],
        ['Seek plus many Key Lookups', 'Index does not cover the query', 'INCLUDE the missing columns'],
        ['Sort before a TOP', 'No index in the ORDER BY order', 'Add the ORDER BY columns to the index key'],
        ['Estimated rows far from actual', 'Stale or missing statistics', 'UPDATE STATISTICS; check for new values beyond the histogram'],
        ['Fast for some values, slow for others', 'Parameter sniffing', 'A covering index, OPTION (RECOMPILE) or OPTIMIZE FOR'],
        ['Same query fast in SSMS, slow from the app', 'Different plans: different SET options or parameter types', 'Compare the plans; check for nvarchar parameters']
      ] },

      { type: 'quiz', question: 'A procedure is fast all morning and very slow after lunch, with no code change. Nothing else is wrong. What is a likely explanation?', options: ['The table was fragmented over lunch', 'The plan was recompiled, and the first call after that used a very different parameter value', 'STATISTICS IO was turned on', 'The procedure ran out of variables'], answer: 1, explain: 'Parameter sniffing: the cached plan suits the values of the call that compiled it. A recompile (statistics update, memory pressure, restart) with an unusual value can leave a plan that is bad for everyone else.' },
      { type: 'quiz', question: 'Why sort the plan cache by total logical reads rather than average?', options: ['Average is not available', 'A cheap query run thousands of times can cost the server more than an expensive one run once', 'Totals are more accurate', 'It sorts faster'], answer: 1, explain: 'Total work is average × executions. A small saving on a very frequent query often helps the server more than a big saving on a rare report.' },
      { type: 'exercise', task: 'The app runs `SELECT SaleId, Amount FROM dbo.Sales WHERE Channel = N\'Phone\' AND SaleDate = \'2024-03-01\';` (it sends the channel as nvarchar). Fix the query so that it can seek, create an index for it, and measure the reads with STATISTICS IO.', hint: 'Channel is varchar, so drop the N prefix (in an app: declare the parameter as varchar(10)). Index (Channel, SaleDate) INCLUDE (Amount); SaleId is the clustering key, so it is in the index already.', solution: sql`
CREATE INDEX IX_Sales_Channel_Date ON dbo.Sales (Channel, SaleDate)
    INCLUDE (Amount);

SET STATISTICS IO ON;
SELECT SaleId, Amount
FROM dbo.Sales
WHERE Channel = 'Phone' AND SaleDate = '2024-03-01';
SET STATISTICS IO OFF;`, output: 'SaleId  Amount\n------  ------\n   910   13.10\n  6390    1.90\n 11870   80.70\n 17350   69.50\n 22830   58.30\n 28310   47.10\n 33790   35.90\n 39270   24.70\n 44750   13.50\n 50230    2.30\n 55710   81.10\n 61190   69.90\n 66670   58.70\n 72150   47.50\n 77630   36.30\n 83110   25.10\n 88590   13.90\n 94070    2.70\n 99550   81.50\n105030   70.30\n110510   59.10\n115990   47.90\n\nTable \'Sales\'. Scan count 1, logical reads 3, physical reads 0, page server reads 0, read-ahead reads 0, page server read-ahead reads 0, lob logical reads 0, lob physical reads 0, lob page server reads 0, lob read-ahead reads 0, lob page server read-ahead reads 0.' }
    ],
    keyPoints: [
      'Tune by method: find, measure, read the plan, change one thing, measure again.',
      'Find costly queries by total work in sys.dm_exec_query_stats or the Query Store.',
      'Missing-index suggestions are hints: check the key order and what the query sorts by.',
      'An index in the ORDER BY order lets TOP read a few rows and stop, with no sort.',
      'Parameter sniffing: a cached plan fits the values that compiled it, and may be bad for others.',
      'Fix sniffing with an index that suits every value, OPTION (RECOMPILE) or OPTIMIZE FOR.'
    ]
  }
];
