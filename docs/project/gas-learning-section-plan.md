# Lyra GAS 학습 문서 섹션 설계

확인일: 2026-05-25 
목적: 라이라 GAS 분석·학습 문서를 기능별로 어떻게 나눌지 결정하기 위한 정보 구조 설계

이 문서는 검증 원장 [`gas-code-analysis.md`](gas-code-analysis.md) · [`gas-blueprint-analysis.md`](gas-blueprint-analysis.md) 와 Epic 공식 GAS 문서 ([`gas-references.md`](gas-references.md) 참조) 를 바탕으로, 후속 학습 문서를 어떤 기능 단위로 쪼개야 읽기 쉽고 확장하기 쉬운지 정리한다. 작성 패턴은 [`animation-learning-section-plan.md`](animation-learning-section-plan.md) · [`ui-learning-section-plan.md`](ui-learning-section-plan.md) 와 동일.

## 결론

라이라 GAS 학습 문서는 **클래스 별로 나누지 말고**, "ASC 가 어떻게 초기화되고, 어빌리티가 어떻게 부여·활성화·취소되며, 어빌리티가 어떻게 GE 를 통해 attribute 를 바꾸는가" 의 **데이터 흐름과 책임 분리 기준** 으로 나누는 것이 가장 좋다.

추천 상위 섹션은 다음 **9개** 다.

0. 전체 지도와 학습 경로
1. ASC 보유 위치 3종 (PlayerState / GameState / CharacterWithAbilities) 과 초기화 흐름
2. `ULyraAbilitySet` - 어빌리티 + 이펙트 + AttributeSet 묶음 부여
3. `ULyraGameplayAbility` - `ActivationPolicy` · `ActivationGroup` · `AdditionalCosts` · 입력 라우팅
4. 태그 관계 매핑 (`ULyraAbilityTagRelationshipMapping`) 과 활성화 차단/취소
5. AttributeSet + Execution - 데미지/힐 파이프라인 (`CombatSet → DamageExecution → HealthSet`)
6. GameplayCue + `ULyraGameplayCueManager` - delay-load 정책과 13개 `GCN_*`
7. GamePhase - `ULyraGamePhaseSubsystem` + `ULyraGamePhaseAbility` 와 페이즈 계층
8. 글로벌 ASC 일괄 적용 (`ULyraGlobalAbilitySystem`) + Effect Context 확장 (`FLyraGameplayEffectContext` · `ILyraAbilitySourceInterface`)

핵심은 다음 두 가지를 분리하는 것이다:
- **"어빌리티가 부여되는가" 와 "어빌리티가 활성화되는가"** - 같은 ASC 위에서 일어나지만 책임이 다르다 (AbilitySet vs InputTag/ActivationGroup).
- **"GE 가 attribute 를 바꾸는가" 와 "execution 이 attribute 를 계산하는가"** - modifier 와 execution calculation 의 차이는 라이라 데미지 파이프라인 이해의 출발점.

## 조사 근거

### 기존 검증 원장 구조

| 문서 | 강점 | 학습 목차로 부족한 점 |
|------|------|---------------------|
| [`gas-code-analysis.md`](gas-code-analysis.md) | 15종 C++ 클래스의 책임·런타임 흐름·디버깅 체크리스트 | 코드 책임 중심이라 "어떤 학습 순서로 읽어야 흐름이 잡히는가" 가 분리되어야 한다 |
| [`gas-blueprint-analysis.md`](gas-blueprint-analysis.md) | **GAS 자산 원장의 단일 기준** - Monolith CDO 검증 완료 (2026-05-25) | 핵심 자산 11 AbilitySet + 6 GamePhase + 1 TagRelationship + 대표 8 GA + 9 GE + 21 GCN + 6 PawnData + 4 AttributeSet 모두 검증 완료 - 본 계획은 그 원장 위에 학습 동선만 결정 |

따라서 후속 학습 문서는 두 원장을 대체하지 않고, 두 원장의 사실을 데이터 흐름 순서로 재배열하는 안내서로 작성한다.

### 핵심 클래스의 책임 분포

코드 측면에서 GAS 의 라이라 적용은 5가지 책임 + 3가지 보조로 구성:

| 책임 | 대표 클래스 | 학습 섹션 |
|------|-----------|----------|
| ASC 초기화 4경로 (PS/GS/Char/Pawn) | `ULyraAbilitySystemComponent`, `ULyraPawnExtensionComponent`, `ALyraPlayerState`, `ALyraGameState`, `ALyraCharacterWithAbilities` | 섹션 1 |
| 데이터 묶음 부여 | `ULyraAbilitySet`, `FLyraAbilitySet_GrantedHandles` | 섹션 2 |
| 어빌리티 활성 정책 | `ULyraGameplayAbility`, `ELyraAbilityActivationPolicy`, `ELyraAbilityActivationGroup`, `ULyraAbilityCost*` | 섹션 3 |
| 어빌리티 관계 | `ULyraAbilityTagRelationshipMapping`, `FLyraAbilityTagRelationship` | 섹션 4 |
| 데미지/힐 파이프라인 | `ULyraHealthSet`, `ULyraCombatSet`, `ULyraDamageExecution`, `ULyraHealExecution` | 섹션 5 |
| Cue 처리 | `ULyraGameplayCueManager` | 섹션 6 |
| 게임 페이즈 | `ULyraGamePhaseSubsystem`, `ULyraGamePhaseAbility` | 섹션 7 |
| 글로벌 적용 + 컨텍스트 | `ULyraGlobalAbilitySystem`, `FLyraGameplayEffectContext`, `ILyraAbilitySourceInterface`, `ULyraAbilitySystemGlobals` | 섹션 8 |

