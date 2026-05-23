# Lyra 분석·학습 — 다이나믹 HTML 문서 사양

> 결정일: 2026-05-23
> 갱신일: 2026-05-23 (단일 컬럼·헤더 static·본문 인덱스 카드 — Medium 류 패턴 채용)
> 목적: 라이라 분석·학습 결과를 다이나믹 HTML 로 표현할 때 모든 작업이 같은 규칙을 따르도록 한다.
> 적용 범위: 본 저장소의 다이나믹 HTML 산출물 (`dynamic-html/`). 마크다운 검증 원장 (`docs/lyra-*.md`) 자체에는 적용되지 않는다.

## 역할 분담 (가장 중요)

| 종류 | 위치 | 역할 |
|------|------|------|
| 마크다운 검증 원장 | `docs/lyra-*.md` | **사실의 단일 출처**. 노드 사전·전이 표·CDO 값 등 사전식 자료. |
| 다이나믹 HTML | `dynamic-html/` | **학습 흐름 가이드**. 마크다운 원장의 사실을 시나리오별로 재배열해서 위→아래 학습 동선을 만든다. |

두 산출물은 **목적이 다르며 같은 정보를 반복하지 않는다**.

- HTML 에는 학습에 필요한 흐름과 단계만 둔다. 노드 사전·전이 표 같은 사실 사전은 HTML 에 두지 않고 마크다운 원장으로 안내한다.
- 사실이 갱신되면 마크다운 원장을 먼저 수정하고 HTML 의 흐름 본문을 수동으로 동기화한다 — 역방향 금지.

## 핵심 결정

| 항목 | 결정 |
|------|------|
| 문서 골격 | 정적 HTML 파일 (`file://` 더블클릭으로 즉시 열림) |
| 본문 작성 | HTML 에 직접 — 인라인 JSON·데이터 외부화 없음 |
| 시각화 | 표·카드·CSS 만 |
| 자바스크립트 | Vanilla JS (다크모드 토글·nav 마커만) |
| 빌드 도구 | 없음 |
| CDN 의존 | 없음 |
| 외부 이미지 파일 | 추가하지 않음 |
| **레이아웃** | **단일 컬럼** — 사이드바·햄버거·drawer 없음. 흐름 목차는 본문 안 인덱스 카드 |
| **헤더** | **static** (sticky 아님). 스크롤 다운 시 자연스럽게 사라져 모바일 화면 면적 최대 |
| **콘텐츠 정렬** | 가운데 정렬 — `max-width: 760px; margin: 0 auto;` |
| **모서리 처리** | **모든 박스 네모** (`border-radius: 0`). 배지·카드·다이얼로그 등 어떤 컴포넌트도 둥근 모서리 사용 안 함 |
| 주 대상 환경 | 모바일 우선 (데스크탑 호환) |

### 모바일 패턴 조사 요약

개발 문서 사이트 다수(MDN·Stripe·Tailwind·GitHub Docs 등)는 모바일에서 **sticky 헤더 + 햄버거 drawer** 패턴을 쓴다. 다만 본 사이트는 검색·단축키 없이 흐름 5개만 다루는 단순 학습 문서이고 사이드바 항목도 5줄에 불과하다. 이 규모에서는 **Medium · Substack · 일반 학습 블로그 글이 채용하는 단일 컬럼 + 본문 안 목차 패턴**이 더 어울린다 — 햄버거 토글 인터랙션이 사라지고 모바일 화면 면적이 더 확보된다.

### 시각 디자인 영감 — Linear Docs

