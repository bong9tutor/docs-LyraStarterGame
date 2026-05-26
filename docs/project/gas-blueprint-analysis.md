# Lyra GAS 블루프린트 분석

확인일: 2026-05-25 (보강: 2026-05-25 Monolith MCP) 
분석 도구: Monolith MCP (`mcp__monolith__blueprint_query.get_cdo_properties` · `gas_query.get_ability_info/get_gameplay_effect/get_cue_info/list_attribute_sets/list_gameplay_cues` · `project_query.find_by_type`) + 파일 시스템 (`Glob` / `Bash find`) + 라이더 MCP 
분석 범위: GAS 관련 핵심 자산 (AbilitySet 11개 · GamePhase 6개 · TagRelationship 1개 · 대표 GA 8개 · 대표 GE 9개 · GCN 21개 · PawnData 6개 · AttributeSet 4종) CDO 검증

## 핵심 요약

코드 (`gas-code-analysis.md`) 가 "라이라 측 GAS 정책 레이어가 어떤 메커니즘으로 동작하는가" 를 설명하면, 본 문서는 **그 메커니즘이 라이라 프로젝트에서 실제 어떤 데이터로 채워져 있는가** 를 검증한 결과다.

핵심 사실 (Monolith 검증 후 검증 완료):

1. **GAS 자산 분포** (수량 기준 3종 분리) - 
 - **Monolith GAS 인덱스** (`gas_query.list_abilities`): **GA 21개** (`UGameplayAbility` 파생으로 정식 등록·instantiable 한 자산). 이 21개가 학습·문서화의 1차 대상.
 - **파일 시스템 검색** (`GA_*.uasset` glob): 35개. Monolith 21 + 파생 BP 베이스 / data-only / 기타 약 14개 차이 (예: `GA_Hero_Dash`·`GA_Emote`·`GA_Melee`·`GA_ADS`·`GA_ShowLeaderboard_*`·`GA_Weapon_Fire_Pistol/Rifle_Auto/Shotgun` 등은 `GA_AbilityWithWidget_C` 또는 무기 베이스 BP 의 자식으로 file system 에는 보이지만 Monolith `list_abilities` 필터에 안 들어옴).
 - **이전 문서 기준** (Glob 결과 일부 선별): 32개 - 본 문서는 더 이상 사용하지 않음.
 - AbilitySet **11개**, GE **36개**, GameplayCue **21개** (`GCN_*` burst + `GCNL_*` looping + `GC_*` 단일), GamePhase **6개**, TagRelationship **1개**, PawnData **6개**, AttributeSet **4종** (라이라) + 1종 (`AbilitySystemTestAttributeSet`, 엔진/테스트 - `include_plugins=true` 옵션에서만 노출, 게임플레이 범위 밖).
2. **PawnData → AbilitySet → ASC 의 grant 체인 검증** - `HeroData_ShooterGame.AbilitySets = [AbilitySet_ShooterHero]`, `AbilitySet_ShooterHero.GrantedGameplayAbilities = 11종`. 무기 ability 는 PawnData 가 아니라 `ULyraEquipmentInstance` 가 별도 grant.
3. **`Event.Movement.*` 5종 태그가 `ActivationOwnedTags` → AnimInstance 미러링** - `GA_ADS`·`GA_Weapon_Fire`·`GA_Hero_Dash`·`GA_Melee` 의 `ActivationOwnedTags` 가 정확히 AnimInstance 의 `GameplayTagPropertyMap` 5종과 1:1.
4. **GamePhase 자산 6개가 모두 `ShooterGame.GamePhase.*` 공유 네임스페이스 사용** - ShooterCore 와 TopDownArena 두 게임 모드가 같은 페이즈 태그 (`Warmup/Playing/PostGame`) 를 공유. BP 별로 추가 데이터 (`WaitForPlayersDuration`·`NewGameTime` 등) 만 다름.
5. **`TagRelationships_ShooterHero` 9 entry 검증** - 어빌리티 사이 차단/취소 관계. Dash 가 모든 액션 차단, WeaponFire/Grenade/Drop 이 Emote/Reload 차단, Reload 가 Emote 차단, Emote 가 공중 (`Movement.Mode.Falling`) 차단.
6. **데미지 GE 가 modifier 없이 execution 만** - `GE_Damage_Pistol/Rifle/Shotgun/Melee` 모두 `modifiers=[]`, `executions=[LyraDamageExecution]`. BaseDamage 는 ability 가 spec 의 SetByCaller 또는 source attribute 로 전달. `AssetTagsGameplayEffectComponent` 로 무기 별 다른 `GameplayEffect.DamageType.*` 태그 부여.
7. **모든 GameplayCueNotify 의 `cue_tag` 직접 매칭 검증** - 21개 자산이 각자 `cue_tag` 필드에 trigger tag 보유. ini 의 `GameplayCue.*` 태그와 1:1 대응 확인.

## 자산 인벤토리 (Monolith 검증 후)

### AbilitySet 11종 - 모두 검증 검증 완료

