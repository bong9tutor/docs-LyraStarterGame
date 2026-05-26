# 분석·학습 다이나믹 HTML 문서 사양

> 결정일: 2026-05-23
> 갱신일: 2026-05-26 (학습 블록 표 4종에 `.table-wrap` 래퍼 의무화 — 본문 컬럼 760px 폭에서 5~6컬럼·긴 코드 식별자 셀이 페이지 전체 가로 스크롤을 만드는 문제 차단)
> 목적: Unreal Engine 프로젝트의 분석·학습 결과를 다이나믹 HTML 로 표현할 때 모든 작업이 같은 규칙을 따르도록 한다. 모든 UE 프로젝트 분석에 재사용 가능하며, 이 저장소의 라이라는 현재 등록된 사례.
> 적용 범위: 본 저장소의 다이나믹 HTML 산출물 (`dynamic-html/`). 마크다운 검증 원장 (`docs/project/*.md`) 자체에는 적용되지 않는다.

## 역할 분담 (가장 중요)

| 종류 | 위치 | 역할 |
|------|------|------|
| 마크다운 검증 원장 | `docs/project/*.md` | **사실의 단일 출처**. 노드 사전·전이 표·CDO 값 등 사전식 자료. |
| 다이나믹 HTML | `dynamic-html/` | **학습 동선 가이드**. 마크다운 원장의 사실을 학습자가 이해하기 쉬운 순서로 재배열한다 - 정보 형태에 맞춰 흐름·구조·결정·참조·비교·레시피·검증 블록을 조합한다. |

두 산출물은 **목적이 다르며 같은 정보를 반복하지 않는다**.

- HTML 에는 학습에 필요한 블록만 둔다 (흐름·구조·결정·참조·비교·레시피·검증). 노드 사전·전이 표 같은 마스터 사전은 HTML 에 두지 않고 마크다운 원장으로 안내한다.
- 사실이 갱신되면 마크다운 원장을 먼저 수정하고 HTML 본문을 수동으로 동기화한다 - 역방향 금지.

### "흐름" 용어 분리 (중요)

이 사양에서 "흐름" 은 두 가지로 갈린다.

| 용어 | 의미 | 적용 |
|------|------|------|
| **학습 동선** | 독자가 어떤 순서로 읽으면 이해가 쉬운지 정하는 문서 구성 원칙 | 모든 학습 페이지에 필요 |
| **런타임 흐름 (`flow-section`)** | 이벤트·상태 변화·조건·출력이 시간 순서나 인과 순서로 이어지는 실제 시스템 동작 | **일부 블록에만** - flow gate 통과 시에만 |

"학습 동선이 중요하다" 를 "모든 콘텐츠를 `흐름 N` + 단계 카드 + 화살표로 표현하라" 로 확장하지 않는다. `flow-section` 은 학습 블록 7종 중 하나의 선택지일 뿐이다.

## 핵심 결정

| 항목 | 결정 |
|------|------|
| 문서 골격 | 정적 HTML 파일 (`file://` 더블클릭으로 즉시 열림) |
| 본문 작성 | HTML 에 직접 - 인라인 JSON·데이터 외부화 없음 |
| 시각화 | 표·카드·CSS 만 |
| 자바스크립트 | Vanilla JS (다크모드 토글·nav 마커만) |
| 빌드 도구 | 없음 |
| CDN 의존 | 없음 |
| 외부 이미지 파일 | 추가하지 않음 |
| **레이아웃** | **3단 레이아웃** (데스크탑 ≥1280px): 좌측 사이트 사이드바 + 본문 (max-width 760px 유지) + 우측 페이지 내 TOC. 태블릿 (800-1279px) 은 사이드바 + 본문 2단. 모바일 (<800px) 은 본문 단일 컬럼 + 햄버거 drawer 사이드바. 사이드바·TOC·이전/다음 페이저는 `js/app.js` 가 페이지 메타데이터 기반으로 동적 생성. |
| **헤더** | **sticky** (모든 viewport). 좌측에 햄버거 토글 (모바일만 표시), 가운데 제목·검증일·홈 nav, 우측에 다크모드 토글 |
| **콘텐츠 정렬** | 가운데 정렬 - `max-width: 760px; margin: 0 auto;` |
| **모서리 처리** | **모든 박스 네모** (`border-radius: 0`). 배지·카드·다이얼로그 등 어떤 컴포넌트도 둥근 모서리 사용 안 함 |
| 주 대상 환경 | 모바일 우선 (데스크탑 호환) |

### 레이아웃 결정 — 단일 컬럼 → 3단 레이아웃 (2026-05-25 갱신)

초기 사양 (2026-05-23) 은 "검색·단축키 없이 흐름 5개만 다루는 단순 학습 문서" 라는 전제에서 Medium · Substack 풍 **단일 컬럼 + 본문 안 목차** 를 선택했다. 그러나 라이라 분석 페이지가 19개 (애니메이션 12 + UI 7) 로 증가하면서 이 전제가 무너졌다 — 페이지 간 이동이 잦아지고, 학습자가 "지금 어디 있고 다음에 어디로 가야 하는가" 를 본문 안 목차 한 칸만으로 잡기 어려워졌다.

따라서 결정을 갱신한다 — 데스크탑 (≥1280px) 은 언리얼 공식 문서 사이트 (`dev.epicgames.com/documentation`) · MDN · Stripe 등이 채택한 **3단 레이아웃** (사이트 사이드바 + 본문 + 페이지 TOC) 으로 가고, 모바일 (<800px) 은 햄버거 drawer 사이드바로 폴백한다. 본문 컬럼은 그대로 `max-width: 760px` 가운데 정렬을 유지해 가독성을 보존한다.

### 시각 디자인 영감 - Linear Docs

