import { Lesson } from '../learn.types';
import { sql } from './sql';
import { cs } from '../csharp/cs';

export const MASTER: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'transactions-acid',
    title: 'Transactions and ACID',
    summary: 'Make several changes succeed or fail together: autocommit, BEGIN TRANSACTION, COMMIT and ROLLBACK, why an error does not end a transaction, SET XACT_ABORT ON, the TRY…CATCH pattern, nested transactions, savepoints and what ACID means.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'Placing an order at BuildMart takes several statements: add a row to Orders, add its lines to OrderItems and take the items out of stock. If the server stops after the first two, the shop has an order whose goods were never taken out of stock. A **transaction** groups statements so that they all happen or none of them do.' },
      { type: 'h2', text: 'Every statement is a transaction' },
      { type: 'p', text: 'You have used transactions in every lesson without knowing it. By default SQL Server runs in **autocommit** mode: each INSERT, UPDATE or DELETE is a transaction of its own. A statement that changes 3 rows changes all 3 or none. Here a CHECK constraint stops stock going below zero, and one of the three tools has only 12 in stock:' },
      { type: 'code', code: sql`
ALTER TABLE dbo.Products ADD CONSTRAINT CK_Products_Stock CHECK (Stock >= 0);
GO
UPDATE dbo.Products SET Stock = Stock - 15 WHERE CategoryId = 1;

SELECT Name, Stock FROM dbo.Products WHERE CategoryId = 1;`, output: 'Msg 547, Level 16, State 0, Line 1\nThe UPDATE statement conflicted with the CHECK constraint "CK_Products_Stock". The conflict occurred in database "BuildMart", table "dbo.Products", column \'Stock\'.\nThe statement has been terminated.\n\nName              Stock\n----------------  -----\nClaw hammer          40\nCordless drill       12\nTape measure 8 m     65' },
      { type: 'p', text: 'The hammer and the tape measure had enough stock, but they are unchanged too. The UPDATE failed as a whole, so SQL Server undid the rows it had already changed. You never see a statement half done.' },
      { type: 'h2', text: 'BEGIN TRANSACTION and COMMIT' },
      { type: 'p', text: 'To make **several** statements one unit, start a transaction yourself. `BEGIN TRANSACTION` starts it; `COMMIT` makes every change since then permanent:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;

INSERT INTO dbo.Orders (CustomerId, OrderDate, Status)
VALUES (3, '2024-06-20', 'Pending');

DECLARE @OrderId int = SCOPE_IDENTITY();

INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
VALUES (@OrderId, 2, 1, 89.00),
       (@OrderId, 8, 3, 11.90);

UPDATE dbo.Products
SET Stock = Stock - CASE ProductId WHEN 2 THEN 1 ELSE 3 END
WHERE ProductId IN (2, 8);

COMMIT;

SELECT i.OrderId, p.Name, i.Quantity, p.Stock
FROM dbo.OrderItems AS i
JOIN dbo.Products AS p ON p.ProductId = i.ProductId
WHERE i.OrderId = 11;`, output: 'OrderId  Name               Quantity  Stock\n-------  -----------------  --------  -----\n     11  Cordless drill            1     11\n     11  Wood screws (200)         3    147' },
      { type: 'p', text: 'Until COMMIT runs, the changes are **provisional**. Other sessions cannot see them (the next lesson shows what they see instead), and nothing is permanent yet.' },
      { type: 'h2', text: 'ROLLBACK undoes the lot' },
      { type: 'p', text: '`ROLLBACK` undoes every change since BEGIN TRANSACTION. `@@TRANCOUNT` tells you whether a transaction is open: 0 means none.' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;

DELETE FROM dbo.OrderItems;

SELECT @@TRANCOUNT AS OpenTransactions, COUNT(*) AS OrderLines
FROM dbo.OrderItems;

ROLLBACK;

SELECT @@TRANCOUNT AS OpenTransactions, COUNT(*) AS OrderLines
FROM dbo.OrderItems;`, output: 'OpenTransactions  OrderLines\n----------------  ----------\n               1           0\n\nOpenTransactions  OrderLines\n----------------  ----------\n               0          18' },
      { type: 'p', text: 'Inside the transaction the session sees its own deletes: 0 lines. After ROLLBACK all 18 lines are back. This is a safe way to try a risky UPDATE or DELETE: run it inside a transaction, check the result, then COMMIT or ROLLBACK.' },
      { type: 'note', kind: 'warn', text: 'A transaction left open holds its locks until it ends, and other sessions that need those rows wait. In SSMS, if you run BEGIN TRANSACTION and forget the COMMIT, the window keeps it open. SSMS asks whether to commit when you close the window. Keep transactions short, and never wait for a user to type something while one is open.' },
      { type: 'h2', text: 'The trap: an error does not end the transaction' },
      { type: 'p', text: 'This surprises almost everyone. Most errors stop only the **statement** that failed. The transaction stays open and the batch carries on to the next statement, COMMIT included. Here the second statement refers to an order that does not exist:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;

UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;

INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
VALUES (99, 2, 1, 89.00);          -- there is no order 99

COMMIT;

SELECT Name, Stock, @@TRANCOUNT AS OpenTransactions
FROM dbo.Products WHERE ProductId = 2;`, output: 'Msg 547, Level 16, State 0, Line 5\nThe INSERT statement conflicted with the FOREIGN KEY constraint "FK__OrderItem__Order__412EB0B6". The conflict occurred in database "BuildMart", table "dbo.Orders", column \'OrderId\'.\nThe statement has been terminated.\n\nName            Stock  OpenTransactions\n--------------  -----  ----------------\nCordless drill     11                 0' },
      { type: 'p', text: 'The INSERT failed, but COMMIT still ran, so the drill’s stock went down from 12 to 11 for an order line that was never written. That is exactly the half-done change a transaction was meant to prevent.' },
      { type: 'h2', text: 'SET XACT_ABORT ON' },
      { type: 'p', text: 'With `SET XACT_ABORT ON`, any run-time error **rolls back the whole transaction** and stops the batch. Put it at the top of every script and stored procedure that uses transactions:' },
      { type: 'code', code: sql`
SET XACT_ABORT ON;

BEGIN TRANSACTION;

UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;

INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
VALUES (99, 2, 1, 89.00);

COMMIT;
GO
SELECT Name, Stock, @@TRANCOUNT AS OpenTransactions
FROM dbo.Products WHERE ProductId = 2;`, output: 'Msg 547, Level 16, State 0, Line 7\nThe INSERT statement conflicted with the FOREIGN KEY constraint "FK__OrderItem__Order__412EB0B6". The conflict occurred in database "BuildMart", table "dbo.Orders", column \'OrderId\'.\n\nName            Stock  OpenTransactions\n--------------  -----  ----------------\nCordless drill     12                 0' },
      { type: 'p', text: 'The stock is still 12 and no transaction is open. The COMMIT never ran, because the batch stopped at the error. The SELECT is in a new batch (after `GO`), so it still runs.' },
      { type: 'widget', name: 'tx-stepper' },
      { type: 'h2', text: 'The full pattern: XACT_ABORT with TRY…CATCH' },
      { type: 'p', text: 'XACT_ABORT makes sure nothing is half done. TRY…CATCH (from the error-handling lesson) lets you react: log the error, tidy up, and pass the error on. Together they give the standard shape for a unit of work:' },
      { type: 'code', code: sql`
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;

    INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
    VALUES (99, 2, 1, 89.00);

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;

    PRINT CONCAT('Rolled back: ', ERROR_MESSAGE());
    THROW;                                  -- pass the error on to the caller
END CATCH;`, output: 'Rolled back: The INSERT statement conflicted with the FOREIGN KEY constraint "FK__OrderItem__Order__412EB0B6". The conflict occurred in database "BuildMart", table "dbo.Orders", column \'OrderId\'.\nMsg 547, Level 16, State 0, Line 8\nThe INSERT statement conflicted with the FOREIGN KEY constraint "FK__OrderItem__Order__412EB0B6". The conflict occurred in database "BuildMart", table "dbo.Orders", column \'OrderId\'.' },
      { type: 'p', text: 'In the CATCH block, test before you roll back: if the error happened before BEGIN TRANSACTION, there is nothing to roll back, and ROLLBACK with no open transaction is itself an error. `XACT_STATE()` tells you more than @@TRANCOUNT:' },
      { type: 'table', head: ['XACT_STATE()', 'Meaning', 'What you can do'], rows: [
        ['1', 'A transaction is open and can be committed', 'COMMIT or ROLLBACK'],
        ['0', 'No transaction is open', 'Nothing to end'],
        ['-1', 'A transaction is open but **doomed**: an error means it can only be rolled back', 'ROLLBACK only; a COMMIT fails']
      ] },
      { type: 'p', text: 'With XACT_ABORT ON, every error inside a TRY block dooms the transaction, so XACT_STATE() is -1 in the CATCH block:' },
      { type: 'code', code: sql`
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;
    UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;
    INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
    VALUES (99, 2, 1, 89.00);
END TRY
BEGIN CATCH
    SELECT XACT_STATE() AS XactState, @@TRANCOUNT AS OpenTransactions,
           ERROR_NUMBER() AS ErrorNumber;
    IF XACT_STATE() <> 0 ROLLBACK;
END CATCH;

SELECT XACT_STATE() AS XactState, @@TRANCOUNT AS OpenTransactions;`, output: 'XactState  OpenTransactions  ErrorNumber\n---------  ----------------  -----------\n       -1                 1          547\n\nXactState  OpenTransactions\n---------  ----------------\n        0                 0' },
      { type: 'h2', text: 'Nested transactions are not really nested' },
      { type: 'p', text: 'You can run BEGIN TRANSACTION inside a transaction, but that does not start a second, independent transaction. It only adds 1 to @@TRANCOUNT. COMMIT takes 1 off, and only the COMMIT that brings it to 0 really commits. ROLLBACK always undoes **everything** back to the outermost BEGIN:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;                                     -- @@TRANCOUNT 1
    UPDATE dbo.Products SET Price = 20.00 WHERE ProductId = 1;

    BEGIN TRANSACTION;                                 -- @@TRANCOUNT 2
        UPDATE dbo.Products SET Price = 10.00 WHERE ProductId = 3;
    COMMIT;                                            -- back to 1: nothing is committed yet

    SELECT @@TRANCOUNT AS OpenTransactions;
ROLLBACK;                                              -- undoes both updates

SELECT ProductId, Name, Price FROM dbo.Products WHERE ProductId IN (1, 3);`, output: 'OpenTransactions\n----------------\n               1\n\nProductId  Name              Price\n---------  ----------------  -----\n        1  Claw hammer       18.50\n        3  Tape measure 8 m   9.75' },
      { type: 'p', text: 'The inner COMMIT did not save the tape measure’s new price. This matters when a stored procedure that uses a transaction is called by code that already has one open: the procedure’s COMMIT commits nothing, and its ROLLBACK undoes the caller’s work too.' },
      { type: 'h2', text: 'Savepoints: undo part of a transaction' },
      { type: 'p', text: 'To undo only the last few changes, mark a point with `SAVE TRANSACTION name` and later run `ROLLBACK TRANSACTION name`. The changes before the savepoint stay, and the transaction stays open:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;

INSERT INTO dbo.Orders (CustomerId, OrderDate, Status)
VALUES (5, '2024-06-21', 'Pending');                   -- order 11

SAVE TRANSACTION BeforeLines;

INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
VALUES (11, 12, 3, 6.80);

ROLLBACK TRANSACTION BeforeLines;                      -- undo the line, keep the order

SELECT @@TRANCOUNT AS OpenTransactions;
COMMIT;

SELECT o.OrderId, o.Status,
       (SELECT COUNT(*) FROM dbo.OrderItems AS i WHERE i.OrderId = o.OrderId) AS Lines
FROM dbo.Orders AS o
WHERE o.OrderId = 11;`, output: 'OpenTransactions\n----------------\n               1\n\nOrderId  Status   Lines\n-------  -------  -----\n     11  Pending      0' },
      { type: 'note', kind: 'info', text: 'Savepoints do not work with a doomed transaction: once XACT_STATE() is -1, the only way out is a full ROLLBACK. They are useful for planned partial undo (“try the extras, drop them if they do not fit”), not for recovering from errors.' },
      { type: 'h2', text: 'ACID' },
      { type: 'p', text: 'Database people sum up what a transaction promises with four letters:' },
      { type: 'table', head: ['Letter', 'Promise', 'How SQL Server keeps it'], rows: [
        ['**A**tomicity', 'All the changes happen, or none do', 'Every change is written to the **transaction log** first; ROLLBACK and crash recovery use the log to undo'],
        ['**C**onsistency', 'A transaction takes the data from one valid state to another', 'Constraints (keys, foreign keys, CHECK) are checked; a change that breaks one fails'],
        ['**I**solation', 'Transactions running at the same time do not see each other’s half-done work', 'Locks or row versions; the next two lessons'],
        ['**D**urability', 'Once COMMIT returns, the change survives a crash or power cut', 'COMMIT waits until the log records are on disk; the data pages are written later']
      ] },
      { type: 'p', text: 'Durability works through **write-ahead logging**. A change is made to the page in memory and described in the log. COMMIT returns as soon as the log is safely on disk. The changed data pages are written to the data file later, at a checkpoint. If the server crashes in between, SQL Server reads the log when it starts again: it **redoes** committed changes that had not reached the data file and **undoes** changes from transactions that never committed.' },
      { type: 'quiz', question: 'Without SET XACT_ABORT ON, a transaction runs an UPDATE (it works), then an INSERT that breaks a foreign key, then COMMIT. What is saved?', options: ['Nothing: the error rolls back the transaction', 'The UPDATE: the failed INSERT is skipped and COMMIT commits the rest', 'Both: the INSERT is saved without its foreign key', 'Nothing: COMMIT fails because of the earlier error'], answer: 1, explain: 'A constraint error stops only that statement. The transaction stays open, the batch goes on, and COMMIT commits the UPDATE.' },
      { type: 'quiz', question: '@@TRANCOUNT is 2 after two BEGIN TRANSACTION statements. You run COMMIT, then ROLLBACK. What happens to the changes made after the second BEGIN?', options: ['They are committed by the COMMIT', 'They are rolled back with everything else', 'Only they are rolled back', 'The ROLLBACK fails because the inner transaction is committed'], answer: 1, explain: 'The inner COMMIT only lowers @@TRANCOUNT to 1. Nothing is committed until it reaches 0, and ROLLBACK undoes everything since the outermost BEGIN.' },
      { type: 'exercise', task: 'Order 9 (two boxes of wall plugs short) is being cancelled. In one transaction, set its Status to \'Cancelled\' and put its items back into stock: add each line’s Quantity to the product’s Stock. Use SET XACT_ABORT ON and TRY…CATCH, then show order 9’s status and the wall plugs’ stock.', hint: 'One UPDATE with a join adds the quantities back: `UPDATE p SET Stock = p.Stock + i.Quantity FROM dbo.Products AS p JOIN dbo.OrderItems AS i ON …`.', solution: sql`
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE dbo.Orders SET Status = 'Cancelled' WHERE OrderId = 9;

    UPDATE p
    SET Stock = p.Stock + i.Quantity
    FROM dbo.Products AS p
    JOIN dbo.OrderItems AS i ON i.ProductId = p.ProductId
    WHERE i.OrderId = 9;

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;

SELECT o.OrderId, o.Status, p.Name, p.Stock
FROM dbo.Orders AS o
JOIN dbo.OrderItems AS i ON i.OrderId = o.OrderId
JOIN dbo.Products AS p ON p.ProductId = i.ProductId
WHERE o.OrderId = 9;`, output: 'OrderId  Status     Name              Stock\n-------  ---------  ----------------  -----\n      9  Cancelled  Wall plugs (100)      4' }
    ],
    keyPoints: [
      'Each statement is its own transaction (autocommit): it changes all its rows or none.',
      'BEGIN TRANSACTION … COMMIT makes several statements one unit; ROLLBACK undoes them.',
      'Most errors end only the statement, not the transaction: the batch goes on and COMMIT commits the rest.',
      'SET XACT_ABORT ON makes any error roll back the whole transaction and stop the batch.',
      'The standard shape: SET XACT_ABORT ON; BEGIN TRY … COMMIT END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; THROW; END CATCH.',
      'XACT_STATE(): 1 open, 0 none, -1 doomed (roll back only).',
      'Nested BEGIN TRANSACTION only counts; ROLLBACK undoes everything. SAVE TRANSACTION allows a partial undo.',
      'ACID: atomic, consistent, isolated, durable. Durability comes from the transaction log being on disk before COMMIT returns.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'isolation-locking',
    title: 'Isolation levels, locking and blocking',
    summary: 'What happens when two sessions use the same rows at once: shared and exclusive locks, blocking and how to find the blocker, dirty, non-repeatable and phantom reads, the four isolation levels, lock escalation, lost updates and UPDLOCK, and LOCK_TIMEOUT.',
    minutes: 20,
    blocks: [
      { type: 'p', text: 'So far you have been the only user of BuildMart. A real shop has many sessions at once: the website, the till, a stock report. The **I** in ACID promises that each transaction behaves as if it had the database to itself. SQL Server keeps that promise mainly with **locks**, and this lesson shows what they cost.' },
      { type: 'note', kind: 'info', text: 'To follow the two-session examples, open two query windows in SSMS (each tab is its own session) and run the parts marked Session 1 and Session 2 in the order shown. Session numbers (the `session_id` values) on your machine will be different.' },
      { type: 'h2', text: 'Locks a transaction holds' },
      { type: 'p', text: 'Before a session changes a row it takes an **exclusive (X)** lock on it, and it keeps the lock until its transaction ends. `sys.dm_tran_locks` lists the locks every session holds or is waiting for:' },
      { type: 'code', code: sql`
BEGIN TRANSACTION;

UPDATE dbo.Products SET Price = 95.00 WHERE ProductId = 2;

SELECT resource_type, request_mode, request_status
FROM sys.dm_tran_locks
WHERE request_session_id = @@SPID
  AND resource_type <> 'DATABASE'
ORDER BY resource_type;

ROLLBACK;`, output: 'resource_type  request_mode  request_status\n-------------  ------------  --------------\nKEY            X             GRANT\nOBJECT         IX            GRANT\nPAGE           IX            GRANT' },
      { type: 'p', text: 'The KEY lock is on the row itself (a row in an index is identified by its key). The **intent** locks (IX) on its page and on the table are signposts: they tell other sessions “someone holds an X lock somewhere inside” without making them check every row. A request to lock the whole table sees the IX at once and waits.' },
      { type: 'table', head: ['Mode', 'Taken by', 'Allows others to'], rows: [
        ['S (shared)', 'Reading a row', 'Read it too (S), not change it (X)'],
        ['U (update)', 'Finding a row you are about to change', 'Read it (S), not take another U or X'],
        ['X (exclusive)', 'Changing a row', 'Nothing: readers and writers wait'],
        ['IS, IX (intent)', 'Higher levels (page, table) above S or X locks', 'Lock other rows; blocks only a whole-table lock that conflicts']
      ] },
      { type: 'h2', text: 'Blocking' },
      { type: 'p', text: 'When a session asks for a lock that conflicts with one another session holds, it **waits**. That is blocking. Session 1 changes the drill’s price and leaves its transaction open:' },
      { type: 'code', title: 'Session 1', code: sql`
BEGIN TRANSACTION;
UPDATE dbo.Products SET Price = 95.00 WHERE ProductId = 2;` },
      { type: 'p', text: 'Session 2 reads the same row. It needs an S lock, the row has an X lock, so the query does not return: SSMS shows “Executing query…” and the clock keeps running.' },
      { type: 'code', title: 'Session 2', code: sql`
SELECT Name, Price FROM dbo.Products WHERE ProductId = 2;` },
      { type: 'p', text: 'From a third window you can see who is waiting for whom. `sys.dm_exec_requests` shows each running request and the session blocking it:' },
      { type: 'code', title: 'Session 3', code: sql`
SELECT r.session_id, r.blocking_session_id, r.wait_type, r.command,
       t.text AS waiting_sql
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE r.blocking_session_id <> 0;

SELECT resource_type, request_mode, request_status, request_session_id
FROM sys.dm_tran_locks
WHERE resource_database_id = DB_ID() AND resource_type <> 'DATABASE'
ORDER BY request_session_id, resource_type;`, output: 'session_id  blocking_session_id  wait_type  command  waiting_sql\n----------  -------------------  ---------  -------  ----------------------------------------------------------------------------\n        54                   51  LCK_M_S    SELECT   (@1 tinyint)SELECT [Name],[Price] FROM [dbo].[Products] WHERE [ProductId]=@1\n\nresource_type  request_mode  request_status  request_session_id\n-------------  ------------  --------------  ------------------\nKEY            X             GRANT                           51\nOBJECT         IX            GRANT                           51\nPAGE           IX            GRANT                           51\nKEY            S             WAIT                            54\nOBJECT         IS            GRANT                           54\nPAGE           IS            GRANT                           54' },
      { type: 'p', text: 'Session 54 is waiting (`LCK_M_S`: waiting for a shared lock) on session 51. The lock list shows the conflict exactly: 51 has been **granted** X on the key and 54 is **waiting** for S on it. The waiting query text also shows that SQL Server turned the literal 2 into a parameter (`@1`) so the plan can be reused.' },
      { type: 'p', text: 'As soon as Session 1 commits, its locks go and Session 2’s SELECT returns, with the new price:' },
      { type: 'code', title: 'Session 1', code: sql`
COMMIT;` },
      { type: 'code', title: 'Session 2 (returns now)', code: sql`
SELECT Name, Price FROM dbo.Products WHERE ProductId = 2;`, output: 'Name            Price\n--------------  -----\nCordless drill  95.00' },
      { type: 'note', kind: 'tip', text: 'A blocked session waits for ever by default. `SET LOCK_TIMEOUT 1000` makes it give up after 1,000 ms with **Msg 1222, Lock request time out period exceeded**. The statement fails but any open transaction stays open, so handle the error as you would any other.' },
      { type: 'h2', text: 'Three things that can go wrong' },
      { type: 'p', text: 'Without isolation, a transaction reading data that another transaction is changing can get three kinds of wrong answer:' },
      { type: 'table', head: ['Problem', 'What the reader sees'], rows: [
        ['**Dirty read**', 'A change that is not committed yet, and may be rolled back'],
        ['**Non-repeatable read**', 'The same row read twice in one transaction gives two different values, because another transaction changed it in between'],
        ['**Phantom read**', 'The same query run twice returns a different **set** of rows, because another transaction inserted (or deleted) rows that match']
      ] },
      { type: 'p', text: 'The **isolation level** of a session decides which of these it is protected from, and the price is more blocking. Set it with `SET TRANSACTION ISOLATION LEVEL`; it lasts until the session changes it.' },
      { type: 'widget', name: 'isolation-lab' },
      { type: 'h2', text: 'READ UNCOMMITTED and NOLOCK: dirty reads' },
      { type: 'p', text: 'At READ UNCOMMITTED a reader takes no S locks, so it is never blocked, and it reads whatever is in the row, committed or not. Session 1 starts a price change it will cancel:' },
      { type: 'code', title: 'Session 1', code: sql`
BEGIN TRANSACTION;
UPDATE dbo.Products SET Price = 9.99 WHERE ProductId = 2;` },
      { type: 'code', title: 'Session 2', code: sql`
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT Name, Price FROM dbo.Products WHERE ProductId = 2;`, output: 'Name            Price\n--------------  -----\nCordless drill   9.99' },
      { type: 'code', title: 'Session 1', code: sql`
ROLLBACK;` },
      { type: 'p', text: 'Session 2 has told someone the drill costs 9.99. That price never existed: it was rolled back. The table hint `WITH (NOLOCK)` does the same for one table in one query, and gave the same 9.99 here.' },
      { type: 'note', kind: 'warn', text: 'NOLOCK is often added to “make queries faster”. Besides dirty reads, a NOLOCK scan can **miss rows or read them twice** when another session’s insert splits a page while the scan is running. For reports that must be right, use row versioning instead (next lesson): readers are not blocked and still see only committed data.' },
      { type: 'h2', text: 'READ COMMITTED: the default' },
      { type: 'p', text: 'At READ COMMITTED a reader takes an S lock on each row as it reads it and **releases it straight away**. So it never sees uncommitted data (it waits, as you saw above), but nothing stops the row changing between two reads in the same transaction:' },
      { type: 'code', title: 'Session 1', code: sql`
BEGIN TRANSACTION;
SELECT Name, Stock FROM dbo.Products WHERE ProductId = 2;`, output: 'Name            Stock\n--------------  -----\nCordless drill     12' },
      { type: 'code', title: 'Session 2', code: sql`
UPDATE dbo.Products SET Stock = Stock - 10 WHERE ProductId = 2;` },
      { type: 'code', title: 'Session 1', code: sql`
SELECT Name, Stock FROM dbo.Products WHERE ProductId = 2;
COMMIT;`, output: 'Name            Stock\n--------------  -----\nCordless drill      2' },
      { type: 'p', text: 'A non-repeatable read. If Session 1 had checked “12 in stock, enough for 5” and then sold 5, it would be selling stock that is no longer there.' },
      { type: 'h2', text: 'REPEATABLE READ: keep the read locks' },
      { type: 'p', text: 'REPEATABLE READ keeps every S lock until the transaction ends. Run the same steps with Session 1 at REPEATABLE READ: Session 2’s UPDATE now **waits** for Session 1, Session 1 reads 12 both times, and the UPDATE goes through after Session 1 commits.' },
      { type: 'p', text: 'It locks only the rows it has read, though. A new row that matches the query can still be inserted:' },
      { type: 'code', title: 'Session 1', code: sql`
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;
SELECT COUNT(*) AS Tools FROM dbo.Products WHERE CategoryId = 1;`, output: 'Tools\n-----\n    3' },
      { type: 'code', title: 'Session 2', code: sql`
INSERT INTO dbo.Products (Name, CategoryId, Price, Stock, Unit, AddedOn)
VALUES (N'Spirit level', 1, 14.00, 20, N'each', '2024-07-01');` },
      { type: 'code', title: 'Session 1', code: sql`
SELECT COUNT(*) AS Tools FROM dbo.Products WHERE CategoryId = 1;
COMMIT;`, output: 'Tools\n-----\n    4' },
      { type: 'p', text: 'The spirit level is a **phantom**: a row that appeared inside Session 1’s transaction.' },
      { type: 'h2', text: 'SERIALIZABLE: lock the ranges too' },
      { type: 'p', text: 'SERIALIZABLE locks the **range** a query covered, not just the rows it found, so no one can insert into it. With the same steps at SERIALIZABLE, Session 2’s INSERT waits and Session 1 counts 3 tools both times. You can see range locks from a single session. This query reads products 2 to 4 by the primary key:' },
      { type: 'code', code: sql`
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;

SELECT ProductId, Name FROM dbo.Products WHERE ProductId BETWEEN 2 AND 4;

SELECT resource_type, request_mode, COUNT(*) AS Locks
FROM sys.dm_tran_locks
WHERE request_session_id = @@SPID AND resource_type <> 'DATABASE'
GROUP BY resource_type, request_mode
ORDER BY resource_type;

ROLLBACK;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;`, output: 'ProductId  Name\n---------  ----------------\n        2  Cordless drill\n        3  Tape measure 8 m\n        4  Cement 25 kg\n\nresource_type  request_mode  Locks\n-------------  ------------  -----\nKEY            RangeS-S          4\nOBJECT         IS                1\nPAGE           IS                1' },
      { type: 'p', text: '`RangeS-S` is a shared lock on a key **and the gap before it**. There are 4: on keys 2, 3 and 4, and on key 5, which closes the gap after 4 so nothing can be inserted between 4 and 5. Without an index to lock ranges on, SERIALIZABLE has to lock much more, often the whole table.' },
      { type: 'table', head: ['Isolation level', 'Dirty read', 'Non-repeatable read', 'Phantom', 'Readers hold S locks'], rows: [
        ['READ UNCOMMITTED', 'possible', 'possible', 'possible', 'none'],
        ['READ COMMITTED (default)', 'prevented', 'possible', 'possible', 'only while reading the row'],
        ['REPEATABLE READ', 'prevented', 'prevented', 'possible', 'until the transaction ends'],
        ['SERIALIZABLE', 'prevented', 'prevented', 'prevented', 'until the end, on key ranges']
      ] },
      { type: 'h2', text: 'Lock escalation' },
      { type: 'p', text: 'Every lock costs memory. When one statement holds more than **5,000** locks on one table, SQL Server swaps them for a single table lock: **lock escalation**. It saves memory, but a table X lock blocks every other session’s access to the whole table:' },
      { type: 'code', code: sql`
DROP TABLE IF EXISTS dbo.Sales;
CREATE TABLE dbo.Sales (SaleId int NOT NULL PRIMARY KEY, Amount decimal(10,2) NOT NULL);
INSERT INTO dbo.Sales (SaleId, Amount)
SELECT value, 10.00 FROM GENERATE_SERIES(1, 10000);
GO
BEGIN TRANSACTION;
UPDATE dbo.Sales SET Amount += 1 WHERE SaleId <= 4000;

SELECT resource_type, request_mode, COUNT(*) AS Locks
FROM sys.dm_tran_locks
WHERE request_session_id = @@SPID AND resource_type <> 'DATABASE'
GROUP BY resource_type, request_mode
ORDER BY resource_type;
ROLLBACK;

BEGIN TRANSACTION;
UPDATE dbo.Sales SET Amount += 1 WHERE SaleId <= 7000;

SELECT resource_type, request_mode, COUNT(*) AS Locks
FROM sys.dm_tran_locks
WHERE request_session_id = @@SPID AND resource_type <> 'DATABASE'
GROUP BY resource_type, request_mode
ORDER BY resource_type;
ROLLBACK;`, output: 'resource_type  request_mode  Locks\n-------------  ------------  -----\nKEY            X              4000\nOBJECT         IX                1\nPAGE           IX               11\n\nresource_type  request_mode  Locks\n-------------  ------------  -----\nOBJECT         X                 1' },
      { type: 'p', text: '4,000 rows: 4,000 key locks, plus intent locks on 11 pages and the table. 7,000 rows: one X lock on the whole table and nothing else. The documented trigger is 5,000 locks, but SQL Server only checks now and then as locks are added: on this table it still held 6,200 row locks, and had escalated by 6,300. If big updates block everyone, do them in batches of a few thousand rows, each in its own transaction.' },
      { type: 'h2', text: 'Lost updates' },
      { type: 'p', text: 'A common bug in application code: read a value, work out the new value, write it back. Two sessions run this at the same time to sell one drill each (the WAITFOR stands for the time the application takes between its two statements):' },
      { type: 'code', title: 'Session 1 and Session 2, at the same time', code: sql`
BEGIN TRANSACTION;
DECLARE @Stock int = (SELECT Stock FROM dbo.Products WHERE ProductId = 2);
WAITFOR DELAY '00:00:02';
UPDATE dbo.Products SET Stock = @Stock - 1 WHERE ProductId = 2;
COMMIT;` },
      { type: 'code', title: 'Session 3, afterwards', code: sql`
SELECT Name, Stock FROM dbo.Products WHERE ProductId = 2;`, output: 'Name            Stock\n--------------  -----\nCordless drill     11' },
      { type: 'p', text: 'Two drills sold, one taken out of stock. Both sessions read 12 and both wrote 11: the second write overwrote the first. That is a **lost update**, and READ COMMITTED does not prevent it, because the S lock is released as soon as the row has been read.' },
      { type: 'p', text: 'The best fix is to avoid the separate read. One UPDATE that does the arithmetic itself is atomic, and it can check the stock in the same statement:' },
      { type: 'code', code: sql`
UPDATE dbo.Products
SET Stock = Stock - 1
OUTPUT inserted.Name, deleted.Stock AS Before, inserted.Stock AS After
WHERE ProductId = 2 AND Stock >= 1;`, output: 'Name            Before  After\n--------------  ------  -----\nCordless drill      12     11' },
      { type: 'p', text: 'When you really must read first, read `WITH (UPDLOCK)`. It takes an **update lock** and keeps it to the end of the transaction. Plain readers are not blocked, but a second UPDLOCK reader waits. With UPDLOCK in both sessions above, Session 2 waited, read 11, and the drill ended at 10, which is right.' },
      { type: 'note', kind: 'warn', text: 'REPEATABLE READ is not the fix. Both sessions would keep their S locks, then each would wait for the other’s S lock to go before it could take its X lock. That is a deadlock, and SQL Server ends one of the two. The next lesson shows it.' },
      { type: 'quiz', question: 'Session 1 has updated a row and not committed. Session 2, at the default READ COMMITTED level, selects that row. What happens?', options: ['Session 2 sees the new, uncommitted value', 'Session 2 sees the old value', 'Session 2 waits until Session 1 commits or rolls back', 'Session 2 gets an error at once'], answer: 2, explain: 'Session 2 needs an S lock and Session 1 holds an X lock on the row, so Session 2 is blocked until the lock goes. (With row versioning switched on it would read the old value instead: next lesson.)' },
      { type: 'quiz', question: 'What is the lowest isolation level that stops another session inserting a row that your transaction’s query would now return?', options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'], answer: 3, explain: 'That row is a phantom. REPEATABLE READ locks only the rows already read; SERIALIZABLE also locks the key ranges, so the insert waits.' },
      { type: 'exercise', task: 'Sell 5 boxes of wood screws (product 8) safely in one statement: take 5 off Stock only if at least 5 are in stock, and return the name with the stock before and after. Then try to sell 5 boxes of wall plugs (product 9, none in stock) the same way, and print \'Out of stock\' when no row was changed.', hint: 'Put the stock check in the WHERE clause and use OUTPUT deleted.Stock, inserted.Stock. @@ROWCOUNT straight after the UPDATE tells you whether a row was changed.', solution: sql`
UPDATE dbo.Products
SET Stock = Stock - 5
OUTPUT inserted.Name, deleted.Stock AS Before, inserted.Stock AS After
WHERE ProductId = 8 AND Stock >= 5;

UPDATE dbo.Products
SET Stock = Stock - 5
OUTPUT inserted.Name, deleted.Stock AS Before, inserted.Stock AS After
WHERE ProductId = 9 AND Stock >= 5;

IF @@ROWCOUNT = 0 PRINT 'Out of stock';`, output: 'Name               Before  After\n-----------------  ------  -----\nWood screws (200)     150    145\n\nName  Before  After\n----  ------  -----\n\nOut of stock' }
    ],
    keyPoints: [
      'Writers take X locks and keep them to the end of the transaction; readers take S locks.',
      'A conflicting lock request waits: that is blocking. sys.dm_exec_requests shows blocking_session_id; sys.dm_tran_locks shows granted and waiting locks.',
      'Dirty reads, non-repeatable reads and phantoms are the three problems isolation levels prevent.',
      'READ UNCOMMITTED and NOLOCK read uncommitted data and can miss or double-read rows.',
      'READ COMMITTED (the default) releases S locks after each row; REPEATABLE READ keeps them; SERIALIZABLE also locks key ranges.',
      'Past about 5,000 locks on one table, one statement’s row locks escalate to a single table lock; change big tables in batches.',
      'Read-then-write loses updates: do it in one UPDATE (Stock = Stock - 1 … WHERE Stock >= 1), or read WITH (UPDLOCK).',
      'SET LOCK_TIMEOUT stops a session waiting for ever (Msg 1222).'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'deadlocks-snapshot',
    title: 'Deadlocks and row versioning (snapshot isolation)',
    summary: 'When two sessions block each other for ever: how SQL Server finds deadlocks and picks a victim, Msg 1205, retrying, reading the deadlock graph, and how to prevent them. Then row versioning: READ COMMITTED SNAPSHOT, SNAPSHOT isolation, update conflicts and the version store.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'Blocking ends when the blocker commits. A **deadlock** never ends by itself: two sessions each hold a lock the other one needs, and each waits for the other. SQL Server has to break the circle by cancelling one of them.' },
      { type: 'h2', text: 'Making a deadlock' },
      { type: 'p', text: 'Two sessions both take one hammer and one drill out of stock, but in a different order. Each starts with its first product:' },
      { type: 'code', title: 'Session 1', code: sql`
BEGIN TRANSACTION;
UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 1;   -- hammer` },
      { type: 'code', title: 'Session 2', code: sql`
BEGIN TRANSACTION;
UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;   -- drill` },
      { type: 'p', text: 'Now each asks for the row the other has. Session 1 waits for Session 2’s drill. That alone is ordinary blocking:' },
      { type: 'code', title: 'Session 1', code: sql`
UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;   -- waits` },
      { type: 'p', text: 'Then Session 2 asks for Session 1’s hammer. Now each is waiting for the other:' },
      { type: 'code', title: 'Session 2', code: sql`
UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 1;`, output: 'Msg 1205, Level 13, State 51, Line 1\nTransaction (Process ID 54) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.' },
      { type: 'p', text: 'Within about five seconds SQL Server’s **lock monitor** spots the cycle. It picks a **victim**, rolls back the victim’s whole transaction and sends it error 1205. That frees the victim’s locks, so the other session carries on: Session 1’s UPDATE finished and its transaction is still open. Session 2 has no transaction left:' },
      { type: 'code', title: 'Session 1', code: sql`
SELECT @@TRANCOUNT AS OpenTransactions;
COMMIT;`, output: 'OpenTransactions\n----------------\n               1' },
      { type: 'code', title: 'Session 2', code: sql`
SELECT @@TRANCOUNT AS OpenTransactions;`, output: 'OpenTransactions\n----------------\n               0' },
      { type: 'widget', name: 'deadlock-cycle' },
      { type: 'p', text: 'SQL Server normally picks as victim the transaction that is **cheapest to roll back** (the one that has written the least to the log). You can change that with `SET DEADLOCK_PRIORITY LOW` (or NORMAL, HIGH, or a number from -10 to 10): the session with the lower priority is chosen first. Give it to background jobs that can easily run again, so the till never loses a sale.' },
      { type: 'h2', text: 'Retry the victim' },
      { type: 'p', text: 'The error tells you what to do: “Rerun the transaction.” A victim has been rolled back completely, so running it again is safe. Catch error 1205 and try a few more times. Here Session 2 runs the same two updates in a retry loop with low priority, while Session 1 creates the conflict again:' },
      { type: 'code', title: 'Session 2', code: sql`
SET DEADLOCK_PRIORITY LOW;
SET XACT_ABORT ON;
DECLARE @Attempt int = 1;

WHILE 1 = 1
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;
        UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 1;
        COMMIT;
        PRINT CONCAT('Attempt ', @Attempt, ' committed');
        BREAK;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        IF ERROR_NUMBER() = 1205 AND @Attempt < 3
        BEGIN
            PRINT CONCAT('Attempt ', @Attempt, ' was a deadlock victim; trying again');
            SET @Attempt += 1;
            WAITFOR DELAY '00:00:00.100';
        END
        ELSE THROW;
    END CATCH;
END;`, output: 'Attempt 1 was a deadlock victim; trying again\nAttempt 2 committed' },
      { type: 'p', text: 'Both sessions’ work was done in the end: the hammer went from 40 to 38 and the drill from 12 to 10. In an application, the retry usually lives in the data-access code (C#, for example), which catches error 1205 and runs the whole transaction again.' },
      { type: 'h2', text: 'Finding out what deadlocked' },
      { type: 'p', text: 'SQL Server records every deadlock in the built-in **system_health** Extended Events session, including a full report of both processes, the statements they ran and the locks involved. This reads the newest report:' },
      { type: 'code', title: 'Session 3', code: sql`
WITH Reports AS (
    SELECT CAST(event_data AS xml) AS Report
    FROM sys.fn_xe_file_target_read_file('system_health*.xel', NULL, NULL, NULL)
    WHERE object_name = 'xml_deadlock_report'
)
SELECT TOP (1)
       Report.value('(event/@timestamp)[1]', 'datetime2(0)') AS HappenedAt,
       Report.value('(event/data/value/deadlock/victim-list/victimProcess/@id)[1]', 'varchar(20)') AS Victim,
       Report.value('count(event/data/value/deadlock/process-list/process)', 'int') AS Processes
FROM Reports
ORDER BY HappenedAt DESC;`, output: 'HappenedAt           Victim              Processes\n-------------------  ------------------  ---------\n2026-11-09 20:08:04  process27a82403088          2' },
      { type: 'p', text: 'The time is in UTC. Select the whole `Report` column instead and SSMS shows the XML; save it as a file ending in `.xdl` and SSMS draws the deadlock graph: the processes as ovals (the victim crossed out), the locked rows as boxes, and arrows for “holds” and “waits for”.' },
      { type: 'h2', text: 'Preventing deadlocks' },
      { type: 'ul', items: [
        '**Touch rows and tables in the same order everywhere.** If both sessions above had updated the hammer first, Session 2 would simply have waited for Session 1 to commit and then run; no cycle is possible.',
        '**Keep transactions short.** Fewer locks are held for less time. Never wait for user input inside a transaction.',
        '**Do not read and then update under REPEATABLE READ or SERIALIZABLE.** Two sessions holding S locks on the same row, both wanting X, deadlock every time. Read with UPDLOCK, or do it in one UPDATE.',
        '**Index the columns you search on.** An UPDATE that has to scan a whole table takes and checks far more locks than one that seeks to its rows.',
        '**Use row versioning for readers** (below): readers stop taking S locks, so reader–writer deadlocks disappear.'
      ] },
      { type: 'p', text: 'The REPEATABLE READ trap from the last lesson is worth seeing. Two sessions run this at the same time:' },
      { type: 'code', title: 'Session 1 and Session 2, at the same time', code: sql`
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;
DECLARE @Stock int = (SELECT Stock FROM dbo.Products WHERE ProductId = 2);
WAITFOR DELAY '00:00:02';
UPDATE dbo.Products SET Stock = @Stock - 1 WHERE ProductId = 2;
COMMIT;`, output: 'Msg 1205, Level 13, State 51, Line 5\nTransaction (Process ID 55) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.' },
      { type: 'p', text: 'Only one row, and still a deadlock: each session holds an S lock on the drill and wants an X lock, which the other’s S lock blocks. One session got error 1205 at line 5, the UPDATE.' },
      { type: 'h2', text: 'Row versioning: readers that do not block' },
      { type: 'p', text: 'Locking makes readers and writers wait for each other. **Row versioning** takes another approach: when a row is changed, SQL Server keeps a copy of the previous committed version in tempdb (the **version store**). A reader that would otherwise have to wait reads that copy instead.' },
      { type: 'p', text: 'It has two forms. The first, **READ COMMITTED SNAPSHOT** (RCSI), changes how the default READ COMMITTED level works for every session in the database. You switch it on once:' },
      { type: 'code', code: sql`
ALTER DATABASE CURRENT SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;

SELECT is_read_committed_snapshot_on
FROM sys.databases
WHERE database_id = DB_ID();`, output: 'Nonqualified transactions are being rolled back. Estimated rollback completion: 0%.\nNonqualified transactions are being rolled back. Estimated rollback completion: 100%.\n\nis_read_committed_snapshot_on\n-----------------------------\n1' },
      { type: 'note', kind: 'warn', text: 'The option can only change when no other session is using the database. `WITH ROLLBACK IMMEDIATE` rolls back and disconnects the others, so do this in a quiet moment, not on a busy live system.' },
      { type: 'p', text: 'Now repeat the blocking example from the last lesson. Session 1 changes the drill’s price and leaves the transaction open:' },
      { type: 'code', title: 'Session 1', code: sql`
BEGIN TRANSACTION;
UPDATE dbo.Products SET Price = 95.00 WHERE ProductId = 2;` },
      { type: 'code', title: 'Session 2', code: sql`
SELECT Name, Price FROM dbo.Products WHERE ProductId = 2;`, output: 'Name            Price\n--------------  -----\nCordless drill  89.00' },
      { type: 'p', text: 'No waiting. Session 2 gets the last **committed** price, 89.00, at once. Not a dirty read: 95.00 is not committed yet. After Session 1 commits, the same SELECT returns 95.00.' },
      { type: 'p', text: 'Under RCSI each **statement** sees the data as it was committed when that statement started. So a transaction can still read a row twice and get two values (here Session 2 took 10 off between Session 1’s two reads, and Session 1 saw 12, then 2). Writers also still block writers: a second UPDATE of the same row waits, exactly as before (`LCK_M_X`).' },
      { type: 'h2', text: 'SNAPSHOT isolation' },
      { type: 'p', text: 'The second form is a separate isolation level, **SNAPSHOT**. A snapshot transaction sees the database as it was committed **when the transaction started**, for every statement, however long it runs. Allow it once for the database, then ask for it per session:' },
      { type: 'code', code: sql`
ALTER DATABASE CURRENT SET ALLOW_SNAPSHOT_ISOLATION ON;

SELECT snapshot_isolation_state_desc
FROM sys.databases
WHERE database_id = DB_ID();`, output: 'snapshot_isolation_state_desc\n-----------------------------\nON' },
      { type: 'code', title: 'Session 1', code: sql`
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN TRANSACTION;
SELECT Name, Stock FROM dbo.Products WHERE ProductId = 2;`, output: 'Name            Stock\n--------------  -----\nCordless drill     12' },
      { type: 'code', title: 'Session 2', code: sql`
UPDATE dbo.Products SET Stock = Stock - 10 WHERE ProductId = 2;
SELECT Name, Stock FROM dbo.Products WHERE ProductId = 2;`, output: 'Name            Stock\n--------------  -----\nCordless drill      2' },
      { type: 'p', text: 'Session 2 committed 2. Session 1 still sees 12, the value when its transaction began: a repeatable read, with no locks held. But what if Session 1 now tries to change the row?' },
      { type: 'code', title: 'Session 1', code: sql`
SELECT Name, Stock FROM dbo.Products WHERE ProductId = 2;
UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;`, output: 'Name            Stock\n--------------  -----\nCordless drill     12\n\nMsg 3960, Level 16, State 2, Line 2\nSnapshot isolation transaction aborted due to update conflict. You cannot use snapshot isolation to access table \'dbo.Products\' directly or indirectly in database \'BuildMart\' to update, delete, or insert the row that has been modified or deleted by another transaction. Retry the transaction or change the isolation level for the update/delete statement.' },
      { type: 'p', text: 'Session 1 would be changing a row on the basis of a version that is out of date, so SQL Server refuses: an **update conflict**, error 3960, and Session 1’s transaction is rolled back. Snapshot isolation never loses an update silently, but code that writes under SNAPSHOT must be ready to retry, just like a deadlock victim.' },
      { type: 'table', head: ['', 'READ COMMITTED SNAPSHOT', 'SNAPSHOT'], rows: [
        ['Switch on', '`SET READ_COMMITTED_SNAPSHOT ON` (no other sessions connected)', '`SET ALLOW_SNAPSHOT_ISOLATION ON`, then `SET TRANSACTION ISOLATION LEVEL SNAPSHOT` per session'],
        ['Affects', 'Every READ COMMITTED query in the database, with no code change', 'Only sessions that ask for it'],
        ['Reads see', 'Data committed when each **statement** started', 'Data committed when the **transaction** started'],
        ['Readers block writers?', 'No', 'No'],
        ['Writers block writers?', 'Yes (normal locks)', 'Yes, and a write to a row changed since the snapshot fails with 3960'],
        ['Good for', 'Most OLTP databases; Azure SQL Database has it on by default', 'Long reports that must be consistent across many queries']
      ] },
      { type: 'note', kind: 'info', text: 'Versioning is not free. Changed rows carry 14 extra bytes for the version pointer, every UPDATE and DELETE writes a copy to tempdb, and a long-running snapshot transaction keeps old versions alive until it ends. Watch tempdb space when you switch it on.' },
      { type: 'quiz', question: 'Two transactions each hold a lock and wait for a lock the other holds. What does SQL Server do?', options: ['Waits until LOCK_TIMEOUT expires for both', 'Rolls back one of them, which gets error 1205', 'Commits the older one first', 'Escalates both to table locks'], answer: 1, explain: 'The lock monitor detects the cycle, chooses a victim (lowest DEADLOCK_PRIORITY, then cheapest to roll back), rolls back its transaction and raises 1205. The other transaction continues.' },
      { type: 'quiz', question: 'With READ_COMMITTED_SNAPSHOT ON, Session 1 has updated a row and not committed. Session 2 selects the row. What does it get?', options: ['It waits for Session 1', 'The uncommitted new value', 'The last committed value, at once', 'Error 3960'], answer: 2, explain: 'Under RCSI a reader does not take S locks; it reads the last committed version of the row from the version store.' },
      { type: 'exercise', task: 'Stock is sometimes booked against the wrong product, and a data-fix procedure moves it across. Write dbo.MoveStock (@FromId int, @ToId int, @Qty int) so that two calls moving stock in opposite directions at the same time cannot deadlock: change both rows in one UPDATE statement, so they are always locked in key order. Then move 5 from product 3 to product 1 and show both products.', hint: 'One UPDATE … WHERE ProductId IN (@FromId, @ToId) with SET Stock = Stock + CASE WHEN ProductId = @ToId THEN @Qty ELSE -@Qty END. The CHECK on Stock from lesson 1, if present, stops it going below zero.', solution: sql`
CREATE OR ALTER PROCEDURE dbo.MoveStock
    @FromId int, @ToId int, @Qty int
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    UPDATE dbo.Products
    SET Stock = Stock + CASE WHEN ProductId = @ToId THEN @Qty ELSE -@Qty END
    WHERE ProductId IN (@FromId, @ToId);
END;
GO
EXEC dbo.MoveStock @FromId = 3, @ToId = 1, @Qty = 5;

SELECT ProductId, Name, Stock FROM dbo.Products WHERE ProductId IN (1, 3);`, output: 'ProductId  Name              Stock\n---------  ----------------  -----\n        1  Claw hammer          45\n        3  Tape measure 8 m     60' }
    ],
    keyPoints: [
      'A deadlock is a cycle of sessions waiting for each other’s locks; it never ends by itself.',
      'The lock monitor finds it within seconds, rolls back a victim and raises error 1205; the other session carries on.',
      'DEADLOCK_PRIORITY chooses who is sacrificed; otherwise the cheapest to roll back is.',
      'Retry a victim’s whole transaction (catch 1205); it has been rolled back completely.',
      'system_health records every deadlock report; an .xdl file shows the graph in SSMS.',
      'Prevent deadlocks: same access order, short transactions, no read-then-write under REPEATABLE READ, good indexes.',
      'RCSI: READ COMMITTED readers read the last committed version per statement and are never blocked by writers.',
      'SNAPSHOT: one consistent view for the whole transaction; writing a row changed since then fails with 3960.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'temporal-tables',
    title: 'Temporal tables: history and point-in-time queries',
    summary: 'Let SQL Server keep every old version of every row: system-versioned tables, the period columns and history table, FOR SYSTEM_TIME AS OF, FROM, BETWEEN, CONTAINED IN and ALL, undoing a bad update from history, retention, and the rules that come with it.',
    minutes: 17,
    blocks: [
      { type: 'p', text: '“What did the drill cost last March?” “Who changed this price, and what was it before?” “Someone ran an UPDATE without a WHERE; put the prices back.” An ordinary table cannot answer these, because an UPDATE overwrites the old value. A **temporal table** (also called a system-versioned table) keeps every previous version of every row, automatically, and lets you query the table as it was at any moment.' },
      { type: 'h2', text: 'Creating a temporal table' },
      { type: 'p', text: 'A temporal table needs two `datetime2` columns that SQL Server fills in itself, a `PERIOD FOR SYSTEM_TIME` naming them, and `SYSTEM_VERSIONING = ON`. This price list starts with three products copied from BuildMart:' },
      { type: 'code', code: sql`
CREATE TABLE dbo.PriceList (
    ProductId int           NOT NULL PRIMARY KEY,
    Name      nvarchar(60)  NOT NULL,
    Price     decimal(10,2) NOT NULL,
    ValidFrom datetime2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    ValidTo   datetime2 GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.PriceListHistory));
