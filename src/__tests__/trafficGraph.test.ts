import { describe, expect, it } from 'vitest';
import { buildGraph, EdgeKind, GraphView, neighbourhood, structureKey } from '../lib/trafficGraph';
import { Flow, OUTSIDE_IN, OUTSIDE_OUT } from '../lib/trafficParse';

const all = new Set<EdgeKind>(['mtls', 'plaintext']);
const top: GraphView = { namespaces: new Set(), kinds: all };
const inside = (...ns: string[]): GraphView => ({ namespaces: new Set(ns), kinds: all });
const flow = (source: string, target: string, security: Flow['security'], bytesPerSec = 1) => ({
  source,
  target,
  security,
  bytesPerSec,
});

describe('buildGraph at the namespace level', () => {
  it('draws a node per namespace and an edge per pair and security', () => {
    const g = buildGraph(
      [
        flow('a', 'b', 'mtls', 2),
        flow('a', 'b', 'plaintext'),
        flow(OUTSIDE_IN, 'b', 'plaintext'),
        flow('b', OUTSIDE_OUT, 'plaintext'),
      ],
      top
    );
    expect(g.nodes.map(n => [n.id, n.kind])).toEqual([
      ['a', 'namespace'],
      ['b', 'namespace'],
      [OUTSIDE_IN, 'outside-in'],
      [OUTSIDE_OUT, 'outside-out'],
    ]);
    expect(g.edges.map(e => e.id)).toEqual([
      'a>b:mtls',
      'a>b:plaintext',
      `${OUTSIDE_IN}>b:plaintext`,
      `b>${OUTSIDE_OUT}:plaintext`,
    ]);
  });

  it('draws no loop for traffic inside a node', () => {
    expect(buildGraph([flow('a', 'a', 'mtls')], top).edges).toEqual([]);
  });

  it('hides a kind, with the nodes only it linked', () => {
    const g = buildGraph([flow('a', 'b', 'mtls'), flow(OUTSIDE_IN, 'b', 'plaintext')], {
      ...top,
      kinds: new Set<EdgeKind>(['mtls']),
    });
    expect(g.nodes.map(n => n.id)).toEqual(['a', 'b']);
  });
});

describe('buildGraph inside namespaces', () => {
  const flows = [
    flow('shop/web', 'shop/db', 'mtls'),
    flow('mon/scraper', 'shop/web', 'mtls'),
    flow('mon/agent', 'shop/db', 'mtls'),
  ];

  it('draws their workloads and folds other peers into their namespace, with a count', () => {
    const byId = new Map(buildGraph(flows, inside('shop')).nodes.map(n => [n.id, n]));
    expect(byId.get('shop/web')).toMatchObject({
      kind: 'workload',
      name: 'web',
      namespace: 'shop',
    });
    expect(byId.get('mon')).toMatchObject({ kind: 'namespace', count: 2 });
    expect(byId.has('mon/scraper')).toBe(false);
  });

  it('draws the workloads of every selected namespace', () => {
    const ids = buildGraph(flows, inside('shop', 'mon')).nodes.map(n => n.id);
    expect(ids).toEqual(expect.arrayContaining(['mon/scraper', 'mon/agent', 'shop/web']));
  });
});

describe('structureKey and neighbourhood', () => {
  it('ignore rates and order', () => {
    const a = buildGraph([flow('a', 'b', 'mtls', 1), flow('c', 'b', 'mtls', 1)], top);
    const b = buildGraph([flow('c', 'b', 'mtls', 9), flow('a', 'b', 'mtls', 5)], top);
    expect(structureKey(a)).toBe(structureKey(b));
    expect(structureKey(buildGraph([flow('a', 'b', 'mtls')], top))).not.toBe(structureKey(a));
  });

  it('keep the edges and neighbours of the selected node', () => {
    const g = buildGraph([flow('a', 'b', 'mtls'), flow('c', 'd', 'mtls')], top);
    const n = neighbourhood(g, 'a')!;
    expect([...n.nodes].sort()).toEqual(['a', 'b']);
    expect([...n.edges]).toEqual(['a>b:mtls']);
    expect(neighbourhood(g, null)).toBeNull();
  });
});
