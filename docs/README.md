# docs/ - 분석·학습 문서 인덱스

이 레포는 단일 UE 프로젝트 (**LyraStarterGame**, UE 5.7 공식 샘플) 분석에 쓰입니다. `docs/` 는 **두 하위 폴더로 분리** 돼 있어 "무엇이 정책이고 무엇이 분석 결과인지" 가 폴더 단위로 명확합니다.

| 폴더·파일 | 그룹 | 다른 UE 프로젝트 재사용 |
|-----------|------|------------------------|
| [`common/`](common/) | **컨텐츠 생성 정책 (A)** - 분석·학습 문서를 어떻게 만들고 표현할지 (도구 사용·작업 절차·HTML 사양) | 검증 완료 폴더 통째로 카피 가능 |
| [`project/`](project/) | **프로젝트 컨텍스트 + 시스템별 검증 원장** - 라이라 아키텍처 산문·검증 표 + 시스템 분석 결과 (HTML 의 단일 출처) | 불가 라이라 종속 |
| [`tools/`](tools/) - `check-doc-links.cjs` · `check-special-chars.cjs` · `wrap-tables.cjs` · `verify-html.cjs` | **공통 보조 도구** - `common/` 정책이 안내하는 정적 검사·일괄 보정·헤드리스 브라우저 검증 스크립트 | `common/` 와 함께 카피. `node_modules/` 와 `verify-shots/` 는 gitignore. |

Claude 작업 정책 (이 레포에서 Claude 가 어떻게 행동할지) 은 본 폴더가 아니라 루트 [`../CLAUDE.md`](../CLAUDE.md) + `~/.claude/.../memory/*` 에 있습니다. `CLAUDE.md` 는 표 **구조** 만 템플릿으로 재사용하고, 프로젝트 개요·엔진 버전·핵심 시스템 목록·사용자 선호·시작 문서 경로는 새 레포에 맞게 본문을 갱신해야 합니다 (그대로 복사 금지).

출발점:
- 매 turn 적용되는 행동 규칙 + 정책 분류 표 → 루트 [`../CLAUDE.md`](../CLAUDE.md)
- 라이라 시스템 아키텍처 산문 → [`project/architecture-overview.md`](project/architecture-overview.md)
- 파일 경로·플러그인 메타데이터 검증 표 → [`project/project-verification.md`](project/project-verification.md)

## `common/` - 컨텐츠 생성 정책 (다른 UE 프로젝트 레포로 카피 가능)

| 문서 | 종류 | 내용 |
|------|------|------|
| [`common/analysis-tools.md`](common/analysis-tools.md) | 도구 정책 | Monolith MCP(블루프린트·에셋) + 라이더 MCP(C++) 사용 정책·전제 조건·핵심 네임스페이스·블루프린트 분석 워크플로우 |
| [`common/documentation-workflow.md`](common/documentation-workflow.md) | 작업 절차 | 분석 5단계 (C++ 골격 → 블루프린트 → 교차 검증 → 문서화 → HTML 산출) + HTML 산출물 품질 규칙 요약 8개 |
| [`common/dynamic-html-spec.md`](common/dynamic-html-spec.md) | 산출물 사양 | 학습 결과를 다이나믹 HTML 로 표현할 때의 폴더 구조·다중 시스템 인덱스·표준 컴포넌트·표 마크업 표준·금지 사항·확장 절차 A/B·배포 전 체크리스트 |

## `project/` - 라이라 컨텍스트 (참조 자료)

정책 아닌 **참조 자료**. 분석 도구 / 작업 절차 / HTML 사양은 `common/` 가 정하고, 이 두 문서는 라이라 시스템의 *내용* 을 설명합니다.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`project/architecture-overview.md`](project/architecture-overview.md) | 아키텍처 개요 | 5대 시스템 (Experience · Game Features · Pawn 초기화 · GAS · Animation) 과 그 외 주요 시스템의 동작·설계 의도 산문 설명 + 분석 시 알아둘 프로젝트 고유 사항 |
| [`project/project-verification.md`](project/project-verification.md) | 검증 맵 | 프로젝트 구조·플러그인 메타데이터·핵심 시스템의 파일 경로 검증 표, 문서 작성 시 검증 범위, 이 저장소의 환경·MCP 설정 |

