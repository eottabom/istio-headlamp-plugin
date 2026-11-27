/**
 * React Flow nodes, edges and controls of the Traffic Map. Styles are copied from
 * Headlamp's Map (frontend/src/components/resourceMap) so both look the same.
 */
import { Icon } from '@iconify/react';
import { Box, Button, ButtonGroup, Tooltip } from '@mui/material';
import { alpha, styled, Theme, useTheme } from '@mui/material/styles';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  Handle,
  NodeProps,
  Position,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import { memo, ReactNode } from 'react';
import { EdgeKind, Hidden, MIN_SHARE, TrafficEdge, TrafficNode } from '../lib/trafficGraph';
import { edgePath, Point } from '../lib/trafficLayout';
import { formatRate } from '../lib/trafficParse';

/** Headlamp hands its Map icons to plugins at runtime only. */
const KubeIcon = (window as any).pluginLib?.ResourceMap?.KubeIcon;

const FADED = 0.3;

/**
 * From the Map's GraphView.css: React Flow gives group nodes a border and a grey
 * background, which the Map removes.
 */
export const MAP_CSS = `
.istio-traffic-map .react-flow__node { transition: transform 0.15s; }
.istio-traffic-map .react-flow__node:not(.parent):hover { z-index: 1 !important; }
.istio-traffic-map .react-flow__node-group,
.istio-traffic-map .react-flow__node-group.selected {
  border: unset; color: unset; background: unset; box-shadow: none; padding: 0;
}
`;

export interface NodeData {
  node: TrafficNode;
  /** Kubernetes kind of a workload, when known. */
  objKind?: string;
  faded?: boolean;
  [key: string]: unknown;
}

export interface EdgeData {
  edge: TrafficEdge;
  /** The route from the layout. */
  points?: Point[];
  faded?: boolean;
  /** Rates are shown on the edges of the selected node only. */
  showRate?: boolean;
  [key: string]: unknown;
}

// The Map's KubeObjectNode, with names on up to two lines.
const Container = styled('div')<{ selected?: boolean; count?: number }>(
  ({ theme, selected, count = 0 }) => {
    const card = (offset: string, z: string) => ({
      content: `''`,
      position: 'absolute' as const,
      width: '100%',
      height: '100%',
      left: offset,
      top: offset,
      zIndex: z,
      background: theme.palette.background.paper,
      border: '1px solid',
      borderColor: theme.palette.divider,
      borderRadius: '10px',
    });
    return {
      position: 'absolute',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px',
      cursor: 'pointer',
      background: theme.palette.background.paper,
      borderRadius: '10px',
      border: '1px solid',
      borderColor: selected ? theme.palette.action.active : theme.palette.divider,
      ':hover': {
        borderColor: selected ? undefined : alpha(theme.palette.action.active, 0.2),
        boxShadow: '4px 4px 6px rgba(0,0,0,0.06)',
      },
      // A namespace node holding several workloads looks stacked, as in the Map.
      '::before': count > 1 ? card('5px', '-1') : undefined,
      '::after': count > 2 ? card('9px', '-2') : undefined,
    };
  }
);

const CircleBadge = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  width: '32px',
  height: '32px',
  margin: theme.spacing(-1),
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: theme.palette.background.paper,
  boxShadow: '1px 1px 5px rgba(0,0,0,0.08)',
  border: '1px solid',
  borderColor: theme.palette.divider,
  color: theme.typography.caption.color,
}));

const Name = styled('div')({
  lineHeight: 1.25,
  overflowWrap: 'anywhere',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

const KIND_TEXT: Record<TrafficNode['kind'], string> = {
  namespace: 'Namespace',
  workload: 'Workload',
  'outside-in': 'External, in',
  'outside-out': 'External, out',
  fold: 'Folded',
};

/** Icons for nodes that are not a Kubernetes object; the others use the Map's icons. */
const OTHER_ICONS: Partial<Record<TrafficNode['kind'], string>> = {
  'outside-in': 'mdi:earth',
  'outside-out': 'mdi:earth',
  fold: 'mdi:layers-outline',
};

const BADGE_TEXT = (n: TrafficNode) =>
  n.kind === 'fold'
    ? `${n.count} peers folded into this node`
    : `${n.count} workloads of this namespace in these flows`;

/** Shown on hover for the nodes a double-click opens. */
const HINT: Partial<Record<TrafficNode['kind'], string>> = {
  namespace: 'Double-click to show its workloads',
  fold: 'Double-click to unfold',
};

export const TrafficNodeView = memo(({ data, selected }: NodeProps) => {
  const theme = useTheme();
  const { node, objKind, faded } = data as NodeData;
  const kind = node.app ? 'App' : objKind ?? KIND_TEXT[node.kind];
  const icon = node.app ? 'mdi:apps' : OTHER_ICONS[node.kind];
  return (
    <Tooltip title={HINT[node.kind] ?? ''} enterDelay={400} disableInteractive>
      <Container selected={selected} count={node.count} style={{ opacity: faded ? FADED : 1 }}>
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        {!!node.count && <CircleBadge title={BADGE_TEXT(node)}>{node.count}</CircleBadge>}
        {!icon && KubeIcon ? (
          <KubeIcon width="42px" height="42px" kind={kind} />
        ) : (
          <Icon
            icon={icon ?? 'mdi:cube-outline'}
            width="42px"
            height="42px"
            color={theme.palette.action.active}
          />
        )}
        <Box sx={{ overflow: 'hidden' }}>
          <Box sx={{ opacity: 0.8, fontSize: 14 }}>{kind}</Box>
          <Name>{node.name}</Name>
        </Box>
      </Container>
    </Tooltip>
  );
});

// The Map's GroupNode.
const Frame = styled('div')(({ theme }) => ({
  width: '100%',
  height: '100%',
  background: alpha(theme.palette.background.paper, 0.6),
  border: '1px solid',
  borderColor: theme.palette.divider,
  borderRadius: theme.spacing(1.5),
}));

const FrameLabel = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '8px 12px',
  fontSize: '16px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const NamespaceGroup = memo(({ data }: NodeProps) => {
  const { label } = data as { label: string };
  return (
    <Frame>
      <FrameLabel title={label}>
        {KubeIcon && <KubeIcon kind="Namespace" width="24px" height="24px" />}
        <Box sx={{ opacity: 0.8 }}>Namespace</Box>
        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Box>
      </FrameLabel>
    </Frame>
  );
});

