/** The BuildMart sample database, as used in every SQL lesson (same rows as the setup script). */
export type Cell = string | number | null;

export interface Product { ProductId: number; Name: string; CategoryId: number; Price: number; Stock: number; Unit: string; AddedOn: string }
export interface Customer { CustomerId: number; FirstName: string; LastName: string; City: string | null; Email: string | null; Phone: string | null; JoinedOn: string }

export const CATEGORIES: { CategoryId: number; Name: string }[] = [
  { CategoryId: 1, Name: 'Tools' }, { CategoryId: 2, Name: 'Building' }, { CategoryId: 3, Name: 'Timber' }, { CategoryId: 4, Name: 'Fixings' },
  { CategoryId: 5, Name: 'Paint' }, { CategoryId: 6, Name: 'Safety' }, { CategoryId: 7, Name: 'Plumbing' }
];

const p = (ProductId: number, Name: string, CategoryId: number, Price: number, Stock: number, Unit: string, AddedOn: string): Product =>
  ({ ProductId, Name, CategoryId, Price, Stock, Unit, AddedOn });

export const PRODUCTS: Product[] = [
  p(1, 'Claw hammer', 1, 18.5, 40, 'each', '2023-01-15'),
  p(2, 'Cordless drill', 1, 89, 12, 'each', '2023-02-01'),
  p(3, 'Tape measure 8 m', 1, 9.75, 65, 'each', '2023-01-15'),
  p(4, 'Cement 25 kg', 2, 7.2, 300, 'bag', '2023-03-10'),
  p(5, 'Sand 25 kg', 2, 4.1, 220, 'bag', '2023-03-10'),
  p(6, 'Timber 2x4 2.4 m', 3, 6.8, 500, 'each', '2023-04-05'),
  p(7, 'Plywood sheet 18 mm', 3, 42, 80, 'sheet', '2023-04-05'),
  p(8, 'Wood screws (200)', 4, 11.9, 150, 'box', '2023-05-20'),
  p(9, 'Wall plugs (100)', 4, 4.5, 0, 'box', '2023-05-20'),
  p(10, 'Masonry paint 10 L', 5, 54, 25, 'tin', '2023-06-12'),
  p(11, 'Paint roller set', 5, 12.5, 30, 'each', '2023-06-12'),
  p(12, 'Safety goggles', 6, 6.8, 0, 'each', '2023-07-01')
];

const c = (CustomerId: number, FirstName: string, LastName: string, City: string | null, Email: string | null, Phone: string | null, JoinedOn: string): Customer =>
  ({ CustomerId, FirstName, LastName, City, Email, Phone, JoinedOn });

export const CUSTOMERS: Customer[] = [
  c(1, 'Asha', 'Patel', 'Leeds', 'asha@example.com', '0113 496 0001', '2023-03-02'),
  c(2, 'Ben', 'Carter', 'York', null, '01904 555 010', '2023-05-19'),
  c(3, 'Chloe', 'Evans', 'Leeds', 'chloe@example.com', null, '2023-06-07'),
  c(4, 'Dev', 'Singh', 'Bradford', 'dev@example.com', '01274 555 220', '2023-08-23'),
  c(5, 'Ella', 'Brown', null, 'ella@example.com', null, '2023-09-14'),
  c(6, 'Farid', 'Khan', 'York', 'farid@example.com', '01904 555 777', '2023-11-30'),
  c(7, 'Grace', 'Lee', 'Leeds', null, null, '2024-01-08'),
  c(8, 'Zoë', 'Müller', 'Harrogate', 'zoe@example.com', '01423 555 123', '2024-02-15')
];

export interface Order { OrderId: number; CustomerId: number; OrderDate: string; Status: string }
export interface OrderItem { OrderId: number; ProductId: number; Quantity: number; UnitPrice: number }

const o = (OrderId: number, CustomerId: number, OrderDate: string, Status: string): Order => ({ OrderId, CustomerId, OrderDate, Status });
export const ORDERS: Order[] = [
  o(1, 1, '2024-02-03', 'Shipped'), o(2, 2, '2024-02-10', 'Shipped'), o(3, 1, '2024-03-01', 'Shipped'),
  o(4, 4, '2024-03-15', 'Shipped'), o(5, 6, '2024-04-02', 'Shipped'), o(6, 3, '2024-04-20', 'Cancelled'),
  o(7, 4, '2024-05-05', 'Shipped'), o(8, 8, '2024-05-18', 'Pending'), o(9, 2, '2024-06-01', 'Pending'),
  o(10, 6, '2024-06-12', 'Shipped')
];

const i = (OrderId: number, ProductId: number, Quantity: number, UnitPrice: number): OrderItem => ({ OrderId, ProductId, Quantity, UnitPrice });
export const ORDER_ITEMS: OrderItem[] = [
  i(1, 1, 1, 18.5), i(1, 3, 2, 9.75), i(2, 4, 10, 7.2), i(2, 5, 10, 4.1), i(3, 2, 1, 89), i(3, 8, 2, 11.9),
  i(4, 6, 40, 6.8), i(4, 7, 6, 42), i(5, 10, 2, 54), i(5, 11, 1, 12.5), i(6, 12, 2, 6.8),
  i(7, 4, 20, 7), i(7, 8, 5, 11.9), i(8, 7, 2, 42), i(8, 1, 1, 18.5), i(9, 9, 4, 4.5), i(10, 3, 1, 9.75), i(10, 6, 12, 6.8)
];

/** decimal(10,2) as SQL Server prints it. */
export const money = (v: number) => v.toFixed(2);

/** LIKE with % and _ under a case-insensitive collation ([ranges] are kept as regex classes). */
export function likeToRegex(pattern: string): RegExp {
  let r = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '%') r += '.*';
    else if (ch === '_') r += '.';
    else if (ch === '[') {
      const end = pattern.indexOf(']', i + 1);
      if (end > i) { r += `[${pattern.slice(i + 1, end).replace(/\\/g, '\\\\')}]`; i = end; }
      else r += '\\[';
    } else r += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${r}$`, 'is');
}
