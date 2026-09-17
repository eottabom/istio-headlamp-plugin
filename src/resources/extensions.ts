import { EXTENSIONS_VERSIONS } from './apiVersions';
import { IstioObject } from './base';
import { PolicyTargetReference, WorkloadSelector } from './types';

export interface WasmPluginSpec {
  selector?: WorkloadSelector;
  targetRef?: PolicyTargetReference;
  targetRefs?: PolicyTargetReference[];
  url?: string;
  sha256?: string;
  imagePullPolicy?: string;
  imagePullSecret?: string;
  pluginName?: string;
  pluginConfig?: Record<string, unknown>;
  phase?: 'UNSPECIFIED_PHASE' | 'AUTHN' | 'AUTHZ' | 'STATS' | string;
  priority?: number;
  type?: 'HTTP' | 'NETWORK' | string;
  failStrategy?: string;
  match?: Array<Record<string, unknown>>;
  vmConfig?: Record<string, unknown>;
}

export class WasmPlugin extends IstioObject<WasmPluginSpec> {
  static kind = 'WasmPlugin';
  static apiName = 'wasmplugins';
  static apiVersion = EXTENSIONS_VERSIONS;
  static urlSegment = 'wasmplugins';

  get phase(): string {
    return this.spec.phase ?? 'UNSPECIFIED_PHASE';
  }
}

/** Introduced in Istio 1.26 for Gateway-API style extension attachment. */
export interface TrafficExtensionSpec {
  targetRefs?: PolicyTargetReference[];
  phase?: string;
  priority?: number;
  [k: string]: unknown;
}

export class TrafficExtension extends IstioObject<TrafficExtensionSpec> {
  static kind = 'TrafficExtension';
  static apiName = 'trafficextensions';
  static apiVersion = EXTENSIONS_VERSIONS;
  static urlSegment = 'trafficextensions';
}
