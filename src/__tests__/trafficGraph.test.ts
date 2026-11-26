import { describe, expect, it } from 'vitest';
import {
  buildGraph,
  EdgeKind,
  foldId,
  GraphView,
  levelOf,
  neighbourhood,
  structureKey,
} from '../lib/trafficGraph';
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

describe('Group By', () => {
  it('reads namespace pairs only when grouped by namespace with no selection', () => {
    expect(levelOf(top)).toBe('namespace');
    expect(levelOf({ ...top, groupBy: 'workload' })).toBe('workload');
    expect(levelOf(inside('a'))).toBe('workload');
  });

  it('keeps every peer a workload when grouped by workload', () => {
    const g = buildGraph([flow('a/x', 'b/y', 'mtls')], { ...top, groupBy: 'workload' });
    expect(g.nodes.map(n => n.id)).toEqual(['a/x', 'b/y']);
  });

  it('replaces workloads by their app, and keeps those without the label', () => {
    const flows: Flow[] = [
      { ...flow('shop/web-v1', 'shop/db', 'mtls', 1), sourceApp: 'web', targetApp: 'db' },
      { ...flow('shop/web-v2', 'shop/db', 'mtls', 2), sourceApp: 'web', targetApp: 'db' },
      { ...flow('shop/job', 'shop/db', 'mtls', 4), targetApp: 'db' },
    ];
    const g = buildGraph(flows, { ...inside('shop'), groupBy: 'app' });
    expect(g.nodes.map(n => n.id).sort()).toEqual(['shop/db', 'shop/job', 'shop/web']);
    expect(g.nodes.every(n => n.app)).toBe(true);
    expect(g.edges.find(e => e.id === 'shop/web>shop/db:mtls')?.rate).toBe(3);
  });
});

describe('Fold > 10 peers', () => {
  const scraper = Array.from({ length: 12 }, (_, i) => flow('mon', `ns${i}`, 'mtls', 100));
  const folding = { ...top, foldOver: 10 };

  it('folds the peers of a busy node into one node per side', () => {
    const g = buildGraph(scraper, folding);
    expect(g.nodes.find(n => n.kind === 'fold')).toEqual({
      id: foldId('mon', 'out'),
      kind: 'fold',
      name: '12 namespaces',
      count: 12,
    });
    expect(g.edges).toEqual([
      expect.objectContaining({ source: 'mon', target: foldId('mon', 'out'), rate: 1200 }),
    ]);
    expect(g.hidden).toEqual({ folded: 12, small: 0 });
  });

  it('leaves nodes at the limit alone, keeps peers others reach, opens on request', () => {
    expect(buildGraph(scraper.slice(0, 10), folding).nodes).toHaveLength(11);
    const kept = buildGraph([...scraper, flow('ns0', 'web', 'mtls')], folding);
    expect(kept.nodes.map(n => n.id)).toEqual(expect.arrayContaining(['ns0', 'web']));
    const opened = buildGraph(scraper, {
      ...folding,
      unfolded: new Set([foldId('mon', 'out')]),
    });
    expect(opened.edges).toHaveLength(12);
    expect(opened.hidden.folded).toBe(0);
  });

  it('never folds the workloads of the selected namespaces', () => {
    const flows = Array.from({ length: 12 }, (_, i) => flow('mon/agent', `shop/w${i}`, 'mtls'));
    const g = buildGraph(flows, { ...inside('shop'), foldOver: 10 });
    expect(g.nodes.some(n => n.kind === 'fold')).toBe(false);
  });
});

describe('Hide < 1%', () => {
  it('hides flows small for both their ends, and counts them', () => {
    const g = buildGraph(
      [flow('a', 'b', 'mtls', 10), flow('a', 'c', 'mtls', 5000), flow('x', 'c', 'mtls', 5000)],
      { ...top, minShare: 0.01 }
    );
    // a>b is 0.2 % of what a sends but all that b receives: it stays.
    expect(g.edges.map(e => e.id).sort()).toEqual(['a>b:mtls', 'a>c:mtls', 'x>c:mtls']);
    expect(g.hidden).toEqual({ folded: 0, small: 0 });
    const h = buildGraph(
      [flow('a', 'c', 'mtls', 10), flow('a', 'b', 'mtls', 5000), flow('x', 'c', 'mtls', 5000)],
      { ...top, minShare: 0.01 }
    );
    expect(h.edges.map(e => e.id).sort()).toEqual(['a>b:mtls', 'x>c:mtls']);
    expect(h.hidden).toEqual({ folded: 0, small: 1 });
  });
});