### 자산 분포

- GAS 자산 ~100개 (Monolith 인덱스 기준 GA 21 + 파일명 인벤토리 35 · GE 36 · AbilitySet 11 · GameplayCue 21 · Phase 6 · TagRel 1 · AttributeSet 4 + 엔진/테스트 1) 이 라이라 코어 + 3개 Game Feature 플러그인에 분산.
- 라이라 코어는 데미지/힐 기본 GE + 캐릭터 죽음/점프/힐 GA + 기본 GCN 만 둠. 실제 무기·게임 모드 ability 는 ShooterCore 가 보유.
- 자세한 분포는 [`gas-blueprint-analysis.md`](gas-blueprint-analysis.md) 참고.

## 섹션 분류 원칙

### 1. 부여 / 활성 / 적용 의 3단을 분리한다

GAS 의 데이터 흐름은 3단으로 본다:
- **부여 (Grant)**: AbilitySet 으로 어빌리티 spec / GE / AttributeSet 을 ASC 에 등록. 한 번 일어남.
- **활성 (Activate)**: 입력 또는 자동 트리거로 어빌리티 spec 이 instance 화되어 실행. 매 활성마다.
- **적용 (Apply)**: 활성된 어빌리티가 GE 를 만들어 attribute 를 변경. 매 GE 마다.

학습자가 세 단을 섞으면 "왜 어빌리티가 화면에 보이지 않는가" / "왜 활성됐는데 데미지가 안 들어가는가" 를 구분할 수 없다. 섹션 2 (부여) · 3 (활성) · 5 (적용) 를 분리한다.

### 2. 어빌리티 정책과 어빌리티 관계를 분리한다

라이라는 어빌리티 별 정책을 두 곳으로 나눈다:
- **어빌리티 자체의 정책**: `ULyraGameplayAbility` 의 `ActivationPolicy` · `ActivationGroup` · `AbilityTags` · `AdditionalCosts`. 어빌리티 작성자가 결정.
- **어빌리티 간 관계**: `ULyraAbilityTagRelationshipMapping` 의 `AbilityTagRelationships[]`. PawnData 가 PS 와 묶어 결정.

두 정책이 ASC 의 `ApplyAbilityBlockAndCancelTags` / `GetAdditionalActivationTagRequirements` 에서 합쳐진다. 학습 시 섹션 3 (어빌리티 자체) 와 섹션 4 (어빌리티 관계) 를 다른 섹션으로 두면 "어디서 설정해야 하는가" 가 명확해진다.

### 3. 데미지/힐 파이프라인은 한 섹션에 묶는다

`ULyraCombatSet::BaseDamage` → `ULyraDamageExecution` → `ULyraHealthSet::Damage` → `Health` 의 흐름은 4종 클래스에 걸치지만 학습은 한 흐름으로 봐야 한다. AttributeSet · Execution · Meta Attribute · Distance Attenuation 을 같은 섹션 5 에 둔다.

### 4. GamePhase 는 독립 섹션

`ULyraGamePhaseSubsystem` 은 ASC 위에 얹힌 메커니즘이지만 책임이 다르다 (게임 진행 흐름 vs 캐릭터 어빌리티). 학습자는 캐릭터 GAS 학습 후 게임 모드 흐름으로 넘어가는 편이 자연스러움. 섹션 7 로 독립.

### 5. 글로벌 ASC + 컨텍스트는 후반 섹션

`ULyraGlobalAbilitySystem` 과 `FLyraGameplayEffectContext::CartridgeID` 같은 보조 시스템은 입문자가 즉시 알 필요 없음. 핵심 학습 완료 후 섹션 8 에서 묶어 다룬다.

## 권장 문서 구조

### 0. 전체 지도와 학습 경로

역할: 처음 읽는 사람이 라이라 GAS 의 큰 구조를 10분 안에 잡는 섹션.

다룰 내용:
- Epic GAS 의 5대 컴포넌트 (ASC · GameplayAbility · GameplayEffect · GameplayCue · AttributeSet) 위에 라이라가 얹은 5종 책임.
- "PlayerState ASC → PawnExtensionComponent 초기화 → AbilitySet grant → InputTag 입력 → Ability activate → GE apply → AttributeSet 변경" 흐름도.
- 약 100개 GAS 자산의 분포 (라이라 코어 vs ShooterCore vs ShooterExplorer vs TopDownArena).
- 다음 섹션 진입 가이드.

작성 우선순위: 최상

### 1. ASC 초기화 4경로

역할: ASC 가 어디에 있고 누가 owner / avatar 가 되는지의 책임 분리.

핵심 질문:
- 일반 플레이어의 ASC 는 어디에 있는가? (PS)
- GamePhase 용 ASC 는 어디에 있는가? (GS)
- 자기 자신이 ASC 를 갖는 캐릭터는 언제 쓰는가? (CharacterWithAbilities - 봇 등)
- PawnExtensionComponent 가 ASC 를 어떻게 pawn 에 연결하는가?
- pawn 이 바뀔 때 ASC 의 avatar 만 바뀌고 어빌리티는 그대로 유지되는 이유는?

주요 대상:
- `ALyraPlayerState` (`IAbilitySystemInterface` 구현, `AbilitySystemComponent` 보유)
- `ALyraGameState` (GamePhase 용 ASC)
- `ALyraCharacterWithAbilities` (자기 ASC 변형)
- `ULyraPawnExtensionComponent::InitializeAbilitySystem` - init state `DataInitialized` 시점에 호출
- `ULyraAbilitySystemComponent::InitAbilityActorInfo` 의 `bHasNewPawnAvatar` 분기
- `OnAbilitySystemInitialized` / `OnAbilitySystemUninitialized` delegate

