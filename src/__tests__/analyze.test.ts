import { describe, expect, it } from 'vitest';
import {
  attachmentKind,
  authorizationOperations,
  authorizationOperationsBrief,
  collectDestinationHosts,
  describeExportTo,
  l7Requirements,
  loadBalancerName,
  normaliseTargetRefs,
  serviceEntryPortSummary,
  serviceEntryWarning,
} from '../lib/analyze';
import {
  ENVOYFILTER_VERSIONS,
  NETWORKING_VERSIONS,
  PROXYCONFIG_VERSIONS,
  SECURITY_VERSIONS,
} from '../resources/apiVersions';
import {
  authorizationPolicies,
  destinationRules,
  peerAuthentications,
  serviceEntries,
  virtualServices,
} from './fixtures';

const spec = (items: any[], name: string) => items.find(i => i.metadata.name === name).spec;

describe('API versions', () => {
  it('cover every version the 1.30 CRDs serve, newest first', () => {
    expect(NETWORKING_VERSIONS).toEqual([
      'networking.istio.io/v1',
      'networking.istio.io/v1beta1',
      'networking.istio.io/v1alpha3',
    ]);
    expect(SECURITY_VERSIONS).toEqual(['security.istio.io/v1', 'security.istio.io/v1beta1']);
    expect(ENVOYFILTER_VERSIONS).toEqual(['networking.istio.io/v1alpha3']);
    expect(PROXYCONFIG_VERSIONS).toEqual(['networking.istio.io/v1beta1']);
  });

  it('include the apiVersion the cluster actually stored', () => {
    expect(NETWORKING_VERSIONS).toContain(destinationRules[0].apiVersion);
    expect(SECURITY_VERSIONS).toContain(authorizationPolicies[0].apiVersion);
  });
});

describe('AuthorizationPolicy L4/L7 classification', () => {
  it('flags HTTP methods and paths as needing L7', () => {
    expect(l7Requirements(spec(authorizationPolicies, 'reviews-read-only').rules)).toEqual([
      'rules[0].to[0].operation.methods',
      'rules[0].to[0].operation.paths',
    ]);
  });

  it('flags request.headers conditions as needing L7', () => {
    const reqs = l7Requirements(spec(authorizationPolicies, 'orders-l7-unenforced').rules);
    expect(reqs).toContain('rules[0].when[0].key = request.headers[x-admin]');
    expect(reqs).toContain('rules[0].to[0].operation.methods');
  });

  it('treats source namespaces and ports as L4, which ztunnel enforces', () => {
    expect(l7Requirements(spec(authorizationPolicies, 'shop-l4').rules)).toEqual([]);
  });

  it('treats JWT requestPrincipals as needing L7', () => {
    const rules = [{ from: [{ source: { requestPrincipals: ['iss/*'] } }] }];
    expect(l7Requirements(rules)).toEqual(['rules[0].from[0].source.requestPrincipals (JWT)']);
  });

  it('does not flag an empty or absent rule list', () => {
    expect(l7Requirements(undefined)).toEqual([]);
    expect(l7Requirements([{}])).toEqual([]);
  });

  it('does not flag notPorts or ipBlocks, which ztunnel handles', () => {
    expect(
      l7Requirements([
        {
          to: [{ operation: { notPorts: ['9090'] } }],
          from: [{ source: { ipBlocks: ['10.0.0.0/8'] } }],
        },
      ])
    ).toEqual([]);
  });
});

describe('attachment', () => {
  it('reads targetRefs on an ambient-style policy', () => {
    const s = spec(authorizationPolicies, 'reviews-read-only');
    expect(attachmentKind(s)).toBe('targetRef');
    expect(normaliseTargetRefs(s)[0]).toMatchObject({ kind: 'Service', name: 'reviews' });
  });

  it('reports namespace scope when neither selector nor targetRef is set', () => {
    expect(attachmentKind(spec(authorizationPolicies, 'shop-l4'))).toBe('namespace');
    expect(attachmentKind(spec(peerAuthentications, 'default'))).toBe('namespace');
  });

  it('reports selector scope for a label selector', () => {
    expect(attachmentKind({ selector: { matchLabels: { app: 'reviews' } } })).toBe('selector');
  });

  it('treats an empty selector as namespace-wide, not selector-based', () => {
    expect(attachmentKind({ selector: { matchLabels: {} } })).toBe('namespace');
  });

  it('collapses a singular targetRef into the list form', () => {
    expect(normaliseTargetRefs({ targetRef: { kind: 'Gateway', name: 'wp' } })).toHaveLength(1);
    expect(
      normaliseTargetRefs({ targetRefs: [], targetRef: { kind: 'Gateway', name: 'wp' } })
    ).toHaveLength(1);
  });
});

