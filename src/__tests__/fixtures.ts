/* eslint-disable */
// Captured from a live Istio ambient cluster, so these are the exact shapes the
// API server returns, defaults and all -- not hand-written approximations of
// the CRD schemas.
// Regenerate with scripts/capture-fixtures.py against a cluster.

export const namespaces = [
  {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      labels: {
        'kubernetes.io/metadata.name': 'istio-system',
      },
      name: 'istio-system',
    },
    spec: {
      finalizers: ['kubernetes'],
    },
    status: {
      phase: 'Active',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      labels: {
        'istio-injection': 'enabled',
        'kubernetes.io/metadata.name': 'legacy',
      },
      name: 'legacy',
    },
    spec: {
      finalizers: ['kubernetes'],
    },
    status: {
      phase: 'Active',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      labels: {
        'kubernetes.io/metadata.name': 'nomesh',
      },
      name: 'nomesh',
    },
    spec: {
      finalizers: ['kubernetes'],
    },
    status: {
      phase: 'Active',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      labels: {
        'istio.io/dataplane-mode': 'ambient',
        'istio.io/use-waypoint': 'shop-waypoint',
        'kubernetes.io/metadata.name': 'shop',
      },
      name: 'shop',
    },
    spec: {
      finalizers: ['kubernetes'],
    },
    status: {
      phase: 'Active',
    },
  },
] as any[];

export const services = [
  {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      labels: {
        'istio.io/use-waypoint': 'none',
      },
      name: 'orders',
      namespace: 'shop',
    },
    spec: {
      clusterIP: '10.96.56.51',
      clusterIPs: ['10.96.56.51'],
      internalTrafficPolicy: 'Cluster',
      ipFamilies: ['IPv4'],
      ipFamilyPolicy: 'SingleStack',
      ports: [
        {
          name: 'http',
          port: 8080,
          protocol: 'TCP',
          targetPort: 8080,
        },
      ],
      selector: {
        app: 'orders',
      },
      sessionAffinity: 'None',
      type: 'ClusterIP',
    },
    status: {
      loadBalancer: {},
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'reviews',
      namespace: 'shop',
    },
    spec: {
      clusterIP: '10.96.52.60',
      clusterIPs: ['10.96.52.60'],
      internalTrafficPolicy: 'Cluster',
      ipFamilies: ['IPv4'],
      ipFamilyPolicy: 'SingleStack',
      ports: [
        {
          name: 'http',
          port: 8080,
          protocol: 'TCP',
          targetPort: 8080,
        },
      ],
      selector: {
        app: 'reviews',
      },
      sessionAffinity: 'None',
      type: 'ClusterIP',
    },
    status: {
      conditions: [
        {
          lastTransitionTime: '2026-09-17T02:33:05Z',
          message: 'Successfully attached to waypoint shop/shop-waypoint',
          reason: 'WaypointAccepted',
          status: 'True',
          type: 'istio.io/WaypointBound',
        },
      ],
      loadBalancer: {},
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      annotations: {
        'networking.istio.io/traffic-distribution': 'PreferClose',
      },
      labels: {
        'gateway.istio.io/managed': 'istio.io-mesh-controller',
        'gateway.networking.k8s.io/gateway-class-name': 'istio-waypoint',
        'gateway.networking.k8s.io/gateway-name': 'shop-waypoint',
        'istio.io/waypoint-for': 'service',
      },
      name: 'shop-waypoint',
      namespace: 'shop',
      ownerReferences: [
        {
          apiVersion: 'gateway.networking.k8s.io/v1beta1',
          kind: 'Gateway',
          name: 'shop-waypoint',
          uid: '7fadd26b-6c9b-4d53-b603-55c65d46f2e8',
        },
      ],
    },
    spec: {
      clusterIP: '10.96.38.233',
      clusterIPs: ['10.96.38.233'],
      internalTrafficPolicy: 'Cluster',
      ipFamilies: ['IPv4'],
      ipFamilyPolicy: 'PreferDualStack',
      ports: [
        {
          appProtocol: 'tcp',
          name: 'status-port',
          port: 15021,
          protocol: 'TCP',
          targetPort: 15021,
        },
        {
          appProtocol: 'hbone',
          name: 'mesh',
          port: 15008,
          protocol: 'TCP',
          targetPort: 15008,
        },
      ],
      selector: {
        'gateway.networking.k8s.io/gateway-name': 'shop-waypoint',
      },
      sessionAffinity: 'None',
      type: 'ClusterIP',
    },
    status: {
      loadBalancer: {},
    },
  },
] as any[];

