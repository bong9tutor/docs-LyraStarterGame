# Lyra 애니메이션 학습 문서 섹션 설계

확인일: 2026-05-22  
목적: Lyra 애니메이션 분석·학습 문서를 기능별로 어떻게 나눌지 결정하기 위한 정보 구조 설계

이 문서는 기존 분석 문서인 [`lyra-animation-blueprint-analysis.md`](lyra-animation-blueprint-analysis.md), [`lyra-animation-code-analysis.md`](lyra-animation-code-analysis.md), [`lyra-animation-references.md`](lyra-animation-references.md)를 바탕으로, 후속 학습 문서를 어떤 기능 단위로 쪼개야 읽기 쉽고 확장하기 쉬운지 정리한다.

## 결론

Lyra 애니메이션 학습 문서는 폴더명이나 asset type 기준이 아니라 "런타임 상태가 들어와서 최종 pose와 효과로 나가는 흐름" 기준으로 나누는 것이 가장 좋다.

검증 결과, 문서의 큰 방향은 적절하다. 다만 두 가지는 수정이 필요하다. 첫째, 애셋 수량은 조사 범위에 따라 달라지므로 "핵심 animation 폴더 기준"과 "post process/retarget 포함 확장 기준"을 구분해야 한다. 둘째, `Actions/Montage`와 `Aiming/ADS`는 모두 상체 pose에 영향을 주지만 성격이 다르다. 전자는 짧은 action montage이고 후자는 상시 aim offset·blend weight 흐름이므로 최종 학습 문서에서는 분리하는 편이 낫다.

추천 상위 섹션은 다음 12개다.

1. 전체 지도와 학습 경로
2. 런타임 상태 입력과 ThreadSafe 갱신: ASC tag, movement, pawn init, `BlueprintThreadSafeUpdateAnimation`
3. `ABP_Mannequin_Base` pose graph
4. `LocomotionSM`: idle/start/cycle/stop/pivot/jump-fall
5. `ALI_ItemAnimLayers`와 `ABP_ItemAnimLayersBase`
6. 무기별 linked layer와 animation set
7. 장비·cosmetic tag 기반 layer/body 선택
8. 상체 액션, montage slot, ability 연동
9. Distance Matching, Stride Warping, Turn In Place
10. IK, Control Rig, post process, retarget
11. Notify, context effects, weapon mesh animation
12. 테스트, 디버깅, 확장 레시피

핵심은 `Rifle`, `Pistol`, `Unarmed`, `Shotgun`을 각각 최상위 섹션으로 만들지 않는 것이다. 이들은 기능 분류라기보다 같은 linked layer 체계 안의 변형이다. 최상위 섹션은 "선택 규칙", "포즈 생성", "액션 합성", "보정", "검증"처럼 시스템 역할로 나누는 편이 학습 효율이 높다.

## 조사 근거

### 기존 문서 구조

현재 문서는 다음 성격으로 나뉘어 있다.

| 문서 | 강점 | 학습 목차로 부족한 점 |
|------|------|------------------------|
| [`lyra-animation-blueprint-analysis.md`](lyra-animation-blueprint-analysis.md) | Monolith로 확인한 ABP, CDO, asset 구조가 구체적이다. | asset별 분석이 중심이라 학습 순서를 별도로 제시해야 한다. |
| [`lyra-animation-code-analysis.md`](lyra-animation-code-analysis.md) | C++ 런타임 연결부를 클래스별로 설명한다. | 코드 클래스 기준이라 pose 흐름과 한 번 더 매핑해야 한다. |
| [`lyra-animation-references.md`](lyra-animation-references.md) | 공식 문서와 개념 자료를 모아 둔다. | 로컬 프로젝트의 기능별 학습 목차는 아니다. |

따라서 후속 학습 문서는 기존 문서를 대체하지 말고, 기존 문서의 사실을 기능 흐름으로 재배열하는 안내서 역할을 해야 한다.

### 로컬 애셋 분포

`Content/Characters/Heroes/Mannequin/Animations` 하위 폴더의 파일 수는 기능을 암시한다. 아래 표는 직접 하위 폴더별 집계이며, `Poses/QuinnIntro_Blockout`은 `Poses` 아래의 별도 하위 폴더로 분리해서 적는다.

| 폴더 | 파일 수 | 해석 |
|------|-------:|------|
| `Locomotion/Rifle` | 118 | 가장 큰 weapon locomotion set. Shotgun이 rifle layer를 재사용하므로 기준 세트 역할이 크다. |
| `Locomotion/Unarmed` | 109 | unequipped/default locomotion set. |
| `Locomotion/Pistol` | 107 | pistol equipped locomotion set. |
| `AimOffsets` | 98 | aiming/ADS/upper-body blend 학습을 별도 섹션으로 둘 근거가 충분하다. |
| `Actions` | 91 | dash, death, melee, grenade toss 같은 montage/action 학습 섹션이 필요하다. |
| `Poses` | 41 | preview, splash, pose asset 성격이 강해 핵심 흐름 뒤에 배치한다. |
| `Poses/QuinnIntro_Blockout` | 14 | intro/blockout pose 자료로, 핵심 locomotion 학습 뒤에 둔다. |
| `Interactions/Bench` | 28 | contextual animation을 별도 확장 섹션으로 분리하는 것이 좋다. |
| `Locomotion/Shotgun` | 5 | shotgun은 독립 locomotion 체계가 아니라 rifle 계열 override로 설명해야 한다. |
| `AnimModifiers` | 4 | curve/notify 생성과 asset 전처리 섹션에서 다룬다. |
| `LinkedLayers` | 2 | 수는 적지만 시스템 중심축이므로 앞쪽에 배치한다. |
| `AnimNotifies` | 2 | notify 자체보다 context effects와 함께 설명한다. |

캐릭터와 weapon animation 폴더 전체의 naming prefix도 같은 결론을 지지한다. 여기서 "핵심 animation 폴더"는 `Content/Characters/Heroes/Mannequin/Animations`와 `Content/Weapons/{Pistol,Rifle,Shotgun}/Animations`를 뜻한다.

| Prefix | 수량 | 섹션화 의미 |
|--------|----:|-------------|
| `MM_` | 355 | Manny/masculine animation sequence가 대량을 차지한다. |
| `MF_` | 129 | Quinn/feminine 변형은 별도 시스템이 아니라 cosmetic style variant다. (animation 자산만; 아래 주의 참조) |
| `AM_` | 51 | montage/action 섹션을 독립시킬 필요가 있다. |
| `ABP_` | 16 | pose graph, layer, weapon mesh ABP를 구분해야 한다. |
| `AO_` | 6 | aiming 섹션에서 aim offset을 집중 설명한다. |
| `BS_` | 3 | blend space는 locomotion/lean 보조 자료로 배치한다. |
| `ALI_` | 1 | interface는 하나지만 linked layer 구조의 관문이다. |
| support assets | 10 | enum, struct, modifier, compression 같은 보조 asset은 부록이나 asset 제작 섹션에 둔다. |

