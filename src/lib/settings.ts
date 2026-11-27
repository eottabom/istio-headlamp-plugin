/** Plugin settings, which Headlamp stores under the package name. */
import { ConfigStore } from '@kinvolk/headlamp-plugin/lib';
import { ClusterPrometheus } from './prometheusParse';

export const PLUGIN_NAME = '@eottabom/istio-headlamp-plugin';

/** Route of this plugin's settings page in Headlamp. */
export const SETTINGS_URL = `/settings/plugins/${encodeURIComponent(PLUGIN_NAME)}`;

export interface PluginSettings {
  /** Per cluster, `namespace/service:port/path` of the Prometheus API the Traffic Map reads. */
  prometheus?: ClusterPrometheus[];
}

export const settingsStore = new ConfigStore<PluginSettings>(PLUGIN_NAME);
