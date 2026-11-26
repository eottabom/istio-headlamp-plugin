import { describe, expect, it } from 'vitest';
import {
  endpointFor,
  endpointLabel,
  parseAddress,
  probeResult,
  proxyPath,
} from '../lib/prometheusParse';

describe('parseAddress', () => {
  it('reads namespace/service:port and an optional path', () => {
    expect(parseAddress('mon/vmselect:8481/select/0/prometheus/')).toEqual({
      namespace: 'mon',
      service: 'vmselect',
      port: '8481',
      path: '/select/0/prometheus',
    });
    expect(parseAddress(' istio-system/prometheus:9090 ')?.path).toBe('');
  });

  it('rejects anything else', () => {
    for (const bad of ['prometheus:9090', 'http://prometheus:9090', 'a/b', '', undefined]) {
      expect(parseAddress(bad)).toBeNull();
    }
  });

  it('picks the address of the cluster', () => {
    const rows = [
      { clusters: ['kind'], address: 'istio-system/prometheus:9090' },
      { clusters: ['prod-a', 'prod-b'], address: 'not an address' },
      { clusters: ['prod-b'], address: 'mon/vmselect:8481/select/0/prometheus' },
      { clusters: ['prod-b'], address: 'mon/other:9090' },
    ];
    expect(endpointFor(rows, 'kind')?.service).toBe('prometheus');
    expect(endpointFor(rows, 'prod-b')?.service).toBe('vmselect');
    expect(endpointFor(rows, 'prod-a')).toBeNull();
    expect(endpointFor(rows, 'other')).toBeNull();
    expect(endpointFor(undefined, 'kind')).toBeNull();
    expect(endpointFor([{ cluster: 'kind', address: 'a/b:1' }], 'kind')).toBeNull();
  });

  it('goes through the service proxy', () => {
    const e = parseAddress('m/p:9090/x')!;
    expect(proxyPath(e)).toBe('/api/v1/namespaces/m/services/p:9090/proxy/x');
    expect(endpointLabel(e)).toBe('m/p:9090/x');
  });
});

describe('probeResult', () => {
  it('needs Istio metrics, not only an answer', () => {
    expect(probeResult({ status: 'success', data: { result: [{}] } })).toBe('ok');
    expect(probeResult({ status: 'success', data: { result: [] } })).toBe('empty');
    expect(probeResult({ status: 'error' })).toBe('unreachable');
  });

  it('says not allowed rather than not found', () => {
    expect(probeResult(undefined, { status: 403 })).toBe('forbidden');
    expect(probeResult(undefined, { status: 503 })).toBe('unreachable');
  });
});