post process와 retarget 분석까지 포함해 `Content/Characters/Heroes/Mannequin/Rig` 및 `Content/Characters/Heroes/Mannequin_UE4/Animations`를 더하면 `ABP_`는 19개가 된다. 이 3개 증가는 `ABP_Manny_PostProcess`, `ABP_Quinn_PostProcess`, `ABP_UE4_Mannequin_Retarget`처럼 final pose 보정·호환성 쪽에 속하므로 핵심 locomotion prefix 표와 섞지 않는다.

`MF_` 접두어 주의 (집계 혼동 방지): `MF_`는 애니메이션 폴더에서 Quinn(feminine) 시퀀스를 뜻하지만 **Material Function**의 접두어이기도 하다. 2026-05-22 파일시스템 전수 검증 결과, 핵심 animation 폴더(`Mannequin/Animations` + `Weapons/{Pistol,Rifle,Shotgun}/Animations`)의 `MF_` 애니메이션은 **129개**다 — 하위폴더 합계 `Actions 2 + AimOffsets 15 + Locomotion(Pistol 35 + Rifle 38 + Shotgun 1 + Unarmed 38) = 129`, Weapons 하위 0. 프로젝트 전체 `MF_*.uasset`는 **181개**이며, 나머지 52개는 Material Function이다(`Effects/MaterialFunctions` 35, `UI` 하위 Materials 14, `Mannequin/Materials/Functions` 3 — 129 + 52 = 181). 위 표의 `MF_` 129는 애니메이션 자산만 집계한 검증값이다. 파일명 접두어만으로 전체를 세면 181이 나오므로 범위를 먼저 고정해야 한다(이 수치는 130이 아니다 — 130은 파일시스템 근거가 없다).

### 코드 구조

코드는 pose를 직접 생성하기보다 ABP가 pose를 만들 수 있는 상태와 선택 규칙을 공급한다.

| 코드 영역 | 대표 파일 | 학습 섹션 |
|-----------|-----------|-----------|
| AnimInstance | [`../Source/LyraGame/Animation/LyraAnimInstance.h`](../Source/LyraGame/Animation/LyraAnimInstance.h) | 런타임 상태 입력 |
| Movement/Character | [`../Source/LyraGame/Character/LyraCharacterMovementComponent.h`](../Source/LyraGame/Character/LyraCharacterMovementComponent.h), [`../Source/LyraGame/Character/LyraCharacter.h`](../Source/LyraGame/Character/LyraCharacter.h) | ground distance, movement mode, crouch |
| Cosmetic selection | [`../Source/LyraGame/Cosmetics/LyraCosmeticAnimationTypes.h`](../Source/LyraGame/Cosmetics/LyraCosmeticAnimationTypes.h) | layer/body 선택 |
| Weapon instance | [`../Source/LyraGame/Weapons/LyraWeaponInstance.h`](../Source/LyraGame/Weapons/LyraWeaponInstance.h) | equipped/unequipped animation layer |
| Character parts | [`../Source/LyraGame/Cosmetics/LyraPawnComponent_CharacterParts.h`](../Source/LyraGame/Cosmetics/LyraPawnComponent_CharacterParts.h) | body mesh, cosmetic tags |
| Context effects | [`../Source/LyraGame/Feedback/ContextEffects/AnimNotify_LyraContextEffects.h`](../Source/LyraGame/Feedback/ContextEffects/AnimNotify_LyraContextEffects.h) | notify와 feedback |
| ShooterTests | [`../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/ShooterTestsActorAnimationTests.cpp`](../Plugins/GameFeatures/ShooterTests/Source/ShooterTestsRuntime/Private/ShooterTestsActorAnimationTests.cpp) | 검증과 디버깅 |

`LyraStarterGame.uproject`에서 애니메이션 학습에 직접 영향을 주는 plugin은 `AnimationLocomotionLibrary`, `AnimationWarping`, `ContextualAnimation`, `GameplayAbilities`, `GameFeatures`, `ModularGameplay`, `EnhancedInput`, `ShooterCore`, `ShooterTests`다. `ControlRig`은 uproject enabled plugin 목록에는 직접 보이지 않았지만, 실제 ABP의 AnimGraph에는 `Control Rig` node와 post process ABP가 있으므로 "실제 애셋 사용" 기준으로 다룬다.

## 섹션 분류 원칙

### 1. 에셋 타입보다 데이터 흐름을 우선한다

`AnimBlueprint`, `AnimSequence`, `AnimMontage`, `BlendSpace`를 타입별로만 나누면 실제 동작을 이해하기 어렵다. Lyra에서는 하나의 기능이 여러 에셋 타입을 동시에 사용한다.

예를 들어 "pistol crouch walk"는 다음을 모두 거친다.

- input과 movement component
- ASC/crouch tag
- `ABP_Mannequin_Base` thread-safe update
- `LocomotionSM`의 `Cycle` 또는 crouch 관련 transition
- `ABP_PistolAnimLayers`의 sequence set
- `ABP_ItemAnimLayersBase`의 play rate, stride warping, distance matching 보조 로직
- optional notify와 context effect
- ShooterTests의 animation playback 검증

따라서 기능별 섹션은 "이 기능을 이해하려면 어떤 런타임 상태와 어떤 asset이 함께 필요한가"를 기준으로 잡아야 한다.

### 2. 선택 규칙과 pose 생성은 분리한다

Lyra에서 어떤 animation layer를 사용할지 결정하는 부분과, 그 layer가 pose를 만드는 부분은 다르다.

| 관심사 | 담당 |
|--------|------|
| Manny/Quinn body mesh 선택 | `B_MannequinPawnCosmetics`, `FLyraAnimBodyStyleSelectionSet` |
| equipped/unequipped layer 선택 | `B_WeaponInstance_*`, `FLyraAnimLayerSelectionSet`, `ULyraWeaponInstance` |
| locomotion state 결정 | `ABP_Mannequin_Base`, `LocomotionSM` |
| 상태별 sequence 재생 | `ABP_ItemAnimLayersBase`와 무기별 layer ABP |

이 네 가지를 같은 섹션에 섞으면 학습자가 "왜 이 애니메이션이 선택됐는가"와 "선택된 애니메이션이 어떻게 재생되는가"를 구분하지 못한다.

### 3. 무기별 차이는 변형 표로 다룬다

`Unarmed`, `Pistol`, `Rifle`, `Shotgun`은 각각 분량이 크지만 최상위 문서가 되면 중복 설명이 늘어난다. 공통 체계는 `ABP_ItemAnimLayersBase`에서 설명하고, 무기별 차이는 표로 비교하는 것이 좋다.

특히 `ABP_ShotgunAnimLayers`는 `ABP_RifleAnimLayers_C`를 부모로 쓰고 sequence 참조도 적다. Shotgun을 독립 섹션으로 세우면 실제 구조보다 더 큰 시스템처럼 보일 수 있다.

