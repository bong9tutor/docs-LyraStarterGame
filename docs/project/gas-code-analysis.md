# Lyra GAS 코드 분석

확인일: 2026-05-25  
분석 도구: 라이더(JetBrains) MCP (`mcp__jetbrains__*`) — Rider 가 이 프로젝트를 열고 있는 상태에서 수행  
분석 범위: `Source/LyraGame/AbilitySystem/` 전체 (15종 .h/.cpp) + 사용처 (`Source/LyraGame/Character/` · `Source/LyraGame/Player/` · `Source/LyraGame/GameModes/` · `Source/LyraGame/Equipment/` · `Source/LyraGame/Weapons/`)

## 핵심 요약

라이라의 GAS 코드는 Epic 표준 GAS 위에 **5가지 책임의 라이라 정책 레이어** 를 얹습니다.

- `ULyraAbilitySystemComponent`: Epic ASC 에 (a) `TagRelationshipMapping` 적용, (b) `ELyraAbilityActivationGroup` 별 동시 활성 카운트, (c) `AbilityInputTag*` 기반 InputTag 라우팅, (d) `OnPawnAvatarSet` / `TryActivateAbilitiesOnSpawn` 디스패치를 얹음.
- `ULyraAbilitySet` (`UPrimaryDataAsset`): 어빌리티 + 이펙트 + AttributeSet 세 묶음을 한 번에 grant. `FLyraAbilitySet_GrantedHandles` 로 회수 가능.
- `ULyraGameplayAbility`: 모든 라이라 어빌리티의 베이스. `ELyraAbilityActivationPolicy` 3종 (OnInputTriggered / WhileInputActive / OnSpawn) + `ELyraAbilityActivationGroup` 3종 + `AdditionalCosts[]` + `FailureTag` ↔ 메시지/몽타주 매핑.
- `ULyraAbilityTagRelationshipMapping` (`UDataAsset`): 어빌리티 태그 간의 block · cancel · required · blocked 관계를 데이터로 표현. ASC 가 매 활성화 시점에 조회.
- `ULyraGamePhaseSubsystem` (`UWorldSubsystem`): 게임 페이즈를 GameState 의 ASC 에 grant 되는 `ULyraGamePhaseAbility` + 게임플레이 태그 계층으로 관리. 부모-자식 페이즈 동시 활성, 형제 페이즈 자동 종료.

추가로 데미지/힐 파이프라인 (`ULyraDamageExecution` · `ULyraHealExecution`) 과 글로벌 ASC 일괄 적용 (`ULyraGlobalAbilitySystem`), 효과 컨텍스트 확장 (`FLyraGameplayEffectContext` 의 `CartridgeID`), ability source 인터페이스 (`ILyraAbilitySourceInterface`) 가 함께 GAS 의 라이라 측 표면을 구성합니다.

## 런타임 흐름

플레이어가 게임에 들어가서 어빌리티가 실행되기까지의 큰 흐름.

1. `ALyraPlayerState::PostInitializeComponents` 가 자체 `AbilitySystemComponent` 를 생성 — PS 가 owner 가 됨.
2. `ULyraPawnExtensionComponent` 가 init state `Spawned → DataAvailable → DataInitialized → GameplayReady` 를 진행시키며, `DataInitialized` 시점에 `InitializeAbilitySystem(ASC, OwnerActor)` 호출 (보통 owner = PS).
3. `InitializeAbilitySystem` 이 `ASC->InitAbilityActorInfo(InOwnerActor, Pawn)` + `ASC->SetTagRelationshipMapping(PawnData->TagRelationshipMapping)` 적용 → `OnAbilitySystemInitialized` delegate broadcast.
4. ASC 의 `InitAbilityActorInfo` 가 `bHasNewPawnAvatar` 분기 — 모든 어빌리티 인스턴스에 `OnPawnAvatarSet` 콜백, `ULyraGlobalAbilitySystem::RegisterASC`, `ULyraAnimInstance::InitializeWithAbilitySystem`, `TryActivateAbilitiesOnSpawn` 순서 실행.
5. `LyraPawnData::AbilitySets[]` 의 각 `ULyraAbilitySet` 이 grant 되어 `GrantedGameplayAbilities` · `GrantedGameplayEffects` · `GrantedAttributes` 가 ASC 에 등록 — 핸들은 `FLyraAbilitySet_GrantedHandles` 에 저장돼 나중에 일괄 회수 가능.
6. 입력이 들어오면 `ULyraInputComponent` 가 InputTag → ASC 의 `AbilityInputTagPressed/Released` 로 전달 → `InputPressedSpecHandles` 에 기록 → 다음 frame 의 `ProcessAbilityInput` 에서 매칭 어빌리티 활성화.
7. 어빌리티 활성화는 `ELyraAbilityActivationGroup` 검사 (`IsActivationGroupBlocked`) → `GetAdditionalActivationTagRequirements` (TagRelationshipMapping) → Epic 표준 `CanActivateAbility` → `ActivateAbility` 순서.
8. 어빌리티가 GE 를 적용 시 `MakeEffectContext` 가 `FLyraGameplayEffectContext` 발급 (`CartridgeID` 포함) → execution calculation 이 source/target attribute capture → 라이라 측 정책 (team check · distance attenuation · physical material) 적용 → 최종 modifier 출력.
9. GE 가 attribute 변경 → `PreGameplayEffectExecute` / `PostGameplayEffectExecute` 가 clamping · delegate 호출 → `OnHealthChanged` · `OnOutOfHealth` 등 broadcast → 죽음 처리는 `GameplayEvent.Death` 태그로 `ULyraGameplayAbility_Death` 자동 활성화.

## `ULyraAbilitySystemComponent`

파일:
- [`../Source/LyraGame/AbilitySystem/LyraAbilitySystemComponent.h`](../Source/LyraGame/AbilitySystem/LyraAbilitySystemComponent.h)
- [`../Source/LyraGame/AbilitySystem/LyraAbilitySystemComponent.cpp`](../Source/LyraGame/AbilitySystem/LyraAbilitySystemComponent.cpp)