## `project/` - 시스템별 검증 원장 (HTML 의 단일 출처)

각 시스템마다 표준 4종 (코드 분석 · 블루프린트 분석 · 학습 섹션 설계 · 참고 자료). `common/dynamic-html-spec.md` 가 정한 절차로 만들어진 **분석 결과** 이고, 동시에 `html/pages/lyra-<system>-*.html` 학습 페이지의 **사실 단일 출처** 입니다.

### 애니메이션 (`animation`)

캐릭터 ABP · `LocomotionSM` · linked anim layer · distance matching · warping · turn-in-place · IK · notify · 테스트 · 확장 레시피.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`project/animation-references.md`](project/animation-references.md) | 참고 자료 | 라이라 애니메이션 분석·학습을 위한 공식 온라인 문서 모음 (URL + 프로젝트 구현 매핑). 섹션 13·섹션 14 보강 - Copy Pose, Modular Characters, Post Process ABP, IK Retargeting 포함 |
| [`project/animation-code-analysis.md`](project/animation-code-analysis.md) | 코드 분석 | `ULyraAnimInstance`, movement, weapon/equipment, cosmetic selection (`SpawnActorForEntry` ↔ `BroadcastChanged` 분리), ShooterTests 애니메이션 코드 흐름 |
| [`project/animation-blueprint-analysis.md`](project/animation-blueprint-analysis.md) | 블루프린트 분석 | Monolith 로 확인한 AnimBlueprint, linked layer, weapon/cosmetic Blueprint CDO, animation asset 구조 + `ABP_Mannequin_CopyPose` · `ABP_*_PostProcess` · `ABP_*_Retarget` · `B_Manny`/`B_Quinn` cosmetic BP 원장 (섹션 13·섹션 14 근거) |
| [`project/animation-learning-section-plan.md`](project/animation-learning-section-plan.md) | 섹션 설계 | 라이라 애니메이션 학습 문서를 메커니즘 학습 12개 + 설계 의도와 트레이드오프 2개 = 14개 섹션으로 나누는 권장 목차, 분류 원칙, 작성 우선순위, 기능 키워드 검증 매핑, HTML 산출물 대응 표 |

### CommonUI (`ui`)

`ULyraActivatableWidget` · `ALyraHUD` · `ULyraHUDLayout` · `ULyraTaggedWidget` · `UGameFeatureAction_AddWidgets` · `UUIExtensionSubsystem` + GameSettings · Common User 계열.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`project/ui-references.md`](project/ui-references.md) | 참고 자료 | 라이라 CommonUI 분석·학습을 위한 공식 Epic 문서·커뮤니티 자료 모음 (URL + 프로젝트 구현 매핑) |
| [`project/ui-code-analysis.md`](project/ui-code-analysis.md) | 코드 분석 | CommonUI 핵심 5종 - `ULyraActivatableWidget`, `ALyraHUD`, `ULyraHUDLayout`, `ULyraTaggedWidget`, `UGameFeatureAction_AddWidgets` + `UUIExtensionSubsystem` · `UUIExtensionPointWidget` · `ULyraUIManagerSubsystem` 의 책임과 런타임 흐름 |
| [`project/ui-blueprint-analysis.md`](project/ui-blueprint-analysis.md) | 블루프린트 분석 | HUD layout 위젯 BP 인벤토리 (4개 - 중 `W_DefaultHUDLayout` CDO 검증), `UI.Layer.*` / `HUD.Slot.*` 태그 (4 + 15), `LAS_ShooterGame_StandardHUD` 의 `GameFeatureAction_AddWidgets` CDO (Layout 1 + Widgets 11) 검증 |
| [`project/ui-learning-section-plan.md`](project/ui-learning-section-plan.md) | 섹션 설계 | CommonUI / UIExtension / GameUI Manager / GameSettings 학습 문서를 8개 섹션으로 나누는 권장 목차, HTML 산출물 대응표, 검증 등급 유지 항목, Epic 공식 문서 ↔ 라이라 구현 매핑, 독자별 학습 경로 |

### 에셋 비동기 로딩 (`asset-loading`)

