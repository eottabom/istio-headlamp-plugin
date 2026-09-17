import { IstioObject } from './base';
import { PolicyTargetReference, WorkloadSelector } from './types';

const TEL = 'telemetry.istio.io';

export interface TelemetrySpec {
  selector?: WorkloadSelector;
  targetRef?: PolicyTargetReference;
  targetRefs?: PolicyTargetReference[];
  tracing?: Array<{
    providers?: Array<{ name?: string }>;
    randomSamplingPercentage?: number;
    disableSpanReporting?: boolean;
    customTags?: Record<string, unknown>;
    match?: Record<string, unknown>;
  }>;
  metrics?: Array<{
    providers?: Array<{ name?: string }>;
    overrides?: Array<Record<string, unknown>>;
    reportingInterval?: string;
  }>;
  accessLogging?: Array<{
    providers?: Array<{ name?: string }>;
    disabled?: boolean;
    filter?: { expression?: string };
    match?: Record<string, unknown>;
  }>;
}

export class Telemetry extends IstioObject<TelemetrySpec> {
  static kind = 'Telemetry';
  static apiName = 'telemetries';
  static apiVersion = [`${TEL}/v1`, `${TEL}/v1alpha1`];
  static urlSegment = 'telemetries';

  /** Which of the three telemetry signals this resource configures. */
  get signals(): string[] {
    const s = this.spec;
    return [
      s.tracing?.length ? 'Tracing' : null,
      s.metrics?.length ? 'Metrics' : null,
      s.accessLogging?.length ? 'Access logging' : null,
    ].filter(Boolean) as string[];
  }

  get samplingPercentage(): number | undefined {
    return this.spec.tracing?.find(t => t.randomSamplingPercentage !== undefined)
      ?.randomSamplingPercentage;
  }
}
