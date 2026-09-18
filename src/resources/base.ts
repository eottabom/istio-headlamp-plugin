import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { AttachmentKind, attachmentKind, normaliseTargetRefs } from '../lib/analyze';
import { PolicyTargetReference, WorkloadSelector } from './types';

export { describeExportTo } from '../lib/analyze';

/** Route prefix owned by this plugin. */
export const ROUTE_PREFIX = '/istio';

/**
 * Names the plugin's routes are registered under.
 *
 * Headlamp's `Link` resolves `routeName` against registered route *names* (or
 * the unsubstituted path pattern), never against a concrete URL, so anything
 * linking to an Istio page has to go through these rather than building the
 * path by hand. Both the registration and the links derive from here so the
 * two cannot drift apart.
 */
export function listRouteName(urlSegment: string): string {
  return `istio-${urlSegment}`;
}

export function detailRouteName(urlSegment: string): string {
  return `${listRouteName(urlSegment)}-detail`;
}

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
    return normaliseTargetRefs(this.spec);
  }

  get selectorLabels(): Record<string, string> | undefined {
    return this.spec.selector?.matchLabels;
  }

  /**
   * How this resource picks the workloads it applies to. Ambient policies
   * usually use targetRefs; sidecar-era ones use a label selector; neither
   * means "the whole namespace" (or the whole mesh, in the root namespace).
   */
  get attachmentKind(): AttachmentKind {
    return attachmentKind(this.spec);
  }
}
