# docs/ — 분석·학습 문서 인덱스

이 레포는 단일 UE 프로젝트 (**LyraStarterGame**, UE 5.7 공식 샘플) 분석에 쓰입니다. 본 폴더는 평면 구조이고, 문서는 두 그룹으로 나뉩니다:

- **공통 문서** — 다른 UE 프로젝트 분석 레포로 카피해 그대로 재사용 가능한 도구 정책·작업 절차·HTML 산출물 사양.
- **이 프로젝트 (라이라) 종속** — 이 저장소의 라이라 아키텍처·검증·시스템별 분석.

작업 개요와 매 turn 적용되는 행동 규칙은 루트 [`../CLAUDE.md`](../CLAUDE.md), 라이라 시스템 아키텍처는 [`architecture-overview.md`](architecture-overview.md), 파일 경로·플러그인 메타데이터 검증 표는 [`project-verification.md`](project-verification.md) 가 출발점입니다.

## 공통 문서 (다른 UE 프로젝트 레포로 카피 가능)

| 문서 | 종류 | 내용 |
|------|------|------|
| [`analysis-tools.md`](analysis-tools.md) | 도구 정책 | Monolith MCP(블루프린트·에셋) + 라이더 MCP(C++) 사용 정책·전제 조건·핵심 네임스페이스·블루프린트 분석 워크플로우 |
| [`documentation-workflow.md`](documentation-workflow.md) | 작업 절차 | 분석 5단계 (C++ 골격 → 블루프린트 → 교차 검증 → 문서화 → HTML 산출) + HTML 산출물 품질 규칙 요약 7개 |
| [`dynamic-html-spec.md`](dynamic-html-spec.md) | 산출물 사양 | 학습 결과를 다이나믹 HTML 로 표현할 때의 폴더 구조·다중 시스템 인덱스·표준 컴포넌트·금지 사항·확장 절차 A/B·배포 전 체크리스트 |

## 이 프로젝트 (라이라) — 정책·검증

| 문서 | 종류 | 내용 |
|------|------|------|
| [`architecture-overview.md`](architecture-overview.md) | 아키텍처 개요 | 5대 시스템 (Experience · Game Features · Pawn 초기화 · GAS · Animation) 과 그 외 주요 시스템의 동작·설계 의도 산문 설명 + 분석 시 알아둘 프로젝트 고유 사항 |
| [`project-verification.md`](project-verification.md) | 검증 맵 | 프로젝트 구조·플러그인 메타데이터·핵심 시스템의 파일 경로 검증 표, 문서 작성 시 검증 범위, 이 저장소의 환경·MCP 설정 |

## 이 프로젝트 — 시스템: 애니메이션 (`animation`)

캐릭터 ABP · `LocomotionSM` · linked anim layer · distance matching · warping · turn-in-place · IK · notify · 테스트 · 확장 레시피.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`animation-references.md`](animation-references.md) | 참고 자료 | 라이라 애니메이션 분석·학습을 위한 공식 온라인 문서 모음 (URL + 프로젝트 구현 매핑). 섹션 13·섹션 14 보강 — Copy Pose, Modular Characters, Post Process ABP, IK Retargeting 포함 |
| [`animation-code-analysis.md`](animation-code-analysis.md) | 코드 분석 | `ULyraAnimInstance`, movement, weapon/equipment, cosmetic selection (`SpawnActorForEntry` ↔ `BroadcastChanged` 분리), ShooterTests 애니메이션 코드 흐름 |
| [`animation-blueprint-analysis.md`](animation-blueprint-analysis.md) | 블루프린트 분석 | Monolith 로 확인한 AnimBlueprint, linked layer, weapon/cosmetic Blueprint CDO, animation asset 구조 + `ABP_Mannequin_CopyPose` · `ABP_*_PostProcess` · `ABP_*_Retarget` · `B_Manny`/`B_Quinn` cosmetic BP 원장 (섹션 13·섹션 14 근거) |
| [`animation-learning-section-plan.md`](animation-learning-section-plan.md) | 섹션 설계 | 라이라 애니메이션 학습 문서를 메커니즘 학습 12개 + 설계 의도와 트레이드오프 2개 = 14개 섹션으로 나누는 권장 목차, 분류 원칙, 작성 우선순위, 기능 키워드 검증 매핑, HTML 산출물 대응 표 |