GO
INSERT INTO dbo.PriceList (ProductId, Name, Price)
SELECT ProductId, Name, Price FROM dbo.Products WHERE ProductId <= 3;` },
      { type: 'ul', items: [
        '`ValidFrom` (ROW START) is when this version of the row became current; `ValidTo` (ROW END) is when it stopped being current. A current row has ValidTo = 9999-12-31, the end of time.',
        'SQL Server sets both. You cannot insert or update them, so nobody can fake the history.',
        '`HIDDEN` keeps them out of `SELECT *`, so existing queries and INSERTs without a column list are not affected.',
        '`HISTORY_TABLE` names the table that receives old versions. SQL Server creates it with the same columns.'
      ] },
      { type: 'code', code: sql`
SELECT * FROM dbo.PriceList;

SELECT ProductId, Price, ValidFrom, ValidTo FROM dbo.PriceList;`, output: 'ProductId  Name              Price\n---------  ----------------  -----\n        1  Claw hammer       18.50\n        2  Cordless drill    89.00\n        3  Tape measure 8 m   9.75\n\nProductId  Price  ValidFrom                    ValidTo\n---------  -----  ---------------------------  ---------------------------\n        1  18.50  2026-11-09 20:31:50.6978749  9999-12-31 23:59:59.9999999\n        2  89.00  2026-11-09 20:31:50.6978749  9999-12-31 23:59:59.9999999\n        3   9.75  2026-11-09 20:31:50.6978749  9999-12-31 23:59:59.9999999' },
      { type: 'p', text: 'The times are the **UTC** time when the inserting transaction began; yours will be the moment you ran it. In the SSMS Object Explorer the table shows “(System-Versioned)” and has its history table nested under it.' },
      { type: 'h2', text: 'Every change leaves a version behind' },
      { type: 'p', text: 'Now change the data normally. Each UPDATE or DELETE copies the old version of the row into the history table, with its ValidTo set to the time of the change:' },
      { type: 'code', code: sql`
