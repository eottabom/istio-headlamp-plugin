import { Utils } from '@kinvolk/headlamp-plugin/lib';
import { useCallback, useEffect, useState } from 'react';
import { promQuery } from '../lib/prometheus';
import { Flow, flowsFromResult } from '../lib/trafficParse';
import { namespaceTrafficQuery, Window, workloadTrafficQuery } from '../lib/trafficQuery';

export interface TrafficData {
  status: 'idle' | 'loading' | 'ready' | 'error';
  flows: Flow[];
  error?: string;
  /** When the data was read, and how long the query took. */
  at?: Date;
  ms?: number;
}

const EMPTY: TrafficData = { status: 'idle', flows: [] };

/** Reads are kept a minute, so going back up a level does not query again. */
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; data: TrafficData }>();

/**
 * Traffic between namespaces (no namespace given) or of the workloads of `namespaces`.
 * One query per read; nothing reads again until `refresh`, or the namespaces or the
 * window change.
 */
export function useTrafficData(prefix: string | null, namespaces: string[], window: Window) {
  const cluster = Utils.getCluster() ?? '';
  const key = `${cluster}|${prefix}|${namespaces.join(',')}|${window}`;
  const [state, setState] = useState({ key: '', data: EMPTY });

  const read = useCallback(
    async (force: boolean) => {
      if (!prefix || !cluster) return;
      const hit = cache.get(key);
      if (!force && hit && Date.now() - hit.at < CACHE_MS) {
        setState({ key, data: hit.data });
        return;
      }
      setState(prev => ({
        key,
        data: { ...(prev.key === key ? prev.data : EMPTY), status: 'loading' },
      }));
      const started = performance.now();
      const byWorkload = namespaces.length > 0;
      try {
        const bytes = await promQuery(
          cluster,
          prefix,
          byWorkload ? workloadTrafficQuery(namespaces, window) : namespaceTrafficQuery(window)
        );
        const data: TrafficData = {
          status: 'ready',
          flows: flowsFromResult(bytes),
          at: new Date(),
          ms: Math.round(performance.now() - started),
        };
        cache.set(key, { at: Date.now(), data });
        setState(prev => (prev.key === key ? { key, data } : prev));
      } catch (e) {
        const error =
          (e as { status?: number }).status === 403
            ? 'Not allowed to read Prometheus through the API server (services/proxy)'
            : (e as Error).message ?? 'query failed';
        setState(prev =>
          prev.key === key ? { key, data: { ...prev.data, status: 'error', error } } : prev
        );
      }
    },
    [key]
  );

  useEffect(() => {
    read(false);
  }, [read]);

  return { ...(state.key === key ? state.data : EMPTY), refresh: () => read(true) };
}
