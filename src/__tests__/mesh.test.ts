import { describe, expect, it } from 'vitest';
import { hostMatchesService, parseHost, serviceFqdn } from '../lib/host';
import { namespaceMeshState, podMeshState, resolveWaypoint } from '../lib/mesh';
import { namespaces, pods, services, waypoints } from './fixtures';

const ns = (name: string) => namespaces.find(n => n.metadata.name === name);
const svc = (name: string) => services.find(s => s.metadata.name === name);

/** Fixtures are plain JSON; the mesh helpers only read metadata and jsonData.spec. */
const asObj = (json: any) => ({ metadata: json.metadata, jsonData: json } as any);

describe('namespaceMeshState', () => {
  it('reports ambient for a dataplane-mode=ambient namespace', () => {
    const state = namespaceMeshState(asObj(ns('shop')));
    expect(state.mode).toBe('ambient');
    expect(state.reason).toContain('istio.io/dataplane-mode=ambient');
  });

  it('reports sidecar for an istio-injection=enabled namespace', () => {
    expect(namespaceMeshState(asObj(ns('legacy'))).mode).toBe('sidecar');
  });

  it('reports out-of-mesh for an unlabelled namespace', () => {
    expect(namespaceMeshState(asObj(ns('nomesh'))).mode).toBe('out-of-mesh');
  });

  it('does not treat istio-system itself as enrolled', () => {
    expect(namespaceMeshState(asObj(ns('istio-system'))).mode).toBe('out-of-mesh');
  });
});

describe('podMeshState', () => {
  it('reports ambient for an uninjected pod in an ambient namespace', () => {
    const pod = pods.find(p => p.metadata.namespace === 'shop');
    expect(pod).toBeDefined();
    const state = podMeshState(asObj(pod), asObj(ns('shop')));
    expect(state.mode).toBe('ambient');
  });

  it('reports sidecar when an istio-proxy container is present', () => {
    const fake = asObj({
      metadata: { name: 'p', namespace: 'legacy' },
      spec: { containers: [{ name: 'app' }, { name: 'istio-proxy' }] },
    });
    expect(podMeshState(fake, asObj(ns('legacy'))).mode).toBe('sidecar');
  });

  it('flags a pod in an injection-enabled namespace that has no sidecar', () => {
    const fake = asObj({
      metadata: { name: 'p', namespace: 'legacy' },
      spec: { containers: [{ name: 'app' }] },
    });
    const state = podMeshState(fake, asObj(ns('legacy')));
    expect(state.mode).toBe('out-of-mesh');
    expect(state.reason).toContain('restart');
  });

  it('honours a pod-level opt-out of ambient', () => {
    const fake = asObj({
      metadata: { name: 'p', namespace: 'shop', labels: { 'istio.io/dataplane-mode': 'none' } },
      spec: { containers: [{ name: 'app' }] },
    });
    expect(podMeshState(fake, asObj(ns('shop'))).mode).toBe('out-of-mesh');
  });
});

describe('resolveWaypoint', () => {
  it('inherits the namespace default waypoint', () => {
    const binding = resolveWaypoint(asObj(svc('reviews')), asObj(ns('shop')));
    expect(binding.name).toBe('shop-waypoint');
    expect(binding.source).toBe('namespace');
    expect(binding.disabled).toBe(false);
  });

  it('honours an object-level opt-out that overrides the namespace default', () => {
    const binding = resolveWaypoint(asObj(svc('orders')), asObj(ns('shop')));
    expect(binding.disabled).toBe(true);
    expect(binding.source).toBe('object');
    expect(binding.name).toBeUndefined();
  });

  it('returns no binding for a namespace without the label', () => {
    expect(resolveWaypoint(asObj(ns('nomesh')), asObj(ns('nomesh'))).name).toBeUndefined();
  });
});

describe('waypoint fixtures', () => {
  it('captured both waypoint Gateways', () => {
    expect(waypoints.map(w => w.metadata.name).sort()).toEqual([
      'orphan-waypoint',
      'shop-waypoint',
    ]);
    waypoints.forEach(w => expect(w.spec.gatewayClassName).toBe('istio-waypoint'));
  });
});

describe('parseHost', () => {
  it('parses a fully qualified cluster host', () => {
    const p = parseHost('reviews.shop.svc.cluster.local');
    expect(p).toMatchObject({ serviceName: 'reviews', namespace: 'shop', isClusterLocal: true });
  });

  it('resolves a short name against the resource namespace', () => {
    expect(parseHost('reviews', 'shop')).toMatchObject({
      serviceName: 'reviews',
      namespace: 'shop',
    });
  });

  it('treats a public domain as external, not name.namespace', () => {
    expect(parseHost('payments.example.com').isClusterLocal).toBe(false);
    expect(parseHost('api.com').isClusterLocal).toBe(false);
  });

  it('extracts the namespace scope from the ns/host form', () => {
    expect(parseHost('istio-system/*')).toMatchObject({ scope: 'istio-system', isWildcard: true });
  });

  it('marks wildcards', () => {
    expect(parseHost('*.example.com').isWildcard).toBe(true);
  });
});

describe('hostMatchesService', () => {
  it('matches the real DestinationRule host to its Service', () => {
    expect(hostMatchesService('reviews.shop.svc.cluster.local', 'reviews', 'shop')).toBe(true);
  });

  it('matches a short host against the rule namespace', () => {
    expect(hostMatchesService('reviews', 'reviews', 'shop', 'shop')).toBe(true);
  });

  it('does not match a different namespace', () => {
    expect(hostMatchesService('reviews.other.svc.cluster.local', 'reviews', 'shop')).toBe(false);
  });

  it('matches "*"', () => {
    expect(hostMatchesService('*', 'reviews', 'shop')).toBe(true);
  });

  it('matches a suffix wildcard', () => {
    expect(hostMatchesService('*.shop.svc.cluster.local', 'reviews', 'shop')).toBe(true);
  });

  it('builds the canonical FQDN', () => {
    expect(serviceFqdn('reviews', 'shop')).toBe('reviews.shop.svc.cluster.local');
  });
});