UPDATE dbo.PriceList SET Price = 19.50 WHERE ProductId = 1;
UPDATE dbo.PriceList SET Price = 20.00 WHERE ProductId = 1;
DELETE FROM dbo.PriceList WHERE ProductId = 3;

SELECT ProductId, Price FROM dbo.PriceList;

SELECT ProductId, Price, ValidFrom, ValidTo
FROM dbo.PriceListHistory
ORDER BY ProductId, ValidFrom;`, output: 'ProductId  Price\n---------  -----\n        1  20.00\n        2  89.00\n\nProductId  Price  ValidFrom                    ValidTo\n---------  -----  ---------------------------  ---------------------------\n        1  18.50  2026-11-09 20:31:51.1285141  2026-11-09 20:31:51.1462404\n        1  19.50  2026-11-09 20:31:51.1462404  2026-11-09 20:31:51.1462404\n        3   9.75  2026-11-09 20:31:51.1285141  2026-11-09 20:31:51.1462404' },
      { type: 'p', text: 'The current table has the hammer at 20.00 and no tape measure. The history table holds the hammer’s two earlier prices and the deleted tape measure. Each history row’s ValidTo is the next version’s ValidFrom, so the versions fit together end to end with no gaps.' },
      { type: 'h2', text: 'Querying the past: FOR SYSTEM_TIME' },
      { type: 'p', text: 'You rarely read the history table directly. Add `FOR SYSTEM_TIME` after the table name, and SQL Server looks in both tables and returns the versions that match. `AS OF` gives the table as it was at one moment. Normally you would type a time, such as `AS OF \'2026-03-01 09:00\'`. Here the script saves the times in variables, so it works whenever you run it:' },
      { type: 'code', code: sql`
DECLARE @BeforeRise datetime2 = SYSUTCDATETIME();
WAITFOR DELAY '00:00:00.100';

UPDATE dbo.PriceList SET Price = Price * 1.10;          -- a 10% price rise

SELECT ProductId, Name, Price FROM dbo.PriceList;

SELECT ProductId, Name, Price
FROM dbo.PriceList FOR SYSTEM_TIME AS OF @BeforeRise;`, output: 'ProductId  Name              Price\n---------  ----------------  -----\n        1  Claw hammer       20.35\n        2  Cordless drill    97.90\n        3  Tape measure 8 m  10.73\n\nProductId  Name              Price\n---------  ----------------  -----\n        1  Claw hammer       18.50\n        2  Cordless drill    89.00\n        3  Tape measure 8 m   9.75' },
      { type: 'p', text: 'The first SELECT shows today’s prices; the second shows the prices just before the rise. AS OF returns each row that was current at that moment: `ValidFrom <= @time AND ValidTo > @time`. The short WAITFOR only makes sure the clock moves on before the UPDATE.' },
      { type: 'note', kind: 'warn', text: 'The period columns hold **UTC** time, so AS OF expects UTC too. In the UK in summer, 10:00 local time is 09:00 UTC. To use local time, convert it first: `AS OF CAST(@Local AT TIME ZONE \'GMT Standard Time\' AT TIME ZONE \'UTC\' AS datetime2)`.' },
      { type: 'h2', text: 'Ranges and ALL' },
      { type: 'p', text: '`ALL` returns every version, current and historical, which is the easy way to see a row’s whole story. A window function puts the old price beside the new one:' },
      { type: 'code', code: sql`
WAITFOR DELAY '00:00:00.100';      -- let the clock move on between changes
UPDATE dbo.PriceList SET Price = 19.50 WHERE ProductId = 1;
WAITFOR DELAY '00:00:00.100';
UPDATE dbo.PriceList SET Price = 20.00 WHERE ProductId = 1;

SELECT Name, Price,
       LAG(Price) OVER (ORDER BY ValidFrom) AS PreviousPrice,
       CASE WHEN ValidTo = '9999-12-31 23:59:59.9999999' THEN 'current' ELSE 'old' END AS Version
FROM dbo.PriceList FOR SYSTEM_TIME ALL
WHERE ProductId = 1
ORDER BY ValidFrom;`, output: 'Name         Price  PreviousPrice  Version\n-----------  -----  -------------  -------\nClaw hammer  18.50           NULL  old\nClaw hammer  19.50          18.50  old\nClaw hammer  20.00          19.50  current' },
      { type: 'p', text: 'Three more forms take a range of time. They differ only in how they treat versions that touch the edges of the range:' },
      { type: 'table', head: ['Clause', 'Returns versions that…', 'Condition'], rows: [
        ['`AS OF t`', 'were current at the moment t', 'ValidFrom <= t AND ValidTo > t'],
        ['`FROM a TO b`', 'were current at any time in the range, ends excluded', 'ValidFrom < b AND ValidTo > a'],
        ['`BETWEEN a AND b`', 'as FROM … TO, but also a version that **starts** exactly at b', 'ValidFrom <= b AND ValidTo > a'],
        ['`CONTAINED IN (a, b)`', 'started and ended inside the range', 'ValidFrom >= a AND ValidTo <= b'],
        ['`ALL`', 'every version', 'none']
      ] },
      { type: 'widget', name: 'temporal-timeline' },
      { type: 'h2', text: 'Undoing a mistake from history' },
      { type: 'p', text: 'Someone means to put the hammer on sale and forgets the WHERE clause. Every price in the list is now 9.99:' },
      { type: 'code', code: sql`
DECLARE @BeforeMistake datetime2 = SYSUTCDATETIME();
WAITFOR DELAY '00:00:00.100';

UPDATE dbo.PriceList SET Price = 9.99;                  -- oops: no WHERE

UPDATE cur
SET Price = old.Price
FROM dbo.PriceList AS cur
JOIN dbo.PriceList FOR SYSTEM_TIME AS OF @BeforeMistake AS old
  ON old.ProductId = cur.ProductId;

SELECT ProductId, Name, Price FROM dbo.PriceList;`, output: 'ProductId  Name              Price\n---------  ----------------  -----\n        1  Claw hammer       18.50\n        2  Cordless drill    89.00\n        3  Tape measure 8 m   9.75' },
      { type: 'p', text: 'The repair joins the table to **itself as it was** before the mistake and copies the old prices back. The repair is itself an UPDATE, so the history now records the mistake and the repair too. Nothing is ever lost, which is exactly what auditors want.' },
      { type: 'h2', text: 'The rules that come with history' },
      { type: 'p', text: 'The history is protected. While system versioning is on, you cannot change it or drop the table:' },
      { type: 'code', code: sql`
DELETE FROM dbo.PriceListHistory;
GO
DROP TABLE dbo.PriceList;`, output: 'Msg 13560, Level 16, State 1, Line 1\nCannot delete rows from a temporal history table \'BuildMart.dbo.PriceListHistory\'.\nMsg 13552, Level 16, State 1, Line 1\nDrop table operation failed on table \'BuildMart.dbo.PriceList\' because it is not a supported operation on system-versioned temporal tables.' },
      { type: 'ul', items: [
        'Schema changes to the current table, such as `ALTER TABLE … ADD`, are copied to the history table for you.',
        'All rows changed in one transaction get the **same** time: the time the transaction began, not the moment of each statement. If a row changes twice in one transaction (or twice within the clock’s resolution), the version in between lasted no time at all. It stays in the history table, but FOR SYSTEM_TIME, even ALL, leaves it out.',
        '`TRUNCATE TABLE` is not allowed on a system-versioned table. Use DELETE, which keeps history.',
        'To change history on purpose (for example, to remove personal data), turn versioning off, change the history table, and turn it on again. Keep that permission for administrators only.'
      ] },
      { type: 'p', text: 'History grows for ever unless you limit it. A **retention period** makes SQL Server delete history rows older than that, in the background:' },
      { type: 'code', code: sql`
ALTER TABLE dbo.PriceList
SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.PriceListHistory,
                             HISTORY_RETENTION_PERIOD = 2 YEARS));

SELECT t.name, t.temporal_type_desc, h.name AS history_table,
       t.history_retention_period, t.history_retention_period_unit_desc
FROM sys.tables AS t
LEFT JOIN sys.tables AS h ON h.object_id = t.history_table_id
WHERE t.name = 'PriceList';`, output: 'name       temporal_type_desc               history_table     history_retention_period  history_retention_period_unit_desc\n---------  -------------------------------  ----------------  ------------------------  ----------------------------------\nPriceList  SYSTEM_VERSIONED_TEMPORAL_TABLE  PriceListHistory                         2  YEAR' },
      { type: 'p', text: 'To get rid of a temporal table, switch versioning off first. The two tables then become ordinary tables you can drop:' },
      { type: 'code', code: sql`
ALTER TABLE dbo.PriceList SET (SYSTEM_VERSIONING = OFF);
DROP TABLE dbo.PriceList, dbo.PriceListHistory;

SELECT COUNT(*) AS TablesLeft FROM sys.tables WHERE name LIKE 'PriceList%';`, output: 'TablesLeft\n----------\n         0' },
      { type: 'note', kind: 'tip', text: 'An existing table can become temporal too: `ALTER TABLE` adds the two period columns (with defaults such as `SYSUTCDATETIME()` and `\'9999-12-31 23:59:59.9999999\'` for the rows already there) and the PERIOD, then `SET (SYSTEM_VERSIONING = ON …)`. Remember that a temporal table cannot be dropped without switching versioning off, so reset scripts such as the BuildMart script would need that step first.' },
      { type: 'quiz', question: 'A price was 10.00 from 09:00 to 11:00 and 12.00 from 11:00 onwards. What does FOR SYSTEM_TIME AS OF \'11:00\' return?', options: ['10.00', '12.00', 'Both versions', 'Nothing'], answer: 1, explain: 'AS OF t returns the version with ValidFrom <= t AND ValidTo > t. The 10.00 version ends at 11:00 (ValidTo = 11:00 is not > 11:00); the 12.00 version starts at 11:00, so it is the one returned.' },
      { type: 'quiz', question: 'Why can a user not hide a change by updating ValidFrom in the current table?', options: ['It is HIDDEN, so it cannot be referenced', 'GENERATED ALWAYS columns are set by SQL Server and cannot be written', 'Only the history table has a ValidFrom', 'It can, but only with SYSTEM_VERSIONING = OFF'], answer: 1, explain: 'Period columns are GENERATED ALWAYS: INSERT and UPDATE cannot set them. HIDDEN only keeps them out of SELECT *; you can still read them by name.' },
      { type: 'exercise', task: 'Create a temporal table dbo.StockLevels (ProductId int primary key, Stock int) with a history table dbo.StockLevelsHistory, and copy in products 1 to 3 from dbo.Products. Change the hammer’s (product 1) stock to 35, then to 50. Then list every version of the hammer’s stock in order, oldest first, with a column saying which version is current. Finish by removing both tables.', hint: 'Run in one go, the three statements may finish within one tick of the clock, and versions that lasted no time are not returned: put a short WAITFOR DELAY between them. Use FOR SYSTEM_TIME ALL with ORDER BY ValidFrom. The current version is the one whose ValidTo is 9999-12-31 23:59:59.9999999. Switch SYSTEM_VERSIONING OFF before the DROP.', solution: sql`
CREATE TABLE dbo.StockLevels (
    ProductId int NOT NULL PRIMARY KEY,
    Stock     int NOT NULL,
    ValidFrom datetime2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    ValidTo   datetime2 GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.StockLevelsHistory));
GO
INSERT INTO dbo.StockLevels (ProductId, Stock)
SELECT ProductId, Stock FROM dbo.Products WHERE ProductId <= 3;
WAITFOR DELAY '00:00:00.050';

UPDATE dbo.StockLevels SET Stock = 35 WHERE ProductId = 1;
WAITFOR DELAY '00:00:00.050';

UPDATE dbo.StockLevels SET Stock = 50 WHERE ProductId = 1;

SELECT Stock,
       CASE WHEN ValidTo = '9999-12-31 23:59:59.9999999' THEN 'yes' ELSE 'no' END AS IsCurrent
FROM dbo.StockLevels FOR SYSTEM_TIME ALL
WHERE ProductId = 1
ORDER BY ValidFrom;

ALTER TABLE dbo.StockLevels SET (SYSTEM_VERSIONING = OFF);
DROP TABLE dbo.StockLevels, dbo.StockLevelsHistory;`, output: 'Stock  IsCurrent\n-----  ---------\n   40  no\n   35  no\n   50  yes' }
    ],
    keyPoints: [
      'A temporal table keeps every old version of its rows in a history table, automatically.',
      'It needs ValidFrom/ValidTo datetime2 columns GENERATED ALWAYS AS ROW START/END, a PERIOD FOR SYSTEM_TIME and SYSTEM_VERSIONING = ON.',
      'Times are UTC and are set by SQL Server; HIDDEN keeps them out of SELECT *.',
      'FOR SYSTEM_TIME AS OF t shows the table as it was at t; ALL shows every version.',
      'FROM … TO, BETWEEN … AND and CONTAINED IN select versions in a range; they differ only at the edges.',
      'Join a table to itself AS OF an earlier time to undo a mistaken change.',
      'History cannot be changed and the table cannot be dropped while versioning is on; HISTORY_RETENTION_PERIOD limits its size.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'security-injection',
    title: 'Security: logins, roles, permissions and SQL injection',
    summary: 'Who may connect and what they may do: logins and database users, GRANT, DENY and REVOKE, roles, testing with EXECUTE AS, ownership chaining through procedures and views, least privilege for an application, and SQL injection: how it works, what it can do, and how parameters and QUOTENAME stop it.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'So far you have connected as yourself, probably as an administrator who can do anything. A real database is used by an application, by report writers and by support staff, and each should be able to do **only what they need**. This lesson sets that up, then looks at the most common way databases are attacked: SQL injection.' },
      { type: 'h2', text: 'Logins and users' },
      { type: 'p', text: 'SQL Server checks identity in two places:' },
      { type: 'ul', items: [
        'A **login** lets someone connect to the **server**. It is either a Windows account or group (`CREATE LOGIN [SHOP\\Ana] FROM WINDOWS`) or a SQL Server login with its own password.',
        'A **user** gives a login access to one **database**. A login with no user in BuildMart can connect to the server but cannot use BuildMart.'
      ] },
      { type: 'code', title: 'Server level (run as an administrator)', code: `USE master;
CREATE LOGIN shop_web WITH PASSWORD = N'use-a-long-random-password-here';
GO
USE BuildMart;
CREATE USER shop_web FOR LOGIN shop_web;` },
      { type: 'p', text: 'Windows logins are preferred: there is no password in a connection string, and when someone leaves, disabling their Windows account locks them out of SQL Server too. To try permissions in this lesson without creating logins on your server, use **users without a login**. They exist only inside the database and are made for exactly this kind of test:' },
      { type: 'code', code: sql`
CREATE USER Ana WITHOUT LOGIN;      -- works in the shop
CREATE USER Raj WITHOUT LOGIN;      -- writes reports

SELECT name, type_desc, authentication_type_desc
FROM sys.database_principals
WHERE name IN ('Ana', 'Raj');`, output: 'name  type_desc  authentication_type_desc\n----  ---------  ------------------------\nAna   SQL_USER   NONE\nRaj   SQL_USER   NONE' },
      { type: 'h2', text: 'GRANT, and testing with EXECUTE AS' },
      { type: 'p', text: 'A new user can do almost nothing. `GRANT` gives a permission on an object. `EXECUTE AS USER` lets you, as an administrator, run statements as if you were that user, and `REVERT` switches back:' },
      { type: 'code', code: sql`
GRANT SELECT ON dbo.Products TO Ana;

EXECUTE AS USER = 'Ana';
SELECT USER_NAME() AS RunningAs, COUNT(*) AS Products FROM dbo.Products;
SELECT COUNT(*) AS Customers FROM dbo.Customers;
REVERT;`, output: 'RunningAs  Products\n---------  --------\nAna              12\n\nMsg 229, Level 14, State 5, Line 5\nThe SELECT permission was denied on the object \'Customers\', database \'BuildMart\', schema \'dbo\'.' },
      { type: 'p', text: 'Ana can read Products but not Customers: **Msg 229, permission denied**. The error names the object and the permission, which makes it easy to see what is missing. Permissions can be granted at several levels:' },
      { type: 'table', head: ['Grant on', 'Example', 'Covers'], rows: [
        ['A column list', '`GRANT SELECT ON dbo.Customers (FirstName, City) TO Raj`', 'Only those columns'],
        ['An object', '`GRANT SELECT, INSERT ON dbo.Orders TO Ana`', 'One table, view, procedure or function'],
        ['A schema', '`GRANT SELECT ON SCHEMA::dbo TO Raj`', 'Every object in the schema, including ones created later'],
        ['The database', '`GRANT CREATE TABLE TO Raj`', 'Database-wide actions']
      ] },
      { type: 'h2', text: 'Roles' },
      { type: 'p', text: 'Granting to people one by one is hard to keep track of. Grant to a **role** instead, and add people to the role. When Raj moves to another team, you remove him from one role rather than hunting for his permissions:' },
      { type: 'code', code: sql`
CREATE ROLE Reporting;
GRANT SELECT ON SCHEMA::dbo TO Reporting;
DENY SELECT ON dbo.Customers (Email, Phone) TO Reporting;
ALTER ROLE Reporting ADD MEMBER Raj;

EXECUTE AS USER = 'Raj';
SELECT TOP (2) FirstName, City FROM dbo.Customers ORDER BY CustomerId;
SELECT TOP (2) FirstName, Email FROM dbo.Customers ORDER BY CustomerId;
REVERT;`, output: 'FirstName  City\n---------  -----\nAsha       Leeds\nBen        York\n\nMsg 230, Level 14, State 1, Line 8\nThe SELECT permission was denied on the column \'Email\' of the object \'Customers\', database \'BuildMart\', schema \'dbo\'.' },
      { type: 'p', text: 'Raj can read every table in dbo, but the customers’ email addresses and phone numbers are off limits (**Msg 230** is the column-level form of “permission denied”). **DENY always wins**: it beats any GRANT the user gets from another role. `REVOKE` is different: it removes a GRANT or DENY, going back to “not mentioned”.' },
      { type: 'p', text: 'SQL Server has built-in roles too. In each database, `db_datareader` can read every table and `db_datawriter` can change every table; `db_owner` can do anything in the database. At server level, `sysadmin` can do anything at all. Use them sparingly: an application that connects as `db_owner` or `sysadmin` turns every bug into a disaster.' },
      { type: 'code', code: sql`
SELECT r.name AS RoleName, m.name AS Member
FROM sys.database_role_members AS rm
JOIN sys.database_principals AS r ON r.principal_id = rm.role_principal_id
JOIN sys.database_principals AS m ON m.principal_id = rm.member_principal_id
WHERE m.name IN ('Ana', 'Raj');

SELECT pr.name AS Grantee, pe.state_desc, pe.permission_name,
       COALESCE(OBJECT_NAME(pe.major_id), pe.class_desc) AS OnObject,
       COL_NAME(pe.major_id, pe.minor_id) AS OnColumn
FROM sys.database_permissions AS pe
JOIN sys.database_principals AS pr ON pr.principal_id = pe.grantee_principal_id
WHERE pr.name IN ('Ana', 'Raj', 'Reporting')
ORDER BY Grantee, OnObject, OnColumn;`, output: 'RoleName   Member\n---------  ------\nReporting  Raj\n\nGrantee    state_desc  permission_name  OnObject   OnColumn\n---------  ----------  ---------------  ---------  --------\nAna        GRANT       CONNECT          DATABASE   NULL\nAna        GRANT       SELECT           Products   NULL\nRaj        GRANT       CONNECT          DATABASE   NULL\nReporting  DENY        SELECT           Customers  Email\nReporting  DENY        SELECT           Customers  Phone\nReporting  GRANT       SELECT           SCHEMA     NULL' },
      { type: 'h2', text: 'Procedures as the front door: ownership chaining' },
      { type: 'p', text: 'The safest way to let an application change data is to give it **no** table permissions at all, only EXECUTE on procedures that do the work. This works because of **ownership chaining**: when a procedure owned by dbo reads a table owned by dbo, SQL Server does not check the caller’s permissions on the table. Owning the procedure and the table is enough.' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.GetCustomerOrders @CustomerId int
AS
SELECT o.OrderId, o.OrderDate, o.Status
FROM dbo.Orders AS o
WHERE o.CustomerId = @CustomerId
ORDER BY o.OrderId;
GO
GRANT EXECUTE ON dbo.GetCustomerOrders TO Ana;

EXECUTE AS USER = 'Ana';
EXEC dbo.GetCustomerOrders @CustomerId = 1;
SELECT COUNT(*) FROM dbo.Orders;
REVERT;`, output: 'OrderId  OrderDate   Status\n-------  ----------  -------\n      1  2024-02-03  Shipped\n      3  2024-03-01  Shipped\n\nMsg 229, Level 14, State 5, Line 5\nThe SELECT permission was denied on the object \'Orders\', database \'BuildMart\', schema \'dbo\'.' },
      { type: 'p', text: 'Ana can see customer 1’s orders through the procedure but cannot read Orders directly. She can only do what the procedure does, with the checks the procedure makes. Views work the same way: grant SELECT on a view and the caller can read through it without any permission on the tables underneath.' },
      { type: 'note', kind: 'warn', text: 'Dynamic SQL breaks the chain. A string run with `EXEC (@sql)` or `sp_executesql` inside a procedure is checked against the **caller’s** permissions, as if the caller had typed it. A procedure that builds SQL as text needs the caller to have the table permissions too, or a module signed with a certificate.' },
      { type: 'h2', text: 'SQL injection' },
      { type: 'p', text: 'SQL injection happens when text typed by a user is glued into a SQL statement, so the user can change the statement itself. Here is a search procedure written the dangerous way, building the query as a string:' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.FindCustomers @LastName nvarchar(100)
AS
BEGIN
    DECLARE @sql nvarchar(max) =
        N'SELECT CustomerId, FirstName, LastName, City FROM dbo.Customers ' +
        N'WHERE LastName = ''' + @LastName + N'''';
    PRINT @sql;
    EXEC (@sql);
END;
GO
EXEC dbo.FindCustomers @LastName = N'Patel';`, output: 'SELECT CustomerId, FirstName, LastName, City FROM dbo.Customers WHERE LastName = \'Patel\'\n\nCustomerId  FirstName  LastName  City\n----------  ---------  --------  -----\n         1  Asha       Patel     Leeds' },
      { type: 'p', text: 'It works for honest input. The PRINT shows the statement that ran. Now an attacker types a quote, a condition that is always true, and `--` to comment out the rest:' },
      { type: 'code', code: sql`
EXEC dbo.FindCustomers @LastName = N'x'' OR 1 = 1 --';`, output: 'SELECT CustomerId, FirstName, LastName, City FROM dbo.Customers WHERE LastName = \'x\' OR 1 = 1 --\'\n\nCustomerId  FirstName  LastName  City\n----------  ---------  --------  ---------\n         1  Asha       Patel     Leeds\n         2  Ben        Carter    York\n         3  Chloe      Evans     Leeds\n         4  Dev        Singh     Bradford\n         5  Ella       Brown     NULL\n         6  Farid      Khan      York\n         7  Grace      Lee       Leeds\n         8  Zoë        Müller    Harrogate' },
      { type: 'p', text: 'The quote closed the string early, and the rest of the input became SQL: `OR 1 = 1` matched every customer. With UNION the attacker can read any other table the account can see, here the customers’ private contact details:' },
      { type: 'code', code: sql`
EXEC dbo.FindCustomers
    @LastName = N'x'' UNION SELECT CustomerId, Email, Phone, NULL FROM dbo.Customers --';`, output: 'SELECT CustomerId, FirstName, LastName, City FROM dbo.Customers WHERE LastName = \'x\' UNION SELECT CustomerId, Email, Phone, NULL FROM dbo.Customers --\'\n\nCustomerId  FirstName          LastName       City\n----------  -----------------  -------------  ----\n         1  asha@example.com   0113 496 0001  NULL\n         2  NULL               01904 555 010  NULL\n         3  chloe@example.com  NULL           NULL\n         4  dev@example.com    01274 555 220  NULL\n         5  ella@example.com   NULL           NULL\n         6  farid@example.com  01904 555 777  NULL\n         7  NULL               NULL           NULL\n         8  zoe@example.com    01423 555 123  NULL' },
      { type: 'p', text: 'And if the account may change data, the input can contain a whole new statement:' },
      { type: 'code', code: sql`
EXEC dbo.FindCustomers @LastName = N'x''; UPDATE dbo.Products SET Price = 0.01; --';

SELECT TOP (3) Name, Price FROM dbo.Products ORDER BY ProductId;`, output: 'SELECT CustomerId, FirstName, LastName, City FROM dbo.Customers WHERE LastName = \'x\'; UPDATE dbo.Products SET Price = 0.01; --\'\n\nCustomerId  FirstName  LastName  City\n----------  ---------  --------  ----\n\nName              Price\n----------------  -----\nClaw hammer        0.01\nCordless drill     0.01\nTape measure 8 m   0.01' },
      { type: 'p', text: 'Every product now costs a penny. Injection also breaks innocent input: a customer called O’Brien gets an error, because the quote in the name ends the string. That error is often how attackers find the weakness in the first place.' },
      { type: 'widget', name: 'injection-lab' },
      { type: 'h2', text: 'The fix: parameters' },
      { type: 'p', text: 'Never put input **into** the SQL text. Pass it as a **parameter**: the statement is fixed, and the value travels separately, so it can only ever be a value, never SQL. In T-SQL, `sp_executesql` takes the statement, the parameter declarations and the values:' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.FindCustomers @LastName nvarchar(100)
AS
BEGIN
    EXEC sp_executesql
        N'SELECT CustomerId, FirstName, LastName, City
          FROM dbo.Customers WHERE LastName = @LastName',
        N'@LastName nvarchar(100)',
        @LastName = @LastName;
END;
GO
EXEC dbo.FindCustomers @LastName = N'Patel';
EXEC dbo.FindCustomers @LastName = N'x'' OR 1 = 1 --';
EXEC dbo.FindCustomers @LastName = N'O''Brien';`, output: 'CustomerId  FirstName  LastName  City\n----------  ---------  --------  -----\n         1  Asha       Patel     Leeds\n\nCustomerId  FirstName  LastName  City\n----------  ---------  --------  ----\n\nCustomerId  FirstName  LastName  City\n----------  ---------  --------  ----' },
      { type: 'p', text: 'Patel is found; the attack is just an odd surname that matches nobody; O’Brien works without an error. Of course, this search needs no dynamic SQL at all: a plain `SELECT … WHERE LastName = @LastName` in the procedure is parameterized already. Use dynamic SQL only when the **shape** of the query must change.' },
      { type: 'h2', text: 'When the SQL itself must change: QUOTENAME and allow-lists' },
      { type: 'p', text: 'Parameters can hold values, not names: you cannot pass a column to sort by as a parameter. When a name must go into the SQL text, check it against a list of allowed names and wrap it in `QUOTENAME`, which puts it in square brackets and doubles any `]` inside it, so it can only ever be read as a name:' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.ListProducts @SortBy sysname
AS
BEGIN
    IF @SortBy NOT IN (N'Name', N'Price', N'Stock')
        THROW 50001, 'SortBy must be Name, Price or Stock.', 1;

    DECLARE @sql nvarchar(max) =
        N'SELECT TOP (3) Name, Stock FROM dbo.Products ORDER BY '
        + QUOTENAME(@SortBy) + N' DESC';
    EXEC sp_executesql @sql;
END;
GO
EXEC dbo.ListProducts @SortBy = N'Stock';
EXEC dbo.ListProducts @SortBy = N'Stock; DROP TABLE dbo.Orders';`, output: 'Name              Stock\n----------------  -----\nTimber 2x4 2.4 m    500\nCement 25 kg        300\nSand 25 kg          220\n\nMsg 50001, Level 16, State 1, Procedure dbo.ListProducts, Line 5\nSortBy must be Name, Price or Stock.' },
      { type: 'h2', text: 'Least privilege' },
      { type: 'p', text: 'Defence in depth means planning for the bug you have not found yet. If the shop’s web application connects as a user that can only EXECUTE a set of procedures, an injection flaw somewhere in it cannot drop tables or read the customer list directly. A sensible starting point:' },
      { type: 'ul', items: [
        'One login per application, never `sa` or a sysadmin; Windows or managed identities where possible, so there is no password to leak.',
        'Applications get EXECUTE on their procedures (or SELECT on views), not db_owner.',
        'People get roles that match their jobs; DENY the sensitive columns.',
        'Every query built from input is parameterized: in procedures, and in application code (the next lesson shows `SqlParameter` in C#).',
        'Names that must be dynamic are checked against an allow-list and wrapped in QUOTENAME.'
      ] },
      { type: 'quiz', question: 'Raj is in two roles. One grants SELECT on dbo.Customers; the other denies SELECT on dbo.Customers. Can Raj read the table?', options: ['Yes: a GRANT anywhere is enough', 'No: DENY wins over GRANT', 'Only the columns that are not denied', 'It depends on which role was created first'], answer: 1, explain: 'DENY takes precedence over any GRANT, from any role. REVOKE, by contrast, only removes an earlier GRANT or DENY.' },
      { type: 'quiz', question: 'Which change stops this injection: EXEC(\'SELECT … WHERE LastName = \'\'\' + @LastName + \'\'\'\')?', options: ['Replace every quote in @LastName with two quotes', 'Use sp_executesql with @LastName passed as a parameter', 'Limit @LastName to 30 characters', 'Run the procedure with NOCOUNT ON'], answer: 1, explain: 'With a parameter, the input is never part of the SQL text, so it cannot change the statement. Escaping quotes by hand is easy to get wrong (and does not help with numbers or names); length limits only make attacks shorter.' },
      { type: 'exercise', task: 'Create a role ShopStaff that may run dbo.GetCustomerOrders and read dbo.Products, but nothing else, and add a new user Lee (without login) to it. As Lee, run the procedure for customer 4 and try to read dbo.Customers. Then switch back.', hint: 'CREATE ROLE, two GRANTs (EXECUTE ON the procedure, SELECT ON the table), CREATE USER … WITHOUT LOGIN, ALTER ROLE … ADD MEMBER. Test inside EXECUTE AS USER = \'Lee\' … REVERT.', solution: sql`
CREATE ROLE ShopStaff;
GRANT EXECUTE ON dbo.GetCustomerOrders TO ShopStaff;
GRANT SELECT ON dbo.Products TO ShopStaff;

CREATE USER Lee WITHOUT LOGIN;
ALTER ROLE ShopStaff ADD MEMBER Lee;

EXECUTE AS USER = 'Lee';
EXEC dbo.GetCustomerOrders @CustomerId = 4;
SELECT COUNT(*) FROM dbo.Customers;
REVERT;`, output: 'OrderId  OrderDate   Status\n-------  ----------  -------\n      4  2024-03-15  Shipped\n      7  2024-05-05  Shipped\n\nMsg 229, Level 14, State 5, Line 10\nThe SELECT permission was denied on the object \'Customers\', database \'BuildMart\', schema \'dbo\'.' }
    ],
    keyPoints: [
      'A login lets someone connect to the server; a user maps it into one database. Prefer Windows logins.',
      'GRANT gives a permission, DENY forbids it and always wins, REVOKE removes either.',
      'Grant to roles, not people; use schema-level grants and column-level DENY where they fit.',
      'EXECUTE AS USER … REVERT tests what a user can do; users WITHOUT LOGIN are handy for tests.',
      'Ownership chaining lets a procedure or view use tables the caller cannot touch; dynamic SQL inside breaks the chain.',
      'SQL injection: input glued into SQL text can change the statement. It can read, change or destroy data.',
      'Fix it with parameters (sp_executesql in T-SQL, SqlParameter in C#); for names, an allow-list plus QUOTENAME.',
      'Least privilege: applications get EXECUTE on procedures, never db_owner or sysadmin.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'csharp-data-access',
    title: 'Calling SQL Server from C#: ADO.NET, Dapper and EF Core',
    summary: 'Use BuildMart from a C# program three ways: ADO.NET with SqlConnection, SqlCommand and parameters; Dapper, which maps rows to objects; and Entity Framework Core with LINQ, change tracking and the SQL it generates. Plus stored procedures, transactions, SQL injection in C#, and the N + 1 query problem.',
    minutes: 25,
    blocks: [
      { type: 'p', text: 'Everything so far ran in SSMS. A real shop’s website or till is a program, and in .NET it talks to SQL Server through a library. There are three common choices, built on top of each other:' },
      { type: 'table', head: ['Library', 'What it is', 'You write'], rows: [
        ['**ADO.NET** (`Microsoft.Data.SqlClient`)', 'The SQL Server driver itself: connections, commands, parameters, readers', 'All the SQL, and the code that copies each column into your objects'],
        ['**Dapper**', 'A small library of extension methods on the connection', 'All the SQL; Dapper turns rows into objects for you'],
        ['**Entity Framework Core**', 'A full object-relational mapper (ORM)', 'LINQ in C#; EF Core writes the SQL, tracks changes and saves them']
      ] },
      { type: 'p', text: 'Create a console app and add the packages (all three are free, from NuGet). The samples use top-level statements, so each is a complete Program.cs:' },
      { type: 'code', lang: 'cs', title: 'Terminal', code: cs`
dotnet new console -n ShopTools
cd ShopTools
dotnet add package Microsoft.Data.SqlClient
dotnet add package Dapper
dotnet add package Microsoft.EntityFrameworkCore.SqlServer` },
      { type: 'h2', text: 'The connection string' },
      { type: 'p', text: 'A **connection string** tells the driver which server and database to use and how to log in. For BuildMart on your own machine with your Windows account:' },
      { type: 'ul', items: [
        '`Server=localhost` (or `.\\SQLEXPRESS` for SQL Server Express): the server.',
        '`Database=BuildMart`: the database to start in.',
        '`Integrated Security=True`: log in as the Windows user running the program, so no password is needed.',
        '`TrustServerCertificate=True`: the driver encrypts connections by default and checks the server’s certificate. A development server has a self-signed one, so this accepts it. On a real server, install a proper certificate instead.'
      ] },
      { type: 'note', kind: 'warn', text: 'Do not hard-code connection strings in real applications, and never commit one that contains a password. Read it from configuration (`appsettings.json`, environment variables, user secrets in development, a key vault in production). The samples hard-code it only to stay short.' },
      { type: 'h2', text: 'ADO.NET: connection, command, reader' },
      { type: 'p', text: 'The basic pattern: open a `SqlConnection`, create a `SqlCommand` with the SQL, add its **parameters**, and read the rows with a `SqlDataReader`:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using System.Data;
using Microsoft.Data.SqlClient;

const string connectionString =
    "Server=localhost;Database=BuildMart;Integrated Security=True;TrustServerCertificate=True";

await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

await using var command = new SqlCommand(
    """
    SELECT Name, Price
    FROM dbo.Products
    WHERE Price < @MaxPrice
    ORDER BY Price, Name;
    """, connection);
command.Parameters.Add(new SqlParameter("@MaxPrice", SqlDbType.Decimal) { Precision = 10, Scale = 2, Value = 10m });

await using var reader = await command.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    string name = reader.GetString(0);
    decimal price = reader.GetDecimal(1);
    Console.WriteLine($"{name,-18} {price,6}");
}`, output: 'Sand 25 kg           4.10\nWall plugs (100)     4.50\nSafety goggles       6.80\nTimber 2x4 2.4 m     6.80\nCement 25 kg         7.20\nTape measure 8 m     9.75' },
      { type: 'ul', items: [
        '`await using` closes the reader, command and connection when they go out of scope, even if an exception is thrown. A connection left open is a leak.',
        'Closing a connection does not really disconnect. The driver keeps it in a **connection pool** and hands it to the next `OpenAsync` with the same connection string, so open late and close early: it is cheap.',
        '`GetString(0)`, `GetDecimal(1)` read columns by position, typed. A NULL column must be checked with `IsDBNull` first.',
        'The `Async` methods free the thread while SQL Server works, which matters in web applications that serve many requests at once.'
      ] },
      { type: 'p', text: 'Two more ways to run a command: `ExecuteScalarAsync` returns the first column of the first row, and `ExecuteNonQueryAsync` runs an INSERT, UPDATE or DELETE and returns the number of rows changed:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using System.Data;
using Microsoft.Data.SqlClient;

const string connectionString =
    "Server=localhost;Database=BuildMart;Integrated Security=True;TrustServerCertificate=True";

await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

await using var count = new SqlCommand("SELECT COUNT(*) FROM dbo.Products WHERE Stock = 0;", connection);
int outOfStock = (int)(await count.ExecuteScalarAsync())!;
Console.WriteLine($"Out of stock: {outOfStock}");

await using var restock = new SqlCommand("UPDATE dbo.Products SET Stock = Stock + @Qty WHERE Stock = 0;", connection);
restock.Parameters.Add("@Qty", SqlDbType.Int).Value = 25;
int changed = await restock.ExecuteNonQueryAsync();
Console.WriteLine($"Restocked: {changed} products");`, output: 'Out of stock: 2\nRestocked: 2 products' },
      { type: 'h2', text: 'Parameters, always' },
      { type: 'p', text: 'The SQL injection from the last lesson is just as easy in C#. String interpolation looks harmless, but it pastes the input into the SQL text:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using System.Data;
using Microsoft.Data.SqlClient;

const string connectionString =
    "Server=localhost;Database=BuildMart;Integrated Security=True;TrustServerCertificate=True";

await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

string input = "x' OR 1 = 1 --";            // typed into a search box

// Wrong: the input becomes part of the SQL.
await using var bad = new SqlCommand(
    $"SELECT COUNT(*) FROM dbo.Customers WHERE LastName = '{input}';", connection);
Console.WriteLine($"Interpolated:  {await bad.ExecuteScalarAsync()} customers");

// Right: the SQL is fixed; the input travels separately as a value.
await using var good = new SqlCommand(
    "SELECT COUNT(*) FROM dbo.Customers WHERE LastName = @LastName;", connection);
good.Parameters.Add("@LastName", SqlDbType.NVarChar, 40).Value = input;
Console.WriteLine($"Parameterized: {await good.ExecuteScalarAsync()} customers");`, output: 'Interpolated:  8 customers\nParameterized: 0 customers' },
      { type: 'note', kind: 'tip', text: 'Give each parameter its real type and size: `SqlDbType.NVarChar, 40` for an `nvarchar(40)` column, `SqlDbType.VarChar` for a `varchar` one. The shortcut `Parameters.AddWithValue("@Status", "Shipped")` guesses `nvarchar` with the length of that value. Against a `varchar` column that means an implicit conversion (and possibly a scan, as in the sargability lesson), and each length gets its own cached plan.' },
      { type: 'h2', text: 'Stored procedures and errors' },
      { type: 'p', text: 'Calling a procedure is the same, with `CommandType.StoredProcedure` and no SQL text. An **output parameter** needs its direction set. Here is a small procedure that places a one-line order or refuses with error 50001:' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE dbo.AddOrder
    @CustomerId int, @ProductId int, @Quantity int, @OrderId int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    UPDATE dbo.Products SET Stock = Stock - @Quantity
    WHERE ProductId = @ProductId AND Stock >= @Quantity;
    IF @@ROWCOUNT = 0
        THROW 50001, 'Not enough stock.', 1;

    INSERT INTO dbo.Orders (CustomerId, OrderDate, Status)
    VALUES (@CustomerId, '2024-06-25', 'Pending');
    SET @OrderId = SCOPE_IDENTITY();

    INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
    SELECT @OrderId, ProductId, @Quantity, Price FROM dbo.Products WHERE ProductId = @ProductId;

    COMMIT;
END;` },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using System.Data;
using Microsoft.Data.SqlClient;

const string connectionString =
    "Server=localhost;Database=BuildMart;Integrated Security=True;TrustServerCertificate=True";

await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

await TryOrder(3, 2, 1);      // one drill
await TryOrder(3, 9, 5);      // five boxes of wall plugs: none in stock

async Task TryOrder(int customerId, int productId, int quantity)
{
    await using var cmd = new SqlCommand("dbo.AddOrder", connection) { CommandType = CommandType.StoredProcedure };
    cmd.Parameters.Add("@CustomerId", SqlDbType.Int).Value = customerId;
    cmd.Parameters.Add("@ProductId", SqlDbType.Int).Value = productId;
    cmd.Parameters.Add("@Quantity", SqlDbType.Int).Value = quantity;
    SqlParameter orderId = cmd.Parameters.Add("@OrderId", SqlDbType.Int);
    orderId.Direction = ParameterDirection.Output;

    try
    {
        await cmd.ExecuteNonQueryAsync();
        Console.WriteLine($"Order {orderId.Value} placed");
    }
    catch (SqlException ex) when (ex.Number == 50001)
    {
        Console.WriteLine($"Refused (error {ex.Number}): {ex.Message}");
    }
}`, output: 'Order 11 placed\nRefused (error 50001): Not enough stock.' },
      { type: 'p', text: 'A T-SQL error arrives in C# as a `SqlException`. `ex.Number` is the error number, so the program can react to the ones it expects (50001 here, or 1205 for a deadlock victim worth retrying) and let the rest propagate.' },
      { type: 'h2', text: 'Transactions from C#' },
      { type: 'p', text: 'When the statements come from C# rather than one procedure, start the transaction on the connection and give it to **every** command. (SqlClient refuses to run a command without it while a transaction is open on its connection.) Here the second INSERT refers to a product that does not exist:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using System.Data;
using Microsoft.Data.SqlClient;

const string connectionString =
    "Server=localhost;Database=BuildMart;Integrated Security=True;TrustServerCertificate=True";

await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

await using (var tx = (SqlTransaction)await connection.BeginTransactionAsync())
{
    try
    {
        await using var order = new SqlCommand(
            "INSERT INTO dbo.Orders (CustomerId, OrderDate, Status) OUTPUT inserted.OrderId VALUES (@C, @D, 'Pending');",
            connection, tx);
        order.Parameters.Add("@C", SqlDbType.Int).Value = 5;
        order.Parameters.Add("@D", SqlDbType.Date).Value = new DateTime(2024, 6, 22);
        int orderId = (int)(await order.ExecuteScalarAsync())!;
        Console.WriteLine($"Inserted order {orderId}");

        await using var line = new SqlCommand(
            "INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice) VALUES (@O, @P, 1, 9.75);",
            connection, tx);
        line.Parameters.Add("@O", SqlDbType.Int).Value = orderId;
        line.Parameters.Add("@P", SqlDbType.Int).Value = 99;          // no such product
        await line.ExecuteNonQueryAsync();

        await tx.CommitAsync();
    }
    catch (SqlException ex)
    {
        await tx.RollbackAsync();
        Console.WriteLine($"Rolled back after error {ex.Number}");
    }
}

await using var check = new SqlCommand("SELECT COUNT(*) FROM dbo.Orders;", connection);
Console.WriteLine($"Orders in the table: {await check.ExecuteScalarAsync()}");`, output: 'Inserted order 11\nRolled back after error 547\nOrders in the table: 10' },
      { type: 'p', text: 'Order 11 was inserted, then the foreign key error (547) sent the code to `catch`, which rolled it back: still 10 orders. If the code forgot to commit or roll back, disposing the transaction at the end of its `using` block rolls it back.' },
      { type: 'h2', text: 'Dapper: your SQL, mapped to objects' },
      { type: 'p', text: 'All that reader code is repetitive. Dapper adds methods such as `QueryAsync<T>` to the connection: you give it SQL and an object whose properties are the parameters, and it creates one `T` per row, matching columns to properties (or constructor parameters) by name:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using Dapper;
using Microsoft.Data.SqlClient;

const string connectionString =
    "Server=localhost;Database=BuildMart;Integrated Security=True;TrustServerCertificate=True";

await using var connection = new SqlConnection(connectionString);   // Dapper opens it when needed

var cheap = await connection.QueryAsync<ProductRow>(
    "SELECT ProductId, Name, Price FROM dbo.Products WHERE Price < @MaxPrice ORDER BY Price, Name;",
    new { MaxPrice = 10m });
foreach (var p in cheap)
    Console.WriteLine($"{p.ProductId,2}  {p.Name,-18} {p.Price,6}");

int tools = await connection.ExecuteScalarAsync<int>(
    "SELECT COUNT(*) FROM dbo.Products WHERE CategoryId = @Id;", new { Id = 1 });
Console.WriteLine($"Tools: {tools}");

int repriced = await connection.ExecuteAsync(
    "UPDATE dbo.Products SET Price = Price * 1.05 WHERE CategoryId = @Id;", new { Id = 5 });
Console.WriteLine($"Repriced: {repriced}");

record ProductRow(int ProductId, string Name, decimal Price);`, output: '5  Sand 25 kg           4.10\n 9  Wall plugs (100)     4.50\n12  Safety goggles       6.80\n 6  Timber 2x4 2.4 m     6.80\n 4  Cement 25 kg         7.20\n 3  Tape measure 8 m     9.75\nTools: 3\nRepriced: 2' },
      { type: 'p', text: 'The SQL is exactly what you would write in SSMS, and it is still parameterized: `new { MaxPrice = 10m }` becomes the parameter `@MaxPrice`. Dapper is a good fit when you like writing SQL and want little in between. Note that a C# `string` becomes an `nvarchar` parameter; for a `varchar` column, pass `new DbString { Value = …, IsAnsi = true, Length = 10 }`.' },
      { type: 'h2', text: 'Entity Framework Core: the model' },
      { type: 'p', text: 'EF Core works from a **model**: C# classes for the tables, and a `DbContext` that knows how they map. For an existing database you can generate it with `dotnet ef dbcontext scaffold`; here it is written by hand for BuildMart’s tables:' },
      { type: 'code', lang: 'cs', title: 'BuildMartContext.cs', code: cs`
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

public class Category
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = "";
}

