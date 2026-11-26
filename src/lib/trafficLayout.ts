/**
 * Left-to-right layered layout of the Traffic Map, with dagre. Workloads are drawn
 * inside a box for their namespace; other nodes stay out.
 *
 * Kept free of Headlamp and React imports so it can be tested without a cluster.
 */
import dagre from '@dagrejs/dagre';
import { TrafficGraph } from './trafficGraph';

// Node size of Headlamp's Map, a little taller for names on two lines.
export const NODE_W = 220;
export const NODE_H = 80;
/** Margin of a namespace box around its workloads, and the room for its title. */
export const BOX_PAD = 16;
export const BOX_TITLE = 44;

export const groupId = (namespace: string) => `group:${namespace}`;

export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  w: number;
  h: number;
}

export interface Layout {
  /** Top-left corner of each node. */
  nodes: Map<string, Point>;
  /** Namespace boxes, by groupId. */
  groups: Map<string, Box>;
  /** The route dagre found for each edge, around the nodes in its way. */
  edges: Map<string, Point[]>;
}

export function layoutGraph(graph: TrafficGraph): Layout {
  // nodesep 70 leaves 45 px above the workloads of a namespace, room for the box title.
  const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  g.setGraph({ rankdir: 'LR', nodesep: 70, ranksep: 160, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of graph.nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
    if (n.namespace) {
      if (!g.hasNode(groupId(n.namespace))) g.setNode(groupId(n.namespace), {});
      g.setParent(n.id, groupId(n.namespace));
    }
  }
  for (const e of graph.edges) g.setEdge(e.source, e.target, {}, e.id);
  dagre.layout(g);

  const nodes = new Map<string, Point>();
  for (const n of graph.nodes) {
    const { x, y } = g.node(n.id);
    nodes.set(n.id, { x: x - NODE_W / 2, y: y - NODE_H / 2 });
  }

  const edges = new Map<string, Point[]>();
  for (const e of graph.edges) {
    const points = g.edge({ v: e.source, w: e.target, name: e.id })?.points ?? [];
    edges.set(
      e.id,
      points.map(({ x, y }) => ({ x, y }))
    );
  }

  // A box hugs its workloads, cut to the box dagre made for the namespace: dagre's
  // boxes never overlap, so these do not either.
  const groups = new Map<string, Box>();
  for (const ns of new Set(graph.nodes.map(n => n.namespace).filter(Boolean) as string[])) {
    const members = graph.nodes.filter(n => n.namespace === ns).map(n => nodes.get(n.id)!);
    const d = g.node(groupId(ns));
    const left = Math.max(Math.min(...members.map(p => p.x)) - BOX_PAD, d.x - d.width / 2);
    const top = Math.max(Math.min(...members.map(p => p.y)) - BOX_TITLE, d.y - d.height / 2);
    const right = Math.min(
      Math.max(...members.map(p => p.x + NODE_W)) + BOX_PAD,
      d.x + d.width / 2
    );
    const bottom = Math.min(
      Math.max(...members.map(p => p.y + NODE_H)) + BOX_PAD,
      d.y + d.height / 2
    );
    groups.set(groupId(ns), { x: left, y: top, w: right - left, h: bottom - top });
  }
  return { nodes, groups, edges };
}

/** How far an edge runs straight out of a node before it bends. */
const LEAD = 48;

/**
 * An edge from the right side of its source to the left side of its target, through
 * the route dagre found. Its first and last points are dropped (they sit on borders
 * dagre picked), and so are the ones too close to either end, which would bend the edge
 * before it leaves the node. Drawn as a uniform B-spline (d3's curveBasis), which never
 * overshoots, so there are no bumps where the route turns. `mid` places the label.
 */
export function edgePath(source: Point, target: Point, via: Point[] = []) {
  const forward = target.x > source.x;
  const inner = via
    .slice(1, -1)
    .filter(p => !forward || (p.x > source.x + 2 * LEAD && p.x < target.x - 2 * LEAD));
  const points = [
    source,
    { x: source.x + LEAD, y: source.y },
    ...inner,
    { x: target.x - LEAD, y: target.y },
    target,
  ];
  const f = (n: number) => Math.round(n * 10) / 10;
  let path = `M ${f(source.x)},${f(source.y)}`;
  // curveBasis: each new point adds a cubic Bézier between the two before it.
  let [x0, y0, x1, y1] = [NaN, NaN, source.x, source.y];
  const bezier = (x: number, y: number) => {
    path +=
      ` C ${f((2 * x0 + x1) / 3)},${f((2 * y0 + y1) / 3)}` +
      ` ${f((x0 + 2 * x1) / 3)},${f((y0 + 2 * y1) / 3)}` +
      ` ${f((x0 + 4 * x1 + x) / 6)},${f((y0 + 4 * y1 + y) / 6)}`;
  };
  points.slice(1).forEach(({ x, y }, i) => {
    if (i === 1) path += ` L ${f((5 * x0 + x1) / 6)},${f((5 * y0 + y1) / 6)}`;
    if (i >= 1) bezier(x, y);
    [x0, y0, x1, y1] = [x1, y1, x, y];
  });
  bezier(x1, y1);
  path += ` L ${f(x1)},${f(y1)}`;
  const mid = inner.length
    ? inner[Math.floor((inner.length - 1) / 2)]
    : { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  return { path, mid };
}
