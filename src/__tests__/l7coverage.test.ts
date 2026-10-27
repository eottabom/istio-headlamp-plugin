import { describe, expect, it } from 'vitest';
import { L7Inputs, L7Subject, resolveL7Coverage } from '../lib/l7decision';

/**
 * The cases that decide whether this plugin can be trusted for a security
 * question. The happy path was never the risk: a wrong "enforced" is worse
 * than no answer, because nobody looks again after being reassured.
 */

const waypoint = (
  name: string,
  namespace: string,
  uid = `${namespace}/${name}`,
  labels: Record<string, string> = {}
) => ({
  metadata: { name, namespace, uid, labels },
  jsonData: {
    status: {
      addresses: [{ value: `${name}.${namespace}.svc.cluster.local` }],
      conditions: [{ type: 'Programmed', status: 'True' }],
    },
  },
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
  it('reports a selector-based L4 policy as ztunnel-enforceable', () => {
    expect(
      resolveL7Coverage(
        policy({ l7Requirements: [], attachmentKind: 'selector', targetRefs: [] }),
        READY
      ).state
    ).toBe('l4');
  });

  it('covers a Service targetRef whose waypoint actually exists', () => {
    const result = resolveL7Coverage(policy(), READY);
    expect(result.state).toBe('covered');
    expect(result).toMatchObject({ through: 'waypoint', via: ['shop-waypoint'] });
  });

  it('does not claim coverage when a named waypoint has no address', () => {
    const unaddressed = {
      ...waypoint('shop-waypoint', 'shop'),
      jsonData: {
        status: { addresses: [], conditions: [{ type: 'Programmed', status: 'False' }] },
      },
    };
    expect(resolveL7Coverage(policy(), { ...READY, waypoints: [unaddressed] }).state).toBe(
      'unknown'
    );
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

  it('does not call a Gateway target missing when the Gateway list was denied', () => {
    const result = resolveL7Coverage(
      policy({ targetRefs: [{ kind: 'Gateway', name: 'shop-waypoint' }] }),
      { ...READY, gateways: [], waypoints: [], gatewayUnknown: true }
    );
    expect(result.state).toBe('unknown');
  });

  it('does not call a Service unenforced while the Gateway list is loading', () => {
    const result = resolveL7Coverage(policy(), {
      ...READY,
      gateways: [],
      waypoints: [],
      gatewayLoading: true,
    });
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

  // A targetRef is how a policy reaches a waypoint, so a Service with none
  // leaves it bound to nothing. istiod does not pass it to ztunnel either, so
  // the traffic is unpoliced rather than denied.
  it('leaves the policy unenforced when the targeted Service has no waypoint', () => {
    const result = resolveL7Coverage(policy(), {
      ...READY,
      services: [service('reviews', 'shop')],
    });
    expect(result).toMatchObject({ state: 'unenforced', services: ['shop/reviews'] });
  });

  it('reports a Service targetRef that resolves to nothing as dangling', () => {
    const result = resolveL7Coverage(policy({ targetRefs: [{ name: 'gone' }] }), READY);
    expect(result.state).toBe('dangling');
    expect(result).toMatchObject({ targetKind: 'Service', missing: ['shop/gone'] });
  });

  it('does not report coverage when only one of multiple Service targets exists', () => {
    const result = resolveL7Coverage(
      policy({
        targetRefs: [
          { kind: 'Service', name: 'reviews' },
          { kind: 'Service', name: 'missing' },
        ],
      }),
      READY
    );
    expect(result).toMatchObject({
      state: 'dangling',
      missing: ['shop/missing'],
      targetKind: 'Service',
    });
  });

  it('does not send an L4 Service targetRef without a waypoint to ztunnel', () => {
    const result = resolveL7Coverage(policy({ l7Requirements: [] }), {
      ...READY,
      services: [service('reviews', 'shop')],
    });
    expect(result).toMatchObject({ state: 'unenforced', services: ['shop/reviews'] });
  });

  it('keeps an L4 Service targetRef on its waypoint when one is available', () => {
    expect(resolveL7Coverage(policy({ l7Requirements: [] }), READY)).toMatchObject({
      state: 'covered',
      through: 'waypoint',
    });
  });

  it('does not match a targetRef from another namespace against the local Service', () => {
    const result = resolveL7Coverage(
      policy({ targetRefs: [{ kind: 'Service', name: 'reviews', namespace: 'other' }] }),
      READY
    );
    expect(result.state).toBe('unknown');
  });

  // A waypoint that only handles workload traffic is never bound to the
  // Service, so the policy binds to nothing even though the label is valid.
  it('does not credit a workload-only waypoint for a Service targetRef', () => {
    const result = resolveL7Coverage(policy(), {
      ...READY,
      waypoints: [
        waypoint('shop-waypoint', 'shop', undefined, { 'istio.io/waypoint-for': 'workload' }),
      ],
    });
    // Service traffic never reaches a workload-only waypoint, so the targetRef
    // lands on nothing -- and a targetRef policy is not passed to ztunnel.
    expect(result).toMatchObject({
      state: 'unenforced',
      services: ['shop/reviews'],
      incompatibleWaypoints: ['shop/shop-waypoint'],
    });
  });

  it('credits a waypoint that handles all traffic', () => {
    const result = resolveL7Coverage(policy(), {
      ...READY,
      waypoints: [waypoint('shop-waypoint', 'shop', undefined, { 'istio.io/waypoint-for': 'all' })],
    });
    expect(result.state).toBe('covered');
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
    // Only the unenrolled Service is listed: the enrolled one is covered, and
    // naming it would send the reader hunting through a Service that is fine.
    expect(result.state).not.toBe('covered');
    expect(result).toMatchObject({ state: 'unenforced', services: ['shop/orders'] });
  });

  it('does not credit a waypoint the Service explicitly opted out of', () => {
    const result = resolveL7Coverage(policy(), {
      ...READY,
      services: [service('reviews', 'shop', { 'istio.io/use-waypoint': 'none' })],
    });
    expect(result).toMatchObject({ state: 'unenforced', services: ['shop/reviews'] });
  });

  it('names every Service that bypasses enforcement for different reasons', () => {
    const result = resolveL7Coverage(
      policy({
        targetRefs: [
          { kind: 'Service', name: 'reviews' },
          { kind: 'Service', name: 'orders' },
          { kind: 'Service', name: 'catalog' },
        ],
      }),
      {
        ...READY,
        waypoints: [
          waypoint('shop-waypoint', 'shop', undefined, { 'istio.io/waypoint-for': 'workload' }),
        ],
        services: [
          service('reviews', 'shop', { 'istio.io/use-waypoint': 'shop-waypoint' }),
          service('orders', 'shop', { 'istio.io/use-waypoint': 'none' }),
          service('catalog', 'shop'),
        ],
      }
    );
    expect(result).toMatchObject({
      state: 'unenforced',
      services: ['shop/reviews', 'shop/orders', 'shop/catalog'],
      incompatibleWaypoints: ['shop/shop-waypoint'],
    });
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

  it('does not report all Gateway targets covered when one is missing', () => {
    const result = resolveL7Coverage(
      policy({
        targetRefs: [
          { kind: 'Gateway', name: 'shop-ingress' },
          { kind: 'Gateway', name: 'missing-gw' },
        ],
      }),
      { ...READY, gateways: [waypoint('shop-ingress', 'shop', 'gw-uid')], waypoints: [] }
    );
    expect(result).toMatchObject({ state: 'dangling', missing: ['shop/missing-gw'] });
  });

  it('does not claim coverage for a Gateway without a programmed address', () => {
    const unaddressed = {
      ...waypoint('shop-ingress', 'shop'),
      jsonData: {
        status: { addresses: [], conditions: [{ type: 'Programmed', status: 'False' }] },
      },
    };
    expect(
      resolveL7Coverage(policy({ targetRefs: [{ kind: 'Gateway', name: 'shop-ingress' }] }), {
        ...READY,
        gateways: [unaddressed],
        waypoints: [],
      }).state
    ).toBe('unknown');
  });

  it('does not infer coverage from only one kind of mixed targetRefs', () => {
    const result = resolveL7Coverage(
      policy({
        targetRefs: [
          { kind: 'Gateway', name: 'shop-ingress' },
          { kind: 'Service', name: 'reviews' },
        ],
      }),
      { ...READY, gateways: [waypoint('shop-ingress', 'shop', 'gw-uid')], waypoints: [] }
    );
    expect(result.state).toBe('unknown');
  });

  it('does not credit a cross-namespace Gateway targetRef', () => {
    const result = resolveL7Coverage(
      policy({ targetRefs: [{ kind: 'Gateway', name: 'shared', namespace: 'other' }] }),
      { ...READY, gateways: [waypoint('shared', 'other')], waypoints: [] }
    );
    expect(result.state).toBe('unknown');
  });

  it('does not call a supported but unread ServiceEntry target missing Service', () => {
    const result = resolveL7Coverage(
      policy({
        targetRefs: [{ group: 'networking.istio.io', kind: 'ServiceEntry', name: 'external' }],
      }),
      READY
    );
    expect(result.state).toBe('unknown');
  });

  it('does not credit sidecars for a Service targetRef without ambient mode', () => {
    expect(resolveL7Coverage(policy(), { ...READY, ambientEnabled: false }).state).toBe('unknown');
  });

  /* -------------------------------- sidecar -------------------------------- */

  it('leaves L7 to the sidecars when the mesh is not ambient', () => {
    expect(
      resolveL7Coverage(policy({ attachmentKind: 'selector', targetRefs: [] }), {
        ...READY,
        ambientEnabled: false,
      }).state
    ).toBe('sidecar');
  });
});

describe('an unread ztunnel', () => {
  // The mesh may well be ambient with ztunnel denying this policy, so the one
  // answer that must not come out of here is "enforced by sidecars".
  const unreadable: L7Inputs = {
    ...READY,
    ambientEnabled: false,
    ambientUnknown: true,
    ambientUnknownNamespaces: ['kube-system'],
  };

  it('is not reported as a sidecar mesh', () => {
    expect(resolveL7Coverage(policy(), unreadable).state).toBe('unknown');
  });

  it('names the namespace it could not read', () => {
    const result = resolveL7Coverage(policy(), unreadable);
    expect(result.state === 'unknown' && result.reason).toContain('kube-system');
  });

  it('still answers for a selector-based policy that needs no L7', () => {
    expect(
      resolveL7Coverage(
        policy({ l7Requirements: [], attachmentKind: 'selector', targetRefs: [] }),
        unreadable
      ).state
    ).toBe('l4');
  });

  it('reads a listed, absent ztunnel as a sidecar mesh', () => {
    const absent: L7Inputs = { ...READY, ambientEnabled: false, ambientUnknown: false };
    expect(
      resolveL7Coverage(policy({ attachmentKind: 'selector', targetRefs: [] }), absent).state
    ).toBe('sidecar');
  });
});