public class Product
{
    public int ProductId { get; set; }
    public string Name { get; set; } = "";
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string Unit { get; set; } = "";
    public DateOnly AddedOn { get; set; }
}

public class Customer
{
    public int CustomerId { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? City { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public DateOnly JoinedOn { get; set; }
}

public class Order
{
    public int OrderId { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public DateOnly OrderDate { get; set; }
    public string Status { get; set; } = "";
    public List<OrderItem> Items { get; } = [];
}

public class OrderItem
{
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class BuildMartContext(Action<string>? log = null) : DbContext
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseSqlServer(
            "Server=localhost;Database=BuildMart;Integrated Security=True;TrustServerCertificate=True");
        if (log is not null)       // show each SQL command EF Core sends
            options.LogTo(log, [RelationalEventId.CommandExecuted], LogLevel.Information, DbContextLoggerOptions.None);
    }

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Category>().Property(c => c.CategoryId).ValueGeneratedNever();
        model.Entity<Product>().Property(p => p.Price).HasPrecision(10, 2);
        model.Entity<Customer>().Property(c => c.Phone).IsUnicode(false).HasMaxLength(20);
        model.Entity<Order>().Property(o => o.Status).IsUnicode(false).HasMaxLength(10);
        model.Entity<OrderItem>().HasKey(i => new { i.OrderId, i.ProductId });
        model.Entity<OrderItem>().Property(i => i.UnitPrice).HasPrecision(10, 2);
    }
}` },
      { type: 'p', text: 'Conventions do most of the mapping: a `DbSet` named Products maps to the table Products, a property called `ProductId` is the key, and `CategoryId` next to a `Category` property is the foreign key. `OnModelCreating` adds what conventions cannot guess, such as decimal precision, `varchar` columns (`IsUnicode(false)`), and the two-column key of OrderItems.' },
      { type: 'h2', text: 'Querying with LINQ' },
      { type: 'p', text: 'You write LINQ against the DbSets, and EF Core translates it into one SQL statement. `ToQueryString()` shows the SQL without running it:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using Microsoft.EntityFrameworkCore;

await using var db = new BuildMartContext();

decimal maxPrice = 10m;
var query = db.Products
    .Where(p => p.Price < maxPrice)
    .OrderBy(p => p.Price).ThenBy(p => p.Name)
    .Select(p => new { p.Name, Category = p.Category!.Name, p.Price });

Console.WriteLine(query.ToQueryString());
Console.WriteLine();

foreach (var row in await query.ToListAsync())
    Console.WriteLine($"{row.Name,-18} {row.Category,-9} {row.Price,6}");`, output: 'DECLARE @maxPrice decimal(10,2) = 10.0;\n\nSELECT [p].[Name], [c].[Name] AS [Category], [p].[Price]\nFROM [Products] AS [p]\nLEFT JOIN [Categories] AS [c] ON [p].[CategoryId] = [c].[CategoryId]\nWHERE [p].[Price] < @maxPrice\nORDER BY [p].[Price], [p].[Name]\n\nSand 25 kg         Building    4.10\nWall plugs (100)   Fixings     4.50\nSafety goggles     Safety      6.80\nTimber 2x4 2.4 m   Timber      6.80\nCement 25 kg       Building    7.20\nTape measure 8 m   Tools       9.75' },
      { type: 'p', text: 'The SQL is close to what you would write yourself: a join for the category (a LEFT JOIN, because CategoryId allows NULL), only the three columns the `Select` asked for, and the C# variable sent as a parameter. EF Core never pastes values into the SQL text, so LINQ queries are safe from injection.' },
      { type: 'h2', text: 'Changing data: tracking and SaveChanges' },
      { type: 'p', text: 'Entities loaded by a query are **tracked**: the context remembers their original values. Change properties in C#, call `SaveChangesAsync`, and EF Core works out the UPDATE, wrapping all changes in a transaction. For changes to many rows at once, `ExecuteUpdateAsync` runs a single UPDATE without loading anything. The context below logs each command it sends:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using Microsoft.EntityFrameworkCore;

await using var db = new BuildMartContext(log: Console.WriteLine);

Product drill = await db.Products.SingleAsync(p => p.ProductId == 2);
drill.Price = 94.50m;                        // only a C# change so far
await db.SaveChangesAsync();                 // now the UPDATE is sent

int repriced = await db.Products
    .Where(p => p.CategoryId == 5)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Price, p => p.Price * 1.05m));
