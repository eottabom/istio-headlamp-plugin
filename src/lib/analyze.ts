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

/**
 * One line per `to.operation`, e.g. `GET /api/*` or `DELETE /admin/*`.
 *
 * This is what makes a policy findable by the path it guards: Headlamp's table
 * search matches a column's value, so unless the paths appear in a column,
 * searching "/admin" finds nothing.
 */
export function authorizationOperations(rules: AuthorizationRule[] | undefined): string[] {
  const out: string[] = [];

  rules?.forEach(rule => {
    if (!rule.to?.length) {
      out.push('any operation');
      return;
    }
    rule.to.forEach(to => {
      const op = to.operation ?? {};
      const methods = join(op.methods, op.notMethods);
      const paths = join(op.paths, op.notPaths);
      const hosts = join(op.hosts, op.notHosts);
      const ports = join(op.ports, op.notPorts);

      const parts = [methods, paths, hosts ? `host=${hosts}` : '', ports ? `:${ports}` : ''].filter(
        Boolean
      );
      out.push(parts.length > 0 ? parts.join(' ') : 'any operation');
    });
  });

  return [...new Set(out)];
}

function join(allow?: string[], deny?: string[]): string {
  return [...(allow ?? []), ...(deny ?? []).map(v => `!${v}`)].join(',');
}

/**
 * A short, fixed-size version of {@link authorizationOperations}.
 *
 * Real ext-authz policies routinely list fifty or more paths. Printing them all
 * in a table cell makes a single row taller than the viewport, so the cell shows
 * counts while {@link authorizationOperations} keeps the full text for search.
 */
export function authorizationOperationsBrief(
  rules: AuthorizationRule[] | undefined,
  inlineLimit = 2
): string[] {
  const out: string[] = [];

  rules?.forEach(rule => {
    if (!rule.to?.length) {
      out.push('any operation');
      return;
    }
    rule.to.forEach(to => {
      const op = to.operation ?? {};
      const parts = [
        join(op.methods, op.notMethods),
        summarise(op.paths, 'path', inlineLimit),
        op.notPaths?.length ? `(${op.notPaths.length} excluded)` : '',
        summarise(op.hosts, 'host', inlineLimit),
        op.ports?.length ? `:${op.ports.join(',')}` : '',
      ].filter(Boolean);
      out.push(parts.length > 0 ? parts.join(' ') : 'any operation');
    });
  });

  return [...new Set(out)];
}

function summarise(values: string[] | undefined, noun: string, limit: number): string {
  if (!values || values.length === 0) return '';
  if (values.length <= limit) return values.join(',');
  return `${values.length} ${noun}s`;
}

/** Every string an authorization rule matches on, flattened. */
export function ruleSearchTerms(rule: AuthorizationRule): string[] {
  const out: string[] = [];
  const push = (v?: string[]) => v && out.push(...v);

  rule.from?.forEach(f => {
    const s = f.source ?? {};
    push(s.principals);
    push(s.notPrincipals);
    push(s.namespaces);
    push(s.notNamespaces);
    push(s.requestPrincipals);
    push(s.notRequestPrincipals);
    push(s.ipBlocks);
    push(s.notIpBlocks);
    push(s.remoteIpBlocks);
    push(s.notRemoteIpBlocks);
    push(s.serviceAccounts);
    push(s.notServiceAccounts);
  });
  rule.to?.forEach(t => {
    const op = t.operation ?? {};
    push(op.methods);
    push(op.notMethods);
    push(op.paths);
    push(op.notPaths);
    push(op.hosts);
    push(op.notHosts);
    push(op.ports);
    push(op.notPorts);
  });
  rule.when?.forEach(c => {
    if (c.key) out.push(c.key);
    push(c.values);
    push(c.notValues);
  });

  return out;
}

/** Does a rule mention `filter` anywhere? Case-insensitive substring match. */
export function ruleMatches(rule: AuthorizationRule, filter: string): boolean {
  if (!filter) return true;
  const needle = filter.toLowerCase();
  return ruleSearchTerms(rule).some(term => term.toLowerCase().includes(needle));
}

/* ---------------------------------- ServiceEntry ---------------------------------- */

export interface ServiceEntryLike {
  hosts?: string[];
  ports?: Array<{ number?: number; protocol?: string; name?: string }>;
  resolution?: string;
  endpoints?: unknown[];
  /** Selects Pods or WorkloadEntries in place of inline endpoints. */
  workloadSelector?: WorkloadSelector;
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
  // workloadSelector is the other half of STATIC: it picks up Pods and
  // WorkloadEntries by label instead of listing addresses inline. Warning on it
  // flagged a perfectly ordinary VM-onboarding config as broken.
  const hasSelector = Object.keys(spec.workloadSelector?.matchLabels ?? {}).length > 0;
  if (
    spec.resolution === 'STATIC' &&
    !hasSelector &&
    (!spec.endpoints || spec.endpoints.length === 0)
  ) {
    return 'resolution is STATIC with neither endpoints nor a workloadSelector; traffic will not be routed.';
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
