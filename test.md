# 배포 가이드 — ArtifactHub 등록 & Headlamp 공식 플러그인 편입

이 문서는 두 가지를 다룹니다.

1. **ArtifactHub에 올려서 남들이 Headlamp 안에서 클릭 한 번으로 설치하게 만들기**
2. **나중에 Headlamp 공식 플러그인으로 올릴 수 있는지**, 올린다면 무엇이 필요한지

---

## 0. 먼저: ArtifactHub가 꼭 필요한가?

**아니요.** 사내에서만 쓸 거면 안 올려도 됩니다. 설치 경로는 네 가지입니다.

| 방법 | 용도 | 방법 |
|---|---|---|
| 플러그인 디렉터리에 복사 | 로컬 개발·개인 사용 | `dev/deploy.sh` (데스크톱 앱 + 마운트 경로에 동시 배포) |
| 컨테이너에 마운트 | 서버 모드 Headlamp | `-v <plugins>:/headlamp/plugins:ro -plugins-dir=/headlamp/plugins` |
| 커스텀 이미지에 굽기 | 사내 배포 | Headlamp 이미지 `FROM` 받아 `/headlamp/plugins/headlamp-istio/` 에 COPY |
| **ArtifactHub** | **외부 공개·카탈로그 설치** | 아래 |

ArtifactHub가 주는 건 딱 하나입니다: Headlamp의 **Plugin Catalog** 화면에서 검색·설치가 됩니다. 사내 전용이면 3번(커스텀 이미지)이 훨씬 간단합니다.

**중요**: ArtifactHub는 파일을 호스팅하지 않습니다. 저장소의 `artifacthub-pkg.yml`을 읽고, 거기 적힌 `archive-url`(= GitHub Release 첨부 파일)을 받아갑니다. 그래서 **버전 / URL / 체크섬 세 개가 실제 릴리스와 정확히 일치**해야 하고, 순서가 틀리면(파일 먼저 push, 릴리스 나중) 카탈로그에는 뜨는데 설치가 실패합니다.

---

## 1. ArtifactHub 등록 (최초 1회)

### 1-1. 저장소를 GitHub에 올린다

ArtifactHub는 **공개 GitHub 저장소**의 기본 브랜치를 스캔합니다. 비공개 저장소는 안 됩니다.

```sh
cd ~/workspace/lego/headlamp-istio
gh repo create headlamp-istio --public --source=. --remote=origin --push
```

### 1-2. 이미 만들어 둔 파일 두 개를 실제 값으로 채운다

저장소 루트에 스캐폴드해 뒀습니다.

**`artifacthub-repo.yml`** — 소유권 증명

```yaml
repositoryID: REPLACE_WITH_REPOSITORY_ID   # ← 1-3에서 받음
owners:
  - name: yukeun.oh
    email: yukeun.oh@kurlycorp.com
```

**`artifacthub-pkg.yml`** — 패키지 메타데이터

```yaml
version: 0.1.0
name: headlamp_istio
displayName: Istio
createdAt: "2026-09-17T00:00:00Z"
description: >-
  Istio service mesh UI with first-class ambient mode support. ...
license: Apache-2.0
homeURL: https://github.com/OWNER/headlamp-istio      # ← OWNER 교체
logoURL: https://raw.githubusercontent.com/cncf/artwork/main/projects/istio/icon/color/istio-icon-color.svg
annotations:
  headlamp/plugin/archive-url: "https://github.com/OWNER/headlamp-istio/releases/download/v0.1.0/headlamp-istio-0.1.0.tar.gz"
  headlamp/plugin/archive-checksum: "SHA256:REPLACE_ON_RELEASE"
  headlamp/plugin/version-compat: ">=0.23"
  headlamp/plugin/distro-compat: in-cluster,web,docker-desktop,desktop
```

`OWNER` 두 군데만 본인 GitHub 계정으로 바꾸면 됩니다. 나머지 `version` / `archive-url` / `archive-checksum` 세 줄은 **손으로 고치지 마세요** — `dev/release.sh`가 릴리스할 때마다 자동으로 맞춥니다.

### 1-3. ArtifactHub에서 저장소 등록

1. <https://artifacthub.io> 로그인 (GitHub 계정 가능)
2. 우상단 프로필 → **Control Panel** → **Repositories** → **ADD**
3. **Kind**: `Headlamp plugin` 선택
4. **Name**: `headlamp-istio` (URL에 들어감, 소문자·하이픈)
5. **URL**: `https://github.com/OWNER/headlamp-istio`
6. 저장하면 **Repository ID**(UUID)가 발급됩니다

### 1-4. Repository ID를 커밋

```sh
# artifacthub-repo.yml의 REPLACE_WITH_REPOSITORY_ID 를 발급받은 UUID로 교체
git add artifacthub-repo.yml && git commit -m "chore: artifacthub repository id" && git push
```

다음 스캔(약 30분) 때 ArtifactHub가 소유권을 확인하고 **Verified publisher** 배지가 붙습니다.

---

## 2. 릴리스 (버전 올릴 때마다)

`dev/release.sh` 하나로 끝납니다.

```sh
dev/release.sh 0.2.0
```

스크립트가 하는 일, 이 **순서가 중요**합니다:

1. `lint` / `tsc` / `test` 전부 통과 확인 (하나라도 실패하면 중단)
2. `package.json` 버전 올림
3. `npm run build` → `npm run package` → `headlamp-istio-0.2.0.tar.gz` 생성, sha256 계산
4. `artifacthub-pkg.yml`의 `version` / `archive-url` / `archive-checksum` 을 방금 값으로 갱신
5. 커밋 + `v0.2.0` 태그
6. **push 후** `gh release create` 로 릴리스 생성 + tarball 첨부

