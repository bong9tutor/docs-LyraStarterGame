# 라이라(Lyra) Gameplay Ability System (GAS) - 온라인 참고 문서 모음

> 라이라의 GAS 적용 (`ULyraAbilitySystemComponent` · `ULyraAbilitySet` · `ULyraGameplayAbility` · `ULyraAttributeSet` · `ULyraGameplayCueManager` · `ULyraGamePhaseSubsystem`) 을 **분석·학습** 하고 메뉴얼을 작성할 때 참고할 공식·권위 있는 온라인 문서 목록입니다.
> 작업 개요·분석 도구·아키텍처는 루트 [`../CLAUDE.md`](../CLAUDE.md) 를, 실제 에셋/코드 조회는 Monolith·라이더 MCP 를 사용하십시오.
>
> - 기준 엔진 버전: **UE 5.7** — `dev.epicgames.com` 문서는 페이지 우측 상단에서 버전 선택 가능
> - 링크 최종 확인: **2026-05-25**

## 핵심 이해 — 라이라 GAS 란

라이라의 GAS 는 **Epic 공식 GAS 위에 라이라 정책 레이어를 얇게 얹은 형태** 입니다. 시스템의 책임은 다섯 갈래로 나뉩니다.

- **ASC 보유 위치 3종** — 일반 플레이어는 `ALyraPlayerState`, GamePhase 는 `ALyraGameState`, 자기 자신 ASC 캐릭터는 `ALyraCharacterWithAbilities`. 모두 같은 `ULyraAbilitySystemComponent` 를 사용하지만 owner/avatar 관계가 다릅니다.
- **AbilitySet (`ULyraAbilitySet`)** — 어빌리티 + 이펙트 + AttributeSet 묶음을 한 번에 grant 하고 `FLyraAbilitySet_GrantedHandles` 로 회수. 모듈형 부여의 핵심.
- **태그 관계 (`ULyraAbilityTagRelationshipMapping`)** — 어빌리티 사이의 차단·취소·필수·금지 관계를 데이터로 표현. 라이라 측 ASC 확장의 핵심 차이점.
- **활성화 그룹 (`ELyraAbilityActivationGroup`)** — `Independent` / `Exclusive_Replaceable` / `Exclusive_Blocking` 3종으로 어빌리티 동시 실행 정책 표현.
- **GamePhase (`ULyraGamePhaseSubsystem` + `ULyraGamePhaseAbility`)** — 게임 페이즈를 어빌리티 + 게임플레이 태그 계층으로 표현. 부모-자식 페이즈 동시 활성 가능, 형제 페이즈는 상호 배타.

추가로 **`ULyraGlobalAbilitySystem`** 가 모든 ASC 에 어빌리티/이펙트를 일괄 적용·해제할 수 있는 월드 서브시스템으로 존재합니다.

## 사용법

