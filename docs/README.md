# docs/ - 라이라 분석·학습 문서

이 폴더는 **LyraStarterGame 분석·학습 및 메뉴얼 작성**을 위한 문서를 담습니다.
작업 개요·분석 도구(Monolith·라이더 MCP)·아키텍처는 루트 [`CLAUDE.md`](../CLAUDE.md) 를 먼저 참고하십시오.

문서는 **공통 정책·사양** 과 **시스템별 분석 그룹** 으로 나뉩니다. 새 시스템 (GAS, Experience, Equipment 등) 을 추가할 때는 사양 ([`lyra-dynamic-html-spec.md`](lyra-dynamic-html-spec.md)) 의 "확장 절차 A" 를 따라 새 시스템 섹션을 본 인덱스에 추가합니다.

## 공통 정책·사양

프로젝트 전체에 적용되는 검증 범위·산출물 규칙·작성 원칙.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`lyra-project-verification.md`](lyra-project-verification.md) | 검증 맵 | 프로젝트 구조, 핵심 시스템, 문서 작성 시 주의할 검증 범위 정리 |
| [`lyra-dynamic-html-spec.md`](lyra-dynamic-html-spec.md) | 산출물 사양 | 라이라 분석·학습 결과를 다이나믹 HTML 로 표현할 때의 폴더 구조·다중 시스템 인덱스 구조·표준 컴포넌트·금지 사항·확장 절차 A/B·배포 전 체크리스트 |
| [`lyra-learning-docs-integrated-review-feedback.md`](lyra-learning-docs-integrated-review-feedback.md) | 검토 피드백 | 애니메이션·CommonUI 학습 문서, 온라인 공식 문서 반영 상태, 동적 HTML 정책, 정돈된 문서 작성 지침에 대한 통합 개선 피드백 |

## 시스템: 애니메이션 (`animation`)

캐릭터 ABP·`LocomotionSM`·linked anim layer·distance matching·warping·turn-in-place·IK·notify·테스트·확장 레시피.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`lyra-animation-references.md`](lyra-animation-references.md) | 참고 자료 | 라이라 애니메이션 분석·학습을 위한 공식 온라인 문서 모음 (URL + 프로젝트 구현 매핑). 섹션 13·섹션 14 보강 — Copy Pose, Modular Characters, Post Process ABP, IK Retargeting 포함 |
| [`lyra-animation-code-analysis.md`](lyra-animation-code-analysis.md) | 코드 분석 | `ULyraAnimInstance`, movement, weapon/equipment, cosmetic selection (`SpawnActorForEntry` ↔ `BroadcastChanged` 분리), ShooterTests 애니메이션 코드 흐름 |
| [`lyra-animation-blueprint-analysis.md`](lyra-animation-blueprint-analysis.md) | 블루프린트 분석 | Monolith 로 확인한 AnimBlueprint, linked layer, weapon/cosmetic Blueprint CDO, animation asset 구조 + `ABP_Mannequin_CopyPose`·`ABP_*_PostProcess`·`ABP_*_Retarget`·`B_Manny`/`B_Quinn` cosmetic BP 원장 (섹션 13·섹션 14 근거) |
| [`lyra-animation-learning-section-plan.md`](lyra-animation-learning-section-plan.md) | 섹션 설계 | 라이라 애니메이션 학습 문서를 **메커니즘 학습 12개 + 설계 의도와 트레이드오프 2개 = 14개 섹션** 으로 나누는 권장 목차, 분류 원칙, 작성 우선순위, 기능 키워드 검증 매핑, HTML 산출물 대응 표 (메커니즘 10페이지 + 설계 의도 2페이지 = 총 12페이지 구현 완료). 섹션 13 은 AnimBP/ALI 책임 분담의 trade-off, 섹션 14 는 Invisible Mesh + Copy Pose + Cosmetic Layer 아키텍처 |

## 시스템: CommonUI (`ui`)

