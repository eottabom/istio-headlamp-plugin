/**
 * Traffic Map: flows between namespaces, then between the workloads of the selected
 * namespaces, from Istio's standard metrics. Drawn with the building blocks of
 * Headlamp's Map so it looks and behaves like it.
 */
import { Icon } from '@iconify/react';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import {
  Loader,
  NamespacesAutocomplete,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Link,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled, ThemeProvider, useTheme } from '@mui/material/styles';
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import reactFlowCss from '@xyflow/react/dist/base.css?inline';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useHistory, useLocation } from 'react-router-dom';
import { PrometheusState, usePrometheus } from '../lib/prometheus';
import { endpointLabel, proxyPath } from '../lib/prometheusParse';
import { SETTINGS_URL } from '../lib/settings';
import {
  buildGraph,
  EdgeKind,
  FOLD_OVER,
  GraphView,
  GroupBy,
  levelOf,
  MIN_SHARE,
  neighbourhood,
  structureKey,
  TrafficGraph,
} from '../lib/trafficGraph';
import { groupId, Layout, layoutGraph, NODE_H, NODE_W } from '../lib/trafficLayout';
import { DEFAULT_WINDOW, Window, WINDOWS } from '../lib/trafficQuery';
import {
  EdgeData,
  edgeStyle,
  HiddenFlows,
  Legend,
  MAP_CSS,
  MapControls,
  NamespaceGroup,
  NodeData,
  TrafficEdgeView,
  TrafficNodeView,
} from './elements';
import { useTrafficData } from './useTrafficData';

const nodeTypes = { traffic: TrafficNodeView, group: NamespaceGroup };
const edgeTypes = { traffic: TrafficEdgeView };
const ALL_KINDS: EdgeKind[] = ['mtls', 'plaintext'];
const KIND_TEXT: Record<EdgeKind, string> = {
  mtls: 'mTLS',
  plaintext: 'Plaintext',
};
const GROUP_BY: [GroupBy, string][] = [
  ['namespace', 'Namespace'],
  ['workload', 'Workload'],
  ['app', 'App'],
];

/** Headlamp loads React Flow's styles with its own Map only: bring them, and the Map's. */
function useMapCss() {
  useEffect(() => {
    if (document.getElementById('istio-traffic-map-css')) return;
    const style = document.createElement('style');
    style.id = 'istio-traffic-map-css';
    style.textContent = reactFlowCss + MAP_CSS;
    document.head.appendChild(style);
  }, []);
}

// The Map's theme: grey primary chips and buttons.
function MapTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      theme={(outer: any) => ({
        ...outer,
        palette: {
          ...outer.palette,
          primary:
            outer.palette.mode === 'light'
              ? { main: '#555', contrastText: '#fff', light: '#666', dark: '#444' }
              : { main: '#fafafa', contrastText: '#444', light: '#fff', dark: '#f0f0f0' },
        },
      })}
    >
      {children}
    </ThemeProvider>
  );
}

// The Map's chip group and toggle chip.
const ChipGroup = styled(Box)({
  display: 'flex',
  '.MuiChip-root': { borderRadius: 0 },
  '.MuiChip-root:first-of-type': { borderRadius: '16px 0 0 16px' },
  '.MuiChip-root:last-of-type': { borderRadius: '0 16px 16px 0' },
});

function ChipToggle(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Chip
      label={props.label}
      color={props.active ? 'primary' : undefined}
      variant={props.active ? 'filled' : 'outlined'}
      icon={props.active ? <Icon icon="mdi:check" /> : undefined}
      onClick={props.onClick}
      sx={{ lineHeight: '2' }}
    />
  );
}

