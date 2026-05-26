# Lyra 아키텍처 개요 — 5대 시스템과 분석 시 주의사항

> 이 문서는 LyraStarterGame 의 핵심 시스템이 **왜 그렇게 설계되었고, 어떻게 동작하는지** 산문으로 설명합니다.
> 파일 경로·메타데이터의 **검증 표** 는 [`project-verification.md`](project-verification.md) 가 단일 출처입니다 — 두 문서는 같은 시스템을 서로 다른 각도로 봅니다.
>   - verification.md: "이 사실이 참인가? 어느 파일이 근거인가?"
>   - 본 문서: "이게 무슨 의미인가? 시스템이 왜 이렇게 조립되었는가?"
>
> CLAUDE.md 는 매 turn 의 행동 규칙만 두고, **아키텍처 산문은 이 문서가 단일 출처** 입니다.

## 한 줄 요약

Lyra 의 핵심은 **하드코딩이 아닌 데이터 주도 + 모듈형 조립**입니다. 아래 다섯 시스템의 상호작용을 이해하면 전체 그림이 잡힙니다.

| 시스템 | 한 줄 |
|--------|------|
| **Experience** | 맵이 고정된 게임 모드를 갖지 않고, 런타임에 데이터 에셋으로 게임플레이를 선택·조립 |
| **Game Features** | 각 게임 모드 기능을 플러그인으로 분리해 Experience 가 요청할 때만 로드 |
| **Pawn 초기화** | 폰을 여러 컴포넌트로 조립하고 단계적 초기화 상태로 동기화 |
| **GAS** | 어빌리티·이펙트·속성·태그를 데이터로 묶어 부여·회수 |
| **Animation** | C++ 는 얇은 조율, 실제 로코모션 로직은 블루프린트 ABP 안 |

---

## 1. Experience 시스템 — 모듈형 게임 모드

하나의 맵이 고정된 게임 모드를 갖지 않습니다. 런타임에 **Experience**(데이터 에셋)를 로드해 게임플레이를 조립합니다.

- `ULyraExperienceDefinition` (`GameModes/`) — `UPrimaryDataAsset`. 활성화할 **Game Feature 플러그인 목록**, **`DefaultPawnData`**, 실행할 **`UGameFeatureAction` 목록**, 조합할 `ULyraExperienceActionSet` 들을 정의.
- `ULyraExperienceManagerComponent` — GameState 에 부착. Experience 와 그것이 요구하는 Game Feature 플러그인을 비동기 로드/활성화하고 완료를 브로드캐스트.
- `ALyraGameMode` / `ALyraGameState` — `ALyraGameMode` 가 월드 세팅·플레이리스트·커맨드라인 등에서 Experience 를 선택하고, `DefaultPawnData` 기반으로 폰을 스폰.
- `ULyraUserFacingExperienceDefinition` — 프론트엔드 메뉴에 노출되는 매치메이킹/플레이리스트용 래퍼.
- `AsyncAction_ExperienceReady` — 블루프린트에서 Experience 로드 완료를 대기하는 진입점.
- 핵심 콘텐츠: `Content/System/Experiences/B_LyraDefaultExperience`, `Plugins/GameFeatures/ShooterCore/Content/Experiences/`.

## 2. Game Features / Modular Gameplay

각 게임 모드 기능은 **Game Feature 플러그인**(`Plugins/GameFeatures/`)으로 분리되어, Experience 가 요청할 때만 로드됩니다: `ShooterCore`, `ShooterMaps`, `ShooterTests`, `ShooterExplorer`, `TopDownArena`.

- Experience 가 실행하는 액션들이 게임플레이를 "주입"합니다 — `Source/LyraGame/GameFeatures/` 의 `UGameFeatureAction_*`: `AddAbilities`, `AddInputBinding`, `AddInputContextMapping`, `AddWidget`, `AddGameplayCuePath`, `SplitscreenConfig` (다수가 `WorldActionBase` 상속).
- `ULyraGameFeaturePolicy` — 프로젝트의 Game Feature 로딩 정책.
- **로딩 특성:** 각 Game Feature 플러그인의 `.uplugin` 은 `"ExplicitlyLoaded": true` + `"EnabledByDefault": false` 로 설정되어 있어, 프로젝트 시작 시 자동 로드되지 않고 **Experience 가 요청할 때만 로드·활성화**됩니다. 이것이 "필요한 기능만 조립"하는 모듈형 설계의 핵심입니다.

## 3. Pawn/Character 초기화 — GameFrameworkComponentManager Init State

