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
    expect(peerAuthenticationScope(pa('istio-system', { app: 'reviews' }), 'istio-system')).toBe(
      'Selected workloads'
    );
  });

  it('names the namespace for a policy outside the root one', () => {
    expect(peerAuthenticationScope(pa('shop'), 'istio-system')).toBe('Namespace shop');
  });

  it('does not guess mesh-wide scope when the root namespace cannot be read', () => {
    expect(peerAuthenticationScope(pa('istio-system'), null)).toContain('Cannot determine');
  });

  it('still identifies a selector when the root namespace cannot be read', () => {
    expect(peerAuthenticationScope(pa('shop', { app: 'reviews' }), null)).toBe(
      'Selected workloads'
    );
  });
});
