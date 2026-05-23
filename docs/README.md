# docs/ — 라이라 분석·학습 문서

이 폴더는 **LyraStarterGame 분석·학습 및 메뉴얼 작성**을 위한 문서를 담습니다.
작업 개요·분석 도구(Monolith·라이더 MCP)·아키텍처는 루트 [`CLAUDE.md`](../CLAUDE.md) 를 먼저 참고하십시오.

## 문서 목록

| 문서 | 종류 | 내용 |
|------|------|------|
| [`lyra-project-verification.md`](lyra-project-verification.md) | 검증 맵 | 프로젝트 구조, 핵심 시스템, 문서 작성 시 주의할 검증 범위 정리 |
| [`lyra-animation-references.md`](lyra-animation-references.md) | 참고 자료 | 라이라 애니메이션 분석·학습을 위한 공식 온라인 문서 모음 (URL + 프로젝트 구현 매핑) |
| [`lyra-animation-blueprint-analysis.md`](lyra-animation-blueprint-analysis.md) | 블루프린트 분석 | Monolith로 확인한 AnimBlueprint, linked layer, weapon/cosmetic Blueprint CDO, animation asset 구조 |
| [`lyra-animation-code-analysis.md`](lyra-animation-code-analysis.md) | 코드 분석 | `ULyraAnimInstance`, movement, weapon/equipment, cosmetic selection, ShooterTests 애니메이션 코드 흐름 |
| [`lyra-animation-learning-section-plan.md`](lyra-animation-learning-section-plan.md) | 섹션 설계 | 라이라 애니메이션 학습 문서를 기능별로 나누기 위한 권장 목차, 분류 원칙, 작성 우선순위, 기능 키워드 검증 매핑 |
| [`lyra-dynamic-html-spec.md`](lyra-dynamic-html-spec.md) | 산출물 사양 | 라이라 분석·학습 결과를 다이나믹 HTML 로 표현할 때의 폴더 구조·기술 스택·표준 컴포넌트·금지 사항·확장 절차 |

## 작성 규칙

- 시스템별 분석 메뉴얼(애니메이션·GAS·Experience 등)을 이 폴더에 작성합니다.
- 새 문서를 추가하면 위 **문서 목록** 표에 한 줄 등록합니다.
- 문서 본문 언어는 한국어 (코드·식별자는 원문 유지).
- 온라인 자료를 인용할 때는 URL 과 확인 날짜를 함께 적습니다.
- 세션마다 달라지는 도구 연결 상태는 고정 사실로 적지 말고, 확인 방법과 전제 조건으로 적습니다.
- 다이나믹 HTML 산출물(`dynamic-html/`)을 만들거나 갱신할 때는 [`lyra-dynamic-html-spec.md`](lyra-dynamic-html-spec.md) 의 규칙을 따릅니다.