Epic `UAbilitySystemComponent` 파생. 핵심 책임 5가지.

| 책임 | 멤버 / 함수 |
|------|------------|
| TagRelationshipMapping 적용 | `TObjectPtr<ULyraAbilityTagRelationshipMapping> TagRelationshipMapping`, `SetTagRelationshipMapping()`, `GetAdditionalActivationTagRequirements()` |
| 활성화 그룹 카운트 | `int32 ActivationGroupCounts[(uint8)ELyraAbilityActivationGroup::MAX]`, `IsActivationGroupBlocked()`, `AddAbilityToActivationGroup()`, `RemoveAbilityFromActivationGroup()`, `CancelActivationGroupAbilities()` |
| InputTag 라우팅 | `AbilityInputTagPressed(Tag)` / `Released(Tag)`, `InputPressedSpecHandles[]` · `InputReleasedSpecHandles[]` · `InputHeldSpecHandles[]`, `ProcessAbilityInput(DeltaTime, bGamePaused)`, `ClearAbilityInput()` |
| Pawn avatar 변경 디스패치 | `InitAbilityActorInfo()` 오버라이드 — `bHasNewPawnAvatar` 시점에 모든 어빌리티 인스턴스의 `OnPawnAvatarSet` 호출 + `ULyraGlobalAbilitySystem::RegisterASC` + `ULyraAnimInstance::InitializeWithAbilitySystem` + `TryActivateAbilitiesOnSpawn` |
| 실패 통지 | `NotifyAbilityFailed()` 오버라이드 → `ClientNotifyAbilityFailed` RPC → `HandleAbilityFailed` → 어빌리티의 `OnAbilityFailedToActivate` 호출 |

### 동적 태그 GE

`AddDynamicTagGameplayEffect(Tag)` / `RemoveDynamicTagGameplayEffect(Tag)` — `LyraGameData::DynamicTagGameplayEffect` (전역 GE 자산) 를 활용해 ASC 에 임시 태그 부여. 코드가 직접 `LooseGameplayTag` 를 추가하지 않고 GE 로 우회하므로 복제·예측이 자동.

### 입력 차단

`HasMatchingGameplayTag(TAG_Gameplay_AbilityInputBlocked)` 이면 `ProcessAbilityInput` 이 즉시 return — 어빌리티가 일시적으로 입력을 막을 때 사용.

### `OnRep_*` / NetSerialize

ASC 자체의 복제 정책은 Epic 표준 (`ReplicationMode = Full/Mixed/Minimal`). `ALyraPlayerState::PostInitializeComponents` 가 모드를 설정.

## `ULyraAbilitySet`

파일:
- [`../Source/LyraGame/AbilitySystem/LyraAbilitySet.h`](../Source/LyraGame/AbilitySystem/LyraAbilitySet.h)
- [`../Source/LyraGame/AbilitySystem/LyraAbilitySet.cpp`](../Source/LyraGame/AbilitySystem/LyraAbilitySet.cpp)

`UPrimaryDataAsset`. 라이라 모듈형 부여의 핵심.

### 데이터 구조

```cpp
USTRUCT() FLyraAbilitySet_GameplayAbility {
    TSubclassOf<ULyraGameplayAbility> Ability;
    int32 AbilityLevel = 1;
    FGameplayTag InputTag;          // Categories=InputTag
};
USTRUCT() FLyraAbilitySet_GameplayEffect {
    TSubclassOf<UGameplayEffect> GameplayEffect;
    float EffectLevel = 1.0f;
};
USTRUCT() FLyraAbilitySet_AttributeSet {
    TSubclassOf<UAttributeSet> AttributeSet;
};

UCLASS(Const) ULyraAbilitySet : UPrimaryDataAsset {
    TArray<FLyraAbilitySet_GameplayAbility> GrantedGameplayAbilities;
    TArray<FLyraAbilitySet_GameplayEffect>  GrantedGameplayEffects;
    TArray<FLyraAbilitySet_AttributeSet>    GrantedAttributes;
    void GiveToAbilitySystem(LyraASC, OutGrantedHandles, SourceObject) const;
};

USTRUCT() FLyraAbilitySet_GrantedHandles {
    TArray<FGameplayAbilitySpecHandle>   AbilitySpecHandles;
    TArray<FActiveGameplayEffectHandle>  GameplayEffectHandles;
    TArray<TObjectPtr<UAttributeSet>>    GrantedAttributeSets;
    void TakeFromAbilitySystem(LyraASC);
};
```

### GiveToAbilitySystem 흐름

1. `IsOwnerActorAuthoritative()` 검사 — server 만 grant 수행.
2. `GrantedAttributes[]` 각 항목 → `NewObject<UAttributeSet>(LyraASC->GetOwner(), ...)` → `LyraASC->AddAttributeSetSubobject`.
3. `GrantedGameplayAbilities[]` 각 항목 → `FGameplayAbilitySpec(AbilityCDO, Level)` + `SourceObject` + `DynamicSpecSourceTags.AddTag(InputTag)` → `LyraASC->GiveAbility(Spec)`.
4. `GrantedGameplayEffects[]` 각 항목 → `LyraASC->ApplyGameplayEffectToSelf(GameplayEffect, Level, MakeEffectContext())`.
5. 모든 단계의 결과 핸들은 `OutGrantedHandles` 에 저장.

### TakeFromAbilitySystem 흐름

`AbilitySpecHandles` → `ClearAbility`, `GameplayEffectHandles` → `RemoveActiveGameplayEffect`, `GrantedAttributeSets` → `RemoveSpawnedAttribute`. 모든 array reset.

### AbilitySet 부여 경로 2종 (✅ 코드 검증)

라이라에서 AbilitySet 이 ASC 에 grant 되는 경로는 **두 갈래로 분리**:

