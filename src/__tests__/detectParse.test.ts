import { describe, expect, it } from 'vitest';
import { isIstioCrdGroup } from '../lib/detectParse';

describe('isIstioCrdGroup', () => {
  it('accepts Istio CRD API groups', () => {
    expect(isIstioCrdGroup('istio.io')).toBe(true);
    expect(isIstioCrdGroup('networking.istio.io')).toBe(true);
    expect(isIstioCrdGroup('security.istio.io')).toBe(true);
  });

  it('rejects lookalike and unrelated API groups', () => {
    expect(isIstioCrdGroup('fakeistio.io')).toBe(false);
    expect(isIstioCrdGroup('istio.io.example.com')).toBe(false);
    expect(isIstioCrdGroup('example.com')).toBe(false);
    expect(isIstioCrdGroup('')).toBe(false);
  });
});
