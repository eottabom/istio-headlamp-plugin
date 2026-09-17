import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { describeExportTo } from '../../resources/base';
import { DestinationRule } from '../../resources/networking';
import { TrafficPolicy } from '../../resources/types';
import { EnumChip } from '../common/Badges';
import { HostLink } from '../common/HostLink';
import { ChipList, LabelPairs, Row, SpecSection } from '../common/SpecSection';
import { SpecTree } from '../common/SpecTree';
import { Mono, SpecTable } from './Table';

export function destinationRuleHeaderInfo(dr: DestinationRule): Row[] {
  return [
    {
      name: 'Host',
      value: dr.host ? <HostLink host={dr.host} namespace={dr.metadata.namespace} /> : undefined,
      hideIfEmpty: false,
    },
    {
      name: 'Upstream TLS',
      value: <EnumChip value={dr.tlsMode} good={['ISTIO_MUTUAL', 'MUTUAL']} bad={['DISABLE']} />,
      hideIfEmpty: false,
    },
    { name: 'Load balancer', value: dr.loadBalancer },
    {
      name: 'Subsets',
      value: dr.subsetNames.length > 0 ? <ChipList items={dr.subsetNames} /> : undefined,
    },
    { name: 'Export to', value: describeExportTo(dr.spec.exportTo) },
  ];
}

export function destinationRuleSections(dr: DestinationRule): ReactNode[] {
  const policy = dr.spec.trafficPolicy;

  return [
    policy ? <TrafficPolicySection key="tp" title="Traffic policy" policy={policy} /> : null,

    dr.spec.subsets?.length ? (
      <SectionBox key="subsets" title={`Subsets (${dr.spec.subsets.length})`}>
        <SpecTable
          items={dr.spec.subsets}
          columns={[
            { label: 'Name', render: s => <Mono>{s.name}</Mono> },
            { label: 'Labels', render: s => <LabelPairs labels={s.labels} /> },
            {
              label: 'Policy override',
              render: s =>
                s.trafficPolicy ? (
                  <Box sx={{ maxWidth: 520 }}>
                    <SpecTree value={s.trafficPolicy} collapseDepth={1} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    inherits
                  </Typography>
                ),
            },
          ]}
        />
      </SectionBox>
    ) : null,

    policy?.portLevelSettings?.length ? (
      <SectionBox key="port-level" title="Port-level settings">
        <SpecTable
          items={policy.portLevelSettings}
          columns={[
            { label: 'Port', render: p => <Mono>{p.port?.number}</Mono> },
            {
              label: 'TLS',
              render: p => (
                <EnumChip value={p.tls?.mode} good={['ISTIO_MUTUAL', 'MUTUAL']} bad={['DISABLE']} />
              ),
            },
            {
              label: 'Load balancer',
              render: p => (
                <Mono>
                  {p.loadBalancer?.simple ??
                    (p.loadBalancer?.consistentHash ? 'CONSISTENT_HASH' : undefined)}
                </Mono>
              ),
            },
            {
              label: 'Other',
              render: p => {
                const rest = {
                  connectionPool: p.connectionPool,
                  outlierDetection: p.outlierDetection,
                };
                const has = Object.values(rest).some(Boolean);
                return has ? (
                  <Box sx={{ maxWidth: 480 }}>
                    <SpecTree value={rest} collapseDepth={0} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    —
                  </Typography>
                );
              },
            },
          ]}
        />
      </SectionBox>
    ) : null,

    dr.spec.workloadSelector ? (
      <SpecSection
        key="ws"
        title="Client workload selector"
        rows={[
          {
            name: 'Applies only to clients matching',
            value: <LabelPairs labels={dr.spec.workloadSelector.matchLabels} />,
            hideIfEmpty: false,
          },
        ]}
      />
    ) : null,
  ];
}

/** Traffic policy split into the four things people actually tune. */
function TrafficPolicySection({ title, policy }: { title: string; policy: TrafficPolicy }) {
  const lb = policy.loadBalancer;
  const tcp = policy.connectionPool?.tcp;
  const http = policy.connectionPool?.http;
  const od = policy.outlierDetection;
  const tls = policy.tls;

  return (
    <SectionBox title={title}>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Sub title="Load balancing">
          {lb ? <SpecTree value={lb} collapseDepth={2} /> : <None />}
        </Sub>
        <Sub title="Upstream TLS">
          {tls ? (
            <SpecTree value={tls} collapseDepth={2} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Not set — the mesh default applies (ISTIO_MUTUAL for in-mesh destinations).
            </Typography>
          )}
        </Sub>
        <Sub title="Connection pool">
          {tcp || http ? <SpecTree value={{ tcp, http }} collapseDepth={2} /> : <None />}
        </Sub>
        <Sub title="Outlier detection">
          {od ? (
            <SpecTree value={od} collapseDepth={2} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Not set — unhealthy endpoints are not ejected.
            </Typography>
          )}
        </Sub>
      </Box>
    </SectionBox>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function None() {
  return (
    <Typography variant="body2" color="text.disabled">
      Not configured
    </Typography>
  );
}