**경로 1 — Pawn 측 (영구 어빌리티)** — `LyraPawnData` 경유:
- `ULyraPawnData::AbilitySets[]` 에 영구 부여할 AbilitySet 등록.
- `ULyraPawnExtensionComponent::InitializeAbilitySystem` 가 `OnAbilitySystemInitialized` delegate 발화 → PS / GameMode 측 코드가 PawnData 의 AbilitySet 들을 ASC 에 grant.
- 예: `HeroData_ShooterGame.AbilitySets = [AbilitySet_ShooterHero]` → hero 11종 어빌리티 (Jump · Death · Dash · Emote · Quickbar · ADS · Grenade · Drop · Melee · SpawnEffect · `LyraGameplayAbility_Reset`) 부여.

**경로 2 — Equipment 측 (장비별 일시 어빌리티)** — `ULyraEquipmentManagerComponent` 경유:
- `ULyraEquipmentDefinition::AbilitySetsToGrant[]` 에 장비 장착 시 일시 부여할 AbilitySet 등록 (예: `WID_Pistol.AbilitySetsToGrant = [AbilitySet_ShooterPistol]`).
- `FLyraEquipmentList::AddEntry` (server only) — 장비 instance 생성 후, `EquipmentCDO->AbilitySetsToGrant` 순회 → 각 `AbilitySet->GiveToAbilitySystem(ASC, &NewEntry.GrantedHandles, Instance)` 호출 → 핸들은 entry 의 `GrantedHandles` (`FLyraAbilitySet_GrantedHandles`) 에 저장.
- `FLyraEquipmentList::RemoveEntry` — 장비 해제 시 `Entry.GrantedHandles.TakeFromAbilitySystem(ASC)` 으로 일괄 회수.
- **`ULyraEquipmentInstance::OnEquipped/OnUnequipped` 는 grant 주체가 아님** — `K2_OnEquipped/OnUnequipped` BP 이벤트만 호출. 장비별 런타임 상태 (장착 시각, BP 측 효과 등) 만 담당.

| 비교 축 | Pawn 경로 (PawnData) | Equipment 경로 (EquipmentManager) |
|---------|---------------------|--------------------------------|
| 등록 위치 | `LyraPawnData::AbilitySets[]` | `LyraEquipmentDefinition::AbilitySetsToGrant[]` |
| grant 주체 | PawnExtensionComponent 초기화 흐름 | `FLyraEquipmentList::AddEntry` |
| 회수 주체 | (대개 영구 — pawn destroy 시) | `FLyraEquipmentList::RemoveEntry` (장비 해제 시) |
| 핸들 저장 위치 | (PawnData 외부) | `FLyraAppliedEquipmentEntry::GrantedHandles` |
| 예시 | `AbilitySet_ShooterHero` (11종) | `AbilitySet_ShooterPistol/Rifle/Shotgun` (각 3종) |

## `ULyraGameplayAbility` (와 파생들)

파일:
- [`../Source/LyraGame/AbilitySystem/Abilities/LyraGameplayAbility.h`](../Source/LyraGame/AbilitySystem/Abilities/LyraGameplayAbility.h)
- [`../Source/LyraGame/AbilitySystem/Abilities/LyraGameplayAbility.cpp`](../Source/LyraGame/AbilitySystem/Abilities/LyraGameplayAbility.cpp)

라이라 모든 어빌리티의 베이스. `UGameplayAbility` 파생.

### enum 2종

```cpp
UENUM() ELyraAbilityActivationPolicy {
    OnInputTriggered,    // 입력 트리거 시점 한 번 시도
    WhileInputActive,    // 입력 유지 동안 지속 시도
    OnSpawn              // avatar 부여 시점 자동 시도
};
UENUM() ELyraAbilityActivationGroup {
    Independent,                 // 다른 어빌리티와 무관
    Exclusive_Replaceable,       // 다른 exclusive 어빌리티가 들어오면 취소
    Exclusive_Blocking,          // 다른 exclusive 어빌리티 활성화 차단
    MAX UMETA(Hidden)
};
```

### 핵심 멤버

| 멤버 | 역할 |
|------|------|
| `ELyraAbilityActivationPolicy ActivationPolicy` | 입력 / 자동 활성 분기 |
| `ELyraAbilityActivationGroup ActivationGroup` | 동시 활성 정책 |
| `TArray<TObjectPtr<ULyraAbilityCost>> AdditionalCosts` | `Instanced` — 인벤토리 아이템 · 태그 스택 같은 추가 비용 |
| `TMap<FGameplayTag, FText> FailureTagToUserFacingMessages` | 실패 시 표시할 사용자 메시지 |
| `TMap<FGameplayTag, TObjectPtr<UAnimMontage>> FailureTagToAnimMontage` | 실패 시 재생할 몽타주 |
| `bool bLogCancelation` | 디버그용 취소 로그 |
| `TSubclassOf<ULyraCameraMode> ActiveCameraMode` | `SetCameraMode` 로 일시 적용된 카메라 모드 |

### 오버라이드 후크

- `CanActivateAbility` — Epic 표준 + `AdditionalCosts` 의 `CheckCost`.
- `CheckCost` / `ApplyCost` — `AdditionalCosts` 의 각 비용을 순회 호출.
- `OnGiveAbility` / `OnRemoveAbility` — BP `K2_OnAbilityAdded` / `K2_OnAbilityRemoved` 이벤트 발화.
- `MakeEffectContext` — `FLyraGameplayEffectContext` 발급 + `SetAbilitySource` 호출.
- `ApplyAbilityTagsToGameplayEffectSpec` — 어빌리티 태그를 GE Spec 에 자동 attach.
- `DoesAbilitySatisfyTagRequirements` — `GetAdditionalActivationTagRequirements` 로 ASC 의 TagRelationshipMapping 조회 추가.

### 파생 클래스 4종