`artifacthub-pkg.yml`이 가리키는 URL이 존재하게 된 뒤에 push되는 순서라, 스캔 시점에 항상 일관됩니다.

수동으로 할 경우 최소 절차:

```sh
npm install && npm run build && npm run package
# → Tarball checksum (sha256): <체크섬> 출력됨
gh release create v0.2.0 headlamp-istio-0.2.0.tar.gz --generate-notes
# artifacthub-pkg.yml 세 줄 수정 후 push
```

### 검증

```sh
# ArtifactHub가 받아갈 URL이 진짜 열리는지
curl -fsIL "$(grep archive-url artifacthub-pkg.yml | cut -d'"' -f2)" | head -1

# 체크섬이 맞는지
curl -fsL "$(grep archive-url artifacthub-pkg.yml | cut -d'"' -f2)" | shasum -a 256
```

패키지 페이지: `https://artifacthub.io/packages/headlamp/headlamp-istio/headlamp_istio`

---

## 3. 주의할 점

**`version-compat`을 낮춰 잡지 마세요.** 이 플러그인은 `registerMapSource`, `registerKubeObjectGlance` 등 비교적 최근 레지스트리 API를 씁니다. 지금 `>=0.23`으로 잡아 뒀는데, 더 낮은 Headlamp에서 설치되면 런타임에 깨집니다. 올릴 API를 추가하면 이 값도 같이 올려야 합니다.

**상표 문구.** Istio는 Istio Authors의 상표입니다. README 하단에 이미 넣어 뒀습니다 — 공개 배포 시 빼지 마세요.

```
Istio is a trademark of the Istio Authors; this project is not affiliated
with or endorsed by the Istio project.
```

**`name`은 바꾸지 마세요.** `headlamp_istio`가 ArtifactHub 상의 패키지 식별자입니다. 바꾸면 기존 설치와의 연결이 끊깁니다.

**비공개로 하고 싶다면** ArtifactHub 대신 사내 OCI 레지스트리에 tarball을 올리고 커스텀 Headlamp 이미지에 굽는 쪽이 맞습니다.

---

## 4. Headlamp 공식 플러그인으로 올릴 수 있나?

**네, 가능합니다.** 다만 경로가 두 개고 난이도가 다릅니다.

### 경로 A — `headlamp-k8s/plugins` 저장소 (현실적)

Headlamp는 공식 플러그인을 <https://github.com/headlamp-k8s/plugins> 에서 모아 관리합니다. 현재 들어 있는 것들:

`flux`, `cert-manager`, `keda`, `karpenter`, `prometheus`, `opencost`, `backstage`, `app-catalog`, `kubeflow`, `knative`, `strimzi`, `volcano`, `cluster-api`, `radius`, `minikube`, `plugin-catalog`, `ai-assistant`

**Istio는 아직 없습니다.** 앰비언트까지 다루는 플러그인이면 받아들여질 가능성이 충분합니다.

PR 전에 맞춰야 할 것들 — 지금 상태 기준으로 점검해 보면:

| 항목 | 현재 | 비고 |
|---|---|---|
| Apache-2.0 라이선스 | ✅ | `package.json`에 명시 |
| `lint` / `tsc` / `test` 통과 | ✅ | 테스트 70개 |
| 실데이터 기반 테스트 | ✅ | 실클러스터 픽스처 |
| README | ✅ | |
| **i18n** | ❌ | `npm run i18n`으로 문자열 추출, `locales/` 추가 필요 |
| **Storybook** | ❌ | 공식 플러그인 상당수가 컴포넌트 스토리 보유 |
| **CI** | ❌ | GitHub Actions로 lint/tsc/test |
| **유지보수 의사** | — | 이게 사실상 가장 중요한 심사 기준 |

즉 **i18n + Storybook + CI 세 개가 남은 숙제**입니다. 나머지는 이미 기준을 넘습니다.

절차:
1. 먼저 자기 저장소로 공개 + ArtifactHub 등록해서 실사용 실적을 만든다
2. `headlamp-k8s/plugins`에 issue를 열어 편입 의사를 묻는다 (바로 PR보다 이쪽이 낫습니다 — 메인테이너가 범위·중복 여부를 먼저 봅니다)
3. OK 받으면 `plugins/istio/` 디렉터리로 PR

### 경로 B — Headlamp 코어에 기능으로 편입 (비현실적)

Headlamp 코어는 **생태계별 기능을 일부러 플러그인으로 뺍니다.** Flux도 cert-manager도 Prometheus도 전부 플러그인이지 코어가 아닙니다. Istio만 코어에 들어갈 이유가 없으므로 이 경로는 사실상 닫혀 있다고 보면 됩니다.

### 현실적인 순서

```
사내 사용 (커스텀 이미지)
   ↓  쓸만하면
공개 저장소 + ArtifactHub 등록
   ↓  i18n / Storybook / CI 보강 + 사용자 생기면
headlamp-k8s/plugins 에 issue → PR
```

---

## 참고

- Headlamp 퍼블리싱 문서: <https://headlamp.dev/docs/latest/development/plugins/publishing/>
- 공식 플러그인 저장소: <https://github.com/headlamp-k8s/plugins>
- ArtifactHub Headlamp 패키지 목록: <https://artifacthub.io/packages/search?kind=21>
