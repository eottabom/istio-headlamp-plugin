import { describe, expect, it } from 'vitest';
import { peerAuthenticationScope } from '../components/detail/SecurityDetail';

const pa = (namespace: string, selectorLabels?: Record<string, string>) => ({
  metadata: { namespace },
  selectorLabels,
});

describe('peerAuthenticationScope', () => {
  it('reads a selectorless policy in the root namespace as mesh-wide', () => {
    expect(peerAuthenticationScope(pa('istio-system'), 'istio-system')).toContain('Mesh-wide');
  });

  // The AKS add-on puts the control plane, and with it the root namespace,
  // outside istio-system; mesh-wide is mesh-wide there too.
  it('follows the root namespace when it is not istio-system', () => {
    expect(peerAuthenticationScope(pa('aks-istio-system'), 'aks-istio-system')).toContain(
      'Mesh-wide'
    );
  });

  it('does not call istio-system mesh-wide when the root namespace is elsewhere', () => {
    expect(peerAuthenticationScope(pa('istio-system'), 'mesh-root')).toBe('Namespace istio-system');
  });

  it('reads a selector as narrowing the policy to those workloads', () => {
    expect(peerAuthenticationScope(pa('shop', { app: 'reviews' }), 'istio-system')).toBe(
      'Selected workloads'
    );
  });

  it('treats an empty selector in the root namespace as mesh-wide', () => {
    expect(peerAuthenticationScope(pa('mesh-root', {}), 'mesh-root')).toContain('Mesh-wide');
  });

  it('treats an empty selector outside the root namespace as namespace-wide', () => {
    expect(peerAuthenticationScope(pa('shop', {}), 'mesh-root')).toBe('Namespace shop');
  });

  it('reports a non-empty selector in the root namespace as ignored', () => {
    expect(peerAuthenticationScope(pa('mesh-root', { app: 'reviews' }), 'mesh-root')).toContain(
      'Ignored'
    );
  });

  it('names the namespace for a policy outside the root one', () => {
    expect(peerAuthenticationScope(pa('shop'), 'istio-system')).toBe('Namespace shop');
  });

  it('does not guess mesh-wide scope when the root namespace cannot be read', () => {
    expect(peerAuthenticationScope(pa('istio-system'), null)).toContain('Cannot determine');
  });

  it('does not claim a selector is effective when the root namespace cannot be read', () => {
    expect(peerAuthenticationScope(pa('shop', { app: 'reviews' }), null)).toContain(
      'Cannot determine'
    );
  });
});