작성 우선순위: 최상

### 2. `ULyraAbilitySet` - 어빌리티 + 이펙트 + AttributeSet 묶음 부여

역할: 모듈형 부여의 핵심 메커니즘.

핵심 질문:
- `LyraPawnData->AbilitySets[]` 는 무엇이고 누가 grant 하는가?
- AbilitySet 의 3종 묶음 (`GrantedGameplayAbilities` · `GrantedGameplayEffects` · `GrantedAttributes`) 의 차이는?
- `FLyraAbilitySet_GameplayAbility` 의 `InputTag` 필드가 어떻게 입력 라우팅으로 이어지는가?
- `FLyraAbilitySet_GrantedHandles` 가 회수에 어떻게 쓰이는가?
- 장비가 grant 하는 어빌리티 (`ULyraEquipmentInstance`) 는 PawnData 와 어떻게 다른가?

주요 대상:
- `ULyraAbilitySet::GiveToAbilitySystem` 흐름 (4단계 - Authoritative 검사 → Attribute 생성 → Ability grant → Effect apply)
- `FLyraAbilitySet_GrantedHandles::TakeFromAbilitySystem` 회수
- 11개 `AbilitySet_*` 자산 인벤토리 (코어 / ShooterCore / ShooterExplorer / TopDownArena)
- Pawn 측 grant 경로 (`LyraPawnData->AbilitySets[]`)
- Equipment 측 grant 경로 (장비 인스턴스의 `EquipmentAbilitySets`)

작성 우선순위: 최상

### 3. `ULyraGameplayAbility` - 활성 정책

역할: 어빌리티가 언제 / 어떻게 활성되는가의 라이라 측 정책.

핵심 질문:
- `ELyraAbilityActivationPolicy` 3종 (`OnInputTriggered` · `WhileInputActive` · `OnSpawn`) 의 차이는?
- `ELyraAbilityActivationGroup` 3종 (`Independent` · `Exclusive_Replaceable` · `Exclusive_Blocking`) 이 동시 활성을 어떻게 제어하는가?
- InputTag 가 어떻게 어빌리티 활성으로 이어지는가? (InputComponent → ASC → spec)
- `AdditionalCosts` 의 3종 (`InventoryItem` · `ItemTagStack` · `PlayerTagStack`) 은 어떻게 동작하는가?
- `FailureTagToAnimMontage` 와 `FailureTagToUserFacingMessages` 가 실패 시 어떻게 노출되는가?
- 파생 4종 (`_Death` · `_Jump` · `_Reset` · `_FromEquipment`/`_RangedWeapon`) 의 차이는?

주요 대상:
- `ULyraGameplayAbility` 의 enum 2종 + 주요 멤버
- `ULyraAbilitySystemComponent::AbilityInputTagPressed/Released` / `ProcessAbilityInput`
- `ELyraAbilityActivationGroup` 의 카운트 관리 (`ActivationGroupCounts[]`, `IsActivationGroupBlocked`)
- `ULyraAbilityCost_*` 3종
- 파생 클래스 4종 (Death · Jump · Reset · RangedWeapon)
- 32개 `GA_*` 자산 인벤토리

작성 우선순위: 최상

### 4. `ULyraAbilityTagRelationshipMapping` - 어빌리티 사이 관계

역할: 어빌리티 간 block / cancel / required / blocked 를 데이터로 표현.

핵심 질문:
- `FLyraAbilityTagRelationship` 의 4종 컨테이너 (`AbilityTagsToBlock` · `AbilityTagsToCancel` · `ActivationRequiredTags` · `ActivationBlockedTags`) 차이는?
- 어빌리티 자체의 `BlockAbilitiesWithTag` 와 mapping 의 `AbilityTagsToBlock` 이 어떻게 합쳐지는가?
- `ULyraAbilitySystemComponent::ApplyAbilityBlockAndCancelTags` 와 `GetAdditionalActivationTagRequirements` 의 호출 시점은?
- `TagRelationships_ShooterHero` 가 ShooterCore hero 의 어떤 어빌리티 관계를 정의하는가? (◐ CDO 보강 필요)

주요 대상:
- `ULyraAbilityTagRelationshipMapping::GetAbilityTagsToBlockAndCancel` · `GetRequiredAndBlockedActivationTags` · `IsAbilityCancelledByTag`
- ASC 와의 통합 지점 (오버라이드된 가상 함수)
- `LyraPawnData->TagRelationshipMapping` 의 적용 위치
- `Ability_ActivateFail_*` 태그와의 관계 - 실패 원인을 어떻게 노출하는가

작성 우선순위: 상

### 5. 데미지 / 힐 파이프라인

역할: `BaseDamage → DamageExecution → Damage 메타 → Health` 의 완전한 흐름.

핵심 질문:
- 왜 라이라는 데미지를 GE modifier 가 아니라 execution calculation 으로 계산하는가?
- `ULyraCombatSet` (source) 과 `ULyraHealthSet` (target) 의 책임 분리는?
- 메타 어트리뷰트 (`Damage` · `Healing`) 와 일반 어트리뷰트 (`Health` · `MaxHealth`) 의 차이는?
- `ULyraDamageExecution` 의 5단계 (BaseDamage capture → HitResult → Team check → Distance → Attenuation) 는 어떻게 동작하는가?
- `ILyraAbilitySourceInterface` 의 `GetDistanceAttenuation` / `GetPhysicalMaterialAttenuation` 은 누가 구현하는가?
- `OnHealthChanged` · `OnOutOfHealth` 가 어떻게 죽음 처리로 이어지는가?
- `TAG_Gameplay_DamageImmunity` · `TAG_Gameplay_DamageSelfDestruct` 등 데미지 관련 태그의 사용은?

