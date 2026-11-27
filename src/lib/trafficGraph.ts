/**
 * Flows -> the nodes and edges of the Traffic Map, before
 * layout. Two levels, like Headlamp's Map: the namespaces, or the workloads of the
 * selected namespaces, with every other peer folded into its namespace.
 *
 * Options keep busy clusters readable: grouping by workload or by app, folding the
 * peers of a node that has many, and hiding small flows. The graph counts the flows
 * these hide, so the map can say so.
 *
 * Kept free of Headlamp and React imports so it can be tested without a cluster.
 */
import { Flow, isOutside, OUTSIDE_IN, Security } from './trafficParse';

export type EdgeKind = Security;

/**
 * namespace: peers outside the selected namespaces fold into their namespace;
 * workload: they stay workloads; app: workloads are replaced by their `app` label.
 */
export type GroupBy = 'namespace' | 'workload' | 'app';

export interface TrafficNode {
  id: string;
  kind: 'namespace' | 'workload' | 'outside-in' | 'outside-out' | 'fold';
  name: string;
  /** The namespace of a workload, drawn as a box around it. */
  namespace?: string;
  /** Workloads folded into a namespace node, or peers folded into a fold node. */
  count?: number;
  /** A workload node that stands for an app (`ns/app`). */
  app?: boolean;
}

export interface TrafficEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  /** Bytes per second. */
  rate: number;
}

/** Flows not drawn on their own: merged into a fold node, or hidden as small. */
export interface Hidden {
  folded: number;
  small: number;
}

export interface TrafficGraph {
  nodes: TrafficNode[];
  edges: TrafficEdge[];
  hidden: Hidden;
}

export interface GraphView {
  /** Selected namespaces; none: the whole cluster. */
  namespaces: Set<string>;
  kinds: Set<EdgeKind>;
  groupBy?: GroupBy;
  /** Fold the peers of a node, on one side, when it has more than this many; 0: off. */
  foldOver?: number;
  /** Fold nodes the viewer opened, by foldId. */
  unfolded?: Set<string>;
  /** Hide an edge under this share of the traffic of both its ends, e.g. 0.01; 0: off. */
  minShare?: number;
}

export const FOLD_OVER = 10;
export const MIN_SHARE = 0.01;
export const foldId = (node: string, side: 'in' | 'out') => `fold:${side}:${node}`;

const namespaceOf = (peer: string) => peer.split('/')[0];

/** What the map reads: namespace pairs, or workload pairs (of the selection, or all). */
export function levelOf(view: GraphView): 'namespace' | 'workload' {
  return !view.namespaces.size && (view.groupBy ?? 'namespace') === 'namespace'
    ? 'namespace'
    : 'workload';
}

/** A peer as drawn: grouped by namespace, peers outside the selection fold into it. */
export function shownAs(peer: string, view: GraphView): string {
  if (isOutside(peer) || (view.groupBy ?? 'namespace') !== 'namespace') return peer;
  return view.namespaces.has(namespaceOf(peer)) ? peer : namespaceOf(peer);
}

/** Grouped by app, `ns/workload` becomes `ns/app` when the workload has the label. */
function inApps<
  T extends { source: string; target: string; sourceApp?: string; targetApp?: string }
>(rows: T[], view: GraphView): T[] {
  if (view.groupBy !== 'app') return rows;
  const app = (peer: string, label?: string) =>
    label && peer.includes('/') ? `${namespaceOf(peer)}/${label}` : peer;
  return rows.map(r => ({
    ...r,
    source: app(r.source, r.sourceApp),
    target: app(r.target, r.targetApp),
  }));
}

function nodeOf(id: string, view: GraphView): TrafficNode {
  if (isOutside(id)) {
    return { id, kind: id === OUTSIDE_IN ? 'outside-in' : 'outside-out', name: 'Outside the mesh' };
  }
  if (!id.includes('/')) return { id, kind: 'namespace', name: id };
  const [namespace, name] = id.split('/');
  return { id, kind: 'workload', name, namespace, ...(view.groupBy === 'app' && { app: true }) };
}

