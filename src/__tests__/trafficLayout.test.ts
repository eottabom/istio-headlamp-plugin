import { describe, expect, it } from 'vitest';
import { buildGraph, EdgeKind, GraphView } from '../lib/trafficGraph';
import {
  Box,
  BOX_PAD,
  BOX_TITLE,
  edgePath,
  groupId,
  layoutGraph,
  NODE_H,
  NODE_W,
} from '../lib/trafficLayout';
import { Flow, OUTSIDE_IN } from '../lib/trafficParse';

const inside = (...ns: string[]): GraphView => ({
  namespaces: new Set(ns),
  kinds: new Set<EdgeKind>(['mtls', 'plaintext']),
});
const flow = (source: string, target: string, security: Flow['security'] = 'mtls'): Flow => ({
  source,
  target,
  security,
  bytesPerSec: 1,
});
const overlap = (p: Box, q: Box) =>
  p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;

describe('namespace boxes', () => {
  it('hug their workloads, with room for the title', () => {
    const g = buildGraph(
      [flow('a/x', 'a/y'), flow('a/y', 'b/z'), flow(OUTSIDE_IN, 'a/x')],
      inside('a', 'b')
    );
    const { nodes, groups } = layoutGraph(g);
    const box = groups.get(groupId('a'))!;
    const members = ['a/x', 'a/y'].map(id => nodes.get(id)!);
    expect(Math.min(...members.map(p => p.x)) - box.x).toBe(BOX_PAD);
    expect(Math.min(...members.map(p => p.y)) - box.y).toBe(BOX_TITLE);
    expect(box.x + box.w - Math.max(...members.map(p => p.x + NODE_W))).toBe(BOX_PAD);
    expect(nodes.has(OUTSIDE_IN)).toBe(true);
    expect(groups.size).toBe(2);
  });

  // Boxes built from their workloads plus a margin used to overlap on such graphs.
  it('never overlap each other or a node of another namespace, on random graphs', () => {
    let seed = 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let run = 0; run < 100; run++) {
      const ns = Array.from({ length: 2 + Math.floor(rnd() * 4) }, (_, i) => `n${i}`);
      const peer = () => `${ns[Math.floor(rnd() * ns.length)]}/w${Math.floor(rnd() * 5)}`;
      const flows = Array.from({ length: 3 + Math.floor(rnd() * 25) }, () =>
        rnd() < 0.1 ? flow(OUTSIDE_IN, peer(), 'plaintext') : flow(peer(), peer())
      );
      const g = buildGraph(flows, inside(...ns.slice(0, 1 + Math.floor(rnd() * ns.length))));
      const { nodes, groups } = layoutGraph(g);
      const boxes = [...groups.entries()];
      boxes.forEach(([, a], i) =>
        boxes.slice(i + 1).forEach(([, b]) => expect(overlap(a, b)).toBe(false))
      );
      for (const n of g.nodes) {
        const p = nodes.get(n.id)!;
        for (const [id, b] of boxes) {
          if (n.namespace && groupId(n.namespace) === id) continue;
          expect(overlap({ x: p.x, y: p.y, w: NODE_W, h: NODE_H }, b)).toBe(false);
        }
      }
    }
  });
});

describe('edgePath', () => {
  it('leaves the source on the right and reaches the target on the left, flat', () => {
    const { path, mid } = edgePath({ x: 0, y: 0 }, { x: 400, y: 100 }, [
      { x: 10, y: 5 },
      { x: 200, y: 50 },
      { x: 390, y: 95 },
    ]);
    expect(path).toMatch(/^M 0,0 L [\d.]+,0 C [\d.]+,0 /);
    expect(path.endsWith(' L 400,100')).toBe(true);
    expect(mid).toEqual({ x: 200, y: 50 });
  });

  it('never goes past its route, so no bumps where it turns', () => {
    const { path } = edgePath({ x: 0, y: 0 }, { x: 600, y: 0 }, [
      { x: 0, y: 0 },
      { x: 200, y: 200 },
      { x: 400, y: -200 },
      { x: 600, y: 0 },
    ]);
    const ys = [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => Number(m[2]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(200);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-200);
  });

  it('gives every edge the route dagre found', () => {
    const g = buildGraph([flow('a/x', 'a/y'), flow('b/z', 'a/x')], inside('a'));
    const { edges } = layoutGraph(g);
    for (const e of g.edges) expect(edges.get(e.id)?.length).toBeGreaterThan(1);
  });
});
