# 분석·문서화 워크플로우

> 이 문서는 Unreal Engine 프로젝트의 시스템을 분석해 한국어 참고 문서·메뉴얼·다이나믹 HTML 산출물을 만들 때 따르는 **표준 절차** 와 **잊지 말아야 할 품질 규칙 요약** 을 모았습니다. 모든 UE 프로젝트 분석에 재사용 가능합니다.
> 도구 사용 정책은 [`analysis-tools.md`](analysis-tools.md), HTML 산출물의 상세 사양은 [`dynamic-html-spec.md`](dynamic-html-spec.md), 새 시스템 등록은 [`README.md`](../README.md) 를 함께 참고하십시오. 본 문서는 `docs/common/` 에 있어 다른 UE 프로젝트 레포로 폴더 통째 카피해 재사용합니다. 프로젝트 종속 문서 (`architecture-overview.md` · `project-verification.md` · 시스템별 `<system>-*.md`) 는 [`../project/`](../project/) 에 있습니다.

## 분석 5단계 + 선택 점검

이 워크플로우의 1차 목표는 분석 결과를 한국어 참고 문서로 산출하는 것입니다. 권장 절차 - 1~4번이 필수 5단계, 5~6번은 HTML 산출을 동반할 때의 선택 점검:

1. **C++ 골격 파악** - 라이더 MCP(`search_symbol` → `get_symbol_info`)로 `Source/<게임모듈>/<시스템>/` 의 클래스 관계·진입점 확인. **예시 (라이라):** `Source/LyraGame/<시스템>/`.
2. **블루프린트/데이터 계층 파악** - Monolith(`blueprint_query`·`animation_query`·`gas_query` 등)로 해당 시스템이 사용하는 `.uasset` 의 실제 구성·기본값·노드 그래프 조회.
3. **교차 검증** - 블루프린트가 가리키는 C++ 부모/엔진 클래스를 라이더 MCP 로 확인해 동작을 확정.
4. **문서화** - 시스템별로 표준 4종 문서 (`<system>-code-analysis.md`, `<system>-blueprint-analysis.md`, `<system>-learning-section-plan.md`, 선택적 `<system>-references.md`) 를 작성하여 `docs/project/` 에 저장하고 `docs/README.md` 의 해당 시스템 그룹에 한 줄 등록. 전체 구조·검증 제한은 해당 프로젝트의 `project-verification.md` 가 단일 출처입니다. 구체 사례 인덱스는 그 레포의 `docs/README.md` 를 참고 - **본 레포 사례 (라이라):** [`../project/project-verification.md`](../project/project-verification.md), [`../project/animation-references.md`](../project/animation-references.md) (애니메이션), [`../project/ui-learning-section-plan.md`](../project/ui-learning-section-plan.md) (CommonUI). 새 레포에서는 이 링크들이 그 프로젝트의 사례로 바뀝니다.
5. **다이나믹 HTML 산출(선택)** - 분석 결과를 학습 페이지로 노출할 경우 [`dynamic-html-spec.md`](dynamic-html-spec.md) 의 폴더 구조·기술 스택·금지 사항을 그대로 따라 `html/` 에 산출합니다. 마크다운 검증 원장이 사실의 단일 출처이고, HTML 은 그 사실을 학습 동선으로 재배열한 것입니다 - 이 관계는 사양 문서에서 정의합니다. **시스템 단위로 그룹화** 합니다 - 페이지 파일명은 사양이 정한 `<project>-<system>-<topic>.html` 형식 (**예시 (라이라):** `lyra-animation-overview.html`, `lyra-ui-overview.html`), 인덱스 (`html/index.html`) 는 시스템별 `<section>` 으로 나누고, 페이지 번호는 시스템 내에서만 1부터 (글로벌 번호 금지). 새 시스템을 추가할 때는 사양의 "확장 절차 A", 기존 시스템에 페이지를 추가할 때는 "확장 절차 B" 를 따릅니다. 페이지 작성 전 **정보 형태를 먼저 분류** 하고 (flow / structure / decision / reference / comparison / recipe / verification 7종 중 선택), **flow gate 5문** 을 통과하는 블록만 `flow-section` 으로 만듭니다. 페이지 상단에는 **`chapter-brief` 4칸** (이 챕터의 질문 / 먼저 알아둘 것 / 선행 학습 / 보충 자료) 을 둡니다 - 단순 외부 링크 목록이 아닙니다.
6. **정적 점검(선택)** - HTML 산출 후 사양의 "배포 전 체크리스트" 를 따라 내부 링크·외부 링크 속성·검증 배지 분포·**flow gate 통과 여부**·블록 종류 적합성·**chapter-brief 4칸 완성**·**색 의미 체계 준수**·**표 래퍼 의무화 (`.table-wrap`)**·**뷰포트 가로 overflow 없음 (375/768/1280)**·금지 요소를 확인합니다. 통과하지 못한 페이지는 커밋·공유하지 않습니다. 표 일괄 보정은 `node docs/tools/wrap-tables.cjs` (idempotent) 로 가능합니다.

## HTML 산출물 품질 규칙 요약 (잊지 말 것)

