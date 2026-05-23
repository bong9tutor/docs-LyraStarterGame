# Lyra 분석·학습 — 다이나믹 HTML 문서 사양

> 결정일: 2026-05-23
> 목적: 라이라 분석·학습 결과를 다이나믹 HTML 로 표현할 때 모든 작업이 동일한 규칙을 따르도록 한다.
> 적용 범위: 본 저장소의 모든 다이나믹 HTML 산출물. 마크다운 검증 원장(`docs/lyra-*.md`) 자체에는 적용되지 않는다.

## 핵심 결정

라이라 다이나믹 HTML 문서는 다음 조합으로만 제작한다.

| 항목 | 결정 | 거부한 대안 |
|------|------|--------------|
| 문서 골격 | 단일 또는 소수의 정적 HTML 파일 (페이지 단위 분할) | MkDocs / Docusaurus / Astro 등 마크다운 SSG |
| 시각화 라이브러리 | Cytoscape.js (+ dagre 레이아웃), D3.js (필요 시) | Mermaid 코드 블록, PlantUML |
| 빌드 도구 | **없음** — CDN 라이브러리 로드, 더블클릭 또는 로컬 HTTP 서버로 즉시 열림 | Vite / webpack / esbuild 등 번들러 |
| 시각화 자산 | 모두 JS 로 인-브라우저 렌더 (SVG / Canvas) | 외부 이미지 파일 (`.png`, `.jpg`, 외부 `.svg`) |
| 자바스크립트 프레임워크 | Vanilla JS (필요하면 Alpine.js 정도의 가벼운 헬퍼) | React / Vue / Svelte SPA |
| 데이터 입력 | JSON 외부화 (`data/*.json`) | 페이지 본문 안에 시각화 데이터 하드코딩 |

### 결정 근거

- 마크다운 → 정적 사이트 변환 사이클을 거치지 않고, 인터랙티브 HTML 을 직접 작성한다.
- 라이라 시각화 대상(예: LocomotionSM 27 transition + 5 alias + 2 conduit)은 정적 SVG 1장으로 충분히 표현되지 않는다. 클릭·필터·검색·검증 등급 토글이 학습에 필수다.
- 빌드 환경 의존을 없애 어떤 머신에서도 결과물을 바로 확인할 수 있게 한다.
- 외부 이미지 파일은 라이라 버전 변경 시 재캡처 부담이 크고, 분석 결과의 단일 출처(`docs/lyra-*.md`)와 어긋날 위험이 있다.

## 결과물 폴더 구조

다이나믹 HTML 산출물은 저장소 루트의 `dynamic-html/` 폴더에 둔다. `docs/` 의 마크다운 검증 원장과는 분리한다.

```text
LyraStarterGame/
├── docs/                            # 마크다운 검증 원장 (사실의 단일 출처)
│   ├── lyra-animation-blueprint-analysis.md
│   ├── lyra-animation-code-analysis.md
│   ├── lyra-dynamic-html-spec.md    # ← 이 문서
│   └── ...
└── dynamic-html/                    # 다이나믹 HTML 산출물
    ├── index.html                   # 진입점 (사이드바·검색·라우팅)
    ├── pages/                       # 시스템별 학습 페이지
    │   ├── overview.html
    │   ├── runtime-state.html
    │   ├── locomotion-sm.html
    │   ├── linked-layers.html
    │   └── ...
    ├── data/                        # 외부화된 구조화 데이터 (JSON)
    │   ├── locomotion-sm.json
    │   ├── pose-graph.json
    │   ├── linked-layers.json
    │   └── ...
    ├── js/                          # 공통 스크립트
    │   ├── app.js                   # 라우팅·테마·페이지 공통
    │   ├── graph.js                 # Cytoscape 초기화 헬퍼
    │   ├── filters.js               # 검증 등급·검색 필터
    │   └── search.js                # 검색 인덱스 로직
    └── css/
        └── style.css                # 공통 스타일·다크모드 토큰
```

폴더 이름(`dynamic-html/`)은 의도적으로 단순하게 두며, 검증 원장(`docs/`)과 시각적으로 구분된다.

## 기술 스택 — 허용된 CDN 라이브러리

다음 라이브러리만 사용한다. 모두 CDN 으로 로드하며 `package.json` / `node_modules` 를 생성하지 않는다.

