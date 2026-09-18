import { resolveWaypoint } from './mesh';

/**
 * Whether an AuthorizationPolicy's L7 rules are actually enforced.
 *
 * Two rules from Istio drive everything here, and getting either wrong makes
 * this check worse than useless, because it reassures rather than warns:
 *
 *  1. A waypoint only enforces a policy **attached by targetRef**. A policy
 *     that uses a workload selector, or neither selector nor targetRef, is
 *     enforced by ztunnel no matter which waypoint the namespace points at.
 *
 *  2. ztunnel cannot evaluate L7. Faced with L7 conditions it does not
 *     silently ignore them: the policy **fails closed and denies**.
 *
 * So the dangerous case is not "rules quietly skipped", it is traffic being
 * dropped by a policy the author believed a waypoint was handling.
 *
 * @see https://istio.io/latest/docs/ambient/usage/l7-features/
 */
export type L7Coverage =
  /** Not enough was readable to judge: still loading, or RBAC hid something. */
  | { state: 'unknown'; requirements: string[]; reason: string }
  /** No L7 conditions, so ztunnel alone can enforce it. */
  | { state: 'l4'; requirements: [] }
  /** Not an ambient mesh; the sidecars of the selected workloads enforce L7. */
  | { state: 'sidecar'; requirements: string[] }
  /** A waypoint or an ingress/egress gateway terminates L7 for these targets. */
  | { state: 'covered'; requirements: string[]; via: string[]; through: 'waypoint' | 'gateway' }
  /** A targetRef names something that does not exist, so nothing enforces it. */
  | { state: 'dangling'; requirements: string[]; missing: string[]; targetKind: string }
  /** ztunnel has to enforce this, and L7 conditions make it deny everything. */
  | { state: 'ztunnel-denies'; requirements: string[]; reason: string };

export interface L7Subject {
  metadata: { namespace?: string };
  l7Requirements: string[];
  targetRefs: Array<{ kind?: string; name?: string; namespace?: string }>;
  /** `targetRef`, `selector` or `namespace`, as Istio resolves attachment. */
  attachmentKind: 'targetRef' | 'selector' | 'namespace';
}

/**
 * What the hook reads from the cluster. Split out so the decision itself is a
 * pure function: this is the logic that decides whether the UI tells someone
 * their security policy is in force, and it has to be testable against the
 * failure and mixed cases, not only the happy path.
 */
export interface L7Inputs {
  ambientEnabled: boolean;
  loading: boolean;
  waypoints: Array<{ metadata: { name: string; namespace?: string; uid?: string } }>;
  gateways: Array<{ metadata: { name: string; namespace?: string; uid?: string } }>;
  /** null means not readable: still loading, or RBAC refused it. */
  namespaces: Array<{ metadata: { name: string; labels?: Record<string, string> } }> | null;
  services: Array<{
    metadata: { name: string; namespace?: string; labels?: Record<string, string> };
  }> | null;
}

export function resolveL7Coverage(policy: L7Subject, inputs: L7Inputs): L7Coverage {
  const { ambientEnabled, loading, waypoints, gateways, namespaces, services } = inputs;

  const requirements = policy.l7Requirements;
  if (requirements.length === 0) return { state: 'l4', requirements: [] };

  // Saying "enforced" or "denied" on half-loaded data is the one answer that
  // is never recoverable by looking again, so refuse to answer instead.
  if (loading) {
    return { state: 'unknown', requirements, reason: 'still reading the mesh state' };
  }

  if (!ambientEnabled) {
    return { state: 'sidecar', requirements };
  }

  const policyNs = policy.metadata.namespace;

  // Attachment decides the enforcement point before anything else does.
  //
  // Only a targetRef puts a policy on a waypoint. A selector-based policy, and
  // a namespace-wide one, are ztunnel's regardless of any use-waypoint label on
  // the namespace, which is why reading that label here used to report a
  // waypoint that never sees the policy.
  if (policy.attachmentKind !== 'targetRef') {
    return {
      state: 'ztunnel-denies',
      requirements,
      reason:
        policy.attachmentKind === 'selector'
          ? 'the policy uses a workload selector, which attaches it to ztunnel rather than a waypoint'
          : 'the policy has neither selector nor targetRef, so it applies through ztunnel',
    };
  }

  const targets = policy.targetRefs;

  // A targetRef pointing at a Gateway is enforced by that Gateway's proxy.
  // Both kinds count: a waypoint, and an ingress/egress gateway, which is a
  // full Envoy doing L7 in its own right.
  const gatewayTargets = targets.filter(t => (t.kind ?? '') === 'Gateway');
  if (gatewayTargets.length > 0) {
    const matched = gateways.filter(g =>
      gatewayTargets.some(
        t => t.name === g.metadata.name && (t.namespace ?? policyNs) === g.metadata.namespace
      )
    );
    if (matched.length > 0) {
      const allWaypoints = matched.every(g =>
        waypoints.some(w => w.metadata.uid === g.metadata.uid)
      );
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
      targetKind: 'Gateway',
    };
  }

  // From here the targetRef names Services, and answering needs both the
  // Services and the namespace that supplies the default waypoint.
  if (namespaces === null || services === null) {
    return {
      state: 'unknown',
      requirements,
      reason: 'the Services or Namespaces this policy targets could not be read',
    };
  }

  const ns = namespaces.find(n => n.metadata.name === policyNs) ?? null;

  // Namespace matters as much as name: the Service list is scoped to the
  // policy's own namespace, so matching on name alone let a targetRef pointing
  // at another namespace bind to the local Service of that name.
  const serviceTargets = targets.filter(t => (t.kind ?? 'Service') === 'Service');
  const targetedServices = services.filter(svc =>
    serviceTargets.some(
      t => t.name === svc.metadata.name && (t.namespace ?? policyNs) === svc.metadata.namespace
    )
  );

  if (targetedServices.length === 0) {
    return {
      state: 'dangling',
      requirements,
      missing: serviceTargets.map(t => `${t.namespace ?? policyNs}/${t.name}`),
      targetKind: 'Service',
    };
  }

  const bindings = targetedServices.map(svc => resolveWaypoint(svc as any, ns as any));

  // A use-waypoint label is a string, not a guarantee. Checking it against the
  // Gateways that exist is what separates "a waypoint handles this" from "a
  // label mentions a waypoint", and a typo produces exactly the second.
  const live = bindings.filter(
    b =>
      b.name &&
      !b.disabled &&
      waypoints.some(
        w => w.metadata.name === b.name && w.metadata.namespace === (b.namespace ?? policyNs)
      )
  );

  if (live.length === bindings.length && live.length > 0) {
    return {
      state: 'covered',
      requirements,
      via: [...new Set(live.map(b => b.name as string))],
      through: 'waypoint',
    };
  }

  const named = bindings.filter(b => b.name && !b.disabled);
  if (named.length > live.length) {
    return {
      state: 'dangling',
      requirements,
      missing: [
        ...new Set(
          named.filter(b => !live.includes(b)).map(b => `${b.namespace ?? policyNs}/${b.name}`)
        ),
      ],
      targetKind: 'waypoint Gateway',
    };
  }

  // The targeted Services exist but route through no waypoint, so ztunnel is
  // the enforcement point and the L7 conditions make it deny.
  return {
    state: 'ztunnel-denies',
    requirements,
    reason: 'the targeted Services are not enrolled with a waypoint',
  };
}
