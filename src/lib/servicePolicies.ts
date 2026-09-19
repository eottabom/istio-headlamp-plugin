/**
 * Which AuthorizationPolicies apply to traffic addressed to a Service.
 *
 * Three attachments reach it, and a list that shows only the first understates
 * what is in force:
 *
 *  - a targetRef naming the Service itself;
 *  - a targetRef naming the waypoint Gateway the Service is enrolled with,
 *    which applies to everything that waypoint handles, this Service included;
 *  - a policy with neither selector nor targetRef, in the Service's namespace
 *    or in the mesh root namespace, which applies mesh-wide.
 *
 * Selector-based policies match pods, not Services, so they are left to the
 * Pod page.
 */
export interface PolicyLike {
  metadata: { namespace?: string };
  targetRefs: Array<{ kind?: string; name?: string; namespace?: string }>;
  attachmentKind: 'targetRef' | 'selector' | 'namespace';
}

export interface ServiceTarget {
  name: string;
  namespace: string;
  rootNamespace: string;
  /** The waypoint the Service is enrolled with, when it has a live binding. */
  waypoint?: { name: string; namespace: string };
}

export function policiesForService<P extends PolicyLike>(policies: P[], svc: ServiceTarget): P[] {
  return policies.filter(p => {
    const policyNs = p.metadata.namespace;
    if (p.attachmentKind === 'namespace') {
      return policyNs === svc.namespace || policyNs === svc.rootNamespace;
    }
    if (p.attachmentKind !== 'targetRef') return false;
    return p.targetRefs.some(r => {
      const refNs = r.namespace ?? policyNs;
      const kind = r.kind ?? 'Service';
      if (kind === 'Service') return r.name === svc.name && refNs === svc.namespace;
      if (kind === 'Gateway' && svc.waypoint) {
        return r.name === svc.waypoint.name && refNs === svc.waypoint.namespace;
      }
      return false;
    });
  });
}
