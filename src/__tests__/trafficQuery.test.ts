import { describe, expect, it } from 'vitest';
import { anyOf, namespaceTrafficQuery, workloadTrafficQuery } from '../lib/trafficQuery';

const count = (s: string, part: string) => s.split(part).length - 1;
const WL =
  'source_workload_namespace, source_workload, destination_workload_namespace, destination_workload';

describe('traffic queries', () => {
  const ns = namespaceTrafficQuery('5m');
  const wl = workloadTrafficQuery(['shop'], '1m');

  it('aggregate in Prometheus: namespace pairs, or workload pairs', () => {
    expect(ns).toMatch(
      /^sum by \(source_workload_namespace, destination_workload_namespace, connection_security_policy\)/
    );
    expect(wl.startsWith(`sum by (${WL}, connection_security_policy)`)).toBe(true);
  });

  it('read each byte metric apart, so sent and received do not collide', () => {
    expect(count(ns, 'label_replace(')).toBe(4);
    for (const m of ['istio_tcp_sent_bytes_total{', 'istio_request_bytes_sum{']) {
      expect(ns).toContain(m);
    }
    expect(ns).not.toContain('__name__');
  });

  it('keep source reports only for flows no destination reports', () => {
    expect(ns).toContain(`unless on (${WL})`);
    expect(ns).toContain('reporter="source", connection_security_policy!="mutual_tls"');
  });

  it('filter on the namespaces, both directions, in every selector', () => {
    expect(count(wl, 'source_workload_namespace=~"shop"')).toBe(12);
    expect(count(wl, 'destination_workload_namespace=~"shop"')).toBe(12);
    expect(workloadTrafficQuery(['a', 'b'])).toContain('=~"a|b"');
    expect(anyOf(['a.b', 'c"d'])).toBe('a\\\\.b|c\\"d');
  });

  it('are balanced', () => {
    for (const q of [ns, wl]) {
      expect(count(q, '(')).toBe(count(q, ')'));
    }
  });
});
