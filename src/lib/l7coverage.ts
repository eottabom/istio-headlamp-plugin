import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { useMeshStatus } from './detect';
import { L7Subject, resolveL7Coverage } from './l7decision';

export type { L7Coverage, L7Inputs, L7Subject } from './l7decision';
export { resolveL7Coverage } from './l7decision';

/**
 * Reads what the decision needs out of the cluster and hands it to
 * {@link resolveL7Coverage}. The judgement itself lives in a module with no
 * Headlamp imports, so it can be tested against the failure cases.
 */
export function useL7Coverage(policy: L7Subject) {
  const { ambientEnabled, waypoints, gateways, loading } = useMeshStatus();
  const [namespaces, namespacesError] = K8s.ResourceClasses.Namespace.useList();
  const [services, servicesError] = K8s.ResourceClasses.Service.useList({
    namespace: policy.metadata.namespace,
  });

  return resolveL7Coverage(policy, {
    ambientEnabled,
    loading,
    waypoints,
    gateways,
    namespaces: namespacesError ? null : namespaces,
    services: servicesError ? null : services,
  });
}
