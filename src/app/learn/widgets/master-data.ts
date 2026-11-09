// Results measured on SQL Server 2022 for the Master-level SQL lessons (two-session runs in separate connections).

/** Isolation levels × the three read problems. Reader = Session 1, writer = Session 2 (see isolation-lab). */
export type IsoLevel = 'ru' | 'rc' | 'rr' | 'ser' | 'rcsi' | 'snap';
export type IsoProblem = 'dirty' | 'nonrep' | 'phantom';
export interface IsoRun {
  /** First read by the reader (non-repeatable and phantom only). */
  first?: string;
  /** The writer had to wait for the reader’s locks. */
  writerWaits: boolean;
  /** The reader’s (second) read had to wait for the writer. */
  readerWaits: boolean;
  /** What the reader’s (second) read returned. */
  read: string;
}
export const ISO: Record<IsoLevel, Record<IsoProblem, IsoRun>> = {
  ru:   { dirty: { writerWaits: false, readerWaits: false, read: '9.99' }, nonrep: { first: '12', writerWaits: false, readerWaits: false, read: '2' }, phantom: { first: '3', writerWaits: false, readerWaits: false, read: '4' } },
  rc:   { dirty: { writerWaits: false, readerWaits: true, read: '89.00' }, nonrep: { first: '12', writerWaits: false, readerWaits: false, read: '2' }, phantom: { first: '3', writerWaits: false, readerWaits: false, read: '4' } },
  rr:   { dirty: { writerWaits: false, readerWaits: true, read: '89.00' }, nonrep: { first: '12', writerWaits: true, readerWaits: false, read: '12' }, phantom: { first: '3', writerWaits: false, readerWaits: false, read: '4' } },
  ser:  { dirty: { writerWaits: false, readerWaits: true, read: '89.00' }, nonrep: { first: '12', writerWaits: true, readerWaits: false, read: '12' }, phantom: { first: '3', writerWaits: true, readerWaits: false, read: '3' } },
  rcsi: { dirty: { writerWaits: false, readerWaits: false, read: '89.00' }, nonrep: { first: '12', writerWaits: false, readerWaits: false, read: '2' }, phantom: { first: '3', writerWaits: false, readerWaits: false, read: '4' } },
  snap: { dirty: { writerWaits: false, readerWaits: false, read: '89.00' }, nonrep: { first: '12', writerWaits: false, readerWaits: false, read: '12' }, phantom: { first: '3', writerWaits: false, readerWaits: false, read: '3' } }
};

/** dbo.FindCustomers built by concatenation (bad) and with sp_executesql parameters (good), for each input. */
export interface InjRun { input: string; bad: string; good: string; pennies: number }
const NONE = 'CustomerId  FirstName  LastName  City\n----------  ---------  --------  ----';
const ALL8 = 'CustomerId  FirstName  LastName  City\n----------  ---------  --------  ---------\n         1  Asha       Patel     Leeds\n         2  Ben        Carter    York\n         3  Chloe      Evans     Leeds\n         4  Dev        Singh     Bradford\n         5  Ella       Brown     NULL\n         6  Farid      Khan      York\n         7  Grace      Lee       Leeds\n         8  Zoë        Müller    Harrogate';
export const INJ: InjRun[] = [
  { input: 'Patel', pennies: 0,
    bad: 'CustomerId  FirstName  LastName  City\n----------  ---------  --------  -----\n         1  Asha       Patel     Leeds',
    good: 'CustomerId  FirstName  LastName  City\n----------  ---------  --------  -----\n         1  Asha       Patel     Leeds' },
  { input: 'O\'Brien', pennies: 0,
    bad: 'Msg 102, Level 15, State 1, Line 1\nIncorrect syntax near \'Brien\'.\nMsg 105, Level 15, State 1, Line 1\nUnclosed quotation mark after the character string \'\'.',
    good: NONE },
  { input: 'x\' OR 1 = 1 --', pennies: 0, bad: ALL8, good: NONE },
  { input: 'x\' UNION SELECT CustomerId, Email, Phone, NULL FROM dbo.Customers --', pennies: 0,
    bad: 'CustomerId  FirstName          LastName       City\n----------  -----------------  -------------  ----\n         1  asha@example.com   0113 496 0001  NULL\n         2  NULL               01904 555 010  NULL\n         3  chloe@example.com  NULL           NULL\n         4  dev@example.com    01274 555 220  NULL\n         5  ella@example.com   NULL           NULL\n         6  farid@example.com  01904 555 777  NULL\n         7  NULL               NULL           NULL\n         8  zoe@example.com    01423 555 123  NULL',
    good: NONE },
  { input: 'x\'; UPDATE dbo.Products SET Price = 0.01; --', pennies: 12, bad: NONE, good: NONE }
];