function WindowChip({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Chip
        label={`Last ${value}`}
        variant="outlined"
        onClick={e => setAnchor(e.currentTarget)}
        sx={{ lineHeight: '2' }}
      />
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {WINDOWS.map(w => (
          <MenuItem
            key={w}
            selected={w === value}
            onClick={() => {
              onChange(w);
              setAnchor(null);
            }}
          >
            Last {w}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

const MISSING_TEXT: Record<Exclude<PrometheusState['state'], 'ok' | 'checking'>, string> = {
  unset:
    'The map reads Istio metrics from a Prometheus-compatible service: set its address for this cluster.',
  empty:
    'Prometheus answers but has no Istio metrics. Check that it scrapes ztunnel or the sidecars.',
  forbidden: 'Not allowed to read Prometheus: this needs get on services/proxy in its namespace.',
  unreachable: 'Prometheus does not answer at this address.',
};

const settingLink = (
  <Link component={RouterLink} to={SETTINGS_URL} color="inherit" underline="always">
    Prometheus setting
  </Link>
);

/** Which Prometheus the map reads, or why it reads none and what is needed. */
function PrometheusStatus({ prom }: { prom: PrometheusState }) {
  if (prom.state === 'checking') return <Loader title="Checking Prometheus" />;
  if (prom.state === 'ok') return null;
  return (
    <SectionBox title="Traffic Map">
      <Alert severity={prom.state === 'forbidden' ? 'error' : 'info'}>
        {MISSING_TEXT[prom.state]} {settingLink}
      </Alert>
    </SectionBox>
  );
}

/** Where the data comes from: an info icon, with a link to the setting. */
function SourceInfo({ prom, ms }: { prom: PrometheusState; ms?: number }) {
  if (prom.state !== 'ok') return null;
  const text = `Data: ${endpointLabel(prom.endpoint)}${ms ? `, read in ${ms} ms` : ''}.`;
  return (
    <Tooltip
      title={
        <>
          <div>{text}</div>
          {settingLink}
        </>
      }
    >
      <Box component="span" sx={{ display: 'inline-flex', cursor: 'help' }} aria-label={text}>
        <Icon icon="mdi:information-outline" width="20px" />
      </Box>
    </Tooltip>
  );
}

/**
 * The Deployments, StatefulSets and DaemonSets of one selected namespace, for the kind
 * shown above a workload's name.
 */
function WorkloadKinds(props: {
  namespace: string;
  onChange: (namespace: string, kinds: Map<string, string>) => void;
}) {
  const { namespace, onChange } = props;
  const [deployments] = K8s.ResourceClasses.Deployment.useList({ namespace });
  const [statefulSets] = K8s.ResourceClasses.StatefulSet.useList({ namespace });
  const [daemonSets] = K8s.ResourceClasses.DaemonSet.useList({ namespace });
  useEffect(() => {
    const kinds = new Map<string, string>();
    for (const o of [...(deployments ?? []), ...(statefulSets ?? []), ...(daemonSets ?? [])]) {
      kinds.set(`${namespace}/${o.metadata.name}`, o.kind);
    }
    onChange(namespace, kinds);
  }, [deployments, statefulSets, daemonSets]);
  return null;
}

/**
 * Headlamp's namespace filter, sorted. Headlamp keeps it in the URL too
 * (`?namespace=a b`), so a change goes to both, as its own selector does.
 */
function useSelectedNamespaces(): [string[], (namespaces: string[]) => void] {
  const selected: Set<string> | undefined = useSelector((s: any) => s.filter?.namespaces);
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const list = useMemo(() => [...(selected ?? [])].sort(), [selected]);
  const set = (namespaces: string[]) => {
    const params = new URLSearchParams(location.search);
    if (namespaces.length) params.set('namespace', namespaces.join(' '));
    else params.delete('namespace');
    history.push({ pathname: location.pathname, search: params.toString() });
    dispatch({ type: 'filter/setNamespaceFilter', payload: namespaces });
  };
  return [list, set];
}

/** The layout is kept while only rates change, so nodes do not jump on a refresh. */
function useStableLayout(graph: TrafficGraph): Layout {
  const cached = useRef<{ key: string; layout: Layout } | null>(null);
  const key = structureKey(graph);
  if (cached.current?.key !== key) cached.current = { key, layout: layoutGraph(graph) };
  return cached.current.layout;
}

/** Graph and layout -> React Flow nodes and edges: boxes below, then edges, then nodes. */
function toFlow(
  graph: TrafficGraph,
  layout: Layout,
  selected: string | null,
  kinds: Map<string, string>,
  theme: any
): { nodes: Node[]; edges: Edge[] } {
  const near = neighbourhood(graph, selected);
  const nodes: Node[] = [...layout.groups].map(([id, b]) => ({
    id,
    type: 'group',
    position: { x: b.x, y: b.y },
    style: { width: b.w, height: b.h },
    data: { label: id.slice('group:'.length) },
    selectable: false,
    zIndex: 0,
  }));
  for (const n of graph.nodes) {
    const p = layout.nodes.get(n.id)!;
    const box = n.namespace ? layout.groups.get(groupId(n.namespace)) : undefined;
    const data: NodeData = {
      node: n,
      objKind: kinds.get(n.id),
      faded: !!near && !near.nodes.has(n.id),
    };
    nodes.push({
      id: n.id,
      type: 'traffic',
      position: box ? { x: p.x - box.x, y: p.y - box.y } : p,
      parentId: box ? groupId(n.namespace!) : undefined,
      data,
      selected: n.id === selected,
      width: NODE_W,
      height: NODE_H,
      zIndex: 2,
    });
  }
  const edges: Edge[] = graph.edges.map(e => {
    const data: EdgeData = {
      edge: e,
      points: layout.edges.get(e.id),
      faded: !!near && !near.edges.has(e.id),
      showRate: !!near?.edges.has(e.id),
    };
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'traffic',
      data,
      selectable: false,
      // Above the namespace boxes, whose background would wash them out.
      zIndex: near?.edges.has(e.id) ? 3 : 1,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyle(e.kind, theme).color },
    };
  });
  return { nodes, edges };
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
      }}
    >
      {children}
    </Box>
  );
}

