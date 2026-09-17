import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

export interface IstioListProps {
  title: ReactNode;
  resourceClass: any;
  /** Columns inserted between the name/namespace columns and age. */
  columns?: any[];
  /** Explains what this resource does, shown above the table. */
  description?: string;
  id?: string;
}

/**
 * List page for an Istio resource.
 *
 * The extra columns matter more here than in core Kubernetes views: a list of
 * DestinationRules with no host or TLS mode column tells you nothing, which is
 * exactly the problem this plugin exists to fix.
 */
export function GenericList({
  title,
  resourceClass,
  columns = [],
  description,
  id,
}: IstioListProps) {
  return (
    <ResourceListView
      title={title}
      resourceClass={resourceClass}
      id={id}
      columns={['name', 'namespace', ...columns, 'age']}
    >
      {description ? (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      ) : null}
    </ResourceListView>
  );
}

/** Shown when the CRD backing a page is not installed in this cluster. */
export function NotInstalled({ kind }: { kind: string }) {
  return (
    <Alert severity="info" sx={{ m: 2 }}>
      <Typography sx={{ fontWeight: 600 }}>{kind} is not installed in this cluster</Typography>
      <Typography variant="body2">
        The CustomResourceDefinition for {kind} was not found. Install or upgrade Istio to use this
        view.
      </Typography>
    </Alert>
  );
}