### 4. Manny/Quinn은 성별 섹션이 아니라 variant 섹션으로 둔다

`MM_`와 `MF_` sequence 수가 많기 때문에 별도 섹션을 만들고 싶지만, Lyra에서 이 차이는 cosmetic tag와 layer selection의 결과다. 따라서 "Cosmetic style variant" 또는 "body style과 animation style" 섹션에서 다루는 편이 맞다.

### 5. 검증과 디버깅을 뒤가 아니라 옆에 붙인다

ShooterTests는 crouch, pistol jog, Quinn/Manny jog, melee montage, network replication까지 확인한다. 학습 문서의 마지막 부록으로만 두기보다 각 기능 섹션 끝에 "검증 포인트"를 붙이고, 별도 테스트 섹션에서 전체 구조를 정리하는 방식이 좋다.

## 권장 문서 구조

### 0. 전체 지도와 학습 경로

역할: 처음 읽는 사람이 Lyra 애니메이션의 큰 구조를 10분 안에 잡는 섹션.

다룰 내용:

- `ABP_Mannequin_Base`가 base pose graph와 state machine을 담당한다.
- `ABP_ItemAnimLayersBase`와 무기별 linked layer가 실제 sequence set을 담당한다.
- `ULyraAnimInstance`는 ASC tag와 ground distance를 ABP에 공급한다.
- `ULyraWeaponInstance`와 cosmetic tag가 linked layer class를 고른다.
- montage, notify, weapon mesh ABP는 locomotion 위에 얹히는 보조 흐름이다.
- 개념(Linked Anim Layers, Distance Matching, Pose Warping 등)은 [`lyra-animation-references.md`](lyra-animation-references.md)의 공식 문서로, 검증된 로컬 구현 사실은 [`lyra-animation-blueprint-analysis.md`](lyra-animation-blueprint-analysis.md)·[`lyra-animation-code-analysis.md`](lyra-animation-code-analysis.md)로 학습한다.

포함하면 좋은 그림:

- "ASC/movement/equipment/cosmetic -> AnimInstance/ABP -> linked layer -> final pose/effects" 흐름도
- 핵심 asset path 지도

작성 우선순위: 최상

### 1. 런타임 상태 입력과 ThreadSafe 갱신

역할: ABP 변수가 어디서 오는지, 그리고 그 변수를 매 프레임 계산하는 ThreadSafe 갱신 구조를 설명한다. Lyra 애니메이션을 처음 분석할 때 가장 먼저 이해해야 하는 아키텍처이며, 프로젝트 안의 `AnimBP Tour #1`·`#2` 그래프 주석이 이 주제를 직접 안내한다.

핵심 질문:

- `GameplayTag_IsADS`, `GameplayTag_IsFiring`, `IsCrouching`, `GroundDistance`는 어디서 오는가?
- ASC 초기화가 AnimInstance에 어떻게 연결되는가?
- movement mode와 crouch tag는 언제 바뀌는가?
- 왜 Event Graph가 비어 있고 모든 per-frame 로직이 `BlueprintThreadSafeUpdateAnimation`에 있는가?
- thread-safe 함수는 game object 데이터에 직접 접근할 수 없다 — Property Access는 이 제약을 어떻게 푸는가?

ThreadSafe 갱신 구조 (Monolith 검증):

- **Event Graph는 의도적으로 비어 있다.** `ABP_Mannequin_Base`의 Event Graph에는 안내 주석(`AnimBP Tour #1`) 1개뿐이고, `ABP_ItemAnimLayersBase`도 per-frame 로직을 Event Graph에 두지 않는다(두 ABP 모두 `has_tick = false`). Event Graph는 Game Thread에서 ABP마다 순차 실행되어 병목이 되기 때문이다.
- **모든 per-frame 로직은 `BlueprintThreadSafeUpdateAnimation` 함수에 있다.** 이 함수는 여러 ABP에 대해 병렬 실행될 수 있어 Game Thread 부하를 줄인다.
- `ABP_Mannequin_Base`의 `BlueprintThreadSafeUpdateAnimation` 호출 순서(검증): `UpdateLocationData → UpdateRotationData → UpdateVelocityData → UpdateAccelerationData → UpdateWallDetectionHeuristic → UpdateCharacterStateData → UpdateBlendWeightData → UpdateRootYawOffset → UpdateAimingData → UpdateJumpFallData`, 마지막에 `IsFirstUpdate`를 false로 설정한다.
- `ABP_ItemAnimLayersBase`도 같은 패턴이나, 먼저 main ABP 참조가 유효한지 Branch로 확인한 뒤 `Update Blend Weight Data → UpdateJumpFallData → UpdateSkelControlData`를 호출한다. main ABP(`ABP_Mannequin_Base`)의 데이터는 `GetMainAnimBPThreadSafe`로 thread-safe하게 읽어 온다.
- **Property Access**: thread-safe 함수는 다른 스레드가 game object를 동시에 수정할 수 있어 직접 접근이 금지된다. `K2Node_PropertyAccess` 노드가 안전한 시점에 데이터를 복사해 온다(`ABP_Mannequin_Base`에 13개). `AnimBP Tour #2` 주석이 이 이유를 그래프 안에서 직접 설명한다.
- 상태·레이어별 갱신은 **Anim Node Function**(state/linked layer 노드의 `On Update`·`On Become Relevant`·`On Initial Update` 콜백)으로 분산되며, 이 역시 thread-safe하게 실행된다 — 구체 사례는 섹션 3·4에서 다룬다.

주요 대상:

- `ULyraAnimInstance` (`NativeInitializeAnimation`/`NativeUpdateAnimation`, `GameplayTagPropertyMap`, `GroundDistance`)
- `ULyraAbilitySystemComponent::InitAbilityActorInfo`의 AnimInstance 초기화 호출
- `ULyraCharacterMovementComponent::GetGroundInfo`
- `ALyraCharacter::InitializeGameplayTags`, `OnMovementModeChanged`, `OnStartCrouch`, `OnEndCrouch`
- `ULyraPawnExtensionComponent` init state
- `BlueprintThreadSafeUpdateAnimation`와 하위 `Update*Data` 함수군
- `K2Node_PropertyAccess` 노드, `GetMainAnimBPThreadSafe`

포함하면 좋은 그림:

- Event Graph(미사용) ↔ `BlueprintThreadSafeUpdateAnimation`(병렬 실행) 대비도
- `BlueprintThreadSafeUpdateAnimation`의 `Update*Data` 호출 순서 다이어그램

검증 포인트:

- ABP variable watch에서 tag binding 변수가 기대값으로 바뀌는지 확인한다.
- 점프/낙하 문제는 `GroundDistance`, movement mode, velocity를 함께 본다.
- thread-safe 규칙 위반(함수에서 game object 직접 접근)은 컴파일 경고로 드러난다 — Property Access 노드로 교체한다.