function TrafficCanvas() {
  useMapCss();
  const theme = useTheme();
  const flow = useReactFlow();
  const prom = usePrometheus();
  const [namespaces, setNamespaces] = useSelectedNamespaces();
  const [shown, setShown] = useState(new Set<EdgeKind>(ALL_KINDS));
  const [rateWindow, setRateWindow] = useState<Window>(DEFAULT_WINDOW);
  const [groupBy, setGroupBy] = useState<GroupBy>('workload');
  const [fold, setFold] = useState(true);
  const [hideSmall, setHideSmall] = useState(false);
  // Fold nodes opened by a double-click, until the namespaces change.
  const [unfolded, setUnfolded] = useState(new Set<string>());
  const [selected, setSelected] = useState<string | null>(null);
  /*
   * Double-clicks are told from clicks by hand: the first click selects the node and
   * fades the others, and React Flow then loses the native double-click.
   */
  const lastClick = useRef<{ id: string; at: number } | null>(null);
  const [kindsByNs, setKindsByNs] = useState<Record<string, Map<string, string>>>({});

  const view: GraphView = useMemo(
    () => ({
      namespaces: new Set(namespaces),
      kinds: shown,
      groupBy,
      foldOver: fold ? FOLD_OVER : 0,
      unfolded,
      minShare: hideSmall ? MIN_SHARE : 0,
    }),
    [namespaces, shown, groupBy, fold, unfolded, hideSmall]
  );
  const traffic = useTrafficData(
    prom.state === 'ok' ? proxyPath(prom.endpoint) : null,
    levelOf(view),
    namespaces,
    rateWindow
  );

  useEffect(() => {
    setSelected(null);
    setUnfolded(new Set());
  }, [namespaces.join(',')]);

  const kinds = useMemo(
    () => new Map(namespaces.flatMap(ns => [...(kindsByNs[ns] ?? [])])),
    [kindsByNs, namespaces]
  );
  const graph = useMemo(() => buildGraph(traffic.flows, view), [traffic.flows, view]);
  const layout = useStableLayout(graph);
  const { nodes, edges } = useMemo(
    () => toFlow(graph, layout, selected, kinds, theme),
    [graph, layout, selected, kinds, theme]
  );

  // Fit the view when the drawing changes, not when only the rates do.
  const key = structureKey(graph);
  useEffect(() => {
    const t = setTimeout(() => flow.fitView({ padding: 0.1, duration: 150 }), 50);
    return () => clearTimeout(t);
  }, [key]);

  if (prom.state !== 'ok') return <PrometheusStatus prom={prom} />;

  const flip = (k: EdgeKind) =>
    setShown(prev => {
      const next = new Set(prev);
      if (!next.delete(k)) next.add(k);
      return next;
    });
  const selectedName = graph.nodes.find(n => n.id === selected)?.name;
  const nsText = `Namespace${namespaces.length > 1 ? 's' : ''} ${namespaces.join(', ')}`;
  const home = () => {
    setSelected(null);
    setNamespaces([]);
  };

  return (
    // The Map's frame: the whole page, toolbar on top, canvas below.
    <Box
      className="istio-traffic-map"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#00000002' }}
    >
      {namespaces.map(ns => (
        <WorkloadKinds
          key={ns}
          namespace={ns}
          onChange={(n, k) => setKindsByNs(prev => ({ ...prev, [n]: k }))}
        />
      ))}
      <Box padding={2} pb={0} mb={1} display="flex" gap={1} alignItems="center" flexWrap="wrap">
        <NamespacesAutocomplete />
        <Box sx={{ fontSize: '14px', marginLeft: 1 }}>Group By</Box>
        <ChipGroup>
          {GROUP_BY.map(([g, label]) => (
            <ChipToggle
              key={g}
              label={label}
              active={groupBy === g}
              onClick={() => setGroupBy(g)}
            />
          ))}
        </ChipGroup>
        <ChipGroup>
          {ALL_KINDS.map(k => (
            <ChipToggle
              key={k}
              label={KIND_TEXT[k]}
              active={shown.has(k)}
              onClick={() => flip(k)}
            />
          ))}
        </ChipGroup>
        <ChipGroup>
          <ChipToggle
            label={`Fold > ${FOLD_OVER} peers`}
            active={fold}
            onClick={() => setFold(v => !v)}
          />
          <ChipToggle
            label={`Hide < ${MIN_SHARE * 100}%`}
            active={hideSmall}
            onClick={() => setHideSmall(v => !v)}
          />
        </ChipGroup>
        <WindowChip value={rateWindow} onChange={setRateWindow} />
        <Button
          size="small"
          disabled={traffic.status === 'loading'}
          startIcon={
            traffic.status === 'loading' ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <Icon icon="mdi:refresh" />
            )
          }
          onClick={traffic.refresh}
        >
          Refresh
        </Button>
        {traffic.at && (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Updated {traffic.at.toLocaleTimeString()}
          </Typography>
        )}
        <SourceInfo prom={prom} ms={traffic.ms} />
      </Box>
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          minZoom={0.1}
          maxZoom={2}
          zoomOnDoubleClick={false}
          onNodeClick={(_e, n) => {
            if (n.type !== 'traffic') return;
            const now = Date.now();
            const double = lastClick.current?.id === n.id && now - lastClick.current.at < 400;
            lastClick.current = { id: n.id, at: now };
            const { node } = n.data as NodeData;
            if (double && node.kind === 'namespace') setNamespaces([node.id]);
            else if (double && node.kind === 'fold')
              setUnfolded(prev => new Set(prev).add(node.id));
            else setSelected(n.id);
          }}
          onPaneClick={() => setSelected(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color={theme.palette.divider} size={2} />
          <Controls showInteractive={false} showFitView={false} showZoom={false}>
            <MapControls />
          </Controls>
          <Panel position="top-left">
            <Breadcrumbs>
              {namespaces.length || selectedName ? (
                <Link component="button" onClick={home}>
                  Home
                </Link>
              ) : (
                <Typography>Home</Typography>
              )}
              {namespaces.length > 0 &&
                (selectedName ? (
                  <Link component="button" onClick={() => setSelected(null)}>
                    {nsText}
                  </Link>
                ) : (
                  <Typography>{nsText}</Typography>
                ))}
              {selectedName && <Typography>{selectedName}</Typography>}
            </Breadcrumbs>
          </Panel>
          <Panel position="bottom-right">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <HiddenFlows hidden={graph.hidden} />
              <Legend />
            </Box>
          </Panel>
          {traffic.status === 'loading' && !nodes.length && (
            <Centered>
              <Loader title="Loading" />
            </Centered>
          )}
          {traffic.status === 'error' && (
            <Centered>
              <Typography>{traffic.error}</Typography>
            </Centered>
          )}
          {traffic.status === 'ready' && !nodes.length && (
            <Centered>
              <Typography>No traffic in the last {rateWindow}.</Typography>
            </Centered>
          )}
        </ReactFlow>
      </Box>
    </Box>
  );
}

export function TrafficMapPage() {
  return (
    <MapTheme>
      <ReactFlowProvider>
        <TrafficCanvas />
      </ReactFlowProvider>
    </MapTheme>
  );
}
