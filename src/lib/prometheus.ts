import { ApiProxy, Utils } from '@kinvolk/headlamp-plugin/lib';
import { useEffect, useState } from 'react';
import {
  endpointFor,
  ISTIO_PROBE,
  ProbeResult,
  probeResult,
  PrometheusEndpoint,
  proxyPath,
} from './prometheusParse';
import { settingsStore } from './settings';

export type PrometheusState =
  | { state: 'unset' }
  | { state: 'checking' }
  /** The service answered: `ok` has Istio metrics, the others say what is wrong. */
  | { state: ProbeResult; endpoint: PrometheusEndpoint };

/** One probe per cluster and address, shared by every component that asks. */
const probes = new Map<string, Promise<ProbeResult>>();

async function probe(cluster: string, e: PrometheusEndpoint): Promise<ProbeResult> {
  try {
    const body = await ApiProxy.clusterRequest(
      `${proxyPath(e)}/api/v1/query?query=${encodeURIComponent(ISTIO_PROBE)}`,
      { cluster, timeout: 10_000 }
    );
    return probeResult(body);
  } catch (err) {
    return probeResult(undefined, err as { status?: number });
  }
}

/** The Prometheus set for this cluster in the plugin's settings, checked once for Istio metrics. */
export function usePrometheus(): PrometheusState {
  const cluster = Utils.getCluster() ?? '';
  const endpoint = endpointFor(settingsStore.useConfig()()?.prometheus, cluster);
  const key = endpoint ? `${cluster}|${proxyPath(endpoint)}` : '';
  const [result, setResult] = useState<{ key: string; probe: ProbeResult } | null>(null);

  useEffect(() => {
    if (!cluster || !endpoint) return;
    let alive = true;
    if (!probes.has(key)) probes.set(key, probe(cluster, endpoint));
    probes.get(key)!.then(r => alive && setResult({ key, probe: r }));
    return () => {
      alive = false;
    };
  }, [key]);

  if (!endpoint) return { state: 'unset' };
  if (result?.key !== key) return { state: 'checking' };
  return { state: result.probe, endpoint };
}

/** Instant query; throws the API error (with its `status`) or the Prometheus error. */
export async function promQuery(cluster: string, prefix: string, expr: string): Promise<any[]> {
  const body = await ApiProxy.clusterRequest(
    `${prefix}/api/v1/query?query=${encodeURIComponent(expr)}`,
    { cluster, timeout: 30_000 }
  );
  if (body?.status !== 'success') throw new Error(body?.error ?? 'query failed');
  return body.data?.result ?? [];
}
