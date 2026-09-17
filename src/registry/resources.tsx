import { ReactNode } from 'react';
import { EnumChip } from '../components/common/Badges';
import { ChipList, LabelPairs, Row } from '../components/common/SpecSection';
import {
  destinationRuleHeaderInfo,
  destinationRuleSections,
} from '../components/detail/DestinationRuleDetail';
import {
  gatewayHeaderInfo,
  gatewaySections,
  sidecarHeaderInfo,
  sidecarSections,
  telemetryHeaderInfo,
  telemetrySections,
  wasmPluginHeaderInfo,
  wasmPluginSections,
} from '../components/detail/MiscDetail';
import {
  AttachmentCell,
  authorizationPolicyHeaderInfo,
  authorizationPolicySections,
  peerAuthenticationHeaderInfo,
  peerAuthenticationSections,
  requestAuthenticationHeaderInfo,
  requestAuthenticationSections,
} from '../components/detail/SecurityDetail';
import {
  serviceEntryHeaderInfo,
  serviceEntrySections,
} from '../components/detail/ServiceEntryDetail';
import { Mono } from '../components/detail/Table';
import {
  virtualServiceHeaderInfo,
  virtualServiceSections,
} from '../components/detail/VirtualServiceDetail';
import { IstioObject } from '../resources/base';
import { TrafficExtension, WasmPlugin } from '../resources/extensions';
import {
  DestinationRule,
  EnvoyFilter,
  Gateway,
  ProxyConfig,
  ServiceEntry,
  Sidecar,
  VirtualService,
  WorkloadEntry,
  WorkloadGroup,
} from '../resources/networking';
import {
  AuthorizationPolicy,
  PeerAuthentication,
  RequestAuthentication,
} from '../resources/security';
import { Telemetry } from '../resources/telemetry';

export type IstioGroup = 'Networking' | 'Security' | 'Telemetry' | 'Extensions';

export interface IstioResourceDef<T extends IstioObject = any> {
  /** Sidebar/route identifier, also the URL segment. */
  id: string;
  label: string;
  pluralLabel: string;
  group: IstioGroup;
  icon: string;
  cls: any;
  /** One line explaining what the resource does, shown on the list page. */
  description: string;
  /** Columns added between namespace and age on the list page. */
  columns?: any[];
  headerInfo?: (item: T) => Row[];
  sections?: (item: T) => ReactNode[];
  /** Set for resources where "Applies to" adds nothing. */
  hideAppliesTo?: boolean;
}

const col = (
  id: string,
  label: string,
  getValue: (i: any) => any,
  render?: (i: any) => ReactNode
) => ({
  id,
  label,
  getValue,
  ...(render ? { render } : {}),
});

