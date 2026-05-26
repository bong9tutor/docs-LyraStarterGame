# LyraStarterGame 분석·학습 저장소

Epic Games 의 **LyraStarterGame** (Unreal Engine 5.7 공식 샘플) 코드와 자산을 심층 분석해 **참고 메뉴얼** 과 **학습 가이드** 를 만드는 저장소입니다. 게임을 빌드해 플레이하는 것이 목적이 아니라, 라이라의 설계 의도와 시스템 구성을 다른 UE 프로젝트에서도 재사용할 수 있게 정리하는 것이 목적입니다.

## 학습 사이트 (GitHub Pages)

본 저장소의 분석·학습 결과는 정적 HTML 사이트로 GitHub Pages 에 배포돼 있어 브라우저에서 바로 읽을 수 있습니다.

**[학습 사이트 홈](https://bong9tutor.github.io/docs-LyraStarterGame/html/)** - `https://bong9tutor.github.io/docs-LyraStarterGame/html/`

시스템별 진입점:

| 시스템 | 학습 페이지 수 | 진입점 |
|--------|--------------|--------|
| 애니메이션 (`animation`) | 12 | [전체 지도](https://bong9tutor.github.io/docs-LyraStarterGame/html/pages/lyra-animation-overview.html) |
| CommonUI (`ui`) | 7 | [전체 지도](https://bong9tutor.github.io/docs-LyraStarterGame/html/pages/lyra-ui-overview.html) |
| 에셋 비동기 로딩 (`asset-loading`) | 9 | [전체 지도](https://bong9tutor.github.io/docs-LyraStarterGame/html/pages/lyra-asset-loading-overview.html) |
| GAS (`gas`) | 9 | [전체 지도](https://bong9tutor.github.io/docs-LyraStarterGame/html/pages/lyra-gas-overview.html) |

사이트는 3 단 반응형 (사이드바 + 본문 + 페이지 TOC), 다크모드 토글, 모바일 햄버거 drawer 를 지원합니다. 빌드 도구·CDN·외부 폰트 의존 없이 vanilla HTML / CSS / JS 만으로 동작.

## 수강생 공지 (태그별 추적)

수강생 / 팀 프로젝트 대상으로 슬랙에 발송한 안내 문구는 git tag 단위로 [`docs/student-notices.md`](docs/student-notices.md) 에 보관합니다. 최신 tag 가 맨 위.

## 시스템별 핵심 주제

| 시스템 | 핵심 주제 |
|--------|----------|
| 애니메이션 | ABP pose graph · LocomotionSM · Linked Anim Layer · 무기·cosmetic 선택 · Distance Matching · IK · Invisible Mesh + Copy Pose |
| CommonUI | Activatable widget · `ALyraHUD` · HUD layout · `GameFeatureAction_AddWidgets` · UIExtension · Tagged Widget · Common Style |
| 에셋 비동기 로딩 | `ULyraAssetManager` 부팅 · StartupJob · `ULyraGameData` · Primary Asset Type · Experience 7 단계 state · AssetBundle 메타 · 포팅 가이드 |
| GAS | ASC 초기화 4 경로 · AbilitySet grant · 활성 정책 (Policy · Group · Cost) · 태그 관계 · 데미지 파이프라인 · GameplayCue · GamePhase · 글로벌 ASC |

학습 페이지 본문에 인용된 사실의 단일 출처는 `docs/project/<system>-*.md` 마크다운 원장. 상세 인덱스는 [`docs/README.md`](docs/README.md).

## 구성

| 폴더 | 그룹 | 역할 |
|------|------|------|
| `Source/` `Content/` `Plugins/` `Config/` `LyraStarterGame.uproject` | Epic 원본 | UE 5.7 라이라 샘플 (`Content/` 폴더 다운로드 필요, 아래 안내 참조) |
| [`docs/`](docs/) | 분석·학습 문서 | 정책 (`common/`) + 라이라 컨텍스트·검증 원장 (`project/`) + 보조 도구 (`tools/`) |
| [`html/`](html/) | 다이나믹 HTML 산출물 | `docs/project/` 원장을 학습 동선 순으로 재배열한 정적 사이트 (37 페이지). GitHub Pages 로 배포 |
| [`CLAUDE.md`](CLAUDE.md) | Claude 작업 정책 | 본 레포에서 Claude 가 따르는 행동 규칙 + 작업 유형별 시작 문서 인덱스 |

## 빠른 시작

### 1. 학습 사이트 보기

가장 빠른 방법은 위 [학습 사이트 홈](https://bong9tutor.github.io/docs-LyraStarterGame/html/) URL 클릭. 별도 설치 없음.

로컬에서 보려면 저장소를 클론한 뒤 `html/index.html` 을 브라우저로 더블클릭. 빌드 도구·서버 불필요.

### 2. 마크다운 원장 읽기

GitHub 의 마크다운 렌더링으로 [`docs/README.md`](docs/README.md) 부터 들어가면 시스템별 4 표준 문서 (코드 분석 · 블루프린트 분석 · 학습 섹션 설계 · 참고 자료) 인덱스가 보입니다.

### 3. Epic 원본 코드를 실제로 빌드하려면

본 레포는 코드만 들고 있고 `Content/` 폴더는 빠져 있습니다. Epic Games Launcher 의 Marketplace 에서 Lyra 를 다운로드해 `Content/` 와 각 plugin 의 `Content/` 폴더를 복사하면 됩니다. 상세는 [Unreal Engine Lyra documentation](https://docs.unrealengine.com/5.0/en-US/lyra-sample-game-in-unreal-engine/) 참조.

## 정책 4 그룹

이 레포는 정책 / 컨텍스트 / 산출물 / 도구 4 그룹이 폴더 단위로 분리돼 있어 "무엇이 규칙이고 무엇이 사실이고 무엇이 산출물인지" 가 명확합니다.

| 그룹 | 위치 | 다른 UE 프로젝트 재사용 |
|------|------|------------------------|
| **Claude 작업 정책 (B)** | [`CLAUDE.md`](CLAUDE.md) | 표 구조만 템플릿으로 재사용. 본문은 새 레포에 맞게 갱신 |
| **컨텐츠 생성 정책 (A)** | [`docs/common/`](docs/common/) - `analysis-tools.md` · `documentation-workflow.md` · `dynamic-html-spec.md` | 폴더 통째 카피 가능 |
| **프로젝트 컨텍스트 + 시스템 검증 원장** | [`docs/project/`](docs/project/) - `architecture-overview.md` · `project-verification.md` + `<system>-*` | 라이라 종속. 카피 불가 |
| **보조 도구** | [`docs/tools/`](docs/tools/) - 4 cjs 스크립트 (특수문자 검사 · 링크 검사 · 표 wrap · 헤드리스 브라우저 검증) | `docs/common/` 과 함께 카피 |

## 문서 작성 정책 요약

본 레포의 모든 마크다운·HTML 본문은 **한글 + ASCII 구두점** 으로 작성합니다. em dash · en dash · `✅` · `★` · 원문자 등은 정적 검사에서 FAIL. 좁은 화이트리스트만 허용 (HTML 컴포넌트 그래픽 · 원문 식별자 · 수식). 자세한 규칙은 [`docs/common/dynamic-html-spec.md`](docs/common/dynamic-html-spec.md) 의 "본문 특수문자 사용 규칙" 절.

검증 도구:

```bash
node docs/tools/check-special-chars.cjs   # 특수문자 정책 검사
node docs/tools/check-doc-links.cjs       # md 링크 + 비-md 경로 stale 검사
node docs/tools/wrap-tables.cjs           # 표 .table-wrap 일괄 적용
node docs/tools/verify-html.cjs           # puppeteer 헤드리스 렌더 검증 (1280 / 768 / 375 viewport)
```

`docs/tools/verify-html.cjs` 사용 시 `cd docs/tools && npm install` 로 puppeteer-core 설치 필요. `node_modules/` 와 `verify-shots/` 는 gitignore.

## GitHub Pages 활성화 안내 (fork 한 사용자용)

본 저장소를 fork 한 뒤 자기 GitHub Pages 사이트에서 학습 페이지를 보려면:

1. fork 한 저장소의 **Settings** 탭 진입
2. 좌측 **Pages** 메뉴 선택
3. **Source** 를 `Deploy from a branch` 로 두고 Branch 를 `main` (또는 `master`), Folder 를 `/ (root)` 선택
4. **Save** 클릭 후 몇 분 기다리면 `https://<your-username>.github.io/<repo-name>/html/` 로 접속

`html/` 안 페이지는 모두 상대 경로로 작성돼 있어 fork 한 저장소에서도 그대로 동작합니다.

## 라이센스

Epic 원본 코드 (`Source/` · `Plugins/` · `Config/` 등) 는 Epic Games 의 라이라 라이센스를 따릅니다. 본 저장소의 분석·학습 문서 (`docs/` · `html/` · `CLAUDE.md`) 는 학습 / 참고 목적으로 자유롭게 사용 가능합니다.
