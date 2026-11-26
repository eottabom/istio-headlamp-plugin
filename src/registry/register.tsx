import {
  registerDetailsViewSection,
  registerPluginSettings,
  registerResourceTableColumnsProcessor,
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { MeshOverview } from '../ambient/Overview';
import { WaypointsPage } from '../ambient/Waypoints';
import { GenericDetail } from '../components/common/GenericDetail';
import { GenericList } from '../components/common/GenericList';
import { PluginSettings } from '../components/settings/PluginSettings';
import {
  NamespaceIstioSection,
  PodIstioSection,
  ServiceIstioSection,
} from '../integration/detailsSections';
import { meshColumnsProcessor } from '../integration/tableColumns';
import { PLUGIN_NAME } from '../lib/settings';
import { detailRouteName, listRouteName, ROUTE_PREFIX } from '../resources/base';
import { TrafficMapPage } from '../traffic/TrafficMapPage';
import { ISTIO_GROUPS, ISTIO_RESOURCES, IstioResourceDef } from './resources';

const ROOT = 'istio';

/**
 * Wires the resource registry into Headlamp's sidebar and router.
 *
 * Everything is derived from `ISTIO_RESOURCES`, so adding a CRD means adding one
 * entry there -- no route, sidebar or page boilerplate to keep in sync.
 */
export function registerIstioPlugin() {
  registerSidebarEntry({
    name: ROOT,
    label: 'Istio',
    icon: 'simple-icons:istio',
    url: `${ROUTE_PREFIX}`,
    parent: null,
  });

  registerSidebarEntry({
    name: `${ROOT}-overview`,
    label: 'Mesh Overview',
    icon: 'mdi:view-dashboard-outline',
    url: `${ROUTE_PREFIX}`,
    parent: ROOT,
  });

  // Always listed: Prometheus is read when the page opens, not on every page load.
  registerSidebarEntry({
    name: `${ROOT}-traffic-map`,
    label: 'Traffic Map',
    icon: 'mdi:graph-outline',
    url: `${ROUTE_PREFIX}/traffic-map`,
    parent: ROOT,
  });

  registerSidebarEntry({
    name: `${ROOT}-waypoints`,
    label: 'Waypoints',
    icon: 'mdi:signpost-right',
    url: `${ROUTE_PREFIX}/waypoints`,
    parent: ROOT,
  });

  registerRoute({
    path: ROUTE_PREFIX,
    exact: true,
    name: `${ROOT}-overview`,
    sidebar: { item: `${ROOT}-overview`, sidebar: 'IN-CLUSTER' },
    component: () => <MeshOverview />,
  });

  registerRoute({
    path: `${ROUTE_PREFIX}/traffic-map`,
    exact: true,
    name: `${ROOT}-traffic-map`,
    sidebar: { item: `${ROOT}-traffic-map`, sidebar: 'IN-CLUSTER' },
    // Like Headlamp's Map: the whole page, no margins.
    isFullWidth: true,
    component: () => <TrafficMapPage />,
  });

  registerRoute({
    path: `${ROUTE_PREFIX}/waypoints`,
    exact: true,
    name: `${ROOT}-waypoints`,
    sidebar: { item: `${ROOT}-waypoints`, sidebar: 'IN-CLUSTER' },
    component: () => <WaypointsPage />,
  });

  // One flat level of resource entries, ordered by group.
  //
  // Nesting them under Networking/Security/... headers read better on paper but
  // put the labels two levels deep, where the sidebar's indent left so little
  // width that every entry truncated ("Virtual Servi...", "Gateways (Is..."). A
  // flat list keeps the full names legible, which matters more.
  ISTIO_GROUPS.forEach(group => {
    ISTIO_RESOURCES.filter(r => r.group === group).forEach(def => registerResource(def, ROOT));
  });

  // Note: entries for CRDs the cluster does not have stay visible. Headlamp
  // evaluates sidebar entry filters inside a useMemo whose dependencies a
  // plugin cannot influence, so a filter driven by an async CRD lookup would
  // apply only sometimes. An entry that intermittently vanishes is worse than
  // one that is always there, so the list page says the CRD is missing instead.

  registerResourceTableColumnsProcessor(meshColumnsProcessor);

  registerPluginSettings(PLUGIN_NAME, PluginSettings, true);

  registerDetailsViewSection(({ resource }: { resource: KubeObject }) => {
    if (!resource) return null;
    switch (resource.kind) {
      case 'Service':
        return <ServiceIstioSection resource={resource} />;
      case 'Pod':
        return <PodIstioSection resource={resource} />;
      case 'Namespace':
        return <NamespaceIstioSection resource={resource} />;
      default:
        return null;
    }
  });
}

function registerResource(def: IstioResourceDef, parent: string) {
  const listRoute = listRouteName(def.id);
  const detailRoute = detailRouteName(def.id);

  registerSidebarEntry({
    name: listRoute,
    label: def.pluralLabel,
    icon: def.icon,
    url: `${ROUTE_PREFIX}/${def.id}`,
    parent,
  });

  registerRoute({
    path: `${ROUTE_PREFIX}/${def.id}`,
    exact: true,
    name: listRoute,
    sidebar: { item: listRoute, sidebar: 'IN-CLUSTER' },
    component: () =>
      def.listComponent ? (
        def.listComponent()
      ) : (
        <GenericList
          id={`istio-${def.id}`}
          title={def.title ?? def.pluralLabel}
          resourceClass={def.cls}
          columns={def.columns}
          description={def.description}
        />
      ),
  });

  registerRoute({
    path: `${ROUTE_PREFIX}/${def.id}/:namespace/:name`,
    exact: true,
    name: detailRoute,
    sidebar: { item: listRoute, sidebar: 'IN-CLUSTER' },
    component: () => (
      <GenericDetail
        resourceClass={def.cls}
        headerInfo={def.headerInfo}
        sections={def.sections}
        hideAppliesTo={def.hideAppliesTo}
      />
    ),
  });
}
