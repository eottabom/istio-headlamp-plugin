import { describe, expect, it } from 'vitest';
import {
  ControlPlaneInputs,
  controlPlaneNamespace,
  controlPlaneStatus,
  crdState,
  dataPlaneNamespaces,
  dataPlaneResourceUnknown,
  forbiddenDataPlaneNamespaces,
  isIstiod,
  istiodVersion,
  managedControlPlanes,
  managedLookup,
  managedStatusNote,
} from '../lib/controlPlaneParse';

const istiod = (namespace: string, name = 'istiod') => ({ metadata: { name, namespace } });

describe('controlPlaneNamespace', () => {
  it('uses the namespace istiod runs in', () => {
    expect(controlPlaneNamespace([istiod('aks-istio-system', 'istiod-asm-1-30')])).toBe(
      'aks-istio-system'
    );
  });

  it('prefers istio-system when istiod runs in several namespaces', () => {
    expect(controlPlaneNamespace([istiod('a-mesh'), istiod('istio-system')])).toBe('istio-system');
  });

  it('picks the same namespace whatever order the API lists them in', () => {
    expect(controlPlaneNamespace([istiod('mesh-b'), istiod('mesh-a')])).toBe('mesh-a');
    expect(controlPlaneNamespace([istiod('mesh-a'), istiod('mesh-b')])).toBe('mesh-a');
  });

  it('falls back to istio-system when no istiod is found', () => {
    expect(controlPlaneNamespace([])).toBe('istio-system');
  });
});

describe('isIstiod', () => {
  it('matches revisioned istiod names', () => {
    expect(isIstiod({ metadata: { name: 'istiod-asm-1-30' } })).toBe(true);
  });

  it('matches the app=istiod label used for discovery, whatever the name', () => {
    expect(isIstiod({ metadata: { name: 'pilot', labels: { app: 'istiod' } } })).toBe(true);
  });

  it('ignores other Deployments', () => {
    expect(isIstiod({ metadata: { name: 'istio-ingressgateway', labels: { app: 'istio' } } })).toBe(
      false
    );
  });
});

describe('dataPlaneNamespaces', () => {
  it('still looks in istio-system when istiod runs elsewhere', () => {
    expect(dataPlaneNamespaces('aks-istio-system')).toEqual([
      'aks-istio-system',
      'istio-system',
      'kube-system',
    ]);
  });

  it('lists istio-system once', () => {
    expect(dataPlaneNamespaces('istio-system')).toEqual(['istio-system', 'kube-system']);
  });

  it('lists kube-system once when istiod runs there', () => {
    expect(dataPlaneNamespaces('kube-system')).toEqual(['kube-system', 'istio-system']);
  });
});

describe('dataPlaneResourceUnknown', () => {
  const forbidden = { status: 403 };
  const notFound = { status: 404 };

  it('is unknown when a namespace was forbidden and no ztunnel was found', () => {
    expect(dataPlaneResourceUnknown([forbidden], false)).toBe(true);
  });

  it('is settled by a ztunnel that was found, whatever the other namespaces did', () => {
    expect(dataPlaneResourceUnknown([forbidden], true)).toBe(false);
  });

  it('reads an absent ztunnel as absent when every namespace answered', () => {
    expect(dataPlaneResourceUnknown([], false)).toBe(false);
    expect(dataPlaneResourceUnknown(null, false)).toBe(false);
    expect(dataPlaneResourceUnknown(undefined, false)).toBe(false);
  });

  it('only treats a permission error as unknown', () => {
    expect(dataPlaneResourceUnknown([notFound], false)).toBe(false);
  });

  it('is unknown when one namespace of several was forbidden', () => {
    expect(dataPlaneResourceUnknown([null, forbidden, undefined], false)).toBe(true);
  });

  it('returns only namespaces where DaemonSet listing was forbidden', () => {
    expect(
      forbiddenDataPlaneNamespaces([
        { status: 403, namespace: 'kube-system' },
        { status: 404, namespace: 'istio-system' },
        { status: 403, namespace: 'kube-system' },
        null,
      ])
    ).toEqual(['kube-system']);
  });

  it('does not invent a namespace when an error has none', () => {
    expect(forbiddenDataPlaneNamespaces([{ status: 403 }])).toEqual([]);
  });
});

