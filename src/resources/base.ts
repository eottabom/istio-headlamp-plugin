import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { PolicyTargetReference, WorkloadSelector } from './types';

/** Route prefix owned by this plugin. */
export const ROUTE_PREFIX = '/istio';

/**
 * Every Istio CR shares the same "how is this attached to workloads" question.
 * `selector` is the classic sidecar-era mechanism, `targetRef(s)` is the
 * Gateway-API style mechanism that ambient mode leans on.
 */
export interface IstioAttachment {
  selector?: WorkloadSelector;
  targetRef?: PolicyTargetReference;
  targetRefs?: PolicyTargetReference[];
}

export interface IstioResourceInterface<S = Record<string, unknown>> extends KubeObjectInterface {
  spec: S & IstioAttachment;
  status?: Record<string, unknown>;
}

/**
 * Base class for all Istio custom resources.
 *
 * Istio serves several API versions per CRD (for example
 * `networking.istio.io/v1`, `/v1beta1` and `/v1alpha3` for DestinationRule).
 * Headlamp's `apiEndpoint` getter accepts an array of versions and falls back
 * through them, so subclasses list every served version, newest first. That is
 * what keeps this plugin working across Istio 1.2x and 1.3x clusters.
 */
export class IstioObject<S extends Record<string, any> = Record<string, any>> extends KubeObject<
  IstioResourceInterface<S>
> {
  static isNamespaced = true;

  /** URL segment used for list/detail routes, e.g. `destinationrules`. */
  static urlSegment = '';

  get spec(): IstioResourceInterface<S>['spec'] {
    return this.jsonData.spec ?? ({} as IstioResourceInterface<S>['spec']);
  }

  get status(): Record<string, unknown> {
    return this.jsonData.status ?? {};
  }

  static get detailsRoute() {
    return `${ROUTE_PREFIX}/${this.urlSegment}/:namespace/:name`;
  }

  static get listRoute() {
    return `${ROUTE_PREFIX}/${this.urlSegment}`;
  }

  /** Normalised list of Gateway-API style target references. */
  get targetRefs(): PolicyTargetReference[] {
    const spec = this.spec;
    if (Array.isArray(spec.targetRefs) && spec.targetRefs.length > 0) {
      return spec.targetRefs;
    }
    return spec.targetRef ? [spec.targetRef] : [];
  }

  get selectorLabels(): Record<string, string> | undefined {
    return this.spec.selector?.matchLabels;
  }

  /**
   * How this resource picks the workloads it applies to. Ambient policies
   * usually use targetRefs; sidecar-era ones use a label selector; neither
   * means "the whole namespace" (or the whole mesh, in the root namespace).
   */
  get attachmentKind(): 'targetRef' | 'selector' | 'namespace' {
    if (this.targetRefs.length > 0) return 'targetRef';
    if (this.selectorLabels && Object.keys(this.selectorLabels).length > 0) return 'selector';
    return 'namespace';
  }
}

/** Convenience for `exportTo`, which several networking resources share. */
export function describeExportTo(exportTo?: string[]): string {
  if (!exportTo || exportTo.length === 0) return 'All namespaces (default)';
  return exportTo
    .map(v => (v === '.' ? '. (this namespace)' : v === '*' ? '* (all namespaces)' : v))
    .join(', ');
}
