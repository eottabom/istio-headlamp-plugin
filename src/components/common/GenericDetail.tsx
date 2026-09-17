import { DetailsGrid, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { IstioObject } from '../../resources/base';
import { AppliesTo } from './Badges';
import { Row } from './SpecSection';
import { SpecTree } from './SpecTree';

export interface IstioDetailProps<T extends IstioObject = IstioObject> {
  resourceClass: any;
  /** Rows merged into the header info table. */
  headerInfo?: (item: T) => Row[];
  /** Typed sections rendered above the generic spec view. */
  sections?: (item: T) => ReactNode[];
  /** Hide the "Applies to" section, for resources where it is meaningless. */
  hideAppliesTo?: boolean;
}

/**
 * The detail page every Istio resource uses.
 *
 * Layout is deliberate: the header carries the handful of fields people open
 * the page for, typed sections explain the parts we understand, and the full
 * spec is always rendered underneath so nothing is ever invisible. The YAML
 * editor stays available through Headlamp's own edit action, but it is no
 * longer the only way to see what a resource says.
 */
export function GenericDetail<T extends IstioObject>({
  resourceClass,
  headerInfo,
  sections,
  hideAppliesTo,
}: IstioDetailProps<T>) {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    // Plugin routes render without the padding Headlamp's own pages get, so the
    // last section (usually Events) sat clipped against the bottom edge.
    <Box sx={{ pb: 6 }}>
      <DetailsGrid
      resourceType={resourceClass}
      name={name}
      namespace={namespace}
      withEvents
      extraInfo={(item: T | null) =>
        item && headerInfo ? headerInfo(item).map(toNameValueRow) : []
      }
      extraSections={(item: T) => {
        if (!item) return [];
        const nodes: ReactNode[] = [];

        if (!hideAppliesTo) {
          nodes.push(
            <SectionBox key="applies-to" title="Applies to">
              <AppliesTo resource={item} />
            </SectionBox>
          );
        }

        sections?.(item).forEach((node, i) => {
          if (node) nodes.push(<div key={`typed-${i}`}>{node}</div>);
        });

        nodes.push(
          <SectionBox key="full-spec" title="Full spec">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Every field of <code>.spec</code>, including anything the sections above do not cover.
            </Typography>
            <SpecTree value={item.jsonData.spec} />
          </SectionBox>
        );

        const status = item.jsonData.status;
        if (status && Object.keys(status).length > 0) {
          nodes.push(
            <SectionBox key="status" title="Status">
              <SpecTree value={status} />
            </SectionBox>
          );
        }

        return nodes;
        }}
      />
    </Box>
  );
}

function toNameValueRow(row: Row) {
  return { name: row.name, value: row.value };
}