| 용도 | 라이브러리 | 메이저 버전 고정 |
|------|-----------|----------------|
| 인터랙티브 노드 그래프 | Cytoscape.js | `3.x` |
| 계층 자동 레이아웃 | cytoscape-dagre | `2.x` |
| 자유 레이아웃 (옵션) | cytoscape-cose-bilkent / cytoscape-fcose | `4.x` |
| 커스텀 차트 (필요 시) | D3.js | `7.x` |
| 가벼운 반응형 UI 헬퍼 (옵션) | Alpine.js | `3.x` |
| 검색 인덱스 (옵션) | lunr.js | `2.x` |

### 라이브러리 추가 규칙

새 라이브러리를 추가하려면 다음을 모두 만족해야 한다.

1. CDN 으로 로드 가능 (자체 빌드 불필요)
2. MIT / BSD / Apache 2.0 등 비제한 라이선스
3. 이 표에 등록하고 추가 이유를 명시한다
4. 기존 라이브러리와 전역 이름·이벤트 충돌이 없는지 확인

## HTML 페이지 표준 구조

모든 페이지는 다음 4구역을 갖는다. 페이지 내 본문 섹션 순서는 자유.

```html
<body data-page-id="locomotion-sm">
  <header class="page-header">
    <h1>Lyra LocomotionSM 인터랙티브</h1>
    <span class="verified-at">검증일: 2026-05-22</span>
    <nav class="page-nav"><!-- 이전 / 목차 / 다음 --></nav>
  </header>

  <aside class="sidebar">
    <input type="search" class="search" placeholder="검색..." />
    <ul class="toc"><!-- 페이지 목차 --></ul>
  </aside>

  <main class="content">
    <section>
      <h2>개요</h2>
      <p>...</p>
      <div class="cy-graph"
           id="cy-locomotion"
           data-src="../data/locomotion-sm.json"
           data-layout="dagre"></div>
    </section>
  </main>

  <aside class="detail-panel" hidden>
    <!-- 노드 클릭 시 상세 표시 -->
  </aside>

  <button class="theme-toggle" aria-label="다크모드">🌓</button>
</body>
```

- 한국어 본문 + 영문 식별자 원칙은 마크다운 원장과 동일하다.
- 검증일(`<span class="verified-at">`)은 모든 페이지에 반드시 포함한다.

## 데이터 외부화 규칙

LocomotionSM, pose graph, 무기 layer 상속 등 **구조화된 데이터는 모두 `dynamic-html/data/*.json` 으로 외부화**한다. HTML 은 `fetch` 또는 `<script type="application/json">` 으로 데이터를 로드한 뒤 시각화 라이브러리로 렌더한다.

### JSON 표준 — state machine 예 (`locomotion-sm.json`)

```json
{
  "id": "LocomotionSM",
  "source_doc": "docs/lyra-animation-blueprint-analysis.md",
  "verified_at": "2026-05-22",
  "states": [
    {
      "id": "Idle",
      "type": "state",
      "linked_layer": "FullBody_IdleState",
      "validation": "verified"
    },
    {
      "id": "PivotSources",
      "type": "alias",
      "validation": "partial",
      "note": "membership 미확인 — 에디터 확인 필요"
    },
    {
      "id": "JumpSelector",
      "type": "conduit",
      "validation": "verified"
    }
  ],
  "transitions": [
    {
      "from": "Idle",
      "to": "Start",
      "conditions": ["HasVelocity", "HasAcceleration", "NOT GameplayTag_IsMelee"],
      "validation": "verified"
    }
  ]
}
```

### 외부화 기준

- 시각화에 사용되거나 같은 사실이 여러 페이지에 등장하면 `data/` 로 외부화한다.
- 페이지 1곳에서만 1회 등장하는 짧은 문장·표는 HTML 안에 직접 둔다.
- 한 라이라 버전에서 추출이 끝나면 모든 `verified_at` 을 같은 날짜로 맞춘다.

## 시각화 컴포넌트 표준

### 노드 그래프 (Cytoscape.js)

- HTML: `<div class="cy-graph" id="..." data-src="..." data-layout="dagre"></div>`
- 초기화: `dynamic-html/js/graph.js` 의 공통 함수 사용
- 레이아웃:
  - 흐름 그래프(state machine, 데이터 흐름): `dagre`
  - 자유 그래프(pose graph, 의존 관계): `fcose` 또는 `preset`
