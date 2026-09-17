/**
 * Shared Istio API types.
 *
 * These mirror the Istio CRD schemas closely enough to render typed detail
 * views. They are intentionally permissive (optional fields, index signatures)
 * so that a newer Istio release adding fields never breaks rendering -- the
 * unknown parts still show up through the generic spec renderer.
 */

export interface WorkloadSelector {
  matchLabels?: Record<string, string>;
}

/** Gateway-API style target reference, used by ambient-era policy attachment. */
export interface PolicyTargetReference {
  group?: string;
  kind?: string;
  name?: string;
  namespace?: string;
}

export interface Port {
  number?: number;
  protocol?: string;
  name?: string;
  targetPort?: number;
}

export interface Percent {
  value?: number;
}

export interface Duration {
  seconds?: number;
  nanos?: number;
}

export type TlsMode = 'DISABLE' | 'SIMPLE' | 'MUTUAL' | 'ISTIO_MUTUAL' | string;

export interface ClientTLSSettings {
  mode?: TlsMode;
  clientCertificate?: string;
  privateKey?: string;
  caCertificates?: string;
  credentialName?: string;
  subjectAltNames?: string[];
  sni?: string;
  insecureSkipVerify?: boolean;
  [k: string]: unknown;
}

export interface LoadBalancerSettings {
  simple?: string;
  consistentHash?: Record<string, unknown>;
  localityLbSetting?: Record<string, unknown>;
  warmupDurationSecs?: string;
  [k: string]: unknown;
}

export interface ConnectionPoolSettings {
  tcp?: {
    maxConnections?: number;
    connectTimeout?: string;
    tcpKeepalive?: Record<string, unknown>;
    maxConnectionDuration?: string;
    idleTimeout?: string;
    [k: string]: unknown;
  };
  http?: {
    http1MaxPendingRequests?: number;
    http2MaxRequests?: number;
    maxRequestsPerConnection?: number;
    maxRetries?: number;
    idleTimeout?: string;
    h2UpgradePolicy?: string;
    useClientProtocol?: boolean;
    maxConcurrentStreams?: number;
    [k: string]: unknown;
  };
}

export interface OutlierDetection {
  splitExternalLocalOriginErrors?: boolean;
  consecutiveLocalOriginFailures?: number;
  consecutiveGatewayErrors?: number;
  consecutive5xxErrors?: number;
  interval?: string;
  baseEjectionTime?: string;
  maxEjectionPercent?: number;
  minHealthPercent?: number;
  [k: string]: unknown;
}

export interface TrafficPolicy {
  loadBalancer?: LoadBalancerSettings;
  connectionPool?: ConnectionPoolSettings;
  outlierDetection?: OutlierDetection;
  tls?: ClientTLSSettings;
  portLevelSettings?: Array<{
    port?: Port;
    loadBalancer?: LoadBalancerSettings;
    connectionPool?: ConnectionPoolSettings;
    outlierDetection?: OutlierDetection;
    tls?: ClientTLSSettings;
  }>;
  tunnel?: Record<string, unknown>;
  proxyProtocol?: Record<string, unknown>;
  retryBudget?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface Subset {
  name?: string;
  labels?: Record<string, string>;
  trafficPolicy?: TrafficPolicy;
}

export interface HttpMatchRequest {
  name?: string;
  uri?: Record<string, string>;
  scheme?: Record<string, string>;
  method?: Record<string, string>;
  authority?: Record<string, string>;
  headers?: Record<string, Record<string, string>>;
  port?: number;
  sourceLabels?: Record<string, string>;
  gateways?: string[];
  queryParams?: Record<string, Record<string, string>>;
  ignoreUriCase?: boolean;
  withoutHeaders?: Record<string, Record<string, string>>;
  sourceNamespace?: string;
  statPrefix?: string;
  [k: string]: unknown;
}

export interface Destination {
  host?: string;
  subset?: string;
  port?: { number?: number };
}

export interface HTTPRouteDestination {
  destination?: Destination;
  weight?: number;
  headers?: Record<string, unknown>;
}

export interface HTTPRoute {
  name?: string;
  match?: HttpMatchRequest[];
  route?: HTTPRouteDestination[];
  redirect?: Record<string, unknown>;
  directResponse?: Record<string, unknown>;
  delegate?: { name?: string; namespace?: string };
  rewrite?: Record<string, unknown>;
  timeout?: string;
  retries?: {
    attempts?: number;
    perTryTimeout?: string;
    retryOn?: string;
    retryRemoteLocalities?: boolean;
    [k: string]: unknown;
  };
  fault?: Record<string, unknown>;
  mirror?: Destination;
  mirrors?: Array<Record<string, unknown>>;
  mirrorPercentage?: Percent;
  corsPolicy?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface L4Route {
  match?: Array<Record<string, unknown>>;
  route?: HTTPRouteDestination[];
  [k: string]: unknown;
}

export interface ServerTLSSettings {
  httpsRedirect?: boolean;
  mode?: TlsMode;
  serverCertificate?: string;
  privateKey?: string;
  caCertificates?: string;
  credentialName?: string;
  subjectAltNames?: string[];
  minProtocolVersion?: string;
  maxProtocolVersion?: string;
  cipherSuites?: string[];
  [k: string]: unknown;
}

export interface Server {
  name?: string;
  port?: Port;
  bind?: string;
  hosts?: string[];
  tls?: ServerTLSSettings;
}

export interface ServiceEntryEndpoint {
  address?: string;
  ports?: Record<string, number>;
  labels?: Record<string, string>;
  network?: string;
  locality?: string;
  weight?: number;
  serviceAccount?: string;
}

export interface JwtRule {
  issuer?: string;
  audiences?: string[];
  jwksUri?: string;
  jwks?: string;
  fromHeaders?: Array<{ name?: string; prefix?: string }>;
  fromParams?: string[];
  outputPayloadToHeader?: string;
  forwardOriginalToken?: boolean;
  [k: string]: unknown;
}

export interface AuthorizationSource {
  principals?: string[];
  notPrincipals?: string[];
  requestPrincipals?: string[];
  notRequestPrincipals?: string[];
  namespaces?: string[];
  notNamespaces?: string[];
  ipBlocks?: string[];
  notIpBlocks?: string[];
  remoteIpBlocks?: string[];
  notRemoteIpBlocks?: string[];
  serviceAccounts?: string[];
  notServiceAccounts?: string[];
}

export interface AuthorizationOperation {
  hosts?: string[];
  notHosts?: string[];
  ports?: string[];
  notPorts?: string[];
  methods?: string[];
  notMethods?: string[];
  paths?: string[];
  notPaths?: string[];
}

export interface AuthorizationCondition {
  key?: string;
  values?: string[];
  notValues?: string[];
}

export interface AuthorizationRule {
  from?: Array<{ source?: AuthorizationSource }>;
  to?: Array<{ operation?: AuthorizationOperation }>;
  when?: AuthorizationCondition[];
}