describe('managedControlPlanes', () => {
  const revision = (name: string, conditions?: any[]) => ({
    metadata: { name },
    status: conditions ? { conditions } : undefined,
  });

  it('reads the channel and the Reconciled condition of a GKE ControlPlaneRevision', () => {
    const managed = managedControlPlanes([
      revision('asm-managed', [
        { type: 'Reconciled', status: 'True' },
        { type: 'Stalled', status: 'False' },
      ]),
    ]);
    expect(managed).toEqual([{ name: 'asm-managed', reconciled: true }]);
  });

  it('reports a revision GKE has not reconciled', () => {
    expect(
      managedControlPlanes([
        revision('asm-managed-rapid', [{ type: 'Reconciled', status: 'False' }]),
      ])
    ).toEqual([{ name: 'asm-managed-rapid', reconciled: false }]);
  });

  it('leaves reconciliation unknown before GKE reports a status', () => {
    expect(managedControlPlanes([revision('asm-managed-stable')])).toEqual([
      { name: 'asm-managed-stable', reconciled: undefined },
    ]);
  });

  it('does not call a Reconciled=Unknown revision not reconciled', () => {
    expect(
      managedControlPlanes([revision('asm-managed', [{ type: 'Reconciled', status: 'Unknown' }])])
    ).toEqual([{ name: 'asm-managed', reconciled: undefined }]);
  });

  it('finds nothing on a cluster without managed revisions', () => {
    expect(managedControlPlanes([])).toEqual([]);
  });
});

describe('managedStatusNote', () => {
  it('says nothing when every revision is reconciled', () => {
    expect(managedStatusNote([{ name: 'asm-managed', reconciled: true }])).toBe('');
  });

  it('reports a pending status instead of calling it not reconciled', () => {
    expect(managedStatusNote([{ name: 'asm-managed' }])).toBe(' (status pending)');
  });

  it('prefers not reconciled when revisions disagree', () => {
    expect(
      managedStatusNote([{ name: 'asm-managed' }, { name: 'asm-managed-rapid', reconciled: false }])
    ).toBe(' (not reconciled)');
  });
});

describe('crdState', () => {
  const name = 'controlplanerevisions.mesh.cloud.google.com';

  it('reads a denied CRD list as unreadable, even with the empty list a failed probe returns', () => {
    expect(crdState([], { status: 403 }, name)).toBe('unreadable');
  });

  it('tells present from absent once the list is in', () => {
    expect(crdState([{ metadata: { name } }], null, name)).toBe('present');
    expect(crdState([{ metadata: { name: 'other' } }], null, name)).toBe('absent');
  });

  it('is loading until the list or an error arrives', () => {
    expect(crdState(null, null, name)).toBe('loading');
  });
});

describe('managedLookup', () => {
  const forbidden = [{ status: 403 }];

  it('ignores a 403 on a cluster whose CRD list has no ControlPlaneRevision', () => {
    // Kubernetes answers 403 for a resource that does not exist when the
    // account is restricted, so the 403 alone says nothing about GKE.
    expect(managedLookup('absent', false, forbidden)).toBe('settled');
  });

  it('does not wait for the revisions when the CRD is known to be absent', () => {
    expect(managedLookup('absent', false, null)).toBe('settled');
  });

  it('reports forbidden when the CRD exists but cannot be listed', () => {
    expect(managedLookup('present', false, forbidden)).toBe('forbidden');
  });

  it('cannot rule a managed control plane out when the CRD list is unreadable too', () => {
    expect(managedLookup('unreadable', false, forbidden)).toBe('forbidden');
  });

  it('treats a 404 as an answer when the CRD list is unreadable', () => {
    expect(managedLookup('unreadable', false, [{ status: 404 }])).toBe('settled');
  });

  it('waits for the CRD list before trusting a 403', () => {
    expect(managedLookup('loading', false, forbidden)).toBe('pending');
  });

  it('waits for the revisions while nothing has answered', () => {
    expect(managedLookup('present', false, [])).toBe('pending');
    expect(managedLookup('present', true, null)).toBe('settled');
  });
});