export const ISTIO_RESOURCES: IstioResourceDef[] = [
  /* ----------------------------------- Networking ----------------------------------- */
  {
    id: 'virtualservices',
    label: 'VirtualService',
    pluralLabel: 'Virtual Services',
    group: 'Networking',
    icon: 'mdi:directions-fork',
    cls: VirtualService,
    description:
      'Routing rules: which requests go to which destination, with weights, retries and timeouts.',
    columns: [
      col(
        'hosts',
        'Hosts',
        (v: VirtualService) => (v.spec.hosts ?? []).join(', '),
        (v: VirtualService) => <ChipList items={v.spec.hosts} />
      ),
      col(
        'gateways',
        'Gateways',
        (v: VirtualService) => (v.spec.gateways ?? ['mesh']).join(', '),
        (v: VirtualService) => <ChipList items={v.spec.gateways ?? ['mesh']} />
      ),
      col('routes', 'Routes', (v: VirtualService) => v.routeCount),
      col(
        'destinations',
        'Destinations',
        (v: VirtualService) => v.destinationHosts.join(', '),
        (v: VirtualService) => <ChipList items={v.destinationHosts} />
      ),
    ],
    headerInfo: virtualServiceHeaderInfo,
    sections: virtualServiceSections,
    hideAppliesTo: true,
  },
  {
    id: 'destinationrules',
    label: 'DestinationRule',
    pluralLabel: 'Destination Rules',
    group: 'Networking',
    icon: 'mdi:call-split',
    cls: DestinationRule,
    description:
      'What happens after routing: load balancing, connection pools, outlier detection, upstream TLS and subsets.',
    columns: [
      col(
        'host',
        'Host',
        (d: DestinationRule) => d.host ?? '',
        (d: DestinationRule) => <Mono>{d.host}</Mono>
      ),
      col(
        'tls',
        'TLS mode',
        (d: DestinationRule) => d.tlsMode ?? '',
        (d: DestinationRule) => (
          <EnumChip value={d.tlsMode} good={['ISTIO_MUTUAL', 'MUTUAL']} bad={['DISABLE']} />
        )
      ),
      col('lb', 'Load balancer', (d: DestinationRule) => d.loadBalancer ?? ''),
      col(
        'subsets',
        'Subsets',
        (d: DestinationRule) => d.subsetNames.join(', '),
        (d: DestinationRule) => <ChipList items={d.subsetNames} />
      ),
    ],
    headerInfo: destinationRuleHeaderInfo,
    sections: destinationRuleSections,
    hideAppliesTo: true,
  },
  {
    id: 'serviceentries',
    label: 'ServiceEntry',
    pluralLabel: 'Service Entries',
    group: 'Networking',
    icon: 'mdi:exit-run',
    cls: ServiceEntry,
    description:
      'Adds external (or otherwise undiscovered) services to the mesh registry so they can be routed to.',
    columns: [
      col(
        'hosts',
        'Hosts',
        (s: ServiceEntry) => (s.spec.hosts ?? []).join(', '),
        (s: ServiceEntry) => <ChipList items={s.spec.hosts} />
      ),
      col(
        'location',
        'Location',
        (s: ServiceEntry) => s.location,
        (s: ServiceEntry) => (
          <EnumChip value={s.location} neutral={['MESH_EXTERNAL']} good={['MESH_INTERNAL']} />
        )
      ),
      col(
        'resolution',
        'Resolution',
        (s: ServiceEntry) => s.resolution,
        (s: ServiceEntry) => (
          <EnumChip
            value={s.resolution}
            neutral={['NONE']}
            good={['DNS', 'DNS_ROUND_ROBIN', 'STATIC']}
          />
        )
      ),
      col(
        'ports',
        'Ports',
        (s: ServiceEntry) => s.portSummary.join(', '),
        (s: ServiceEntry) => <ChipList items={s.portSummary} />
      ),
      col('endpoints', 'Endpoints', (s: ServiceEntry) => s.spec.endpoints?.length ?? 0),
    ],
    headerInfo: serviceEntryHeaderInfo,
    sections: serviceEntrySections,
    hideAppliesTo: true,
  },
  {
    id: 'gateways',
    label: 'Gateway',
    pluralLabel: 'Gateways (Istio API)',
    group: 'Networking',
    icon: 'mdi:door-open',
    cls: Gateway,
    description:
      'Configures an ingress/egress proxy deployment selected by labels. The Gateway API equivalent lives under Network in the main sidebar.',
    columns: [
      col(
        'ports',
        'Ports',
        (g: Gateway) => g.portSummary.join(', '),
        (g: Gateway) => <ChipList items={g.portSummary} />
      ),
      col(
        'hosts',
        'Hosts',
        (g: Gateway) => g.allHosts.join(', '),
        (g: Gateway) => <ChipList items={g.allHosts} />
      ),
      col(
        'selector',
        'Selector',
        (g: Gateway) => JSON.stringify(g.spec.selector ?? {}),
        (g: Gateway) => <LabelPairs labels={g.spec.selector} />
      ),
    ],
    headerInfo: gatewayHeaderInfo,
    sections: gatewaySections,
    hideAppliesTo: true,
  },
  {
    id: 'sidecars',
    label: 'Sidecar',
    pluralLabel: 'Sidecars',
    group: 'Networking',
    icon: 'mdi:car-side',
    cls: Sidecar,
    description: 'Scopes what a sidecar proxy knows about. No effect on ambient workloads.',
    columns: [
      col('outbound', 'Outbound policy', (s: Sidecar) => s.outboundMode),
      col('egress', 'Egress listeners', (s: Sidecar) => s.spec.egress?.length ?? 0),
    ],
    headerInfo: sidecarHeaderInfo,
    sections: sidecarSections,
  },
  {
    id: 'workloadentries',
    label: 'WorkloadEntry',
    pluralLabel: 'Workload Entries',
    group: 'Networking',
    icon: 'mdi:server',
    cls: WorkloadEntry,
    description: 'Represents a single non-Kubernetes workload (a VM) as a mesh endpoint.',
    columns: [
      col('address', 'Address', (w: WorkloadEntry) => w.spec.address ?? ''),
      col('network', 'Network', (w: WorkloadEntry) => w.spec.network ?? ''),
      col('locality', 'Locality', (w: WorkloadEntry) => w.spec.locality ?? ''),
      col('sa', 'Service account', (w: WorkloadEntry) => w.spec.serviceAccount ?? ''),
    ],
  },
  {
    id: 'workloadgroups',
    label: 'WorkloadGroup',
    pluralLabel: 'Workload Groups',
    group: 'Networking',
    icon: 'mdi:server-network',
    cls: WorkloadGroup,
    description:
      'Template for auto-registering VM workloads, the WorkloadEntry equivalent of a Deployment.',
  },
  {
    id: 'proxyconfigs',
    label: 'ProxyConfig',
    pluralLabel: 'Proxy Configs',
    group: 'Networking',
    icon: 'mdi:tune',
    cls: ProxyConfig,
    description:
      'Per-namespace or per-workload proxy settings such as concurrency and environment variables.',
    columns: [col('concurrency', 'Concurrency', (p: ProxyConfig) => p.spec.concurrency ?? '')],
  },
  {
    id: 'envoyfilters',
    label: 'EnvoyFilter',
    pluralLabel: 'Envoy Filters',
    group: 'Networking',
    icon: 'mdi:filter-cog',
    cls: EnvoyFilter,
    description:
      'Raw Envoy config patches. Powerful, unversioned and easy to break across Istio upgrades.',
    columns: [
      col('patches', 'Patches', (e: EnvoyFilter) => e.patchCount),
      col('priority', 'Priority', (e: EnvoyFilter) => e.spec.priority ?? 0),
    ],
  },

  /* ------------------------------------ Security ------------------------------------ */
  {
    id: 'authorizationpolicies',
    label: 'AuthorizationPolicy',
    pluralLabel: 'Authorization Policies',
    group: 'Security',
    icon: 'mdi:shield-lock',
    cls: AuthorizationPolicy,
    description:
      'Who may call what. In ambient mode, L7 rules require a waypoint — this view flags policies where that is missing.',
    columns: [
      col(
        'action',
        'Action',
        (a: AuthorizationPolicy) => a.action,
        (a: AuthorizationPolicy) => (
          <EnumChip
            value={a.action}
            good={['ALLOW']}
            bad={['DENY']}
            neutral={['AUDIT', 'CUSTOM']}
          />
        )
      ),
      col(
        'layer',
        'Layer',
        (a: AuthorizationPolicy) => (a.requiresL7 ? 'L7' : 'L4'),
        (a: AuthorizationPolicy) => <EnumChip value={a.requiresL7 ? 'L7' : 'L4'} neutral={['L4']} />
      ),
      col('rules', 'Rules', (a: AuthorizationPolicy) => a.ruleCount),
      col(
        'applies',
        'Applies to',
        (a: AuthorizationPolicy) => a.attachmentKind,
        (a: AuthorizationPolicy) => (
          <AttachmentCell spec={a.spec} namespace={a.metadata.namespace} />
        )
      ),
    ],
    headerInfo: authorizationPolicyHeaderInfo,
    sections: authorizationPolicySections,
  },
  {
    id: 'peerauthentications',
    label: 'PeerAuthentication',
    pluralLabel: 'Peer Authentications',
    group: 'Security',
    icon: 'mdi:lock-check',
    cls: PeerAuthentication,
    description: 'mTLS mode for workload-to-workload traffic.',
    columns: [
      col(
        'mtls',
        'mTLS mode',
        (p: PeerAuthentication) => p.mtlsMode,
        (p: PeerAuthentication) => (
          <EnumChip
            value={p.mtlsMode}
            good={['STRICT']}
            bad={['DISABLE']}
            neutral={['UNSET', 'PERMISSIVE']}
          />
        )
      ),
      col('ports', 'Port overrides', (p: PeerAuthentication) => p.portOverrides.length),
    ],
    headerInfo: peerAuthenticationHeaderInfo,
    sections: peerAuthenticationSections,
  },
  {
    id: 'requestauthentications',
    label: 'RequestAuthentication',
    pluralLabel: 'Request Authentications',
    group: 'Security',
    icon: 'mdi:key-chain',
    cls: RequestAuthentication,
    description: 'JWT validation rules. Validates tokens but does not reject requests on its own.',
    columns: [
      col(
        'issuers',
        'Issuers',
        (r: RequestAuthentication) => r.issuers.join(', '),
        (r: RequestAuthentication) => <ChipList items={r.issuers} />
      ),
    ],
    headerInfo: requestAuthenticationHeaderInfo,
    sections: requestAuthenticationSections,
  },

  /* ----------------------------------- Telemetry ----------------------------------- */
  {
    id: 'telemetries',
    label: 'Telemetry',
    pluralLabel: 'Telemetry',
    group: 'Telemetry',
    icon: 'mdi:chart-timeline-variant',
    cls: Telemetry,
    description: 'Tracing, metrics and access logging configuration.',
    columns: [
      col(
        'signals',
        'Configures',
        (t: Telemetry) => t.signals.join(', '),
        (t: Telemetry) => <ChipList items={t.signals} />
      ),
      col(
        'sampling',
        'Sampling',
        (t: Telemetry) => t.samplingPercentage ?? '',
        (t: Telemetry) => (
          <Mono>{t.samplingPercentage !== undefined ? `${t.samplingPercentage}%` : undefined}</Mono>
        )
      ),
    ],
    headerInfo: telemetryHeaderInfo,
    sections: telemetrySections,
  },

  /* ---------------------------------- Extensions ---------------------------------- */
  {
    id: 'wasmplugins',
    label: 'WasmPlugin',
    pluralLabel: 'Wasm Plugins',
    group: 'Extensions',
    icon: 'mdi:puzzle',
    cls: WasmPlugin,
    description: 'WebAssembly extensions loaded into the proxy at a chosen filter phase.',
    columns: [
      col('phase', 'Phase', (w: WasmPlugin) => w.phase),
      col(
        'url',
        'URL',
        (w: WasmPlugin) => w.spec.url ?? '',
        (w: WasmPlugin) => <Mono>{w.spec.url}</Mono>
      ),
      col('priority', 'Priority', (w: WasmPlugin) => w.spec.priority ?? 0),
    ],
    headerInfo: wasmPluginHeaderInfo,
    sections: wasmPluginSections,
  },
  {
    id: 'trafficextensions',
    label: 'TrafficExtension',
    pluralLabel: 'Traffic Extensions',
    group: 'Extensions',
    icon: 'mdi:transit-connection-variant',
    cls: TrafficExtension,
    description: 'Gateway API style attachment of external processing extensions.',
    columns: [col('phase', 'Phase', (t: TrafficExtension) => t.spec.phase ?? '')],
  },
];

export const ISTIO_GROUPS: IstioGroup[] = ['Networking', 'Security', 'Telemetry', 'Extensions'];
