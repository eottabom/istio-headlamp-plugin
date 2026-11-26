/**
 * The Prometheus-compatible service Istio metrics are read from, through the API
 * server's service proxy.
 *
 * Kept free of Headlamp and React imports so it can be tested without a cluster;
 * the hook in ./prometheus.ts wires it to the API.
 */

export interface PrometheusEndpoint {
  namespace: string;
  service: string;
  port: string;
  /** Path before `/api/v1`, empty or starting with `/`, e.g. `/select/0/prometheus`. */
  path: string;
}

/** `namespace/service:port/path` -> endpoint; null when it is not an address. */
export function parseAddress(address: unknown): PrometheusEndpoint | null {
  if (typeof address !== 'string') return null;
  const m = address.trim().match(/^([a-z0-9-]+)\/([a-z0-9-]+):([a-z0-9-]+)(\/\S*)?$/);
  if (!m) return null;
  const path = (m[4] ?? '').replace(/\/+$/, '');
  return { namespace: m[1], service: m[2], port: m[3], path };
}

/** A row of the settings: the Prometheus of one or more clusters. */
export interface ClusterPrometheus {
  clusters: string[];
  address: string;
}

/** The Prometheus of `cluster`: the first row naming it with a valid address. */
export function endpointFor(rows: unknown, cluster: string): PrometheusEndpoint | null {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    if (!Array.isArray(row?.clusters) || !row.clusters.includes(cluster)) continue;
    const e = parseAddress(row.address);
    if (e) return e;
  }
  return null;
}

/** API server path to the Prometheus API root of `e`. */
export function proxyPath(e: PrometheusEndpoint): string {
  return `/api/v1/namespaces/${e.namespace}/services/${e.service}:${e.port}/proxy${e.path}`;
}

export function endpointLabel(e: PrometheusEndpoint): string {
  return `${e.namespace}/${e.service}:${e.port}${e.path}`;
}

/** Cheap check that Istio metrics are there: one sample per metric name. */
export const ISTIO_PROBE =
  'group(istio_tcp_connections_opened_total) or group(istio_requests_total)';

export type ProbeResult = 'ok' | 'empty' | 'forbidden' | 'unreachable';

/** A probe response, or the error it threw -> what it says about the service. */
export function probeResult(body: unknown, error?: { status?: number }): ProbeResult {
  if (error) return error.status === 403 ? 'forbidden' : 'unreachable';
  const b = body as { status?: string; data?: { result?: unknown[] } } | undefined;
  if (b?.status !== 'success') return 'unreachable';
  return b.data?.result?.length ? 'ok' : 'empty';
}
