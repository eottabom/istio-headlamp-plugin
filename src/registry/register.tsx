import {
  registerDetailsViewSection,
  registerResourceTableColumnsProcessor,
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { MeshOverview } from '../ambient/Overview';
import { WaypointsPage } from '../ambient/Waypoints';
import { GenericDetail } from '../components/common/GenericDetail';
import { GenericList } from '../components/common/GenericList';
import {
  NamespaceIstioSection,
  PodIstioSection,
  ServiceIstioSection,
} from '../integration/detailsSections';
import { meshColumnsProcessor } from '../integration/tableColumns';
import { ROUTE_PREFIX } from '../resources/base';
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
    path: `${ROUTE_PREFIX}/waypoints`,
    exact: true,
    name: `${ROOT}-waypoints`,
    sidebar: { item: `${ROOT}-waypoints`, sidebar: 'IN-CLUSTER' },
    component: () => <WaypointsPage />,
  });

  // Group headers, then one list + detail route per resource.
  ISTIO_GROUPS.forEach(group => {
    const members = ISTIO_RESOURCES.filter(r => r.group === group);
    if (members.length === 0) return;

    const groupName = `${ROOT}-group-${group.toLowerCase()}`;
    registerSidebarEntry({
      name: groupName,
      label: group,
      icon: groupIcon(group),
      url: `${ROUTE_PREFIX}/${members[0].id}`,
      parent: ROOT,
    });

    members.forEach(def => registerResource(def, groupName));
  });

  registerResourceTableColumnsProcessor(meshColumnsProcessor);

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
  const listRouteName = `istio-${def.id}`;
  const detailRouteName = `istio-${def.id}-detail`;

  registerSidebarEntry({
    name: listRouteName,
    label: def.pluralLabel,
    icon: def.icon,
    url: `${ROUTE_PREFIX}/${def.id}`,
    parent,
  });

  registerRoute({
    path: `${ROUTE_PREFIX}/${def.id}`,
    exact: true,
    name: listRouteName,
    sidebar: { item: listRouteName, sidebar: 'IN-CLUSTER' },
    component: () => (
      <GenericList
        id={`istio-${def.id}`}
        title={def.pluralLabel}
        resourceClass={def.cls}
        columns={def.columns}
        description={def.description}
      />
    ),
  });

  registerRoute({
    path: `${ROUTE_PREFIX}/${def.id}/:namespace/:name`,
    exact: true,
    name: detailRouteName,
    sidebar: { item: listRouteName, sidebar: 'IN-CLUSTER' },
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

function groupIcon(group: string): string {
  switch (group) {
    case 'Networking':
      return 'mdi:lan';
    case 'Security':
      return 'mdi:shield-half-full';
    case 'Telemetry':
      return 'mdi:chart-line';
    default:
      return 'mdi:puzzle-outline';
  }
}