폰은 여러 컴포넌트로 조립되며, 컴포넌트들은 `IGameFrameworkInitStateInterface` 를 통해 **단계적 초기화 상태**를 동기화합니다. 상태 순서(`LyraGameplayTags.h` 의 네이티브 태그):

`InitState_Spawned` → `InitState_DataAvailable` → `InitState_DataInitialized` → `InitState_GameplayReady`

- `ULyraPawnExtensionComponent` (`Character/`) — **모든 폰의 초기화 조율자(coordinator)**. `ULyraPawnData` 를 보유하고, ASC 등록/해제를 중개하며 다른 컴포넌트의 초기화 진행을 게이팅.
- `ULyraHeroComponent` — 플레이어(또는 플레이어를 모사하는 봇) 전용. Enhanced Input 바인딩과 카메라 모드 결정을 담당. `PawnExtensionComponent` 에 의존.
- `ULyraPawnData` (`UPrimaryDataAsset`) — 폰을 정의하는 불변 데이터: `PawnClass`, `AbilitySets`, `InputConfig`, `DefaultCameraMode`, `TagRelationshipMapping`.
- 폰 클래스: `ALyraCharacter`(+`ULyraCharacterMovementComponent`, `ULyraHealthComponent`), `ALyraPawn`, `ALyraCharacterWithAbilities`(ASC 를 폰이 직접 소유 — 보통은 PlayerState 소유).

## 4. Gameplay Ability System (GAS)

- `ULyraAbilitySystemComponent` — 보통 `ALyraPlayerState` 가 소유하고 폰이 아바타가 됨.
- `ULyraAbilitySet` (`UPrimaryDataAsset`) — 어빌리티/이펙트/AttributeSet 묶음을 한 번에 부여하고, `FLyraAbilitySet_GrantedHandles` 로 회수.
- `ULyraGameplayAbility` 및 파생: `_Death`, `_Jump`, `_Reset`, `Weapons/LyraGameplayAbility_RangedWeapon`, `Equipment/LyraGameplayAbility_FromEquipment`.
- AttributeSet: `Attributes/` — `ULyraHealthSet`, `ULyraCombatSet`, 베이스 `ULyraAttributeSet`. 데미지/힐 계산은 `Executions/LyraDamageExecution`·`LyraHealExecution`(`UGameplayEffectExecutionCalculation`).
- `ULyraAbilityTagRelationshipMapping` — 태그 기반으로 어빌리티를 서로 차단/취소.
- 게임 흐름은 `Phases/` 의 `ULyraGamePhaseSubsystem` + `ULyraGamePhaseAbility` 로 단계 관리(워밍업/플레이/종료 등).

## 5. 애니메이션 시스템 (이 프로젝트의 중점)

C++ 측은 **얇은 조율 계층**이고, 실제 로코모션 로직은 블루프린트 ABP 안에 있습니다 — 그래서 Monolith `animation_query`/`blueprint_query` 분석이 필수입니다.

- `ULyraAnimInstance` (`Animation/`) — 베이스 `UAnimInstance`. `FGameplayTagBlueprintPropertyMap` 으로 **GAS 게임플레이 태그를 ABP 변수에 자동 미러링**(태그 추가/제거 시 bool 변수 자동 갱신 — ABP 에서 수동 태그 쿼리 금지). `ULyraCharacterMovementComponent::GetGroundInfo()` 에서 `GroundDistance` 를 노출.
- 코스메틱 기반 애니메이션 선택 — `Cosmetics/LyraCosmeticAnimationTypes.h`:
  - `FLyraAnimLayerSelectionSet` — 코스메틱 게임플레이 태그에 따라 **Linked Anim Layer**(`UAnimInstance` 서브클래스)를 선택.
  - `FLyraAnimBodyStyleSelectionSet` — 코스메틱 태그에 따라 `USkeletalMesh`(+강제 `UPhysicsAsset`)를 선택.
- 캐릭터 파츠/코스메틱: `Cosmetics/LyraPawnComponent_CharacterParts`, `LyraControllerComponent_CharacterParts` — 어떤 메시/애니 레이어를 적용할지 구동.
- 고급 애니메이션 기능 플러그인(활성): `AnimationLocomotionLibrary`, `AnimationWarping`, `ContextualAnimation`. 무기별 애니 레이어는 `Equipment` 시스템과 연동.
- 애니메이션 콘텐츠: `Content/Characters/Heroes/Mannequin`, `Mannequin_UE4`.

## 그 외 주요 시스템