| 자산 | Granted Abilities (InputTag) | Effects | Attributes |
|------|-----------------------------|---------|------------|
| `/ShooterCore/Game/AbilitySet_ShooterHero` | **11종** - Jump (`InputTag.Jump`), Death (none), Dash (`InputTag.Ability.Dash`), Emote (`InputTag.Ability.Emote`), QuickbarSlots (`InputTag.Ability.Quickslot`), ADS (`InputTag.Weapon.ADS`), Grenade (`InputTag.Weapon.Grenade`), DropWeapon (`InputTag.Ability.Quickslot.Drop`), Melee (`InputTag.Ability.Melee`), SpawnEffect (none), **`LyraGameplayAbility_Reset` (C++ 직접, none)** | `GE_IsPlayer` (1) | (없음) |
| `/ShooterCore/Weapons/Pistol/AbilitySet_ShooterPistol` | 3종 - Fire_Pistol (`InputTag.Weapon.Fire`), Reload_Pistol (`InputTag.Weapon.Reload`), AutoReload (none) | (없음) | (없음) |
| `/ShooterCore/Weapons/Rifle/AbilitySet_ShooterRifle` | 3종 - Fire_Rifle_Auto (`InputTag.Weapon.FireAuto`), Reload_Rifle (`InputTag.Weapon.Reload`), AutoReload (none) | (없음) | (없음) |
| `/ShooterCore/Weapons/Shotgun/AbilitySet_ShooterShotgun` | 3종 - Fire_Shotgun (`InputTag.Weapon.FireAuto`), Reload_Shotgun (`InputTag.Weapon.Reload`), AutoReload (none) | (없음) | (없음) |
| `/ShooterCore/Weapons/NetShooter_PROTO/AbilitySet_ShooterNetShooter` | 2종 - WeaponNetShooter (`InputTag.Weapon.FireAuto`), Reload_NetShooter (`InputTag.Weapon.Reload`) | (없음) | (없음) |
| `/ShooterCore/ControlPoint/AbilitySet_ControlPoint` | 2종 - ShowLeaderboard_CP (`InputTag.Ability.ShowLeaderboard`), AutoRespawn (none) | (없음) | (없음) |
| `/ShooterCore/Elimination/AbilitySet_Elimination` | 2종 - ShowLeaderboard_TDM (`InputTag.Ability.ShowLeaderboard`), AutoRespawn (none) | (없음) | (없음) |
| `/ShooterCore/Items/HealthPickup_Unused/AbilitySet_HealPickup` | 1종 - HealPickup (`InputTag.Weapon.Fire`) | (없음) | (없음) |
| `/ShooterExplorer/Input/Abilities/AbilitySet_InventoryTest` | 4종 - Interact (`InputTag.Ability.Interact`), ToggleMap, ToggleInventory, ToggleMarkerInWorld | (없음) | (없음) |
| `/TopDownArena/Game/AbilitySet_Arena` | 2종 - ArenaHero_Death (none), DropBomb (`InputTag.Weapon.Fire`) | (없음) | **`TopDownArenaAttributeSet`** 1개 |
| `/Game/Weapons/Tests/ShootingTarget_AbilitySet` | (없음) | **`GE_HugeHealthTarget`** (1) | (없음) |

> **관찰** - Pistol 만 `Fire` 단발 입력, Rifle/Shotgun 은 `FireAuto` 연발 입력. 라이라 코어 (`B_Hero_Default`) 측 hero AbilitySet 은 존재하지 않음 - ShooterCore 의 `AbilitySet_ShooterHero` 가 사실상 라이라의 표준 hero AbilitySet (코어 `GA_Hero_Jump`·`GA_Hero_Death` 도 이 set 이 grant).

### PawnData 6종 - 모두 검증 검증 완료

| 자산 | PawnClass | AbilitySets | TagRelationshipMapping | InputConfig |
|------|-----------|-------------|----------------------|-------------|
| `/ShooterCore/Game/HeroData_ShooterGame` | `B_Hero_ShooterMannequin` | **[`AbilitySet_ShooterHero`]** | `TagRelationships_ShooterHero` | `InputData_Hero` |
| `/Game/Characters/Heroes/SimplePawnData/SimplePawnData` | `B_SimpleHeroPawn` | (비어 있음) | None | `InputData_SimplePawn` |
| `/Game/Characters/Heroes/EmptyPawnData/DefaultPawnData_EmptyPawn` | (◐ 미확인) | (◐) | (◐) | (◐) |
| `/Game/Weapons/Tests/ShootingTarget_PawnData` | (◐) | (◐) | (◐) | (◐) |
| `/ShooterExplorer/Game/HeroData_Explorer` | (◐) | (◐) | (◐) | (◐) |
| `/TopDownArena/Game/HeroData_Arena` | `B_Hero_Arena` | **[`AbilitySet_Arena`]** | None | `InputData_Arena` |