참고 온라인 문서: Animation in Lyra의 "Blueprint ThreadSafe Update Animation" 섹션, Animation Optimization, How to Get Animation Variables(아래 "공식 온라인 대조 출처" 표 참조).

작성 우선순위: 최상

### 2. `ABP_Mannequin_Base` pose graph

역할: 최종 pose가 어떤 큰 블록을 통과하는지 설명한다.

핵심 질문:

- locomotion cached pose는 어디서 만들어지는가?
- upper/lower body split은 어디서 일어나는가?
- `FullBody`, `UpperBody`, `UpperBodyAdditive` slot은 어디에 붙는가?
- linked layer와 Control Rig는 pose graph의 어느 위치에 있는가?

주요 대상:

- `/Game/Characters/Heroes/Mannequin/Animations/ABP_Mannequin_Base`
- `AnimGraph`
- cached pose `Locomotion`, `UpperbodyLowerbodySplit`
- slot nodes: `FullBody`, `UpperBody`, `AdditiveHitReact`, `FullBodyAdditivePreAim`, `UpperBodyAdditive`
- linked layers: `FullBody_Aiming`, `FullBodyAdditives`, `FullBody_SkeletalControls`, `LeftHandPose_OverrideState`
- `Rotate Root Bone`, `Control Rig`, `Inertialization`

포함하면 좋은 그림:

- pose graph block diagram
- slot이 locomotion pose 위에 합성되는 위치

작성 우선순위: 최상

### 3. `LocomotionSM`

역할: 이동 state machine을 독립적으로 이해하게 한다.

핵심 질문:

- Idle, Start, Cycle, Stop, Pivot은 어떤 조건으로 이동하는가?
- jump/fall/land 흐름은 locomotion과 어떻게 합류하는가?
- state alias와 conduit는 왜 필요한가?

주요 대상:

- `Idle`, `Start`, `Cycle`, `Stop`, `Pivot`
- `JumpStart`, `JumpStartLoop`, `JumpApex`, `FallLoop`, `FallLand`
- `Idle -> Start -> Cycle`
- `Cycle -> Stop -> Idle`
- `PivotSources -> Pivot`
- `JumpSources -> JumpSelector`
- `FallLand -> Idle/Cycle`

검증 포인트:

- ShooterTests의 crouch/jog test와 state machine 상태를 대응시킨다.
- movement input 없이 falling 상태가 들어왔을 때 `JumpApex` 또는 `FallLoop`로 바로 들어가는 경로를 확인한다.

작성 우선순위: 최상

### 4. Linked Anim Layer 인터페이스와 공통 layer base

역할: base ABP가 왜 weapon-specific sequence를 직접 들고 있지 않은지 설명한다.

핵심 질문:

- `ALI_ItemAnimLayers`는 어떤 layer 함수들을 정의하는가?
- `ABP_ItemAnimLayersBase`는 어떤 변수를 공통으로 제공하는가?
- state machine state와 linked layer 함수는 어떻게 대응되는가?

주요 대상:

- `/Game/Characters/Heroes/Mannequin/Animations/LinkedLayers/ALI_ItemAnimLayers`
- `/Game/Characters/Heroes/Mannequin/Animations/LinkedLayers/ABP_ItemAnimLayersBase`
- `FullBody_IdleState`, `FullBody_StartState`, `FullBody_CycleState`, `FullBody_StopState`, `FullBody_PivotState`
- `FullBody_JumpStartState`, `FullBody_JumpApexState`, `FullBody_FallLoopState`, `FullBody_FallLandState`
- `FullBody_Aiming`, `FullBodyAdditives`, `FullBody_SkeletalControls`

검증 포인트:

- `ABP_Mannequin_Base`의 state result가 linked layer node로 끝나는지 확인한다.
- layer BP가 parent class와 interface를 올바르게 갖는지 확인한다.

작성 우선순위: 최상

### 5. 무기별 animation set과 asset library

역할: `Unarmed`, `Pistol`, `Rifle`, `Shotgun` 차이를 반복 없이 정리한다.

핵심 질문:

- 각 weapon layer ABP는 어떤 parent를 쓰는가?
- 실제 sequence set은 어디에 들어 있는가?
- Shotgun은 왜 rifle layer를 상속하는가?
- `MM_`와 `MF_`는 어떤 차이를 의미하는가?

주요 대상:

- `ABP_UnarmedAnimLayers`, `ABP_UnarmedAnimLayers_Feminine`
- `ABP_PistolAnimLayers`, `ABP_PistolAnimLayers_Feminine`
- `ABP_RifleAnimLayers`, `ABP_RifleAnimLayers_Feminine`
- `ABP_ShotgunAnimLayers`, `ABP_ShotgunAnimLayers_Feminine`
- sequence naming: `Idle`, `Jog`, `Walk`, `Crouch`, `Start`, `Stop`, `Pivot`, `Turn`, `Jump`
- `AO_*` aim offsets
- `BS_*` blend spaces

권장 구성:

- 먼저 공통 변수 카테고리를 설명한다.
- 이후 weapon별 차이는 표로 비교한다.
- 마지막에 naming convention과 sequence 교체 시 필수 curve/notify 체크리스트를 둔다.

작성 우선순위: 상

### 6. 장비와 cosmetic 기반 선택 규칙

역할: "왜 이 layer가 선택됐는가"를 설명한다.

핵심 질문:

- equipped 상태와 unequipped 상태에서 어떤 layer set을 쓰는가?
- `Cosmetic.AnimationStyle.Feminine`은 어디서 오고 어떤 결과를 만드는가?
- body mesh 선택과 animation layer 선택은 어떻게 연결되는가?

주요 대상:

- `/ShooterCore/Weapons/B_WeaponInstance_Base`
- `/ShooterCore/Weapons/Pistol/B_WeaponInstance_Pistol`
- `/ShooterCore/Weapons/Rifle/B_WeaponInstance_Rifle`
- `/ShooterCore/Weapons/Shotgun/B_WeaponInstance_Shotgun`
- `/Game/Characters/Cosmetics/B_MannequinPawnCosmetics`
- `ULyraWeaponInstance::PickBestAnimLayer`
- `FLyraAnimLayerSelectionSet::SelectBestLayer`
- `FLyraAnimBodyStyleSelectionSet::SelectBestBodyStyle`
- `ULyraPawnComponent_CharacterParts::BroadcastChanged`

주의:

- 실제 프로퍼티명은 `UneuippedAnimSet`이다. 코드와 CDO에 있는 오탈자 식별자이므로 문서에서도 그대로 쓴다.

작성 우선순위: 최상

### 7. 상체 액션과 montage slot

역할: 이동 중 melee, grenade toss, dash, reload 같은 action이 어떻게 pose에 합성되는지 설명한다.

핵심 질문:

- montage slot은 `FullBody`와 `UpperBody` 중 무엇을 쓰는가?
- upper-body additive는 어떤 slot과 blend weight를 타는가?
- ability 실패 montage나 melee montage는 어디서 재생을 요청하는가?

