import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Typography } from '@mui/material';
import { ReactNode } from 'react';
import { WasmPlugin } from '../../resources/extensions';
import { Gateway, Sidecar } from '../../resources/networking';
import { Telemetry } from '../../resources/telemetry';
import { EnumChip } from '../common/Badges';
import { HostList } from '../common/HostLink';
import { InlineSpec } from '../common/InlineSpec';
import { ChipList, ConfigWarning, LabelPairs, Row } from '../common/SpecSection';
import { SpecTree } from '../common/SpecTree';
import { Mono, SpecTable } from './Table';

/* ------------------------------ Gateway (networking.istio.io) ------------------------------ */

export function gatewayHeaderInfo(gw: Gateway): Row[] {
  return [
    { name: 'Servers', value: String(gw.serverCount), hideIfEmpty: false },
    { name: 'Ports', value: <ChipList items={gw.portSummary} />, hideIfEmpty: false },
    {
      name: 'Hosts',
      value: <HostList hosts={gw.allHosts} namespace={gw.metadata.namespace} />,
      hideIfEmpty: false,
    },
    {
      name: 'Gateway workload selector',
      value: <LabelPairs labels={gw.spec.selector} />,
      hideIfEmpty: false,
    },
  ];
}

export function gatewaySections(gw: Gateway): ReactNode[] {
  return [
    <ConfigWarning
      key="note"
      severity="info"
      title="This is the Istio Gateway API, not Gateway API"
    >
      <code>networking.istio.io/v1 Gateway</code> configures an existing ingress deployment selected
      by labels. It does not create one. New installs are generally better served by{' '}
      <code>gateway.networking.k8s.io</code> Gateways, which Istio provisions automatically.
    </ConfigWarning>,
    <SectionBox key="servers" title={`Servers (${gw.serverCount})`}>
      <SpecTable
        items={gw.spec.servers}
        columns={[
          { label: 'Name', render: s => <Mono>{s.name}</Mono> },
          { label: 'Port', render: s => <Mono>{s.port?.number}</Mono> },
          { label: 'Protocol', render: s => <Mono>{s.port?.protocol}</Mono> },
          {
            label: 'Hosts',
            render: s => <HostList hosts={s.hosts} namespace={gw.metadata.namespace} />,
          },
          {
            label: 'TLS',
            render: s =>
              s.tls ? (
                <EnumChip
                  value={s.tls.mode}
                  good={['MUTUAL', 'ISTIO_MUTUAL', 'SIMPLE']}
                  bad={['PASSTHROUGH']}
                />
              ) : (
                <Typography variant="body2" color="text.disabled">
                  none
                </Typography>
              ),
          },
          { label: 'Credential', render: s => <Mono>{s.tls?.credentialName}</Mono> },
        ]}
      />
    </SectionBox>,
  ];
}

/* ------------------------------ Sidecar ------------------------------ */

export function sidecarHeaderInfo(sc: Sidecar): Row[] {
  return [
    { name: 'Outbound traffic policy', value: <Mono>{sc.outboundMode}</Mono>, hideIfEmpty: false },
    { name: 'Egress listeners', value: String(sc.spec.egress?.length ?? 0), hideIfEmpty: false },
    { name: 'Ingress listeners', value: String(sc.spec.ingress?.length ?? 0), hideIfEmpty: false },
  ];
}

export function sidecarSections(sc: Sidecar): ReactNode[] {
  return [
    <ConfigWarning key="ambient" severity="info" title="Sidecar has no effect on ambient workloads">
      This resource only configures injected sidecar proxies. Workloads enrolled in ambient mode
      ignore it.
    </ConfigWarning>,
    sc.spec.egress?.length ? (
      <SectionBox key="egress" title={`Egress (${sc.spec.egress.length})`}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Restricting egress hosts is the main reason to use a Sidecar resource: it shrinks the
          proxy's config to only the listed services.
        </Typography>
        <SpecTable
          items={sc.spec.egress}
          columns={[
            {
              label: 'Port',
              render: e => <Mono>{e.port ? `${e.port.number}/${e.port.protocol}` : 'all'}</Mono>,
            },
            { label: 'Bind', render: e => <Mono>{e.bind}</Mono> },
            { label: 'Capture mode', render: e => <Mono>{e.captureMode}</Mono> },
            { label: 'Hosts', render: e => <ChipList items={e.hosts} /> },
          ]}
        />
      </SectionBox>
    ) : null,
    sc.spec.ingress?.length ? (
      <SectionBox key="ingress" title={`Ingress (${sc.spec.ingress.length})`}>
        <SpecTree value={sc.spec.ingress} collapseDepth={2} />
      </SectionBox>
    ) : null,
  ];
}

