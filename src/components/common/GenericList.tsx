import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { isCrdInstalled, useIstioCrds } from '../../lib/detect';

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
  const { crds, loading, error } = useIstioCrds();

  // Say plainly that the CRD is absent rather than showing a permanently empty
  // table. `error` means the CRD list itself could not be read (usually RBAC),
  // in which case we cannot conclude anything and let the table report it.
  if (!loading && !error && !isCrdInstalled(crds, resourceClass)) {
    return <NotInstalled kind={resourceClass.kind} />;
  }

  return (
    // Vertical alignment is left to Headlamp, which centres cell content.
    //
    // Horizontally the actions column did not line up: its header label starts
    // at the left of the cell while the icon button sat in the middle of a
    // 63px column, so the dots read as pushed to the right of the heading.
    // Both now start at the same edge.
    //
    // The bottom padding is ours too: a plugin route renders without the
    // padding Headlamp's own pages get, so the page ends flush against the
    // bottom edge without it.
    <Box
      sx={{
        pb: 6,
        '& table thead th:last-of-type, & table tbody td:last-of-type': {
          justifyContent: 'flex-start',
        },
        // The icon button also carries a 10px left margin, which left it
        // sitting to the right of the heading it belongs under.
        '& table tbody td:last-of-type .MuiIconButton-root': { marginLeft: 0 },
      }}
    >
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
    </Box>
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
