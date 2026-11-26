/**
 * PromQL for the Traffic Map, from Istio's standard metrics.
 *
 * Kept free of Headlamp and React imports so it can be tested without a cluster.
 *
 * ztunnel and sidecars report TCP bytes (istio_tcp_*); sidecars report HTTP bytes
 * apart (istio_request_bytes, istio_response_bytes). The destination's report sees
 * every flow into a mesh workload, with the security policy it used. The source's
 * report is kept only for flows no destination reports (those leaving the mesh), with
 * `unless`, so a flow is never counted twice; a sidecar source does not know the policy.
 *
 * rate() drops the metric name, and the sent and received bytes of one flow then share
 * every label, which Prometheus refuses in one vector: each metric is computed apart,
 * tagged with label_replace, and summed.
 *
 * Aggregation and filtering happen in Prometheus: a refresh costs one query whatever
 * the size of the cluster.
 */

const BYTES = [
  'istio_tcp_sent_bytes_total',
  'istio_tcp_received_bytes_total',
  'istio_request_bytes_sum',
  'istio_response_bytes_sum',
];

/** Rate windows, shortest first. */
export const WINDOWS = ['1m', '5m', '15m', '1h'] as const;
export type Window = (typeof WINDOWS)[number];
export const DEFAULT_WINDOW: Window = '5m';

const WL =
  'source_workload_namespace, source_workload, destination_workload_namespace, destination_workload';
const NS = 'source_workload_namespace, destination_workload_namespace';

/** Escape a value for a PromQL label matcher. */
export const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** A regex matching exactly these values, escaped for a PromQL `=~` matcher. */
export const anyOf = (values: string[]) =>
  esc(values.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));

/**
 * `inner` for every flow, or for the flows that start or end in one of `namespaces`:
 * two selectors joined with `or`, which drops the series both return.
 */
function scoped(namespaces: string[], inner: (matchers: string) => string): string {
  if (!namespaces.length) return inner('');
  const ns = anyOf(namespaces);
  return (
    `(${inner(`, source_workload_namespace=~"${ns}"`)} or ` +
    `${inner(`, destination_workload_namespace=~"${ns}"`)})`
  );
}

/** Bytes per second of one metric per workload pair and policy, each flow once. */
function metricFlows(metric: string, window: Window, namespaces: string[]): string {
  const by = `${WL}, connection_security_policy`;
  const rate = (matchers: string) =>
    scoped(namespaces, m => `sum by (${by}) (rate(${metric}{${matchers}${m}}[${window}]))`);
  const dst = rate('reporter="destination"');
  const src = rate('reporter="source", connection_security_policy!="mutual_tls"');
  return `label_replace(${dst} or (${src} unless on (${WL}) ${dst}), "m", "${metric}", "", "")`;
}

function flows(by: string, window: Window, namespaces: string[]): string {
  return `sum by (${by}) (${BYTES.map(m => metricFlows(m, window, namespaces)).join(' or ')})`;
}

/** Bytes per second between namespaces. */
export function namespaceTrafficQuery(window: Window = DEFAULT_WINDOW): string {
  return flows(`${NS}, connection_security_policy`, window, []);
}

/** Bytes per second of the workloads of `namespaces`, with peers in any namespace. */
export function workloadTrafficQuery(namespaces: string[], window = DEFAULT_WINDOW): string {
  return flows(`${WL}, connection_security_policy`, window, namespaces);
}
