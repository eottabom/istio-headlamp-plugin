/**
 * Flows -> the nodes and edges of the Traffic Map, before
 * layout. Two levels, like Headlamp's Map: the namespaces, or the workloads of the
 * selected namespaces, with every other peer folded into its namespace.
 *
 * Kept free of Headlamp and React imports so it can be tested without a cluster.
 */
import { Flow, isOutside, OUTSIDE_IN, Security } from './trafficParse';

export type EdgeKind = Security;

export interface TrafficNode {
  id: string;
  kind: 'namespace' | 'workload' | 'outside-in' | 'outside-out';
  name: string;
  /** The namespace of a workload, drawn as a box around it. */
  namespace?: string;
  /** Workloads folded into a namespace node. */
  count?: number;
}

export interface TrafficEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  /** Bytes per second. */
  rate: number;
}

export interface TrafficGraph {
  nodes: TrafficNode[];
  edges: TrafficEdge[];
}

export interface GraphView {
  /** Selected namespaces; none: the namespace level. */
  namespaces: Set<string>;
  kinds: Set<EdgeKind>;
}

const namespaceOf = (peer: string) => peer.split('/')[0];

/** A peer as drawn: workloads outside the selected namespaces fold into their namespace. */
export function shownAs(peer: string, view: GraphView): string {
  return isOutside(peer) || view.namespaces.has(namespaceOf(peer)) ? peer : namespaceOf(peer);
}

function nodeOf(id: string): TrafficNode {
  if (isOutside(id)) {
    return { id, kind: id === OUTSIDE_IN ? 'outside-in' : 'outside-out', name: 'Outside the mesh' };
  }
  if (!id.includes('/')) return { id, kind: 'namespace', name: id };
  const [namespace, name] = id.split('/');
  return { id, kind: 'workload', name, namespace };
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
      if (!nodes.has(id)) nodes.set(id, nodeOf(id));
      if (peer !== id) folded.set(id, (folded.get(id) ?? new Set()).add(peer));
    }
    const id = `${s}>${t}:${kind}`;
    const e = edges.get(id) ?? { id, source: s, target: t, kind, rate: 0 };
    e.rate += rate;
    edges.set(id, e);
  };

  for (const f of flows) add(f.source, f.target, f.security, f.bytesPerSec);
  for (const [id, peers] of folded) nodes.get(id)!.count = peers.size;
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
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
