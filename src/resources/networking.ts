import {
  collectDestinationHosts,
  loadBalancerName,
  serviceEntryPortSummary,
  serviceEntryWarning,
} from '../lib/analyze';
import { ENVOYFILTER_VERSIONS, NETWORKING_VERSIONS, PROXYCONFIG_VERSIONS } from './apiVersions';
import { IstioObject } from './base';
import {
  HTTPRoute,
  L4Route,
  Port,
  Server,
  ServiceEntryEndpoint,
  Subset,
  TrafficPolicy,
  WorkloadSelector,
} from './types';

export interface VirtualServiceSpec {
  hosts?: string[];
  gateways?: string[];
  http?: HTTPRoute[];
  tls?: L4Route[];
  tcp?: L4Route[];
  exportTo?: string[];
}

export class VirtualService extends IstioObject<VirtualServiceSpec> {
  static kind = 'VirtualService';
  static apiName = 'virtualservices';
  static apiVersion = NETWORKING_VERSIONS;
  static urlSegment = 'virtualservices';

  get routeCount(): number {
    const s = this.spec;
    return (s.http?.length ?? 0) + (s.tls?.length ?? 0) + (s.tcp?.length ?? 0);
  }

  /** Every destination host referenced by any route, deduplicated. */
  get destinationHosts(): string[] {
    return collectDestinationHosts(this.spec);
  }
}

export interface DestinationRuleSpec {
  host?: string;
  trafficPolicy?: TrafficPolicy;
  subsets?: Subset[];
  exportTo?: string[];
  workloadSelector?: WorkloadSelector;
}

export class DestinationRule extends IstioObject<DestinationRuleSpec> {
  static kind = 'DestinationRule';
  static apiName = 'destinationrules';
  static apiVersion = NETWORKING_VERSIONS;
  static urlSegment = 'destinationrules';

  get host(): string | undefined {
    return this.spec.host;
  }

  get subsetNames(): string[] {
    return this.spec.subsets?.map(s => s.name ?? '(unnamed)') ?? [];
  }

  /** The effective upstream TLS mode, which is what people usually open this for. */
  get tlsMode(): string | undefined {
    return this.spec.trafficPolicy?.tls?.mode;
  }

  get loadBalancer(): string | undefined {
    return loadBalancerName(this.spec.trafficPolicy?.loadBalancer);
  }
}

export interface GatewaySpec {
  selector?: Record<string, string>;
  servers?: Server[];
}

export class Gateway extends IstioObject<GatewaySpec> {
  static kind = 'Gateway';
  static apiName = 'gateways';
  static apiVersion = NETWORKING_VERSIONS;
  static urlSegment = 'gateways';

  get serverCount(): number {
    return this.spec.servers?.length ?? 0;
  }

  get allHosts(): string[] {
    return [...new Set((this.spec.servers ?? []).flatMap(s => s.hosts ?? []))];
  }

  get portSummary(): string[] {
    return (this.spec.servers ?? []).map(s =>
      [s.port?.number, s.port?.protocol].filter(Boolean).join('/')
    );
  }
}

export interface ServiceEntrySpec {
  hosts?: string[];
  addresses?: string[];
  ports?: Port[];
  location?: 'MESH_EXTERNAL' | 'MESH_INTERNAL' | string;
  resolution?: 'NONE' | 'STATIC' | 'DNS' | 'DNS_ROUND_ROBIN' | string;
  endpoints?: ServiceEntryEndpoint[];
  workloadSelector?: WorkloadSelector;
  exportTo?: string[];
  subjectAltNames?: string[];
}

export class ServiceEntry extends IstioObject<ServiceEntrySpec> {
  static kind = 'ServiceEntry';
  static apiName = 'serviceentries';
  static apiVersion = NETWORKING_VERSIONS;
  static urlSegment = 'serviceentries';

  get location(): string {
    return this.spec.location ?? 'MESH_EXTERNAL';
  }

  get resolution(): string {
    return this.spec.resolution ?? 'NONE';
  }

  get portSummary(): string[] {
    return serviceEntryPortSummary(this.spec);
  }

  /**
   * STATIC resolution with no endpoints, or DNS resolution with an address but
   * no host, silently does nothing. Surfacing that is the whole point of a
   * detail view.
   */
  get configWarning(): string | undefined {
    return serviceEntryWarning(this.spec);
  }
}

export interface SidecarSpec {
  workloadSelector?: WorkloadSelector;
  ingress?: Array<Record<string, unknown>>;
  egress?: Array<{ port?: Port; bind?: string; captureMode?: string; hosts?: string[] }>;
  outboundTrafficPolicy?: { mode?: string; egressProxy?: Record<string, unknown> };
}

export class Sidecar extends IstioObject<SidecarSpec> {
  static kind = 'Sidecar';
  static apiName = 'sidecars';
  static apiVersion = NETWORKING_VERSIONS;
  static urlSegment = 'sidecars';

  get outboundMode(): string {
    return this.spec.outboundTrafficPolicy?.mode ?? 'ALLOW_ANY (default)';
  }
}

export interface WorkloadEntrySpec {
  address?: string;
  ports?: Record<string, number>;
  labels?: Record<string, string>;
  network?: string;
  locality?: string;
  weight?: number;
  serviceAccount?: string;
}

export class WorkloadEntry extends IstioObject<WorkloadEntrySpec> {
  static kind = 'WorkloadEntry';
  static apiName = 'workloadentries';
  static apiVersion = NETWORKING_VERSIONS;
  static urlSegment = 'workloadentries';
}

export interface WorkloadGroupSpec {
  metadata?: { labels?: Record<string, string>; annotations?: Record<string, string> };
  template?: Record<string, unknown>;
  probe?: Record<string, unknown>;
}

export class WorkloadGroup extends IstioObject<WorkloadGroupSpec> {
  static kind = 'WorkloadGroup';
  static apiName = 'workloadgroups';
  static apiVersion = NETWORKING_VERSIONS;
  static urlSegment = 'workloadgroups';
}

export interface ProxyConfigSpec {
  selector?: WorkloadSelector;
  concurrency?: number;
  environmentVariables?: Record<string, string>;
  image?: Record<string, unknown>;
}

export class ProxyConfig extends IstioObject<ProxyConfigSpec> {
  static kind = 'ProxyConfig';
  static apiName = 'proxyconfigs';
  static apiVersion = PROXYCONFIG_VERSIONS;
  static urlSegment = 'proxyconfigs';
}

export interface EnvoyFilterSpec {
  workloadSelector?: { labels?: Record<string, string> };
  configPatches?: Array<{
    applyTo?: string;
    match?: Record<string, unknown>;
    patch?: { operation?: string; value?: Record<string, unknown>; filterClass?: string };
  }>;
  priority?: number;
  targetRefs?: Array<Record<string, unknown>>;
}

export class EnvoyFilter extends IstioObject<EnvoyFilterSpec> {
  static kind = 'EnvoyFilter';
  static apiName = 'envoyfilters';
  static apiVersion = ENVOYFILTER_VERSIONS;
  static urlSegment = 'envoyfilters';

  get patchCount(): number {
    return this.spec.configPatches?.length ?? 0;
  }
}
