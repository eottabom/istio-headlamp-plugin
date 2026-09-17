/**
 * Pure analysis of Istio specs.
 *
 * Deliberately free of Headlamp and React imports: these are the rules that
 * decide what the UI claims about a resource (which enforcement layer a policy
 * needs, whether a ServiceEntry silently routes nothing), so they are the parts
 * most worth testing directly against real cluster output.
 */

import { AuthorizationRule, PolicyTargetReference, WorkloadSelector } from '../resources/types';

/* ----------------------------------- attachment ----------------------------------- */

export interface Attachable {
  selector?: WorkloadSelector;
  targetRef?: PolicyTargetReference;
  targetRefs?: PolicyTargetReference[];
}

/** Normalised list of Gateway-API style target references. */
export function normaliseTargetRefs(spec: Attachable | undefined): PolicyTargetReference[] {
  if (!spec) return [];
  if (Array.isArray(spec.targetRefs) && spec.targetRefs.length > 0) return spec.targetRefs;
  return spec.targetRef ? [spec.targetRef] : [];
}

export type AttachmentKind = 'targetRef' | 'selector' | 'namespace';

/**
 * How a resource picks the workloads it applies to. Ambient-era resources use
 * targetRefs; sidecar-era ones use a label selector; neither means the whole
 * namespace (or the whole mesh, in the root namespace).
 */
export function attachmentKind(spec: Attachable | undefined): AttachmentKind {
  if (normaliseTargetRefs(spec).length > 0) return 'targetRef';
  const labels = spec?.selector?.matchLabels;
  if (labels && Object.keys(labels).length > 0) return 'selector';
  return 'namespace';
}

/* ------------------------------- AuthorizationPolicy ------------------------------- */

/**
 * Operation fields ztunnel cannot evaluate. Ports and IP blocks are L4 and are
 * enforced everywhere; these require a proxy that parses the request.
 *
 * @see https://istio.io/latest/docs/ambient/usage/l7-features/
 */
const L7_OPERATION_FIELDS = ['hosts', 'notHosts', 'methods', 'notMethods', 'paths', 'notPaths'];

const L7_CONDITION_PREFIXES = [
  'request.headers',
  'request.auth',
  'request.url_path',
  'request.host',
  'request.method',
  'connection.sni',
  'experimental.envoy.filters',
];

/**
 * Rule paths that require L7 processing, e.g.
 * `rules[0].to[0].operation.methods`. Empty means ztunnel alone can enforce the
 * policy, so no waypoint is needed.
 */
export function l7Requirements(rules: AuthorizationRule[] | undefined): string[] {
  const found: string[] = [];
  rules?.forEach((rule, ri) => {
    rule.to?.forEach((to, ti) => {
      L7_OPERATION_FIELDS.forEach(field => {
        const value = (to.operation as Record<string, unknown> | undefined)?.[field];
        if (Array.isArray(value) && value.length > 0) {
          found.push(`rules[${ri}].to[${ti}].operation.${field}`);
        }
      });
    });
    rule.when?.forEach((cond, ci) => {
      const key = cond.key ?? '';
      if (L7_CONDITION_PREFIXES.some(p => key.startsWith(p))) {
        found.push(`rules[${ri}].when[${ci}].key = ${key}`);
      }
    });
    rule.from?.forEach((from, fi) => {
      if (from.source?.requestPrincipals?.length || from.source?.notRequestPrincipals?.length) {
        found.push(`rules[${ri}].from[${fi}].source.requestPrincipals (JWT)`);
      }
    });
  });
  return found;
}

/* ---------------------------------- ServiceEntry ---------------------------------- */

export interface ServiceEntryLike {
  hosts?: string[];
  ports?: Array<{ number?: number; protocol?: string; name?: string }>;
  resolution?: string;
  endpoints?: unknown[];
}

/** `443/TLS (https)` style summaries for the list and header views. */
export function serviceEntryPortSummary(spec: ServiceEntryLike | undefined): string[] {
  return (spec?.ports ?? []).map(
    p => [p.number, p.protocol].filter(Boolean).join('/') + (p.name ? ` (${p.name})` : '')
  );
}

/**
 * Combinations that are accepted by the API server but route nothing. Istio
 * does not reject or warn about these, which is why they belong on the page.
 */
export function serviceEntryWarning(spec: ServiceEntryLike | undefined): string | undefined {
  if (!spec?.hosts || spec.hosts.length === 0) {
    return 'No hosts defined; this entry matches nothing.';
  }
  if (spec.resolution === 'STATIC' && (!spec.endpoints || spec.endpoints.length === 0)) {
    return 'resolution is STATIC but no endpoints are defined; traffic will not be routed.';
  }
  if (!spec.ports || spec.ports.length === 0) {
    return 'No ports defined; traffic to this host will not match any listener.';
  }
  return undefined;
}

/* --------------------------------- VirtualService --------------------------------- */

export interface RouteList {
  route?: Array<{ destination?: { host?: string } }>;
}

/** Every destination host referenced by any HTTP, TLS or TCP route. */
export function collectDestinationHosts(spec: {
  http?: RouteList[];
  tls?: RouteList[];
  tcp?: RouteList[];
}): string[] {
  const hosts = new Set<string>();
  [spec.http, spec.tls, spec.tcp].forEach(routes =>
    routes?.forEach(r =>
      r.route?.forEach(d => d.destination?.host && hosts.add(d.destination.host))
    )
  );
  return [...hosts];
}

/* -------------------------------- DestinationRule -------------------------------- */

export function loadBalancerName(
  lb: { simple?: string; consistentHash?: unknown } | undefined
): string | undefined {
  if (!lb) return undefined;
  if (lb.simple) return String(lb.simple);
  if (lb.consistentHash) return 'CONSISTENT_HASH';
  return undefined;
}

/* ------------------------------------ shared ------------------------------------ */

export function describeExportTo(exportTo?: string[]): string {
  if (!exportTo || exportTo.length === 0) return 'All namespaces (default)';
  return exportTo
    .map(v => (v === '.' ? '. (this namespace)' : v === '*' ? '* (all namespaces)' : v))
    .join(', ');
}
