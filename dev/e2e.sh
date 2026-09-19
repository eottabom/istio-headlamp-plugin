#!/usr/bin/env bash
# Browser tests against a real Headlamp with this plugin loaded.
#
# Needs the kind cluster from dev/kind-istio-ambient.sh. Builds the plugin,
# starts Headlamp in Docker on the kind network with the cluster's internal
# kubeconfig, and runs e2e/ against it. Extra args go to `playwright test`.
set -euo pipefail
cd "$(dirname "$0")/.."

CLUSTER="${CLUSTER:-istio-dev}"
PORT="${PORT:-4466}"
HEADLAMP_IMAGE="${HEADLAMP_IMAGE:-ghcr.io/headlamp-k8s/headlamp:latest}"
CONTAINER=headlamp-e2e
WORK="$(mktemp -d)"
trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

kubectl --context "kind-${CLUSTER}" apply \
  -f dev/sample-istio-config.yaml -f dev/sample-istio-config-extra.yaml >/dev/null

./dev/deploy.sh "$WORK/plugins" >/dev/null
mkdir -p "$WORK/kube"
kind get kubeconfig --name "$CLUSTER" --internal >"$WORK/kube/config"
chmod -R a+rX "$WORK"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" --network kind -p "${PORT}:4466" \
  -v "$WORK/plugins:/headlamp/plugins" -v "$WORK/kube:/kube" -e KUBECONFIG=/kube/config \
  "$HEADLAMP_IMAGE" -plugins-dir=/headlamp/plugins >/dev/null

for _ in $(seq 1 60); do
  curl -fs "http://localhost:${PORT}/config" >/dev/null && break
  sleep 1
done

cd e2e
[ -d node_modules ] || npm ci
npx playwright install chromium >/dev/null
HEADLAMP_URL="http://localhost:${PORT}" HEADLAMP_CLUSTER="kind-${CLUSTER}" npx playwright test "$@"