| 파생 | 특징 |
|------|------|
| `ULyraGameplayAbility_Death` | `GameplayEvent.Death` 트리거 태그로 자동 활성. `StartDeath` / `FinishDeath` BP 호출. `bAutoStartDeath` 가 true 면 자동. |
| `ULyraGameplayAbility_Jump` | `CharacterJumpStart` / `Stop` BP 호출. `CanActivateAbility` 가 character `CanJump` 검사. |
| `ULyraGameplayAbility_Reset` | `GameplayEvent.RequestReset` 트리거 (server only). `FLyraPlayerResetMessage` 발송. |
| `ULyraGameplayAbility_FromEquipment` (Equipment/) | `GetAssociatedEquipment()` · `GetAssociatedItem()`. 장비 인스턴스가 grant 한 어빌리티의 베이스. |
| `ULyraGameplayAbility_RangedWeapon` (Weapons/) | `FromEquipment` 의 자식. `ELyraAbilityTargetingSource` 6종 + `FRangedWeaponFiringInput` (StartTrace · EndAim · AimDir · WeaponData · BulletFX). |

## `ULyraAbilityTagRelationshipMapping`

파일:
- [`../Source/LyraGame/AbilitySystem/LyraAbilityTagRelationshipMapping.h`](../Source/LyraGame/AbilitySystem/LyraAbilityTagRelationshipMapping.h)
- [`../Source/LyraGame/AbilitySystem/LyraAbilityTagRelationshipMapping.cpp`](../Source/LyraGame/AbilitySystem/LyraAbilityTagRelationshipMapping.cpp)

`UDataAsset`. 어빌리티 태그 간 관계를 표 형태로 표현.

### 데이터 구조

```cpp
USTRUCT() FLyraAbilityTagRelationship {
    FGameplayTag           AbilityTag;              // Categories=Gameplay.Action
    FGameplayTagContainer  AbilityTagsToBlock;      // 이 태그를 가진 어빌리티가 활성 중이면 차단
    FGameplayTagContainer  AbilityTagsToCancel;     // 이 태그를 가진 어빌리티가 활성 시작 시 취소
    FGameplayTagContainer  ActivationRequiredTags;  // 활성에 필요한 태그가 ASC 에 있어야
    FGameplayTagContainer  ActivationBlockedTags;   // ASC 에 이 태그가 있으면 활성 차단
};

UCLASS() ULyraAbilityTagRelationshipMapping : UDataAsset {
    TArray<FLyraAbilityTagRelationship> AbilityTagRelationships;  // 비공개

    void GetAbilityTagsToBlockAndCancel(AbilityTags, OutTagsToBlock, OutTagsToCancel) const;
    void GetRequiredAndBlockedActivationTags(AbilityTags, OutActivationRequired, OutActivationBlocked) const;
    bool IsAbilityCancelledByTag(AbilityTags, ActionTag) const;
};
```

### 사용 위치

- `ULyraPawnData::TagRelationshipMapping` 에 데이터 자산 참조.
- `ULyraPawnExtensionComponent::InitializeAbilitySystem` 에서 `LyraASC->SetTagRelationshipMapping(PawnData->TagRelationshipMapping)`.
- `ULyraAbilitySystemComponent::ApplyAbilityBlockAndCancelTags` 가 매 활성/취소 시점에 `GetAbilityTagsToBlockAndCancel` 호출 → 추가 block/cancel 태그 결합.
- `ULyraAbilitySystemComponent::GetAdditionalActivationTagRequirements` 가 매 활성 시점에 `GetRequiredAndBlockedActivationTags` 호출 → 추가 required/blocked 결합.

## AttributeSet 3종

파일:
- [`../Source/LyraGame/AbilitySystem/Attributes/LyraAttributeSet.h`](../Source/LyraGame/AbilitySystem/Attributes/LyraAttributeSet.h) — 베이스
- [`../Source/LyraGame/AbilitySystem/Attributes/LyraHealthSet.h`](../Source/LyraGame/AbilitySystem/Attributes/LyraHealthSet.h) · `.cpp`
- [`../Source/LyraGame/AbilitySystem/Attributes/LyraCombatSet.h`](../Source/LyraGame/AbilitySystem/Attributes/LyraCombatSet.h) · `.cpp`

### AttributeSet 등록 경로 — default subobject 패턴 (✅ 코드 검증)

**라이라의 HealthSet/CombatSet 은 AbilitySet 의 `GrantedAttributes` 가 아니라 ASC owner actor 의 default subobject 로 생성** 됩니다. 등록 흐름:

| 위치 | 코드 |
|------|------|
| `ALyraPlayerState` 생성자 (`LyraPlayerState.cpp:39-40`) | `HealthSet = CreateDefaultSubobject<ULyraHealthSet>(TEXT("HealthSet"))` + 동일 패턴 `CombatSet`. 원본 코멘트: *"These attribute sets will be detected by AbilitySystemComponent::InitializeComponent. Keeping a reference so that the sets don't get garbage collected before that."* |
| `ALyraCharacterWithAbilities` 생성자 (`LyraCharacterWithAbilities.cpp:20-21`) | 동일 패턴 — Character 가 자기 ASC 를 가질 때도 같은 방식 |
| `UAbilitySystemComponent::InitializeComponent` (엔진) | owner 의 default subobject 를 스캔해 `UAttributeSet` 파생을 자동 감지·등록 |

이 패턴이 의미하는 것:
- **AbilitySet 의 `GrantedAttributes[]` 는 라이라 hero 측에서 사실상 비어 있음** (`AbilitySet_ShooterHero.GrantedAttributes=[]` 검증). 라이라는 default subobject 패턴 우선.
- **`AbilitySet.GrantedAttributes` 는 동적 grant 가 필요할 때만 사용** — 예: `AbilitySet_Arena` 가 `TopDownArenaAttributeSet` 을 grant (TopDownArena 모드에서만 hero 가 이 set 을 가짐).
- **`ULyraHealthComponent` 는 등록 주체가 아님** — `LyraHealthComponent.cpp:70` 의 `HealthSet = AbilitySystemComponent->GetSet<ULyraHealthSet>()` 는 **이미 등록된 set 을 조회만** 함. 그 후 `OnHealthChanged`/`OnMaxHealthChanged`/`OnOutOfHealth` delegate 바인딩 + 초기 체력 (`SetNumericAttributeBase(GetHealthAttribute(), GetMaxHealth())`) 설정 + `Status_Death_*` tag clear.