describe('controlPlaneStatus', () => {
  const READ: ControlPlaneInputs = {
    istiodFound: true,
    managedFound: false,
    namespaceLoading: false,
    namespaceUnknown: false,
    deploymentsLoading: false,
    deploymentErrors: [],
    revisions: 'settled',
  };
  const missing = { ...READ, istiodFound: false };
  const forbidden = [{ status: 403 }];

  it('reports a found istiod as settled', () => {
    expect(controlPlaneStatus(READ)).toEqual({
      loading: false,
      unknown: false,
      managedUnknown: false,
    });
  });

  it('does not wait for the revision probe once istiod is found', () => {
    expect(controlPlaneStatus({ ...READ, revisions: 'pending' }).loading).toBe(false);
  });

  // Without this a GKE managed mesh flashed "No istiod" before its
  // ControlPlaneRevision arrived.
  it('waits for the revision probe when no istiod is found', () => {
    expect(controlPlaneStatus({ ...missing, revisions: 'pending' }).loading).toBe(true);
  });

  it('is loading while either Deployment lookup runs', () => {
    expect(controlPlaneStatus({ ...READ, namespaceLoading: true }).loading).toBe(true);
    expect(controlPlaneStatus({ ...READ, deploymentsLoading: true }).loading).toBe(true);
  });

  it('calls a missing control plane not found only when every lookup answered', () => {
    expect(controlPlaneStatus(missing).unknown).toBe(false);
  });

  it('cannot tell when the Deployments were denied', () => {
    const result = controlPlaneStatus({ ...missing, deploymentErrors: forbidden });
    expect(result).toMatchObject({ unknown: true, managedUnknown: false });
  });

  it('cannot tell when the cluster-wide istiod lookup was denied', () => {
    expect(controlPlaneStatus({ ...missing, namespaceUnknown: true }).unknown).toBe(true);
  });

  it('names the revision probe when only it was denied', () => {
    const result = controlPlaneStatus({ ...missing, revisions: 'forbidden' });
    expect(result).toMatchObject({ unknown: true, managedUnknown: true });
  });

  it('does not blame the revision probe when the Deployments were denied too', () => {
    const result = controlPlaneStatus({
      ...missing,
      deploymentErrors: forbidden,
      revisions: 'forbidden',
    });
    expect(result.managedUnknown).toBe(false);
  });

  it('accepts a managed control plane even where Deployments were denied', () => {
    const result = controlPlaneStatus({
      ...missing,
      managedFound: true,
      deploymentErrors: forbidden,
    });
    expect(result.unknown).toBe(false);
  });

  it('treats only Forbidden as a denied lookup', () => {
    expect(controlPlaneStatus({ ...missing, deploymentErrors: [{ status: 500 }] }).unknown).toBe(
      false
    );
  });
});

describe('istiodVersion', () => {
  const withImage = (image?: string) => [
    { jsonData: { spec: { template: { spec: { containers: [{ image }] } } } } },
  ];

  it.each([
    ['docker.io/istio/pilot:1.30.1', '1.30.1'],
    ['gcr.io/istio-release/pilot:1.30.1-distroless', '1.30.1-distroless'],
    ['registry.local:5000/istio/pilot:1.30.1', '1.30.1'],
    ['docker.io/istio/pilot:1.30.1@sha256:abc123', '1.30.1'],
  ])('reads the tag of %s', (image, tag) => {
    expect(istiodVersion(withImage(image))).toBe(tag);
  });

  // These used to show part of the digest, or the image path, as the version.
  it.each([
    'docker.io/istio/pilot@sha256:abc123',
    'registry.local:5000/istio/pilot',
    'istio/pilot',
    'istio/pilot:',
  ])('has no version for untagged %s', image => {
    expect(istiodVersion(withImage(image))).toBeUndefined();
  });

  it('has no version without an istiod or an image', () => {
    expect(istiodVersion([])).toBeUndefined();
    expect(istiodVersion(withImage(undefined))).toBeUndefined();
  });
});
