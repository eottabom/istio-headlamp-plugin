/**
 * Istio host string parsing.
 *
 * Istio accepts several shorthand forms for the same service, and a detail view
 * is only useful if it can turn them back into a link to the real object:
 *
 *   reviews                              -> Service in the current namespace
 *   reviews.prod                         -> Service `reviews` in namespace `prod`
 *   reviews.prod.svc.cluster.local       -> the same, fully qualified
 *   prod/reviews.prod.svc.cluster.local  -> namespace-scoped form used by Sidecar egress
 *   *.example.com                        -> external wildcard, not a cluster Service
 */

export interface ParsedHost {
  /** The original string, unchanged. */
  raw: string;
  /** Namespace scope prefix from the `ns/host` form, if present. */
  scope?: string;
  /** Service name, when the host resolves to an in-cluster Service. */
  serviceName?: string;
  /** Namespace of that Service. */
  namespace?: string;
  /** True for `*` or any `*.`-prefixed host. */
  isWildcard: boolean;
  /** True when this looks like an in-cluster Service rather than an external DNS name. */
  isClusterLocal: boolean;
}

const CLUSTER_SUFFIX = '.svc.cluster.local';

export function parseHost(raw: string, defaultNamespace?: string): ParsedHost {
  const result: ParsedHost = { raw, isWildcard: false, isClusterLocal: false };
  if (!raw) return result;

  let host = raw;

  // `ns/host` form (Sidecar egress hosts, exportTo-style references).
  const slash = host.indexOf('/');
  if (slash >= 0) {
    result.scope = host.slice(0, slash);
    host = host.slice(slash + 1);
  }

  if (host === '*' || host.startsWith('*.')) {
    result.isWildcard = true;
    return result;
  }

  if (host.endsWith(CLUSTER_SUFFIX)) {
    const [name, namespace] = host.slice(0, -CLUSTER_SUFFIX.length).split('.');
    if (name && namespace) {
      result.serviceName = name;
      result.namespace = namespace;
      result.isClusterLocal = true;
    }
    return result;
  }

  const parts = host.split('.');
  if (parts.length === 1) {
    // Short name: resolved against the resource's own namespace.
    result.serviceName = parts[0];
    result.namespace = defaultNamespace;
    result.isClusterLocal = Boolean(defaultNamespace);
    return result;
  }

  if (parts.length === 2) {
    // `name.namespace` -- ambiguous with a 2-label external domain, so only
    // treat it as cluster-local when the suffix is not a known public TLD-ish
    // token. Being conservative here is better than producing dead links.
    result.serviceName = parts[0];
    result.namespace = parts[1];
    result.isClusterLocal = !looksLikePublicDomain(host);
    return result;
  }

  // Three or more labels without the cluster suffix: treat as external DNS.
  return result;
}

const COMMON_TLDS = new Set([
  'com',
  'net',
  'org',
  'io',
  'dev',
  'co',
  'ai',
  'app',
  'cloud',
  'kr',
  'jp',
  'us',
  'eu',
  'me',
  'info',
  'biz',
  'gov',
  'edu',
  'xyz',
]);

function looksLikePublicDomain(host: string): boolean {
  const last = host.split('.').pop() ?? '';
  return COMMON_TLDS.has(last.toLowerCase());
}

/** Whether a DestinationRule/VirtualService host targets the given Service. */
export function hostMatchesService(
  host: string,
  serviceName: string,
  serviceNamespace: string,
  hostNamespace?: string
): boolean {
  if (!host) return false;
  if (host === '*') return true;

  const parsed = parseHost(host, hostNamespace);
  if (parsed.isWildcard) {
    const suffix = parsed.raw.replace(/^[^/]*\//, '').slice(1); // drop scope and leading '*'
    return `${serviceName}.${serviceNamespace}${CLUSTER_SUFFIX}`.endsWith(suffix);
  }
  return parsed.serviceName === serviceName && parsed.namespace === serviceNamespace;
}

/** Canonical `name.namespace.svc.cluster.local` for a Service. */
export function serviceFqdn(name: string, namespace: string): string {
  return `${name}.${namespace}${CLUSTER_SUFFIX}`;
}