### `ULyraAttributeSet` (베이스)

`UAttributeSet` 파생. `GetLyraAbilitySystemComponent()` 헬퍼 + `FLyraAttributeEvent` 6-param delegate (Instigator · Causer · EffectSpec · Magnitude · OldValue · NewValue) 정의.

### `ULyraHealthSet`

| Attribute | 종류 | 정책 |
|-----------|------|------|
| `Health` | 일반 | `ReplicatedUsing=OnRep_Health`, `HideFromModifiers` — execution 만 수정 가능 |
| `MaxHealth` | 일반 | `ReplicatedUsing=OnRep_MaxHealth` — modifier 로 수정 가능 |
| `Healing` | **메타** | execution 출력 → `Health` 에 `+` 매핑 |
| `Damage` | **메타** | execution 출력 → `Health` 에 `-` 매핑, `HideFromModifiers` |

추가 delegate 3종: `OnHealthChanged` · `OnMaxHealthChanged` · `OnOutOfHealth`.

ASC 의 PostExecute 흐름에서 `Damage` / `Healing` 메타값이 `Health` 로 변환되고 0 이 되면 `OnOutOfHealth` 발화 → 죽음 처리 트리거.

`Damage` 관련 태그 5종 (.h 에 `UE_DECLARE_GAMEPLAY_TAG_EXTERN`):
- `TAG_Gameplay_Damage`
- `TAG_Gameplay_DamageImmunity`
- `TAG_Gameplay_DamageSelfDestruct`
- `TAG_Gameplay_FellOutOfWorld`
- `TAG_Lyra_Damage_Message`

### `ULyraCombatSet`

| Attribute | 종류 | 정책 |
|-----------|------|------|
| `BaseDamage` | 일반 | `ReplicatedUsing=OnRep_BaseDamage` — source 측이 damage execution 에서 capture |
| `BaseHeal` | 일반 | `ReplicatedUsing=OnRep_BaseHeal` — source 측이 heal execution 에서 capture |

## Execution Calculation 2종

파일:
- [`../Source/LyraGame/AbilitySystem/Executions/LyraDamageExecution.h/.cpp`](../Source/LyraGame/AbilitySystem/Executions/LyraDamageExecution.cpp)
- [`../Source/LyraGame/AbilitySystem/Executions/LyraHealExecution.h/.cpp`](../Source/LyraGame/AbilitySystem/Executions/LyraHealExecution.cpp)

### `ULyraDamageExecution`

`UGameplayEffectExecutionCalculation` 파생. `Execute_Implementation` 는 `WITH_SERVER_CODE` 가드 (server only).

흐름:
1. `BaseDamageDef` 로 source 의 `BaseDamage` capture (`EGameplayEffectAttributeCaptureSource::Source`, `bSnapshot=true`).
2. `FLyraGameplayEffectContext::ExtractEffectContext` 로 라이라 컨텍스트 획득.
3. `HitResult` 가 있으면 `HitActor` · `ImpactLocation` · `ImpactNormal` · `StartTrace` · `EndTrace` 추출. 없으면 target ASC 의 `AvatarActor_Direct` 로 fallback.
4. `ULyraTeamSubsystem::CanCauseDamage(EffectCauser, HitActor)` → `DamageInteractionAllowedMultiplier` (0 또는 1) — 같은 팀 데미지 차단.
5. Distance 계산 — context 의 `Origin` 우선, 없으면 `EffectCauser` 위치, 둘 다 없으면 `WORLD_MAX` + 에러 로그.
6. `AbilitySource->GetDistanceAttenuation(Distance, ...)` + `GetPhysicalMaterialAttenuation(PhysMat, ...)` 적용 (`ILyraAbilitySourceInterface`).
7. `DamageDone = max(BaseDamage * DistanceAttenuation * PhysMaterialAttenuation * TeamMultiplier, 0)`.
8. `> 0` 이면 `OutExecutionOutput.AddOutputModifier(GetDamageAttribute(), Additive, DamageDone)` — `ULyraHealthSet::Damage` 메타에 양수 추가 (=Health 에 음수).

### `ULyraHealExecution`

`ULyraDamageExecution` 보다 단순. `BaseHeal` capture → `max(BaseHeal, 0)` → `ULyraHealthSet::Healing` 메타에 modifier 추가 (=Health 에 양수).

## `ULyraGameplayCueManager`

파일:
- [`../Source/LyraGame/AbilitySystem/LyraGameplayCueManager.h`](../Source/LyraGame/AbilitySystem/LyraGameplayCueManager.h)
- [`../Source/LyraGame/AbilitySystem/LyraGameplayCueManager.cpp`](../Source/LyraGame/AbilitySystem/LyraGameplayCueManager.cpp)

`UGameplayCueManager` 파생. 라이라 측 정책 추가:

| 오버라이드 | 정책 |
|-----------|------|
| `ShouldAsyncLoadRuntimeObjectLibraries` | 라이라 정책 — 콘솔/태그 변수로 토글 가능 |
| `ShouldSyncLoadMissingGameplayCues` | 누락된 cue 의 sync 로드 정책 |
| `ShouldAsyncLoadMissingGameplayCues` | async 로드 정책 |
| `OnCreated` | delay-load delegate 등록, GarbageCollect post 처리 |

### Delay-Load + Always-Load

- `LoadAlwaysLoadedCues()` — 항상 로드되어야 할 cue 미리 로드.
- `PreloadedCues` (`TSet<TObjectPtr<UClass>>`) — content 에서 참조한 cue.
- `AlwaysLoadedCues` — 코드 참조 또는 명시적 always-loaded.
- `OnGameplayTagLoaded` / `ProcessTagToPreload` / `OnPreloadCueComplete` — tag 인덱스 갱신 시 cue async 로드 트리거.
- `HandlePostLoadMap` — 맵 로드 시 delegate listener 갱신.