주요 대상:

- action montage: `AM_MM_Dash_Forward`, `AM_MM_Pistol_Melee`, `AM_MM_Rifle_GrenadeToss`
- weapon montage: `AM_MM_Pistol_Fire`, `AM_MM_Rifle_Reload`, `AM_Weap_*`
- base AnimGraph slot nodes
- `ULyraGameplayAbility`의 `FailureTagToAnimMontage`
- ShooterTests `WeaponMeleeAnimationTest`

권장 구성:

- slot 이름별 용도 표
- montage sample table
- ability/equipment에서 montage가 트리거되는 흐름
- locomotion과 montage가 충돌할 때 확인할 점

작성 우선순위: 상

### 8. Aiming, ADS, upper-body additive

역할: aim offset과 ADS/hipfire blend를 locomotion과 분리해서 설명한다.

핵심 질문:

- `AimPitch`, `AimYaw`, `IsADS`, `TimeSinceFiredWeapon`은 어떤 blend weight에 영향을 주는가?
- `IdleAimOffset`, `RelaxedAimOffset`은 weapon layer에서 어떻게 교체되는가?
- crouch 상태에서 weapon raise pose는 어떻게 다르게 처리되는가?

주요 대상:

- `FullBody_Aiming`
- `FullBodyAdditives`
- `AimOffsetBlendWeight`
- `HipFireUpperBodyOverrideWeight`
- `RaiseWeaponAfterFiringDuration`
- `RaiseWeaponAfterFiringWhenCrouched`
- `AO_MM_*`, `AO_MF_*`

이 섹션은 `ABP_ItemAnimLayersBase`의 `Update Blend Weight Data`를 중심으로 작성하는 것이 좋다.

작성 우선순위: 상

### 9. Distance Matching, Stride Warping, Turn In Place

역할: Lyra locomotion의 품질을 만드는 procedural/curve 기반 보정층을 설명한다.

핵심 질문:

- start/stop/pivot에서 distance matching은 어떤 값을 목표로 쓰는가?
- cycle play rate는 실제 속도와 어떻게 맞추는가?
- stride warping alpha는 언제 켜지고 꺼지는가?
- root yaw offset과 turn yaw curve는 turn-in-place에 어떻게 쓰이는가?

주요 대상:

- `UpdateStartAnim`
- `UpdateCycleAnim`
- `UpdateStopAnim`
- `UpdatePivotAnim`
- `SetupTurnInPlaceAnim`
- `UpdateTurnInPlaceAnim`
- `GetPredictedStopDistance`
- `ShouldDistanceMatchStop`
- `LocomotionDistanceCurveName`
- `JumpDistanceCurveName`
- `RootYawOffset`, `TurnYawCurveValue`, `RootYawOffsetMode`

권장 구성:

- start/stop/pivot/cycle별 보정 기법 표
- sequence 교체 시 필요한 curve checklist
- 애니메이션이 미끄러질 때 확인할 변수 목록

작성 우선순위: 상

### 10. IK, Control Rig, post process, retarget

역할: final pose 근처에서 일어나는 bone 보정과 skeleton 호환 흐름을 설명한다.

핵심 질문:

- hand IK alpha는 어떤 curve와 setting으로 결정되는가?
- foot placement 또는 Control Rig는 언제 활성화되는가?
- post process ABP는 Manny/Quinn에서 어떤 역할을 하는가?
- UE4 mannequin retarget ABP는 어디까지 핵심 흐름에 포함되는가?

주요 대상:

- `FullBody_SkeletalControls`
- `LeftHandPose_OverrideState`
- `UpdateSkelControlData`
- `ShouldEnableFootPlacement`
- `ShouldEnableControlRig`
- `ABP_Manny_PostProcess`, `ABP_Quinn_PostProcess`
- `ABP_Mannequin_Retarget`, `ABP_UE4_Mannequin_Retarget`
- skeleton virtual bones: `VB IK_Hand_R_chestSpace`, `VB IK_Hand_L_chestSpace`, `VB IK_Hand_L_weaponSpace`

작성 우선순위: 중

### 11. Notify, context effects, weapon mesh animation

역할: pose가 아닌 효과와 별도 skeleton animation을 설명한다.

핵심 질문:

- footstep, surface, audio/VFX 효과는 animation notify에서 어디로 전달되는가?
- 캐릭터 animation과 weapon skeletal mesh animation은 어떻게 분리되어 있는가?
- reload/fire가 캐릭터 montage와 weapon mesh ABP 양쪽에서 재생될 때 어떤 점을 확인해야 하는가?

주요 대상:

- `UAnimNotify_LyraContextEffects`
- `ULyraContextEffectComponent`
- `DT_AnimEffectTags`
- `CFX_DefaultSkin`
- `ABP_Weap_Pistol`, `ABP_Weap_Rifle`, `ABP_Weap_Shotgun`
- `AM_Weap_*`, `Weap_*` sequences

작성 우선순위: 중

### 12. 테스트, 디버깅, 확장 레시피

역할: 학습 내용을 실제 검증 가능한 작업으로 연결한다.

핵심 질문:

- 현재 animation asset이 실제로 재생 중인지 어떻게 확인하는가?
- network replication에서 client/server 모두 같은 animation을 보는지 어떻게 검증하는가?
- 새 weapon, 새 body style, 새 montage를 추가할 때 어떤 순서로 작업해야 하는가?

주요 대상:

- `FShooterTestsAnimationTestHelper::FindAnimationAsset`, `IsAnimationPlaying` (`ShooterTestsAnimationTestHelper.h`)
- `InputCrouchAnimationTest`, `WeaponMeleeAnimationTest` — `ShooterTestsActorAnimationTests.cpp` (`ACTOR_ANIMATION_TEST` 매크로)
- `InputAnimationTest` — `ShooterTestsActorNetworkTests.cpp` (`ACTOR_ANIMATION_NETWORK_TEST` 매크로, 클라이언트/서버 애니메이션 복제 검증)

권장 구성:

- 기능별 디버깅 체크리스트
- 새 weapon 추가 레시피
- 새 cosmetic/body style 추가 레시피
- 새 locomotion sequence 교체 레시피
- 새 montage/action 추가 레시피

작성 우선순위: 상

## 세부 학습 항목 — 기능 키워드 검증 매핑

각 섹션이 다룰 **개별 기능 단위**를 키워드로 조사해, Epic 공식 문서(2026-05-22 열람)와 Monolith 에디터 조회로 교차 검증했다. 후속 학습 문서는 아래 항목을 다루되, 검증 등급을 유지해야 한다. `✅`는 로컬 프로젝트 사실로 써도 되고, `◐`/`△`는 학습 항목이나 확인 과제로 남겨야 한다.

공식 온라인 대조 출처:

