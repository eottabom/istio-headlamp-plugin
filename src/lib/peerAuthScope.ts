/**
 * PeerAuthentication scope, decided from the policy and the mesh root namespace.
 *
 * Kept free of Headlamp and React imports so the rules can be tested without a
 * cluster or a browser; SecurityDetail.tsx renders the result.
 */

/**
 * How far a PeerAuthentication reaches.
 *
 * Istio reads a policy with no selector in the mesh root namespace as mesh-wide,
 * and that namespace is `meshConfig.rootNamespace` rather than `istio-system`
 * whenever an install sets one - the AKS add-on does. Empty selectors have the
 * same scope as omitted selectors; non-empty selectors in the root are ignored.
 */
export function peerAuthenticationScope(
  pa: { metadata: { namespace?: string }; selectorLabels?: Record<string, string> },
  rootNamespace: string | null
): string {
  if (rootNamespace === null) return 'Cannot determine (mesh root namespace unreadable)';
  const hasSelector = Boolean(pa.selectorLabels && Object.keys(pa.selectorLabels).length > 0);
  if (hasSelector) {
    return pa.metadata.namespace === rootNamespace
      ? 'Ignored (workload selector in root namespace)'
      : 'Selected workloads';
  }
  if (pa.metadata.namespace === rootNamespace) {
    return 'Mesh-wide (root namespace, no selector)';
  }
  return `Namespace ${pa.metadata.namespace}`;
}