/** Colour and dash of each edge kind: mTLS keeps the Map's grey. */
export function edgeStyle(kind: EdgeKind, theme: Theme): { color: string; dash?: string } {
  if (kind === 'plaintext') return { color: theme.palette.warning.main, dash: '6 4' };
  return { color: alpha(theme.palette.action.active, 0.8) };
}

export const TrafficEdgeView = memo((props: EdgeProps) => {
  const theme = useTheme();
  const { edge, points, faded, showRate } = props.data as EdgeData;
  const { path, mid } = edgePath(
    { x: props.sourceX, y: props.sourceY },
    { x: props.targetX, y: props.targetY },
    points
  );
  const { color, dash } = edgeStyle(edge.kind, theme);
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={{
          stroke: color,
          strokeWidth: edge.kind === 'mtls' ? 1.5 : 2,
          strokeDasharray: dash,
          strokeLinecap: 'round',
          opacity: faded ? FADED : 1,
        }}
      />
      {showRate && (
        <EdgeLabelRenderer>
          <Box
            sx={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)`,
              pointerEvents: 'none',
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              fontSize: 12,
              whiteSpace: 'nowrap',
              bgcolor: 'background.paper',
              color: edge.kind === 'mtls' ? 'text.primary' : color,
              border: '1px solid',
              borderColor: edge.kind === 'mtls' ? 'divider' : color,
            }}
          >
            {formatRate(edge.rate)}
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// The Map's GraphControlButton and GraphControls.
function ControlButton(props: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="contained"
      color="primary"
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      sx={{
        width: '32px',
        height: '32px',
        minWidth: '32px',
        padding: 0,
        borderRadius: '50%',
        fontSize: 'x-small',
        '> svg': { width: '14px', height: '14px' },
      }}
    >
      {props.children}
    </Button>
  );
}

export function MapControls() {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const minZoom = useStore(s => s.transform[2] <= s.minZoom);
  const maxZoom = useStore(s => s.transform[2] >= s.maxZoom);
  return (
    <Box display="flex" gap={1} flexDirection="column">
      <ButtonGroup
        orientation="vertical"
        variant="contained"
        sx={{ borderRadius: '40px', '> .MuiButtonGroup-grouped': { minWidth: '32px' } }}
      >
        <ControlButton title="Zoom in" disabled={maxZoom} onClick={() => zoomIn()}>
          <Icon icon="mdi:plus" />
        </ControlButton>
        <ControlButton title="Zoom out" disabled={minZoom} onClick={() => zoomOut()}>
          <Icon icon="mdi:minus" />
        </ControlButton>
      </ButtonGroup>
      <ControlButton title="Fit to screen" onClick={() => fitView({ padding: 0.1, duration: 150 })}>
        <Icon icon="mdi:fit-to-screen" />
      </ControlButton>
      <ControlButton title="Zoom to 100%" onClick={() => zoomTo(1, { duration: 150 })}>
        100%
      </ControlButton>
    </Box>
  );
}

const PANEL_SX = {
  display: 'flex',
  gap: 2,
  px: 1.5,
  py: 0.75,
  fontSize: 13,
  borderRadius: 1,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
};

/** How many flows Fold and Hide keep from being drawn on their own. */
export function HiddenFlows({ hidden }: { hidden: Hidden }) {
  const total = hidden.folded + hidden.small;
  if (!total) return null;
  const causes = [
    hidden.folded && `${hidden.folded} folded`,
    hidden.small && `${hidden.small} under ${MIN_SHARE * 100}%`,
  ].filter(Boolean);
  return (
    <Box sx={PANEL_SX}>
      {total} flow{total > 1 ? 's' : ''} hidden ({causes.join(', ')})
    </Box>
  );
}

export function Legend() {
  const theme = useTheme();
  const items: [EdgeKind, string][] = [
    ['mtls', 'mTLS'],
    ['plaintext', 'Plaintext'],
  ];
  return (
    <Box sx={PANEL_SX}>
      {items.map(([kind, text]) => {
        const { color, dash } = edgeStyle(kind, theme);
        return (
          <Box key={kind} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <svg width="28" height="8" aria-hidden="true">
              <line
                x1="2"
                y1="4"
                x2="26"
                y2="4"
                stroke={color}
                strokeWidth={2}
                strokeDasharray={dash}
              />
            </svg>
            {text}
          </Box>
        );
      })}
    </Box>
  );
}
