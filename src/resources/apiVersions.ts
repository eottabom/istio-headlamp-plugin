/**
 * API versions each Istio CRD serves, newest first.
 *
 * Headlamp's `apiEndpoint` accepts an array and falls back through it, so
 * listing every served version is what lets one build of this plugin work
 * against Istio 1.2x and 1.3x clusters alike. Verified against the CRDs
 * shipped with Istio 1.30.
 */

const NET = 'networking.istio.io';
const SEC = 'security.istio.io';
const TEL = 'telemetry.istio.io';
const EXT = 'extensions.istio.io';

/** VirtualService, DestinationRule, Gateway, ServiceEntry, Sidecar, WorkloadEntry, WorkloadGroup. */
export const NETWORKING_VERSIONS = [`${NET}/v1`, `${NET}/v1beta1`, `${NET}/v1alpha3`];
/** EnvoyFilter is deliberately pinned to v1alpha3 by Istio. */
export const ENVOYFILTER_VERSIONS = [`${NET}/v1alpha3`];
/** ProxyConfig only ever shipped v1beta1. */
export const PROXYCONFIG_VERSIONS = [`${NET}/v1beta1`];
export const SECURITY_VERSIONS = [`${SEC}/v1`, `${SEC}/v1beta1`];
export const TELEMETRY_VERSIONS = [`${TEL}/v1`, `${TEL}/v1alpha1`];
export const EXTENSIONS_VERSIONS = [`${EXT}/v1alpha1`];
