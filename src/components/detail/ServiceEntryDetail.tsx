import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Typography } from '@mui/material';
import { ReactNode } from 'react';
import { describeExportTo } from '../../resources/base';
import { ServiceEntry } from '../../resources/networking';
import { EnumChip } from '../common/Badges';
import { HostList } from '../common/HostLink';
import { ChipList, ConfigWarning, LabelPairs, Row } from '../common/SpecSection';
import { Mono, SpecTable } from './Table';

export function serviceEntryHeaderInfo(se: ServiceEntry): Row[] {
  return [
    {
      name: 'Hosts',
      value: <HostList hosts={se.spec.hosts} namespace={se.metadata.namespace} />,
      hideIfEmpty: false,
    },
    {
      name: 'Location',
      value: <EnumChip value={se.location} neutral={['MESH_EXTERNAL']} good={['MESH_INTERNAL']} />,
      hideIfEmpty: false,
    },
    {
      name: 'Resolution',
      value: (
        <EnumChip
          value={se.resolution}
          neutral={['NONE']}
          good={['DNS', 'DNS_ROUND_ROBIN', 'STATIC']}
        />
      ),
      hideIfEmpty: false,
    },
    { name: 'Ports', value: <ChipList items={se.portSummary} />, hideIfEmpty: false },
    {
      name: 'Addresses (VIPs)',
      value: se.spec.addresses?.length ? <ChipList items={se.spec.addresses} /> : undefined,
    },
    { name: 'Export to', value: describeExportTo(se.spec.exportTo) },
  ];
}

export function serviceEntrySections(se: ServiceEntry): ReactNode[] {
  const warning = se.configWarning;

  return [
    warning ? (
      <ConfigWarning key="warn" title="This ServiceEntry may not do what you expect">
        {warning}
      </ConfigWarning>
    ) : null,

    <SectionBox key="ports" title={`Ports (${se.spec.ports?.length ?? 0})`}>
      <SpecTable
        items={se.spec.ports}
        emptyText="No ports defined. Traffic to these hosts will not match any listener."
        columns={[
          { label: 'Name', render: p => <Mono>{p.name}</Mono> },
          { label: 'Port', render: p => <Mono>{p.number}</Mono> },
          { label: 'Protocol', render: p => <Mono>{p.protocol}</Mono> },
          { label: 'Target port', render: p => <Mono>{p.targetPort}</Mono> },
        ]}
      />
    </SectionBox>,

    <SectionBox key="endpoints" title={`Endpoints (${se.spec.endpoints?.length ?? 0})`}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {se.resolution === 'STATIC'
          ? 'resolution is STATIC, so these endpoints are the only backends.'
          : se.resolution === 'NONE'
          ? 'resolution is NONE, so the original destination IP is used and endpoints are ignored.'
          : 'resolution is DNS-based; endpoints override or supplement DNS results.'}
      </Typography>
      <SpecTable
        items={se.spec.endpoints}
        emptyText="None"
        columns={[
          { label: 'Address', render: e => <Mono>{e.address}</Mono> },
          {
            label: 'Ports',
            render: e => (
              <ChipList items={Object.entries(e.ports ?? {}).map(([n, p]) => `${n}:${p}`)} />
            ),
          },
          { label: 'Labels', render: e => <LabelPairs labels={e.labels} /> },
          { label: 'Locality', render: e => <Mono>{e.locality}</Mono> },
          { label: 'Network', render: e => <Mono>{e.network}</Mono> },
          { label: 'Weight', render: e => <Mono>{e.weight}</Mono> },
          { label: 'Service account', render: e => <Mono>{e.serviceAccount}</Mono> },
        ]}
      />
    </SectionBox>,

    se.spec.workloadSelector ? (
      <SectionBox key="ws" title="Workload selector">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Endpoints are discovered from in-mesh workloads matching these labels instead of the
          static list.
        </Typography>
        <LabelPairs labels={se.spec.workloadSelector.matchLabels} />
      </SectionBox>
    ) : null,

    se.spec.subjectAltNames?.length ? (
      <SectionBox key="sans" title="Subject alternative names">
        <ChipList items={se.spec.subjectAltNames} />
      </SectionBox>
    ) : null,
  ];
}