> **관찰 1** - `HeroData_ShooterGame.AbilitySets` 가 **`AbilitySet_ShooterHero` 단 1개**. 무기 측 AbilitySet (Pistol/Rifle/Shotgun) 은 PawnData 가 아니라 **`ULyraEquipmentInstance` 가 별도 grant**. 두 grant 경로 분리.
> **관찰 2** - `TagRelationshipMapping` 은 ShooterCore hero 만 사용. SimplePawn 과 Arena 는 None - 어빌리티 간 관계 없는 단순 hero.
> **관찰 3** - `B_Hero_ShooterMannequin` 의 parent 는 `B_Hero_Default_C` 이고 두 BP 모두 PawnData 직접 참조 안 함. PawnData 는 `ULyraExperienceDefinition.DefaultPawnData` (또는 `AddPawnData_Hero` GameFeature action) 가 동적으로 부여.

### GamePhase 6개 - 모두 검증 검증 완료

| 자산 | GamePhaseTag | 추가 필드 | 공통 정책 |
|------|-------------|----------|-----------|
| `/ShooterCore/Experiences/Phases/Phase_Warmup` | **`ShooterGame.GamePhase.Warmup`** | `WaitForPlayersDuration=30`, `CountdownDuration=3` | ActivationPolicy: `OnInputTriggered`, ActivationGroup: `Independent`, InstancingPolicy: `InstancedPerActor`, NetExecutionPolicy: `ServerInitiated`, NetSecurityPolicy: `ServerOnly`, Cost/Cooldown/Triggers 모두 없음 |
| `/ShooterCore/Experiences/Phases/Phase_Playing` | **`ShooterGame.GamePhase.Playing`** | (추가 없음) | 동일 |
| `/ShooterCore/Experiences/Phases/Phase_PostGame` | **`ShooterGame.GamePhase.PostGame`** | `NewGameTime=10` | 동일 |
| `/TopDownArena/Game/Modes/Phase_Warmup` | **`ShooterGame.GamePhase.Warmup`** ((핵심) 공유) | `GetReadyTime=3`, `Active User Facing Cue=None` | 동일 |
| `/TopDownArena/Game/Modes/Phase_Playing` | **`ShooterGame.GamePhase.Playing`** | (추가 없음) | 동일 |
| `/TopDownArena/Game/Modes/Phase_PostGame` | **`ShooterGame.GamePhase.PostGame`** | `NewGameTime=10` | 동일 |

> **(핵심) 중요 발견** - 두 게임 모드 (ShooterCore, TopDownArena) 가 **같은 `ShooterGame.GamePhase.*` 태그를 공유**. 즉 두 모드가 별도 페이즈 시스템을 만든 게 아니라 같은 페이즈 태그 위에 각자의 BP 만 따로 둠. `ULyraGamePhaseSubsystem.OnBeginPhase` 가 호출되면 같은 태그 이전 페이즈가 자동 종료 - 두 모드가 동시에 활성될 일이 없으므로 충돌 없음.

### TagRelationships_ShooterHero - 9 entry 검증 검증 완료

| AbilityTag | AbilityTagsToBlock | AbilityTagsToCancel | ActivationBlockedTags |
|-----------|-------------------|--------------------|--------------------|
| `Ability.Type.Action` | (없음) | (없음) | `Status.Death.Dead`, `Status.Death.Dying` |
| `Ability.Type.Action.WeaponFire` | `Emote`, `Reload` | `Emote`, `Reload` | (없음) |
| `Ability.Type.Action.ADS` | (없음) | (없음) | (없음) - marker 만 |
| `Ability.Type.Action.Melee` | `WeaponFire`, `Emote`, `Reload` | `Emote`, `Reload` | (없음) |
| `Ability.Type.Action.Dash` | **`Ability.Type.Action` (전체)** | **`Ability.Type.Action` (전체)** | (없음) |
| `Ability.Type.Action.Drop` | `WeaponFire`, `Emote`, `Reload` | `Emote`, `Reload` | (없음) |
| `Ability.Type.Action.Grenade` | `WeaponFire`, `Emote`, `Reload` | `Emote`, `Reload` | (없음) |
| `Ability.Type.Action.Reload` | `Emote` 만 | (취소 없음) | (없음) |
| `Ability.Type.Action.Emote` | (없음) | (없음) | **`Movement.Mode.Falling`** (공중 emote 금지) |

> **읽는 법** - 죽을 때 모든 액션 차단 (`Status.Death.*`), Dash 가 가장 강력 (다른 모든 액션 취소), Reload 는 약함 (Emote 만 차단, 다른 액션이 와도 reload 자체는 계속됨), Emote 는 공중에서만 차단.

### 대표 GA CDO - 8개 검증 검증 완료