`ULyraAssetManager` · `FLyraAssetManagerStartupJob` · `ULyraGameData` · `ULyraExperienceManagerComponent` (7단계 state) · `UAsyncAction_ExperienceReady` · `ULyraLoadingScreenSubsystem` + AssetBundle 메타 (`Client` / `Client,Server`) + Primary Asset Type 8개.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`project/asset-loading-references.md`](project/asset-loading-references.md) | 참고 자료 | Epic 공식 문서 (AssetManager · Primary Asset Type · StreamableManager · AssetBundles · GameFeatures · BlueprintAsyncAction · CommonLoadingScreen) + 라이라 구현 매핑 |
| [`project/asset-loading-code-analysis.md`](project/asset-loading-code-analysis.md) | 코드 분석 | 9종 C++ - `ULyraAssetManager` 부팅 진입점 · `STARTUP_JOB` 매크로 · `FLyraAssetManagerStartupJob` 진행률 누적 · `ULyraGameData` 전역 자산 · `ULyraExperienceManagerComponent` 7단계 state machine · NetMode 별 bundle 분기 · GameFeature 일괄 활성화 · Priority 3단 콜백 · `UAsyncAction_ExperienceReady` 4 step + `ILoadingProcessInterface` 통합 |
| [`project/asset-loading-blueprint-analysis.md`](project/asset-loading-blueprint-analysis.md) | 설정·자산 분석 | `DefaultEngine.ini` (`AssetManagerClassName` · `GlobalDefaultGameMode`) + `DefaultGame.ini` (4개 절 - `GameFeaturesSubsystemSettings` · `LyraAssetManager` · `AssetManagerSettings` · `CommonLoadingScreenSettings`) · 8개 Primary Asset Type · `DefaultGameData` CDO 검증 완료 (soft class 경로만 보관) · `B_LyraDefaultExperience` AssetBundleData (1 widget - `meta=(AssetBundles="Client")` 자동 수집) 검증 완료 · `LAS_ShooterGame_StandardHUD` AssetBundleData (12 widgets - Layout 메타 1 + Widgets `AddAdditionalAssetBundleData` override 11) 검증 완료 · **AssetBundles 메타 사용처 10곳** (`Source/LyraGame` 9 + Plugin 1) · GameFeature 5개 메타데이터 |
| [`project/asset-loading-learning-section-plan.md`](project/asset-loading-learning-section-plan.md) | 섹션 설계 + **(핵심) 포팅 가이드** | 8개 학습 섹션 + **다른 UE 프로젝트로 이식하는 스텝 바이 스텝 포팅 가이드 (옵션 A 4단계 / B 5단계 / C 9단계 + 흔한 함정 8종 + 측정 4종 + AddAdditionalAssetBundleData override 확인 항목)**. HTML 9페이지 대응표 포함 (`lyra-asset-loading-porting-guide.html` 페이지가 본 시스템의 핵심 산출물) |

### GAS (`gas`)

`ULyraAbilitySystemComponent` · `ULyraAbilitySet` · `ULyraGameplayAbility` · `ULyraAbilityTagRelationshipMapping` · `ULyraAttributeSet` (Health · Combat) · `ULyraDamageExecution` · `ULyraGameplayCueManager` · `ULyraGamePhaseSubsystem` · `ULyraGlobalAbilitySystem`.

| 문서 | 종류 | 내용 |
|------|------|------|
| [`project/gas-references.md`](project/gas-references.md) | 참고 자료 | 라이라 GAS 분석·학습을 위한 공식 Epic 문서·커뮤니티 자료 모음 (URL + 프로젝트 구현 매핑) |
| [`project/gas-code-analysis.md`](project/gas-code-analysis.md) | 코드 분석 | `Source/LyraGame/AbilitySystem/` 의 15종 C++ - ASC 초기화 4경로, AbilitySet grant 4단계, GameplayAbility 활성 정책 (Policy·Group·Cost), TagRelationshipMapping, AttributeSet (Health · Combat), Damage/Heal execution 5단계, GameplayCueManager delay-load, GamePhase 계층, 글로벌 ASC 일괄 적용, EffectContext 확장 |
| [`project/gas-blueprint-analysis.md`](project/gas-blueprint-analysis.md) | 블루프린트 분석 (**GAS 자산 원장의 단일 기준**) | Monolith 검증 결과 - GA Monolith 인덱스 21 (파일명 인벤토리 `GA_*.uasset` 별도) · GE 36 · AbilitySet 11 · GameplayCue 21 (이전 13 → 21 정정) · Phase 6 · TagRel 1 · AttributeSet 4 (+엔진 `AbilitySystemTestAttributeSet` 1) · PawnData 6 · `AS_InstantHeal` 은 LyraAbilitySet 인스턴스 (AttributeSet 아님). 남은 partial 은 본 문서 "남은 partial" 절에 구체 목록. |
| [`project/gas-learning-section-plan.md`](project/gas-learning-section-plan.md) | 섹션 설계 | GAS 학습 문서를 9개 섹션 (ASC 초기화 / AbilitySet / 활성 정책 / 태그 관계 / 데미지 파이프라인 / Cue / GamePhase / 글로벌+Context) 으로 나누는 권장 목차, HTML 산출물 대응표 (**GAS HTML 9 페이지 예정 - 본 시점 미생성**), 검증 등급 유지 항목, 독자별 학습 경로 |

