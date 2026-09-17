#!/usr/bin/env python3
"""Regenerate src/__tests__/fixtures.ts from a live cluster.

Tests run against what the API server actually returns -- defaults filled in,
fields reordered -- rather than hand-written guesses at the CRD schemas.

    ./dev/kind-istio-ambient.sh
    python3 scripts/capture-fixtures.py --context kind-istio-dev
"""
import argparse
import json
import subprocess
import sys

NOISE = ('managedFields', 'resourceVersion', 'generation', 'creationTimestamp', 'uid')

KINDS = [
    ('destinationrules', 'destinationRules'),
    ('virtualservices', 'virtualServices'),
    ('serviceentries', 'serviceEntries'),
    ('authorizationpolicies', 'authorizationPolicies'),
    ('peerauthentications', 'peerAuthentications'),
    ('sidecars', 'sidecars'),
    ('telemetries', 'telemetries'),
]

HEADER = """/* eslint-disable */
// Captured from a live Istio ambient cluster, so these are the exact shapes the
// API server returns, defaults and all -- not hand-written approximations of
// the CRD schemas.
// Regenerate with scripts/capture-fixtures.py against a cluster.

"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--context', default='kind-istio-dev')
    ap.add_argument('--out', default='src/__tests__/fixtures.ts')
    args = ap.parse_args()

    def get(argv):
        cmd = ['kubectl', '--context', args.context, 'get', *argv, '-o', 'json']
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            sys.exit(f'{" ".join(cmd)} failed:\n{proc.stderr}')
        return json.loads(proc.stdout)['items']

    def strip(obj):
        meta = obj.get('metadata', {})
        for key in NOISE:
            meta.pop(key, None)
        meta.get('annotations', {}).pop('kubectl.kubernetes.io/last-applied-configuration', None)
        if not meta.get('annotations'):
            meta.pop('annotations', None)
        return obj

    fixtures = {
        'namespaces': [strip(i) for i in get(['ns'])
                       if i['metadata']['name'] in ('shop', 'legacy', 'nomesh', 'istio-system')],
        'services': [strip(i) for i in get(['svc', '-n', 'shop'])],
        'pods': [strip(i) for i in get(['pods', '-A'])
                 if i['metadata']['namespace'] in ('shop', 'istio-system')][:6],
    }
    for plural, key in KINDS:
        fixtures[key] = [strip(i) for i in get([plural, '-A'])]
    fixtures['waypoints'] = [strip(i) for i in get(['gateways.gateway.networking.k8s.io', '-A'])]

    with open(args.out, 'w') as handle:
        handle.write(HEADER)
        for key, value in fixtures.items():
            handle.write(f'export const {key} = {json.dumps(value, indent=2)} as any[];\n\n')

    print({k: len(v) for k, v in fixtures.items()})
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
