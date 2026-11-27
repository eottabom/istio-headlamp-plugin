import { Icon } from '@iconify/react';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { Autocomplete, Box, Button, IconButton, TextField, Typography } from '@mui/material';
import { ClusterPrometheus, parseAddress } from '../../lib/prometheusParse';
import { PluginSettings as Settings } from '../../lib/settings';

const BLANK: ClusterPrometheus = { clusters: [], address: '' };

/** Settings form: Headlamp passes the stored values and saves what `onDataChange` gets. */
export function PluginSettings({
  data,
  onDataChange,
}: {
  data?: Settings;
  onDataChange?: (data: Settings) => void;
}) {
  const clusters = Object.keys(K8s.useClustersConf() ?? {}).sort();
  const rows = data?.prometheus?.length ? data.prometheus : [BLANK];
  const save = (next: ClusterPrometheus[]) => onDataChange?.({ ...data, prometheus: next });
  const edit = (i: number, change: Partial<ClusterPrometheus>) =>
    save(rows.map((row, j) => (j === i ? { ...row, ...change } : row)));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 800 }}>
      <Typography variant="h6">Traffic Map</Typography>
      <Typography variant="body2" color="text.secondary">
        For each group of clusters, the namespace/service:port/path of a Prometheus-compatible
        service with Istio metrics, read through the API server.
      </Typography>
      {rows.map((row, i) => {
        const invalid = row.address.trim() !== '' && !parseAddress(row.address);
        // A cluster is set by one row only: those of the other rows cannot be picked.
        const taken = new Set(rows.flatMap((r, j) => (j === i ? [] : r.clusters ?? [])));
        return (
          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Autocomplete
              multiple
              freeSolo
              size="small"
              options={clusters}
              getOptionDisabled={c => taken.has(c)}
              value={row.clusters ?? []}
              onChange={(_, picked) => edit(i, { clusters: picked.filter(c => !taken.has(c)) })}
              sx={{ width: 360 }}
              renderInput={params => <TextField {...params} label="Clusters" helperText=" " />}
            />
            <TextField
              label="Prometheus address"
              placeholder="istio-system/prometheus:9090"
              size="small"
              variant="outlined"
              sx={{ flex: 1 }}
              value={row.address}
              error={invalid}
              helperText={
                invalid ? 'Expected namespace/service:port, with an optional /path.' : ' '
              }
              onChange={e => edit(i, { address: e.target.value })}
            />
            <IconButton
              aria-label="Remove"
              title="Remove"
              onClick={() => save(rows.filter((_, j) => j !== i))}
            >
              <Icon icon="mdi:delete-outline" width="20px" />
            </IconButton>
          </Box>
        );
      })}
      <Box>
        <Button
          size="small"
          startIcon={<Icon icon="mdi:plus" />}
          onClick={() => save([...rows, BLANK])}
        >
          Add a cluster
        </Button>
      </Box>
    </Box>
  );
}