| 출처 | 이 문서에서 확인한 개념 |
|------|--------------------------|
| [Animation in Lyra Sample Game](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-in-lyra-sample-game-in-unreal-engine) | Lyra의 Anim Node Functions, State Aliases, upper/lower body layering, linked layer, Distance Matching, Stride/Orientation Warping, Turn in Place |
| [Animation Blueprint Linking](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprint-linking-in-unreal-engine) | Animation Layer Interface, Linked Anim Layer, Link Anim Class Layers, layer별 memory/협업 구조 |
| [Pose Warping](https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine) | Orientation Warping, Stride Warping, Slope Warping의 개념과 `AnimationWarping` 플러그인 전제 |
| [AnimDistanceMatchingLibrary Python API](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/AnimDistanceMatchingLibrary) | `distance_match_to_target`, `advance_time_by_distance_matching`, `set_playrate_to_match_speed` 함수 의미 |
| [How to Get Animation Variables in Animation Blueprints](https://dev.epicgames.com/documentation/en-us/unreal-engine/how-to-get-animation-variables-in-animation-blueprints-in-unreal-engine) 및 [Animation Optimization](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-optimization-in-unreal-engine) | Thread-safe function과 Property Access 사용 목적 |
| [Animation Blueprint Blend Nodes](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprint-blend-nodes-in-unreal-engine) | Blend Poses by Bool/Int/Enum 등 일반 blend node 개념 |

검증 범례: **✅** Monolith 또는 로컬 소스로 직접 확인 · **◐** 공식 문서와 로컬 간접 단서로 확인했으나 노드 단위는 에디터 확인 필요 · **△** 공식 UE 일반 개념 또는 학습 후보이며 Lyra 로컬 사용 범위는 추가 확인 필요

### 섹션 1·2 — `ABP_Mannequin_Base` 런타임 데이터 & pose graph

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| ThreadSafe Update Animation | `BlueprintThreadSafeUpdateAnimation` — `ABP_Mannequin_Base`는 `Update*Data` 함수 10개를 순차 호출(`UpdateLocationData`→…→`UpdateJumpFallData`), `ABP_ItemAnimLayersBase`는 main ABP 유효성 Branch 후 3개 호출. ABP 간 병렬 실행으로 Game Thread 부하 감소 | ✅ + Epic 문서 |
| Event Graph 미사용 (Game Thread 회피) | `ABP_Mannequin_Base`의 `EventGraph`는 안내 주석 1개뿐(`AnimBP Tour #1`); 두 ABP 모두 `has_tick=false` | ✅ |
| Property access | `ABP_Mannequin_Base` thread-safe 함수의 `K2Node_PropertyAccess` 13개(`BlueprintThreadSafeUpdateAnimation`·`UpdateVelocityData`·`UpdateCharacterStateData` 등); `AnimBP Tour #2` 주석이 사용 이유를 직접 설명 | ✅ + Epic 문서 |
| Apply additive | `AnimGraphNode_ApplyAdditive` ×2 (`AnimGraph`) | ✅ |
| Inertialize blending / Dynamic sequence with blend inertialization | `AnimGraphNode_Inertialization` (`AnimGraph`) | ✅ + Epic 문서 |
| Blend poses | `Blend Poses by Bool/Enum` 계열 일반 개념. Lyra layer 그래프 내부에서의 구체 사용 위치는 에디터 확인 필요 | △ |
| Blend options | state transition의 `blend_mode`·`cross_fade_duration`은 확인. Blend Profile/Mask는 공식 문서 일반 개념으로 별도 확인 필요 | ◐ |
| Calculate velocity Locomotion Data | `UpdateVelocityData` 그래프 (`WorldVelocity`, `LocalVelocity2D`) | ✅ |
| Calculate locomotion direction | `SelectCardinalDirectionFromAngle` 그래프, `LocalVelocityDirection` | ✅ |
| Acceleration locomotion direction | `UpdateAccelerationData` 그래프, `PivotDirection2D` | ✅ |

> 반영 사항: 섹션 1("런타임 상태 입력")의 "주요 대상"에 `BlueprintThreadSafeUpdateAnimation`와 그 하위 함수(`UpdateVelocityData`·`UpdateAccelerationData`·`SelectCardinalDirectionFromAngle`)를 포함했다. ABP 변수의 상당수가 이 thread-safe 함수에서 계산되므로, 원시 입력(C++)과 ABP 내부 데이터 처리를 같은 섹션에서 다룬다. 위 키워드 표는 그래서 섹션 1·2를 함께 묶었다.

### 섹션 3 — `LocomotionSM`

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| State machines and shared rules | `LocomotionSM` + state alias(`PivotSources`·`JumpSources` 등)로 transition rule 공유 | ✅ + Epic 문서(State Aliases) |
| cycle on update | `Cycle` state + `UpdateCycleAnim` anim node function(On Update) | ✅ |
| Anim notify state | `Was Anim Notify State Active in Source State (Pivot)` (Pivot→Cycle rule) | ✅ + Epic 문서 |
| Pivot state with dot product | `PivotSources→Pivot` rule: `LocalVelocity2D · LocalAcceleration2D < 0` (속도와 가속이 반대) | ✅ |
| Sync groups / Sync markers / Sync animations | `SyncGroupNameToRequireValidMarkersRule` (Start→Cycle rule) | ◐ transition rule만 확인; sync 노드는 layer 그래프 |

### 섹션 4·5 — Linked Anim Layer 인터페이스 & 무기별 animation set

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Animation layers / Animation layer interfaces | `ALI_ItemAnimLayers` 인터페이스 14함수 | ✅ + Epic 문서 |
| Link anim class | base ABP `AnimGraph`의 `AnimGraphNode_LinkedAnimLayer` ×4 | ✅ + Epic 문서(Animation Blueprint Linking) |
| Layer interfaces for cycle | `FullBody_CycleState` 인터페이스 함수 (LocomotionSM `Cycle` state가 호출) | ✅ |
| Base animation blueprint in layer blueprint | `GetMainAnimBPThreadSafe` 그래프 — layer가 main ABP 데이터 접근 | ✅ + Epic 문서 |
| Animation blueprint childs | `ABP_ShotgunAnimLayers`(parent `ABP_RifleAnimLayers_C`, data-only) 등 무기별 child layer | ✅ + Epic 문서(Child Animation Blueprint) |
| Select animation for cycle / with directions / with structs | `AnimStruct_CardinalDirections` struct + `Jog_Cardinals`·`Walk_Cardinals` 등 12개 변수; `UpdateCycleAnim`·`GetDesiredPivotSequence` | ✅ |

### 섹션 9 — Warping / Distance Matching / Turn In Place

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Stride Warping | `StrideWarpingStartAlpha`·`StrideWarpingCycleAlpha`·`StrideWarpingPivotAlpha` 변수, `StrideWarpingBlendIn*` 설정 | ✅ + Epic 문서 |
| Orientation warping / ~ for pivot | Epic 공식 문서 "Orientation warping" 전용 섹션; `AnimationWarping` 플러그인 활성 | ◐ Epic·플러그인 확인; layer 그래프 노드 미노출 |
| Lean blend space | `BS_MM_Rifle_Jog_Leans` (base ABP가 직접 참조) | ✅ |
| Calculate Lean angle | `AdditiveLeanAngle` 변수, `UpdateRotationData` 그래프 | ✅ |
| Apply additive | `AnimGraphNode_ApplyAdditive` (lean blend space를 additive로 합성) | ✅ |
| Sequence evaluator | `ConvertToSequenceEvaluatorPure` 16개 노드 (Start/Stop/Pivot/Turn/FallLand) | ✅ |
| Distance matching | `AnimBP Tour #9` 그래프 주석; `AnimationLocomotionLibrary` 플러그인 필요 | ✅ + Epic 문서 |
| Distance matching to target | `DistanceMatchToTarget` (`SetUpStopAnim`·`UpdateStopAnim`·`UpdatePivotAnim`·`UpdateFallLandAnim`) | ✅ |
| AdvanceTime by distance matching | `AdvanceTimeByDistanceMatching` (`UpdateStartAnim`·`UpdatePivotAnim`) | ✅ |
| Distance curve | `LocomotionDistanceCurveName`="Distance", `JumpDistanceCurveName`="GroundDistance" | ✅ |
| Predict Stop location | `PredictGroundMovementStopLocation` (`GetPredictedStopDistance` 그래프) | ✅ |
| Predict Pivot location | `PredictGroundMovementPivotLocation` (`UpdatePivotAnim`) | ✅ |
| Rotate root bone | `AnimGraphNode_RotateRootBone` (base ABP `AnimGraph`) | ✅ + Epic 문서 |
| Root yaw offset | `RootYawOffset`·`RootYawOffsetMode` 변수, `UpdateRootYawOffset` 그래프 | ✅ + Epic 문서 |
| Turn in place | `SetupTurnInPlaceAnim`·`UpdateTurnInPlaceAnim`·`SelectTurnInPlaceAnimation` 그래프; `TurnInPlace_Left/Right` 변수 | ✅ + Epic 문서 |

### 섹션 10 — IK / Control Rig / Foot placement

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Foot placement | `ShouldEnableFootPlacement` 그래프 (`ABP_ItemAnimLayersBase`) | ✅ |
| Disable foot placement when jumping | `ShouldEnableFootPlacement`가 curve/property 조건으로 foot placement 여부를 반환한다. jump/fall별 정확한 분기 의도는 에디터에서 그래프 주석과 입력 pin 확인 필요 | ◐ |

### 검증 한계 — anim layer 그래프

`ABP_ItemAnimLayersBase`의 **anim layer 그래프**(`FullBody_CycleState` 등 `ALI_ItemAnimLayers` 인터페이스 구현)는 현재 Monolith 액션이 완전하게 열거하지 않는다. layer BP의 최상위 `AnimGraph`는 `Output Pose` 1개만 노출되고, 실제 pose 노드는 layer 그래프 안에 있다. 따라서 **Stride/Orientation Warping pose 노드, Blend Poses 노드, sequence player의 sync group 설정** 등 layer 그래프 내부는 에디터에서 직접 확인해야 한다. 위 표의 ◐/△ 항목이 이 한계에 해당한다.

### 키워드 검토 결과

- 추가 키워드 목록은 학습 항목으로 적절하다. 다만 모두를 동일한 수준의 로컬 사실로 쓰면 안 된다. `✅` 항목은 문서 본문에 확정적으로 반영하고, `◐`/`△` 항목은 "공식 개념", "에디터 확인 과제", "추가 검증 필요"로 구분한다.
- 현재 목록에서 명백히 프로젝트와 무관한 키워드는 발견하지 못했다. 다만 `Blend Poses`, `Blend Profile/Mask`, `Sync group/marker`, `Orientation Warping pose node`는 Monolith의 layer graph 노출 한계 때문에 에디터 직접 확인 후 로컬 구현 사실로 승격해야 한다.
- 섹션 9(Warping/Distance Matching/Turn In Place)에 키워드가 가장 몰린다. 10개 문서 구성에서 `warping-ik`(섹션 9+10)가 가장 두꺼워지므로, 이 문서는 작성 중 분량을 주시하고 필요하면 `distance-warping-turn-in-place.md`와 `ik-postprocess-retarget.md`로 분리한다.
- 이 키워드 목록에는 섹션 8(Aiming/ADS) 항목이 거의 없다. aiming은 별도 조사가 필요하다(`Update Blend Weight Data`, `AimOffsetBlendWeight`, `HipFireUpperBodyOverrideWeight`, `FullBody_Aiming`, `AO_MM_*`, `AO_MF_*` 등).

## 기존 분석 문서와의 관계

후속 학습 문서를 만들 때 가장 먼저 정해야 할 것은, 이미 있는 두 분석 문서와 새 학습 문서가 어떤 역할을 나눠 갖느냐다. 학습 문서를 만들면서 같은 사실을 다시 조사하면 중복이 생기고 값이 어긋난다.

| 문서군 | 역할 | 사실의 출처 여부 |
|--------|------|-------------------|
| `lyra-animation-blueprint-analysis.md`, `lyra-animation-code-analysis.md` | **검증 원장(verified fact ledger)** — Monolith·C++ 재조회로 확인한 사실의 단일 출처 | 예. 모든 수치·경로·CDO 값의 근거 |
| 후속 10개 학습 문서 | **기능별 학습 안내서** — 검증 원장의 사실을 데이터 흐름 순서로 재배열하고 실습·디버깅·확장 레시피를 더함 | 아니오. 원장을 인용 |
| `lyra-animation-references.md` | 개념 학습용 공식 문서 링크 | 아니오. 외부 개념 |

운영 규칙:

- 학습 문서는 사실을 새로 조사하지 말고 검증 원장을 인용한다. 원장에 없는 사실이 필요하면 Monolith로 확인한 뒤 **원장에 먼저 추가**하고 학습 문서가 그것을 인용한다.
- 학습 문서가 원장과 어긋나는 내용을 발견하면 Monolith로 재확인하고 양쪽을 함께 갱신한다.
- 두 분석 문서를 유지해야 하는 이유: 학습 문서는 흐름 위주라 "이 값이 어디서 검증됐는가"의 추적성이 약해진다. 원장을 유지하면 학습 문서는 가벼워지고 사실 추적은 원장이 담당한다.

## 독자별 학습 경로

### 처음 보는 개발자

1. 전체 지도와 학습 경로
2. 런타임 상태 입력
3. `ABP_Mannequin_Base` pose graph
4. `LocomotionSM`
5. linked layer와 weapon animation set

목표는 "캐릭터가 왜 이 애니메이션을 재생하는지"를 설명할 수 있게 되는 것이다.

### 블루프린트 중심 학습자

1. `ABP_Mannequin_Base` pose graph
2. `LocomotionSM`
3. `ABP_ItemAnimLayersBase`
4. 무기별 layer ABP
5. Distance Matching, Stride Warping, Turn In Place
6. montage slot

코드는 필요한 지점에서만 참조한다. 단, `ULyraAnimInstance`와 `ULyraWeaponInstance`는 반드시 최소 설명을 읽어야 한다.

### C++ 시스템 학습자

1. 런타임 상태 입력
2. 장비·cosmetic tag 기반 선택 규칙
3. Equipment flow
4. Character parts
5. ShooterTests
6. ABP pose graph와 linked layer mapping

목표는 C++ 상태가 ABP 변수와 layer class 선택으로 넘어가는 연결부를 이해하는 것이다.

### 콘텐츠 확장 담당자

1. linked layer와 animation set
2. 장비·cosmetic tag 기반 선택 규칙
3. Distance Matching, Stride Warping, Turn In Place
4. Notify와 context effects
5. 테스트, 디버깅, 확장 레시피

목표는 새 weapon, 새 character variant, 새 sequence를 넣을 때 어떤 asset과 CDO 값을 수정해야 하는지 아는 것이다.

## 각 섹션의 표준 템플릿

후속 문서는 같은 형식을 반복하면 학습자가 빨리 적응한다.

```text
# 섹션 제목

## 이 섹션의 질문
- 이 기능은 왜 필요한가?
- 어떤 런타임 상태나 asset이 입력인가?
- 최종 pose/effect에는 어떤 영향을 주는가?

## 핵심 흐름
- 5~10단계로 데이터 흐름 정리

## 주요 블루프린트/애셋
- Monolith로 확인한 asset path
- parent class, interface, CDO 핵심값

## 주요 C++ 연결부
- 관련 class/function
- Blueprint 변수와 C++ property/function 매핑

## 검증 출처
- 각 사실을 확인한 Monolith action 또는 C++ 파일:행
- 검증하지 못한 추정은 "에디터 확인 필요"로 명시

## 디버깅 포인트
- 문제가 생겼을 때 볼 변수, graph, CDO, test

## 확장 체크리스트
- 새 asset 추가 또는 교체 시 확인할 항목

## 실습
- 에디터에서 직접 확인할 과제 1~3개
```

## 최종 권장 문서 구성

12개 학습 섹션을 **10개 문서 파일**로 묶는다. 섹션은 개념 단위, 문서는 파일 단위다. 처음부터 12개 문서를 만들면 warping/IK, effects/tests처럼 함께 읽어야 할 내용이 흩어지고 중복 설명이 늘어난다. 반면 `Actions/Montage`와 `Aiming/ADS`는 모두 상체 pose에 영향을 주지만 업데이트 방식과 검증 포인트가 달라 분리한다.

| 순서 | 문서 | 포함 섹션 | 우선순위 | 핵심 산출물 |
|-----:|------|-----------|----------|-------------|
| 1 | `lyra-animation-overview.md` | 0 | 최상 | 큰 흐름도, 핵심 asset path 지도, 용어표 |
| 2 | `lyra-animation-runtime-state.md` | 1 | 최상 | ASC tag↔ABP 변수 표, movement state 표, ThreadSafe 갱신 호출 순서 다이어그램 |
| 3 | `lyra-animation-base-abp.md` | 2 | 최상 | pose graph 블록 다이어그램, slot 위치 표 |
| 4 | `lyra-animation-locomotion-sm.md` | 3 | 최상 | state/transition 표, alias·conduit 포함 jump-fall 흐름도 |
| 5 | `lyra-animation-linked-layers.md` | 4, 5 | 최상 | ALI 인터페이스 14함수 매핑, 무기별 layer 비교표 |
| 6 | `lyra-animation-selection-rules.md` | 6 | 최상 | weapon instance CDO 표, cosmetic body mesh rule 표 |
| 7 | `lyra-animation-actions-montage.md` | 7 | 상 | montage slot 표, action montage sample 표, ability/equipment 트리거 흐름 |
| 8 | `lyra-animation-aiming-additives.md` | 8 | 상 | aim offset 목록, ADS/hipfire blend weight 변수 표, `Update Blend Weight Data` 흐름 |
| 9 | `lyra-animation-warping-ik.md` | 9, 10 | 상 | curve 체크리스트, 보정 기능별 graph 목록 |
| 10 | `lyra-animation-effects-tests-recipes.md` | 11, 12 | 상 | notify→context effect 흐름, 새 weapon/body/montage 추가 레시피 |

**섹션 12개 → 문서 10개 묶음 근거** (같은 흐름·관심사는 합치고, 결정과 재생은 나눈다):

- 섹션 4(인터페이스·공통 base)와 5(무기별 set)는 같은 linked layer 체계라 `linked-layers` 한 문서에 둔다.
- 섹션 7(montage 액션)은 transient action 재생이고, 섹션 8(aiming/ADS)은 지속적인 aim offset·additive blend이므로 분리한다. `AimOffsets` 폴더가 98개 asset을 갖고 `ABP_ItemAnimLayersBase`의 `Update Blend Weight Data`가 별도 핵심 그래프라는 점도 분리 근거다.
- 섹션 9(distance matching·warping)와 10(IK·Control Rig·post process)은 final pose 보정층이라 `warping-ik` 한 문서에 둔다.
- 섹션 11(notify·context effect·weapon mesh)과 12(테스트·레시피)는 pose 외부 흐름과 검증이라 `effects-tests-recipes` 한 문서에 둔다.
- 반대로 `LocomotionSM`(state 결정)과 `ABP_ItemAnimLayersBase`(state별 재생), weapon layer 선택(CDO/tag)과 layer 내부 로직(pose 생성)은 **합치지 않는다** — 학습자가 "왜 선택됐는가"와 "어떻게 재생되는가"를 구분해야 하기 때문이다.
- `Manny`/`Quinn`은 독립 문서가 아니라 `selection-rules`와 `linked-layers`의 변형 비교 안에서 다룬다.

**작성 순서:** 1~5번을 먼저 만든다(중심 구조 — 이것만 읽어도 "캐릭터가 왜 이 애니메이션을 재생하는지" 설명 가능). 6~10번은 확장·디버깅용 기능별 참고서로 이어 만든다.

**분리 시점:** 한 문서가 지나치게 커지면 그때 분리한다. 분리 1순위 후보는 `retarget-postprocess`(섹션 10 일부), `contextual-interactions`(`Interactions/Bench` 28개 에셋 기반 별도 확장), `asset-authoring-checklist`(확장 레시피)다. `aiming-additives`는 이미 별도 문서로 시작한다.

**폴더 구조:** 현재 `docs/`는 flat 구조다. 학습 문서가 10개를 넘어 커지면 `docs/animation/` 하위 폴더로 옮기고 번호 접두어(`00-overview.md`, `01-runtime-state.md` …)를 붙여 읽는 순서를 강제한다. Lyra 애니메이션은 개념 의존성이 강하다.
