import { WAYPOINT_FOR } from './labels';
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
  /** No L7 requirements and no targetRef; classifies the policy as L4-only. */
  | { state: 'l4'; requirements: [] }
  /** Not an ambient mesh; the sidecars of the selected workloads enforce L7. */
  | { state: 'sidecar'; requirements: string[] }
  /** The targets attach to programmed, addressed waypoint or gateway proxies. */
  | { state: 'covered'; requirements: string[]; via: string[]; through: 'waypoint' | 'gateway' }
  /** A targetRef names something that does not exist, so nothing enforces it. */
  | { state: 'dangling'; requirements: string[]; missing: string[]; targetKind: string }
  /** ztunnel has to enforce this, and L7 conditions make it deny everything. */
  | { state: 'ztunnel-denies'; requirements: string[]; reason: string }
  /**
   * Attached by targetRef to Services that route through no waypoint, so the
   * policy binds to nothing and no proxy applies it. Unlike the ztunnel case
   * the traffic is not denied, it is simply unpoliced.
   */
  | {
      state: 'unenforced';
      requirements: string[];
      /** Targeted Services whose traffic does not pass through a suitable waypoint. */
      services: string[];
      /** Waypoints that only handle workload traffic, when relevant. */
      incompatibleWaypoints?: string[];
    };

export interface L7Subject {
  metadata: { namespace?: string };
  l7Requirements: string[];
  targetRefs: Array<{ group?: string; kind?: string; name?: string; namespace?: string }>;
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
  /**
   * Whether the mesh could not be read rather than read as non-ambient. False
   * here means sidecars enforce the policy, which is the opposite of not
   * knowing, so the two cannot share a flag.
   */
  ambientUnknown?: boolean;
  /** Namespaces the DaemonSet listing was refused in, to name in the reason. */
  ambientUnknownNamespaces?: string[];
  loading: boolean;
  waypoints: Array<{
    metadata: {
      name: string;
      namespace?: string;
      uid?: string;
      generation?: number;
      labels?: Record<string, string>;
    };
    jsonData?: { status?: GatewayStatus };
  }>;
  gateways: Array<{
    metadata: { name: string; namespace?: string; uid?: string; generation?: number };
    jsonData?: { status?: GatewayStatus };
  }>;
  /** Gateway API resources were not readable. */
  gatewayUnknown?: boolean;
  /** Gateway API resources are still loading. */
  gatewayLoading?: boolean;
  /** null means not readable: still loading, or RBAC refused it. */
  namespaces: Array<{ metadata: { name: string; labels?: Record<string, string> } }> | null;
  services: Array<{
    metadata: { name: string; namespace?: string; labels?: Record<string, string> };
  }> | null;
}

interface GatewayStatus {
  addresses?: unknown[];
  conditions?: Array<{ type?: string; status?: string; observedGeneration?: number }>;
}

/**
 * A Programmed condition only confirms the current Gateway when its
 * observedGeneration matches metadata.generation. Gateway API recommends this
 * check to avoid relying on stale status; see:
 * https://gateway-api.sigs.k8s.io/docs/concepts/troubleshooting/
 * https://gateway-api.sigs.k8s.io/guides/implementers-guide/
 *
 * Be conservative when either generation is unavailable: the condition may
 * describe an older spec, so the caller must treat programming as unknown.
 */
function hasProgrammedAddress(gateway: {
  metadata?: { generation?: number };
  jsonData?: { status?: GatewayStatus };
}): boolean {
  const status = gateway.jsonData?.status;
  const generation = gateway.metadata?.generation;
  const programmed = status?.conditions?.find(c => c.type === 'Programmed');

  return (
    Boolean(status?.addresses?.length) &&
    Number.isSafeInteger(generation) &&
    Number.isSafeInteger(programmed?.observedGeneration) &&
    programmed?.observedGeneration === generation &&
    programmed?.status === 'True'
  );
}