/* ------------------------------ Telemetry ------------------------------ */

export function telemetryHeaderInfo(t: Telemetry): Row[] {
  return [
    { name: 'Configures', value: <ChipList items={t.signals} />, hideIfEmpty: false },
    {
      name: 'Trace sampling',
      value: t.samplingPercentage !== undefined ? `${t.samplingPercentage}%` : undefined,
    },
  ];
}

export function telemetrySections(t: Telemetry): ReactNode[] {
  return [
    t.spec.tracing?.length ? (
      <SectionBox key="tracing" title="Tracing">
        <SpecTable
          items={t.spec.tracing}
          columns={[
            {
              label: 'Providers',
              render: x => (
                <ChipList
                  items={(x.providers ?? []).map(p => p.name ?? '?')}
                  emptyText="mesh default"
                />
              ),
            },
            {
              label: 'Sampling',
              render: x => (
                <Mono>
                  {x.randomSamplingPercentage !== undefined
                    ? `${x.randomSamplingPercentage}%`
                    : undefined}
                </Mono>
              ),
            },
            {
              label: 'Disabled',
              render: x => <Mono>{x.disableSpanReporting ? 'yes' : undefined}</Mono>,
            },
            { label: 'Custom tags', render: x => <InlineSpec value={x.customTags} /> },
          ]}
        />
      </SectionBox>
    ) : null,
    t.spec.metrics?.length ? (
      <SectionBox key="metrics" title="Metrics">
        <SpecTree value={t.spec.metrics} collapseDepth={2} />
      </SectionBox>
    ) : null,
    t.spec.accessLogging?.length ? (
      <SectionBox key="logs" title="Access logging">
        <SpecTable
          items={t.spec.accessLogging}
          columns={[
            {
              label: 'Providers',
              render: x => (
                <ChipList
                  items={(x.providers ?? []).map(p => p.name ?? '?')}
                  emptyText="mesh default"
                />
              ),
            },
            { label: 'Disabled', render: x => <Mono>{x.disabled ? 'yes' : undefined}</Mono> },
            { label: 'Filter (CEL)', render: x => <Mono>{x.filter?.expression}</Mono> },
          ]}
        />
      </SectionBox>
    ) : null,
  ];
}

/* ------------------------------ WasmPlugin ------------------------------ */

export function wasmPluginHeaderInfo(w: WasmPlugin): Row[] {
  return [
    { name: 'URL', value: <Mono>{w.spec.url}</Mono>, hideIfEmpty: false },
    { name: 'Phase', value: <Mono>{w.phase}</Mono>, hideIfEmpty: false },
    {
      name: 'Priority',
      value: w.spec.priority !== undefined ? String(w.spec.priority) : undefined,
    },
    { name: 'Type', value: w.spec.type },
    { name: 'Pull policy', value: w.spec.imagePullPolicy },
  ];
}

export function wasmPluginSections(w: WasmPlugin): ReactNode[] {
  return [
    w.spec.pluginConfig ? (
      <SectionBox key="config" title="Plugin config">
        <SpecTree value={w.spec.pluginConfig} collapseDepth={3} />
      </SectionBox>
    ) : null,
    w.spec.match?.length ? (
      <SectionBox key="match" title="Match">
        <SpecTree value={w.spec.match} collapseDepth={2} />
      </SectionBox>
    ) : null,
  ];
}