[linear.app/docs](https://linear.app/docs) 의 절제된 시각 톤을 일부 차용한다 (외부 폰트·강조 시그니처 컬러는 도입하지 않는다).

- **다크모드 색 토큰** — Pitch Black 풍의 깊은 배경(`#08090a`), Porcelain 풍 밝은 텍스트(`#f7f8f8`), 다층 보조 회색(`#8a8f98`, `#62666d`)
- **다크모드 강조색 절제** — 카드 좌측 막대(노드 종류 색)·배지 배경·accent 의 명도·채도를 라이트모드보다 한 단계 낮춰 본문 가독성을 우선. 라이트 토큰을 그대로 다크에 쓰면 어두운 배경에서 너무 형광스럽게 튄다.
- **letter-spacing** — 본문 `-0.011em`, 큰 헤딩 `-0.022em` 으로 살짝 좁혀 세련된 느낌
- **흐름 인덱스 카드 그리드** — 단일 ol 컬럼 대신 2~3열 카드 그리드 (`auto-fill, minmax(220px, 1fr)`). 모바일에서 1열로 자연 폴백
- **미묘한 보더** — 1px solid + 라이트/다크 모두 매우 옅은 톤. 시각적 잡음 최소
- **여백** — 카드·섹션 사이 간격 풍부

다만 모서리 처리는 Linear 와 다르게 가져온다 — Linear 는 6~10px 둥근 모서리지만 본 사이트는 **모든 박스를 네모 (border-radius 0)** 로 유지해 더 절제된·도큐먼트 같은 톤을 만든다.

Linear 의 라임 그린(`#e4f222`) 시그니처와 Inter/Berkeley Mono 폰트는 도입하지 않는다 — 외부 폰트 금지 원칙과 우리 노드 종류별 색 (`--node-state/alias/conduit`) 의 시각 다양성을 유지하기 위해.

## 결과물 폴더 구조

```text
LyraStarterGame/
├── docs/                            # 마크다운 검증 원장 (사실의 단일 출처)
└── dynamic-html/                    # 다이나믹 HTML 학습 가이드
    ├── index.html                   # 진입점
    ├── pages/
    │   └── <system>-...html         # 시스템별 흐름 학습 페이지
    ├── js/
    │   └── app.js                   # 다크모드·nav 마커 (전역 공통)
    └── css/
        └── style.css                # 공통 스타일·다크모드 토큰·흐름 섹션
```

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
    <!-- 페이지 상단 참고 자료 박스 (필수에 가까운 옵션) -->
    <aside class="page-refs" aria-label="참고 자료">
      <h2>이 페이지의 참고 자료</h2>
      <ul>...</ul>
    </aside>

    <!-- 흐름 목차 카드 (메인 콘텐츠의 진입점) -->
    <nav class="flow-index" aria-label="흐름 목차">
      <h2>흐름 목차</h2>
      <ol>
        <li><a href="#flow-...">1 · 시나리오 제목</a></li>
        <li><a href="#flow-...">2 · 시나리오 제목</a></li>
        ...
      </ol>
    </nav>

    <!-- (옵션) 학습 도입부 개념 박스 — 본문 이해에 전제가 되는 개념을 미리 노출 -->
    <section class="concept-box">...</section>

    <!-- 학습 흐름 섹션들 (메인) -->
    <section class="flow-section" id="flow-...">...</section>
    ...

    <!-- (옵션) 전체 학습 정리 — 페이지 끝 -->
    <section><h2>전체 학습 정리</h2>...</section>
  </main>

  <script src="../js/app.js"></script>
</body>
```

원칙:
- 한국어 본문, 영문 식별자
- `verified-at` 은 본문에 직접 적는다
- `<main class="content">` 는 `max-width: 760px` + `margin: 0 auto` 로 가운데 정렬
- **사이드바·햄버거·backdrop·다이얼로그 없음**. 흐름 목차는 본문 안 `.flow-index` 카드로
- 헤더는 static — 콘텐츠와 함께 스크롤됨

### 반응형 break-point

| 폭 | 동작 |
|----|------|
| ≥ 800px | 데스크탑 — 콘텐츠 가운데 정렬, 좌우에 넓은 여백 |
| 480 ~ 799px | 모바일 — 콘텐츠 padding 축소, 헤더 압축, `verified-at` 숨김 |
| < 480px | 작은 모바일 — 더 압축, `page-nav` 숨김 |

모든 인터랙션은 터치·클릭으로 동작한다. 키보드 단축키는 두지 않는다.

## 학습 흐름 시각화 (메인 콘텐츠)

**페이지의 메인 콘텐츠는 시나리오별 흐름 섹션**이다. 학습자가 위→아래로 한 번 읽으면 시스템 동작이 자연스럽게 머릿속에 그려져야 한다.

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
- 페이지에 흐름 섹션 3~6개. 각각 독립적으로 이해 가능해야 한다.
- 흐름 안 단계는 **시간 순 / 원인-결과 순**으로 정렬.
- 흐름 본문은 **HTML 로 직접 작성**.
- 본문 위 `.flow-index` 카드에서 흐름 섹션 앵커로 점프 가능.
- 같은 노드가 여러 흐름에 등장해도 흐름마다 다시 작성한다.

### 참고 자료 박스 — `.page-refs`

학습자가 흐름 본문에 진입하기 전, 외부 공식 자료와 검증 원장의 위치를 미리 파악할 수 있도록 **메인 콘텐츠의 첫 항목**(흐름 목차 카드 바로 앞)에 참고 자료 박스를 둔다.

**사용 조건:**
- (A) **페이지 상단 한 번** (`.page-refs`) — 모든 흐름이 같은 자료를 참조하는 경우. **권장.**
- (B) 흐름 헤더마다 `.flow-refs` (미래용) — 흐름마다 자료가 다른 경우. 현재 사양에 마크업은 정의 안 됨. 도입 필요 시 본 사양을 먼저 갱신.
- 둘 다 사용은 시각 잡음을 키우므로 한 가지만 선택.

**마크업 표준:**

```html
<aside class="page-refs" aria-label="참고 자료">
  <h2>이 페이지의 참고 자료</h2>
  <ul>
    <li>
      <a href="<공식 문서 URL>" target="_blank" rel="noopener">제목</a>
      <span class="muted">— 한 줄 설명 (어떤 내용을 다루는지)</span>
    </li>
    <li>
      <code>docs/lyra-&lt;system&gt;.md</code> 의 <em>&lt;절명&gt;</em>
      <span class="muted">— 본 페이지 사실의 단일 출처 (마크다운 검증 원장)</span>
    </li>
  </ul>
</aside>
```

**원칙:**
- 항목은 **3~5개**. 더 많으면 시각 잡음.
- 형식은 **링크 + " — 한 줄 설명"** 으로 통일.
- 외부 링크는 `target="_blank"` + `rel="noopener"` 보안 속성.
- **학습에 직접 도움되는 외부 자료만** 둔다 — Epic 공식 문서, 외부 튜토리얼·해설처럼 학습자가 더 깊이 학습할 수 있는 자료.
- **다음은 두지 않는다**:
  - ❌ 사양·정책 문서 (`docs/lyra-dynamic-html-spec.md` 등) — 작성자 정책이지 학습자 콘텐츠 아님
  - ❌ 마크다운 검증 원장 (`docs/lyra-*-analysis.md` 등) — 분석 작성 시 내부 사실 출처. 학습자에게 노출 안 함
  - ❌ README·인덱스 — 메타 문서
- 외부 자료 URL 은 `docs/lyra-*-references.md` (참고 자료 모음 마크다운) 와 일치시킨다 — 새 URL 추가 시 마크다운 원장도 함께 갱신.
- 박스 내용은 학습 본문과 중복되지 않게 — 박스는 "어디서 더 볼 수 있는가" 의 안내이지, 본문 요약이 아니다.

### 종류·검증 등급 시각 규약

| type | 단계 카드 좌측 인디케이터 |
|------|---------------------------|
| `state` | 실선 두꺼운 막대 |
| `alias` | 점선 막대 |
| `conduit` | 실선 막대 + ◆ 미니 아이콘 |

검증 등급 배지:

| 등급 | CSS 클래스 | 의미 |
|------|-----------|------|
| ✓ 검증 | `.badge-verified` | Monolith 또는 C++ 직접 확인 |
| ◐ 부분 검증 | `.badge-partial` | 공식 문서 + 간접 단서 |
| △ 미검증 | `.badge-unverified` | 학습 후보, 에디터 확인 필요 |

세 글리프 모두 폰트 글자 형태로, 배지의 `color` 토큰(`--badge-*-fg`)을 따라간다 — 이모지(`✅` 등)는 OS 자체 색을 가져 배지 fg 와 어긋나므로 사용하지 않는다.

## UI 컴포넌트 (전역)

학습 페이지에 두는 컴포넌트는 다음 한 가지로 한정.

### 다크모드 토글

- 헤더의 `.theme-toggle` 버튼 (`🌓`)
- 클릭 시 `<html>` 에 `.dark` 클래스 추가/제거
- 선호는 `localStorage` 에 저장. 초기값은 OS `prefers-color-scheme`

## 사용하지 않는 컴포넌트

- ❌ **좌측 사이드바** — 단일 컬럼. 흐름 목차는 본문 안 `.flow-index` 카드에 통합
- ❌ **햄버거 메뉴 / drawer / backdrop** — 사이드바가 없으므로 토글도 없음
- ❌ **sticky 헤더** — `static`. 스크롤하면 함께 위로 사라짐
- ❌ **사이드바 검색**
- ❌ **키보드 단축키**
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

- ❌ **사이트 자체 소개** ("이 사이트는 무엇인가" 류) — 헤더 제목으로 자명
- ❌ **페이지 사용법 안내** ("이 페이지를 읽는 법" 류) — 단계 카드의 좌측 색 막대·종류 라벨로 자명
- ❌ **시각 규약 본문 설명** ("검증 등급의 의미" 류) — 배지 시각 (`✓` 녹 / `◐` 황 / `△` 회) 만으로 자명
- ❌ **외부 자료 위치 안내** ("사실 사전이 필요할 때" 류) — 페이지 상단 참고 자료 박스(`.page-refs`)에 검증 원장 항목이 이미 포함

이런 메타 정보는 본 사양 문서, `docs/README.md`, `docs/lyra-*-references.md` 에 두고 **HTML 학습 페이지에서는 반복하지 않는다**. 학습자가 처음 페이지에 들어왔을 때 메타 안내를 거치지 않고 곧장 학습 본문(흐름 목차 → 개념 박스 → 흐름)으로 들어가는 동선을 우선한다.

## 금지 사항

- ❌ 별도 이미지 파일 (`.png`, `.jpg`, `.gif`, 외부 `.svg`)
- ❌ Mermaid·Cytoscape·D3 등 외부 시각화 라이브러리
- ❌ MkDocs / Docusaurus / Astro 등 빌드 도구
- ❌ `package.json` / `node_modules` / CDN 로드
- ❌ `fetch()` 로 별도 데이터 파일 로드
- ❌ 인라인 JSON `<script type="application/json">`
- ❌ 무거운 SPA 프레임워크
- ❌ 마크다운 원장에 없는 사실을 HTML 에서 새로 정의 — 원장 먼저 갱신
- ❌ 마크다운 원장의 사실 사전·전체 노드 목록·전이 표를 HTML 에 반복
- ❌ 호버 기반 UI (툴팁·hover-only) — 모바일에서 잘 동작 안 함
- ❌ 고정 위치 요소 (sticky 헤더·fixed 사이드바·overlay drawer) — 모바일 화면 면적을 줄이고 학습 흐름을 방해

예외가 필요하면 본 사양을 먼저 수정한 뒤 반영한다.

## 확장 절차 — 새 시스템 분석 추가

1. `docs/lyra-<system>-*.md` 에 마크다운 검증 원장을 먼저 작성한다.
2. 학습 흐름 페이지 `dynamic-html/pages/<system>-....html` 을 본 사양의 "HTML 페이지 표준 구조" + "학습 흐름 시각화" 표준에 따라 작성한다 — 본문 안 흐름 인덱스 카드 + 흐름 섹션들.
3. `dynamic-html/index.html` 의 "공개된 학습 페이지" 섹션에 페이지를 등록한다.
4. 본 사양 또는 `docs/README.md` 에 변경 필요가 있으면 함께 갱신한다.

## 의도적으로 정의하지 않은 것

- 페이지 내 섹션 순서 (소개·흐름 인덱스·흐름·정리 등의 정확한 순서)
- 다크모드 토글의 화면상 위치
- 흐름의 분할 기준 (몇 개로 나눌지는 학습 설계 판단)
- 흐름 섹션 사이 nav 링크의 유무 ("↑ 위로", "다음 흐름" 등)
