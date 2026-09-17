import { Icon } from '@iconify/react';
import { Link } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Tooltip, Typography } from '@mui/material';
import { parseHost } from '../../lib/host';

/**
 * Renders an Istio host string, linking to the backing Service when the host
 * resolves to one. Turning `reviews` into a click-through is the difference
 * between reading a DestinationRule and having to go look the service up.
 */
export function HostLink({ host, namespace }: { host: string; namespace?: string }) {
  const parsed = parseHost(host, namespace);

  if (parsed.isWildcard) {
    return (
      <Tooltip title="Wildcard host">
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Icon icon="mdi:asterisk" width={14} />
          <Mono>{host}</Mono>
        </Box>
      </Tooltip>
    );
  }

  if (parsed.isClusterLocal && parsed.serviceName && parsed.namespace) {
    return (
      <Link
        routeName="service"
        params={{ name: parsed.serviceName, namespace: parsed.namespace }}
        tooltip={`Service ${parsed.serviceName}.${parsed.namespace}`}
      >
        <Mono>{host}</Mono>
      </Link>
    );
  }

  return (
    <Tooltip title="External host (not an in-cluster Service)">
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <Icon icon="mdi:earth" width={14} />
        <Mono>{host}</Mono>
      </Box>
    </Tooltip>
  );
}

export function HostList({ hosts, namespace }: { hosts?: string[]; namespace?: string }) {
  if (!hosts || hosts.length === 0) {
    return (
      <Typography component="span" variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {hosts.map(h => (
        <HostLink key={h} host={h} namespace={namespace} />
      ))}
    </Box>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
      {children}
    </Typography>
  );
}