- **카메라** (`Camera/`) — 스택 기반. `ULyraCameraComponent` 가 `ULyraCameraMode`(`_ThirdPerson` 등)를 블렌딩. 어빌리티가 `ULyraHeroComponent::SetAbilityCameraMode()` 로 카메라를 일시 오버라이드.
- **Input** (`Input/`) — Enhanced Input. `ULyraInputConfig` 가 `InputAction` ↔ 게임플레이 태그를 매핑, `ULyraInputComponent` 가 태그로 어빌리티를 바인딩. 입력 매핑은 GameFeature 액션이 주입.
- **Equipment / Inventory / Weapons** — `ULyraInventoryItemDefinition` + `InventoryFragment_*`(데이터 조립), `ULyraEquipmentManagerComponent` / `ULyraQuickBarComponent`, `ULyraWeaponInstance` / `ULyraRangedWeaponInstance` / `ULyraWeaponStateComponent`.
- **Teams** (`Teams/`) — `ULyraTeamSubsystem`, `ILyraTeamAgentInterface`, `ULyraTeamInfoBase`(Public/Private 복제 분리), `ULyraTeamDisplayAsset`.
- **UI** (`UI/`) — **CommonUI** 기반. `ULyraActivatableWidget`, `ALyraHUD` + `ULyraHUDLayout`, `ULyraTaggedWidget`. 위젯은 `UIExtension` 플러그인 + `GameFeatureAction_AddWidget` 으로 슬롯에 주입. 설정 화면은 `GameSettings` 플러그인 사용.
- **메시징** — `GameplayMessageRouter` 플러그인의 `UGameplayMessageSubsystem` 으로 시스템 간 디커플링된 pub/sub(직접 참조 회피).
- **System 계층** (`System/`) — `ULyraAssetManager`(커스텀 `UAssetManager`, 시작 작업 큐), `ULyraGameData`(전역 데이터 에셋, `Content/DefaultGameData`), `ULyraGameInstance` / `ULyraGameEngine`, `ULyraReplicationGraph`(네트워크 릴리번시 최적화), `ULyraSignificanceManager`. `GameplayTagStack` — 복제되는 태그-카운트 컨테이너.

---

## 분석 시 알아둘 프로젝트 고유 사항

분석 도구의 사용 정책은 [`analysis-tools.md`](../common/analysis-tools.md), 파일 경로·메타데이터의 검증 표는 [`project-verification.md`](project-verification.md) 를 참고하십시오. 이 절은 두 문서에 들어가지 않는 **분석할 때 자주 발이 걸리는 프로젝트 고유 사실** 만 모았습니다.

- **파일 도구로 안 보이는 것들:** `.claudeignore` 가 `Binaries`/`Intermediate`/`Saved`/`DerivedDataCache`/`*.sln`/`Plugins/Developer/*` 등을 제외합니다. `Content/` 는 제외하지 않으므로 `.uasset` 경로는 `Glob` 로 보이지만, 바이너리라서 내용은 Monolith 로만 조회할 수 있습니다.
- **Content 폴더 출처:** 표준 Lyra 콘텐츠는 Epic Games Launcher / Fab 에서 받은 샘플 에셋입니다(루트 `README.md` 참조).
- **개발자 작업 폴더:** `Content/Developers/bong9/` 는 개인 작업 공간 — 분석 시 Epic 원본 샘플 에셋과 구분하십시오.
- **게임플레이 태그가 핵심 연결고리:** 네이티브 태그는 `LyraGameplayTags.h/.cpp` 에 `UE_DECLARE_GAMEPLAY_TAG_EXTERN` 으로 선언됩니다(`InitState_*`, `InputTag_*`, `Status_*`, `Movement_Mode_*` 등). 그 외 태그는 `Config/DefaultGameplayTags.ini` 및 각 플러그인 `Config/Tags/*.ini` 에 정의됩니다. 시스템 간 동작은 대부분 태그로 연결되므로 분석의 출발점으로 삼으십시오.
- **C++ 헤더를 읽을 때:** 일부 모듈은 `#define UE_API <MODULE>_API` 매크로로 export 를 표기합니다(`ULyraPawnExtensionComponent` 등) — `LYRAGAME_API` 와 같은 의미. `.cpp` 끝의 `#include UE_INLINE_GENERATED_CPP_BY_NAME(...)` 는 엔진 표준 관용구입니다.
- **로그 카테고리:** 런타임 동작 추적의 단서는 `LyraLogChannels.h` 의 로그 카테고리(`LogLyra` 등)에서 시작합니다.