[linear.app/docs](https://linear.app/docs) 의 절제된 시각 톤을 일부 차용한다 (외부 폰트·강조 시그니처 컬러는 도입하지 않는다).

- **다크모드 색 토큰** - Pitch Black 풍의 깊은 배경(`#08090a`), Porcelain 풍 밝은 텍스트(`#f7f8f8`), 다층 보조 회색(`#8a8f98`, `#62666d`)
- **다크모드 강조색 절제** - 카드 좌측 막대(노드 종류 색)·배지 배경·accent 의 명도·채도를 라이트모드보다 한 단계 낮춰 본문 가독성을 우선. 라이트 토큰을 그대로 다크에 쓰면 어두운 배경에서 너무 형광스럽게 튄다.
- **letter-spacing** - 본문 `-0.011em`, 큰 헤딩 `-0.022em` 으로 살짝 좁혀 세련된 느낌
- **흐름 인덱스 카드 그리드** - 단일 ol 컬럼 대신 2~3열 카드 그리드 (`auto-fill, minmax(220px, 1fr)`). 모바일에서 1열로 자연 폴백
- **미묘한 보더** - 1px solid + 라이트/다크 모두 매우 옅은 톤. 시각적 잡음 최소
- **여백** - 카드·섹션 사이 간격 풍부

다만 모서리 처리는 Linear 와 다르게 가져온다 - Linear 는 6~10px 둥근 모서리지만 본 사이트는 **모든 박스를 네모 (border-radius 0)** 로 유지해 더 절제된·도큐먼트 같은 톤을 만든다.

Linear 의 라임 그린(`#e4f222`) 시그니처와 Inter/Berkeley Mono 폰트는 도입하지 않는다 - 외부 폰트 금지 원칙과 우리 flow node 종류별 색 (`--flow-state/alias/conduit`) 의 시각 다양성을 유지하기 위해.

## 결과물 폴더 구조

```text
<프로젝트 루트>/
├── CLAUDE.md                                  # Claude 작업 정책 + 정책 분류 인덱스
├── docs/                                      # 분석·학습 문서 — 2개 하위 폴더로 분리
│   ├── README.md                              # 마스터 인덱스
│   ├── common/                                # 컨텐츠 생성 정책 — 다른 UE 프로젝트 레포로 폴더 통째 카피
│   │   ├── analysis-tools.md                  # 도구 정책 (Monolith · 라이더 MCP)
│   │   ├── documentation-workflow.md          # 분석 5단계 작업 절차
│   │   └── dynamic-html-spec.md               # 본 사양
│   └── project/                               # 프로젝트 종속 — 컨텍스트 + 시스템별 검증 원장
│       ├── architecture-overview.md           # 시스템 아키텍처 산문
│       ├── project-verification.md            # 검증 표 + 환경·MCP 설정
│       ├── <system>-code-analysis.md          # 예: animation-code-analysis.md
│       ├── <system>-blueprint-analysis.md
│       ├── <system>-learning-section-plan.md
│       └── (선택) <system>-references.md
└── dynamic-html/                              # 다이나믹 HTML 학습 가이드
    ├── index.html                             # 진입점 — 시스템별 섹션으로 그룹화
    ├── pages/
    │   ├── <project>-<system>-...html         # 예: lyra-animation-overview.html, lyra-ui-overview.html
    │   └── ...
    ├── js/
    │   └── app.js                             # 다크모드·nav 마커 (전역 공통)
    └── css/
        └── style.css                          # 공통 스타일·다크모드 토큰·블록 7종·노트 4종
```

원칙:
- **`docs/` 는 2 하위 폴더 분리.** [`common/`](.) 는 프로젝트 무관 정책 — 다른 UE 프로젝트 레포로 `docs/common/` 폴더 통째 카피해 그대로 재사용. [`../project/`](../project/) 는 라이라 종속 — 컨텍스트 2 + 시스템별 검증 원장. 한 레포 = 한 프로젝트 원칙은 유지 (`project/` 안은 단일 프로젝트 전용).
- **시스템 = 디렉터리 아니라 파일명 접두어** (`<project>-<system>-<topic>.html`). `pages/` 안은 평면이고 분리는 파일명으로만 한다 — 시스템별 폴더는 만들지 않는다. 사용자가 `file://` 로 열 때 경로가 짧고 cross-link 가 단순해진다. 원장 (`docs/project/`) 도 파일명 접두어 규칙 (`<system>-<doctype>.md`) 을 따르되, 단일 프로젝트 레포라 파일명에 프로젝트 접두어는 두지 않는다.
- 자산 (CSS/JS) 은 전역 공통 1세트. 시스템별로 분기하지 않는다.

## 다중 시스템 구조

학습 페이지는 **시스템 단위로 그룹화** 한다. 시스템은 프로젝트의 큰 기능 축 (이 저장소의 라이라 경우: 애니메이션, CommonUI, GAS, Experience, Equipment, ...) 단위이고, 하나의 시스템 = 하나의 학습 트랙 = 하나의 검증 원장 묶음에 대응한다.

### 시스템 정의

| 항목 | 규칙 |
|------|------|
| 식별자 (slug) | `animation`, `ui`, `gas`, `experience` 등 영문 소문자 단어 (kebab 이 자연스러우면 OK — `game-features` 등) |
| 원장 위치 | `docs/project/<system>-` |
| HTML 페이지 접두어 | `dynamic-html/pages/<project>-<system>-` |
| 인덱스 섹션 | `dynamic-html/index.html` 의 한 `<section>` |
| 페이지 번호 | **시스템 내에서만 1부터 매김**. 글로벌 번호 금지 (시스템이 추가되면 충돌). |

### 인덱스 페이지 구조 (`dynamic-html/index.html`)

진입점은 시스템별 `<section>` 으로 분리하고, 각 섹션 안에 카드 그리드 (`.entry-list`) 를 둔다. 페이지 번호는 카드 제목 안 (`1. ...` — 마침표 + 공백, "본문 특수문자 사용 규칙" 의 번호 ↔ 제목 구분자 절 참조) 에만 적되, 그 번호는 **해당 시스템 안의 순서** 다.

다음 마크업은 일반 패턴이고, `href` 값은 이 저장소의 라이라 사례 (`<project>` = `lyra`) 다. 새 프로젝트는 같은 자리에 자기 프로젝트 접두어를 둔다 — `pages/<project>-<system>-overview.html`.

```html
<main class="content">
  <section>
    <h2>시스템 1 이름 (예: 애니메이션)</h2>
    <p class="muted">시스템 한 줄 설명 (선택)</p>
    <ul class="entry-list">
      <li><a href="pages/lyra-animation-overview.html"><!-- 예시: <project>=lyra -->
        <h3>1. ...</h3><p>...</p>
      </a></li>
      ...
    </ul>
  </section>

  <section>
    <h2>시스템 2 이름 (예: CommonUI)</h2>
    <ul class="entry-list">
      <li><a href="pages/lyra-ui-overview.html"><!-- 예시: <project>=lyra -->
        <h3>1. ...</h3><p>...</p>
      </a></li>
      ...
    </ul>
  </section>
</main>
```

원칙:
- 시스템이 1개일 때도 위 구조를 유지한다. 새 시스템이 추가될 때 구조 변경이 없다.
- 시스템 섹션 안에 페이지가 아직 없으면 `<p class="muted">(준비 중 — 검증 원장 작성 완료)</p>` 한 줄로 표시하고 카드 그리드는 비워둔다. 페이지가 생기면 그 줄을 카드 그리드로 대체.
- 시스템 순서는 **학습 우선순위** 에 따른다 (입문자가 먼저 읽을 시스템이 위). 알파벳 순서 같은 기계적 정렬 금지.

### 시스템별 overview 페이지 권장

각 시스템의 첫 페이지 (예: `<project>-<system>-overview.html`) 는 **그 시스템의 학습 지도** 역할을 한다. 다른 학습 페이지가 "선행 학습" 으로 참조할 수 있는 진입점.

- 파일명 패턴: `<project>-<system>-overview.html`
- 인덱스 카드 번호: `1`
- 블록 구성: 보통 structure + flow + comparison + reference (mixed, "학습 목차" 사용)
- chapter-brief 의 "선행 학습" 칸은 빈다 (또는 `(없음 — 이 페이지가 시작점)` 표기)

### 시스템 간 cross-link

학습은 보통 한 시스템 안에서 완결되지만, 다른 시스템과 맞물리는 사실이 있다면 다음 규칙을 따른다.

| 위치 | 시스템 간 링크 허용 여부 | 비고 |
|------|------------------------|------|
| `chapter-brief` 의 "선행 학습" | **다른 시스템의 overview 페이지만** 허용 | 깊은 페이지로 바로 보내면 학습 부담. overview 만 가리킨다. |
| `chapter-brief` 의 "보충 자료" | 외부 (Epic 등) 만 | 다른 시스템 페이지는 "선행 학습" 으로. |
| 본문 블록 안 | 인용으로만 OK | `<a href="<project>-<other>-...html">` 자유 사용. 단 본문 흐름이 그 페이지에 강하게 의존하면 "선행 학습" 으로 옮겨라. |
| 블록 안 `<code>` 식별자 | 텍스트로만 | 다른 시스템에 정의된 클래스·태그를 본문에서 인용할 때 링크 불필요. |

원장 (`docs/project/*.md`) 사이 cross-reference 는 자유다 — 검증 추적성 목적.

## HTML 페이지 표준 구조

```html
<body data-page-id="...">
  <header class="page-header">
    <div class="header-inner">
      <h1>페이지 제목</h1>
      <span class="verified-at">검증일: YYYY-MM-DD</span>
      <nav class="page-nav"><a href="...">← 홈</a></nav>
    </div>
    <div class="header-right">
      <button class="theme-toggle" type="button" aria-label="다크모드 전환">🌓</button>
    </div>
  </header>

  <main class="content">
    <!-- 페이지 상단 챕터 브리프 (모든 학습 페이지 필수) -->
    <aside class="chapter-brief" aria-label="챕터 브리프">
      <h2>챕터 브리프</h2>
      <div class="brief-grid">
        <section class="brief-block">
          <h3>이 챕터의 질문</h3>
          <ul>...</ul>
        </section>
        <section class="brief-block">
          <h3>먼저 알아둘 것</h3>
          <ul>...</ul>
        </section>
        <section class="brief-block">
          <h3>선행 학습</h3>
          <ul>...</ul>
        </section>
        <section class="brief-block">
          <h3>보충 자료</h3>
          <ul>...</ul>
        </section>
      </div>
    </aside>

    <!-- 학습 목차 카드 (메인 콘텐츠의 진입점) - 페이지 성격에 따라 목차명 분기 -->
    <!-- 항목 번호는 페이지 내 블록 순서 — 시스템 내 페이지 번호도, 글로벌 번호도 아니다 -->
    <!-- 번호 ↔ 제목 사이는 마침표(`.`) + 공백. `·` 는 제목 내 병렬 용도만 — "본문 특수문자 사용 규칙" 참조 -->
    <nav class="learn-index" aria-label="학습 목차">
      <h2>학습 목차</h2>
      <ol>
        <li><a href="#flow-...">1. 블록 제목</a></li>
        <li><a href="#structure-...">2. 블록 제목</a></li>
        ...
      </ol>
    </nav>

    <!-- (옵션) 학습 도입부 개념 박스 - 본문 이해에 전제가 되는 개념을 미리 노출 -->
    <section class="concept-box">...</section>

    <!-- 학습 블록 3~6개 (메인) - flow/structure/decision/reference/comparison/recipe/verification 중 정보 형태에 맞춰 선택 -->
    <section class="flow-section" id="flow-...">...</section>
    <section class="structure-section" id="structure-...">...</section>
    <section class="decision-section" id="decision-...">...</section>
    ...

    <!-- (옵션) 전체 학습 정리 - 페이지 끝 -->
    <section><h2>전체 학습 정리</h2>...</section>
  </main>

  <script src="../js/app.js"></script>
</body>
```

원칙:
- 한국어 본문, 영문 식별자
- `verified-at` 은 본문에 직접 적는다. **학습 페이지(`pages/*.html`)에만 적용**하며 진입점(`index.html`)은 사실 콘텐츠가 없는 페이지 목록 인덱스이므로 생략한다.
- `<main class="content">` 는 `max-width: 760px` + `margin: 0 auto` 로 가운데 정렬
- **좌측 사이트 사이드바** (`<aside class="sidebar" id="sidebar">`) — `js/app.js` 가 페이지 메타데이터 기반으로 시스템·페이지 트리 동적 생성. 현재 페이지는 `aria-current="page"` 로 강조. 모바일에서는 햄버거 drawer.
- **우측 페이지 TOC** (`<aside class="page-toc" id="page-toc">`) — `js/app.js` 가 본문 학습 블록 헤더 (`section > .block-head h2` · `.flow-head h2` · `.learn-index > h2`) 를 추출해 동적 생성 + scrollspy 로 현재 보이는 블록 강조. 태블릿 이하에서는 숨김 (본문 안 `.learn-index` 가 대체).
- **이전 / 다음 페이저** (`<nav class="page-pager">`) — `js/app.js` 가 같은 시스템 내 순서로 본문 끝에 자동 삽입.
- 헤더는 sticky — 좌측 햄버거 (모바일) + 가운데 제목·검증일·홈 nav + 우측 다크모드 토글.
- 모달 다이얼로그·backdrop 같은 무거운 인터랙션은 두지 않음. 모바일 햄버거의 backdrop 만 예외.

### 목차명 분기

페이지의 학습 블록 구성에 맞춰 `.learn-index` 의 헤더 텍스트와 `aria-label` 을 분기한다.

| 페이지 성격 | 목차명 | 사용 예 |
|-------------|--------|---------|
| 모든 블록이 런타임/인과 흐름 | **흐름 목차** | `locomotion-sm`, `runtime-state`, `actions-montage`, `aiming-additives` |
| flow/structure/decision/reference/comparison/recipe/verification 가 섞인 혼합 | **학습 목차** | `overview`, `base-abp`, `linked-layers`, `selection-rules`, `warping-ik`, `effects-tests-recipes` |
| 사전식 자료 중심 (현재 없음, 향후 도입 시) | **항목 목차** | (예정) |

### 반응형 break-point

| 폭 | 동작 |
|----|------|
| ≥ 800px | 데스크탑 - 콘텐츠 가운데 정렬, 좌우에 넓은 여백 |
| 480 ~ 799px | 모바일 - 콘텐츠 padding 축소, 헤더 압축, `verified-at` 숨김 |
| < 480px | 작은 모바일 - 더 압축, `page-nav` 숨김 |

모든 인터랙션은 터치·클릭으로 동작한다. 키보드 단축키는 두지 않는다.

## 학습 블록 (메인 콘텐츠)

페이지의 메인 콘텐츠는 **3~6개 학습 블록** 이다. 학습자가 위→아래로 한 번 읽으면 시스템 동작과 구조가 자연스럽게 머릿속에 그려져야 한다.

블록의 표현 방식은 **정보 형태에 따라 선택** 한다. `flow-section` 은 기본값이 아니라 7종 중 하나의 선택지다 - **흐름이 아닌 정보를 흐름 카드로 만들지 말 것.**

### 학습 블록 7종

| 종류 | 컴포넌트 | 사용 조건 (정보 형태) |
|------|----------|----------------------|
| 흐름 | `.flow-section` + `.flow-steps` | 런타임/인과 순서 - 이벤트 → 조건 → 상태 변화 → 출력이 시간 순서로 이어진다 |
| 구조 | `.structure-section` + `.structure-grid` | 클래스·에셋·layer 의 책임·소유·포함 관계 |
| 결정 | `.decision-section` + `.decision-table` | 입력 조건에 따라 결과가 선택되는 규칙 (우선순위 표·rule table·의사코드) |
| 참조 | `.reference-section` + `.ref-list` 또는 `.reference-table` | 함수 목록·변수 목록·CDO 값·slot 이름·sequence set 같은 사전식 자료 |
| 비교 | `.comparison-section` + `.comparison-table` | 무기별·Manny/Quinn 별·layer 별 차이 비교 |
| 레시피 | `.recipe-section` + `.checklist` | 작성자가 수행할 작업 절차 |
| 검증 | `.verification-section` + `.verification-table` | 테스트 입력·기대 결과·검증 대상·자동화 여부 |

### flow gate - `flow-section` 사용 결정 질문

`flow-section` 을 쓰기 전에 다음 5문에 답한다.

1. 각 단계가 실제 시간 순서 또는 원인-결과 순서로 이어지는가?
2. 이전 단계가 끝나야 다음 단계가 발생하는가?
3. 화살표가 단순한 읽기 순서가 아니라 실제 transition·call·event·dependency 를 뜻하는가?
4. 조건 배지가 실제 guard/branch 조건인가?
5. 화살표를 제거하면 의미가 손상되는가?

**3문 이상 "아니오" 면 `flow-section` 을 쓰지 않는다.** 대신 위 표의 다른 6종 중 정보 형태에 맞는 블록을 선택한다 - 단순 목록은 `reference-section`, variant 비교는 `comparison-section`, 작업 절차는 `recipe-section`, 테스트 케이스는 `verification-section`, 선택 규칙은 `decision-section`, 책임 관계는 `structure-section` 으로.

### flow-section (런타임 흐름)

흐름의 기본 단위는 **"단계 카드"** + **"화살표 + 조건"** 의 교차 반복.

```html
<section class="flow-section" id="flow-...">
  <header class="flow-head">
    <span class="flow-num">흐름 N</span>
    <h2>시나리오 제목</h2>
    <p class="flow-desc">이 흐름이 언제 발생하고 학습 가치가 무엇인지 한두 문장.</p>
  </header>

  <ol class="flow-steps">
    <li class="step" data-type="state" data-validation="verified">
      <div class="step-head">
        <strong class="step-name">노드 이름</strong>
        <span class="badge badge-verified">✓</span>
        <span class="step-kind">State</span>
      </div>
      <p class="step-desc">한 줄 설명.</p>
      <p class="step-meta">실행: <code>FullBody_IdleState</code></p>
    </li>

    <li class="step-arrow">
      <span class="arrow">↓</span>
      <div class="step-conds">
        <code>HasVelocity</code>
        <code>NOT GameplayTag_IsMelee</code>
      </div>
      <p class="cond-desc">전이 조건과 그 의미 한 줄.</p>
    </li>

    <li class="step" ...>...</li>
  </ol>

  <div class="flow-note">  <!-- 옵션 -->
    <strong>분기:</strong> ...
  </div>
</section>
```

원칙:
- flow gate 5문에 3문 이상 "예" 일 때만 사용.
- 흐름 안 단계는 **시간 순 / 원인-결과 순**으로 정렬.
- 같은 노드가 여러 흐름에 등장해도 흐름마다 다시 작성한다.
- 본문 위 `.learn-index` 카드에서 흐름 섹션 앵커로 점프 가능.

### structure-section (구조·소유 관계)

클래스·에셋·ABP·layer 의 책임 분리와 소유 관계를 보여줄 때 사용. 화살표가 아니라 **계층·그리드 카드** 로 표현.

```html
<section class="structure-section" id="structure-...">
  <header class="block-head">
    <span class="block-kind">구조</span>
    <h2>블록 제목</h2>
    <p class="block-desc">이 구조가 어떤 책임 분리를 보여주는지 한두 문장.</p>
  </header>

  <div class="structure-grid">
    <article class="struct-node" data-role="parent">
      <h3>ABP_ItemAnimLayersBase</h3>
      <p>공통 부모 - 인터페이스 구현·기본 그래프.</p>
      <ul class="struct-meta">
        <li>상속: AnimInstance</li>
        <li>구현: ALI_ItemAnimLayers (14 함수)</li>
      </ul>
    </article>
    <article class="struct-node" data-role="child">
      <h3>ABP_RifleAnimLayers</h3>
      <p>무기별 override.</p>
    </article>
    ...
  </div>
</section>
```

원칙: 화살표 시퀀스를 쓰지 말 것. 단계 카드(`flow-steps`) 대신 그리드 카드.

### decision-section (결정 규칙)

입력 조건에 따라 결과가 선택되는 규칙을 보여줄 때. **우선순위 표·rule table·의사코드** 로 표현.

```html
<section class="decision-section" id="decision-...">
  <header class="block-head">
    <span class="block-kind">결정</span>
    <h2>SelectBestLayer 규칙</h2>
    <p class="block-desc">cosmetic 태그 우선순위에 따라 layer class 가 선택된다.</p>
  </header>

  <div class="table-wrap">
    <table class="decision-table">
      <thead>
        <tr><th>우선순위</th><th>조건 (RequiredTags)</th><th>결과 (Layer Class)</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td><code>Cosmetic.Feminine</code></td><td><code>ABP_RifleAnimLayers_Feminine</code></td></tr>
        <tr><td>2</td><td>(없음)</td><td><code>ABP_RifleAnimLayers</code> (default)</td></tr>
      </tbody>
    </table>
  </div>
</section>
```

원칙: 단계 카드를 쓰지 말 것. 조건·결과 매핑은 표 한 장이 가장 명료.

### reference-section (사전식 자료)

함수·변수·CDO 값·slot 이름 같은 **사전식 자료** 를 한눈에 노출할 때.

```html
<section class="reference-section" id="reference-...">
  <header class="block-head">
    <span class="block-kind">참조</span>
    <h2>블록 제목</h2>
    <p class="block-desc">한두 문장 설명.</p>
  </header>

  <!-- 짧은 항목은 ref-list 그리드 -->
  <ul class="ref-list">
    <li><code>FullBody_IdleState</code> <span class="muted">Idle 진입점</span></li>
    <li><code>FullBody_CycleState</code> <span class="muted">이동 사이클</span></li>
    ...
  </ul>

  <!-- 긴 항목·여러 컬럼은 reference-table -->
  <div class="table-wrap">
    <table class="reference-table">...</table>
  </div>
</section>
```

원칙: 흐름 카드 안에 넣지 말 것. 별도 reference 블록으로 분리.

### comparison-section (variant 비교)

무기별·Manny/Quinn 별·layer 별 차이를 비교할 때.

```html
<section class="comparison-section" id="comparison-...">
  <header class="block-head">
    <span class="block-kind">비교</span>
    <h2>무기별 layer 차이</h2>
  </header>

  <div class="table-wrap">
    <table class="comparison-table">
      <thead>
        <tr><th>무기</th><th>parent</th><th>override 함수</th><th>default sequence set</th></tr>
      </thead>
      <tbody>
        <tr><td>Rifle</td><td>ABP_ItemAnimLayersBase</td><td>4</td><td>Rifle_DefaultAnims</td></tr>
        ...
      </tbody>
    </table>
  </div>
</section>
```

### recipe-section (작업 절차)

작성자가 수행할 작업 절차. **체크리스트** 로 표현하여 실행 항목과 런타임 흐름을 시각적으로 분리.

```html
<section class="recipe-section" id="recipe-...">
  <header class="block-head">
    <span class="block-kind">레시피</span>
    <h2>새 무기 layer 추가</h2>
  </header>

  <ol class="checklist">
    <li>
      <span class="check-mark">□</span>
      <div class="check-body">
        <strong>1. ABP 생성</strong>
        <p><code>ABP_ItemAnimLayersBase</code> 상속 ABP 를 새 무기 폴더에 만든다.</p>
      </div>
    </li>
    ...
  </ol>
</section>
```

원칙: 화살표·조건 배지를 쓰지 말 것 - 작업 절차는 런타임 인과가 아니라 작성자 action item.

### verification-section (테스트 매트릭스)

테스트 입력·기대 결과·검증 대상·자동화 여부를 표로 정리.

```html
<section class="verification-section" id="verification-...">
  <header class="block-head">
    <span class="block-kind">검증</span>
    <h2>ShooterTests 매트릭스</h2>
  </header>

  <div class="table-wrap">
    <table class="verification-table">
      <thead>
        <tr><th>테스트</th><th>입력</th><th>기대 결과</th><th>검증 대상</th><th>자동화</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><code>InputCrouchAnimationTest</code></td>
          <td>Crouch 입력</td>
          <td>Crouch 애니메이션 재생</td>
          <td>FullBody_CycleState</td>
          <td>✓</td>
        </tr>
        ...
      </tbody>
    </table>
  </div>
</section>
```

### 표 마크업 표준 (모든 표 공통)

학습 블록 4종 (`decision-section` · `comparison-section` · `reference-section` · `verification-section`) 이 사용하는 `<table>` 은 **반드시 `.table-wrap` 으로 감싼다**. 본문 컬럼은 `max-width: 760px` 인데 표는 5~6컬럼·긴 Unreal 경로·GameplayTag·C++ 식별자 셀을 자주 가져 가로 폭이 컬럼을 넘는다 — 래퍼 없이 두면 표 자체가 본문 → 레이아웃 → `body` 방향으로 넓어져 페이지 전체에 가로 스크롤이 생기고 3단 레이아웃 정렬이 깨진다.

**표준 마크업:**

```html
<div class="table-wrap">
  <table class="reference-table">
    ...
  </table>
</div>
```

**원칙:**

- `.table-wrap` 이 **수평 overflow 의 유일한 소유자** 다. 표가 넓어지면 래퍼 내부에서만 스크롤이 생기고, 페이지 전체 레이아웃에는 영향이 없다.
- 기존 `.decision-table` / `.comparison-table` / `.verification-table` / `.reference-table` class 는 그대로 둔다. 래퍼는 추가 계층일 뿐 표 클래스를 대체하지 않는다.
- 표 셀과 셀 안 `<code>` 는 `overflow-wrap: anywhere` 로 긴 토큰만 줄바꿈한다. 산문 본문에는 적용되지 않으므로 한글/영문 가독성에 영향 없다.
- `word-break: break-all` 을 전역 적용하지 않는다 — 한국어 산문 가독성이 심하게 떨어진다.
- `body` · `html` 에 `overflow-x: hidden` 으로 깨짐을 숨기지 않는다 — 내용이 잘릴 뿐 근본 해결이 아니다.
- `.content` 의 `max-width` 를 키우는 방식 (760px → 900px 등) 은 보조책일 뿐이고 모바일·5~6컬럼 표 문제는 그대로 남는다.

**본문 inline `<code>` 도 같은 줄바꿈 정책:**

긴 Unreal 경로·GameplayTag·C++ 식별자 (예: `UUIExtensionSubsystem::RegisterExtensionAsWidgetForContext` · `Ability.ActivateFail.ActivationGroup`) 가 본문 문장 안 `<code>` 로 들어가면 표 셀과 같은 이유로 모바일 (375px) 폭을 넘는다. 표 셀 `<code>` 에만 `overflow-wrap: anywhere` 를 적용하면 본문은 여전히 깨진다 — 전역 `code` 셀렉터에 같은 규칙을 적용한다. (`word-break: break-all` 은 한글 산문 가독성을 해치므로 사용 금지, `overflow-wrap: anywhere` 만 사용.)

**Grid column 의 `minmax(0, 1fr)` 통일 규칙:**

`.layout` 의 본문 column 은 모든 break-point 에서 `minmax(0, 1fr)` 를 써야 한다. 그냥 `1fr` 만 쓰면 grid item 의 default `min-width: auto` 가 자식의 intrinsic min-content (예: `table { min-width: 640px }`) 를 column 으로 전파해 viewport 보다 column 자체가 넓어진다. 3단·2단 레이아웃과 모바일 단일 컬럼 모두 동일 규칙 적용.

**표 폭 설계 가이드 (콘텐츠 단계):**

CSS 만으로 해결하지 말아야 하는 표도 있다. 작성 단계에서 다음 기준으로 미리 분기한다.

| 조건 | 권장 표현 |
|------|-----------|
| 4컬럼 이하, 짧은 값 중심 | 일반 표 + 래퍼 |
| 5~6컬럼, 코드/경로 값 중심 | 표 + 래퍼 + 로컬 수평 스크롤 허용 |
| 6컬럼 이상, 설명문이 긴 셀 다수 | 표를 2개로 분리하거나 `reference-section` 의 `.ref-list` 카드로 전환 |
| 단순 key/value 사전 | 2컬럼 표 또는 `.ref-list` 로 전환 |

**검증 (브라우저 콘솔):**

페이지를 열고 다음을 확인한다. `true` 가 아니면 어떤 표가 본문을 밀어내고 있다 — 그 표의 컬럼 수·셀 콘텐츠를 위 가이드대로 재설계한다.

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

단, `.table-wrap` 내부의 `scrollWidth > clientWidth` (즉, 래퍼 내부 가로 스크롤) 는 정상이다.

### 챕터 브리프 - `.chapter-brief`

학습자가 본문에 진입하기 전, **본문을 읽기 위한 준비 정보**를 압축해서 보여주는 박스. 모든 학습 페이지의 메인 콘텐츠 첫 항목 (학습 목차 카드 바로 앞) 에 둔다. 단순 외부 링크 목록이 아니다.

**`page-refs` 라는 이름은 더 이상 사용하지 않는다.** "참고 자료" 라는 표현이 학습 브리프의 역할을 단순 링크 목록으로 축소시키기 때문이다. 모든 학습 페이지는 `chapter-brief` 마크업으로 통일한다.

**표준 4칸 구성:**

| 칸 | 필수 여부 | 내용 |
|----|-----------|------|
| 이 챕터의 질문 | 필수 | 페이지가 답하는 핵심 질문 2~3개 (의문문 또는 문제 형태) |
| 먼저 알아둘 것 | 필수 | 본문 이해에 필요한 도메인 지식·전제 2~4개 |
| 선행 학습 | 조건부 | 먼저 읽으면 좋은 **내부 학습 페이지** 링크 (독립 페이지면 생략) |
| 보충 자료 | 조건부 | Epic 공식 문서 또는 외부 학습 자료 |

**마크업 표준:**

```html
<aside class="chapter-brief" aria-label="챕터 브리프">
  <h2>챕터 브리프</h2>
  <div class="brief-grid">
    <section class="brief-block">
      <h3>이 챕터의 질문</h3>
      <ul>
        <li>왜 이 캐릭터는 특정 무기 layer 를 선택하는가?</li>
        <li>선택된 layer 는 base ABP 와 어떻게 연결되는가?</li>
      </ul>
    </section>
    <section class="brief-block">
      <h3>먼저 알아둘 것</h3>
      <ul>
        <li><code>ABP_Mannequin_Base</code> 는 상태를 결정한다.</li>
        <li><code>ALI_ItemAnimLayers</code> 는 base 와 layer 사이의 14함수 계약이다.</li>
      </ul>
    </section>
    <section class="brief-block">
      <h3>선행 학습</h3>
      <ul>
        <li><a href="lyra-animation-runtime-state.html">런타임 상태 입력</a> — 본 페이지의 ABP 변수가 어디서 오는지 알아야 layer 가 그 변수를 어떻게 받는지 보인다</li>
        <li><a href="lyra-animation-base-abp.html">ABP_Mannequin_Base pose graph</a> — 본 페이지의 14함수가 base AnimGraph 의 어디서 호출되는지 알아야 한다</li>
      </ul>
    </section>
    <section class="brief-block">
      <h3>보충 자료</h3>
      <ul>
        <li><a href="https://dev.epicgames.com/..." target="_blank" rel="noopener">Animation Blueprint Linking</a></li>
      </ul>
    </section>
  </div>
</aside>
```

**원칙:**
- 모든 학습 페이지 (`pages/*.html`) 에 둔다. 진입점 (`index.html`) 은 학습 페이지가 아니므로 생략.
- 항목은 **짧아야 한다**. 장문 설명은 본문 학습 블록으로 내려보낸다.
- "이 챕터의 질문" 은 의문문/문제 형태로 쓴다. 본문 요약이 아니라 독자가 답을 찾으러 가는 단서.
- "먼저 알아둘 것" 은 이 페이지 안에서 **반복 설명하지 않을 전제** 만 둔다.
- "선행 학습" 은 **내부 학습 페이지 링크만** - 검증 원장·정책 문서·README 같은 내부 문서는 노출 금지.
- "선행 학습" **항목마다 "왜 선행인가" 한 줄 이유** 를 링크 뒤에 em dash (`—`) 로 붙여 적는다. 이유 없이 페이지 링크만 나열하지 않는다. 이유는 "본 페이지의 어떤 사실/개념이 그 선행 페이지의 어떤 사실/개념에 의존하는가" 를 한 문장으로 풀어 적는다. 정당성을 한 줄로 못 적는 prerequisite 은 해당 페이지의 선행 학습이 아니므로 **제거** 한다.
- "보충 자료" 는 외부 공식/학습 자료만 - URL 은 `docs/project/<system>-references.md` 와 일치시킨다. 외부 링크는 `target="_blank"` + `rel="noopener"` 보안 속성.
- 박스에서 본문 내용을 요약하지 않는다 - 본문을 읽기 위해 필요한 준비만.
- 색상은 중립 배경. `flow-*` 색 사용 금지 (아래 색상 정책 참조).

### `concept-box` 와 `chapter-brief` 의 역할 분리

기존 `concept-box` 는 페이지 상단의 용어 카드였으나 `chapter-brief` 의 "먼저 알아둘 것" 칸과 역할이 겹친다.

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `chapter-brief` | 페이지 최상단 | 학습 준비, 핵심 질문, 선행 학습, 도메인 전제 |
| `concept-box` | 필요한 섹션 바로 앞 | 해당 섹션을 이해하기 위한 짧은 용어 카드 |

대부분의 페이지는 `concept-box` 를 제거하고 `chapter-brief` 로 흡수한다. 개념 카드가 꼭 필요하면 특정 학습 블록 직전으로 이동.

### 종류·검증 등급 시각 규약

| type | 단계 카드 좌측 인디케이터 | CSS 토큰 |
|------|---------------------------|---------|
| `state` | 실선 두꺼운 막대 | `--flow-state` |
| `alias` | 점선 막대 | `--flow-alias` |
| `conduit` | 실선 막대 + ◆ 미니 아이콘 | `--flow-conduit` |

검증 등급 배지:

| 등급 | CSS 클래스 | 의미 |
|------|-----------|------|
| ✓ 검증 | `.badge-verified` | Monolith 또는 C++ 직접 확인 |
| ◐ 부분 검증 | `.badge-partial` | 공식 문서 + 간접 단서 |
| △ 미검증 | `.badge-unverified` | 학습 후보, 에디터 확인 필요 |

세 글리프 모두 폰트 글자 형태로, 배지의 `color` 토큰(`--badge-*-fg`)을 따라간다 - 이모지(`✅` 등)는 OS 자체 색을 가져 배지 fg 와 어긋나므로 사용하지 않는다.

### 색상 의미 체계 (중요)

**색은 장식이 아니라 의미다.** 같은 색은 같은 의미를 가져야 하고, 다른 의미를 같은 색으로 표현하지 않는다.

#### 토큰 분류

| 토큰 그룹 | 사용처 | 다른 컴포넌트 재사용 |
|-----------|--------|----------------------|
| `--flow-state` · `--flow-alias` · `--flow-conduit` | `.flow-section .step[data-type=...]` 의 좌측 막대만 | **금지** - concept card, struct-node, checklist, note 박스에서 사용 금지 |
| `--badge-verified-*` · `--badge-partial-*` · `--badge-unverified-*` | 검증 등급 배지(`.badge-*`) 만 | **금지** - 일반 정보 박스 색으로 사용 금지 |
| `--accent` | 링크·강조 호버·상단 박스 좌측 얇은 막대 | OK (브랜드 색) |
| `--border` · `--fg-muted` · `--fg-tertiary` | 중립 정보 박스 | OK (중립) |
| `--warning` · `--danger` · `--info` · `--debug` | Note 박스 4종 (아래 참조) | 의미에 맞게만 |

**기존 `--node-*` 토큰은 `--flow-*` 로 이름 변경한다.** 이름이 "어디에 쓰는가" 를 알려주므로 다른 컴포넌트가 빌려 쓰는 실수를 줄인다.

#### 컴포넌트별 색 사용 규칙

| 컴포넌트 | 색 사용 | 금지 |
|----------|---------|------|
| `chapter-brief` | 중립 배경 + `--accent` 얇은 좌측선 | flow-* 색 사용 금지 |
| `brief-block` | 4칸 모두 중립. 제목만 `--fg-muted` | 칸마다 다른 색 남용 금지 |
| `flow-section .step` | `--flow-state` / `--flow-alias` / `--flow-conduit` | 외부 컴포넌트가 이 토큰 재사용 금지 |
| `badge-*` | 검증 등급 토큰만 | 의미 강조용으로 badge 색 사용 금지 |
| `concept-box` · `concept-card` | 중립 배경 + 중립 좌측선. 강조는 텍스트 라벨로 | `flow-*` 색 사용 금지 |
| `structure-section .struct-node` | 중립 카드. `data-role` 은 텍스트 라벨로 표현 | parent/child 를 flow 색으로 표시 금지 |
| `decision-section .decision-table` | 중립 표 | 조건별 색칠 남용 금지 |
| `recipe-section .checklist` | 중립 체크리스트 | 항목마다 파란 좌측선 반복 금지. 위험 단계만 `--warning` |
| `verification-section .verification-table` | 결과 상태에만 badge 사용 | 표 전체에 검증 색 배경 사용 금지 |
| Note 박스 | 타입별 색 (아래 참조) | 모든 노트를 conduit 주황으로 고정 금지 |

### Note 박스 4종

이전 `.flow-note` 가 분기·설계 의도·주의·읽는 법·확장 등 모든 노트에 conduit 주황색을 일률 사용해 의미 구분이 안 됐다. 4종으로 분리한다.

| 클래스 (마크업) | 색 | 용도 |
|----------------|----|------|
| `class="note note-info"` (CSS: `.note-info`) | 중립/파랑 (`--info`) | 보충 설명, 본문 이해를 돕는 부가 정보 |
| `class="note note-design"` (CSS: `.note-design`) | 중립 + 텍스트 라벨 | 설계 의도·왜 이렇게 만들었는지 |
| `class="note note-warning"` (CSS: `.note-warning`) | 주황 (`--warning`) | 실수하기 쉬운 부분·주의 |
| `class="note note-debug"` (CSS: `.note-debug`) | 청록 (`--debug`) | 디버깅 팁·트러블슈팅 단서 |

> 두 클래스 (`note` + `note-<kind>`) 를 같은 요소에 함께 둔다 (`<div class="note note-info">`). CSS 셀렉터는 `.note-info` 단일 클래스 — 자손 셀렉터 (`.note .note-info`) 가 아니다.

마크업:

```html
<div class="note note-info">
  <strong>읽는 법:</strong> ...
</div>
<div class="note note-design">
  <strong>설계 의도:</strong> ...
</div>
<div class="note note-warning">
  <strong>주의:</strong> ...
</div>
<div class="note note-debug">
  <strong>디버깅:</strong> ...
</div>
```

기존 `.flow-note` 는 **`flow-section` 내부의 분기 설명 전용** 으로 축소한다. 다른 노트는 위 4종 중 하나를 선택.

### 본문 특수문자 사용 규칙

본문에서 **의미를 전달하는 특수문자는 한글로 풀어 쓴다**. 이모지·기호로 의미를 줄여 쓰면 한국어 본문 가독성이 떨어지고 화면낭독·검색·번역 도구에서 의미가 사라진다.

#### 사용 가능한 글리프 (정의된 위치만)

| 글리프 | 사용 위치 | 의미 |
|--------|-----------|------|
| `✓` `◐` `△` | `.badge-verified` / `.badge-partial` / `.badge-unverified` 안 + 본문 텍스트의 검증 등급 표기 | 검증 등급 (예: "GA 21 ✓ · GE 36 ✓" 같은 인벤토리) |
| `↓` | `.flow-steps .step-arrow .arrow` 안 | 흐름 진행 방향 |
| `↑` | (정의된 경우만, 예: 위로 가는 흐름) | 역방향 진행 |
| `→` `←` | 본문 흐름 화살표 (예: `Ability → Montage → Slot`, 페이지 nav `← 홈`) | 단방향 진행·관계 |
| `↔` | 본문 양방향 매핑 (예: `tag ↔ 자산`, `source ↔ target`) | 양방향 대응·매핑 |
| `◆` | `.step[data-type="conduit"] .step-name::before` (CSS `content`) | conduit 노드 미니 아이콘 |
| `□` | `.recipe-section .checklist .check-mark` 안 | 체크리스트 마크 (컴포넌트 그래픽) |
| `🌓` | `.theme-toggle` 버튼 자체 | 다크모드 토글 컴포넌트 그래픽 (예외 — 이모지지만 컴포넌트 정체성) |
| `☰` | `.menu-toggle` 버튼 자체 | 햄버거 메뉴 컴포넌트 그래픽 (모바일 drawer 토글) |
| `≥` `≤` `×` `Σ` `∑` | 본문 수식 (예: `Health ≤ 0`, `Σ(weight) / N`) | 수학 기호 — 의미 전달 명확하면 허용. `×N` 의 "개수 표기" 용도만 금지 (아래 표 참조). |

위에 정의되지 않은 이모지 (`✅`·`❌`·`⚠️`·`①`~`⑨` 같은 enclosed 숫자·`★`·임의 그림 글리프) 는 본문·배지·카드 어디에도 사용하지 않는다. OS 의존 색이 사이트 다크 토큰과 어긋나거나 의미 전달이 흐려진다.

**대체 규칙 (일반 문자 우선):**

금지 글리프를 만나면 **(1) 일반 문자 (한글 텍스트)** 가 1순위 — 의미가 가장 명확하고 화면낭독·검색·번역 도구에서도 살아남는다. (2) 사양 정의 특수문자 (`✓` 등) 는 차순위 — 시각적 일관성이 필요할 때만. (3) HTML 구조 (`<strong>`·`note-warning` 박스·CSS 라벨) 는 강조 의도가 있는 경우.

| 금지 글리프 | 1순위 — 일반 문자 (한글) | 2순위 — 사양 정의 글리프 | 3순위 — HTML 구조 |
|------------|------------------------|----------------------|------------------|
| `✅` | `완료` · `성공` · `확인` 같은 한글 텍스트 | `✓` (검증 등급 의미일 때만) | — |
| `❌` | `실패` · `불가` · `금지` | `△` (검증 미완료 의미일 때만) | `note-warning` 박스 |
| `⚠️` | `주의` · `경고` 한글 텍스트 | — | `note-warning` 박스 (강한 강조) |
| `①` `②` ... `⑨` | `1.` `2.` ... + 공백 (마침표 separator) | — | 카드 자체로 시각 분리 또는 `<span class="struct-num">1</span>` CSS 라벨 |
| `★` | `핵심` · `중요` · `우선` 한글 텍스트 | — | `<strong>` 또는 `note-info` 박스 |
| `❗` `‼` `‽` | `중요` · `주의` 한글 텍스트 | — | `note-warning` 박스 |
| 임의 이모지 (😀·🔥·💡 등) | 의미 그대로의 한글 명사·동사 | — | 의미 분류에 맞는 note 박스 |

**원칙:**

- 한글 텍스트가 가능하면 무조건 1순위. 글리프는 의미를 압축하지만 한국어 본문 톤과 어긋난다.
- `✓`·`◐`·`△` 처럼 사양에 정의된 글리프도 "본문 인벤토리" (예: "GA 21 ✓ · GE 36 ✓") 같은 시각 압축이 필요할 때만 쓰고, 산문 안에서는 한글 ("21개 검증 완료") 이 자연스럽다.
- HTML 구조 (note 박스·`<strong>`·CSS 라벨) 는 강조 의도가 명확한 곳만. 일반 문장에 남용 금지.

#### 본문에서 한글로 풀어 쓰는 기호

| 금지 표기 | 대신 |
|-----------|------|
| `§13`, `§14` | `섹션 13`, `섹션 14` |
| `§1–§12` | `섹션 1–12` 또는 `섹션 1~12` |
| `¶` | `단락` |
| `※` | `주의` 또는 `참고` |
| `† ‡` (각주 마커) | 본문 텍스트로 풀어 쓴다 |
| `×N` (개수 표기) | `N개` (예: `Slot ×5` → `Slot 5개`, `flow ×3~5` → `flow 3~5개`, `note-design ×N` → `note-design N개`) |
| `✅` `❌` `⚠️` (의미 이모지) | `완료` · `실패` · `주의` 한글 텍스트 (위 "대체 규칙" 표 참조 — 사양 정의 글리프나 HTML 구조도 옵션) |
| `★` `❗` `‼` (강조 글리프) | `핵심` · `중요` · `우선` 한글 텍스트 또는 `<strong>` 태그 |
| `①` `②` ... `⑨` (enclosed 숫자) | `1.` `2.` ... 마침표 + 공백 (번호 표기) |
| 임의 emoji 로 의미 대체 | 명사·동사 한글 표기 우선, 시각 압축이 꼭 필요하면 사양 정의 글리프나 HTML 구조 |

#### 허용되는 타이포그래피 separator

타이포그래피적 관습으로 사용된 다음 기호는 의미 대체가 아니므로 그대로 둔다.

| 기호 | 용도 | 사용하지 않는 곳 |
|------|------|-----------------|
| `·` (가운뎃점) | 한국어 병렬 ("A 와 B" 의미). 제목·헤딩 안에서 자유롭게 사용 | **번호 ↔ 제목 사이 구분자** (아래 참고) |
| `—` `–` (em·en dash) | 부연 설명·범위 | — |
| `…` (ellipsis) | 생략 | — |
| `→` `←` | 흐름·관계 화살표 (위 "사용 가능한 글리프" 표 참조) | — |
| `↔` | 양방향 매핑 (위 표 참조) | — |

#### 번호 ↔ 제목 구분자는 `.` (마침표) 하나로 통일

목록·카드·learn-index 의 항목 텍스트에서 **번호와 제목 사이 구분자는 마침표 (`.`) + 공백** 한 가지로 통일한다. 같은 줄 안에서 같은 기호 (`·`) 가 두 역할 (번호 구분자 + 제목 내 병렬) 을 동시에 하면 가독성·의미 일관성이 떨어진다.

| 위치 | 잘못된 표기 | 올바른 표기 |
|------|------------|-------------|
| 진입점 카드 (`.entry-list h3`) | `6 · 장비 · cosmetic 기반 선택 규칙` | `6. 장비 · cosmetic 기반 선택 규칙` |
| 학습 목차 (`.learn-index ol li a`) | `1 · 다섯 계층과 책임 분리` | `1. 다섯 계층과 책임 분리` |
| 흐름 목차의 항목 | `3 · Jump · Fall → 지상 복귀` | `3. Jump · Fall → 지상 복귀` |

이 규칙에서 `·` 는 **제목 안 병렬 의미만** 갖는다 — 번호와의 경계 역할은 마침표가 맡는다.

### 검증 등급 처리 규칙

- **HTML 배지는 마크다운 검증 원장의 등급보다 높은 값을 표시할 수 없다.** 원장이 `partial` 인 사실을 HTML 에서 `verified` 로 승격하지 않는다. 반대 방향(원장 `verified` → HTML `partial`) 은 보수적 표기이므로 허용.
- **본문 표현도 등급에 맞춘다.** `partial` 항목은 "적용한다" 같은 확정형이 아니라 "적용 지점으로 추정", "에디터 확인 필요" 같은 보수 표현을 사용한다.
- **등급 변경 순서**: 원장(`docs/project/<system>-*-analysis.md`) → 사양·계획 문서 → HTML 페이지 순. 역방향 금지.
- **새 사실 추가 금지**: 원장에 없는 사실을 HTML 에 새로 정의하지 않는다. 추가가 필요하면 원장을 먼저 갱신한 뒤 HTML 에 옮긴다.

## HTML 전역 컴포넌트

학습 페이지에 두는 컴포넌트는 다음 한 가지로 한정. (제목의 "HTML 전역" 은 분석 대상 시스템의 UI 명칭과의 용어 충돌을 피하기 위한 것 — 이 저장소의 라이라 경우 CommonUI 시스템 (`ui`) — 여기서 다루는 컴포넌트는 HTML 사이트 자체의 UI 다.)

### 다크모드 토글

- 헤더의 `.theme-toggle` 버튼 (`🌓`)
- 클릭 시 `<html>` 에 `.dark` 클래스 추가/제거
- 선호는 `localStorage` 에 저장. 초기값은 OS `prefers-color-scheme`

## 사용하지 않는 컴포넌트

- ❌ **사이드바 검색** — 페이지 19개 규모에서는 사이드바 트리 한 번에 다 보임. 검색은 페이지 100개 이상일 때 도입 검토.
- ❌ **키보드 단축키** — 모바일 우선이라 단축키 학습 부담을 강요하지 않음.
- ❌ **모달 다이얼로그 (`<dialog>`)**
- ❌ **헤더 도움말 버튼**
- ❌ **툴팁 (`data-tooltip`)**
- ❌ 노드 상세 다이얼로그
- ❌ 노드 사전 카드 그리드·전이 표 부록
- ❌ 인라인 JSON
- ❌ 검증 등급·종류·그룹 필터
- ❌ 그래프 라이브러리
- ❌ 레이아웃 드롭다운
- ❌ 토스트 노티피케이션
- ❌ 사이드 detail-panel

## 메타 콘텐츠 최소화 원칙

학습 페이지에는 **학습 본문과 직접 연결된 콘텐츠만** 둔다. 다음은 학습 동선을 끊으므로 학습 페이지(`dynamic-html/pages/*.html`)·진입점(`dynamic-html/index.html`)에 두지 않는다.

- ❌ **사이트 자체 소개** ("이 사이트는 무엇인가" 류) - 헤더 제목으로 자명
- ❌ **페이지 사용법 안내** ("이 페이지를 읽는 법" 류) - 단계 카드의 좌측 색 막대·종류 라벨로 자명
- ❌ **시각 규약 본문 설명** ("검증 등급의 의미" 류) - 배지 시각 (`✓` 녹 / `◐` 황 / `△` 회) 만으로 자명
- ❌ **외부 자료 위치 안내** ("사실 사전이 필요할 때" 류) - 외부 학습 자료가 필요하면 페이지 상단 챕터 브리프(`.chapter-brief`) 의 "보충 자료" 칸에 두고, 검증 원장 같은 내부 문서는 학습 페이지에 노출하지 않는다

이런 메타 정보는 본 사양 문서, `docs/README.md`, `docs/project/<system>-references.md` 에 두고 **HTML 학습 페이지에서는 반복하지 않는다**. 학습자가 처음 페이지에 들어왔을 때 메타 안내를 거치지 않고 곧장 학습 본문 (학습 목차 → 필요한 학습 블록) 으로 들어가는 동선을 우선한다.

## 금지 사항

- ❌ 별도 이미지 파일 (`.png`, `.jpg`, `.gif`, 외부 `.svg`)
- ❌ Mermaid·Cytoscape·D3 등 외부 시각화 라이브러리
- ❌ MkDocs / Docusaurus / Astro 등 빌드 도구
- ❌ `package.json` / `node_modules` / CDN 로드
- ❌ `fetch()` 로 별도 데이터 파일 로드
- ❌ 인라인 JSON `<script type="application/json">`
- ❌ 무거운 SPA 프레임워크
- ❌ 마크다운 원장에 없는 사실을 HTML 에서 새로 정의 - 원장 먼저 갱신
- ❌ 마크다운 원장의 사실 사전·전체 노드 목록·전이 표를 HTML 에 반복
- ❌ 호버 기반 UI (툴팁·hover-only) - 모바일에서 잘 동작 안 함
- ❌ **`flow-section` 남용** - 인터페이스 함수 목록·CDO 값·variant 비교·작업 절차·테스트 케이스를 `flow-section` 으로 만들지 말 것. 학습 블록 7종에서 정보 형태에 맞는 종류를 선택한다.
- ❌ **모든 페이지가 같은 개수의 `flow-section` 으로 채워지는 균일성** - 정책 포맷이 콘텐츠 판단을 압도한 신호. 페이지마다 정보 형태에 맞춰 블록 구성이 달라져야 정상.
- ❌ **`.table-wrap` 없이 본문에 직접 둔 `<table>`** - 5~6컬럼 표·긴 코드 식별자 셀이 페이지 전체 가로 스크롤을 만든다. "표 마크업 표준" 절 참고.
- ❌ **레이아웃 깨짐 대응으로 `body { overflow-x: hidden }` / 전역 `word-break: break-all` / 표 폰트 극단 축소** - 증상을 숨기거나 가독성을 망가뜨릴 뿐 근본 해결이 아니다. 표 래퍼 + 셀 줄바꿈 + 컬럼 분할로 해결.

예외가 필요하면 본 사양을 먼저 수정한 뒤 반영한다.

## 확장 절차

확장은 두 종류로 나뉜다. **새 시스템 추가** 는 한 번만 일어나는 골격 변경이고, **기존 시스템에 새 페이지 추가** 는 자주 일어나는 일상 작업이다.

### A. 새 시스템 추가 (예: GAS · Experience · Equipment 신규)

골격을 만드는 단계. 한 시스템당 한 번만 수행한다.

1. **시스템 식별자 결정** — `<system>` slug 를 정한다 (예: `gas`, `experience`, `equipment`). 영문 소문자 단어, 필요 시 하이픈.
2. **검증 원장 작성** — 다음 마크다운 문서를 `docs/project/` 에 둔다.
   - `docs/project/<system>-code-analysis.md` (필수)
   - `docs/project/<system>-blueprint-analysis.md` (블루프린트/CDO 가 있는 시스템이면 필수)
   - `docs/project/<system>-learning-section-plan.md` (HTML 페이지를 만들 계획이면 필수)
   - `docs/project/<system>-references.md` (선택 — 공식 문서 링크가 많을 때)
3. **`docs/README.md` 에 시스템 섹션 추가** — 공통 정책 / 시스템별 그룹 구조 안에 새 시스템 표를 추가.
4. **`dynamic-html/index.html` 에 시스템 섹션 추가** — 새 `<section>` 을 시스템 학습 우선순위 위치에 삽입. 페이지가 없으면 `<p class="muted">(준비 중)</p>`.
5. (이 시점에 시스템 골격 완성 — 페이지는 B 절차로 하나씩 추가)

### B. 기존 시스템에 새 페이지 추가 (일상 작업)

1. **원장 사실 확보** — 페이지가 인용할 사실이 모두 검증 원장 (`docs/project/<system>-*.md`) 에 있는지 확인. 없으면 **원장을 먼저 갱신**하고 그것을 인용. HTML 에서 새 사실을 정의하지 않는다.
2. **정보 형태 분류** — 각 학습 블록이 어떤 종류인지 결정한다 (flow / structure / decision / reference / comparison / recipe / verification).
3. **flow gate 통과 확인** — `flow-section` 으로 표현하려는 블록은 5문에 3문 이상 "예" 답이 가능해야 한다. 아니면 다른 블록 종류로 변경한다.
4. **페이지 파일 작성** — `dynamic-html/pages/<project>-<system>-<topic>.html` 을 본 사양의 "HTML 페이지 표준 구조" + "학습 블록 7종" + **"표 마크업 표준"** 에 따라 작성. 본문 안 학습 목차 (또는 흐름·항목 목차) 카드 + 학습 블록 3~6개. 첫 페이지 (시스템 입문) 라면 파일명을 `<project>-<system>-overview.html` 로 둔다. 표 4종 (decision/comparison/reference/verification) 은 작성 시점에 직접 `<div class="table-wrap">` 으로 감싸거나, 작성 후 `node tools/wrap-tables.cjs` 로 일괄 보정한다 (idempotent — 이미 래핑된 표는 skip).
5. **`dynamic-html/index.html` 의 해당 시스템 `<section>` 에 카드 등록** — 페이지 번호는 시스템 내 순서. 새 페이지가 흐름상 중간에 들어가면 뒤 카드의 번호도 함께 갱신한다.
6. **시스템 간 cross-link 추가** (해당 시 only) — 다른 시스템의 overview 페이지를 chapter-brief 의 "선행 학습" 으로 등록할 만하면 추가. 다른 시스템 깊은 페이지로의 직접 링크는 본문 블록 안에서만.
7. 본 사양 또는 `docs/README.md` 에 변경 필요가 있으면 함께 갱신한다.
8. **정적 검사** 를 수행한다 (아래 "배포 전 체크리스트" 참조). 통과하지 못한 페이지는 배포·커밋하지 않는다.

## 배포 전 체크리스트

새 페이지를 추가하거나 기존 페이지를 갱신한 뒤 다음을 모두 확인한다. 한 항목이라도 실패하면 원인을 해결한 뒤 다시 검사한다.

- **내부 링크** - 모든 로컬 `href` 가 존재하는 파일을 가리키는가. `pages/` 안의 cross-link 도 표준 파일명(`<project>-<system>-...html`) 인가.
- **외부 링크 보안 속성** - 모든 외부 `<a>` 가 `target="_blank"` + `rel="noopener"` 를 함께 가지는가.
- **검증 등급 일관성** - 페이지의 `data-validation` 과 배지 글리프(✓/◐/△) 가 마크다운 원장의 등급보다 높지 않은가. 본문 표현이 등급에 맞는가.
- **표준 구조** - 학습 페이지(`pages/*.html`)는 `verified-at`(헤더), `chapter-brief` (4칸), `learn-index`(또는 흐름·항목 목차), **학습 블록 3~6개**(flow 만이 아니어도 됨) 를 모두 갖는가. 진입점(`index.html`)은 `verified-at`·`chapter-brief` 생략.
- **표 래퍼 의무화** - 모든 `<table class="...">` (decision/comparison/reference/verification) 의 직속 부모가 `<div class="table-wrap">` 인가. 래퍼 없이 본문에 직접 둔 표가 한 개라도 있으면 배포 불가. 정적 검사 — `pages/*.html` 의 `<table` 직전 줄이 모두 `class="table-wrap"` 을 포함하는지 확인 (idempotent 한 일괄 래핑은 `tools/wrap-tables.cjs` 로 가능).
- **뷰포트 가로 overflow 없음** - 데스크탑 (1280px) · 태블릿 (768px) · 모바일 (375px) 세 뷰포트에서 페이지 전체에 가로 스크롤이 생기지 않는가. 브라우저 콘솔에서 `document.documentElement.scrollWidth <= document.documentElement.clientWidth` 가 `true` 인가. `.table-wrap` 내부 로컬 가로 스크롤은 허용 (`true` 판정과 무관). 표가 본문을 밀어내면 컬럼 수·셀 콘텐츠를 사양의 "표 폭 설계 가이드" 대로 재설계한다.
- **chapter-brief 4칸 완성** - "이 챕터의 질문" 과 "먼저 알아둘 것" 은 필수, "선행 학습" 과 "보충 자료" 는 페이지 성격에 맞게. `page-refs` 마크업이 남아 있지 않은가.
- **flow gate 통과** - 모든 `flow-section` 이 위 5문에 3문 이상 "예" 답이 가능한가. 단순 목록·variant 비교·작업 절차·테스트 케이스가 `flow-section` 으로 잘못 표현돼 있지 않은가.
- **블록 종류 적합성** - 인터페이스/CDO/slot 같은 사전식 자료는 `reference-section`, variant 차이는 `comparison-section`, 작업 절차는 `recipe-section`, 테스트 매트릭스는 `verification-section`, 선택 규칙은 `decision-section`, 책임 관계는 `structure-section` 으로 분리됐는가.
- **목차명 적합성** - 페이지 학습 블록 구성에 맞는 목차명(흐름 목차 / 학습 목차 / 항목 목차) 을 사용했는가.
- **색 의미 체계 준수** - `--flow-*` 토큰이 `.flow-section .step` 외에서 사용되지 않는가. concept-box·struct-node·checklist 가 flow 색을 빌려 쓰지 않는가.
- **Note 박스 분리** - `flow-note` 가 `flow-section` 내부 분기 설명에만 쓰였는가. 다른 노트는 `note-info` / `note-design` / `note-warning` / `note-debug` 중 의미에 맞게 사용했는가.
- **특수문자 사용** - `§`·`¶`·`※`·`×N` 같은 의미 전달 기호가 본문에 남아 있지 않은가. 검증 배지·흐름 화살표·conduit 미니 아이콘은 정의된 위치에만 사용했는가.
- **번호 ↔ 제목 구분자** - 목록 항목 (`.entry-list h3`, `.learn-index ol li a` 등) 의 번호와 제목 사이가 **마침표 (`.`) + 공백** 인가. `·` 가 번호 구분자로 쓰여 같은 줄에서 제목 내 병렬과 충돌하지 않는가.
- **메타 콘텐츠 없음** - "이 사이트는 무엇인가", "이 페이지를 읽는 법", "사실 사전이 필요할 때" 류가 추가되지 않았는가.
- **금지 요소 없음** - 외부 CDN/이미지, `fetch()`, 인라인 JSON `<script type="application/json">`, `<dialog>`, `data-tooltip`, 키보드 단축키, 사이드바 검색 등이 사양 위반으로 들어가지 않았는가. (sticky 헤더·fixed 사이드바·모바일 햄버거 drawer 는 본 사양의 표준 — 금지 대상 아님.)
- **chapter-brief 규칙** - "선행 학습" 에 검증 원장·정책 문서 링크가 들어가지 않았는가. "보충 자료" 가 외부 학습 자료만 노출하는가. 시스템 간 cross-link 는 "선행 학습" 칸의 다른 시스템 **overview 페이지만** 허용한다.
- **선행 학습 정당성** - "선행 학습" 항목마다 em dash (`—`) 와 함께 "왜 선행인가" 한 줄 이유가 붙어 있는가. 이유 없이 페이지 링크만 있는 항목은 없는가. 본 페이지 콘텐츠와 직접 의존이 없는 prerequisite (예: 큰 그림만 보여주는 overview 가 디테일 페이지의 prereq 로 들어감) 은 제거됐는가.
- **새 사실 없음** - HTML 에 마크다운 원장에 없는 사실이 새로 등장하지 않았는가.
- **다중 시스템 인덱스 구조** - `dynamic-html/index.html` 이 시스템별 `<section>` 으로 그룹화되어 있는가. 페이지 번호는 시스템 내 순서이고 글로벌 번호가 아닌가. 파일명이 `<project>-<system>-<topic>.html` 패턴인가.

## 의도적으로 정의하지 않은 것

- 페이지 내 섹션 순서 (소개·흐름 인덱스·흐름·정리 등의 정확한 순서)
- 다크모드 토글의 화면상 위치
- 흐름의 분할 기준 (몇 개로 나눌지는 학습 설계 판단)
- 흐름 섹션 사이 nav 링크의 유무 ("↑ 위로", "다음 흐름" 등)