주요 대상:
- `ULyraCombatSet` (BaseDamage · BaseHeal) - source attribute
- `ULyraHealthSet` (Health · MaxHealth · Damage · Healing) - target attribute, meta attribute 정책
- `ULyraDamageExecution::Execute_Implementation` - 5단계 흐름
- `ULyraHealExecution` (대비)
- `ULyraTeamSubsystem::CanCauseDamage` 호출
- `ILyraAbilitySourceInterface` 와 구현체 (무기 인스턴스)
- 6개 `GE_Damage_*` 자산 (무기별)
- `GameplayEvent_Death` 트리거 태그 → `ULyraGameplayAbility_Death` 자동 활성

작성 우선순위: 최상

### 6. GameplayCue + `ULyraGameplayCueManager`

역할: 어빌리티/이펙트의 시각/음향 효과 처리.

핵심 질문:
- GameplayCue 와 GameplayCueNotify 의 차이는?
- `ULyraGameplayCueManager` 의 delay-load 정책이 왜 필요한가?
- `LoadAlwaysLoadedCues` 와 `PreloadedCues` 의 차이는?
- 13개 `GCN_*` 자산이 각각 어떤 trigger tag (`GameplayCue.*`) 에 매칭되는가?
- GA 가 GE 를 적용할 때 cue 가 어떻게 trigger 되는가?

주요 대상:
- `ULyraGameplayCueManager` 의 5개 오버라이드 + delay-load 메커니즘
- `Config/DefaultGameplayTags.ini` 의 13개 `GameplayCue.*` 태그
- 13개 `GCN_*` 자산 인벤토리 + 매칭 관계 (◐ 보강 필요)
- 콘솔 명령 `DumpGameplayCues`

작성 우선순위: 상

### 7. GamePhase - `ULyraGamePhaseSubsystem`

역할: 게임 모드의 페이즈 진행을 어빌리티 + 태그 계층으로 표현.

핵심 질문:
- 왜 페이즈를 어빌리티 (`ULyraGamePhaseAbility`) 로 표현하는가? Subsystem 으로만 처리할 수 있는데.
- GameState 의 ASC 가 페이즈 어빌리티의 owner/avatar 가 되는 이유는?
- 페이즈 계층 (`Game.Playing` + `Game.Playing.SuddenDeath`) 의 부모-자식 vs 형제 관계는?
- `EPhaseTagMatchType` 의 `ExactMatch` 와 `PartialMatch` 차이는?
- `Phase_Warmup` → `Phase_Playing` → `Phase_PostGame` 전이가 실제 어떻게 일어나는가? (◐ CDO 보강 필요)

주요 대상:
- `ULyraGamePhaseSubsystem` 의 API (`StartPhase` · `WhenPhaseStartsOrIsActive` · `WhenPhaseEnds` · `IsPhaseActive`)
- `ULyraGamePhaseAbility::ActivateAbility/EndAbility` → subsystem 콜백
- `OnBeginPhase` 의 페이즈 계층 정책 (부모 매칭하지 않는 활성 페이즈만 취소)
- 6개 `Phase_*` 자산 (ShooterCore 3 + TopDownArena 3)
- `GE_PregameLobby` · `GE_DamageImmunity_FromGameMode` 와의 관계 (페이즈가 GE 적용)

작성 우선순위: 상

### 8. (선택) 글로벌 ASC + Effect Context 확장

역할: ASC 위의 보조 시스템 - 글로벌 적용과 컨텍스트 확장.

핵심 질문:
- `ULyraGlobalAbilitySystem::ApplyEffectToAll` 은 언제 쓰는가?
- 새 ASC 가 등록될 때 어떻게 기존 글로벌 효과가 자동 적용되는가?
- `FLyraGameplayEffectContext::CartridgeID` 는 무엇을 식별하는가?
- `ULyraAbilitySystemGlobals` 가 왜 표준 컨텍스트 대신 라이라 컨텍스트를 발급하도록 오버라이드되는가?
- `ILyraAbilitySourceInterface` 가 데미지 감쇠에 어떻게 쓰이는가?

주요 대상:
- `ULyraGlobalAbilitySystem` API (`ApplyAbilityToAll` · `ApplyEffectToAll` · `RegisterASC` · `UnregisterASC`)
- `FGlobalAppliedAbilityList` · `FGlobalAppliedEffectList` 내부 자료구조
- `FLyraGameplayEffectContext` 의 추가 필드 + NetSerialize
- `ULyraAbilitySystemGlobals` 의 컨텍스트 발급 오버라이드
- `ILyraAbilitySourceInterface` 와 구현체 (라이라 무기 인스턴스)

작성 우선순위: 중

## 세부 학습 항목 - 기능 키워드 검증 매핑

각 섹션이 다룰 **개별 기능 단위** 를 키워드로 정리. `✅` = 코드 직접 확인 · `◐` = 자산 존재만 검증 완료, CDO 내용은 partial · `△` = 공식 GAS 일반 개념.

