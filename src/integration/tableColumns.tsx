import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { Typography } from '@mui/material';
import { MeshBadge } from '../components/common/Badges';
import { namespaceMeshState, podMeshState } from '../lib/mesh';

/**
 * Adds a "Mesh" column to Headlamp's own Pod and workload lists.
 *
 * Only tables that declare an ID can be targeted, which today means
 * `headlamp-pods` and `headlamp-workloads`. Namespace and Service lists do not
 * set one, so those views get the information through their details sections
 * instead.
 */

function PodMeshCell({ pod }: { pod: KubeObject }) {
  // react-query dedupes this across every cell in the table.
  const [namespaces] = K8s.ResourceClasses.Namespace.useList();
  const ns = (namespaces ?? []).find(n => n.metadata.name === pod.metadata.namespace) ?? null;
  return <MeshBadge state={podMeshState(pod, ns as any)} />;
}

function WorkloadMeshCell({ workload }: { workload: KubeObject }) {
  const [namespaces] = K8s.ResourceClasses.Namespace.useList();
  const ns = (namespaces ?? []).find(n => n.metadata.name === workload.metadata.namespace) ?? null;

  const podTemplate = (workload.jsonData as any)?.spec?.template;
  if (!podTemplate) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }
  // The pod template is enough to answer the question without listing pods.
  const pseudoPod = {
    metadata: podTemplate.metadata ?? {},
    jsonData: { spec: podTemplate.spec ?? {} },
  } as unknown as KubeObject;

  return <MeshBadge state={podMeshState(pseudoPod, ns as any)} />;
}

const meshColumn = (render: (item: any) => JSX.Element) => ({
  id: 'istio-mesh',
  label: 'Mesh',
  getValue: () => '',
  render,
  gridTemplate: 'min-content',
});

export const meshColumnsProcessor = {
  id: 'istio-headlamp-plugin-mesh-column',
  processor: ({ id, columns }: { id: string; columns: any[] }) => {
    if (columns.some((c: any) => c?.id === 'istio-mesh')) return columns;

    if (id === 'headlamp-pods') {
      return insertBeforeAge(
        columns,
        meshColumn(item => <PodMeshCell pod={item} />)
      );
    }
    if (id === 'headlamp-workloads') {
      return insertBeforeAge(
        columns,
        meshColumn(item => <WorkloadMeshCell workload={item} />)
      );
    }
    return columns;
  },
};

/** Keep "Age" last, where people expect it. */
function insertBeforeAge(columns: any[], column: any): any[] {
  const ageIndex = columns.findIndex((c: any) => c === 'age' || c?.id === 'age');
  if (ageIndex < 0) return [...columns, column];
  return [...columns.slice(0, ageIndex), column, ...columns.slice(ageIndex)];
}

export function namespaceMeshBadge(ns: KubeObject) {
  return <MeshBadge state={namespaceMeshState(ns)} />;
}