- 노드 클릭 → `detail-panel` 에 상세 표시 (필수)

### 검증 등급 배지

마크다운 검증 원장의 ✅ / ◐ / △ 와 1:1 대응. CSS 클래스 고정.

| 등급 | CSS 클래스 | 의미 |
|------|-----------|------|
| ✅ 검증 | `.badge-verified` | Monolith 또는 C++ 직접 확인 |
| ◐ 부분 검증 | `.badge-partial` | 공식 문서 + 간접 단서 |
| △ 미검증 | `.badge-unverified` | 학습 후보, 에디터 확인 필요 |

색상값은 `dynamic-html/css/style.css` 안의 CSS 변수로 정의하고, 라이트·다크 모두 정의한다.

### 필터·토글 UI

- 표준 패턴: `<input type="checkbox" data-filter="...">` + JS 이벤트로 그래프/표 갱신
- 검증 등급 필터는 모든 시각화 페이지에서 동일한 마크업·동작을 유지

## 마크다운 검증 원장과의 관계

`docs/lyra-*.md` 가 **사실의 단일 출처(검증 원장)** 이며, 다이나믹 HTML 은 그 사실을 시각화·인터랙션 형태로 재표현한 것이다.

| 종류 | 위치 | 역할 |
|------|------|------|
| 검증 원장 | `docs/lyra-*.md` | 한국어 본문, 사실·검증 등급의 단일 출처 |
| JSON 데이터 | `dynamic-html/data/*.json` | 원장의 구조화된 사실을 시각화용으로 추출 |
| HTML 페이지 | `dynamic-html/pages/*.html` | 학습 흐름·인터랙션·시각화 |

### 갱신 순서

1. 새 사실이 발견되면 **검증 원장(.md) 먼저** 갱신한다.
2. 같은 사실을 시각화에 반영하려면 해당 `data/*.json` 을 갱신한다.
3. HTML 페이지가 데이터와 어긋나면 데이터를 신뢰하고 HTML 을 수정한다 (역방향 금지).
4. `verified_at` 을 동일 작업의 모든 산출물에서 같은 날짜로 맞춘다.

## 금지 사항

본 저장소의 다이나믹 HTML 산출물에서는 다음을 금지한다.

- ❌ 별도 이미지 파일 (`.png`, `.jpg`, `.gif`, 외부 `.svg`)
- ❌ Mermaid 코드 블록 또는 `mermaid.js` 로드
- ❌ MkDocs / Docusaurus / Astro 등 마크다운 → HTML 빌드 도구
- ❌ `package.json` / `node_modules` 생성 (CDN 만 사용)
- ❌ 무거운 SPA 프레임워크 (React / Vue / Svelte) 도입
- ❌ 서버 측 렌더링 (Flask / Express 등) — 결과물은 정적 호스팅으로 서빙 가능해야 한다
- ❌ 마크다운 원장에 없는 사실을 HTML 에서 새로 정의 (원장 먼저 갱신)
- ❌ 폰트·아이콘 CDN 무분별 추가 (가벼움 유지)

예외가 필요하면 이 사양 문서를 먼저 수정해 합의한 뒤 반영한다.

## 확장 절차 — 새 시스템 분석을 다이나믹 HTML 에 추가할 때

1. `docs/lyra-<system>-*.md` 에 마크다운 검증 원장을 작성한다 (기존 패턴).
2. 시각화할 구조화 데이터를 `dynamic-html/data/<system>-*.json` 으로 추출한다.
3. `dynamic-html/pages/<system>-*.html` 페이지를 위 "HTML 페이지 표준 구조" 에 따라 작성한다.
4. `dynamic-html/index.html` 의 사이드바 목차에 페이지를 등록한다.
5. `docs/README.md` 와 본 사양 문서에 변경이 있었으면 함께 갱신한다.

## 의도적으로 정의하지 않은 것

다음은 페이지별 판단에 맡긴다 — 다만 위 표준은 일관 적용한다.

- 페이지 내 섹션 순서 (개요·시각화·표·체크리스트 등의 정확한 순서)
- 그래프 노드 색상 팔레트 (검증 등급 배지 제외)
- 다크모드 토글의 화면상 위치
- 키보드 단축키
