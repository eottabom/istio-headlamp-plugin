import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { describeExportTo } from '../../resources/base';
import { VirtualService } from '../../resources/networking';
import { HttpMatchRequest, HTTPRoute, HTTPRouteDestination, L4Route } from '../../resources/types';
import { HostLink, HostList } from '../common/HostLink';
import { InlineSpec } from '../common/InlineSpec';
import { ChipList, Row } from '../common/SpecSection';
import { Mono, SpecTable } from './Table';

export function virtualServiceHeaderInfo(vs: VirtualService): Row[] {
  return [
    {
      name: 'Hosts',
      value: <HostList hosts={vs.spec.hosts} namespace={vs.metadata.namespace} />,
      hideIfEmpty: false,
    },
    {
      name: 'Gateways',
      value: vs.spec.gateways?.length ? <ChipList items={vs.spec.gateways} /> : 'mesh (default)',
      hideIfEmpty: false,
    },
    { name: 'Routes', value: `${vs.routeCount} (${describeRouteKinds(vs)})`, hideIfEmpty: false },
    { name: 'Export to', value: describeExportTo(vs.spec.exportTo) },
  ];
}

function describeRouteKinds(vs: VirtualService): string {
  const parts: string[] = [];
  if (vs.spec.http?.length) parts.push(`${vs.spec.http.length} HTTP`);
  if (vs.spec.tls?.length) parts.push(`${vs.spec.tls.length} TLS`);
  if (vs.spec.tcp?.length) parts.push(`${vs.spec.tcp.length} TCP`);
  return parts.join(', ') || 'none';
}

export function virtualServiceSections(vs: VirtualService): ReactNode[] {
  const ns = vs.metadata.namespace;

  return [
    vs.spec.http?.length ? (
      <SectionBox key="http" title={`HTTP routes (${vs.spec.http.length})`}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Evaluated top to bottom; the first matching rule wins.
        </Typography>
        <SpecTable
          items={vs.spec.http}
          columns={[
            { label: '#', render: (_r, i) => <Mono>{i}</Mono>, width: '3rem' },
            { label: 'Name', render: r => <Mono>{r.name}</Mono> },
            { label: 'Match', render: r => <MatchSummary match={r.match} /> },
            { label: 'Destination', render: r => <DestinationSummary route={r} namespace={ns} /> },
            { label: 'Resilience', render: r => <ResilienceSummary route={r} /> },
          ]}
        />
      </SectionBox>
    ) : null,

    vs.spec.tls?.length ? (
      <L4Section key="tls" title="TLS routes" routes={vs.spec.tls} namespace={ns} />
    ) : null,
    vs.spec.tcp?.length ? (
      <L4Section key="tcp" title="TCP routes" routes={vs.spec.tcp} namespace={ns} />
    ) : null,
  ];
}

function L4Section({
  title,
  routes,
  namespace,
}: {
  title: string;
  routes: L4Route[];
  namespace?: string;
}) {
  return (
    <SectionBox title={`${title} (${routes.length})`}>
      <SpecTable
        items={routes}
        columns={[
          { label: '#', render: (_r, i) => <Mono>{i}</Mono>, width: '3rem' },
          {
            label: 'Match',
            render: r =>
              r.match?.length ? (
                <Box sx={{ maxWidth: 420 }}>
                  <InlineSpec value={r.match} />
                </Box>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  any
                </Typography>
              ),
          },
          {
            label: 'Destination',
            render: r => <DestinationSummary route={r} namespace={namespace} />,
          },
        ]}
      />
    </SectionBox>
  );
}

/** Condenses a match block into something scannable: `GET /api/*  header:x-env=canary`. */
function MatchSummary({ match }: { match?: HttpMatchRequest[] }) {
  if (!match || match.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        any request
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {match.map((m, i) => {
        const bits: string[] = [];
        if (m.method) bits.push(Object.values(m.method)[0] as string);
        if (m.uri) {
          const [op, val] = Object.entries(m.uri)[0] ?? [];
          bits.push(op === 'exact' ? String(val) : op === 'prefix' ? `${val}*` : `~${val}`);
        }
        if (m.authority) bits.push(`host=${Object.values(m.authority)[0]}`);
        if (m.port) bits.push(`:${m.port}`);
        Object.entries(m.headers ?? {}).forEach(([h, cond]) => {
          bits.push(`${h}=${Object.values(cond)[0]}`);
        });
        if (m.sourceLabels) {
          bits.push(
            `from ${Object.entries(m.sourceLabels)
              .map(([k, v]) => `${k}=${v}`)
              .join(',')}`
          );
        }
        return (
          <Box key={i} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
            {i > 0 && (
              <Typography variant="caption" color="text.disabled">
                or
              </Typography>
            )}
            {bits.length > 0 ? (
              bits.map((b, j) => (
                <Chip
                  key={j}
                  size="small"
                  label={b}
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.disabled">
                any
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function DestinationSummary({
  route,
  namespace,
}: {
  route: {
    route?: HTTPRouteDestination[];
    redirect?: unknown;
    directResponse?: unknown;
    delegate?: { name?: string; namespace?: string };
  };
  namespace?: string;
}) {
  if (route.redirect) return <Chip size="small" label="redirect" color="info" variant="outlined" />;
  if (route.directResponse)
    return <Chip size="small" label="direct response" color="info" variant="outlined" />;
  if (route.delegate) {
    return (
      <Chip
        size="small"
        label={`delegate → ${route.delegate.name}`}
        color="info"
        variant="outlined"
      />
    );
  }
  if (!route.route?.length) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }
  const total = route.route.reduce((sum, d) => sum + (d.weight ?? 0), 0);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {route.route.map((d, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          {d.destination?.host && <HostLink host={d.destination.host} namespace={namespace} />}
          {d.destination?.subset && (
            <Chip size="small" label={`subset: ${d.destination.subset}`} variant="outlined" />
          )}
          {d.destination?.port?.number && <Mono>:{d.destination.port.number}</Mono>}
          {d.weight !== undefined && (
            <Chip
              size="small"
              color={total === 100 || route.route!.length === 1 ? 'default' : 'warning'}
              label={`${d.weight}%`}
            />
          )}
        </Box>
      ))}
      {route.route.length > 1 && total !== 100 && (
        <Typography variant="caption" color="warning.main">
          Weights total {total}, not 100.
        </Typography>
      )}
    </Box>
  );
}

function ResilienceSummary({ route }: { route: HTTPRoute }) {
  const bits: ReactNode[] = [];
  if (route.timeout)
    bits.push(<Chip key="t" size="small" label={`timeout ${route.timeout}`} variant="outlined" />);
  if (route.retries) {
    bits.push(
      <Chip
        key="r"
        size="small"
        label={`retries ${route.retries.attempts ?? '?'}${
          route.retries.perTryTimeout ? ` @${route.retries.perTryTimeout}` : ''
        }`}
        variant="outlined"
      />
    );
  }
  if (route.fault)
    bits.push(
      <Chip key="f" size="small" color="warning" label="fault injection" variant="outlined" />
    );
  if (route.mirror || route.mirrors)
    bits.push(<Chip key="m" size="small" label="mirror" variant="outlined" />);
  if (route.corsPolicy) bits.push(<Chip key="c" size="small" label="CORS" variant="outlined" />);

  if (bits.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{bits}</Box>;
}