### 섹션 1 - ASC 초기화

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| ASC 소유 (PS) | `ALyraPlayerState::AbilitySystemComponent` + `IAbilitySystemInterface` | 검증 완료 |
| ASC 초기화 (PS owner + Pawn avatar) | `LyraPlayerState.cpp:172` | 검증 완료 |
| GameState ASC (GamePhase 용) | `LyraGameState.cpp:47` | 검증 완료 |
| 자기 ASC 캐릭터 | `LyraCharacterWithAbilities.cpp:32` | 검증 완료 |
| PawnExtensionComponent 초기화 | `LyraPawnExtensionComponent::InitializeAbilitySystem` | 검증 완료 |
| InitState 4단계 | `LyraGameplayTags.h` 의 `InitState_*` 4종 | 검증 완료 |
| `bHasNewPawnAvatar` 분기 | `LyraAbilitySystemComponent.cpp:46` | 검증 완료 |
| `OnPawnAvatarSet` 디스패치 | `LyraAbilitySystemComponent.cpp:60` | 검증 완료 |
| `TryActivateAbilitiesOnSpawn` | `LyraAbilitySystemComponent.cpp:84` | 검증 완료 |
| AnimInstance 연결 | `ULyraAnimInstance::InitializeWithAbilitySystem` 호출 | 검증 완료 |

### 섹션 2 - AbilitySet

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| AbilitySet USTRUCT 3종 | `FLyraAbilitySet_GameplayAbility/Effect/AttributeSet` | 검증 완료 |
| Grant 4단계 (Auth 검사 → Attr → Ability → Effect) | `ULyraAbilitySet::GiveToAbilitySystem` | 검증 완료 |
| 회수 | `FLyraAbilitySet_GrantedHandles::TakeFromAbilitySystem` | 검증 완료 |
| Pawn 측 grant 트리거 | `LyraPawnData::AbilitySets[]` + (◐ 호출 위치) | ◐ |
| Equipment 측 grant | `ULyraEquipmentInstance` (◐ 확인 필요) | ◐ |
| 11개 AbilitySet 자산 | 인벤토리 확인 | ◐ (CDO 보강 필요) |
| `AbilitySet_ShooterHero` 의 그란트 내용 | (CDO) | ◐ Monolith 보강 |

### 섹션 3 - GameplayAbility 활성 정책

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| ActivationPolicy 3종 | `ELyraAbilityActivationPolicy` enum | 검증 완료 |
| ActivationGroup 3종 | `ELyraAbilityActivationGroup` enum | 검증 완료 |
| 동시 활성 카운트 | `ActivationGroupCounts[]` + `IsActivationGroupBlocked` | 검증 완료 |
| InputTag 라우팅 | `AbilityInputTagPressed/Released` + `ProcessAbilityInput` | 검증 완료 |
| 입력 차단 | `TAG_Gameplay_AbilityInputBlocked` | 검증 완료 |
| AdditionalCosts 3종 | `LyraAbilityCost_InventoryItem/_ItemTagStack/_PlayerTagStack` | 검증 완료 |
| Death ability | `LyraGameplayAbility_Death` + `GameplayEvent_Death` 트리거 | 검증 완료 |
| Jump ability | `LyraGameplayAbility_Jump` | 검증 완료 |
| Reset ability | `LyraGameplayAbility_Reset` + `GameplayEvent_RequestReset` 트리거 | 검증 완료 |
| Equipment ability | `LyraGameplayAbility_FromEquipment` (`GetAssociatedEquipment`) | 검증 완료 |
| Ranged Weapon ability | `LyraGameplayAbility_RangedWeapon` + `ELyraAbilityTargetingSource` 6종 | 검증 완료 |
| Camera mode 일시 | `SetCameraMode` / `ClearCameraMode` | 검증 완료 |
| 실패 처리 | `FailureTagToUserFacingMessages` + `FailureTagToAnimMontage` + `ClientNotifyAbilityFailed` RPC | 검증 완료 |
| Failure 태그 7종 | `Ability_ActivateFail_*` | 검증 완료 |
| 32개 GA 자산 | 인벤토리 확인 | ◐ (각 GA 의 ActivationGroup CDO 보강 필요) |

### 섹션 4 - TagRelationshipMapping

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| FLyraAbilityTagRelationship 4 컨테이너 | `LyraAbilityTagRelationshipMapping.h` | 검증 완료 |
| ASC 통합 위치 | `ApplyAbilityBlockAndCancelTags` · `GetAdditionalActivationTagRequirements` | 검증 완료 |
| PawnData 적용 | `PawnExtensionComponent::InitializeAbilitySystem` | 검증 완료 |
| `TagRelationships_ShooterHero` 의 entry | (CDO) | ◐ Monolith 보강 |

### 섹션 5 - 데미지/힐 파이프라인

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| LyraCombatSet (source) | `BaseDamage` · `BaseHeal` | 검증 완료 |
| LyraHealthSet (target) | `Health` · `MaxHealth` · `Damage` (메타) · `Healing` (메타) | 검증 완료 |
| 메타 어트리뷰트 정책 | `HideFromModifiers` UPROPERTY 메타 | 검증 완료 |
| DamageExecution 5단계 | `LyraDamageExecution::Execute_Implementation` | 검증 완료 |
| HealExecution | `LyraHealExecution::Execute_Implementation` | 검증 완료 |
| BaseDamage capture | `FGameplayEffectAttributeCaptureDefinition` (Source, Snapshot) | 검증 완료 |
| Team check | `ULyraTeamSubsystem::CanCauseDamage` | 검증 완료 |
| Distance attenuation | `ILyraAbilitySourceInterface::GetDistanceAttenuation` | 검증 완료 |
| Physical material attenuation | `GetPhysicalMaterialAttenuation` | 검증 완료 |
| OnOutOfHealth | `ULyraHealthSet::OnOutOfHealth` delegate | 검증 완료 |
| Damage 관련 태그 5종 | `TAG_Gameplay_Damage*` · `TAG_Lyra_Damage_Message` | 검증 완료 |
| GE_Damage_* 자산 6개 | 인벤토리 확인 | ◐ (modifier 값 + execution 참조 보강 필요) |
| Death 자동 트리거 | `GameplayEvent_Death` + `ULyraGameplayAbility_Death` | 검증 완료 |

