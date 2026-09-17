import { describe, expect, it } from 'vitest';
import { humanizeKey } from '../components/common/SpecTree';

describe('humanizeKey', () => {
  it('turns Istio schema fields into readable labels', () => {
    expect(humanizeKey('randomSamplingPercentage')).toBe('Random Sampling Percentage');
    expect(humanizeKey('outlierDetection')).toBe('Outlier Detection');
    expect(humanizeKey('host')).toBe('Host');
    expect(humanizeKey('http2MaxRequests')).toBe('Http2 Max Requests');
  });

  // Regression: these keys are data, and rewriting them shows the user a name
  // that does not exist in the cluster.
  it('leaves environment variable names exactly as they are', () => {
    expect(humanizeKey('ISTIO_META_DNS_CAPTURE')).toBe('ISTIO_META_DNS_CAPTURE');
    expect(humanizeKey('GOMAXPROCS')).toBe('GOMAXPROCS');
  });

  it('leaves label and annotation keys alone', () => {
    expect(humanizeKey('app.kubernetes.io/name')).toBe('app.kubernetes.io/name');
    expect(humanizeKey('istio.io/use-waypoint')).toBe('istio.io/use-waypoint');
  });

  it('leaves CEL-style condition keys alone', () => {
    expect(humanizeKey('request.headers[x-admin]')).toBe('request.headers[x-admin]');
    expect(humanizeKey('request.auth.claims[scope]')).toBe('request.auth.claims[scope]');
  });
});