`ULyraActivatableWidget`·`ALyraHUD`·`ULyraHUDLayout`·`ULyraTaggedWidget`·`UGameFeatureAction_AddWidgets`·`UUIExtensionSubsystem` + GameSettings · Common User 계열.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`lyra-ui-references.md`](lyra-ui-references.md) | 참고 자료 | 라이라 CommonUI 분석·학습을 위한 공식 Epic 문서·커뮤니티 자료 모음 (URL + 프로젝트 구현 매핑) |
| [`lyra-ui-code-analysis.md`](lyra-ui-code-analysis.md) | 코드 분석 | CommonUI 핵심 5종 — `ULyraActivatableWidget`, `ALyraHUD`, `ULyraHUDLayout`, `ULyraTaggedWidget`, `UGameFeatureAction_AddWidgets` + `UUIExtensionSubsystem` · `UUIExtensionPointWidget` · `ULyraUIManagerSubsystem` 의 책임과 런타임 흐름 |
| [`lyra-ui-blueprint-analysis.md`](lyra-ui-blueprint-analysis.md) | 블루프린트 분석 | HUD layout 위젯 BP 인벤토리 (4개 — 중 `W_DefaultHUDLayout` CDO 검증), `UI.Layer.*` / `HUD.Slot.*` 태그 (4 + 15), `LAS_ShooterGame_StandardHUD` 의 `GameFeatureAction_AddWidgets` CDO (Layout 1 + Widgets 11) 검증 |
| [`lyra-ui-learning-section-plan.md`](lyra-ui-learning-section-plan.md) | 섹션 설계 | CommonUI / UIExtension / GameUI Manager / GameSettings 학습 문서를 8개 섹션으로 나누는 권장 목차, HTML 산출물 대응표, 검증 등급 유지 항목, Epic 공식 문서 ↔ 라이라 구현 매핑, 독자별 학습 경로 |

## 새 시스템 추가 절차

1. 시스템 식별자 (`<system>` slug) 를 정한다 — 영문 소문자 단어, 필요 시 하이픈. 예: `gas`, `experience`, `equipment`, `game-features`.
2. 시스템 폴더는 만들지 않는다 — 파일명 접두어 `lyra-<system>-` 로만 구분.
3. **표준 4종 문서** 를 `docs/` 에 작성한다 (사양의 "확장 절차 A" 2단계 참고).
   - `lyra-<system>-code-analysis.md` (필수)
   - `lyra-<system>-blueprint-analysis.md` (블루프린트·CDO 가 있는 시스템이면 필수)
   - `lyra-<system>-learning-section-plan.md` (HTML 페이지 계획이 있으면 필수)
   - `lyra-<system>-references.md` (선택 — 공식 문서 링크가 많을 때)
4. **본 인덱스에 새 "시스템: <이름> (`<system>`)" 섹션** 을 추가한다 — 시스템 우선순위에 맞는 위치에 (알파벳 순서 같은 기계적 정렬 금지).
5. (HTML 산출 시) `dynamic-html/index.html` 에도 같은 시스템의 새 `<section>` 을 추가한다 — 사양의 "다중 시스템 구조" 참고.

## 작성 규칙

- **언어** — 한국어 본문, 영문 식별자·코드·태그·자산 경로는 원문 유지.
- **사실의 출처** — 검증 원장 (위 시스템별 표의 code/blueprint analysis) 이 사실의 단일 출처. 같은 사실을 다른 문서에서 재정의하지 않고 인용한다.
- **온라인 인용** — URL 과 확인 날짜를 함께 적는다.
- **세션 상태** — 도구 연결 상태 (Monolith·라이더 MCP 응답 여부 등) 는 고정 사실로 적지 말고 "확인 방법" 또는 "전제 조건" 으로 적는다.
- **HTML 산출물** — `dynamic-html/` 을 만들거나 갱신할 때는 사양의 "확장 절차 B" (기존 시스템에 페이지 추가) 또는 "확장 절차 A" (새 시스템 추가) 를 따른다.
