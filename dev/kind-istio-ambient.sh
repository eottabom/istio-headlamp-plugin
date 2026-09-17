#!/usr/bin/env bash
# Local dev cluster: kind + Istio ambient + Gateway API + sample Istio resources.
set -euo pipefail

CLUSTER="${CLUSTER:-istio-dev}"
ISTIO_VERSION="${ISTIO_VERSION:-1.30.1}"

echo "==> kind cluster: ${CLUSTER}"
if ! kind get clusters 2>/dev/null | grep -qx "${CLUSTER}"; then
  kind create cluster --name "${CLUSTER}" --config - <<'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
EOF
fi
kubectl config use-context "kind-${CLUSTER}"

echo "==> Gateway API CRDs"
kubectl apply -f "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml"

echo "==> Istio ${ISTIO_VERSION} (ambient profile)"
istioctl install --set profile=ambient --set values.global.tag="${ISTIO_VERSION}" --skip-confirmation

kubectl -n istio-system rollout status deploy/istiod --timeout=180s
kubectl -n istio-system rollout status ds/ztunnel --timeout=180s
kubectl -n istio-system rollout status ds/istio-cni-node --timeout=180s

echo "==> sample workloads and Istio config"
kubectl apply -f "$(dirname "$0")/sample-istio-config.yaml"

echo
echo "Done. Context: kind-${CLUSTER}"
kubectl -n istio-system get deploy,ds