export function buildGraph(flows: Flow[], view: GraphView): TrafficGraph {
  const nodes = new Map<string, TrafficNode>();
  const folded = new Map<string, Set<string>>();
  const edges = new Map<string, TrafficEdge>();

  const add = (source: string, target: string, kind: EdgeKind, rate: number) => {
    if (!view.kinds.has(kind)) return;
    const [s, t] = [shownAs(source, view), shownAs(target, view)];
    // Traffic inside one node is not drawn: a loop says nothing.
    if (s === t) return;
    for (const [peer, id] of [
      [source, s],
      [target, t],
    ]) {
      if (!nodes.has(id)) nodes.set(id, nodeOf(id, view));
      if (peer !== id) folded.set(id, (folded.get(id) ?? new Set()).add(peer));
    }
    const id = `${s}>${t}:${kind}`;
    const e = edges.get(id) ?? { id, source: s, target: t, kind, rate: 0 };
    e.rate += rate;
    edges.set(id, e);
  };

  for (const f of inApps(flows, view)) add(f.source, f.target, f.security, f.bytesPerSec);
  for (const [id, peers] of folded) nodes.get(id)!.count = peers.size;
  const hidden: Hidden = {
    small: view.minShare ? hideSmallShares(edges, view.minShare) : 0,
    folded: view.foldOver ? foldPeers(nodes, edges, view) : 0,
  };

  // Nodes left without edges by the options above are dropped with them.
  const linked = new Set([...edges.values()].flatMap(e => [e.source, e.target]));
  return {
    nodes: [...nodes.values()].filter(n => linked.has(n.id)),
    edges: [...edges.values()],
    hidden,
  };
}

/**
 * Drop the edges small for both their ends: under `share` of what the source sends
 * and of what the target receives. A small flow to a quiet node is most of its
 * traffic, so it stays. Returns how many were dropped.
 */
function hideSmallShares(edges: Map<string, TrafficEdge>, share: number): number {
  const sent = new Map<string, number>();
  const received = new Map<string, number>();
  for (const e of edges.values()) {
    sent.set(e.source, (sent.get(e.source) ?? 0) + e.rate);
    received.set(e.target, (received.get(e.target) ?? 0) + e.rate);
  }
  let dropped = 0;
  for (const [id, e] of edges) {
    if (e.rate < share * sent.get(e.source)! && e.rate < share * received.get(e.target)!) {
      edges.delete(id);
      dropped++;
    }
  }
  return dropped;
}

/**
 * Fold the peers of busy nodes into one node per side, busiest first. Workloads of
 * the selected namespaces are never folded, so their own map stays readable. Returns
 * how many edges were merged into the edges of fold nodes.
 */
function foldPeers(
  nodes: Map<string, TrafficNode>,
  edges: Map<string, TrafficEdge>,
  view: GraphView
): number {
  const foldable = (id: string) => {
    const n = nodes.get(id)!;
    return n.kind !== 'fold' && !(n.kind === 'workload' && view.namespaces.has(n.namespace!));
  };
  /** The edges of `node` on one side, to peers that may fold, and those peers. */
  const sideOf = (node: string, side: 'in' | 'out') => {
    const own = [...edges.values()].filter(e =>
      side === 'out'
        ? e.source === node && foldable(e.target)
        : e.target === node && foldable(e.source)
    );
    return { own, peers: new Set(own.map(e => (side === 'out' ? e.target : e.source))) };
  };
  const sides = [...nodes.keys()]
    .flatMap(node => (['in', 'out'] as const).map(side => ({ node, side })))
    .map(s => ({ ...s, size: sideOf(s.node, s.side).peers.size }))
    .sort((a, b) => b.size - a.size || a.node.localeCompare(b.node));

  let merged = 0;
  for (const { node, side } of sides) {
    // Recomputed: peers already moved into another fold node no longer count.
    const { own, peers } = sideOf(node, side);
    const id = foldId(node, side);
    if (peers.size <= view.foldOver! || view.unfolded?.has(id)) continue;
    for (const e of own) {
      edges.delete(e.id);
      const [s, t] = side === 'out' ? [node, id] : [id, node];
      const eid = `${s}>${t}:${e.kind}`;
      const f = edges.get(eid) ?? { id: eid, source: s, target: t, kind: e.kind, rate: 0 };
      f.rate += e.rate;
      edges.set(eid, f);
    }
    merged += own.length;
    const allNamespaces = [...peers].every(p => nodes.get(p)?.kind === 'namespace');
    nodes.set(id, {
      id,
      kind: 'fold',
      name: `${peers.size} ${allNamespaces ? 'namespaces' : 'peers'}`,
      count: peers.size,
    });
  }
  return merged;
}

/** Same nodes and edges: only the rates moved, so the layout can stay. */
export function structureKey(g: TrafficGraph): string {
  return [...g.nodes.map(n => n.id).sort(), '|', ...g.edges.map(e => e.id).sort()].join(',');
}

/** The selected node, its neighbours and its edges; everything else is faded. */
export function neighbourhood(g: TrafficGraph, selected: string | null) {
  if (!selected) return null;
  const nodes = new Set([selected]);
  const edges = new Set<string>();
  for (const e of g.edges) {
    if (e.source !== selected && e.target !== selected) continue;
    edges.add(e.id);
    nodes.add(e.source).add(e.target);
  }
  return { nodes, edges };
}