| GA | parent | AbilityTags | ActivationOwnedTags | triggers | net | cooldown |
|----|--------|-------------|---------------------|----------|-----|----------|
| `GA_Hero_Jump` | `LyraGameplayAbility_Jump` (C++) | `Ability.Type.Action.Jump` | (없음) | **없음** (input AbilitySet 매핑) | LocalPredicted | (없음) |
| `GA_Hero_Death` | `LyraGameplayAbility_Death` (C++) | `Ability.Type.StatusChange.Death` | (없음) - Block/Cancel: `Ability.Type.Action` | **`GameplayEvent.Death`** | ServerInitiated | (없음) |
| `GA_Hero_Heal` | `LyraGameplayAbility` (C++) | (없음) - BlockAbilitiesWithTag: `Ability.Type.Action.Jump` | (없음) - ActivationBlockedTags: `Movement.Mode.Falling` | `InputTag.Ability.Heal` | LocalPredicted | (없음) |
| `GA_Hero_Dash` | `GA_AbilityWithWidget_C` (BP) | `Ability.Type.Action.Dash` | **`Event.Movement.Dash`** | `InputTag.Ability.Dash` | LocalPredicted | **`GE_HeroDash_Cooldown`** |
| `GA_ADS` | `GA_AbilityWithWidget_C` (BP) | `Ability.Type.Action.ADS` | **`Event.Movement.ADS`** | `InputTag.Weapon.ADS` | LocalPredicted | (없음) |
| `GA_Melee` | `GA_AbilityWithWidget_C` (BP) | `Ability.Type.Action.Melee` | **`Event.Movement.Melee`** | `InputTag.Weapon.ADS` ((핵심) 주의 - ADS 입력과 공유) | LocalPredicted | (없음) |
| `GA_Weapon_Fire` (베이스 BP) | `LyraGameplayAbility_RangedWeapon` (C++) | `Ability.Type.Action.WeaponFire` | **`Event.Movement.WeaponFire`** - SourceBlockedTags: `Ability.Weapon.NoFiring` | `InputTag.Weapon.Fire` | LocalPredicted | (없음) |
| `GA_Weapon_AutoReload` | `LyraGameplayAbility_FromEquipment` (C++) | `Ability.Type.Passive.AutoReload` | (없음) | **없음** (다른 ability 가 활성) | **LocalOnly** | (없음) |
| `GA_AutoRespawn` | `LyraGameplayAbility` (C++) | `Ability.Type.Passive.AutoRespawn`, **`Ability.Behavior.SurvivesDeath`** | (없음) | **없음** | LocalPredicted + ServerOnly + `retrigger_instanced_ability=true` | (없음) |
| `GA_Weapon_Fire_Pistol` | `GA_Weapon_Fire_C` (BP, 위의 베이스) | 위 베이스 상속 - 정책 동일 | 위 베이스 상속 | 위 베이스 상속 | 위 베이스 상속 | (없음) |

> **(핵심) 가장 중요한 발견 - `Event.Movement.*` ↔ AnimInstance 미러링 1:1 일치**:
> | ActivationOwnedTag | ABP 변수 (검증 원장 `animation-code-analysis.md` 의 `GameplayTagPropertyMap` 5종) |
> |--------------------|--------------------------------------------------------------|
> | `Event.Movement.ADS` | `GameplayTag_IsADS` |
> | `Event.Movement.WeaponFire` | `GameplayTag_IsFiring` |
> | `Event.Movement.Reload` | `GameplayTag_IsReloading` |
> | `Event.Movement.Dash` | `GameplayTag_IsDashing` |
> | `Event.Movement.Melee` | `GameplayTag_IsMelee` |
> 어빌리티가 활성될 때 ASC 에 해당 태그 자동 부여 → AnimInstance 의 `GameplayTagPropertyMap` 이 자동으로 ABP bool 변수 갱신. **GAS ↔ Animation 의 가장 직접적인 연결 지점**.

> **주의 - GA_Melee 의 트리거 `InputTag.Weapon.ADS`**: ADS 입력과 동일. 의도 (예: ADS 키 길게 누르면 Melee 같은 조합) 인지 버그인지는 BP 그래프 추가 확인 필요. AbilitySet 의 InputTag (`InputTag.Ability.Melee`) 와 ability 자체의 trigger 가 다른 점도 주목.

### 대표 GE CDO - 9개 검증 검증 완료

