# Lyra 애니메이션 코드 분석

확인일: 2026-05-22 
분석 범위: `Source/LyraGame` 및 `Plugins/GameFeatures/ShooterTests`의 애니메이션 관련 C++ 코드

## 핵심 요약

Lyra의 애니메이션 코드는 pose를 직접 많이 만들기보다, 블루프린트가 pose를 계산할 수 있도록 런타임 상태와 선택 규칙을 제공한다. 핵심 역할은 네 가지다.

- `ULyraAnimInstance`: Gameplay Ability System tag를 ABP 변수로 바인딩하고 ground distance를 갱신한다.
- `ULyraCharacterMovementComponent`와 `ALyraCharacter`: movement mode, crouch, ground tracing, movement stop tag를 제공한다.
- `FLyraAnimLayerSelectionSet`과 `ULyraWeaponInstance`: 현재 장비와 cosmetic tag에 맞는 linked animation layer class를 고른다.
- `ULyraPawnComponent_CharacterParts`: character part tag를 합치고 body mesh와 physics asset을 적용한다.

## 런타임 흐름

플레이어 캐릭터 애니메이션의 큰 흐름은 다음과 같다.

1. Pawn이 possession과 init state를 거치며 `ULyraPawnExtensionComponent`가 Ability System Component를 초기화한다.
2. `ALyraCharacter::OnAbilitySystemInitialized`가 호출되고, character movement/crouch 등 gameplay tag 상태가 준비된다.
3. `ULyraAnimInstance::NativeInitializeAnimation` 또는 `InitializeWithAbilitySystem`이 ASC를 받아 `GameplayTagPropertyMap`을 초기화한다.
4. `ABP_Mannequin_Base`는 `LyraAnimInstance`를 parent class로 사용하고, tag binding 변수와 movement 값을 thread-safe update graph에서 소비한다.
5. 장비가 바뀌면 `ULyraWeaponInstance::PickBestAnimLayer`가 equipped/unequipped 상태와 cosmetic tags로 linked layer class를 선택한다.
6. Cosmetic component는 character part tags를 병합해 Manny/Quinn body mesh와 physics asset을 적용하고, 같은 tag 계열이 animation layer 선택에도 영향을 준다.

## `ULyraAnimInstance`

파일:

- [`../Source/LyraGame/Animation/LyraAnimInstance.h`](../Source/LyraGame/Animation/LyraAnimInstance.h)
- [`../Source/LyraGame/Animation/LyraAnimInstance.cpp`](../Source/LyraGame/Animation/LyraAnimInstance.cpp)

`ULyraAnimInstance`는 `UAnimInstance`를 상속한다. ABP 입장에서 가장 중요한 멤버는 `GameplayTagPropertyMap`과 `GroundDistance`다.

| 멤버/함수 | 역할 |
|-----------|------|
| `FGameplayTagBlueprintPropertyMap GameplayTagPropertyMap` | ASC의 gameplay tag 상태를 AnimInstance의 Blueprint 변수에 자동 반영 |
| `InitializeWithAbilitySystem(UAbilitySystemComponent* ASC)` | tag property map 초기화 |
| `NativeInitializeAnimation()` | owning actor에서 ASC를 찾아 초기화 |
| `NativeUpdateAnimation(float DeltaSeconds)` | owning actor가 `ALyraCharacter`이면 movement component의 ground info를 읽어 `GroundDistance` 갱신 |
| `IsDataValid()` | editor validation에서 tag property map 검증 |

### 실제 태그 ↔ 변수 매핑

`GameplayTagPropertyMap`은 `UPROPERTY(EditDefaultsOnly)`이므로 C++에는 빈 컨테이너만 있고, 실제 매핑은 **`ABP_Mannequin_Base`의 CDO**에 저장된다. Monolith `get_cdo_properties`로 읽은 `PropertyMappings`는 다음 5개다.

| Gameplay Tag | ABP bool 변수 |
|--------------|---------------|
| `Event.Movement.ADS` | `GameplayTag_IsADS` |
| `Event.Movement.WeaponFire` | `GameplayTag_IsFiring` |
| `Event.Movement.Reload` | `GameplayTag_IsReloading` |
| `Event.Movement.Dash` | `GameplayTag_IsDashing` |
| `Event.Movement.Melee` | `GameplayTag_IsMelee` |