### 섹션 6 - GameplayCue

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| LyraGameplayCueManager 오버라이드 | 5종 가상 함수 | 검증 완료 |
| Delay-load + Always-load | `LoadAlwaysLoadedCues` + `PreloadedCues` + `AlwaysLoadedCues` | 검증 완료 |
| Tag loaded → preload | `OnGameplayTagLoaded` → `ProcessTagToPreload` → `OnPreloadCueComplete` | 검증 완료 |
| 13개 GCN 자산 | 인벤토리 확인 | ◐ |
| `GameplayCue.*` 태그 13개 | ini 정의 | 검증 완료 |
| GCN ↔ 태그 매핑 | (CDO) | ◐ Monolith 보강 |
| `DumpGameplayCues` 콘솔 | `static void DumpGameplayCues(Args)` | 검증 완료 |

### 섹션 7 - GamePhase

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| ULyraGamePhaseAbility | `GamePhaseTag` 필드 + Activate/EndAbility 오버라이드 | 검증 완료 |
| ULyraGamePhaseSubsystem API | `StartPhase` · `WhenPhaseStartsOrIsActive` · `WhenPhaseEnds` · `IsPhaseActive` | 검증 완료 |
| 페이즈 계층 정책 | `OnBeginPhase` 의 부모 매칭 검사 | 검증 완료 |
| EPhaseTagMatchType | `ExactMatch` vs `PartialMatch` | 검증 완료 |
| GameState ASC 사용 | `StartPhase` 가 `GameState->FindComponentByClass<ULyraAbilitySystemComponent>` 호출 | 검증 완료 |
| BlueprintAuthorityOnly | `K2_StartPhase` 등 | 검증 완료 |
| `WorldType` 제한 | `DoesSupportWorldType` Game/PIE만 | 검증 완료 |
| 6개 Phase 자산 | 인벤토리 확인 | ◐ (`GamePhaseTag` 실제 값 보강 필요) |
| `GE_PregameLobby` · `GE_DamageImmunity_FromGameMode` | 자산 존재 | ◐ (페이즈 ↔ GE 관계 보강 필요) |

### 섹션 8 - 글로벌 ASC + Context

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| LyraGlobalAbilitySystem API | `ApplyAbilityToAll` · `ApplyEffectToAll` · `RegisterASC` · `UnregisterASC` | 검증 완료 |
| FGlobalAppliedAbilityList | TMap<ASC, SpecHandle> 자료구조 | 검증 완료 |
| 자동 적용 (RegisterASC) | InitAbilityActorInfo 의 RegisterASC 호출 | 검증 완료 |
| FLyraGameplayEffectContext | `CartridgeID` + `AbilitySourceObject` | 검증 완료 |
| NetSerialize | `WithNetSerializer` trait | 검증 완료 |
| ExtractEffectContext | static helper | 검증 완료 |
| ULyraAbilitySystemGlobals | 컨텍스트 발급 오버라이드 (◐ cpp 미확인) | ◐ |
| ILyraAbilitySourceInterface | 2개 함수 + 구현체 (◐ 무기 인스턴스 확인 필요) | ◐ |

## HTML 산출물 대응표

위 9개 학습 섹션을 실제 `html/pages/lyra-gas-*.html` 페이지로 어떻게 매핑할지의 권장안. 사양 ([`dynamic-html-spec.md`](../common/dynamic-html-spec.md)) 의 "확장 절차 B" 와 "다중 시스템 구조" 를 따라야 한다 - 파일명 접두어 `lyra-gas-`, 시스템 내 번호 (글로벌 번호 X).

| 페이지 번호 | HTML 파일 | 포함 섹션 | 목차명 | 권장 학습 블록 |
|-------------|-----------|-----------|--------|----------------|
| 1 | `lyra-gas-overview.html` | 섹션 0 | 학습 목차 | structure (5종 책임 지도) + flow (Experience → ASC → Ability) + reference (자산 분포 + 학습 경로) |
| 2 | `lyra-gas-asc-init.html` | 섹션 1 | 학습 목차 | flow (PS ASC 초기화) + comparison (PS / GS / Char 3 경로) + reference (InitState 태그) + verification (init 검증) |
| 3 | `lyra-gas-ability-set.html` | 섹션 2 | 학습 목차 | structure (3종 USTRUCT) + flow (Grant 4단계) + reference (11개 AbilitySet 인벤토리) + comparison (Pawn vs Equipment grant) |
| 4 | `lyra-gas-ability-policy.html` | 섹션 3 | 학습 목차 | decision (ActivationPolicy 매핑) + decision (ActivationGroup 매핑) + flow (InputTag → activate) + reference (32개 GA 인벤토리) + reference (Failure 태그 7종) |
| 5 | `lyra-gas-tag-relationships.html` | 섹션 4 | 학습 목차 | structure (FLyraAbilityTagRelationship 4 컨테이너) + decision (block/cancel/required/blocked 적용 시점) + flow (PawnData → ASC) + verification (`TagRelationships_ShooterHero` ◐) |
| 6 | `lyra-gas-damage-pipeline.html` | 섹션 5 | 흐름 목차 | flow (BaseDamage capture → execution → meta → Health) + flow (OnOutOfHealth → Death) + comparison (Damage vs Heal execution) + reference (메타 어트리뷰트 정책) |
| 7 | `lyra-gas-cues.html` | 섹션 6 | 학습 목차 | structure (LyraGameplayCueManager 오버라이드) + flow (Tag loaded → preload → cue 생성) + reference (21 GameplayCue 자산 + cue_tag 매핑 + 이름 접두어 규칙 `GCN_`/`GCNL_`/`GC_`) + recipe (새 cue 추가) |
| 8 | `lyra-gas-game-phase.html` | 섹션 7 | 학습 목차 | structure (GamePhaseAbility + Subsystem) + decision (페이즈 계층 - 부모/형제) + flow (Phase_Warmup → Playing → PostGame) + reference (6개 Phase 자산) + recipe (새 페이즈 추가) |
| 9 | `lyra-gas-globals-context.html` | 섹션 8 | 학습 목차 | structure (GlobalAbilitySystem + Context 확장) + reference (FLyraGameplayEffectContext 필드) + recipe (글로벌 효과 추가) | 선택 - 후순위 |