Console.WriteLine($"Repriced: {repriced}");`, output: 'Executed DbCommand (39ms) [Parameters=[], CommandType=\'Text\', CommandTimeout=\'30\']\nSELECT TOP(2) [p].[ProductId], [p].[AddedOn], [p].[CategoryId], [p].[Name], [p].[Price], [p].[Stock], [p].[Unit]\nFROM [Products] AS [p]\nWHERE [p].[ProductId] = 2\nExecuted DbCommand (15ms) [Parameters=[@p1=\'?\' (DbType = Int32), @p0=\'?\' (Precision = 10) (Scale = 2) (DbType = Decimal)], CommandType=\'Text\', CommandTimeout=\'30\']\nSET IMPLICIT_TRANSACTIONS OFF;\nSET NOCOUNT ON;\nUPDATE [Products] SET [Price] = @p0\nOUTPUT 1\nWHERE [ProductId] = @p1;\nExecuted DbCommand (14ms) [Parameters=[], CommandType=\'Text\', CommandTimeout=\'30\']\nUPDATE [p]\nSET [p].[Price] = [p].[Price] * 1.05\nFROM [Products] AS [p]\nWHERE [p].[CategoryId] = 5\nRepriced: 2' },
      { type: 'p', text: 'Three commands: the SELECT that loaded the drill (`SingleAsync` asks for TOP(2), so it can complain if two rows match), an UPDATE of only the column that changed (`OUTPUT 1` lets EF Core check that one row really was updated), and one set-based UPDATE for the paint. The timings in brackets will differ on your machine. When you only read data, add `.AsNoTracking()` to the query to skip the tracking work.' },
      { type: 'h2', text: 'Raw SQL in EF Core' },
      { type: 'p', text: 'When LINQ cannot express a query, EF Core runs your SQL and still maps the rows to entities. `FromSql` takes an **interpolated string** and turns every `{value}` into a parameter. `FromSqlRaw` takes plain text, and glued-in input is injectable again:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using Microsoft.EntityFrameworkCore;

await using var db = new BuildMartContext(log: Console.WriteLine);
string input = "x' OR 1 = 1 --";

var safe = db.Customers.FromSql($"SELECT * FROM dbo.Customers WHERE LastName = {input}");
Console.WriteLine($"FromSql: {await safe.CountAsync()} customers");

var risky = db.Customers.FromSqlRaw("SELECT * FROM dbo.Customers WHERE LastName = '" + input + "'");
Console.WriteLine($"FromSqlRaw with +: {await risky.CountAsync()} customers");`, output: 'Executed DbCommand (43ms) [Parameters=[p0=\'?\' (Size = 4000)], CommandType=\'Text\', CommandTimeout=\'30\']\nSELECT COUNT(*)\nFROM (\n    SELECT * FROM dbo.Customers WHERE LastName = @p0\n) AS [c]\nFromSql: 0 customers\nExecuted DbCommand (2ms) [Parameters=[], CommandType=\'Text\', CommandTimeout=\'30\']\nSELECT COUNT(*)\nFROM (\n    SELECT * FROM dbo.Customers WHERE LastName = \'x\' OR 1 = 1 --\'\n) AS [c]\nFromSqlRaw with +: 8 customers' },
      { type: 'p', text: 'The log shows the difference. FromSql sent the input as the parameter `p0`, and no customer has that odd surname. FromSqlRaw pasted it into the SQL, where `OR 1 = 1` matched everyone. EF Core wraps your SQL in a subquery to add the COUNT, and the line break after it is why the attacker’s `--` comment did not swallow the closing bracket. The C# compiler also warned about the second query: EF Core’s analyzer reports **EF1003** when FromSqlRaw is given a concatenated string.' },
      { type: 'h2', text: 'The N + 1 problem' },
      { type: 'p', text: 'ORMs make one mistake very easy: running a query **inside a loop**. One query fetches the orders, then one more query per order fetches its lines: N + 1 round trips to the server. Each round trip costs network time, so 10 orders feel fine on your laptop and 10,000 orders over a real network are painfully slow. Count the commands:' },
      { type: 'code', lang: 'cs', title: 'Program.cs', code: cs`
using Microsoft.EntityFrameworkCore;

int commands = 0;
await using var db = new BuildMartContext(log: _ => commands++);

// N + 1: one query for the orders, then one more for every order.
var orders = await db.Orders.OrderBy(o => o.OrderId).ToListAsync();
foreach (var o in orders)
{
    int lines = await db.OrderItems.CountAsync(i => i.OrderId == o.OrderId);
}
Console.WriteLine($"Loop:       {orders.Count} orders, {commands} commands");

// One query: ask for exactly what you need, and let SQL Server do the work.
commands = 0;
var summary = await db.Orders
    .OrderBy(o => o.OrderId)
    .Select(o => new { o.OrderId, Lines = o.Items.Count, Total = o.Items.Sum(i => i.Quantity * i.UnitPrice) })
    .ToListAsync();
Console.WriteLine($"Projection: {summary.Count} orders, {commands} command");

foreach (var s in summary.Take(3))
    Console.WriteLine($"  order {s.OrderId}: {s.Lines} lines, {s.Total:0.00}");`, output: 'Loop:       10 orders, 11 commands\nProjection: 10 orders, 1 command\n  order 1: 2 lines, 38.00\n  order 2: 2 lines, 113.00\n  order 3: 2 lines, 112.80' },
      { type: 'widget', name: 'round-trips' },
      { type: 'p', text: 'Other ways to avoid it: `.Include(o => o.Items)` loads the orders and their lines in one query (EF Core joins them), and in Dapper or ADO.NET, write one query with a join or GROUP BY instead of a query per row. Whatever the library, watch the number of commands, not just the SQL of each one.' },
      { type: 'h2', text: 'Which one to use?' },
      { type: 'table', head: ['', 'ADO.NET', 'Dapper', 'EF Core'], rows: [
        ['SQL', 'You write it', 'You write it', 'Generated from LINQ (raw SQL when needed)'],
        ['Mapping rows to objects', 'By hand', 'Automatic', 'Automatic, plus relationships'],
        ['Saving changes', 'Your INSERT/UPDATE', 'Your INSERT/UPDATE', 'Change tracking and SaveChanges'],
        ['Schema changes', 'Your scripts', 'Your scripts', 'Your scripts or EF migrations'],
        ['Good for', 'Bulk work, special features, libraries', 'Fast, SQL-first applications', 'Most business applications']
      ] },
      { type: 'p', text: 'They mix well: many applications use EF Core for everyday work and Dapper (on the same connection string) for a few heavy reports. Whatever you choose, everything from this course still applies: parameters, indexes for the queries the application really sends, short transactions, and a login with only the permissions it needs.' },
      { type: 'quiz', question: 'Why is `new SqlCommand($"… WHERE LastName = \'{input}\'", connection)` dangerous even though it uses C# string interpolation?', options: ['Interpolation is slower than concatenation', 'The input is pasted into the SQL text, so it can change the statement', 'SqlCommand does not accept interpolated strings', 'It is not dangerous: interpolation escapes quotes'], answer: 1, explain: 'An interpolated string is just a string: the value becomes part of the SQL. Use a parameter (`@LastName`) and add the value with Parameters.Add. EF Core’s FromSql is different: it takes a FormattableString and turns each value into a parameter.' },
      { type: 'quiz', question: 'A page lists 50 orders and shows each one’s number of lines. It runs one query for the orders and one per order for the count. How many round trips is that, and what is the fix?', options: ['1: EF Core batches them automatically', '50: one per order', '51: fix it with one query that projects the count, or Include', '2: one for orders, one for all lines'], answer: 2, explain: 'One query for the list plus one per order is the N + 1 pattern. Project the count in the same query (`Select(o => new { …, Lines = o.Items.Count })`) or load the lines with Include.' },
      { type: 'exercise', lang: 'cs', task: 'With Dapper, list each city and how many customers live there, most first (then by city name). Show customers with no city as "(none)". Print each line as the city padded to 10 characters, then the count.', hint: 'Do the work in SQL: `SELECT COALESCE(City, N\'(none)\') AS City, COUNT(*) AS Customers … GROUP BY City ORDER BY Customers DESC, City`, and map it to a record with City and Customers.', solution: cs`
using Dapper;
using Microsoft.Data.SqlClient;

const string connectionString =
    "Server=localhost;Database=BuildMart;Integrated Security=True;TrustServerCertificate=True";

await using var connection = new SqlConnection(connectionString);

var cities = await connection.QueryAsync<CityCount>(
    """
    SELECT COALESCE(City, N'(none)') AS City, COUNT(*) AS Customers
    FROM dbo.Customers
    GROUP BY City
    ORDER BY Customers DESC, City;
    """);

foreach (var c in cities)
    Console.WriteLine($"{c.City,-10} {c.Customers}");

record CityCount(string City, int Customers);`, output: 'Leeds      3\nYork       2\n(none)     1\nBradford   1\nHarrogate  1' }
    ],
    keyPoints: [
      'Microsoft.Data.SqlClient is the driver; Dapper and EF Core are built on it.',
      'Keep connection strings in configuration; open connections late, close them early (with using) and let pooling make that cheap.',
      'Always pass values as parameters with the right type and size; never interpolate input into SQL text.',
      'T-SQL errors arrive as SqlException; ex.Number tells you which (50001, 547, 1205 …).',
      'A SqlTransaction must be given to every command on its connection; commit, or roll back in catch.',
      'Dapper: your SQL, rows mapped to objects, parameters from an anonymous object.',
      'EF Core: LINQ becomes parameterized SQL; tracked entities are saved with SaveChanges; ExecuteUpdate changes many rows at once.',
      'Watch the number of round trips: a query inside a loop is the N + 1 problem.'
    ]
  },
  // ------------------------------------------------------------------ 7
  {
    slug: 'database-capstone',
    title: 'Putting it together: designing an order-management database',
    summary: 'Design and build a small order system from requirements: tables, keys and constraints that make bad data impossible, indexes for the real queries, price history with a temporal table, a PlaceOrder procedure with a table-valued parameter, a transaction and a race-proof stock check, cancelling, reporting, and an application user that can only run procedures.',
    minutes: 30,
    blocks: [
      { type: 'p', text: 'This lesson uses almost everything in the course. BuildMart’s original tables were kept simple for teaching. Here you design the order side of the shop again, properly, in a new schema called `shop`, and justify every choice. Run the samples in order: each builds on the one before.' },
      { type: 'h2', text: 'The requirements' },
      { type: 'ol', items: [
        'Customers have a unique email address and one or more delivery addresses, one of which may be the default.',
        'Each order goes to one of **that customer’s** addresses.',
        'An order has one or more lines. Each line records the price **at the time of the order**, even if the product’s price changes later.',
        'We must be able to say what any product cost on any past date.',
        'An order must never take more stock than there is, even when two customers buy the last item at the same moment.',
        'An order moves through Placed → Shipped, or Placed → Cancelled; a cancelled order returns its stock.',
        'The web application may only place, cancel and look up orders through procedures, never touch tables directly.'
      ] },
      { type: 'h2', text: 'Tables, keys and constraints' },
      { type: 'p', text: 'Turn each requirement into structure. Where the database can enforce a rule, let it: a rule written in a constraint holds for every program, script and person, for ever.' },
      { type: 'code', code: sql`
CREATE SCHEMA shop;
GO
CREATE TABLE shop.Customers (
    CustomerId int           IDENTITY CONSTRAINT PK_Customers PRIMARY KEY,
    FirstName  nvarchar(40)  NOT NULL,
    LastName   nvarchar(40)  NOT NULL,
    Email      nvarchar(100) NOT NULL CONSTRAINT UQ_Customers_Email UNIQUE
);

CREATE TABLE shop.Addresses (
    AddressId  int           IDENTITY CONSTRAINT PK_Addresses PRIMARY KEY,
    CustomerId int           NOT NULL CONSTRAINT FK_Addresses_Customers REFERENCES shop.Customers,
    Line1      nvarchar(100) NOT NULL,
    City       nvarchar(40)  NOT NULL,
    Postcode   varchar(10)   NOT NULL,
    IsDefault  bit           NOT NULL CONSTRAINT DF_Addresses_IsDefault DEFAULT 0,
    CONSTRAINT UQ_Addresses_Customer UNIQUE (AddressId, CustomerId)
);
CREATE UNIQUE INDEX UX_Addresses_OneDefault ON shop.Addresses (CustomerId) WHERE IsDefault = 1;

CREATE TABLE shop.Products (
    ProductId int           IDENTITY CONSTRAINT PK_Products PRIMARY KEY,
    Sku       varchar(20)   NOT NULL CONSTRAINT UQ_Products_Sku UNIQUE,
    Name      nvarchar(60)  NOT NULL,
    Price     decimal(10,2) NOT NULL CONSTRAINT CK_Products_Price CHECK (Price >= 0),
    ValidFrom datetime2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    ValidTo   datetime2 GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = shop.ProductsHistory));

CREATE TABLE shop.Stock (
    ProductId int NOT NULL CONSTRAINT PK_Stock PRIMARY KEY
                           CONSTRAINT FK_Stock_Products REFERENCES shop.Products,
    OnHand    int NOT NULL CONSTRAINT CK_Stock_OnHand CHECK (OnHand >= 0)
);

CREATE TABLE shop.Orders (
    OrderId    int          IDENTITY CONSTRAINT PK_Orders PRIMARY KEY,
    CustomerId int          NOT NULL,
    AddressId  int          NOT NULL,
    OrderedAt  datetime2(0) NOT NULL CONSTRAINT DF_Orders_OrderedAt DEFAULT SYSUTCDATETIME(),
    Status     varchar(10)  NOT NULL CONSTRAINT DF_Orders_Status DEFAULT 'Placed'
               CONSTRAINT CK_Orders_Status CHECK (Status IN ('Placed', 'Shipped', 'Cancelled')),
    CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId) REFERENCES shop.Customers (CustomerId),
    CONSTRAINT FK_Orders_CustomerAddress FOREIGN KEY (AddressId, CustomerId)
               REFERENCES shop.Addresses (AddressId, CustomerId)
);

CREATE TABLE shop.OrderLines (
    OrderId   int           NOT NULL CONSTRAINT FK_OrderLines_Orders REFERENCES shop.Orders,
    ProductId int           NOT NULL CONSTRAINT FK_OrderLines_Products REFERENCES shop.Products,
    Quantity  int           NOT NULL CONSTRAINT CK_OrderLines_Quantity CHECK (Quantity > 0),
    UnitPrice decimal(10,2) NOT NULL CONSTRAINT CK_OrderLines_UnitPrice CHECK (UnitPrice >= 0),
    CONSTRAINT PK_OrderLines PRIMARY KEY (OrderId, ProductId)
);` },
      { type: 'p', text: 'The decisions, requirement by requirement:' },
      { type: 'table', head: ['Rule', 'How the design enforces it'], rows: [
        ['Unique email', '`UQ_Customers_Email`: a second customer with the same email fails.'],
        ['At most one default address', 'A **filtered unique index** on CustomerId `WHERE IsDefault = 1`: many addresses per customer, only one marked default.'],
        ['The address belongs to the customer', '`FK_Orders_CustomerAddress` is a **two-column foreign key**: the pair (AddressId, CustomerId) must exist in Addresses. That needs the UNIQUE (AddressId, CustomerId) on Addresses to point at.'],
        ['Price at the time of the order', 'OrderLines has its own `UnitPrice`, copied when the order is placed. Changing a product’s price later does not change old orders.'],
        ['Price on any past date', 'Products is a **temporal table**. Stock is kept apart in `shop.Stock`: it changes with every order, and keeping a history version for each sale would bloat ProductsHistory.'],
        ['Never negative stock', '`CK_Stock_OnHand CHECK (OnHand >= 0)`, plus the stock check in the procedure below.'],
        ['Valid status, sensible lines', 'CHECK constraints on Status, Quantity and prices; the primary key (OrderId, ProductId) stops the same product appearing twice in one order.']
      ] },
      { type: 'note', kind: 'tip', text: 'Name every constraint (`PK_Orders`, `CK_Orders_Status`). Error messages quote the name, and a name like `CK_Stock_OnHand` tells whoever reads the log what went wrong; a generated one like `CK__Stock__OnHand__5AEE82B9` does not. Names are also identical on every server, so upgrade scripts can refer to them.' },
      { type: 'h2', text: 'Indexes for the real queries' },
      { type: 'p', text: 'Primary keys and unique constraints already have indexes. SQL Server does **not** index foreign key columns for you, and the shop will often ask “all orders for this customer, newest first” and “which orders contain this product?”:' },
      { type: 'code', code: sql`
CREATE INDEX IX_Orders_Customer ON shop.Orders (CustomerId, OrderedAt DESC) INCLUDE (Status);
CREATE INDEX IX_OrderLines_Product ON shop.OrderLines (ProductId);
CREATE INDEX IX_Addresses_Customer ON shop.Addresses (CustomerId);` },
      { type: 'p', text: 'The index on OrderLines.ProductId has a second job: when a product is deleted, SQL Server must check that no order line still refers to it, and without the index that check scans every line.' },
      { type: 'h2', text: 'Some data' },
      { type: 'p', text: 'Copy BuildMart’s customers and products into the new tables (customers without an email get a placeholder) and give four customers an address:' },
      { type: 'code', code: sql`
INSERT INTO shop.Customers (FirstName, LastName, Email)
SELECT FirstName, LastName, COALESCE(Email, LOWER(FirstName) + N'@example.org')
FROM dbo.Customers ORDER BY CustomerId;

INSERT INTO shop.Addresses (CustomerId, Line1, City, Postcode, IsDefault) VALUES
    (1, N'12 Mill Lane', N'Leeds', 'LS1 4AB', 1),
    (1, N'Unit 3, Canal Yard', N'Leeds', 'LS9 8QT', 0),
    (2, N'5 Minster Row', N'York', 'YO1 7HH', 1),
    (4, N'88 Manor Road', N'Bradford', 'BD8 9LE', 1);

INSERT INTO shop.Products (Sku, Name, Price)
SELECT CONCAT('BM-', FORMAT(ProductId, '000')), Name, Price
FROM dbo.Products ORDER BY ProductId;

INSERT INTO shop.Stock (ProductId, OnHand)
SELECT ProductId, Stock FROM dbo.Products;

SELECT COUNT(*) AS Customers,
       (SELECT COUNT(*) FROM shop.Addresses) AS Addresses,
       (SELECT COUNT(*) FROM shop.Products) AS Products
FROM shop.Customers;`, output: 'Customers  Addresses  Products\n---------  ---------  --------\n        8          4        12' },
      { type: 'p', text: 'The constraints are already earning their keep. A second default address for Asha, an address for a customer who does not exist, and a negative stock level are all refused:' },
      { type: 'code', code: sql`
INSERT INTO shop.Addresses (CustomerId, Line1, City, Postcode, IsDefault)
VALUES (1, N'1 New Street', N'Leeds', 'LS2 1AA', 1);

INSERT INTO shop.Addresses (CustomerId, Line1, City, Postcode)
VALUES (99, N'Nowhere', N'York', 'YO1 1AA');

UPDATE shop.Stock SET OnHand = -1 WHERE ProductId = 1;`, output: 'Msg 2601, Level 14, State 1, Line 1\nCannot insert duplicate key row in object \'shop.Addresses\' with unique index \'UX_Addresses_OneDefault\'. The duplicate key value is (1).\nThe statement has been terminated.\nMsg 547, Level 16, State 0, Line 4\nThe INSERT statement conflicted with the FOREIGN KEY constraint "FK_Addresses_Customers". The conflict occurred in database "BuildMart", table "shop.Customers", column \'CustomerId\'.\nThe statement has been terminated.\nMsg 547, Level 16, State 0, Line 7\nThe UPDATE statement conflicted with the CHECK constraint "CK_Stock_OnHand". The conflict occurred in database "BuildMart", table "shop.Stock", column \'OnHand\'.\nThe statement has been terminated.' },
      { type: 'h2', text: 'Placing an order' },
      { type: 'p', text: 'An order arrives with any number of lines. A **table-valued parameter** passes them all to a procedure in one call: first define a table type, then declare a parameter of that type (it must be READONLY):' },
      { type: 'code', code: sql`
CREATE TYPE shop.OrderLineList AS TABLE (
    ProductId int NOT NULL PRIMARY KEY,
    Quantity  int NOT NULL CHECK (Quantity > 0)
);
GO
CREATE OR ALTER PROCEDURE shop.PlaceOrder
    @CustomerId int,
    @AddressId  int,
    @Lines      shop.OrderLineList READONLY,
    @OrderedAt  datetime2(0) = NULL,
    @OrderId    int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM @Lines)
        THROW 50010, 'An order needs at least one line.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Take the stock first: one statement checks and subtracts, so two orders
        -- for the last item cannot both succeed.
        UPDATE s
        SET OnHand = s.OnHand - l.Quantity
        FROM shop.Stock AS s
        JOIN @Lines AS l ON l.ProductId = s.ProductId
        WHERE s.OnHand >= l.Quantity;

        IF @@ROWCOUNT <> (SELECT COUNT(*) FROM @Lines)
            THROW 50011, 'Not enough stock for at least one line.', 1;

        INSERT INTO shop.Orders (CustomerId, AddressId, OrderedAt)
        VALUES (@CustomerId, @AddressId, COALESCE(@OrderedAt, SYSUTCDATETIME()));

        SET @OrderId = SCOPE_IDENTITY();

        INSERT INTO shop.OrderLines (OrderId, ProductId, Quantity, UnitPrice)
        SELECT @OrderId, l.ProductId, l.Quantity, p.Price
        FROM @Lines AS l
        JOIN shop.Products AS p ON p.ProductId = l.ProductId;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;` },
      { type: 'ul', items: [
        '**XACT_ABORT ON and TRY…CATCH** (lesson 1): any error undoes the stock change, the order and its lines together.',
        '**The stock check is the UPDATE itself** (lesson 2). Its WHERE keeps only lines with enough stock, and @@ROWCOUNT shows whether every line qualified. If two sessions want the last drill, the second one’s UPDATE waits for the first one’s lock, then finds OnHand = 0 and changes nothing. A separate SELECT to check stock first would allow a lost update.',
        '**Lock order** (lesson 3): every order takes Stock rows first and in key order (the join reads @Lines by its primary key), which keeps deadlocks between orders unlikely.',
        '**UnitPrice comes from the database**, not from the caller, so a tampered web page cannot set its own prices.',
        '**@OrderedAt** is only there so this lesson’s orders get fixed dates; the application leaves it out and gets the current UTC time.'
      ] },
      { type: 'p', text: 'Asha orders a drill and two boxes of screws:' },
      { type: 'code', code: sql`
DECLARE @Lines shop.OrderLineList, @OrderId int;
INSERT INTO @Lines (ProductId, Quantity) VALUES (2, 1), (8, 2);

EXEC shop.PlaceOrder @CustomerId = 1, @AddressId = 1, @Lines = @Lines,
                     @OrderedAt = '2024-07-01 10:15', @OrderId = @OrderId OUTPUT;

SELECT o.OrderId, o.Status, p.Name, l.Quantity, l.UnitPrice, s.OnHand AS StockLeft
FROM shop.Orders AS o
JOIN shop.OrderLines AS l ON l.OrderId = o.OrderId
JOIN shop.Products AS p ON p.ProductId = l.ProductId
JOIN shop.Stock AS s ON s.ProductId = l.ProductId
WHERE o.OrderId = @OrderId;`, output: 'OrderId  Status  Name               Quantity  UnitPrice  StockLeft\n-------  ------  -----------------  --------  ---------  ---------\n      1  Placed  Cordless drill            1      89.00         11\n      1  Placed  Wood screws (200)         2      11.90        148' },
      { type: 'p', text: 'Now the failures. Ben orders a drill and five boxes of wall plugs, which are out of stock. Then he tries to send an order to Asha’s address:' },
      { type: 'code', code: sql`
DECLARE @Lines shop.OrderLineList, @OrderId int;
INSERT INTO @Lines (ProductId, Quantity) VALUES (2, 1), (9, 5);

EXEC shop.PlaceOrder @CustomerId = 2, @AddressId = 3, @Lines = @Lines, @OrderId = @OrderId OUTPUT;
GO
DECLARE @Lines shop.OrderLineList, @OrderId int;
INSERT INTO @Lines (ProductId, Quantity) VALUES (2, 1);

EXEC shop.PlaceOrder @CustomerId = 2, @AddressId = 1, @Lines = @Lines, @OrderId = @OrderId OUTPUT;
GO
SELECT (SELECT COUNT(*) FROM shop.Orders) AS Orders,
       (SELECT OnHand FROM shop.Stock WHERE ProductId = 2) AS DrillsInStock;`, output: 'Msg 50011, Level 16, State 1, Procedure shop.PlaceOrder, Line 27\nNot enough stock for at least one line.\nMsg 547, Level 16, State 0, Procedure shop.PlaceOrder, Line 29\nThe INSERT statement conflicted with the FOREIGN KEY constraint "FK_Orders_CustomerAddress". The conflict occurred in database "BuildMart", table "shop.Addresses".\n\nOrders  DrillsInStock\n------  -------------\n     1             11' },
      { type: 'p', text: 'Both orders were refused, and nothing was half done: still one order, and the drill that each attempt took out of stock was put back by the rollback. The second error comes from the two-column foreign key, not from any code in the procedure.' },
      { type: 'h2', text: 'Cancelling and price history' },
      { type: 'p', text: 'Cancelling must return the stock and may only happen to an order that has not shipped. The status check is part of the UPDATE, as with the stock check, so two cancels of the same order cannot both return the stock:' },
      { type: 'code', code: sql`
CREATE OR ALTER PROCEDURE shop.CancelOrder @OrderId int
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE shop.Orders SET Status = 'Cancelled'
        WHERE OrderId = @OrderId AND Status = 'Placed';

        IF @@ROWCOUNT = 0
            THROW 50020, 'Only a placed order can be cancelled.', 1;

        UPDATE s SET OnHand = s.OnHand + l.Quantity
        FROM shop.Stock AS s
        JOIN shop.OrderLines AS l ON l.ProductId = s.ProductId
        WHERE l.OrderId = @OrderId;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH;
END;
GO
DECLARE @Lines shop.OrderLineList, @OrderId int;
INSERT INTO @Lines (ProductId, Quantity) VALUES (7, 2);
EXEC shop.PlaceOrder @CustomerId = 4, @AddressId = 4, @Lines = @Lines,
                     @OrderedAt = '2024-07-02 16:40', @OrderId = @OrderId OUTPUT;

EXEC shop.CancelOrder @OrderId = @OrderId;
SELECT @OrderId AS CancelledOrder;
GO
EXEC shop.CancelOrder @OrderId = 3;                  -- the same order again
GO
SELECT OrderId, Status FROM shop.Orders ORDER BY OrderId;
SELECT OnHand AS PlywoodInStock FROM shop.Stock WHERE ProductId = 7;`, output: 'CancelledOrder\n--------------\n             3\n\nMsg 50020, Level 16, State 1, Procedure shop.CancelOrder, Line 13\nOnly a placed order can be cancelled.\n\nOrderId  Status\n-------  ---------\n      1  Placed\n      3  Cancelled\n\nPlywoodInStock\n--------------\n            80' },
      { type: 'p', text: 'The new order is number 3, not 2. The failed attempt that reached the INSERT used up identity value 2, and a rollback does not give identity values back. Gaps in order numbers are normal. The second cancel is refused, so the plywood went back into stock only once. Each call that can fail is in a batch of its own, because THROW ends the batch, as you saw in the error-handling lesson.' },
      { type: 'p', text: 'The drill’s price now goes up. Asha’s order keeps the price she paid, and the temporal table still knows the old price:' },
      { type: 'code', code: sql`
DECLARE @BeforeRise datetime2 = SYSUTCDATETIME();
WAITFOR DELAY '00:00:00.100';
UPDATE shop.Products SET Price = 94.50 WHERE ProductId = 2;

SELECT p.Name, p.Price AS PriceNow,
       old.Price AS PriceBefore,
       (SELECT l.UnitPrice FROM shop.OrderLines AS l
        WHERE l.OrderId = 1 AND l.ProductId = 2) AS PaidOnOrder1
FROM shop.Products AS p
JOIN shop.Products FOR SYSTEM_TIME AS OF @BeforeRise AS old ON old.ProductId = p.ProductId
WHERE p.ProductId = 2;`, output: 'Name            PriceNow  PriceBefore  PaidOnOrder1\n--------------  --------  -----------  ------------\nCordless drill     94.50        89.00         89.00' },
      { type: 'h2', text: 'Reporting' },
      { type: 'p', text: 'A view gives report writers order totals without repeating the joins and the rule that cancelled orders do not count as sales:' },
      { type: 'code', code: sql`
CREATE OR ALTER VIEW shop.OrderTotals
AS
SELECT o.OrderId, o.CustomerId, o.OrderedAt, o.Status,
       COUNT(*) AS Lines,
       SUM(l.Quantity * l.UnitPrice) AS Total
FROM shop.Orders AS o
JOIN shop.OrderLines AS l ON l.OrderId = o.OrderId
GROUP BY o.OrderId, o.CustomerId, o.OrderedAt, o.Status;
GO
DECLARE @Lines shop.OrderLineList, @OrderId int;
INSERT INTO @Lines (ProductId, Quantity) VALUES (6, 40), (4, 10);
EXEC shop.PlaceOrder @CustomerId = 4, @AddressId = 4, @Lines = @Lines,
                     @OrderedAt = '2024-08-14 09:05', @OrderId = @OrderId OUTPUT;

SELECT c.FirstName + N' ' + c.LastName AS Customer,
       COUNT(*) AS Orders, SUM(t.Total) AS Spent
FROM shop.OrderTotals AS t
JOIN shop.Customers AS c ON c.CustomerId = t.CustomerId
WHERE t.Status <> 'Cancelled'
GROUP BY c.CustomerId, c.FirstName, c.LastName
ORDER BY Spent DESC;`, output: 'Customer    Orders   Spent\n----------  ------  ------\nDev Singh        1  344.00\nAsha Patel       1  112.80' },
      { type: 'h2', text: 'The application’s account' },
      { type: 'p', text: 'Last, the security requirement (lesson 5). The web application’s user gets EXECUTE on the shop schema, which covers its procedures, and nothing else:' },
      { type: 'code', code: sql`
CREATE USER ShopWeb WITHOUT LOGIN;
GRANT EXECUTE ON SCHEMA::shop TO ShopWeb;

EXECUTE AS USER = 'ShopWeb';

DECLARE @Lines shop.OrderLineList, @OrderId int;
INSERT INTO @Lines (ProductId, Quantity) VALUES (1, 1);
EXEC shop.PlaceOrder @CustomerId = 2, @AddressId = 3, @Lines = @Lines,
                     @OrderedAt = '2024-08-20 12:00', @OrderId = @OrderId OUTPUT;
SELECT @OrderId AS NewOrderId;

SELECT COUNT(*) FROM shop.Customers;
DELETE FROM shop.Orders;

REVERT;`, output: 'NewOrderId\n----------\n         5\n\nMsg 229, Level 14, State 5, Line 12\nThe SELECT permission was denied on the object \'Customers\', database \'BuildMart\', schema \'shop\'.\nMsg 229, Level 14, State 5, Line 13\nThe DELETE permission was denied on the object \'Orders\', database \'BuildMart\', schema \'shop\'.' },
      { type: 'p', text: 'ShopWeb placed an order (ownership chaining lets the procedure use tables ShopWeb cannot see) and could even use the table type, because EXECUTE on the schema includes its types. Reading customers or deleting orders directly is refused. An injection bug in the web site could do no more than call these procedures.' },
      { type: 'widget', name: 'schema-map' },
      { type: 'h2', text: 'Where each idea came from' },
      { type: 'table', head: ['Part of the design', 'Course module'], rows: [
        ['Tables, data types, keys, CHECK, UNIQUE, DEFAULT', 'Creating and changing data'],
        ['Two-column foreign key, normalised tables', 'Joins and relationships'],
        ['Totals per order and per customer', 'Grouping and aggregation'],
        ['Table-valued parameter, procedures, views, TRY…CATCH', 'Programmability'],
        ['Indexes on foreign keys, covering index for the customer’s orders', 'Indexes and performance'],
        ['Transaction, XACT_ABORT, atomic stock check, lock order, temporal history, least-privilege user', 'This module']
      ] },
      { type: 'quiz', question: 'Why does PlaceOrder subtract stock with UPDATE … WHERE OnHand >= Quantity instead of first SELECTing the stock and then updating it?', options: ['UPDATE is faster than SELECT', 'Between a separate SELECT and UPDATE another order could take the same stock; one statement checks and changes atomically', 'SELECT cannot read a table-valued parameter', 'Temporal tables do not allow SELECT inside a transaction'], answer: 1, explain: 'A read followed by a write allows lost updates (lesson 2). The single UPDATE holds the row lock while it checks and subtracts, so a second order for the last item waits and then finds no stock.' },
      { type: 'quiz', question: 'What stops an order being sent to another customer’s address?', options: ['A trigger on Orders', 'The CHECK on Status', 'The foreign key on (AddressId, CustomerId) referencing Addresses (AddressId, CustomerId)', 'The filtered unique index on IsDefault'], answer: 2, explain: 'The pair must exist in Addresses, so the address must belong to that very customer. A foreign key on AddressId alone would accept any customer’s address.' },
      { type: 'exercise', task: 'Add the last status change: a procedure shop.ShipOrder @OrderId that moves a Placed order to Shipped and raises error 50030 \'Only a placed order can be shipped.\' otherwise. Ship Asha’s order 1, then try to ship it again and to cancel it, and show order 1’s status.', hint: 'Like CancelOrder, put the status check in the UPDATE’s WHERE clause and test @@ROWCOUNT. No stock changes, so a transaction is not needed for one statement.', solution: sql`
CREATE OR ALTER PROCEDURE shop.ShipOrder @OrderId int
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE shop.Orders SET Status = 'Shipped'
    WHERE OrderId = @OrderId AND Status = 'Placed';

    IF @@ROWCOUNT = 0
        THROW 50030, 'Only a placed order can be shipped.', 1;
END;
GO
EXEC shop.ShipOrder @OrderId = 1;
GO
EXEC shop.ShipOrder @OrderId = 1;
GO
EXEC shop.CancelOrder @OrderId = 1;
GO
SELECT OrderId, Status FROM shop.Orders WHERE OrderId = 1;`, output: 'Msg 50030, Level 16, State 1, Procedure shop.ShipOrder, Line 10\nOnly a placed order can be shipped.\nMsg 50020, Level 16, State 1, Procedure shop.CancelOrder, Line 13\nOnly a placed order can be cancelled.\n\nOrderId  Status\n-------  -------\n      1  Shipped' }
    ],
    keyPoints: [
      'Start from requirements, and enforce every rule the database can enforce with keys and constraints.',
      'A two-column foreign key can tie a row to a parent that belongs to the same customer.',
      'Filtered unique indexes enforce “at most one” rules, such as one default address.',
      'Copy prices into order lines; keep price history in a temporal table; keep fast-changing data such as stock out of it.',
      'Index foreign key columns and the queries the application really runs.',
      'Table-valued parameters pass a whole order in one call.',
      'Check and change stock in one UPDATE inside a transaction with XACT_ABORT, so concurrent orders cannot oversell.',
      'Give the application EXECUTE on its procedures and nothing more.'
    ]
  }
];