ASC에 `Event.Movement.*` 태그가 추가/제거되면 해당 bool 변수가 자동으로 갱신된다. 즉 ABP는 ability/gameplay state를 직접 질의하지 않고, AnimInstance에 미러링된 bool 값을 읽는다. 이 5개 변수 중 `GameplayTag_IsMelee`는 `LocomotionSM`의 `Idle → Start` / `Cycle → Stop` transition 조건에도 직접 쓰인다(근접공격 중 이동 시작 차단).

> 새 게임플레이 상태를 ABP로 노출할 때는 ABP CDO의 이 매핑에 항목을 추가한다. C++ `ULyraAnimInstance`를 수정할 필요는 없다.

`GroundDistance`는 jump/fall/land 판단과 animation graph 보정에 쓰이는 입력값이다. 실제 tracing은 movement component가 담당하며, `LocomotionSM`의 `FallLoop → FallLand` transition이 이 값을 직접 참조한다.

## `ULyraCharacterMovementComponent`

파일:

- [`../Source/LyraGame/Character/LyraCharacterMovementComponent.h`](../Source/LyraGame/Character/LyraCharacterMovementComponent.h)
- [`../Source/LyraGame/Character/LyraCharacterMovementComponent.cpp`](../Source/LyraGame/Character/LyraCharacterMovementComponent.cpp)

애니메이션 관점에서 중요한 기능은 ground info와 movement stop tag 처리다.

| 기능 | 설명 |
|------|------|
| `FLyraCharacterGroundInfo` | `GroundHitResult`, `GroundDistance`를 보관 |
| `GetGroundInfo()` | frame 단위로 캐시하며, walking이면 ground distance 0, 공중이면 capsule 아래로 line trace |
| `SetReplicatedAcceleration()` | replicated acceleration을 movement prediction에 반영 |
| `GetDeltaRotation()` | `Gameplay.MovementStopped` tag가 있으면 회전량 0 반환 |
| `GetMaxSpeed()` | `Gameplay.MovementStopped` tag가 있으면 이동 속도 0 반환 |

ABP의 jump/fall 관련 변수는 movement mode, velocity, acceleration, `GroundDistance`가 결합된 결과다. 따라서 애니메이션 문제를 볼 때 sequence만 보면 부족하고 movement component의 상태도 함께 확인해야 한다.

## `ALyraCharacter`

파일:

- [`../Source/LyraGame/Character/LyraCharacter.h`](../Source/LyraGame/Character/LyraCharacter.h)
- [`../Source/LyraGame/Character/LyraCharacter.cpp`](../Source/LyraGame/Character/LyraCharacter.cpp)

`ALyraCharacter`는 생성자에서 Lyra 전용 movement component를 사용하도록 설정하고, mesh를 Lyra coordinate convention에 맞게 회전시킨다. 애니메이션에 직접 영향을 주는 코드는 gameplay tag 갱신이다.

| 함수 | 애니메이션 관련 역할 |
|------|----------------------|
| `OnAbilitySystemInitialized()` | ASC 초기화 이후 health와 gameplay tag 초기화 |
| `InitializeGameplayTags()` | movement mode 관련 loose tag를 정리하고 현재 movement mode tag 설정 |
| `OnMovementModeChanged()` | 이전 movement mode tag 제거, 새 movement mode tag 추가 |
| `OnStartCrouch()` | `Status_Crouching` tag 추가 |
| `OnEndCrouch()` | `Status_Crouching` tag 제거 |

ABP의 `IsCrouching`, `IsOnGround`, jump/fall 상태는 character movement와 tag 상태를 같이 반영한다. crouch animation이 재생되지 않을 때는 input, character crouch state, ASC tag, ABP 변수 갱신을 순서대로 확인해야 한다.

## `ULyraPawnExtensionComponent`

파일:

- [`../Source/LyraGame/Character/LyraPawnExtensionComponent.h`](../Source/LyraGame/Character/LyraPawnExtensionComponent.h)
- [`../Source/LyraGame/Character/LyraPawnExtensionComponent.cpp`](../Source/LyraGame/Character/LyraPawnExtensionComponent.cpp)