describe('ServiceEntry', () => {
  it('summarises ports as number/protocol (name)', () => {
    expect(serviceEntryPortSummary(spec(serviceEntries, 'payments-api'))).toEqual([
      '443/TLS (https)',
      '80/HTTP (http)',
    ]);
  });

  it('accepts a well-formed DNS entry', () => {
    expect(serviceEntryWarning(spec(serviceEntries, 'payments-api'))).toBeUndefined();
  });

  it('flags STATIC resolution with no endpoints, which silently routes nothing', () => {
    expect(serviceEntryWarning(spec(serviceEntries, 'broken-static'))).toContain(
      'neither endpoints nor a workloadSelector'
    );
  });

  // A STATIC entry can pick its backends up by label instead of listing them,
  // which is the ordinary shape for onboarding VMs through WorkloadEntries.
  it('accepts STATIC resolution backed by a workloadSelector', () => {
    expect(
      serviceEntryWarning({
        hosts: ['vm.internal'],
        ports: [{ number: 8080, protocol: 'HTTP' }],
        resolution: 'STATIC',
        workloadSelector: { matchLabels: { app: 'legacy-vm' } },
      })
    ).toBeUndefined();
  });

  it('still flags STATIC with an empty workloadSelector', () => {
    expect(
      serviceEntryWarning({
        hosts: ['vm.internal'],
        ports: [{ number: 8080, protocol: 'HTTP' }],
        resolution: 'STATIC',
        workloadSelector: { matchLabels: {} },
      })
    ).toContain('neither endpoints nor a workloadSelector');
  });

  it('flags a missing host list', () => {
    expect(serviceEntryWarning({ ports: [{ number: 80 }] })).toContain('matches nothing');
  });

  it('flags a missing port list', () => {
    expect(serviceEntryWarning({ hosts: ['a.example.com'] })).toContain('No ports');
  });
});

describe('VirtualService', () => {
  it('collects destination hosts across all routes, deduplicated', () => {
    expect(collectDestinationHosts(spec(virtualServices, 'reviews'))).toEqual([
      'reviews.shop.svc.cluster.local',
    ]);
  });

  it('handles a spec with no routes', () => {
    expect(collectDestinationHosts({})).toEqual([]);
  });
});

describe('DestinationRule', () => {
  it('names a simple load balancer', () => {
    expect(loadBalancerName(spec(destinationRules, 'reviews').trafficPolicy.loadBalancer)).toBe(
      'LEAST_REQUEST'
    );
  });

  it('names a consistent-hash load balancer', () => {
    expect(loadBalancerName({ consistentHash: { httpHeaderName: 'x-user' } })).toBe(
      'CONSISTENT_HASH'
    );
  });

  it('returns undefined when unset', () => {
    expect(loadBalancerName(undefined)).toBeUndefined();
  });
});

describe('describeExportTo', () => {
  it('explains the default', () => {
    expect(describeExportTo(undefined)).toBe('All namespaces (default)');
  });

  it('expands the "." and "*" shorthands', () => {
    expect(describeExportTo(['.'])).toBe('. (this namespace)');
    expect(describeExportTo(['*'])).toBe('* (all namespaces)');
    expect(describeExportTo(['prod', '.'])).toBe('prod, . (this namespace)');
  });

  it('matches the exportTo the cluster stored', () => {
    expect(describeExportTo(spec(serviceEntries, 'payments-api').exportTo)).toBe(
      '. (this namespace)'
    );
  });
});

describe('authorizationOperations', () => {
  it('summarises method and path so the list can be searched by path', () => {
    expect(
      authorizationOperations(spec(authorizationPolicies, 'orders-l7-unenforced').rules)
    ).toEqual(['DELETE /admin/*']);
    expect(authorizationOperations(spec(authorizationPolicies, 'reviews-read-only').rules)).toEqual(
      ['GET /api/*']
    );
  });

  it('renders a port-only (L4) operation', () => {
    expect(authorizationOperations(spec(authorizationPolicies, 'shop-l4').rules)).toEqual([
      ':8080',
    ]);
  });

  it('marks negated fields with !', () => {
    expect(
      authorizationOperations([{ to: [{ operation: { notMethods: ['GET'], paths: ['/x'] } }] }])
    ).toEqual(['!GET /x']);
  });

  it('describes a rule with no "to" block', () => {
    expect(authorizationOperations([{ from: [{ source: { namespaces: ['a'] } }] }])).toEqual([
      'any operation',
    ]);
  });

  it('deduplicates identical operations', () => {
    const op = { to: [{ operation: { methods: ['GET'], paths: ['/a'] } }] };
    expect(authorizationOperations([op, op])).toEqual(['GET /a']);
  });
});

describe('authorizationOperationsBrief', () => {
  // A real ext-authz policy: 50 paths, 11 exclusions, 4 hosts. Printing them in
  // a table cell made one row taller than the viewport.
  const bigRules = [
    {
      to: [
        {
          operation: {
            hosts: ['a.example.com', 'a.example.com:8043', 'b.example.com', 'b.example.com:443'],
            notMethods: ['OPTIONS'],
            paths: Array.from({ length: 50 }, (_, i) => `/svc-${i}/*`),
            notPaths: Array.from({ length: 11 }, (_, i) => `/public-${i}/*`),
          },
        },
      ],
    },
  ];

  it('collapses long lists to counts', () => {
    expect(authorizationOperationsBrief(bigRules)).toEqual([
      '!OPTIONS 50 paths (11 excluded) 4 hosts',
    ]);
  });

  it('keeps short lists inline', () => {
    expect(
      authorizationOperationsBrief([{ to: [{ operation: { methods: ['GET'], paths: ['/a'] } }] }])
    ).toEqual(['GET /a']);
  });

  it('still lets search match every path through the full version', () => {
    const full = authorizationOperations(bigRules).join(' ');
    expect(full).toContain('/svc-49/*');
    expect(full).toContain('/public-10/*');
  });

  it('describes a rule with no "to" block', () => {
    expect(authorizationOperationsBrief([{ from: [{ source: { namespaces: ['a'] } }] }])).toEqual([
      'any operation',
    ]);
  });
});