export function resolveL7Coverage(policy: L7Subject, inputs: L7Inputs): L7Coverage {
  const {
    ambientEnabled,
    ambientUnknown,
    ambientUnknownNamespaces,
    loading,
    waypoints,
    gateways,
    gatewayUnknown,
    gatewayLoading,
    namespaces,
    services,
  } = inputs;

  const requirements = policy.l7Requirements;
  // L4 attributes do not make a targetRef policy a ztunnel policy. It still
  // needs the Service or Gateway named by the targetRef to bind to a proxy.
  if (requirements.length === 0 && policy.attachmentKind !== 'targetRef') {
    return { state: 'l4', requirements: [] };
  }

  // Saying "enforced" or "denied" on half-loaded data is the one answer that
  // is never recoverable by looking again, so refuse to answer instead.
  if (loading) {
    return { state: 'unknown', requirements, reason: 'still reading the mesh state' };
  }

  // An unread ztunnel is not a sidecar mesh. Answering "enforced by sidecars"
  // here would reassure someone whose ambient mesh has ztunnel denying this
  // policy outright.
  if (ambientUnknown) {
    const where = (ambientUnknownNamespaces ?? []).join(', ');
    return {
      state: 'unknown',
      requirements,
      reason: where
        ? `cannot list DaemonSets in ${where}, so ambient mode is unconfirmed`
        : 'ambient mode could not be confirmed',
    };
  }

  if (!ambientEnabled && policy.attachmentKind !== 'targetRef') {
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

  // GatewayClass and ServiceEntry attachments are valid Istio API, but this
  // decision does not read those resources. Mixed kinds also need separate
  // attachment checks; neither case can be called covered from one kind alone.
  const kinds = [...new Set(targets.map(t => t.kind ?? 'Service'))];
  if (
    kinds.length !== 1 ||
    !['Gateway', 'Service'].includes(kinds[0]) ||
    targets.some(
      t =>
        !t.name ||
        (t.namespace !== undefined && t.namespace !== policyNs) ||
        (t.kind === 'Gateway'
          ? t.group !== undefined && t.group !== 'gateway.networking.k8s.io'
          : t.group !== undefined && !['', 'core'].includes(t.group))
    )
  ) {
    return {
      state: 'unknown',
      requirements,
      reason: 'the targetRefs include mixed, unsupported, or invalid resource references',
    };
  }

  // Checked after the references themselves, so an invalid targetRef is
  // reported as such even on a cluster where Gateways cannot be listed.
  if (gatewayLoading || gatewayUnknown) {
    return {
      state: 'unknown',
      requirements,
      reason: 'the Gateway list needed to verify waypoint attachment is unavailable',
    };
  }

  if (!ambientEnabled && kinds[0] === 'Service') {
    return {
      state: 'unknown',
      requirements,
      reason: 'a Service targetRef requires a waypoint, but ambient mode was not detected',
    };
  }

  // A targetRef pointing at a Gateway is enforced by that Gateway's proxy.
  // Both kinds count: a waypoint, and an ingress/egress gateway, which is a
  // full Envoy doing L7 in its own right.
  if (kinds[0] === 'Gateway') {
    const gatewayTargets = targets;
    const matched = gateways.filter(g =>
      gatewayTargets.some(
        t => t.name === g.metadata.name && (t.namespace ?? policyNs) === g.metadata.namespace
      )
    );
    const missingGateways = gatewayTargets.filter(
      t =>
        !matched.some(
          g => t.name === g.metadata.name && (t.namespace ?? policyNs) === g.metadata.namespace
        )
    );
    if (missingGateways.length > 0) {
      return {
        state: 'dangling',
        requirements,
        missing: missingGateways.map(t => `${t.namespace ?? policyNs}/${t.name}`),
        targetKind: 'Gateway',
      };
    }
    if (matched.length > 0) {
      if (matched.some(g => !hasProgrammedAddress(g))) {
        return {
          state: 'unknown',
          requirements,
          reason: 'a targeted Gateway has no confirmed programmed address',
        };
      }
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

  const missingServices = serviceTargets.filter(
    t =>
      !targetedServices.some(
        svc => t.name === svc.metadata.name && (t.namespace ?? policyNs) === svc.metadata.namespace
      )
  );

  if (missingServices.length > 0) {
    return {
      state: 'dangling',
      requirements,
      missing: missingServices.map(t => `${t.namespace ?? policyNs}/${t.name}`),
      targetKind: 'Service',
    };
  }

  const bindings = targetedServices.map(svc => resolveWaypoint(svc as any, ns as any));

  // A use-waypoint label is a string, not a guarantee. Checking it against the
  // Gateways that exist is what separates "a waypoint handles this" from "a
  // label mentions a waypoint", and a typo produces exactly the second.
  const backing = (b: (typeof bindings)[number]) =>
    waypoints.find(
      w => w.metadata.name === b.name && w.metadata.namespace === (b.namespace ?? policyNs)
    );
  if (
    bindings.some(b => b.name && !b.disabled && backing(b) && !hasProgrammedAddress(backing(b)!))
  ) {
    return {
      state: 'unknown',
      requirements,
      reason: 'a targeted Service names a waypoint without a confirmed programmed address',
    };
  }
  const live = bindings.filter(b => b.name && !b.disabled && backing(b));

  // A waypoint labelled waypoint-for=workload (or none) never sees traffic
  // addressed to a Service, so istiod does not bind the Service to it. The
  // label names a real waypoint, which is what made this read as covered.
  const serviceWaypoint = (b: (typeof bindings)[number]) => {
    const handles = backing(b)?.metadata.labels?.[WAYPOINT_FOR] ?? 'service';
    return handles === 'service' || handles === 'all';
  };
  const wrongKind = live.filter(b => !serviceWaypoint(b));

  if (live.length === bindings.length && live.length > 0 && wrongKind.length === 0) {
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

  // A targetRef for a Service whose traffic bypasses its waypoint is not handed
  // to ztunnel. Name every affected Service, including those pointing to a
  // workload-only waypoint, so mixed targets do not hide an unenforced policy.
  const unenrolled = targetedServices
    .filter((_, i) => !live.includes(bindings[i]) || wrongKind.includes(bindings[i]))
    .map(svc => `${svc.metadata.namespace ?? policyNs}/${svc.metadata.name}`);
  return {
    state: 'unenforced',
    requirements,
    services: unenrolled,
    incompatibleWaypoints: [...new Set(wrongKind.map(b => `${b.namespace ?? policyNs}/${b.name}`))],
  };
}