이 component는 animation 전용은 아니지만 AnimInstance 초기화의 전제 조건이다. Pawn init state를 `Spawned -> DataAvailable -> DataInitialized -> GameplayReady`로 진행시키고 ASC를 pawn에 연결한다.

`InitializeAbilitySystem()`은 ASC actor info를 설정하고 `PawnData->TagRelationshipMapping`을 적용한 뒤 `OnAbilitySystemInitialized` delegate를 방송한다. `ALyraCharacter`는 이 시점을 받아 gameplay tag와 health component를 준비한다.

AnimInstance가 ASC tag를 읽기 위해서는 이 초기화가 먼저 끝나야 한다. 초기 스폰 직후 animation state가 잠깐 비어 보이는 문제는 이 init state 순서를 의심해야 한다.

## Cosmetic animation type

파일:

- [`../Source/LyraGame/Cosmetics/LyraCosmeticAnimationTypes.h`](../Source/LyraGame/Cosmetics/LyraCosmeticAnimationTypes.h)
- [`../Source/LyraGame/Cosmetics/LyraCosmeticAnimationTypes.cpp`](../Source/LyraGame/Cosmetics/LyraCosmeticAnimationTypes.cpp)

이 파일은 Blueprint CDO에 저장되는 선택 규칙의 C++ 타입을 정의한다.

| 타입 | 필드 | 역할 |
|------|------|------|
| `FLyraAnimLayerSelectionEntry` | `Layer`, `RequiredTags` | 특정 tag 조건에서 사용할 linked anim layer class |
| `FLyraAnimLayerSelectionSet` | `LayerRules`, `DefaultLayer` | 첫 번째 matching rule의 layer를 반환하고, 없으면 default 반환 |
| `FLyraAnimBodyStyleSelectionEntry` | `Mesh`, `RequiredTags` | 특정 tag 조건에서 사용할 skeletal mesh |
| `FLyraAnimBodyStyleSelectionSet` | `MeshRules`, `DefaultMesh`, `ForcedPhysicsAsset` | body mesh와 optional forced physics asset 선택 |

선택 함수는 복잡한 scoring을 하지 않는다. 배열을 앞에서부터 순회해 `RequiredTags`가 모두 포함된 첫 entry를 반환한다. 따라서 Blueprint CDO에서 rule 순서가 의미를 가진다.

## `ULyraWeaponInstance`

파일:

- [`../Source/LyraGame/Weapons/LyraWeaponInstance.h`](../Source/LyraGame/Weapons/LyraWeaponInstance.h)
- [`../Source/LyraGame/Weapons/LyraWeaponInstance.cpp`](../Source/LyraGame/Weapons/LyraWeaponInstance.cpp)

`ULyraWeaponInstance`는 장비와 애니메이션 레이어를 연결하는 핵심 클래스다. 다만 실제 무기 Blueprint(`B_WeaponInstance_*`)의 직접 C++ 부모는 이 클래스의 자식인 `ULyraRangedWeaponInstance`(`Source/LyraGame/Weapons/LyraRangedWeaponInstance.h`, `ULyraWeaponInstance` 상속)다. 아래 멤버 중 `EquippedAnimSet`/`UneuippedAnimSet`은 `ULyraWeaponInstance`에 정의되어 자식 클래스로 상속된다.

| 멤버/함수 | 역할 |
|-----------|------|
| `EquippedAnimSet` | 무기를 장착했을 때 선택할 linked anim layer set |
| `UneuippedAnimSet` | 무기를 장착 해제했을 때 선택할 linked anim layer set. 실제 코드의 오탈자 이름 유지 |
| `PickBestAnimLayer(bool bEquipped, const FGameplayTagContainer& CosmeticTags)` | equipped 여부에 따라 set을 고르고 cosmetic tags로 최적 layer class 반환 |
| `OnEquipped()` | 장비 시간 기록, input device properties 적용 |
| `OnUnequipped()` | input device properties 제거 |
| `UpdateFiringTime()` | 발사 시각 갱신 |
| `GetTimeSinceLastInteractedWith()` | 마지막 장비/발사 이후 시간 반환 |