## 시스템 추가 절차

새 시스템 분석을 본 레포에 추가할 때:

1. 시스템 식별자 (`<system>` slug) 를 정한다 - 영문 소문자 단어, 필요 시 하이픈. 예: `gas`, `experience`, `equipment`, `game-features`.
2. 시스템 폴더는 만들지 않는다 - `project/` 안에 평면으로, 파일명 접두어 `<system>-` 로만 구분.
3. **표준 4종 문서** 를 `project/` 에 작성한다 - `project/<system>-code-analysis.md`, `project/<system>-blueprint-analysis.md`, `project/<system>-learning-section-plan.md`, (선택) `project/<system>-references.md`. 5단계 절차·품질 규칙은 [`common/documentation-workflow.md`](common/documentation-workflow.md) 참고.
4. 본 인덱스의 "시스템별 검증 원장" 절 안에 새 `### <시스템 이름> (<system>)` 절을 추가한다 - 시스템 우선순위에 맞는 위치에 (알파벳 순서 같은 기계적 정렬 금지).
5. (HTML 산출 시) `html/index.html` 에도 같은 시스템의 새 `<section>` 을 추가한다 - 사양 [`common/dynamic-html-spec.md`](common/dynamic-html-spec.md) 의 "다중 시스템 구조" 참고.

## 다른 UE 프로젝트 분석을 시작할 때

이 레포는 라이라 한 프로젝트 전용입니다. 다른 UE 프로젝트 분석은 별도 레포에서:

1. 새 레포에 빈 `docs/` 폴더를 만들고 `docs/common/` + `docs/project/` 두 하위 폴더를 만든다.
2. 본 레포의 `docs/common/` 폴더를 통째로 카피한다 (3 파일) - 본문은 일반 placeholder (`<프로젝트 핵심 심볼>` · `<프로젝트 루트 절대 경로>` · `<project>-<system>-...html`) 와 "예시 (라이라)" 라벨로 작성돼 있어 그대로 적용 가능. 라이라 예시 문장은 새 프로젝트의 예시로 교체하면 된다 (정책 본문은 수정 불필요).
3. `docs/tools/` 의 정책 검사 스크립트 (`check-doc-links.cjs`, `check-special-chars.cjs`, `wrap-tables.cjs`, `verify-html.cjs`) 와 `package.json` 도 함께 카피한다. `verify-html.cjs` 사용 시 `cd docs/tools && npm install` 로 puppeteer-core 설치 필요.
4. 자기 프로젝트의 `docs/project/architecture-overview.md` · `docs/project/project-verification.md` 를 새로 작성한다 - 라이라 본문을 참고 템플릿으로 쓰되 내용은 새 프로젝트 사실로 교체.
5. 위 "시스템 추가 절차" 를 따라 시스템별 분석을 `docs/project/` 에 추가한다.
6. 본 인덱스 패턴을 참고해 그 레포의 `docs/README.md` 를 작성한다.
7. **루트 `CLAUDE.md` 는 통째 복사 대상이 아니다 - 표 *구조* 만 템플릿으로 재사용**. 프로젝트 개요·엔진 버전·핵심 시스템·사용자 선호·시작 문서 경로는 새 레포에 맞게 본문을 다시 작성한다. 그대로 카피하면 라이라 사실이 새 프로젝트로 새어 들어간다.
