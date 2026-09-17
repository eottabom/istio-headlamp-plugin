#!/usr/bin/env bash
# Cut a release and publish it where ArtifactHub can find it.
#
# ArtifactHub does not host anything: it reads artifacthub-pkg.yml from the
# default branch and fetches the tarball from archive-url. So the version, the
# URL and the checksum in that file have to match a real GitHub release, and
# the file has to be pushed *after* the release exists. Getting that order
# wrong is the usual reason a plugin shows up but fails to install.
#
# Usage: dev/release.sh 0.2.0
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:?usage: dev/release.sh <version>}"
TAG="v${VERSION}"
REPO=$(git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')
TARBALL="headlamp-istio-${VERSION}.tar.gz"
URL="https://github.com/${REPO}/releases/download/${TAG}/${TARBALL}"

git diff --quiet || { echo "working tree is dirty"; exit 1; }

echo "==> checks"
npm run lint
npm run tsc
npm test

echo "==> version ${VERSION}"
npm version "${VERSION}" --no-git-tag-version >/dev/null

echo "==> build and package"
npm run build
npm run package >/dev/null
CHECKSUM=$(shasum -a 256 "${TARBALL}" | cut -d' ' -f1)
echo "    ${TARBALL}  sha256:${CHECKSUM}"

echo "==> artifacthub-pkg.yml"
python3 - "$VERSION" "$URL" "$CHECKSUM" <<'PY'
import re, sys
version, url, checksum = sys.argv[1:4]
p = 'artifacthub-pkg.yml'
s = open(p).read()
s = re.sub(r'^version: .*$', f'version: {version}', s, count=1, flags=re.M)
s = re.sub(r'(headlamp/plugin/archive-url: ).*$', rf'\1"{url}"', s, count=1, flags=re.M)
s = re.sub(r'(headlamp/plugin/archive-checksum: ).*$', rf'\1"SHA256:{checksum}"', s, count=1, flags=re.M)
open(p, 'w').write(s)
PY

echo "==> commit and tag"
git add package.json package-lock.json artifacthub-pkg.yml
git commit -m "release: ${TAG}"
git tag -a "${TAG}" -m "${TAG}"

echo "==> GitHub release (tarball attached)"
git push origin HEAD --tags
gh release create "${TAG}" "${TARBALL}" --title "${TAG}" --generate-notes

rm -f "${TARBALL}"
echo
echo "Done. ArtifactHub picks the change up on its next scan (~30 min)."