Blueprint `B_WeaponInstance_Pistol`, `B_WeaponInstance_Rifle`, `B_WeaponInstance_Shotgun`은 `EquippedAnimSet`에 각 무기 layer를 넣고, `UneuippedAnimSet`은 base의 unarmed layer를 상속한다. `PickBestAnimLayer`는 `Cosmetic.AnimationStyle.Feminine` 태그가 있을 때 feminine layer를 선택한다.

## Equipment flow

관련 파일:

- [`../Source/LyraGame/Equipment/LyraEquipmentInstance.h`](../Source/LyraGame/Equipment/LyraEquipmentInstance.h)
- [`../Source/LyraGame/Equipment/LyraEquipmentInstance.cpp`](../Source/LyraGame/Equipment/LyraEquipmentInstance.cpp)
- [`../Source/LyraGame/Equipment/LyraEquipmentManagerComponent.h`](../Source/LyraGame/Equipment/LyraEquipmentManagerComponent.h)
- [`../Source/LyraGame/Equipment/LyraEquipmentManagerComponent.cpp`](../Source/LyraGame/Equipment/LyraEquipmentManagerComponent.cpp)

Equipment manager는 equipment definition에서 instance를 만들고 ability set을 부여한 뒤 equipment actor를 spawn한다. spawn된 actor는 owner pawn이 character라면 `ACharacter::GetMesh()`에 attach된다.

이 흐름은 weapon mesh animation과 캐릭터 animation layer 선택의 전제다. 장비 instance가 없으면 `ULyraWeaponInstance::PickBestAnimLayer`를 호출할 대상도 없고, weapon skeletal mesh ABP도 attach되지 않는다.

## Character parts와 body style

관련 파일:

- [`../Source/LyraGame/Cosmetics/LyraPawnComponent_CharacterParts.h`](../Source/LyraGame/Cosmetics/LyraPawnComponent_CharacterParts.h)
- [`../Source/LyraGame/Cosmetics/LyraPawnComponent_CharacterParts.cpp`](../Source/LyraGame/Cosmetics/LyraPawnComponent_CharacterParts.cpp)
- [`../Source/LyraGame/Cosmetics/LyraControllerComponent_CharacterParts.h`](../Source/LyraGame/Cosmetics/LyraControllerComponent_CharacterParts.h)
- [`../Source/LyraGame/Cosmetics/LyraControllerComponent_CharacterParts.cpp`](../Source/LyraGame/Cosmetics/LyraControllerComponent_CharacterParts.cpp)

`ULyraPawnComponent_CharacterParts`는 replicated fast array (`FLyraCharacterPartList`) 로 character part 목록을 관리한다. 두 단계는 **C++ 함수가 다르고 책임이 분리**되어 있다.

### 1단계 - Character part actor spawn / attach

[`../Source/LyraGame/Cosmetics/LyraPawnComponent_CharacterParts.cpp`](../Source/LyraGame/Cosmetics/LyraPawnComponent_CharacterParts.cpp) `PostReplicatedAdd` / `AddEntry` → `FLyraCharacterPartList::SpawnActorForEntry(Entry)` 호출.

- `SpawnActorForEntry` 는 `UChildActorComponent` 를 만들어 `Entry.SpawnedComponent` (`TObjectPtr<UChildActorComponent>`, header 선언) 에 저장하고, owner 의 `GetSceneComponentToAttachTo()` (Character 면 mesh, 아니면 root) 에 attach 한다.
- spawn 된 child actor 는 보통 `B_Manny` 또는 `B_Quinn` 같은 cosmetic BP 의 인스턴스로, 자기 root `MeshComponent` 가 owner mesh 에 attach 된다.
- spawn 직후 owner 의 `BroadcastChanged()` 가 호출된다.

### 2단계 - Body mesh selection & 적용 (`BroadcastChanged`)

