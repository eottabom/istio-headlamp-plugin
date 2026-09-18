import { describe, expect, it } from 'vitest';
import { L7Inputs, L7Subject, resolveL7Coverage } from '../lib/l7decision';

/**
 * The cases that decide whether this plugin can be trusted for a security
 * question. The happy path was never the risk: a wrong "enforced" is worse
 * than no answer, because nobody looks again after being reassured.
 */

const waypoint = (name: string, namespace: string, uid = `${namespace}/${name}`) => ({
  metadata: { name, namespace, uid },
});

const service = (name: string, namespace: string, labels: Record<string, string> = {}) => ({
  metadata: { name, namespace, labels },
});

const namespace = (name: string, labels: Record<string, string> = {}) => ({
  metadata: { name, labels },
});

const READY: L7Inputs = {
  ambientEnabled: true,
  loading: false,
  waypoints: [waypoint('shop-waypoint', 'shop')],
  gateways: [waypoint('shop-waypoint', 'shop')],
  namespaces: [namespace('shop')],
  services: [service('reviews', 'shop', { 'istio.io/use-waypoint': 'shop-waypoint' })],
};

const policy = (over: Partial<L7Subject> = {}): L7Subject => ({
  metadata: { namespace: 'shop' },
  l7Requirements: ['rules[0].to[0].operation.methods'],
  targetRefs: [{ kind: 'Service', name: 'reviews' }],
  attachmentKind: 'targetRef',
  ...over,
});

describe('resolveL7Coverage', () => {
  it('reports L4 when there are no L7 conditions at all', () => {
    expect(resolveL7Coverage(policy({ l7Requirements: [] }), READY).state).toBe('l4');
  });

  it('covers a Service targetRef whose waypoint actually exists', () => {
    const result = resolveL7Coverage(policy(), READY);
    expect(result.state).toBe('covered');
    expect(result).toMatchObject({ through: 'waypoint', via: ['shop-waypoint'] });
  });

  /* ------------------------------ not knowing ------------------------------ */

  it('refuses to answer while the mesh state is still loading', () => {
    const result = resolveL7Coverage(policy(), { ...READY, loading: true });
    expect(result.state).toBe('unknown');
  });

  it('refuses to answer when Services cannot be read', () => {
    const result = resolveL7Coverage(policy(), { ...READY, services: null });
    expect(result.state).toBe('unknown');
  });

  it('refuses to answer when Namespaces cannot be read', () => {
    const result = resolveL7Coverage(policy(), { ...READY, namespaces: null });
    expect(result.state).toBe('unknown');
  });

  /* --------------------------- attachment is king --------------------------- */

  // A waypoint only enforces what a targetRef attaches to it. Reading the
  // namespace's use-waypoint label for a selector policy reported a waypoint
  // that never sees the policy.
  it('does not credit a waypoint for a selector-based policy', () => {
    const result = resolveL7Coverage(policy({ attachmentKind: 'selector', targetRefs: [] }), READY);
    expect(result.state).toBe('ztunnel-denies');
    expect(result).toMatchObject({ reason: expect.stringContaining('workload selector') });
  });

  it('does not credit a waypoint for a namespace-wide policy', () => {
    const result = resolveL7Coverage(policy({ attachmentKind: 'namespace', targetRefs: [] }), {
      ...READY,
      namespaces: [namespace('shop', { 'istio.io/use-waypoint': 'shop-waypoint' })],
    });
    expect(result.state).toBe('ztunnel-denies');
  });

  // A mesh-wide policy in the root namespace still has no targetRef, so it is
  // ztunnel's too; it must not pick up istio-system's own waypoint label.
  it('treats a root-namespace mesh-wide policy as ztunnel enforced', () => {
    const result = resolveL7Coverage(
      policy({
        metadata: { namespace: 'istio-system' },
        attachmentKind: 'namespace',
        targetRefs: [],
      }),
      {
        ...READY,
        namespaces: [namespace('istio-system', { 'istio.io/use-waypoint': 'shop-waypoint' })],
      }
    );
    expect(result.state).toBe('ztunnel-denies');
  });

  /* ------------------------- labels are not evidence ------------------------- */

  it('does not report a waypoint that no Gateway backs', () => {
    const result = resolveL7Coverage(policy(), {
      ...READY,
      waypoints: [],
      services: [service('reviews', 'shop', { 'istio.io/use-waypoint': 'typo-waypoint' })],
    });
    expect(result.state).toBe('dangling');
    expect(result).toMatchObject({ missing: ['shop/typo-waypoint'] });
  });

  it('denies when the targeted Service is enrolled with nothing', () => {
    const result = resolveL7Coverage(policy(), {
      ...READY,
      services: [service('reviews', 'shop')],
    });
    expect(result.state).toBe('ztunnel-denies');
  });

  it('reports a Service targetRef that resolves to nothing as dangling', () => {
    const result = resolveL7Coverage(policy({ targetRefs: [{ name: 'gone' }] }), READY);
    expect(result.state).toBe('dangling');
    expect(result).toMatchObject({ targetKind: 'Service', missing: ['shop/gone'] });
  });

  it('does not match a targetRef from another namespace against the local Service', () => {
    const result = resolveL7Coverage(
      policy({ targetRefs: [{ kind: 'Service', name: 'reviews', namespace: 'other' }] }),
      READY
    );
    expect(result.state).toBe('dangling');
  });

  /* ------------------------------ mixed targets ------------------------------ */

  // Half covered is not covered: the uncovered half is where traffic drops.
  it('does not report covered when only some targets have a live waypoint', () => {
    const result = resolveL7Coverage(
      policy({
        targetRefs: [
          { kind: 'Service', name: 'reviews' },
          { kind: 'Service', name: 'orders' },
        ],
      }),
      {
        ...READY,
        services: [
          service('reviews', 'shop', { 'istio.io/use-waypoint': 'shop-waypoint' }),
          service('orders', 'shop'),
        ],
      }
    );
    expect(result.state).not.toBe('covered');
  });

  it('does not credit a waypoint the Service explicitly opted out of', () => {
    const result = resolveL7Coverage(policy(), {
      ...READY,
      services: [service('reviews', 'shop', { 'istio.io/use-waypoint': 'none' })],
    });
    expect(result.state).toBe('ztunnel-denies');
  });

  /* -------------------------------- gateways -------------------------------- */

  it('accepts an ingress Gateway as terminating L7 itself', () => {
    const result = resolveL7Coverage(
      policy({ targetRefs: [{ kind: 'Gateway', name: 'shop-ingress' }] }),
      { ...READY, gateways: [waypoint('shop-ingress', 'shop', 'gw-uid')], waypoints: [] }
    );
    expect(result).toMatchObject({ state: 'covered', through: 'gateway' });
  });

  it('reports a Gateway targetRef pointing at nothing as dangling', () => {
    const result = resolveL7Coverage(
      policy({ targetRefs: [{ kind: 'Gateway', name: 'missing-gw' }] }),
      READY
    );
    expect(result).toMatchObject({ state: 'dangling', targetKind: 'Gateway' });
  });

  /* -------------------------------- sidecar -------------------------------- */

  it('leaves L7 to the sidecars when the mesh is not ambient', () => {
    expect(resolveL7Coverage(policy(), { ...READY, ambientEnabled: false }).state).toBe('sidecar');
  });
});
