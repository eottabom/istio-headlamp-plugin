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
  /** A waypoint or an ingress/egress gateway terminates L7 for these targets. */
  | { state: 'covered'; requirements: string[]; via: string[]; through: 'waypoint' | 'gateway' }
  /** targetRefs name a Gateway that does not exist, so nothing is enforced. */
  | { state: 'dangling'; requirements: string[]; missing: string[] }
  | { state: 'uncovered'; requirements: string[] };

export interface L7Subject {
  metadata: { namespace?: string };
  l7Requirements: string[];
  targetRefs: Array<{ kind?: string; name?: string; namespace?: string }>;
}

export function useL7Coverage(policy: L7Subject): L7Coverage {
  const { ambientEnabled, waypoints, gateways } = useMeshStatus();
  const [namespaces] = K8s.ResourceClasses.Namespace.useList();
  const [services] = K8s.ResourceClasses.Service.useList({ namespace: policy.metadata.namespace });

  const requirements = policy.l7Requirements;
  if (requirements.length === 0) return { state: 'l4', requirements: [] };

  // Sidecars handle L7 themselves, so the question does not arise.
  if (!ambientEnabled) return { state: 'sidecar', requirements };

  const targets = policy.targetRefs;
  const policyNs = policy.metadata.namespace;

  // A targetRef pointing at a Gateway is enforced by that Gateway's proxy.
  //
  // Both kinds count: a waypoint, and an ingress/egress gateway. A gateway is a
  // full Envoy doing L7 in its own right, so requiring a waypoint there raised
  // a false "not enforced" alarm on perfectly good ext-authz policies.
  const gatewayTargets = targets.filter(t => (t.kind ?? '') === 'Gateway');
  if (gatewayTargets.length > 0) {
    const matched = gateways.filter(g =>
      gatewayTargets.some(
        t => t.name === g.metadata.name && (t.namespace ?? policyNs) === g.metadata.namespace
      )
    );
    if (matched.length > 0) {
      const allWaypoints = matched.every(g => waypoints.some(w => w.metadata.uid === g.metadata.uid));
      return {
        state: 'covered',
        requirements,
        via: matched.map(g => g.metadata.name),
        through: allWaypoints ? 'waypoint' : 'gateway',
      };
    }
    return {
      state: 'dangling',
      requirements,
      missing: gatewayTargets.map(t => `${t.namespace ?? policyNs}/${t.name}`),
    };
  }

  const ns = (namespaces ?? []).find(n => n.metadata.name === policyNs) ?? null;
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
      via: [...new Set(covered.map(b => b.name as string))],
      through: 'waypoint',
    };
  }
  return { state: 'uncovered', requirements };
}