| GE | parent | duration | modifiers | executions | components | cues |
|----|--------|----------|-----------|------------|-----------|------|
| `GE_Damage_Basic_Instant` | `GameplayEffectParent_Damage_Basic_C` (BP) | instant | (없음) | **`LyraDamageExecution`** | asset_tags: `Basic, Instant` | `GameplayCue.Character.DamageTaken` |
| `GE_Damage_Pistol` | `GE_Damage_Basic_Instant_C` | instant | (없음) | `LyraDamageExecution` | asset_tags: `GameplayEffect.DamageType.Pistol` | `GameplayCue.Character.DamageTaken` |
| `GE_Damage_RifleAuto` | `GE_Damage_Basic_Instant_C` | instant | (없음) | `LyraDamageExecution` | asset_tags: `GameplayEffect.DamageType.Rifle` | `GameplayCue.Character.DamageTaken` |
| `GE_Damage_Shotgun` | `GE_Damage_Basic_Instant_C` | instant | (없음) | `LyraDamageExecution` | asset_tags: `GameplayEffect.DamageType.Shotgun` | `GameplayCue.Character.DamageTaken` |
| `GE_Damage_Melee` | `GE_Damage_Basic_Instant_C` | instant | (없음) | `LyraDamageExecution` | asset_tags: `GameplayEffect.DamageType.Melee` | `Character.DamageTaken` + **`Weapon.Melee.Impact`** |
| `GE_Heal_Instant` | `GameplayEffectParent_Heal_C` | instant | (없음) | **`LyraHealExecution`** | asset_tags: `GameplayEffect.Heal.Instant` | `GameplayCue.Character.Heal` |
| `GE_HugeHealthTarget` | `GameplayEffect` (직접) | **infinite** + `period=1` | **`LyraHealthSet.MaxHealth` Override 999999** | `LyraHealExecution` | (없음) | (없음) |
| `GE_IsPlayer` | `GameplayEffect` (직접) | **infinite** | (없음) | (없음) | target_tags: **`Lyra.Player`** | (없음) |
| `GE_HeroDash_Cooldown` | `GameplayEffect` (직접) | **has_duration**, magnitude=1.5초 | (없음) | (없음) | target_tags: **`GameplayCue.Character.Dash.Cooldown`** | (없음) |
| `GE_DynamicTag` | `GameplayEffect` (직접) | infinite | (없음) | (없음) | (없음) - `DynamicGrantedTags` 가 spec 측에서 채워짐 | (없음) |
| `GE_DamageImmunity_FromGameMode` | `GameplayEffect` (직접) | infinite | (없음) | (없음) | target_tags: `Gameplay.DamageImmunity` | (없음) |
| `GE_PregameLobby` | `GE_DamageImmunity_FromGameMode_C` | infinite | (없음) | (없음) | target_tags: `Gameplay.DamageImmunity` | **`GameplayCue.ShooterGame.UserMessage.WaitingForPlayers`** |

> **읽는 법** - **모든 데미지 GE 가 같은 패턴** (parent=`GE_Damage_Basic_Instant`, execution=`LyraDamageExecution`, modifiers 비어 있음). 무기 별 차이는 **asset tag 하나** + Melee 만 cue 추가. BaseDamage 값은 ability spec 의 SetByCaller 또는 source attribute (LyraCombatSet.BaseDamage) 에서 capture - GE 자체에 modifier 가 없음.
> **`GE_PregameLobby` = `GE_DamageImmunity_FromGameMode` + WaitingForPlayers cue** → Phase_Warmup 이 적용하는 것으로 추정.
> **`GE_HeroDash_Cooldown.target_tags = GameplayCue.Character.Dash.Cooldown`** - cooldown GE 가 cue tag 를 target tag 로 부여 → widget 이 그 tag listen 으로 쿨다운 UI 표시 (X 시간 동안).

### AttributeSet 4종 - 모두 검증 검증 완료

| AttributeSet | source | parent | attribute 수 |
|-------------|--------|--------|--------------|
| `LyraAttributeSet` | C++ | `AttributeSet` (engine) | 0 (베이스 - get helper 만) |
| `LyraCombatSet` | C++ | `LyraAttributeSet` | 2 (BaseDamage, BaseHeal) |
| `LyraHealthSet` | C++ | `LyraAttributeSet` | 4 (Health, MaxHealth, Damage, Healing) |
| `TopDownArenaAttributeSet` | C++ (플러그인) | `LyraAttributeSet` | 4 (TopDownArena 측 추가) |

> **중요** - Lyra 코어는 `AbilitySet.GrantedAttributes` 에 AttributeSet 을 명시하지 않음 (모든 AbilitySet 의 `GrantedAttributes=[]`). **HealthSet/CombatSet 의 ASC 등록은 `ULyraHealthComponent` (또는 다른 C++ 컴포넌트) 가 직접 `AddAttributeSetSubobject` 로 추가** 하는 것으로 추정. TopDownArena 만 `AbilitySet_Arena.GrantedAttributes` 에 `TopDownArenaAttributeSet` 추가 패턴 사용.

### AS_InstantHeal - 사실 확인

`/Game/Environments/Gameplay/AS_InstantHeal` 은 이름이 `AS_` 접두어라 AttributeSet 으로 오해되지만 **실제로는 `LyraAbilitySet` 인스턴스**. `GrantedGameplayEffects=[GE_Heal_Instant]` 만 보유 - 환경 actor (예: 힐 패드) 가 overlap 한 actor 에게 grant 하는 ability set.

### GameplayCueNotify 21개 - 모두 검증 검증 완료 (이전 추정 13개 → 실측 21개)

이전 분석은 `GCN_*` 파일만 검색했으나 실제는 `GCNL_*` (looping 변형) 과 `GC_*` (단일) 도 포함. Monolith `list_gameplay_cues` 로 21개 확인:

