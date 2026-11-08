/** Shared sample graph and drawing helpers for the graph widgets. */

export interface GPoint { id: string; x: number; y: number; name: string }
export interface GEdge { a: string; b: string; w: number }

/** Seven places on a building site and the roads between them (weights = minutes to drive). */
export const SITE_NODES: GPoint[] = [
  { id: 'A', x: 40, y: 50, name: 'Gate' },
  { id: 'B', x: 155, y: 30, name: 'Store' },
  { id: 'C', x: 290, y: 45, name: 'Crane' },
  { id: 'D', x: 40, y: 185, name: 'Office' },
  { id: 'E', x: 165, y: 120, name: 'Yard' },
  { id: 'F', x: 300, y: 160, name: 'Batching' },
  { id: 'G', x: 175, y: 215, name: 'Workshop' }
];

export const SITE_EDGES: GEdge[] = [
  { a: 'A', b: 'B', w: 4 },
  { a: 'A', b: 'D', w: 2 },
  { a: 'B', b: 'E', w: 3 },
  { a: 'B', b: 'C', w: 6 },
  { a: 'D', b: 'E', w: 5 },
  { a: 'C', b: 'E', w: 2 },
  { a: 'C', b: 'F', w: 3 },
  { a: 'E', b: 'G', w: 4 },
  { a: 'D', b: 'G', w: 7 },
  { a: 'F', b: 'G', w: 1 },
  { a: 'E', b: 'F', w: 6 }
];

export const edgeKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Undirected adjacency lists, neighbours in alphabetical order. */
export function adjacency(nodes: GPoint[], edges: GEdge[]) {
  const adj = new Map<string, { to: string; w: number }[]>(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    adj.get(e.a)!.push({ to: e.b, w: e.w });
    adj.get(e.b)!.push({ to: e.a, w: e.w });
  }
  for (const list of adj.values()) list.sort((x, y) => x.to.localeCompare(y.to));
  return adj;
}

/** A line between two node centres, shortened by r at each end (so arrows stop at the circle). */
export function segment(p: { x: number; y: number }, q: { x: number; y: number }, r = 15) {
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  return { x1: p.x + ux * r, y1: p.y + uy * r, x2: q.x - ux * r, y2: q.y - uy * r, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 };
}