원칙:
- 페이지 1~7 은 우선순위 "최상~상" 의 코어 학습. 페이지 8 은 모드 학습. 페이지 9 는 후순위 - 보조 시스템.
- 각 페이지 카드의 `<h3>` 첫 단어는 시스템 내 페이지 번호 - 마침표 + 공백 (`1. ...`). 사양의 "번호 ↔ 제목 구분자" 절 준수.

## 검증 등급 유지 항목 (2026-05-25 Monolith 보강 후 갱신)

HTML 페이지가 검증 원장보다 높은 등급으로 사실을 표시하지 않도록, 각 페이지마다 **partial / unverified 로 유지해야 할 항목** 을 정한다. Monolith MCP 보강 ([`gas-blueprint-analysis.md`](gas-blueprint-analysis.md) 참조) 이후 대부분의 ◐ 항목이 검증 완료 로 승격됨.

| HTML 페이지 | partial / unverified 로 유지해야 할 항목 |
|-------------|-------------------------------|
| `lyra-gas-asc-init.html` | ASC 초기화 4경로 검증 완료. **남은 ◐**: `LyraCharacterWithAbilities` 가 실제로 어떤 BP / 시나리오에 쓰이는지 (find_references 필요). |
| `lyra-gas-ability-set.html` | 11개 AbilitySet 의 grant 내용 모두 검증 완료 (`AbilitySet_ShooterHero` 11종 abil, `Pistol/Rifle/Shotgun` 3종, Arena 2종 + AttributeSet, 등). 무기 grant 경로 (PawnData vs Equipment) 검증 완료. **남은 ◐**: `ULyraEquipmentInstance::OnEquipped` 의 AbilitySet grant 위치 (equipment 시스템 원장 범위). |
| `lyra-gas-ability-policy.html` | 8개 대표 GA (Jump · Death · Heal · Dash · ADS · Melee · Weapon_Fire 베이스 · AutoReload · AutoRespawn) 의 `ActivationPolicy`/`ActivationOwnedTags`/`triggers`/`net policies`/`cooldown` 검증 완료. **남은 ◐**: 32 GA 중 나머지 24 의 동일 필드, 모든 GA 의 `ActivationGroup` 분포 (gas_query 응답에 없으므로 `blueprint_query.get_cdo_properties` 추가 호출 필요). `GA_Melee.triggers=InputTag.Weapon.ADS` 의 의도 (BP 그래프 확인). |
| `lyra-gas-tag-relationships.html` | `TagRelationships_ShooterHero` 의 **9 entry 전체 검증 완료** (Dash 가 모든 액션 차단, Reload 는 Emote 만 차단, Emote 가 Falling 차단 등 정확한 매핑). 추가 ◐ 없음. |
| `lyra-gas-damage-pipeline.html` | 데미지 흐름 검증 완료. 4개 무기 GE + Basic_Instant + Melee 검증 완료 - **모두 modifier 없이 execution 만, 무기별 차이는 `AssetTagsGameplayEffectComponent.DamageType.*` 태그 1개**. Heal_Instant 검증 완료. **남은 ◐**: `GE_Damage_Basic_Periodic` / `_SetByCaller` 2개 (Instant 와 패턴 동일 추정), `ULyraHealthComponent` 가 `LyraHealthSet` 을 ASC 에 add 하는 정확한 위치 (Rider 로 cpp 추적 필요). |
| `lyra-gas-cues.html` | **21개 GCN 의 `cue_tag` ↔ 자산 매핑 전체 검증 완료** (이전 추정 13개 → 실측 21개). 이름 접두어 규칙 (`GCN_` burst / `GCNL_` looping / `GC_` 단일) 검증 완료. 추가 ◐ 없음. |
| `lyra-gas-game-phase.html` | **6 Phase 자산의 `GamePhaseTag` 값 모두 검증 완료** (`ShooterGame.GamePhase.Warmup/Playing/PostGame` - 두 모드 공유). Phase 어빌리티 공통 정책 검증 완료 (`OnInputTriggered` + `Independent` + `ServerOnly`). `GE_PregameLobby` ↔ `Phase_Warmup` 적용 관계는 추정 ◐ (BP graph 또는 cpp 호출 위치로 확인 필요). |
| `lyra-gas-globals-context.html` | **남은 ◐**: `ULyraAbilitySystemGlobals.cpp` 의 컨텍스트 오버라이드 (Rider MCP 로 cpp 확인 필요), `ILyraAbilitySourceInterface` 구현체 (`ULyraRangedWeaponInstance` 등 무기 인스턴스, weapons 원장 범위). |