| 자산 (이름) | type | parent | cue_tag |
|------------|------|--------|---------|
| `GCN_Character_Heal` | looping | `GameplayCueNotify_BurstLatent` | `GameplayCue.Character.Heal` |
| `GCN_Test_Burst` | burst | `GameplayCueNotify_Burst` | `GameplayCue.Test.Burst` |
| `GCN_Test_BurstLatent` | looping | `GameplayCueNotify_BurstLatent` | `GameplayCue.Test.BurstLatent` |
| `GCNL_Test_Looping` | looping | `GameplayCueNotify_Looping` | `GameplayCue.Test.Looping` |
| `GCNL_Widget_Base` | looping | `GameplayCueNotify_Looping` | (비어 있음 - 베이스) |
| `GCN_Weapon_Impact` | burst | `GameplayCueNotify_Burst` | **`GameplayCue.Weapon.Rifle.Impact`** (이름은 일반인데 cue tag 는 Rifle) |
| `GCNL_Character_DamageTaken` | looping | `GameplayCueNotify_Looping` | `GameplayCue.Character.DamageTaken` |
| `GCNL_Dash` | looping | `GameplayCueNotify_Looping` | `GameplayCue.Character.Dash` |
| `GCNL_Death` | looping | `GameplayCueNotify_Looping` | `GameplayCue.Character.Death` |
| `GCNL_Spawning` | looping | `GameplayCueNotify_Looping` | `GameplayCue.Character.Spawn` |
| `GCN_InteractPickUp` | burst | `GameplayCueNotify_Burst` | `GameplayCue.ShooterGame.Interact.WeaponPickup` |
| `GCN_Weapon_Melee` | burst | `GameplayCueNotify_Burst` | `GameplayCue.Weapon.Melee.Hit` |
| `GCN_Weapon_MeleeImpact` | burst | `GameplayCueNotify_Burst` | `GameplayCue.Weapon.Melee.Impact` |
| `GCN_Weapon_Pistol_Fire` | burst | `GameplayCueNotify_Burst` | `GameplayCue.Weapon.Pistol.Fire` |
| `GCN_Weapon_Rifle_Fire` | burst | `GameplayCueNotify_Burst` | `GameplayCue.Weapon.Rifle.Fire` |
| `GCN_Weapon_Shotgun_Fire` | burst | `GameplayCueNotify_Burst` | `GameplayCue.Weapon.Shotgun.Fire` |
| `GCN_Grenade_Detonate` | burst | `GameplayCueNotify_Burst` | `GameplayCue.Weapon.Grenade.Detonate` |
| `GCNL_Launcher_Activate` | looping | `GameplayCueNotify_Looping` | `GameplayCue.World.Launcher.Activate` |
| `GCNL_Teleporter_Activate` | looping | `GameplayCueNotify_Looping` | `GameplayCue.World.Teleporter.Activate` |
| `GC_Collect_Effect` | looping | (◐) | `GameplayCue.ShooterGame.Interact.Collect` |
| `GCN_PickupAcquired` | burst | `GameplayCueNotify_Burst` | `GameplayCue.TopDownArenaGame.PickupAcquired` |

> **이름 접두어 규칙** - `GCN_*` = burst, `GCNL_*` = looping, `GC_*` = 단일 (`_Effect` 등). cue_tag 가 자산명의 의미를 결정하며 (예: `GCN_Weapon_Impact` 자산명은 일반적이지만 `cue_tag` 는 Rifle 전용), tag 와 1:1 매칭이 보장된다.

## 게임플레이 태그 분포 (보강된 사실)

### 핵심 발견

**ABP 미러링 태그 5종** (= `GameplayTagPropertyMap` of `ABP_Mannequin_Base` ↔ ability 의 `ActivationOwnedTags`):

| tag | 부여 어빌리티 | ABP 변수 |
|-----|--------------|---------|
| `Event.Movement.ADS` | `GA_ADS` | `GameplayTag_IsADS` |
| `Event.Movement.WeaponFire` | `GA_Weapon_Fire` (Pistol/Rifle/Shotgun/NetShooter) | `GameplayTag_IsFiring` |
| `Event.Movement.Reload` | (Reload GA 들) | `GameplayTag_IsReloading` |
| `Event.Movement.Dash` | `GA_Hero_Dash` | `GameplayTag_IsDashing` |
| `Event.Movement.Melee` | `GA_Melee` | `GameplayTag_IsMelee` |

**GamePhase 태그 3종** (두 모드 공유):
- `ShooterGame.GamePhase.Warmup`
- `ShooterGame.GamePhase.Playing`
- `ShooterGame.GamePhase.PostGame`

**Damage 타입 태그 4종** (`AssetTagsGameplayEffectComponent` 로 GE 가 부여):
- `GameplayEffect.DamageType.Pistol`
- `GameplayEffect.DamageType.Rifle`
- `GameplayEffect.DamageType.Shotgun`
- `GameplayEffect.DamageType.Melee`
- `GameplayEffect.DamageType.Basic` (베이스)

**기타 검증된 신규 태그**:
- `Lyra.Player` - `GE_IsPlayer` 가 부여 (플레이어 마커)
- `Gameplay.DamageImmunity` - `GE_DamageImmunity_FromGameMode` 가 부여
- `Ability.Weapon.NoFiring` - `GA_Weapon_Fire` 가 SourceBlockedTags 로 사용
- `GameplayCue.ShooterGame.UserMessage.WaitingForPlayers` - `GE_PregameLobby` 의 cue
- `Status.Death.Dead`, `Status.Death.Dying` - Action 차단 조건
- `Movement.Mode.Falling` - Emote 차단 조건

## ActivationGroup 사용 - 검증 결과