## 이 프로젝트 — 시스템: CommonUI (`ui`)

`ULyraActivatableWidget` · `ALyraHUD` · `ULyraHUDLayout` · `ULyraTaggedWidget` · `UGameFeatureAction_AddWidgets` · `UUIExtensionSubsystem` + GameSettings · Common User 계열.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`ui-references.md`](ui-references.md) | 참고 자료 | 라이라 CommonUI 분석·학습을 위한 공식 Epic 문서·커뮤니티 자료 모음 (URL + 프로젝트 구현 매핑) |
| [`ui-code-analysis.md`](ui-code-analysis.md) | 코드 분석 | CommonUI 핵심 5종 — `ULyraActivatableWidget`, `ALyraHUD`, `ULyraHUDLayout`, `ULyraTaggedWidget`, `UGameFeatureAction_AddWidgets` + `UUIExtensionSubsystem` · `UUIExtensionPointWidget` · `ULyraUIManagerSubsystem` 의 책임과 런타임 흐름 |
| [`ui-blueprint-analysis.md`](ui-blueprint-analysis.md) | 블루프린트 분석 | HUD layout 위젯 BP 인벤토리 (4개 — 중 `W_DefaultHUDLayout` CDO 검증), `UI.Layer.*` / `HUD.Slot.*` 태그 (4 + 15), `LAS_ShooterGame_StandardHUD` 의 `GameFeatureAction_AddWidgets` CDO (Layout 1 + Widgets 11) 검증 |
| [`ui-learning-section-plan.md`](ui-learning-section-plan.md) | 섹션 설계 | CommonUI / UIExtension / GameUI Manager / GameSettings 학습 문서를 8개 섹션으로 나누는 권장 목차, HTML 산출물 대응표, 검증 등급 유지 항목, Epic 공식 문서 ↔ 라이라 구현 매핑, 독자별 학습 경로 |

## 시스템 추가 절차

새 시스템 분석을 본 레포에 추가할 때:

1. 시스템 식별자 (`<system>` slug) 를 정한다 — 영문 소문자 단어, 필요 시 하이픈. 예: `gas`, `experience`, `equipment`, `game-features`.
2. 시스템 폴더는 만들지 않는다 — 파일명 접두어 `<system>-` 로만 구분.
3. **표준 4종 문서** 를 본 폴더에 작성한다 — `<system>-code-analysis.md`, `<system>-blueprint-analysis.md`, `<system>-learning-section-plan.md`, (선택) `<system>-references.md`. 5단계 절차·품질 규칙은 [`documentation-workflow.md`](documentation-workflow.md) 참고.
4. 본 인덱스에 새 "이 프로젝트 — 시스템: <이름> (`<system>`)" 절을 추가한다 — 시스템 우선순위에 맞는 위치에 (알파벳 순서 같은 기계적 정렬 금지).
5. (HTML 산출 시) `dynamic-html/index.html` 에도 같은 시스템의 새 `<section>` 을 추가한다 — 사양 [`dynamic-html-spec.md`](dynamic-html-spec.md) 의 "다중 시스템 구조" 참고.

## 다른 UE 프로젝트 분석을 시작할 때

이 레포는 라이라 한 프로젝트 전용입니다. 다른 UE 프로젝트 분석은 별도 레포에서:

1. 새 레포에 빈 `docs/` 폴더를 만든다.
2. 본 레포의 공통 3개 (`analysis-tools.md` · `documentation-workflow.md` · `dynamic-html-spec.md`) 를 카피한다 — 그대로 적용 가능.
3. 자기 프로젝트의 `architecture-overview.md` · `project-verification.md` 를 새로 작성한다.
4. 위 "시스템 추가 절차" 를 따라 시스템별 분석을 추가한다.
5. 본 인덱스 패턴을 참고해 그 레포의 `docs/README.md` 를 작성한다.
