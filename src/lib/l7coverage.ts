import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { useMeshStatus } from './detect';
import { resolveWaypoint } from './mesh';

/**
 * Whether an AuthorizationPolicy's L7 rules are actually enforced.
 *
 * Shared by the header chip and the detail section so the two can never
 * disagree: deriving the chip from `requiresL7` alone said "needs a waypoint"
 * even when a waypoint was present, directly contradicting the section below it.
 */
export type L7Coverage =
  | { state: 'l4'; requirements: [] }
  | { state: 'sidecar'; requirements: string[] }
  | { state: 'covered'; requirements: string[]; waypoints: string[] }
  | { state: 'uncovered'; requirements: string[] };

export interface L7Subject {
  metadata: { namespace?: string };
  l7Requirements: string[];
  targetRefs: Array<{ kind?: string; name?: string; namespace?: string }>;
}

export function useL7Coverage(policy: L7Subject): L7Coverage {
  const { ambientEnabled, waypoints } = useMeshStatus();
  const [namespaces] = K8s.ResourceClasses.Namespace.useList();
  const [services] = K8s.ResourceClasses.Service.useList({ namespace: policy.metadata.namespace });

  const requirements = policy.l7Requirements;
  if (requirements.length === 0) return { state: 'l4', requirements: [] };

  // Sidecars handle L7 themselves, so the question does not arise.
  if (!ambientEnabled) return { state: 'sidecar', requirements };

  const targets = policy.targetRefs;

  // A targetRef pointing straight at a waypoint Gateway is already correct.
  const named = waypoints.filter(w =>
    targets.some(t => t.kind === 'Gateway' && w.metadata.name === t.name)
  );
  if (named.length > 0) {
    return { state: 'covered', requirements, waypoints: named.map(w => w.metadata.name) };
  }

  const ns = (namespaces ?? []).find(n => n.metadata.name === policy.metadata.namespace) ?? null;
  const targetedServices = (services ?? []).filter(svc =>
    targets.some(t => (t.kind ?? 'Service') === 'Service' && t.name === svc.metadata.name)
  );

  // With no Service targetRefs the policy is namespace-wide, so the namespace
  // default waypoint is what decides.
  const bindings = (targetedServices.length > 0 ? targetedServices : [null]).map(svc =>
    resolveWaypoint(svc as any, ns as any)
  );
  const covered = bindings.filter(b => b.name && !b.disabled);

  if (covered.length > 0 && covered.length === bindings.length) {
    return {
      state: 'covered',
      requirements,
      waypoints: [...new Set(covered.map(b => b.name as string))],
    };
  }
  return { state: 'uncovered', requirements };
}