`BroadcastChanged()` 는 모든 spawned character part actor (각각 `IGameplayTagAssetInterface` 구현 가정) 에서 tag 를 수집해 병합한 뒤 `BodyMeshes.SelectBestBodyStyle(MergedTags)` 로 invisible driving skeletal mesh 를 고른다. 선택된 mesh 는 `SetSkeletalMesh(..., true)` 로 owner pawn 의 mesh 에 적용되고, `ForcedPhysicsAsset` 이 있으면 physics asset 도 함께 바뀐다. 마지막으로 `OnCharacterPartsChanged` delegate 가 broadcast.

> 학습 시 두 단계를 헷갈리지 말 것 - **spawn/attach 는 `SpawnActorForEntry`, mesh selection 은 `BroadcastChanged`** 다. visible cosmetic mesh 가 어디에 붙는가 (1단계) 와 invisible driving mesh 가 어떤 mesh 로 결정되는가 (2단계) 는 서로 다른 단계이며, `ABP_Mannequin_CopyPose` 의 attached-parent pose 복제는 1단계에서 만들어진 attach 관계를 사용한다.

`ULyraControllerComponent_CharacterParts`는 controller 측 authority component다. possessed pawn이 바뀔 때 part를 이전 pawn에서 새 pawn으로 옮기며, developer/cheat part와 natural part suppression을 지원한다.

애니메이션 관점에서 중요한 점은 character part tags가 body mesh뿐 아니라 weapon instance의 animation layer 선택에도 쓰인다는 것이다. Cosmetic tag 설계를 바꾸면 외형과 animation layer가 함께 바뀔 수 있다.

## Context effect notify

파일:

- [`../Source/LyraGame/Feedback/ContextEffects/AnimNotify_LyraContextEffects.h`](../Source/LyraGame/Feedback/ContextEffects/AnimNotify_LyraContextEffects.h)
- [`../Source/LyraGame/Feedback/ContextEffects/AnimNotify_LyraContextEffects.cpp`](../Source/LyraGame/Feedback/ContextEffects/AnimNotify_LyraContextEffects.cpp)

`AnimNotify_LyraContextEffects`는 animation notify에서 surface/context 기반 효과를 재생하는 연결부다. Locomotion sequence의 발소리나 환경 반응은 pose graph가 아니라 notify와 context effect system을 통해 처리된다.

애니메이션을 교체할 때 발소리나 착지 효과가 사라졌다면 sequence notify와 context effect tag data를 확인해야 한다.

## 자동화 테스트

관련 파일:

- [`../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/Utilities/ShooterTestsAnimationTestHelper.h`](../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/Utilities/ShooterTestsAnimationTestHelper.h)
- [`../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/Utilities/ShooterTestsAnimationTestHelper.cpp`](../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/Utilities/ShooterTestsAnimationTestHelper.cpp)
- [`../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/Utilities/ShooterTestsActorTest.h`](../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/Utilities/ShooterTestsActorTest.h)
- [`../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/ShooterTestsActorAnimationTests.cpp`](../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/ShooterTestsActorAnimationTests.cpp)

ShooterTests에는 애니메이션 재생을 직접 검증하는 테스트가 있다.

`FShooterTestsAnimationTestHelper::FindAnimationAsset`은 player mesh의 skeleton과 같은 `UAnimationAsset` 중 이름이 일치하는 asset을 찾는다. `IsAnimationPlaying`은 모든 AnimInstance를 순회하면서 active montage 또는 sync group/ungrouped active player의 `FAnimTickRecord::SourceAsset`이 기대 asset인지 확인한다.

테스트가 확인하는 대표 animation 이름은 다음과 같다.

| 분류 | 이름 |
|------|------|
| Manny pistol jog | `MM_Pistol_Jog_Fwd`, `MM_Pistol_Jog_Bwd`, `MM_Pistol_Jog_Left`, `MM_Pistol_Jog_Right` |
| Quinn pistol jog | `MF_Pistol_Jog_Fwd`, `MF_Pistol_Jog_Bwd`, `MF_Pistol_Jog_Left`, `MF_Pistol_Jog_Right` |
| Pistol crouch | `MM_Pistol_Crouch_Idle`, `MM_Pistol_Crouch_Walk_Fwd`, `MM_Pistol_Crouch_Walk_Bwd`, `MM_Pistol_Crouch_Walk_Left`, `MM_Pistol_Crouch_Walk_Right`, `MM_Pistol_Crouch_TurnLeft_90`, `MM_Pistol_Crouch_TurnRight_90` |
| Pistol jump | `MM_Pistol_Jump_Apex` |
| Melee montage | `AM_MM_Pistol_Melee`, `AM_MM_Rifle_Melee`, `AM_MM_Shotgun_Melee` |