상세는 [`dynamic-html-spec.md`](dynamic-html-spec.md) 의 "다중 시스템 구조", "학습 블록 7종", "flow gate", "챕터 브리프", "색상 의미 체계", "Note 박스 4종", "검증 등급 처리 규칙", "확장 절차 A/B", "배포 전 체크리스트" 에 있으나, 작업 중 잊지 말아야 할 핵심 일곱 가지:

- **"흐름" 은 모든 콘텐츠의 시각 템플릿이 아닙니다.** "학습 동선이 중요하다" 는 독자가 위→아래로 이해할 수 있는 문서 구성 원칙이지, 모든 섹션을 `흐름 N` + 단계 카드 + 화살표로 표현하라는 뜻이 아닙니다. 인터페이스 함수 목록·CDO 값·variant 비교·테스트 케이스·작업 절차는 흐름 카드로 만들지 말고 각각 reference·comparison·verification·recipe 블록으로 표현하십시오.
- **`flow-section` 사용 전 flow gate 5문에 답하십시오.** (1) 시간/인과 순서? (2) 이전 단계가 끝나야 다음? (3) 화살표가 실제 transition/call/event/dependency? (4) 조건 배지가 실제 guard/branch? (5) 화살표 제거 시 의미 손상? **3문 이상 "아니오" 면 다른 블록 종류를 선택** 하십시오. 모든 페이지가 같은 개수의 `flow-section` 으로 채워지면 정책 포맷이 콘텐츠 판단을 압도한 신호입니다.
- **`chapter-brief` 는 단순 링크 목록이 아닙니다.** 페이지 상단 박스는 "참고 자료" 가 아니라 학습자가 본문을 읽기 위한 준비 정보 4칸 - "이 챕터의 질문 / 먼저 알아둘 것 / 선행 학습 / 보충 자료". 본문 요약을 두지 마십시오. `page-refs` 마크업은 더 이상 사용하지 않습니다.
- **색은 의미입니다.** `--flow-state` / `--flow-alias` / `--flow-conduit` 토큰은 `.flow-section .step` 의 좌측 막대에만 씁니다. concept-card·struct-node·checklist·note 박스가 이 색을 빌려 쓰지 않게 하십시오. 다른 의미의 박스에 flow 색을 쓰면 학습자가 색의 의미를 잃습니다. 검증 색은 badge 에만, 일반 노트는 `.note .note-info/design/warning/debug` 중 의미에 맞는 종류를 사용합니다.
- **HTML 배지는 마크다운 원장보다 높은 검증 등급을 표시할 수 없습니다.** 원장이 `partial` 인 사실을 HTML 에서 `verified` 로 승격하지 마십시오. 본문 표현도 "적용한다" 대신 "적용 지점으로 추정", "에디터 확인 필요" 로 절제합니다.
- **HTML 에 마크다운 원장에 없는 사실을 새로 정의하지 마십시오.** 추가가 필요하면 원장(`docs/project/<system>-*-analysis.md`) 을 먼저 갱신한 뒤 HTML 에 옮깁니다 - 역방향 금지.
- **본문은 한글과 ASCII 구두점으로 씁니다.** em dash `—` · en dash `–` · `✅` · `❌` · `★` · `①`~`⑨` 모두 **금지** (정적 검사 FAIL). em dash 는 ASCII 하이픈 ` - ` · 콜론 `:` · 새 문장 분리로, `✅` 는 `완료` · `검증 완료` 한글로, `★` 는 `핵심` · `중요` 한글 또는 `<strong>` 으로 풀어 씁니다. 좁은 화이트리스트 (HTML 컴포넌트 그래픽 · 원문 식별자 · 수식) 만 허용. 작성 후 `node docs/tools/check-special-chars.cjs` 통과 필수. 자세한 규칙은 사양의 "본문 특수문자 사용 규칙" 절.
- **모든 `<table>` 은 `.table-wrap` 으로 감쌉니다.** 본문 컬럼은 `max-width: 760px` 인데 표는 5~6컬럼·긴 Unreal 경로·GameplayTag·C++ 식별자 셀이 많아 래퍼 없이 두면 페이지 전체에 가로 스크롤이 생기고 3단 레이아웃이 깨집니다. 학습 블록 4종 (decision/comparison/reference/verification) 의 모든 표가 대상. 작성 후 `node docs/tools/wrap-tables.cjs` 로 일괄 보정 가능 (idempotent). `body { overflow-x: hidden }` 이나 전역 `word-break: break-all` 같은 임시방편 금지 - 자세한 표 폭 설계 가이드는 사양의 "표 마크업 표준" 절.

## 새 시스템 추가 시

[`README.md`](../README.md) 의 "시스템 추가 절차" 를 따릅니다. HTML 산출이 동반될 때는 사양의 "확장 절차 A" (새 시스템 추가) 또는 "확장 절차 B" (기존 시스템에 페이지만 추가) 를 따릅니다.

다른 UE 프로젝트 분석을 새 레포에서 시작할 때는 본 `docs/common/` 폴더를 통째 카피한 뒤, 그 레포의 `docs/project/` 안에 자기 프로젝트의 `architecture-overview.md` · `project-verification.md` · 시스템별 분석을 새로 작성합니다.