### 콘솔 명령

`static void DumpGameplayCues(const TArray<FString>& Args)` — 디버그용 cue 목록 덤프.

## `ULyraGlobalAbilitySystem`

파일:
- [`../Source/LyraGame/AbilitySystem/LyraGlobalAbilitySystem.h`](../Source/LyraGame/AbilitySystem/LyraGlobalAbilitySystem.h)
- [`../Source/LyraGame/AbilitySystem/LyraGlobalAbilitySystem.cpp`](../Source/LyraGame/AbilitySystem/LyraGlobalAbilitySystem.cpp)

`UWorldSubsystem`. 모든 ASC 에 어빌리티 / 이펙트 일괄 적용 / 해제.

| BlueprintAuthorityOnly 함수 | 역할 |
|----------------------------|------|
| `ApplyAbilityToAll(Ability)` | 모든 등록된 ASC 에 어빌리티 grant + `AppliedAbilities` 맵에 기록 |
| `ApplyEffectToAll(Effect)` | 모든 ASC 에 이펙트 적용 + `AppliedEffects` 맵에 기록 |
| `RemoveAbilityFromAll(Ability)` | 적용된 어빌리티 일괄 회수 |
| `RemoveEffectFromAll(Effect)` | 적용된 이펙트 일괄 회수 |
| `RegisterASC(ASC)` | 새 ASC 등록 + 현재 적용 중인 모든 글로벌 어빌리티/이펙트 자동 적용 |
| `UnregisterASC(ASC)` | ASC 제거 + 모든 글로벌 어빌리티/이펙트 회수 |

ASC 의 `InitAbilityActorInfo` 가 `bHasNewPawnAvatar` 시점에 `RegisterASC` 호출. `EndPlay` 가 `UnregisterASC` 호출.

내부 자료구조: `TMap<TSubclassOf<UGameplayAbility>, FGlobalAppliedAbilityList>` + 동일 패턴의 effect 맵. `FGlobalAppliedAbilityList::Handles` 는 `TMap<ASC, FGameplayAbilitySpecHandle>` — ASC 별 핸들 추적.

## `FLyraGameplayEffectContext`

파일:
- [`../Source/LyraGame/AbilitySystem/LyraGameplayEffectContext.h`](../Source/LyraGame/AbilitySystem/LyraGameplayEffectContext.h)
- [`../Source/LyraGame/AbilitySystem/LyraGameplayEffectContext.cpp`](../Source/LyraGame/AbilitySystem/LyraGameplayEffectContext.cpp)

`FGameplayEffectContext` 파생 USTRUCT. 라이라 측 2가지 추가 필드:

```cpp
USTRUCT() FLyraGameplayEffectContext : FGameplayEffectContext {
    int32                                CartridgeID = -1;       // 같은 발사 카트리지의 여러 hit 식별
    TWeakObjectPtr<const UObject>        AbilitySourceObject;    // ILyraAbilitySourceInterface 구현체

    static FLyraGameplayEffectContext* ExtractEffectContext(FGameplayEffectContextHandle);
    void SetAbilitySource(const ILyraAbilitySourceInterface*, float Level);
    const ILyraAbilitySourceInterface* GetAbilitySource() const;
    const UPhysicalMaterial* GetPhysicalMaterial() const;  // HitResult 우선
    bool NetSerialize(...) override;                       // CartridgeID 직렬화 포함
};
```

`TStructOpsTypeTraits` 에 `WithNetSerializer` + `WithCopy` 등록.

`ULyraAbilitySystemGlobals` (`LyraAbilitySystemGlobals.h`) 의 `AllocGameplayEffectContext` 오버라이드가 표준 컨텍스트 대신 이 라이라 컨텍스트를 발급하도록 보장.

## `ILyraAbilitySourceInterface`

파일:
- [`../Source/LyraGame/AbilitySystem/LyraAbilitySourceInterface.h`](../Source/LyraGame/AbilitySystem/LyraAbilitySourceInterface.h)

순수 인터페이스. 두 함수:

```cpp
virtual float GetDistanceAttenuation(float Distance, SourceTags, TargetTags) const = 0;
virtual float GetPhysicalMaterialAttenuation(const UPhysicalMaterial*, SourceTags, TargetTags) const = 0;
```

`ULyraDamageExecution` 이 effect context 에서 이 인터페이스를 받아 거리 / 표면 기반 데미지 감쇠를 적용. 라이라 무기 인스턴스 (`ULyraRangedWeaponInstance` 등) 가 구현.

## `ULyraGamePhaseAbility` + `ULyraGamePhaseSubsystem`

파일:
- [`../Source/LyraGame/AbilitySystem/Phases/LyraGamePhaseAbility.h`](../Source/LyraGame/AbilitySystem/Phases/LyraGamePhaseAbility.h) · `.cpp`
- [`../Source/LyraGame/AbilitySystem/Phases/LyraGamePhaseSubsystem.h`](../Source/LyraGame/AbilitySystem/Phases/LyraGamePhaseSubsystem.h) · `.cpp`

### `ULyraGamePhaseAbility`

`ULyraGameplayAbility` 파생. 단일 필드 `FGameplayTag GamePhaseTag`. `ActivateAbility` / `EndAbility` 가 `GamePhaseSubsystem::OnBeginPhase` / `OnEndPhase` 호출.

### `ULyraGamePhaseSubsystem`

`UWorldSubsystem`. `WorldType == Game || PIE` 에서만 생성.

| API | 역할 |
|-----|------|
| `StartPhase(PhaseAbility, EndedCallback)` | GameState 의 ASC 에 `GiveAbilityAndActivateOnce` |
| `WhenPhaseStartsOrIsActive(Tag, MatchType, Callback)` | 옵저버 등록 + 이미 활성이면 즉시 호출 |
| `WhenPhaseEnds(Tag, MatchType, Callback)` | 옵저버 등록 |
| `IsPhaseActive(Tag)` | 현재 활성 페이즈 중 매칭 검사 |
| `K2_*` 변형 | Dynamic delegate BP 노출 |