`InputCrouchAnimationTest`는 `L_ShooterTest_Basic`에서 crouch idle 진입을 기다린 뒤 forward/back/strafe/rotate 입력별 crouch animation을 확인한다.

`WeaponMeleeAnimationTest`는 weapon spawner를 만들어 Pistol/Rifle/Shotgun을 장착시키고, melee input 후 weapon별 melee montage가 재생되는지 확인한다.

## Blueprint와 C++ 대응표

| Blueprint/Asset | C++ 연결부 | 의미 |
|-----------------|------------|------|
| `ABP_Mannequin_Base` | `ULyraAnimInstance` | tag binding, ground distance, ABP 변수 입력 |
| `ABP_ItemAnimLayersBase` | Animation Blueprint thread-safe functions, Animation Locomotion Library nodes | sequence 선택, distance matching, stride warping, hand IK alpha |
| `ABP_PistolAnimLayers` 등 | `FLyraAnimLayerSelectionSet`, `ULyraWeaponInstance` | weapon/cosmetic tag 기반 linked layer 선택 |
| `B_WeaponInstance_*` | `ULyraRangedWeaponInstance` (`ULyraWeaponInstance` 상속) | `EquippedAnimSet`, `UneuippedAnimSet` CDO 저장 (두 프로퍼티는 `ULyraWeaponInstance`에 정의) |
| `B_MannequinPawnCosmetics` | `ULyraPawnComponent_CharacterParts`, `FLyraAnimBodyStyleSelectionSet` | body mesh와 physics asset 선택 |
| Montage slot | `UAnimMontage`, AnimGraph slot nodes | full-body 또는 upper-body 동작 합성 |
| Sequence notifies | `AnimNotify_LyraContextEffects` | footstep/context effect 재생 |

## 디버깅 체크리스트

애니메이션이 예상과 다르게 재생될 때는 다음 순서로 본다.

1. 현재 pawn이 `ABP_Mannequin_Base` 계열 AnimClass를 쓰는지 확인한다.
2. ASC가 초기화되어 `GameplayTagPropertyMap`이 tag 변수를 갱신하는지 확인한다.
3. `ULyraWeaponInstance`가 존재하고 `PickBestAnimLayer`가 기대 layer class를 반환하는지 확인한다.
4. Cosmetic tags가 `Cosmetic.AnimationStyle.Feminine` 또는 masculine/default 기대값과 맞는지 확인한다.
5. `B_WeaponInstance_*` CDO의 `EquippedAnimSet`/`UneuippedAnimSet`이 올바른 layer BP를 가리키는지 확인한다.
6. 교체한 sequence에 distance curve, turn yaw curve, notify, sync group 요구사항이 남아 있는지 확인한다.
7. montage 문제라면 slot 이름이 base AnimGraph의 slot node와 일치하는지 확인한다.

## 확장 시 권장 방식

새 캐릭터 외형을 추가할 때는 `FLyraAnimBodyStyleSelectionSet`의 mesh rule과 `FLyraAnimLayerSelectionSet`의 layer rule을 같은 tag 체계로 설계한다. 외형 mesh만 바꾸면 animation layer가 기존 Manny/Quinn 세트를 계속 사용할 수 있다.

새 무기를 추가할 때는 `ULyraWeaponInstance` 파생 Blueprint를 만들고 `EquippedAnimSet`에 새 item layer ABP를 넣는다. base character ABP를 복제하는 방식은 Lyra의 linked layer 구조와 맞지 않고 유지보수 비용이 커진다.

새 locomotion sequence를 넣을 때는 `ABP_ItemAnimLayersBase`가 기대하는 curve와 graph update를 기준으로 검증한다. 특히 distance matching, stride warping, turn-in-place, hand IK alpha는 sequence 교체 후 깨지기 쉽다.