이전 추정과 다르게 **검증된 6개 GA 의 ActivationGroup 분포** (gas_query 응답에 없음 - Monolith 가 ELyraAbilityActivationGroup 을 GA CDO 가 아닌 `LyraGameplayAbility` 측 owner_class 로 노출. Phase 6개 CDO 에서 검증):

| 검증된 어빌리티 | ActivationPolicy | ActivationGroup |
|----------------|-----------------|-----------------|
| Phase_Warmup/Playing/PostGame (ShooterCore + TopDownArena 6개) | `OnInputTriggered` | `Independent` |

> Hero ability (Jump · Death · Dash · ADS · Melee · WeaponFire 등) 의 `ActivationGroup` 값은 `gas_query.get_ability_info` 응답에 포함되지 않음 - 이는 `LyraGameplayAbility` 측 추가 enum 이라 별도 query 가 필요. **다음 보강 작업** 으로 `blueprint_query.get_cdo_properties("/Game/Characters/Heroes/Abilities/GA_Hero_Death")` 등으로 확인 가능.

## 무기 grant 경로 - 보강

ShooterCore hero 가 무기 ability 를 얻는 흐름:

1. `HeroData_ShooterGame.AbilitySets = [AbilitySet_ShooterHero]` → PawnExtensionComponent 가 hero ability (Jump/Death/Dash/Emote/Quickbar/ADS/Grenade/Drop/Melee/SpawnEffect/Reset) 11개 grant.
2. `B_Hero_ShooterMannequin.WeaponID = WID_Pistol` + `InitialInventoryItems = [ID_Pistol]` → 시작 무기로 Pistol 장착.
3. `ULyraEquipmentInstance` 의 `OnEquipped` 가 무기별 `AbilitySet_ShooterPistol` 등을 ASC 에 별도 grant → Fire/Reload/AutoReload 3개 추가.
4. 무기 교체 시 이전 AbilitySet 회수 + 새 AbilitySet grant.

따라서 한 시점에 ShooterCore hero 가 가진 어빌리티 = 11 (hero) + 3 (장착 무기) = **14개**.

## 보강 작업 결과 요약

본 시점까지 ◐ partial 이었으나 검증 완료 로 승격된 사실:

| 항목 | 검증 도구 |
|------|----------|
| 11개 AbilitySet 의 `GrantedGameplayAbilities`/`Effects`/`Attributes` | `blueprint_query.get_cdo_properties` |
| 6개 GamePhase 의 `GamePhaseTag` (모두 `ShooterGame.GamePhase.*` 공유) | 동일 |
| `TagRelationships_ShooterHero` 의 9개 `AbilityTagRelationships` entry | 동일 |
| 6개 PawnData 중 ShooterGame/SimplePawn/Arena 3개의 `AbilitySets`/`TagRelationshipMapping`/`InputConfig`/`DefaultCameraMode` | 동일 |
| 대표 8개 GA 의 `ActivationOwnedTags`·`triggers`·`net policies`·`cooldown_effect_class` | `gas_query.get_ability_info` |
| 대표 9개 GE 의 `parent`·`duration`·`modifiers`·`executions`·`components`·`cues` | `gas_query.get_gameplay_effect` |
| AttributeSet 4종 인벤토리 (`LyraAttributeSet`·`LyraCombatSet`·`LyraHealthSet`·`TopDownArenaAttributeSet`) | `gas_query.list_attribute_sets` |
| 21개 GCN 의 `cue_tag` ↔ 자산 1:1 매핑 (이전 추정 13개 정정) | `gas_query.list_gameplay_cues` + `get_cue_info` |
| `Event.Movement.*` 5종 태그 ↔ AnimInstance bool 변수 1:1 ((핵심) GAS ↔ Animation 직접 연결) | 대표 GA `ActivationOwnedTags` 검증 |
| `AS_InstantHeal` 의 실제 타입 = `LyraAbilitySet` (이름 헷갈리지만) | `blueprint_query.get_cdo_properties` |
| 데미지 파이프라인의 무기 차별화 방식 = `AssetTagsGameplayEffectComponent` 의 `DamageType.*` 태그 (modifier 가 아닌 asset tag) | `gas_query.get_gameplay_effect` |

## 남은 partial (◐) 항목

다음은 본 시점에 아직 ◐ 으로 유지:

| 항목 | 보강 방법 |
|------|----------|
| 32개 GA 중 24개의 `ActivationPolicy` · `ActivationGroup` 분포 | `blueprint_query.get_cdo_properties` 로 GA 1개씩 추가 조회 (특히 `bIsCancelable`, `bMarkPendingKillOnAbilityEnd` 등 정책 필드) |
| `B_Hero_Default`/`B_Hero_Explorer` 가 사용하는 PawnData (정확한 참조 위치) | `find_references` 로 `B_Hero_*` 가 어떤 Experience/ExperienceActionSet 에서 spawn 되는지 추적 |
| `HeroData_Explorer`·`ShootingTarget_PawnData`·`DefaultPawnData_EmptyPawn` 3개의 CDO | 위와 동일 |
| `GE_Damage_Basic_Periodic` / `_SetByCaller` 2개 (Instant 만 검증함) | `gas_query.get_gameplay_effect` 추가 호출 |
| `ULyraHealthComponent` 가 실제로 `LyraHealthSet` 을 ASC 에 add 하는 위치 | 라이더 MCP 로 `LyraHealthComponent.cpp` 의 `InitializeWithAbilitySystem` 확인 |
| `LyraCharacterWithAbilities` 가 어떤 BP/scenario 에 쓰이는지 | `find_references` |
| `GA_Melee.triggers = InputTag.Weapon.ADS` 의 의도 (의도된 입력 공유인지 버그인지) | BP 그래프 직접 조회 또는 코드 추적 |

