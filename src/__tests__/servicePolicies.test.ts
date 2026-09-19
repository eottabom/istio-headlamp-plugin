import { describe, expect, it } from 'vitest';
import { policiesForService, PolicyLike, ServiceTarget } from '../lib/servicePolicies';

const ap = (
  namespace: string,
  attachmentKind: PolicyLike['attachmentKind'],
  targetRefs: PolicyLike['targetRefs'] = []
): PolicyLike => ({ metadata: { namespace }, attachmentKind, targetRefs });

const REVIEWS: ServiceTarget = {
  name: 'reviews',
  namespace: 'shop',
  rootNamespace: 'istio-system',
  waypoint: { name: 'shop-waypoint', namespace: 'shop' },
};

describe('policiesForService', () => {
  it('includes a policy targeting the Service', () => {
    const p = ap('shop', 'targetRef', [{ kind: 'Service', name: 'reviews' }]);
    expect(policiesForService([p], REVIEWS)).toEqual([p]);
  });

  it('includes a policy targeting the waypoint the Service uses', () => {
    const p = ap('shop', 'targetRef', [{ kind: 'Gateway', name: 'shop-waypoint' }]);
    expect(policiesForService([p], REVIEWS)).toEqual([p]);
  });

  it('skips a waypoint policy when the Service has no waypoint', () => {
    const p = ap('shop', 'targetRef', [{ kind: 'Gateway', name: 'shop-waypoint' }]);
    expect(policiesForService([p], { ...REVIEWS, waypoint: undefined })).toEqual([]);
  });

  it('includes namespace-wide and mesh-wide policies', () => {
    const local = ap('shop', 'namespace');
    const mesh = ap('istio-system', 'namespace');
    const other = ap('legacy', 'namespace');
    expect(policiesForService([local, mesh, other], REVIEWS)).toEqual([local, mesh]);
  });

  it('honours a custom root namespace', () => {
    const mesh = ap('mesh-root', 'namespace');
    expect(policiesForService([mesh], { ...REVIEWS, rootNamespace: 'mesh-root' })).toEqual([mesh]);
  });

  it('does not match a same-named Service in another namespace', () => {
    const p = ap('other', 'targetRef', [{ kind: 'Service', name: 'reviews' }]);
    expect(policiesForService([p], REVIEWS)).toEqual([]);
  });

  it('leaves selector-based policies to the Pod page', () => {
    expect(policiesForService([ap('shop', 'selector')], REVIEWS)).toEqual([]);
  });
});