### 페이즈 계층 정책

`OnBeginPhase(PhaseAbility, Handle)`:
1. `IncomingPhaseTag = PhaseAbility->GetGamePhaseTag()`.
2. 현재 활성 페이즈 순회 → `IncomingPhaseTag.MatchesTag(ActivePhaseTag)` 가 false 면 (부모-자식 관계 아님) 활성 페이즈 취소.
3. `ActivePhaseMap` 에 추가.
4. `PhaseStartObservers` 중 매칭 callback 호출.

예시 (헤더 주석):
- `Game.Playing` + `Game.Playing.WarmUp` 공존 가능 (부모-자식).
- `Game.Playing` + `Game.ShowingScore` 공존 불가 (형제).
- `Game.Playing` 와 `Game.Playing.CaptureTheFlag` 활성 중 `Game.Playing.PostGame` 시작 → `Playing` 유지, `CaptureTheFlag` 만 종료.

### `EPhaseTagMatchType`

| 값 | 의미 |
|----|------|
| `ExactMatch` | 정확히 같은 태그 (예: `A.B` 등록은 `A.B` 만 매칭) |
| `PartialMatch` | 하위 태그 포함 (예: `A.B` 등록은 `A.B` 와 `A.B.C` 모두 매칭) |

## Ability Cost 3종

파일:
- [`../Source/LyraGame/AbilitySystem/Abilities/LyraAbilityCost.h`](../Source/LyraGame/AbilitySystem/Abilities/LyraAbilityCost.h) (베이스)
- [`../Source/LyraGame/AbilitySystem/Abilities/LyraAbilityCost_InventoryItem.h`](../Source/LyraGame/AbilitySystem/Abilities/LyraAbilityCost_InventoryItem.h)
- `LyraAbilityCost_ItemTagStack.h`
- `LyraAbilityCost_PlayerTagStack.h`

`ULyraAbilityCost` (베이스) — `DefaultToInstanced`, `EditInlineNew`, `Abstract`. `CheckCost` / `ApplyCost` 가상함수 + `bOnlyApplyCostOnHit` 옵션.

### 파생 3종

| 파생 | 비용 종류 |
|------|----------|
| `_InventoryItem` | `FScalableFloat Quantity` 만큼의 `ULyraInventoryItemDefinition` 소비 |
| `_ItemTagStack` | 아이템의 태그 스택 N개 차감 |
| `_PlayerTagStack` | PlayerState 의 태그 스택 N개 차감 |

`ULyraGameplayAbility::AdditionalCosts` 에 `Instanced` 로 추가 → `CheckCost` / `ApplyCost` 오버라이드가 순회 호출.

## ASC 초기화 흐름 — 4개 경로

`InitAbilityActorInfo` 호출 위치 (라이더 MCP 검증):

| 위치 | owner | avatar | 용도 |
|------|-------|--------|------|
| `LyraPlayerState.cpp:172` | `this` (PS) | `GetPawn()` | 일반 플레이어 — 가장 흔한 경로 |
| `LyraGameState.cpp:47` | `this` (GS) | `this` (GS) | GamePhase 용 — GS 자체가 owner+avatar |
| `LyraCharacterWithAbilities.cpp:32` | `this` (Char) | `this` (Char) | 자기 ASC 캐릭터 변형 — 봇 등 |
| `LyraPawnExtensionComponent.cpp:142` | `InOwnerActor` (PS) | `Pawn` | 새 pawn 이 들어올 때 avatar 갱신 — PS 의 ASC 가 새 pawn 을 가리키게 함 |

## `ALyraTaggedActor`

파일:
- [`../Source/LyraGame/AbilitySystem/LyraTaggedActor.h`](../Source/LyraGame/AbilitySystem/LyraTaggedActor.h)
- [`../Source/LyraGame/AbilitySystem/LyraTaggedActor.cpp`](../Source/LyraGame/AbilitySystem/LyraTaggedActor.cpp)

`AActor` + `IGameplayTagAssetInterface`. `StaticGameplayTags` 컨테이너를 `GetOwnedGameplayTags` 로 노출. ASC 가 source/target tag 평가 시 actor 의 정적 태그를 함께 사용 (예: 환경 actor 의 surface type, 팀 태그 등).

## 네이티브 게임플레이 태그 — `LyraGameplayTags.h`

`UE_DECLARE_GAMEPLAY_TAG_EXTERN` 으로 선언된 GAS 관련 태그 (라이더 MCP 검증):

| 카테고리 | 태그 |
|----------|------|
| Ability 활성 실패 (7) | `Ability_ActivateFail_IsDead/_Cooldown/_Cost/_TagsBlocked/_TagsMissing/_Networking/_ActivationGroup` |
| Ability 동작 (1) | `Ability_Behavior_SurvivesDeath` |
| 입력 (5) | `InputTag_Move/_Look_Mouse/_Look_Stick/_Crouch/_AutoRun` |
| 초기화 상태 (4) | `InitState_Spawned/_DataAvailable/_DataInitialized/_GameplayReady` |
| 게임플레이 이벤트 (3) | `GameplayEvent_Death/_Reset/_RequestReset` |
| SetByCaller (2) | `SetByCaller_Damage/_Heal` |
| 치트 (2) | `Cheat_GodMode/_UnlimitedHealth` |
| 상태 (5) | `Status_Crouching/_AutoRunning/_Death/_Death_Dying/_Death_Dead` |
| 이동 모드 (6) | `Movement_Mode_Walking/_NavWalking/_Falling/_Swimming/_Flying/_Custom` |

추가로 `LyraHealthSet.h` 의 5종 (`TAG_Gameplay_Damage` · `_DamageImmunity` · `_DamageSelfDestruct` · `_FellOutOfWorld` · `TAG_Lyra_Damage_Message`), `LyraAbilitySystemComponent.h` 의 `TAG_Gameplay_AbilityInputBlocked`.

