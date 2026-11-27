/**
 * Prometheus responses of ./trafficQuery.ts -> flows.
 *
 * Kept free of Headlamp and React imports so it can be tested without a cluster.
 */

/** Ends of a flow outside the mesh: an unknown source, an unknown destination. */
export const OUTSIDE_IN = 'outside-in';
export const OUTSIDE_OUT = 'outside-out';
export const isOutside = (peer: string) => peer === OUTSIDE_IN || peer === OUTSIDE_OUT;

export type Security = 'mtls' | 'plaintext';

interface Ends {
  /** `namespace`, `namespace/workload`, OUTSIDE_IN or OUTSIDE_OUT. */
  source: string;
  target: string;
  /** The `app` label of each end, when the series has it. */
  sourceApp?: string;
  targetApp?: string;
}

export interface Flow extends Ends {
  security: Security;
  bytesPerSec: number;
}

type Labels = Record<string, string | undefined>;
interface Sample {
  metric?: Labels;
  value?: [number, string];
}

const unknown = (v: string | undefined) => !v || v === 'unknown';

/** One end of a series: `ns/workload` when it has workload labels, else `ns`. */
function peerOf(m: Labels, side: 'source' | 'destination', outside: string): string {
  const ns = m[`${side}_workload_namespace`];
  if (unknown(ns)) return outside;
  if (!(`${side}_workload` in m)) return ns!;
  const wl = m[`${side}_workload`];
  return unknown(wl) ? outside : `${ns}/${wl}`;
}

/** Both ends and the rate of a series; null for a zero rate or two unknown ends. */
function read(s: Sample): { m: Labels; rate: number; ends: Ends } | null {
  const m = s.metric ?? {};
  const rate = Number(s.value?.[1] ?? 0);
  const ends: Ends = {
    source: peerOf(m, 'source', OUTSIDE_IN),
    target: peerOf(m, 'destination', OUTSIDE_OUT),
  };
  if (!(rate > 0) || (isOutside(ends.source) && isOutside(ends.target))) return null;
  if (!unknown(m.source_app)) ends.sourceApp = m.source_app;
  if (!unknown(m.destination_app)) ends.targetApp = m.destination_app;
  return { m, rate, ends };
}

/** Series -> flows, one per pair and security. */
export function flowsFromResult(result: Sample[] | null | undefined): Flow[] {
  const flows = new Map<string, Flow>();
  for (const s of result ?? []) {
    const r = read(s);
    if (!r) continue;
    const security = r.m.connection_security_policy === 'mutual_tls' ? 'mtls' : 'plaintext';
    const key = `${r.ends.source}|${r.ends.target}|${security}`;
    const prev = flows.get(key);
    if (prev) prev.bytesPerSec += r.rate;
    else flows.set(key, { ...r.ends, security, bytesPerSec: r.rate });
  }
  return [...flows.values()];
}

export function formatRate(bytesPerSec: number): string {
  const units = ['B/s', 'kB/s', 'MB/s', 'GB/s'];
  let v = bytesPerSec;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}