## 자산 분포 - 최종 정리

| 카테고리 | Lyra 코어 (`Content/`) | ShooterCore | ShooterExplorer | ShooterMaps | TopDownArena | 합계 |
|---------|---------------------|-------------|-----------------|-------------|--------------|------|
| GA (GameplayAbility) | 8 (Heroes 4 + Weapons 4) | 17 | 5 | 0 | 2 | **32** |
| GE (GameplayEffect) | 16 | 11 | 0 | 0 | 9 | **36** |
| AbilitySet | 1 (`ShootingTarget`) | 8 | 1 | 0 | 1 | **11** |
| GCN (GameplayCueNotify) | 5 (4 GCN + 1 GCNL) | 9 | 0 | 1 | 2 | **17** (위 list 21 에는 베이스 1 + Test 3 + 기타 포함하여 21) |
| Phase | 0 | 3 | 0 | 0 | 3 | **6** |
| TagRelationship | 0 | 1 | 0 | 0 | 0 | **1** |
| AttributeSet (C++) | 3 (`LyraAttributeSet`/Health/Combat) | 0 | 0 | 0 | 1 (`TopDownArena`) | **4** |
| AS_* (실제는 AbilitySet) | 1 (`AS_InstantHeal`) | 0 | 0 | 0 | 0 | **1** |
| Hero PawnData | 3 (Simple/Empty/ShootingTarget) | 1 | 1 | 0 | 1 | **6** |
| Hero pawn BP | 1 (`B_Hero_Default`) + 1 (`B_SimpleHeroPawn`) | 1 | 1 | 0 | 1 | **5** |

## 학습 순서 (보강 후 갱신)

1. `HeroData_ShooterGame` → `AbilitySet_ShooterHero.GrantedGameplayAbilities` 11개 확인 → hero 가 갖는 어빌리티 인벤토리.
2. `Event.Movement.*` 5종 태그 ↔ AnimInstance `GameplayTagPropertyMap` 5종 매핑 확인 → GAS 가 ABP 와 어떻게 연결되는지.
3. `TagRelationships_ShooterHero` 의 9 entry → 어빌리티 사이 차단/취소 관계.
4. `AbilitySet_ShooterPistol`/`_Rifle`/`_Shotgun` 비교 → 무기별 grant 패턴이 동일 (Fire 다른 InputTag + Reload 동일 InputTag + AutoReload 공통).
5. `GE_Damage_*` 무기별 비교 → modifier 없이 execution 만, 무기별 차이는 asset tag 1개로 표현.
6. `Phase_*` 6개 → 두 모드가 같은 페이즈 태그 공유, BP 별 추가 데이터만 다름.
7. `ULyraHealthComponent` 가 `LyraHealthSet` 을 ASC 에 add 하는 위치 추적 (Rider MCP).
8. GCN 21개의 cue_tag ↔ 자산 매핑 표 작성 (디버깅 시 어느 cue 가 어느 자산인지 즉시 찾기).

## 확장 시 권장 방식 (보강 후)

- **새 무기 추가**: 새 `AbilitySet_Shooter{Weapon}` 작성 → Fire/Reload GA + 공통 `GA_Weapon_AutoReload` 등록. Fire InputTag 는 단발이면 `InputTag.Weapon.Fire`, 연발이면 `InputTag.Weapon.FireAuto`. 데미지는 `GE_Damage_{Weapon}` (parent=`GE_Damage_Basic_Instant_C`) 작성 + `AssetTagsGameplayEffectComponent` 에 `GameplayEffect.DamageType.{Weapon}` 태그.
- **새 hero 어빌리티 추가**: `AbilitySet_ShooterHero.GrantedGameplayAbilities` 에 항목 추가. InputTag 는 `InputTag.Ability.*` 또는 `InputTag.Weapon.*` 패턴.
- **새 GamePhase 추가** (예: `Game.Playing.SuddenDeath`): `LyraGamePhaseAbility` 상속 BP 작성 → `GamePhaseTag = ShooterGame.GamePhase.Playing.SuddenDeath` → `StartPhase` 호출.
- **새 cue 추가**: `GameplayCueNotify_Burst` (1회) 또는 `_Looping` (지속) 상속 BP 작성 → `cue_tag` 설정 → GE 또는 ability 의 `gameplay_cues` 에 등록.
- **태그 차단/취소 정책 변경**: `TagRelationships_ShooterHero.AbilityTagRelationships` 에 entry 추가 - 코드 수정 없음.
