import { describe, expect, it } from 'vitest';
import { flowsFromResult, formatRate, OUTSIDE_IN, OUTSIDE_OUT } from '../lib/trafficParse';

const sample = (metric: Record<string, string>, v: number) => ({
  metric,
  value: [0, String(v)] as [number, string],
});
const wl = (sns: string, swl: string, dns: string, dwl: string, extra = {}, v = 1) =>
  sample(
    {
      source_workload_namespace: sns,
      source_workload: swl,
      destination_workload_namespace: dns,
      destination_workload: dwl,
      ...extra,
    },
    v
  );
const ns = (sns: string, dns: string, extra = {}, v = 1) =>
  sample({ source_workload_namespace: sns, destination_workload_namespace: dns, ...extra }, v);
const mtls = { connection_security_policy: 'mutual_tls' };
const plain = { connection_security_policy: 'unknown' };

describe('flowsFromResult', () => {
  it('reads namespace pairs and tells mTLS from plaintext', () => {
    expect(flowsFromResult([ns('a', 'b', mtls, 10), ns('unknown', 'b', plain, 5)])).toEqual([
      { source: 'a', target: 'b', security: 'mtls', bytesPerSec: 10 },
      { source: OUTSIDE_IN, target: 'b', security: 'plaintext', bytesPerSec: 5 },
    ]);
  });

  it('reads workload pairs and sums series of the same pair and security', () => {
    expect(
      flowsFromResult([
        wl('a', 'web', 'b', 'db', mtls, 1),
        wl('a', 'web', 'b', 'db', mtls, 2),
        wl('a', 'web', 'unknown', 'unknown', plain, 3),
      ])
    ).toEqual([
      { source: 'a/web', target: 'b/db', security: 'mtls', bytesPerSec: 3 },
      { source: 'a/web', target: OUTSIDE_OUT, security: 'plaintext', bytesPerSec: 3 },
    ]);
  });

  it('drops zero rates and flows unknown at both ends', () => {
    expect(
      flowsFromResult([
        ns('a', 'b', mtls, 0),
        wl('unknown', 'unknown', 'unknown', 'unknown', plain, 1),
        { metric: {} },
      ])
    ).toEqual([]);
    expect(flowsFromResult(undefined)).toEqual([]);
  });
});

describe('app labels', () => {
  it('are kept on flows when known', () => {
    const extra = { ...mtls, source_app: 'web', destination_app: 'unknown' };
    const [f] = flowsFromResult([wl('a', 'web-v1', 'b', 'db', extra)]);
    expect(f.sourceApp).toBe('web');
    expect(f.targetApp).toBeUndefined();
  });
});

describe('formatRate', () => {
  it('scales units', () => {
    expect(formatRate(5)).toBe('5.0 B/s');
    expect(formatRate(2300)).toBe('2.3 kB/s');
    expect(formatRate(45_000_000)).toBe('45 MB/s');
  });
});