## Blueprint ↔ C++ 대응표

| Blueprint / Asset | C++ 연결부 | 의미 |
|-------------------|------------|------|
| `B_Hero_*` (4개) | `ALyraCharacter` + `ULyraPawnExtensionComponent` | pawn 측 ASC avatar |
| `LyraPawnData` 데이터 자산 | `ULyraPawnData::AbilitySets[]` | 부여할 AbilitySet 묶음 |
| `AbilitySet_*` 데이터 자산 (11개) | `ULyraAbilitySet` | 어빌리티 + 이펙트 + AttributeSet grant 단위 |
| `GA_*` BP (32개) | `ULyraGameplayAbility` 파생 | 실제 어빌리티 |
| `GE_*` BP (36개) | `UGameplayEffect` 파생 | 데미지·힐·쿨다운·임시 태그 |
| `GCN_*` BP (13개) | `UGameplayCueNotify_*` | cue 시각/음향 효과 |
| `AS_InstantHeal` BP (이름 헷갈리게 `AS_` 접두어지만 실제는 LyraAbilitySet) | `ULyraAbilitySet` 인스턴스 — `GrantedGameplayEffects=[GE_Heal_Instant]` 만 보유 | 환경 actor (힐 패드 등) 가 overlap 대상에게 grant |
| `Phase_*` BP (6개) | `ULyraGamePhaseAbility` 파생 | 게임 페이즈 |
| `TagRelationships_ShooterHero` | `ULyraAbilityTagRelationshipMapping` | hero 어빌리티의 block/cancel/require 관계 |

## 디버깅 체크리스트

어빌리티가 활성되지 않을 때:

1. ASC 가 초기화되었는지 (`InitAbilityActorInfo` 호출 여부) — 보통 PawnExtensionComponent 의 init state 가 `DataInitialized` 까지 진행됐는지 확인.
2. 어빌리티가 grant 됐는지 — `LyraPawnData->AbilitySets[]` 에 포함된 `ULyraAbilitySet` 의 `GrantedGameplayAbilities` 에 들어 있는지.
3. InputTag 매칭 — `FLyraAbilitySet_GameplayAbility::InputTag` 가 `ULyraInputConfig` 의 매핑과 일치하는지.
4. `ELyraAbilityActivationGroup` 차단 — `IsActivationGroupBlocked` 가 true 면 다른 exclusive 어빌리티가 활성 중이라는 뜻. `Ability_ActivateFail_ActivationGroup` 실패 태그.
5. `TagRelationshipMapping` 의 `ActivationBlockedTags` — ASC 에 있는 태그가 차단 조건에 걸리는지. `Ability_ActivateFail_TagsBlocked`.
6. `AdditionalCosts` 의 `CheckCost` 실패 — 인벤토리/태그 스택 부족. `Ability_ActivateFail_Cost`.
7. 죽음 상태 — `Status_Death_Dead` 태그가 ASC 에 있으면 대부분 어빌리티 차단. `Ability_ActivateFail_IsDead`.
8. `HasMatchingGameplayTag(TAG_Gameplay_AbilityInputBlocked)` 가 true 면 ASC 전체 입력 차단.

데미지가 0 으로 들어올 때:

1. `BaseDamage` capture — source ASC 의 `ULyraCombatSet::BaseDamage` 가 의도한 값인지.
2. `ULyraTeamSubsystem::CanCauseDamage` 결과 — 같은 팀이면 `DamageInteractionAllowedMultiplier = 0`.
3. `Distance` — `FLyraGameplayEffectContext::HasOrigin` / `EffectCauser` 가 없으면 `WORLD_MAX` 로 떨어져 distance attenuation 이 0 이 될 수 있음. 로그 확인.
4. `AbilitySourceObject` 가 null 이면 attenuation 1.0 (default) — 무기 인스턴스가 `SetAbilitySource` 를 호출했는지.
5. `OnOutOfHealth` 발화 후에도 데미지가 추가로 들어오는지 — `TAG_Gameplay_DamageImmunity` 가 적용되지 않았는지.

GamePhase 가 안 바뀔 때:

1. `StartPhase` 가 server (BlueprintAuthorityOnly) 에서 호출됐는지.
2. GameState 의 ASC 가 init 됐는지 (`LyraGameState.cpp:47` 의 `InitAbilityActorInfo(this, this)`).
3. 시작하려는 페이즈 태그가 현재 활성 페이즈의 부모면 형제 페이즈가 취소되지 않을 수 있음 — 헤더 주석의 예시 다시 확인.

## 확장 시 권장 방식

**새 어빌리티 추가**: `ULyraGameplayAbility` 상속 BP 작성 → `ActivationPolicy` · `ActivationGroup` · `AbilityTags` 설정 → 적절한 `ULyraAbilitySet` 의 `GrantedGameplayAbilities` 에 항목 + `InputTag` 지정 → 그 AbilitySet 이 부여되는 `LyraPawnData` 또는 GameFeature `AddAbilities` action 으로 연결.

**새 데미지 종류**: `ULyraDamageExecution` 을 직접 수정하지 말고 (a) 새 `UGameplayEffect` 작성 + 기존 execution 사용, (b) 또는 새 execution calculation 작성 + 다른 capture attribute 추가. 데미지 감쇠는 `ILyraAbilitySourceInterface` 구현체 (무기 인스턴스 등) 에서 분기.

**새 GamePhase**: `ULyraGamePhaseAbility` 상속 BP 작성 → `GamePhaseTag` 설정 (예: `Game.Playing.SuddenDeath`) → `ULyraExperienceDefinition` 의 `Actions` 에 grant action 또는 `StartPhase` 직접 호출.

**새 cosmetic ASC 효과 (전역)**: `ULyraGlobalAbilitySystem::ApplyEffectToAll` 또는 `ApplyAbilityToAll` 사용 — 모든 등록된 ASC 에 자동 적용/해제.
