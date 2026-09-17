/** Istio label and annotation keys used across the plugin. */

export const DATAPLANE_MODE = 'istio.io/dataplane-mode';
export const SIDECAR_INJECTION = 'istio-injection';
export const REVISION = 'istio.io/rev';
export const SIDECAR_INJECT_ANNOTATION = 'sidecar.istio.io/inject';
export const SIDECAR_INJECT_LABEL = 'sidecar.istio.io/inject';
export const SIDECAR_STATUS = 'sidecar.istio.io/status';

export const USE_WAYPOINT = 'istio.io/use-waypoint';
export const USE_WAYPOINT_NAMESPACE = 'istio.io/use-waypoint-namespace';
export const WAYPOINT_FOR = 'istio.io/waypoint-for';

export const GATEWAY_NAME = 'gateway.networking.k8s.io/gateway-name';
export const ISTIO_GATEWAY_NAME = 'istio.io/gateway-name';

export const WAYPOINT_GATEWAY_CLASS = 'istio-waypoint';
export const ISTIO_GATEWAY_CLASSES = ['istio', 'istio-waypoint', 'istio-remote'];

export const PART_OF = 'app.kubernetes.io/part-of';
export const APP_NAME = 'app.kubernetes.io/name';
export const GATEWAY_MANAGED = 'gateway.istio.io/managed';
export const GATEWAY_CLASS_NAME = 'gateway.networking.k8s.io/gateway-class-name';

export const PROXY_CONTAINER = 'istio-proxy';
export const ISTIO_SYSTEM_NAMESPACE = 'istio-system';