**보강 작업 결과** - 본 시점 검증 원장의 검증 완료 비율 대폭 상승. HTML 페이지 9개를 만들 때 위 표의 검증 완료 항목은 모두 본문에 확정적으로 인용 가능, ◐ 항목은 본문에서 명시적으로 partial 표시 (배지 `◐`, "추정", "에디터 확인 필요" 등).

**잘못된 추정 정정** - 이전 분석에서 추정으로 적었던 다음 사실은 Monolith 보강 결과 다르게 확인됨:
- GCN 자산 수: 13 → **21** (이름 접두어 누락)
- AbilitySet 의 AttributeSet grant: 라이라 코어는 모두 `[]` - AttributeSet 은 별도 경로 (`ULyraHealthComponent` 등 C++ 컴포넌트가 직접 add). TopDownArena 만 AbilitySet 사용.
- GE_Damage 무기별 차이: modifier 가 아니라 **`AssetTagsGameplayEffectComponent` 태그 1개** (`GameplayEffect.DamageType.*`).
- GamePhase 태그: ShooterCore 와 TopDownArena 가 별도 네임스페이스가 아니라 **같은 `ShooterGame.GamePhase.*` 공유**.

## 원장 범위 한계

현재 검증 원장 ([`gas-code-analysis.md`](gas-code-analysis.md) · [`gas-blueprint-analysis.md`](gas-blueprint-analysis.md)) 의 분석 범위는 `Source/LyraGame/AbilitySystem/` 중심이다. 다음은 범위 밖이거나 다른 시스템 원장과 겹친다:

- **Equipment 의 ASC 통합** - `ULyraEquipmentInstance::OnEquipped` 가 어떤 AbilitySet 을 grant 하는지는 `equipment-code-analysis.md` (별도 시스템 원장) 의 범위. 본 GAS 원장은 인터페이스만 확인.
- **Weapon 의 ability 통합** - `ULyraRangedWeaponInstance` + `ULyraGameplayAbility_RangedWeapon` 의 발사 흐름은 `weapons-code-analysis.md` (별도 시스템 원장) 의 범위. 본 GAS 원장은 클래스 존재만 확인.
- **Inventory 의 ability cost** - `ULyraAbilityCost_InventoryItem` 의 동작은 `inventory-code-analysis.md` (별도 시스템 원장) 의 범위. 본 GAS 원장은 cost interface 만 확인.

따라서 본 학습 섹션 9개의 HTML 페이지 작성 시 위 시스템과의 cross-link 는 chapter-brief 의 "선행 학습" 칸 또는 본문 인용으로 처리. 별도 시스템 페이지 (`lyra-equipment-overview.html` 등) 가 생성되면 그쪽으로 링크.

## 기존 분석 문서와의 관계

| 문서군 | 역할 | 사실의 출처 여부 |
|--------|------|-------------------|
| [`gas-code-analysis.md`](gas-code-analysis.md), [`gas-blueprint-analysis.md`](gas-blueprint-analysis.md) | **검증 원장 (verified fact ledger)** - Rider MCP + Monolith MCP (2026-05-25 보강 완료) 로 확인한 사실의 단일 출처 | 예. 모든 수치·경로·CDO·등록 경로의 근거 |
| 후속 9개 학습 문서 | **기능별 학습 안내서** - 검증 원장의 사실을 데이터 흐름 순서로 재배열 + 실습·디버깅·확장 레시피 | 아니오. 원장 인용 |
| [`gas-references.md`](gas-references.md) | 외부 학습 자료 + 문서 ↔ 프로젝트 매핑 | 아니오. 외부 개념 |

운영 규칙:
- 학습 문서는 사실을 새로 조사하지 말고 검증 원장을 인용. 원장에 없는 사실이 필요하면 Rider / Monolith 로 확인 후 **원장에 먼저 추가** 하고 학습 문서가 인용.
- 학습 문서가 원장과 어긋나는 내용 발견 시 양쪽을 함께 갱신.

## 독자별 학습 경로

### 처음 보는 개발자

1. 전체 지도 (섹션 0)
2. ASC 초기화 4경로 (섹션 1)
3. AbilitySet 부여 (섹션 2)
4. GameplayAbility 활성 정책 (섹션 3)
5. 데미지/힐 파이프라인 (섹션 5)

목표는 "왜 이 어빌리티가 이 캐릭터에 부여돼 있고 어떻게 실행되는가" 를 설명할 수 있게 되는 것.

### 블루프린트 / 디자이너 학습자

1. AbilitySet 부여 (섹션 2)
2. GameplayAbility 활성 정책 (섹션 3)
3. 데미지/힐 파이프라인 (섹션 5)
4. GameplayCue (섹션 6)
5. (게임 모드면) GamePhase (섹션 7)

어빌리티/이펙트/큐 자산을 만들 때 어디에 등록하면 화면에 나오는지·어떤 베이스를 상속해야 하는지 파악.

### C++ 시스템 학습자

1. ASC 초기화 4경로 (섹션 1)
2. AbilitySet 부여 (섹션 2)
3. GameplayAbility 활성 정책 (섹션 3)
4. 태그 관계 (섹션 4)
5. 데미지/힐 파이프라인 (섹션 5)
6. 글로벌 + Context (섹션 8)

ASC 라이프사이클·태그 매핑·execution 작성 등 메커니즘 중심.

### 게임 모드 디자이너

1. ASC 초기화 4경로 (섹션 1) - GameState ASC 만 확인
2. GamePhase (섹션 7) - 핵심
3. 글로벌 ASC (섹션 8) - `ApplyEffectToAll` 활용
4. AbilitySet 부여 (섹션 2) - hero 별 차이 이해

목표는 새 게임 모드의 페이즈 흐름과 모드별 ability 차이를 설계할 수 있게 되는 것.