export const pods = [
  {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      annotations: {
        'container.apparmor.security.beta.kubernetes.io/install-cni': 'unconfined',
        'prometheus.io/path': '/metrics',
        'prometheus.io/port': '15014',
        'prometheus.io/scrape': 'true',
        'sidecar.istio.io/inject': 'false',
      },
      generateName: 'istio-cni-node-',
      labels: {
        'app.kubernetes.io/instance': 'istio',
        'app.kubernetes.io/managed-by': 'Helm',
        'app.kubernetes.io/name': 'istio-cni',
        'app.kubernetes.io/part-of': 'istio',
        'app.kubernetes.io/version': '1.28.3',
        'controller-revision-hash': '7ddbd49ff7',
        'helm.sh/chart': 'cni-1.28.3',
        'istio.io/dataplane-mode': 'none',
        'k8s-app': 'istio-cni-node',
        'pod-template-generation': '1',
        'sidecar.istio.io/inject': 'false',
      },
      name: 'istio-cni-node-pdtnq',
      namespace: 'istio-system',
      ownerReferences: [
        {
          apiVersion: 'apps/v1',
          blockOwnerDeletion: true,
          controller: true,
          kind: 'DaemonSet',
          name: 'istio-cni-node',
          uid: 'a00fbc97-155f-4ba2-93c1-cabc20b4b73a',
        },
      ],
    },
    spec: {
      affinity: {
        nodeAffinity: {
          requiredDuringSchedulingIgnoredDuringExecution: {
            nodeSelectorTerms: [
              {
                matchFields: [
                  {
                    key: 'metadata.name',
                    operator: 'In',
                    values: ['istio-dev-worker'],
                  },
                ],
              },
            ],
          },
        },
      },
      containers: [
        {
          args: ['--log_output_level=info'],
          command: ['install-cni'],
          env: [
            {
              name: 'REPAIR_NODE_NAME',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'spec.nodeName',
                },
              },
            },
            {
              name: 'REPAIR_RUN_AS_DAEMON',
              value: 'true',
            },
            {
              name: 'REPAIR_SIDECAR_ANNOTATION',
              value: 'sidecar.istio.io/status',
            },
            {
              name: 'ALLOW_SWITCH_TO_HOST_NS',
              value: 'true',
            },
            {
              name: 'NODE_NAME',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'spec.nodeName',
                },
              },
            },
            {
              name: 'GOMEMLIMIT',
              valueFrom: {
                resourceFieldRef: {
                  divisor: '1',
                  resource: 'limits.memory',
                },
              },
            },
            {
              name: 'GOMAXPROCS',
              valueFrom: {
                resourceFieldRef: {
                  divisor: '1',
                  resource: 'limits.cpu',
                },
              },
            },
            {
              name: 'POD_NAME',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.name',
                },
              },
            },
            {
              name: 'POD_NAMESPACE',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.namespace',
                },
              },
            },
          ],
          envFrom: [
            {
              configMapRef: {
                name: 'istio-cni-config',
              },
            },
          ],
          image: 'docker.io/istio/install-cni:1.30.1-distroless',
          imagePullPolicy: 'IfNotPresent',
          name: 'install-cni',
          ports: [
            {
              containerPort: 15014,
              name: 'metrics',
              protocol: 'TCP',
            },
          ],
          readinessProbe: {
            failureThreshold: 3,
            httpGet: {
              path: '/readyz',
              port: 8000,
              scheme: 'HTTP',
            },
            periodSeconds: 10,
            successThreshold: 1,
            timeoutSeconds: 1,
          },
          resources: {
            requests: {
              cpu: '100m',
              memory: '100Mi',
            },
          },
          securityContext: {
            appArmorProfile: {
              type: 'Unconfined',
            },
            capabilities: {
              add: ['NET_ADMIN', 'NET_RAW', 'SYS_PTRACE', 'SYS_ADMIN', 'DAC_OVERRIDE'],
              drop: ['ALL'],
            },
            privileged: false,
            runAsGroup: 0,
            runAsNonRoot: false,
            runAsUser: 0,
          },
          terminationMessagePath: '/dev/termination-log',
          terminationMessagePolicy: 'File',
          volumeMounts: [
            {
              mountPath: '/host/opt/cni/bin',
              name: 'cni-bin-dir',
            },
            {
              mountPath: '/host/proc',
              name: 'cni-host-procfs',
              readOnly: true,
            },
            {
              mountPath: '/host/etc/cni/net.d',
              name: 'cni-net-dir',
            },
            {
              mountPath: '/var/run/istio-cni',
              name: 'cni-socket-dir',
            },
            {
              mountPath: '/host/var/run/netns',
              mountPropagation: 'HostToContainer',
              name: 'cni-netns-dir',
            },
            {
              mountPath: '/var/run/ztunnel',
              name: 'cni-ztunnel-sock-dir',
            },
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-g6ml2',
              readOnly: true,
            },
          ],
        },
      ],
      dnsPolicy: 'ClusterFirst',
      enableServiceLinks: true,
      nodeName: 'istio-dev-worker',
      nodeSelector: {
        'kubernetes.io/os': 'linux',
      },
      preemptionPolicy: 'PreemptLowerPriority',
      priority: 2000001000,
      priorityClassName: 'system-node-critical',
      restartPolicy: 'Always',
      schedulerName: 'default-scheduler',
      securityContext: {},
      serviceAccount: 'istio-cni',
      serviceAccountName: 'istio-cni',
      terminationGracePeriodSeconds: 5,
      tolerations: [
        {
          effect: 'NoSchedule',
          operator: 'Exists',
        },
        {
          key: 'CriticalAddonsOnly',
          operator: 'Exists',
        },
        {
          effect: 'NoExecute',
          operator: 'Exists',
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/not-ready',
          operator: 'Exists',
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/unreachable',
          operator: 'Exists',
        },
        {
          effect: 'NoSchedule',
          key: 'node.kubernetes.io/disk-pressure',
          operator: 'Exists',
        },
        {
          effect: 'NoSchedule',
          key: 'node.kubernetes.io/memory-pressure',
          operator: 'Exists',
        },
        {
          effect: 'NoSchedule',
          key: 'node.kubernetes.io/pid-pressure',
          operator: 'Exists',
        },
        {
          effect: 'NoSchedule',
          key: 'node.kubernetes.io/unschedulable',
          operator: 'Exists',
        },
      ],
      volumes: [
        {
          hostPath: {
            path: '/opt/cni/bin',
            type: '',
          },
          name: 'cni-bin-dir',
        },
        {
          hostPath: {
            path: '/proc',
            type: 'Directory',
          },
          name: 'cni-host-procfs',
        },
        {
          hostPath: {
            path: '/var/run/ztunnel',
            type: 'DirectoryOrCreate',
          },
          name: 'cni-ztunnel-sock-dir',
        },
        {
          hostPath: {
            path: '/etc/cni/net.d',
            type: '',
          },
          name: 'cni-net-dir',
        },
        {
          hostPath: {
            path: '/var/run/istio-cni',
            type: '',
          },
          name: 'cni-socket-dir',
        },
        {
          hostPath: {
            path: '/var/run/netns',
            type: 'DirectoryOrCreate',
          },
          name: 'cni-netns-dir',
        },
        {
          name: 'kube-api-access-g6ml2',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  expirationSeconds: 3607,
                  path: 'token',
                },
              },
              {
                configMap: {
                  items: [
                    {
                      key: 'ca.crt',
                      path: 'ca.crt',
                    },
                  ],
                  name: 'kube-root-ca.crt',
                },
              },
              {
                downwardAPI: {
                  items: [
                    {
                      fieldRef: {
                        apiVersion: 'v1',
                        fieldPath: 'metadata.namespace',
                      },
                      path: 'namespace',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    status: {
      allocatedResources: {
        cpu: '100m',
        memory: '100Mi',
      },
      conditions: [
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:08Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodReadyToStartContainers',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:31:52Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Initialized',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:25Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Ready',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:25Z',
          observedGeneration: 1,
          status: 'True',
          type: 'ContainersReady',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:31:52Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodScheduled',
        },
      ],
      containerStatuses: [
        {
          allocatedResources: {
            cpu: '100m',
            memory: '100Mi',
          },
          containerID:
            'containerd://8b3fa51ef05d78649dae3a67d3ab81bf0a7619ce15239a678ad0b9a50584612b',
          image: 'docker.io/istio/install-cni:1.30.1-distroless',
          imageID:
            'docker.io/istio/install-cni@sha256:77e5a27b2da2e17e5846d8ce604aaa2cf189e0e1932e6fd2292ad7826fd1761a',
          lastState: {},
          name: 'install-cni',
          ready: true,
          resources: {
            requests: {
              cpu: '100m',
              memory: '100Mi',
            },
          },
          restartCount: 0,
          started: true,
          state: {
            running: {
              startedAt: '2026-09-17T02:32:23Z',
            },
          },
          user: {
            linux: {
              gid: 0,
              supplementalGroups: [0, 1, 2, 3, 4, 6, 10, 11, 20, 26, 27],
              uid: 0,
            },
          },
          volumeMounts: [
            {
              mountPath: '/host/opt/cni/bin',
              name: 'cni-bin-dir',
            },
            {
              mountPath: '/host/proc',
              name: 'cni-host-procfs',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
            {
              mountPath: '/host/etc/cni/net.d',
              name: 'cni-net-dir',
            },
            {
              mountPath: '/var/run/istio-cni',
              name: 'cni-socket-dir',
            },
            {
              mountPath: '/host/var/run/netns',
              name: 'cni-netns-dir',
            },
            {
              mountPath: '/var/run/ztunnel',
              name: 'cni-ztunnel-sock-dir',
            },
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-g6ml2',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
          ],
        },
      ],
      hostIP: '172.29.0.2',
      hostIPs: [
        {
          ip: '172.29.0.2',
        },
      ],
      observedGeneration: 1,
      phase: 'Running',
      podIP: '10.244.1.3',
      podIPs: [
        {
          ip: '10.244.1.3',
        },
      ],
      qosClass: 'Burstable',
      resources: {
        requests: {
          cpu: '79m',
          memory: '100Mi',
        },
      },
      startTime: '2026-09-17T02:31:52Z',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      annotations: {
        'prometheus.io/port': '15014',
        'prometheus.io/scrape': 'true',
        'sidecar.istio.io/inject': 'false',
      },
      generateName: 'istiod-66cc6dcf4d-',
      labels: {
        app: 'istiod',
        'app.kubernetes.io/instance': 'istio',
        'app.kubernetes.io/managed-by': 'Helm',
        'app.kubernetes.io/name': 'istiod',
        'app.kubernetes.io/part-of': 'istio',
        'app.kubernetes.io/version': '1.28.3',
        'helm.sh/chart': 'istiod-1.28.3',
        'install.operator.istio.io/owning-resource': 'unknown',
        istio: 'pilot',
        'istio.io/dataplane-mode': 'none',
        'istio.io/rev': 'default',
        'operator.istio.io/component': 'Pilot',
        'pod-template-hash': '66cc6dcf4d',
        'sidecar.istio.io/inject': 'false',
      },
      name: 'istiod-66cc6dcf4d-dx2xb',
      namespace: 'istio-system',
      ownerReferences: [
        {
          apiVersion: 'apps/v1',
          blockOwnerDeletion: true,
          controller: true,
          kind: 'ReplicaSet',
          name: 'istiod-66cc6dcf4d',
          uid: '381f9a48-8aaa-4b1e-bb77-2e3c08e3676c',
        },
      ],
    },
    spec: {
      containers: [
        {
          args: [
            'discovery',
            '--monitoringAddr=:15014',
            '--log_output_level=default:info',
            '--domain',
            'cluster.local',
            '--keepaliveMaxServerConnectionAge',
            '30m',
          ],
          env: [
            {
              name: 'REVISION',
              value: 'default',
            },
            {
              name: 'PILOT_CERT_PROVIDER',
              value: 'istiod',
            },
            {
              name: 'POD_NAME',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.name',
                },
              },
            },
            {
              name: 'POD_NAMESPACE',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.namespace',
                },
              },
            },
            {
              name: 'SERVICE_ACCOUNT',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'spec.serviceAccountName',
                },
              },
            },
            {
              name: 'KUBECONFIG',
              value: '/var/run/secrets/remote/config',
            },
            {
              name: 'CA_TRUSTED_NODE_ACCOUNTS',
              value: 'istio-system/ztunnel',
            },
            {
              name: 'PILOT_ENABLE_AMBIENT',
              value: 'true',
            },
            {
              name: 'PILOT_TRACE_SAMPLING',
              value: '1',
            },
            {
              name: 'PILOT_ENABLE_ANALYSIS',
              value: 'false',
            },
            {
              name: 'CLUSTER_ID',
              value: 'Kubernetes',
            },
            {
              name: 'GOMEMLIMIT',
              valueFrom: {
                resourceFieldRef: {
                  divisor: '1',
                  resource: 'limits.memory',
                },
              },
            },
            {
              name: 'GOMAXPROCS',
              valueFrom: {
                resourceFieldRef: {
                  divisor: '1',
                  resource: 'limits.cpu',
                },
              },
            },
            {
              name: 'PLATFORM',
            },
          ],
          image: 'docker.io/istio/pilot:1.30.1-distroless',
          imagePullPolicy: 'IfNotPresent',
          name: 'discovery',
          ports: [
            {
              containerPort: 8080,
              name: 'http-debug',
              protocol: 'TCP',
            },
            {
              containerPort: 15010,
              name: 'grpc-xds',
              protocol: 'TCP',
            },
            {
              containerPort: 15012,
              name: 'tls-xds',
              protocol: 'TCP',
            },
            {
              containerPort: 15017,
              name: 'https-webhooks',
              protocol: 'TCP',
            },
            {
              containerPort: 15014,
              name: 'http-monitoring',
              protocol: 'TCP',
            },
          ],
          readinessProbe: {
            failureThreshold: 3,
            httpGet: {
              path: '/ready',
              port: 8080,
              scheme: 'HTTP',
            },
            initialDelaySeconds: 1,
            periodSeconds: 3,
            successThreshold: 1,
            timeoutSeconds: 5,
          },
          resources: {
            requests: {
              cpu: '500m',
              memory: '2Gi',
            },
          },
          securityContext: {
            allowPrivilegeEscalation: false,
            capabilities: {
              drop: ['ALL'],
            },
            readOnlyRootFilesystem: true,
            runAsNonRoot: true,
          },
          terminationMessagePath: '/dev/termination-log',
          terminationMessagePolicy: 'File',
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/tokens',
              name: 'istio-token',
              readOnly: true,
            },
            {
              mountPath: '/var/run/secrets/istio-dns',
              name: 'local-certs',
            },
            {
              mountPath: '/etc/cacerts',
              name: 'cacerts',
              readOnly: true,
            },
            {
              mountPath: '/var/run/secrets/remote',
              name: 'istio-kubeconfig',
              readOnly: true,
            },
            {
              mountPath: '/var/run/secrets/istiod/tls',
              name: 'istio-csr-dns-cert',
              readOnly: true,
            },
            {
              mountPath: '/var/run/secrets/istiod/ca',
              name: 'istio-csr-ca-configmap',
              readOnly: true,
            },
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-4rgzh',
              readOnly: true,
            },
          ],
        },
      ],
      dnsPolicy: 'ClusterFirst',
      enableServiceLinks: true,
      nodeName: 'istio-dev-worker',
      preemptionPolicy: 'PreemptLowerPriority',
      priority: 0,
      restartPolicy: 'Always',
      schedulerName: 'default-scheduler',
      securityContext: {},
      serviceAccount: 'istiod',
      serviceAccountName: 'istiod',
      terminationGracePeriodSeconds: 30,
      tolerations: [
        {
          key: 'cni.istio.io/not-ready',
          operator: 'Exists',
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/not-ready',
          operator: 'Exists',
          tolerationSeconds: 300,
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/unreachable',
          operator: 'Exists',
          tolerationSeconds: 300,
        },
      ],
      volumes: [
        {
          emptyDir: {
            medium: 'Memory',
          },
          name: 'local-certs',
        },
        {
          name: 'istio-token',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  audience: 'istio-ca',
                  expirationSeconds: 43200,
                  path: 'istio-token',
                },
              },
            ],
          },
        },
        {
          name: 'cacerts',
          secret: {
            defaultMode: 420,
            optional: true,
            secretName: 'cacerts',
          },
        },
        {
          name: 'istio-kubeconfig',
          secret: {
            defaultMode: 420,
            optional: true,
            secretName: 'istio-kubeconfig',
          },
        },
        {
          name: 'istio-csr-dns-cert',
          secret: {
            defaultMode: 420,
            optional: true,
            secretName: 'istiod-tls',
          },
        },
        {
          configMap: {
            defaultMode: 420,
            name: 'istio-ca-root-cert',
            optional: true,
          },
          name: 'istio-csr-ca-configmap',
        },
        {
          name: 'kube-api-access-4rgzh',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  expirationSeconds: 3607,
                  path: 'token',
                },
              },
              {
                configMap: {
                  items: [
                    {
                      key: 'ca.crt',
                      path: 'ca.crt',
                    },
                  ],
                  name: 'kube-root-ca.crt',
                },
              },
              {
                downwardAPI: {
                  items: [
                    {
                      fieldRef: {
                        apiVersion: 'v1',
                        fieldPath: 'metadata.namespace',
                      },
                      path: 'namespace',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    status: {
      allocatedResources: {
        cpu: '500m',
        memory: '2Gi',
      },
      conditions: [
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:02Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodReadyToStartContainers',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:01Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Initialized',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:18Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Ready',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:18Z',
          observedGeneration: 1,
          status: 'True',
          type: 'ContainersReady',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:01Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodScheduled',
        },
      ],
      containerStatuses: [
        {
          allocatedResources: {
            cpu: '500m',
            memory: '2Gi',
          },
          containerID:
            'containerd://19be57875906cdf390a91caf10a22ff00529a68f6dc4d2e1304c04e6711d9a7f',
          image: 'docker.io/istio/pilot:1.30.1-distroless',
          imageID:
            'docker.io/istio/pilot@sha256:cfa22e95f3943a1be95bf06d6e2cecf2ce9a3bc34a1570acabaa175ece4f501d',
          lastState: {},
          name: 'discovery',
          ready: true,
          resources: {
            requests: {
              cpu: '500m',
              memory: '2Gi',
            },
          },
          restartCount: 0,
          started: true,
          state: {
            running: {
              startedAt: '2026-09-17T02:32:14Z',
            },
          },
          user: {
            linux: {
              gid: 1337,
              supplementalGroups: [1337],
              uid: 1337,
            },
          },
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/tokens',
              name: 'istio-token',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
            {
              mountPath: '/var/run/secrets/istio-dns',
              name: 'local-certs',
            },
            {
              mountPath: '/etc/cacerts',
              name: 'cacerts',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
            {
              mountPath: '/var/run/secrets/remote',
              name: 'istio-kubeconfig',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
            {
              mountPath: '/var/run/secrets/istiod/tls',
              name: 'istio-csr-dns-cert',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
            {
              mountPath: '/var/run/secrets/istiod/ca',
              name: 'istio-csr-ca-configmap',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-4rgzh',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
          ],
        },
      ],
      hostIP: '172.29.0.2',
      hostIPs: [
        {
          ip: '172.29.0.2',
        },
      ],
      observedGeneration: 1,
      phase: 'Running',
      podIP: '10.244.1.2',
      podIPs: [
        {
          ip: '10.244.1.2',
        },
      ],
      qosClass: 'Burstable',
      resources: {
        requests: {
          cpu: '489m',
          memory: '2Gi',
        },
      },
      startTime: '2026-09-17T02:32:01Z',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      annotations: {
        'prometheus.io/port': '15020',
        'prometheus.io/scrape': 'true',
        'sidecar.istio.io/inject': 'false',
      },
      generateName: 'ztunnel-',
      labels: {
        app: 'ztunnel',
        'app.kubernetes.io/instance': 'istio',
        'app.kubernetes.io/managed-by': 'Helm',
        'app.kubernetes.io/name': 'ztunnel',
        'app.kubernetes.io/part-of': 'istio',
        'app.kubernetes.io/version': '1.28.3',
        'controller-revision-hash': '5f455bcb58',
        'helm.sh/chart': 'ztunnel-1.28.3',
        'istio.io/dataplane-mode': 'none',
        'pod-template-generation': '1',
        'sidecar.istio.io/inject': 'false',
      },
      name: 'ztunnel-4kmnh',
      namespace: 'istio-system',
      ownerReferences: [
        {
          apiVersion: 'apps/v1',
          blockOwnerDeletion: true,
          controller: true,
          kind: 'DaemonSet',
          name: 'ztunnel',
          uid: '61a1ea13-25ad-4cc7-b653-ca478ddb8f8e',
        },
      ],
    },
    spec: {
      affinity: {
        nodeAffinity: {
          requiredDuringSchedulingIgnoredDuringExecution: {
            nodeSelectorTerms: [
              {
                matchFields: [
                  {
                    key: 'metadata.name',
                    operator: 'In',
                    values: ['istio-dev-control-plane'],
                  },
                ],
              },
            ],
          },
        },
      },
      containers: [
        {
          args: ['proxy', 'ztunnel'],
          env: [
            {
              name: 'CA_ADDRESS',
              value: 'istiod.istio-system.svc:15012',
            },
            {
              name: 'XDS_ADDRESS',
              value: 'istiod.istio-system.svc:15012',
            },
            {
              name: 'RUST_LOG',
              value: 'info',
            },
            {
              name: 'RUST_BACKTRACE',
              value: '1',
            },
            {
              name: 'ISTIO_META_CLUSTER_ID',
              value: 'Kubernetes',
            },
            {
              name: 'INPOD_ENABLED',
              value: 'true',
            },
            {
              name: 'TERMINATION_GRACE_PERIOD_SECONDS',
              value: '30',
            },
            {
              name: 'POD_NAME',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.name',
                },
              },
            },
            {
              name: 'POD_NAMESPACE',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.namespace',
                },
              },
            },
            {
              name: 'NODE_NAME',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'spec.nodeName',
                },
              },
            },
            {
              name: 'INSTANCE_IP',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'status.podIP',
                },
              },
            },
            {
              name: 'SERVICE_ACCOUNT',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'spec.serviceAccountName',
                },
              },
            },
            {
              name: 'ISTIO_META_ENABLE_HBONE',
              value: 'true',
            },
            {
              name: 'ZTUNNEL_CPU_LIMIT',
              valueFrom: {
                resourceFieldRef: {
                  divisor: '0',
                  resource: 'limits.cpu',
                },
              },
            },
          ],
          image: 'docker.io/istio/ztunnel:1.30.1-distroless',
          imagePullPolicy: 'IfNotPresent',
          name: 'istio-proxy',
          ports: [
            {
              containerPort: 15020,
              name: 'ztunnel-stats',
              protocol: 'TCP',
            },
          ],
          readinessProbe: {
            failureThreshold: 3,
            httpGet: {
              path: '/healthz/ready',
              port: 15021,
              scheme: 'HTTP',
            },
            periodSeconds: 10,
            successThreshold: 1,
            timeoutSeconds: 1,
          },
          resources: {
            requests: {
              cpu: '200m',
              memory: '512Mi',
            },
          },
          securityContext: {
            allowPrivilegeEscalation: true,
            capabilities: {
              add: ['NET_ADMIN', 'SYS_ADMIN', 'NET_RAW'],
              drop: ['ALL'],
            },
            privileged: false,
            readOnlyRootFilesystem: true,
            runAsGroup: 1337,
            runAsNonRoot: false,
            runAsUser: 0,
          },
          terminationMessagePath: '/dev/termination-log',
          terminationMessagePolicy: 'File',
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/istio',
              name: 'istiod-ca-cert',
            },
            {
              mountPath: '/var/run/secrets/tokens',
              name: 'istio-token',
            },
            {
              mountPath: '/var/run/ztunnel',
              name: 'cni-ztunnel-sock-dir',
            },
            {
              mountPath: '/tmp',
              name: 'tmp',
            },
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-jqbbk',
              readOnly: true,
            },
          ],
        },
      ],
      dnsPolicy: 'ClusterFirst',
      enableServiceLinks: true,
      nodeName: 'istio-dev-control-plane',
      nodeSelector: {
        'kubernetes.io/os': 'linux',
      },
      preemptionPolicy: 'PreemptLowerPriority',
      priority: 2000001000,
      priorityClassName: 'system-node-critical',
      restartPolicy: 'Always',
      schedulerName: 'default-scheduler',
      securityContext: {},
      serviceAccount: 'ztunnel',
      serviceAccountName: 'ztunnel',
      terminationGracePeriodSeconds: 30,
      tolerations: [
        {
          effect: 'NoSchedule',
          operator: 'Exists',
        },
        {
          key: 'CriticalAddonsOnly',
          operator: 'Exists',
        },
        {
          effect: 'NoExecute',
          operator: 'Exists',
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/not-ready',
          operator: 'Exists',
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/unreachable',
          operator: 'Exists',
        },
        {
          effect: 'NoSchedule',
          key: 'node.kubernetes.io/disk-pressure',
          operator: 'Exists',
        },
        {
          effect: 'NoSchedule',
          key: 'node.kubernetes.io/memory-pressure',
          operator: 'Exists',
        },
        {
          effect: 'NoSchedule',
          key: 'node.kubernetes.io/pid-pressure',
          operator: 'Exists',
        },
        {
          effect: 'NoSchedule',
          key: 'node.kubernetes.io/unschedulable',
          operator: 'Exists',
        },
      ],
      volumes: [
        {
          name: 'istio-token',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  audience: 'istio-ca',
                  expirationSeconds: 43200,
                  path: 'istio-token',
                },
              },
            ],
          },
        },
        {
          configMap: {
            defaultMode: 420,
            name: 'istio-ca-root-cert',
          },
          name: 'istiod-ca-cert',
        },
        {
          hostPath: {
            path: '/var/run/ztunnel',
            type: 'DirectoryOrCreate',
          },
          name: 'cni-ztunnel-sock-dir',
        },
        {
          emptyDir: {},
          name: 'tmp',
        },
        {
          name: 'kube-api-access-jqbbk',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  expirationSeconds: 3607,
                  path: 'token',
                },
              },
              {
                configMap: {
                  items: [
                    {
                      key: 'ca.crt',
                      path: 'ca.crt',
                    },
                  ],
                  name: 'kube-root-ca.crt',
                },
              },
              {
                downwardAPI: {
                  items: [
                    {
                      fieldRef: {
                        apiVersion: 'v1',
                        fieldPath: 'metadata.namespace',
                      },
                      path: 'namespace',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    status: {
      allocatedResources: {
        cpu: '200m',
        memory: '512Mi',
      },
      conditions: [
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:27Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodReadyToStartContainers',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:26Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Initialized',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:34Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Ready',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:34Z',
          observedGeneration: 1,
          status: 'True',
          type: 'ContainersReady',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:26Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodScheduled',
        },
      ],
      containerStatuses: [
        {
          allocatedResources: {
            cpu: '200m',
            memory: '512Mi',
          },
          containerID:
            'containerd://7a83da8b31f93e7b712a4e9921beda767f508c03fb4203c4ebb39e2a76b12c35',
          image: 'docker.io/istio/ztunnel:1.30.1-distroless',
          imageID:
            'docker.io/istio/ztunnel@sha256:d13b16b40a4439c3831f06f22e8cfd3d58cb24cd0147ef9f5c831c227ea86121',
          lastState: {},
          name: 'istio-proxy',
          ready: true,
          resources: {
            requests: {
              cpu: '200m',
              memory: '512Mi',
            },
          },
          restartCount: 0,
          started: true,
          state: {
            running: {
              startedAt: '2026-09-17T02:32:33Z',
            },
          },
          user: {
            linux: {
              gid: 1337,
              supplementalGroups: [1, 2, 3, 4, 6, 10, 11, 20, 26, 27, 1337],
              uid: 0,
            },
          },
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/istio',
              name: 'istiod-ca-cert',
            },
            {
              mountPath: '/var/run/secrets/tokens',
              name: 'istio-token',
            },
            {
              mountPath: '/var/run/ztunnel',
              name: 'cni-ztunnel-sock-dir',
            },
            {
              mountPath: '/tmp',
              name: 'tmp',
            },
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-jqbbk',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
          ],
        },
      ],
      hostIP: '172.29.0.3',
      hostIPs: [
        {
          ip: '172.29.0.3',
        },
      ],
      observedGeneration: 1,
      phase: 'Running',
      podIP: '10.244.0.6',
      podIPs: [
        {
          ip: '10.244.0.6',
        },
      ],
      qosClass: 'Burstable',
      resources: {
        requests: {
          cpu: '181m',
          memory: '512Mi',
        },
      },
      startTime: '2026-09-17T02:32:26Z',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      annotations: {
        'istio.io/rev': 'default',
        'prometheus.io/path': '/stats/prometheus',
        'prometheus.io/port': '15020',
        'prometheus.io/scrape': 'true',
      },
      generateName: 'orphan-waypoint-65c9479c87-',
      labels: {
        'gateway.istio.io/managed': 'istio.io-mesh-controller',
        'gateway.networking.k8s.io/gateway-class-name': 'istio-waypoint',
        'gateway.networking.k8s.io/gateway-name': 'orphan-waypoint',
        'istio.io/dataplane-mode': 'none',
        'pod-template-hash': '65c9479c87',
        'service.istio.io/canonical-name': 'orphan-waypoint',
        'service.istio.io/canonical-revision': 'latest',
        'sidecar.istio.io/inject': 'false',
      },
      name: 'orphan-waypoint-65c9479c87-gznk5',
      namespace: 'legacy',
      ownerReferences: [
        {
          apiVersion: 'apps/v1',
          blockOwnerDeletion: true,
          controller: true,
          kind: 'ReplicaSet',
          name: 'orphan-waypoint-65c9479c87',
          uid: '6437d432-3fab-49d4-8213-6f475b99a3d3',
        },
      ],
    },
    spec: {
      containers: [
        {
          args: [
            'proxy',
            'waypoint',
            '--domain',
            '$(POD_NAMESPACE).svc.cluster.local',
            '--serviceCluster',
            'orphan-waypoint.$(POD_NAMESPACE)',
            '--proxyLogLevel',
            'warning',
            '--proxyComponentLogLevel',
            'misc:error',
            '--log_output_level',
            'default:info',
          ],
          env: [
            {
              name: 'ISTIO_META_SERVICE_ACCOUNT',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'spec.serviceAccountName',
                },
              },
            },
            {
              name: 'ISTIO_META_NODE_NAME',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'spec.nodeName',
                },
              },
            },
            {
              name: 'PILOT_CERT_PROVIDER',
              value: 'istiod',
            },
            {
              name: 'CA_ADDR',
              value: 'istiod.istio-system.svc:15012',
            },
            {
              name: 'POD_NAME',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.name',
                },
              },
            },
            {
              name: 'POD_NAMESPACE',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.namespace',
                },
              },
            },
            {
              name: 'INSTANCE_IP',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'status.podIP',
                },
              },
            },
            {
              name: 'SERVICE_ACCOUNT',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'spec.serviceAccountName',
                },
              },
            },
            {
              name: 'HOST_IP',
              valueFrom: {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'status.hostIP',
                },
              },
            },
            {
              name: 'ISTIO_CPU_LIMIT',
              valueFrom: {
                resourceFieldRef: {
                  divisor: '0',
                  resource: 'limits.cpu',
                },
              },
            },
            {
              name: 'PROXY_CONFIG',
              value:
                '{"proxyMetadata":{"ISTIO_META_ENABLE_HBONE":"true"},"image":{"imageType":"distroless"}}\n',
            },
            {
              name: 'ISTIO_META_ENABLE_HBONE',
              value: 'true',
            },
            {
              name: 'GOMEMLIMIT',
              valueFrom: {
                resourceFieldRef: {
                  divisor: '0',
                  resource: 'limits.memory',
                },
              },
            },
            {
              name: 'GOMAXPROCS',
              valueFrom: {
                resourceFieldRef: {
                  divisor: '0',
                  resource: 'limits.cpu',
                },
              },
            },
            {
              name: 'ISTIO_META_CLUSTER_ID',
              value: 'Kubernetes',
            },
            {
              name: 'ISTIO_META_INTERCEPTION_MODE',
              value: 'REDIRECT',
            },
            {
              name: 'ISTIO_META_WORKLOAD_NAME',
              value: 'orphan-waypoint',
            },
            {
              name: 'ISTIO_META_OWNER',
              value: 'kubernetes://apis/apps/v1/namespaces/legacy/deployments/orphan-waypoint',
            },
            {
              name: 'ISTIO_META_MESH_ID',
              value: 'cluster.local',
            },
            {
              name: 'TRUST_DOMAIN',
              value: 'cluster.local',
            },
          ],
          image: 'docker.io/istio/proxyv2:1.30.1-distroless',
          imagePullPolicy: 'IfNotPresent',
          name: 'istio-proxy',
          ports: [
            {
              containerPort: 15020,
              name: 'metrics',
              protocol: 'TCP',
            },
            {
              containerPort: 15021,
              name: 'status-port',
              protocol: 'TCP',
            },
            {
              containerPort: 15090,
              name: 'http-envoy-prom',
              protocol: 'TCP',
            },
          ],
          readinessProbe: {
            failureThreshold: 4,
            httpGet: {
              path: '/healthz/ready',
              port: 15021,
              scheme: 'HTTP',
            },
            periodSeconds: 15,
            successThreshold: 1,
            timeoutSeconds: 1,
          },
          resources: {
            limits: {
              cpu: '2',
              memory: '1Gi',
            },
            requests: {
              cpu: '100m',
              memory: '128Mi',
            },
          },
          securityContext: {
            allowPrivilegeEscalation: false,
            capabilities: {
              drop: ['ALL'],
            },
            privileged: false,
            readOnlyRootFilesystem: true,
            runAsGroup: 1337,
            runAsNonRoot: true,
            runAsUser: 1337,
          },
          startupProbe: {
            failureThreshold: 30,
            httpGet: {
              path: '/healthz/ready',
              port: 15021,
              scheme: 'HTTP',
            },
            initialDelaySeconds: 1,
            periodSeconds: 1,
            successThreshold: 1,
            timeoutSeconds: 1,
          },
          terminationMessagePath: '/dev/termination-log',
          terminationMessagePolicy: 'File',
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/workload-spiffe-uds',
              name: 'workload-socket',
            },
            {
              mountPath: '/var/run/secrets/istio',
              name: 'istiod-ca-cert',
            },
            {
              mountPath: '/var/lib/istio/data',
              name: 'istio-data',
            },
            {
              mountPath: '/etc/istio/proxy',
              name: 'istio-envoy',
            },
            {
              mountPath: '/var/run/secrets/tokens',
              name: 'istio-token',
            },
            {
              mountPath: '/etc/istio/pod',
              name: 'istio-podinfo',
            },
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-9zv7q',
              readOnly: true,
            },
          ],
        },
      ],
      dnsPolicy: 'ClusterFirst',
      enableServiceLinks: true,
      nodeName: 'istio-dev-worker',
      preemptionPolicy: 'PreemptLowerPriority',
      priority: 0,
      restartPolicy: 'Always',
      schedulerName: 'default-scheduler',
      securityContext: {},
      serviceAccount: 'orphan-waypoint',
      serviceAccountName: 'orphan-waypoint',
      terminationGracePeriodSeconds: 30,
      tolerations: [
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/not-ready',
          operator: 'Exists',
          tolerationSeconds: 300,
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/unreachable',
          operator: 'Exists',
          tolerationSeconds: 300,
        },
      ],
      volumes: [
        {
          emptyDir: {},
          name: 'workload-socket',
        },
        {
          emptyDir: {
            medium: 'Memory',
          },
          name: 'istio-envoy',
        },
        {
          emptyDir: {
            medium: 'Memory',
          },
          name: 'go-proxy-envoy',
        },
        {
          emptyDir: {},
          name: 'istio-data',
        },
        {
          emptyDir: {},
          name: 'go-proxy-data',
        },
        {
          downwardAPI: {
            defaultMode: 420,
            items: [
              {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.labels',
                },
                path: 'labels',
              },
              {
                fieldRef: {
                  apiVersion: 'v1',
                  fieldPath: 'metadata.annotations',
                },
                path: 'annotations',
              },
            ],
          },
          name: 'istio-podinfo',
        },
        {
          name: 'istio-token',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  audience: 'istio-ca',
                  expirationSeconds: 43200,
                  path: 'istio-token',
                },
              },
            ],
          },
        },
        {
          configMap: {
            defaultMode: 420,
            name: 'istio-ca-root-cert',
          },
          name: 'istiod-ca-cert',
        },
        {
          name: 'kube-api-access-9zv7q',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  expirationSeconds: 3607,
                  path: 'token',
                },
              },
              {
                configMap: {
                  items: [
                    {
                      key: 'ca.crt',
                      path: 'ca.crt',
                    },
                  ],
                  name: 'kube-root-ca.crt',
                },
              },
              {
                downwardAPI: {
                  items: [
                    {
                      fieldRef: {
                        apiVersion: 'v1',
                        fieldPath: 'metadata.namespace',
                      },
                      path: 'namespace',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    status: {
      allocatedResources: {
        cpu: '100m',
        memory: '128Mi',
      },
      conditions: [
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:38Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodReadyToStartContainers',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:37Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Initialized',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:33:08Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Ready',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:33:08Z',
          observedGeneration: 1,
          status: 'True',
          type: 'ContainersReady',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:37Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodScheduled',
        },
      ],
      containerStatuses: [
        {
          allocatedResources: {
            cpu: '100m',
            memory: '128Mi',
          },
          containerID:
            'containerd://fd024f2b2a943f177aab3fe8b7a3387bac76ae37563eb8a320c188a5cb6627e8',
          image: 'docker.io/istio/proxyv2:1.30.1-distroless',
          imageID:
            'docker.io/istio/proxyv2@sha256:a784f99d59902316df49c20844b231524ef4c4775176021e361ebb9e21b0890a',
          lastState: {},
          name: 'istio-proxy',
          ready: true,
          resources: {
            limits: {
              cpu: '2',
              memory: '1Gi',
            },
            requests: {
              cpu: '100m',
              memory: '128Mi',
            },
          },
          restartCount: 0,
          started: true,
          state: {
            running: {
              startedAt: '2026-09-17T02:33:06Z',
            },
          },
          user: {
            linux: {
              gid: 1337,
              supplementalGroups: [1337],
              uid: 1337,
            },
          },
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/workload-spiffe-uds',
              name: 'workload-socket',
            },
            {
              mountPath: '/var/run/secrets/istio',
              name: 'istiod-ca-cert',
            },
            {
              mountPath: '/var/lib/istio/data',
              name: 'istio-data',
            },
            {
              mountPath: '/etc/istio/proxy',
              name: 'istio-envoy',
            },
            {
              mountPath: '/var/run/secrets/tokens',
              name: 'istio-token',
            },
            {
              mountPath: '/etc/istio/pod',
              name: 'istio-podinfo',
            },
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-9zv7q',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
          ],
        },
      ],
      hostIP: '172.29.0.2',
      hostIPs: [
        {
          ip: '172.29.0.2',
        },
      ],
      observedGeneration: 1,
      phase: 'Running',
      podIP: '10.244.1.8',
      podIPs: [
        {
          ip: '10.244.1.8',
        },
      ],
      qosClass: 'Burstable',
      resources: {
        limits: {
          cpu: '2',
          memory: '1Gi',
        },
        requests: {
          cpu: '79m',
          memory: '128Mi',
        },
      },
      startTime: '2026-09-17T02:32:37Z',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      annotations: {
        'ambient.istio.io/redirection': 'enabled',
      },
      generateName: 'orders-66dc59c95d-',
      labels: {
        app: 'orders',
        'pod-template-hash': '66dc59c95d',
      },
      name: 'orders-66dc59c95d-l8k9l',
      namespace: 'shop',
      ownerReferences: [
        {
          apiVersion: 'apps/v1',
          blockOwnerDeletion: true,
          controller: true,
          kind: 'ReplicaSet',
          name: 'orders-66dc59c95d',
          uid: 'bbd3f668-c3ed-4b4b-9ac1-f222d40eae9f',
        },
      ],
    },
    spec: {
      containers: [
        {
          args: ['netexec', '--http-port=8080'],
          image: 'registry.k8s.io/e2e-test-images/agnhost:2.47',
          imagePullPolicy: 'IfNotPresent',
          name: 'app',
          resources: {},
          terminationMessagePath: '/dev/termination-log',
          terminationMessagePolicy: 'File',
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-h7gvx',
              readOnly: true,
            },
          ],
        },
      ],
      dnsPolicy: 'ClusterFirst',
      enableServiceLinks: true,
      nodeName: 'istio-dev-worker',
      preemptionPolicy: 'PreemptLowerPriority',
      priority: 0,
      restartPolicy: 'Always',
      schedulerName: 'default-scheduler',
      securityContext: {},
      serviceAccount: 'default',
      serviceAccountName: 'default',
      terminationGracePeriodSeconds: 30,
      tolerations: [
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/not-ready',
          operator: 'Exists',
          tolerationSeconds: 300,
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/unreachable',
          operator: 'Exists',
          tolerationSeconds: 300,
        },
      ],
      volumes: [
        {
          name: 'kube-api-access-h7gvx',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  expirationSeconds: 3607,
                  path: 'token',
                },
              },
              {
                configMap: {
                  items: [
                    {
                      key: 'ca.crt',
                      path: 'ca.crt',
                    },
                  ],
                  name: 'kube-root-ca.crt',
                },
              },
              {
                downwardAPI: {
                  items: [
                    {
                      fieldRef: {
                        apiVersion: 'v1',
                        fieldPath: 'metadata.namespace',
                      },
                      path: 'namespace',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    status: {
      conditions: [
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:38Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodReadyToStartContainers',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:37Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Initialized',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:51Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Ready',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:51Z',
          observedGeneration: 1,
          status: 'True',
          type: 'ContainersReady',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:37Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodScheduled',
        },
      ],
      containerStatuses: [
        {
          containerID:
            'containerd://bab8100f3b20961a6f9f61567565ebd2f88a2f9c3a0bcdad87a3d6665abab828',
          image: 'registry.k8s.io/e2e-test-images/agnhost:2.47',
          imageID:
            'registry.k8s.io/e2e-test-images/agnhost@sha256:cc249acbd34692826b2b335335615e060fdb3c0bca4954507aa3a1d1194de253',
          lastState: {},
          name: 'app',
          ready: true,
          resources: {},
          restartCount: 0,
          started: true,
          state: {
            running: {
              startedAt: '2026-09-17T02:32:51Z',
            },
          },
          user: {
            linux: {
              gid: 0,
              supplementalGroups: [0, 1, 2, 3, 4, 6, 10, 11, 20, 26, 27],
              uid: 0,
            },
          },
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-h7gvx',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
          ],
        },
      ],
      hostIP: '172.29.0.2',
      hostIPs: [
        {
          ip: '172.29.0.2',
        },
      ],
      observedGeneration: 1,
      phase: 'Running',
      podIP: '10.244.1.6',
      podIPs: [
        {
          ip: '10.244.1.6',
        },
      ],
      qosClass: 'BestEffort',
      resources: {},
      startTime: '2026-09-17T02:32:37Z',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      annotations: {
        'ambient.istio.io/redirection': 'enabled',
      },
      generateName: 'reviews-7f949f9fc8-',
      labels: {
        app: 'reviews',
        'pod-template-hash': '7f949f9fc8',
        version: 'v1',
      },
      name: 'reviews-7f949f9fc8-9dbnw',
      namespace: 'shop',
      ownerReferences: [
        {
          apiVersion: 'apps/v1',
          blockOwnerDeletion: true,
          controller: true,
          kind: 'ReplicaSet',
          name: 'reviews-7f949f9fc8',
          uid: 'e7ebd2c6-85e5-4802-a9fa-3b2ab46e8739',
        },
      ],
    },
    spec: {
      containers: [
        {
          args: ['netexec', '--http-port=8080'],
          image: 'registry.k8s.io/e2e-test-images/agnhost:2.47',
          imagePullPolicy: 'IfNotPresent',
          name: 'app',
          ports: [
            {
              containerPort: 8080,
              protocol: 'TCP',
            },
          ],
          resources: {},
          terminationMessagePath: '/dev/termination-log',
          terminationMessagePolicy: 'File',
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-j7zd8',
              readOnly: true,
            },
          ],
        },
      ],
      dnsPolicy: 'ClusterFirst',
      enableServiceLinks: true,
      nodeName: 'istio-dev-worker',
      preemptionPolicy: 'PreemptLowerPriority',
      priority: 0,
      restartPolicy: 'Always',
      schedulerName: 'default-scheduler',
      securityContext: {},
      serviceAccount: 'default',
      serviceAccountName: 'default',
      terminationGracePeriodSeconds: 30,
      tolerations: [
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/not-ready',
          operator: 'Exists',
          tolerationSeconds: 300,
        },
        {
          effect: 'NoExecute',
          key: 'node.kubernetes.io/unreachable',
          operator: 'Exists',
          tolerationSeconds: 300,
        },
      ],
      volumes: [
        {
          name: 'kube-api-access-j7zd8',
          projected: {
            defaultMode: 420,
            sources: [
              {
                serviceAccountToken: {
                  expirationSeconds: 3607,
                  path: 'token',
                },
              },
              {
                configMap: {
                  items: [
                    {
                      key: 'ca.crt',
                      path: 'ca.crt',
                    },
                  ],
                  name: 'kube-root-ca.crt',
                },
              },
              {
                downwardAPI: {
                  items: [
                    {
                      fieldRef: {
                        apiVersion: 'v1',
                        fieldPath: 'metadata.namespace',
                      },
                      path: 'namespace',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    status: {
      conditions: [
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:38Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodReadyToStartContainers',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:37Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Initialized',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:52Z',
          observedGeneration: 1,
          status: 'True',
          type: 'Ready',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:52Z',
          observedGeneration: 1,
          status: 'True',
          type: 'ContainersReady',
        },
        {
          lastProbeTime: null,
          lastTransitionTime: '2026-09-17T02:32:37Z',
          observedGeneration: 1,
          status: 'True',
          type: 'PodScheduled',
        },
      ],
      containerStatuses: [
        {
          containerID:
            'containerd://f7264f01384ee51bb00ce8e3e625638bfd2ceb893568817cfa5f605e5c62ed34',
          image: 'registry.k8s.io/e2e-test-images/agnhost:2.47',
          imageID:
            'registry.k8s.io/e2e-test-images/agnhost@sha256:cc249acbd34692826b2b335335615e060fdb3c0bca4954507aa3a1d1194de253',
          lastState: {},
          name: 'app',
          ready: true,
          resources: {},
          restartCount: 0,
          started: true,
          state: {
            running: {
              startedAt: '2026-09-17T02:32:52Z',
            },
          },
          user: {
            linux: {
              gid: 0,
              supplementalGroups: [0, 1, 2, 3, 4, 6, 10, 11, 20, 26, 27],
              uid: 0,
            },
          },
          volumeMounts: [
            {
              mountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
              name: 'kube-api-access-j7zd8',
              readOnly: true,
              recursiveReadOnly: 'Disabled',
            },
          ],
        },
      ],
      hostIP: '172.29.0.2',
      hostIPs: [
        {
          ip: '172.29.0.2',
        },
      ],
      observedGeneration: 1,
      phase: 'Running',
      podIP: '10.244.1.5',
      podIPs: [
        {
          ip: '10.244.1.5',
        },
      ],
      qosClass: 'BestEffort',
      resources: {},
      startTime: '2026-09-17T02:32:37Z',
    },
  },
] as any[];

export const destinationRules = [
  {
    apiVersion: 'networking.istio.io/v1',
    kind: 'DestinationRule',
    metadata: {
      name: 'reviews',
      namespace: 'shop',
    },
    spec: {
      host: 'reviews.shop.svc.cluster.local',
      subsets: [
        {
          labels: {
            version: 'v1',
          },
          name: 'v1',
        },
        {
          labels: {
            version: 'v2',
          },
          name: 'canary',
          trafficPolicy: {
            connectionPool: {
              http: {
                maxRetries: 1,
              },
            },
            loadBalancer: {
              simple: 'ROUND_ROBIN',
            },
          },
        },
      ],
      trafficPolicy: {
        connectionPool: {
          http: {
            http2MaxRequests: 1000,
            idleTimeout: '30s',
            maxRequestsPerConnection: 10,
          },
          tcp: {
            connectTimeout: '3s',
            maxConnections: 100,
          },
        },
        loadBalancer: {
          simple: 'LEAST_REQUEST',
        },
        outlierDetection: {
          baseEjectionTime: '30s',
          consecutive5xxErrors: 5,
          interval: '10s',
          maxEjectionPercent: 50,
        },
        tls: {
          mode: 'ISTIO_MUTUAL',
        },
      },
    },
  },
] as any[];

export const virtualServices = [
  {
    apiVersion: 'networking.istio.io/v1',
    kind: 'VirtualService',
    metadata: {
      name: 'reviews',
      namespace: 'shop',
    },
    spec: {
      hosts: ['reviews.shop.svc.cluster.local'],
      http: [
        {
          match: [
            {
              headers: {
                'x-env': {
                  exact: 'canary',
                },
              },
              method: {
                exact: 'GET',
              },
              uri: {
                prefix: '/api/',
              },
            },
          ],
          name: 'canary',
          retries: {
            attempts: 3,
            perTryTimeout: '2s',
            retryOn: '5xx',
          },
          route: [
            {
              destination: {
                host: 'reviews.shop.svc.cluster.local',
                subset: 'canary',
              },
              weight: 100,
            },
          ],
          timeout: '5s',
        },
        {
          name: 'default',
          route: [
            {
              destination: {
                host: 'reviews.shop.svc.cluster.local',
                subset: 'v1',
              },
              weight: 90,
            },
            {
              destination: {
                host: 'reviews.shop.svc.cluster.local',
                subset: 'canary',
              },
              weight: 10,
            },
          ],
        },
      ],
    },
  },
] as any[];

export const serviceEntries = [
  {
    apiVersion: 'networking.istio.io/v1',
    kind: 'ServiceEntry',
    metadata: {
      name: 'broken-static',
      namespace: 'shop',
    },
    spec: {
      hosts: ['legacy-billing.internal'],
      location: 'MESH_EXTERNAL',
      ports: [
        {
          name: 'http',
          number: 8080,
          protocol: 'HTTP',
        },
      ],
      resolution: 'STATIC',
    },
    status: {
      addresses: [
        {
          host: 'legacy-billing.internal',
          value: '240.240.0.2',
        },
        {
          host: 'legacy-billing.internal',
          value: '2001:2::2',
        },
      ],
      conditions: [
        {
          lastTransitionTime: '2026-09-17T02:33:05.748864930Z',
          message: 'Successfully attached to waypoint shop/shop-waypoint',
          reason: 'WaypointAccepted',
          status: 'True',
          type: 'istio.io/WaypointBound',
        },
      ],
    },
  },
  {
    apiVersion: 'networking.istio.io/v1',
    kind: 'ServiceEntry',
    metadata: {
      name: 'payments-api',
      namespace: 'shop',
    },
    spec: {
      exportTo: ['.'],
      hosts: ['payments.example.com'],
      location: 'MESH_EXTERNAL',
      ports: [
        {
          name: 'https',
          number: 443,
          protocol: 'TLS',
        },
        {
          name: 'http',
          number: 80,
          protocol: 'HTTP',
        },
      ],
      resolution: 'DNS',
    },
    status: {
      addresses: [
        {
          host: 'payments.example.com',
          value: '240.240.0.1',
        },
        {
          host: 'payments.example.com',
          value: '2001:2::1',
        },
      ],
      conditions: [
        {
          lastTransitionTime: '2026-09-17T02:33:05.754701930Z',
          message: 'Successfully attached to waypoint shop/shop-waypoint',
          reason: 'WaypointAccepted',
          status: 'True',
          type: 'istio.io/WaypointBound',
        },
      ],
    },
  },
] as any[];

export const authorizationPolicies = [
  {
    apiVersion: 'security.istio.io/v1',
    kind: 'AuthorizationPolicy',
    metadata: {
      name: 'orders-l7-unenforced',
      namespace: 'shop',
    },
    spec: {
      action: 'DENY',
      rules: [
        {
          to: [
            {
              operation: {
                methods: ['DELETE'],
                paths: ['/admin/*'],
              },
            },
          ],
          when: [
            {
              key: 'request.headers[x-admin]',
              values: ['true'],
            },
          ],
        },
      ],
      targetRefs: [
        {
          group: '',
          kind: 'Service',
          name: 'orders',
        },
      ],
    },
    status: {
      conditions: [
        {
          lastTransitionTime: '2026-09-17T02:32:37.996184500Z',
          message: 'Service shop/orders is not bound to a waypoint',
          observedGeneration: '1',
          reason: 'AncestorNotBound',
          status: 'False',
          type: 'WaypointAccepted',
        },
      ],
    },
  },
  {
    apiVersion: 'security.istio.io/v1',
    kind: 'AuthorizationPolicy',
    metadata: {
      name: 'reviews-read-only',
      namespace: 'shop',
    },
    spec: {
      action: 'ALLOW',
      rules: [
        {
          from: [
            {
              source: {
                principals: ['cluster.local/ns/shop/sa/default'],
              },
            },
          ],
          to: [
            {
              operation: {
                methods: ['GET'],
                paths: ['/api/*'],
              },
            },
          ],
        },
      ],
      targetRefs: [
        {
          group: '',
          kind: 'Service',
          name: 'reviews',
        },
      ],
    },
    status: {
      conditions: [
        {
          lastTransitionTime: '2026-09-17T02:33:05.743044847Z',
          message: 'bound to shop/shop-waypoint',
          observedGeneration: '1',
          reason: 'Accepted',
          status: 'True',
          type: 'WaypointAccepted',
        },
      ],
    },
  },
  {
    apiVersion: 'security.istio.io/v1',
    kind: 'AuthorizationPolicy',
    metadata: {
      name: 'shop-l4',
      namespace: 'shop',
    },
    spec: {
      action: 'ALLOW',
      rules: [
        {
          from: [
            {
              source: {
                namespaces: ['shop', 'istio-system'],
              },
            },
          ],
          to: [
            {
              operation: {
                ports: ['8080'],
              },
            },
          ],
        },
      ],
    },
    status: {
      conditions: [
        {
          lastTransitionTime: '2026-09-17T02:32:38.003583125Z',
          message: 'attached to ztunnel',
          observedGeneration: '1',
          reason: 'Accepted',
          status: 'True',
          type: 'ZtunnelAccepted',
        },
      ],
    },
  },
] as any[];

export const peerAuthentications = [
  {
    apiVersion: 'security.istio.io/v1',
    kind: 'PeerAuthentication',
    metadata: {
      name: 'default',
      namespace: 'istio-system',
    },
    spec: {
      mtls: {
        mode: 'STRICT',
      },
    },
  },
] as any[];

export const sidecars = [
  {
    apiVersion: 'networking.istio.io/v1',
    kind: 'Sidecar',
    metadata: {
      name: 'restrict-egress',
      namespace: 'legacy',
    },
    spec: {
      egress: [
        {
          hosts: ['./*', 'istio-system/*'],
        },
      ],
      outboundTrafficPolicy: {
        mode: 'REGISTRY_ONLY',
      },
    },
  },
] as any[];

export const telemetries = [
  {
    apiVersion: 'telemetry.istio.io/v1',
    kind: 'Telemetry',
    metadata: {
      name: 'tracing',
      namespace: 'istio-system',
    },
    spec: {
      accessLogging: [
        {
          disabled: false,
          filter: {
            expression: 'response.code >= 400',
          },
        },
      ],
      tracing: [
        {
          customTags: {
            env: {
              literal: {
                value: 'dev',
              },
            },
          },
          randomSamplingPercentage: 10,
        },
      ],
    },
  },
] as any[];

export const waypoints = [
  {
    apiVersion: 'gateway.networking.k8s.io/v1',
    kind: 'Gateway',
    metadata: {
      name: 'orphan-waypoint',
      namespace: 'legacy',
    },
    spec: {
      gatewayClassName: 'istio-waypoint',
      listeners: [
        {
          allowedRoutes: {
            namespaces: {
              from: 'Same',
            },
          },
          name: 'mesh',
          port: 15008,
          protocol: 'HBONE',
        },
      ],
    },
    status: {
      addresses: [
        {
          type: 'IPAddress',
          value: '10.96.148.7',
        },
        {
          type: 'Hostname',
          value: 'orphan-waypoint.legacy.svc.cluster.local',
        },
      ],
      conditions: [
        {
          lastTransitionTime: '2026-09-17T02:32:37Z',
          message: 'Resource accepted',
          observedGeneration: 1,
          reason: 'Accepted',
          status: 'True',
          type: 'Accepted',
        },
        {
          lastTransitionTime: '2026-09-17T02:33:06Z',
          message:
            'Resource programmed, assigned to service(s) orphan-waypoint.legacy.svc.cluster.local:15008',
          observedGeneration: 1,
          reason: 'Programmed',
          status: 'True',
          type: 'Programmed',
        },
      ],
      listeners: [
        {
          attachedRoutes: 0,
          conditions: [
            {
              lastTransitionTime: '2026-09-17T02:32:37Z',
              message: 'No errors found',
              observedGeneration: 1,
              reason: 'Accepted',
              status: 'True',
              type: 'Accepted',
            },
            {
              lastTransitionTime: '2026-09-17T02:32:37Z',
              message: 'No errors found',
              observedGeneration: 1,
              reason: 'NoConflicts',
              status: 'False',
              type: 'Conflicted',
            },
            {
              lastTransitionTime: '2026-09-17T02:32:37Z',
              message: 'No errors found',
              observedGeneration: 1,
              reason: 'Programmed',
              status: 'True',
              type: 'Programmed',
            },
            {
              lastTransitionTime: '2026-09-17T02:32:37Z',
              message: 'No errors found',
              observedGeneration: 1,
              reason: 'ResolvedRefs',
              status: 'True',
              type: 'ResolvedRefs',
            },
          ],
          name: 'mesh',
          supportedKinds: [],
        },
      ],
    },
  },
  {
    apiVersion: 'gateway.networking.k8s.io/v1',
    kind: 'Gateway',
    metadata: {
      labels: {
        'istio.io/waypoint-for': 'service',
      },
      name: 'shop-waypoint',
      namespace: 'shop',
    },
    spec: {
      gatewayClassName: 'istio-waypoint',
      listeners: [
        {
          allowedRoutes: {
            namespaces: {
              from: 'Same',
            },
          },
          name: 'mesh',
          port: 15008,
          protocol: 'HBONE',
        },
      ],
    },
    status: {
      addresses: [
        {
          type: 'IPAddress',
          value: '10.96.38.233',
        },
        {
          type: 'Hostname',
          value: 'shop-waypoint.shop.svc.cluster.local',
        },
      ],
      conditions: [
        {
          lastTransitionTime: '2026-09-17T02:32:37Z',
          message: 'Resource accepted',
          observedGeneration: 1,
          reason: 'Accepted',
          status: 'True',
          type: 'Accepted',
        },
        {
          lastTransitionTime: '2026-09-17T02:33:05Z',
          message:
            'Resource programmed, assigned to service(s) shop-waypoint.shop.svc.cluster.local:15008',
          observedGeneration: 1,
          reason: 'Programmed',
          status: 'True',
          type: 'Programmed',
        },
      ],
      listeners: [
        {
          attachedRoutes: 0,
          conditions: [
            {
              lastTransitionTime: '2026-09-17T02:32:37Z',
              message: 'No errors found',
              observedGeneration: 1,
              reason: 'Accepted',
              status: 'True',
              type: 'Accepted',
            },
            {
              lastTransitionTime: '2026-09-17T02:32:37Z',
              message: 'No errors found',
              observedGeneration: 1,
              reason: 'NoConflicts',
              status: 'False',
              type: 'Conflicted',
            },
            {
              lastTransitionTime: '2026-09-17T02:32:37Z',
              message: 'No errors found',
              observedGeneration: 1,
              reason: 'Programmed',
              status: 'True',
              type: 'Programmed',
            },
            {
              lastTransitionTime: '2026-09-17T02:32:37Z',
              message: 'No errors found',
              observedGeneration: 1,
              reason: 'ResolvedRefs',
              status: 'True',
              type: 'ResolvedRefs',
            },
          ],
          name: 'mesh',
          supportedKinds: [],
        },
      ],
    },
  },
] as any[];