1. 분석할 GAS 주제를 아래 목록에서 찾습니다.
2. 공식 문서로 **개념** 을 학습합니다.
3. [섹션 5: 문서 ↔ 프로젝트 매핑](#5-문서--프로젝트-매핑) 으로 라이라의 실제 구현 위치를 찾습니다.
4. Monolith (`gas_query` · `blueprint_query` · `project_query`) · 라이더 MCP 로 해당 에셋/코드를 조회해 **문서 내용과 교차 검증** 합니다.

---

## 1. 공식 라이라 문서 (최우선)

### ⭐ Lyra Sample Game
<https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine>

라이라 프로젝트 전체 개요. GAS 가 Experience·장비·UI 시스템과 어떻게 맞물리는지의 큰 그림.

### Combat with the Gameplay Ability System in Lyra Sample Game
<https://dev.epicgames.com/documentation/en-us/unreal-engine/combat-with-the-gameplay-ability-system-in-lyra-sample-game>

라이라의 **데미지 / 힐 파이프라인** 1차 기준 문서. `ULyraCombatSet` (BaseDamage / BaseHeal) → `ULyraDamageExecution` / `ULyraHealExecution` → `ULyraHealthSet` (Damage / Healing → Health) 흐름과 데미지 감쇠 (`GetDistanceAttenuation` · `GetPhysicalMaterialAttenuation`) 의 라이라 적용을 설명.

### Items and Inventory in Lyra Sample Game
<https://dev.epicgames.com/documentation/en-us/unreal-engine/items-and-inventory-in-lyra-sample-game>

`ULyraInventoryItemDefinition` / `InventoryFragment_*` 의 데이터 조립. `ULyraAbilityCost_InventoryItem` · `ULyraAbilityCost_ItemTagStack` 의 의도를 보려면 함께 참고.

### Lyra Sample Game Weapons
<https://dev.epicgames.com/documentation/en-us/unreal-engine/weapons-in-lyra-sample-game>

`ULyraRangedWeaponInstance` + `ULyraGameplayAbility_RangedWeapon` + `ULyraWeaponStateComponent`. weapon ability 의 `ELyraAbilityTargetingSource` 6종과 cartridge ID 흐름.

---

## 2. 라이라가 사용하는 UE GAS 시스템

각 항목은 *공식 문서 + 라이라에서의 쓰임* 순으로 정리.

### Gameplay Ability System (전체 개요)
<https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-for-unreal-engine>

GAS 의 5대 컴포넌트 (ASC · GameplayAbility · GameplayEffect · GameplayCue · AttributeSet) 개요. 라이라는 이 5종 모두를 사용하며 각각에 얇은 라이라 베이스를 얹습니다.

### Ability System Component
<https://dev.epicgames.com/documentation/en-us/unreal-engine/ability-system-component>

ASC 의 책임과 boilerplate. 라이라 측 `ULyraAbilitySystemComponent` 는 위에 (a) `TagRelationshipMapping` 적용, (b) `ELyraAbilityActivationGroup` 별 동시 활성 카운트 관리, (c) `AbilityInputTagPressed/Released` 의 InputTag 기반 입력 라우팅, (d) `OnPawnAvatarSet` 콜백 디스패치, (e) `TryActivateAbilitiesOnSpawn` 자동 실행을 얹습니다.

### Using Gameplay Abilities
<https://dev.epicgames.com/documentation/en-us/unreal-engine/using-gameplay-abilities-in-unreal-engine>

`UGameplayAbility` 의 lifecycle (Grant → Activate → Commit → End). 라이라는 `ULyraGameplayAbility` 베이스에 `ELyraAbilityActivationPolicy` (OnInputTriggered / WhileInputActive / OnSpawn) 와 `ELyraAbilityActivationGroup` (Independent / Exclusive_Replaceable / Exclusive_Blocking) 두 enum 으로 추가 정책을 둡니다.

### Gameplay Effects
<https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-effects-for-the-gameplay-ability-system-in-unreal-engine>

GameplayEffect 의 종류 (Instant / Duration / Infinite / Periodic) 와 modifier · execution · stacking. 라이라는 데미지/힐을 modifier 가 아니라 **execution calculation** (`ULyraDamageExecution` · `ULyraHealExecution`) 으로 계산해 `BaseDamage` → `Damage` 메타 어트리뷰트로 보냄.

### Gameplay Effect Execution Calculations
<https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-effect-calculations-in-unreal-engine>

라이라 `LyraDamageExecution::Execute_Implementation` 의 1차 참고. `FGameplayEffectAttributeCaptureDefinition` 으로 source 의 `BaseDamage` 를 capture, distance / physical material attenuation 적용, team check (`ULyraTeamSubsystem::CanCauseDamage`), 최종 `Damage` modifier 출력.

### Attribute Sets
<https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-attributes-and-attribute-sets-for-the-gameplay-ability-system-in-unreal-engine>

`UAttributeSet` 의 기본 + `ATTRIBUTE_ACCESSORS` 매크로 패턴. 라이라는 `ULyraAttributeSet` 베이스 + `ULyraHealthSet` (Health · MaxHealth · Healing · Damage 메타) + `ULyraCombatSet` (BaseDamage · BaseHeal) 로 분리. `Healing` 과 `Damage` 는 **메타 어트리뷰트** (`HideFromModifiers`) — execution 만 수정 가능, 곧바로 `Health` 에 +/- 로 매핑.

### Gameplay Cues
<https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-cues-for-the-gameplay-ability-system-in-unreal-engine>

이펙트 적용 시 trigger 되는 음향/시각 효과. 라이라는 `ULyraGameplayCueManager` (UGameplayCueManager 파생) 로 delay-load + async load 정책을 구현. 13개 `GCN_*` (GameplayCueNotify) 자산이 라이라 코어 + ShooterCore + TopDownArena 에 분산.

### Gameplay Tags
<https://dev.epicgames.com/documentation/en-us/unreal-engine/using-gameplay-tags-in-unreal-engine>

라이라는 네이티브 태그 (`LyraGameplayTags.h` 의 `UE_DECLARE_GAMEPLAY_TAG_EXTERN`) 와 ini 정의 태그 (`Config/DefaultGameplayTags.ini`) 를 함께 사용. 99개 line `+GameplayTagList=` 정의 + ShooterCore tag ini 62 line.

### Ability Tasks
<https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-tasks-in-unreal-engine>

`UAbilityTask_*` 의 비동기 실행 노드. 라이라는 `UAbilityTask_PlayMontageAndWait`, `UAbilityTask_WaitGameplayEvent`, `WaitInputPress/Release` 등을 BP 어빌리티에서 사용.

### Gameplay Ability Target Data
<https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-targeting-in-unreal-engine>

`FGameplayAbilityTargetData` 의 종류와 RPC 직렬화. 라이라는 `FLyraGameplayAbilityTargetData_SingleTargetHit` (Cartridge ID 추가 필드) 를 사용 — 같은 발사 카트리지의 여러 hit 를 식별.

---

## 3. 라이라가 사용하는 GAS 보조 시스템

### IGameplayTagAssetInterface
<https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/GameplayTags/IGameplayTagAssetInterface>

actor 가 owned tag 를 노출하는 인터페이스. 라이라 `ALyraTaggedActor` 가 구현 — `StaticGameplayTags` 컨테이너를 노출해 GE / Ability 의 source/target tag 평가에 사용.

### Ability System Globals
<https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/GameplayAbilities/UAbilitySystemGlobals>

`UAbilitySystemGlobals` 의 라이라 파생 `ULyraAbilitySystemGlobals` 는 `FGameplayEffectContext` 의 라이라 변형 (`FLyraGameplayEffectContext`) 을 발급하도록 오버라이드. 이 컨텍스트가 `CartridgeID` + `AbilitySourceObject` (`ILyraAbilitySourceInterface`) 를 들고 다님.

### World Subsystem
<https://dev.epicgames.com/documentation/en-us/unreal-engine/world-subsystems-in-unreal-engine>

라이라는 두 GAS 관련 월드 서브시스템을 둠 — `ULyraGlobalAbilitySystem` (모든 ASC 에 일괄 적용) 과 `ULyraGamePhaseSubsystem` (게임 페이즈 ability 시작/관찰).

---

## 4. 학습 자료 (커뮤니티)

### Tom Looman의 GAS 가이드
<https://www.tomlooman.com/unreal-engine-gameplay-ability-system-guide/>

GAS 입문의 사실상 표준 가이드. 라이라 분석 전 GAS 개념을 한 번 정리해 두면 좋음.

### GAS Documentation by tranek
<https://github.com/tranek/GASDocumentation>

GitHub 의 GAS 비공식 종합 문서. ASC 복제 모드, 예측, EffectContext 직렬화, AbilityTask 작성법 등 라이라 코드 분석에서 자주 마주치는 boilerplate 의 1차 참고.

### Exploring Lyra — Combat (커뮤니티 튜토리얼)
<https://dev.epicgames.com/community/learning/tutorials/>

Epic Developer Community 의 라이라 분해·디버깅 튜토리얼 시리즈 (UI · 애니메이션 등). 본 시점 라이라 전체 시리즈 색인을 검색하면 GAS 관련 편을 찾을 수 있음.

---

## 5. 문서 ↔ 프로젝트 매핑

온라인 개념을 라이라 프로젝트의 실제 구현으로 연결합니다. 분석 시 이 표를 출발점으로 삼으십시오.

| 온라인 개념 | 라이라 구현 위치 | 조회 도구 |
|-------------|------------------|-----------|
| `UAbilitySystemComponent` 파생 | `Source/LyraGame/AbilitySystem/LyraAbilitySystemComponent.h/.cpp` | 라이더 MCP |
| `UGameplayAbility` 파생 | `Source/LyraGame/AbilitySystem/Abilities/LyraGameplayAbility.h` + `_Death/_Jump/_Reset` | 라이더 MCP |
| Weapon ability 파생 | `Source/LyraGame/Weapons/LyraGameplayAbility_RangedWeapon.h` (← `LyraGameplayAbility_FromEquipment`) | 라이더 MCP |
| `UPrimaryDataAsset` AbilitySet | `Source/LyraGame/AbilitySystem/LyraAbilitySet.h/.cpp` — `GrantedGameplayAbilities` · `GrantedGameplayEffects` · `GrantedAttributes` 세 묶음 | 라이더 MCP |
| `UAttributeSet` 파생 | `Source/LyraGame/AbilitySystem/Attributes/LyraAttributeSet.h` (베이스), `LyraHealthSet.h` (Health · MaxHealth · Damage · Healing), `LyraCombatSet.h` (BaseDamage · BaseHeal) | 라이더 MCP |
| `UGameplayEffectExecutionCalculation` 파생 | `Source/LyraGame/AbilitySystem/Executions/LyraDamageExecution.h/.cpp` · `LyraHealExecution.h/.cpp` | 라이더 MCP |
| 태그 관계 매핑 (block / cancel / required / blocked) | `Source/LyraGame/AbilitySystem/LyraAbilityTagRelationshipMapping.h/.cpp` + `Plugins/.../ShooterCore/Content/Game/TagRelationships_ShooterHero.uasset` | 라이더 MCP + Monolith `blueprint_query.get_cdo_properties` |
| `UGameplayCueManager` 파생 | `Source/LyraGame/AbilitySystem/LyraGameplayCueManager.h/.cpp` (delay-load 정책) | 라이더 MCP |
| `FGameplayEffectContext` 파생 | `Source/LyraGame/AbilitySystem/LyraGameplayEffectContext.h/.cpp` + `FLyraGameplayEffectContext::CartridgeID` 필드 | 라이더 MCP |
| Ability source interface (감쇠 계산) | `Source/LyraGame/AbilitySystem/LyraAbilitySourceInterface.h` (`GetDistanceAttenuation` · `GetPhysicalMaterialAttenuation`) | 라이더 MCP |
| GamePhase 시스템 | `Source/LyraGame/AbilitySystem/Phases/LyraGamePhaseAbility.h/.cpp` · `LyraGamePhaseSubsystem.h/.cpp` + `Plugins/.../Experiences/Phases/Phase_*.uasset` (Warmup/Playing/PostGame) | 라이더 MCP + Monolith |
| Global ASC 일괄 적용 | `Source/LyraGame/AbilitySystem/LyraGlobalAbilitySystem.h/.cpp` | 라이더 MCP |
| `IGameplayTagAssetInterface` 구현 | `Source/LyraGame/AbilitySystem/LyraTaggedActor.h/.cpp` | 라이더 MCP |
| Ability cost (인벤토리 / tag stack) | `Source/LyraGame/AbilitySystem/Abilities/LyraAbilityCost_*.h/.cpp` 3종 (`InventoryItem` · `ItemTagStack` · `PlayerTagStack`) | 라이더 MCP |
| 네이티브 태그 정의 | `Source/LyraGame/LyraGameplayTags.h/.cpp` (`Ability_ActivateFail_*` · `InitState_*` · `GameplayEvent_Death/Reset/RequestReset` · `SetByCaller_Damage/Heal` · `Status_Death*` 등) | `Read` (.h 파일) |
| ini 정의 태그 | `Config/DefaultGameplayTags.ini` (99 line) + `Plugins/.../ShooterCore/Config/Tags/ShooterCoreTags.ini` (62 line) | `Read` (.ini 파일) |
| Pawn 측 AbilitySet 부여 | `Source/LyraGame/Character/LyraPawnData.h` 의 `AbilitySets[]` + `Source/LyraGame/Character/LyraPawnExtensionComponent.cpp` 의 `InitializeAbilitySystem` (`SetTagRelationshipMapping`) | 라이더 MCP |
| PlayerState 측 ASC | `Source/LyraGame/Player/LyraPlayerState.h/.cpp` (`IAbilitySystemInterface` 구현, `AbilitySystemComponent` 보유) | 라이더 MCP |
| 자기 ASC 캐릭터 변형 | `Source/LyraGame/Character/LyraCharacterWithAbilities.h/.cpp` (`InitAbilityActorInfo(this, this)`) | 라이더 MCP |
| AbilitySet 데이터 자산 | `*/AbilitySet_*.uasset` 11개 (Plugins/ShooterCore 8 + ShooterExplorer 1 + TopDownArena 1 + Content/Weapons 1) | Monolith `project_query.find_by_type` |
| GameplayAbility BP (검색 패턴) | `*/GA_*.uasset` — 라이라 코어 + 3개 Game Feature 플러그인에 분산 | Monolith `gas_query.list_abilities` (GAS 인덱스 등록 자산) / `get_ability_info` |
| GameplayEffect BP (검색 패턴) | `*/GE_*.uasset` | Monolith `gas_query.list_gameplay_effects` / `get_gameplay_effect` |
| AttributeSet (C++ 클래스) | `Source/LyraGame/AbilitySystem/Attributes/` — Lyra 4종 + 엔진/테스트 1종 (`AbilitySystemTestAttributeSet`, 게임플레이 범위 밖) | Monolith `gas_query.list_attribute_sets(include_plugins=true)` |
| GameplayCueNotify BP (검색 패턴) | `*/GCN_*.uasset` (burst 1회) + `*/GCNL_*.uasset` (looping 지속) + `*/GC_*.uasset` (단일 효과) | Monolith `gas_query.list_gameplay_cues` |
| GamePhase ability BP (검색 패턴) | `*/Phase_*.uasset` — ShooterCore + TopDownArena 두 모드 공유 `ShooterGame.GamePhase.*` 태그 | Monolith `blueprint_query.get_cdo_properties` (parent = `LyraGamePhaseAbility`) |
| Hero pawn BP | `B_Hero_Default` · `B_Hero_ShooterMannequin` · `B_Hero_Explorer` · `B_Hero_Arena` — `LyraPawnData` 가 AbilitySet 부여 | Monolith `blueprint_query.get_cdo_properties` |

> **자산 수량·검증된 CDO·이름 접두어 규칙은 본 참고 문서가 아니라 [`gas-blueprint-analysis.md`](gas-blueprint-analysis.md) (단일 기준 원장) 를 참조** 하십시오. 본 문서는 공식 문서 ↔ 프로젝트 매핑만 유지하고, 수량·상세 사실은 원장 갱신 시 자동으로 따라옵니다.
> **`AS_*` 접두어는 라이라에서 AttributeSet 을 뜻하지 않습니다** — `/Game/Environments/Gameplay/AS_InstantHeal` 은 `LyraAbilitySet` 인스턴스. AttributeSet 은 C++ 클래스 4종 (`LyraAttributeSet`/`LyraCombatSet`/`LyraHealthSet`/`TopDownArenaAttributeSet`) 만이고 데이터 자산으로 노출되지 않습니다.
> 콘텐츠 경로·에셋 이름은 라이라 버전에 따라 다를 수 있습니다. 정확한 경로는 Monolith `project_query` 로 확인하십시오.
