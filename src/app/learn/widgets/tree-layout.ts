/** Small layout helpers that turn a tree into SVG coordinates for the tree widgets. */

export interface LNode { id: string; label: string; x: number; y: number; depth: number }
export interface LEdge { id: string; from: string; to: string; x1: number; y1: number; x2: number; y2: number }
export interface Layout { nodes: LNode[]; edges: LEdge[]; width: number; height: number }

export interface GNode { id: string; label: string; children: GNode[] }

/** General tree: leaves take consecutive slots; a parent sits centred over its children. */
export function layoutGeneral(root: GNode, dx = 48, dy = 54, pad = 24): Layout {
  const nodes: LNode[] = [], edges: LEdge[] = [];
  let slot = 0, maxDepth = 0;
  const place = (n: GNode, depth: number): LNode => {
    maxDepth = Math.max(maxDepth, depth);
    const kids = n.children.map(c => place(c, depth + 1));
    const x = kids.length ? (kids[0].x + kids[kids.length - 1].x) / 2 : pad + slot++ * dx;
    const me: LNode = { id: n.id, label: n.label, x, y: pad + depth * dy, depth };
    nodes.push(me);
    for (const k of kids) edges.push({ id: `${n.id}>${k.id}`, from: n.id, to: k.id, x1: x, y1: me.y, x2: k.x, y2: k.y });
    return me;
  };
  place(root, 0);
  return { nodes, edges, width: pad * 2 + Math.max(0, slot - 1) * dx, height: pad * 2 + maxDepth * dy };
}

export interface BNode { key: number; left: BNode | null; right: BNode | null }

/** Binary tree: x is the in-order position, so a left child is always drawn left of its parent. */
export function layoutBinary(root: BNode | null, dx = 40, dy = 52, pad = 22): Layout {
  const nodes: LNode[] = [], edges: LEdge[] = [];
  let slot = 0, maxDepth = 0;
  const place = (n: BNode | null, depth: number): LNode | null => {
    if (!n) return null;
    maxDepth = Math.max(maxDepth, depth);
    const l = place(n.left, depth + 1);
    const me: LNode = { id: String(n.key), label: String(n.key), x: pad + slot++ * dx, y: pad + depth * dy, depth };
    const r = place(n.right, depth + 1);
    nodes.push(me);
    for (const k of [l, r]) if (k) edges.push({ id: `${me.id}>${k.id}`, from: me.id, to: k.id, x1: me.x, y1: me.y, x2: k.x, y2: k.y });
    return me;
  };
  place(root, 0);
  return { nodes, edges, width: pad * 2 + Math.max(0, slot - 1) * dx, height: pad * 2 + maxDepth * dy };
}

/** Height in edges (a single node has height 0, an empty tree −1). */
export function heightOf(n: BNode | null): number {
  return n ? 1 + Math.max(heightOf(n.left), heightOf(n.right)) : -1;
}
