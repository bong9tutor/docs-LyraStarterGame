# Lyra 애니메이션 학습 문서 섹션 설계

확인일: 2026-05-22 
목적: Lyra 애니메이션 분석·학습 문서를 기능별로 어떻게 나눌지 결정하기 위한 정보 구조 설계

이 문서는 기존 분석 문서인 [`animation-blueprint-analysis.md`](animation-blueprint-analysis.md), [`animation-code-analysis.md`](animation-code-analysis.md), [`animation-references.md`](animation-references.md)를 바탕으로, 후속 학습 문서를 어떤 기능 단위로 쪼개야 읽기 쉽고 확장하기 쉬운지 정리한다.

## 결론

Lyra 애니메이션 학습 문서는 폴더명이나 asset type 기준이 아니라 "런타임 상태가 들어와서 최종 pose와 효과로 나가는 흐름" 기준으로 나누는 것이 가장 좋다.

검증 결과, 문서의 큰 방향은 적절하다. 다만 두 가지는 수정이 필요하다. 첫째, 애셋 수량은 조사 범위에 따라 달라지므로 "핵심 animation 폴더 기준"과 "post process/retarget 포함 확장 기준"을 구분해야 한다. 둘째, `Actions/Montage`와 `Aiming/ADS`는 모두 상체 pose에 영향을 주지만 성격이 다르다. 전자는 짧은 action montage이고 후자는 상시 aim offset·blend weight 흐름이므로 최종 학습 문서에서는 분리하는 편이 낫다.

추천 상위 섹션은 다음 14개로, **메커니즘 학습 12개 + 설계 의도와 트레이드오프 2개** 의 두 묶음으로 나뉜다.

메커니즘 학습 (섹션 1 - 섹션 12) - "무엇이 어떻게 동작하는가":

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

설계 의도와 트레이드오프 (섹션 13 - 섹션 14) - "왜 이렇게 만들었고 무엇을 포기했는가":

13. AnimBP / ALI 책임 분담과 설계 트레이드오프 - 7종 (`ABP_Mannequin_Base`, `ABP_ItemAnimLayersBase`, 무기별 layer, `ABP_Weap_*`, `ABP_*_PostProcess`, `ABP_*_Retarget`, `ALI_ItemAnimLayers`) 의 책임 분리와 그 비용/이득
14. Invisible Mesh + Copy Pose + Cosmetic Layer 아키텍처 - `SKM_*_Invis` 의 driving mesh 역할, `ABP_Mannequin_CopyPose` 의 "Copy Pose From Mesh" 기반 cosmetic mesh 동기화, `B_Manny`/`B_Quinn` 의 design-intent comment 가 직접 설명하는 분리 이유

핵심은 `Rifle`, `Pistol`, `Unarmed`, `Shotgun`을 각각 최상위 섹션으로 만들지 않는 것이다. 이들은 기능 분류라기보다 같은 linked layer 체계 안의 변형이다. 최상위 섹션은 "선택 규칙", "포즈 생성", "액션 합성", "보정", "검증"처럼 시스템 역할로 나누는 편이 학습 효율이 높다. 마찬가지로 섹션 13·섹션 14 는 "왜 이 구조인가" 를 별도 묶음으로 두어 메커니즘 학습의 동선을 흐리지 않는다.

## 조사 근거

### 기존 문서 구조

현재 문서는 다음 성격으로 나뉘어 있다.

| 문서 | 강점 | 학습 목차로 부족한 점 |
|------|------|------------------------|
| [`animation-blueprint-analysis.md`](animation-blueprint-analysis.md) | Monolith로 확인한 ABP, CDO, asset 구조가 구체적이다. | asset별 분석이 중심이라 학습 순서를 별도로 제시해야 한다. |
| [`animation-code-analysis.md`](animation-code-analysis.md) | C++ 런타임 연결부를 클래스별로 설명한다. | 코드 클래스 기준이라 pose 흐름과 한 번 더 매핑해야 한다. |
| [`animation-references.md`](animation-references.md) | 공식 문서와 개념 자료를 모아 둔다. | 로컬 프로젝트의 기능별 학습 목차는 아니다. |

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

`MF_` 접두어 주의 (집계 혼동 방지): `MF_`는 애니메이션 폴더에서 Quinn(feminine) 시퀀스를 뜻하지만 **Material Function**의 접두어이기도 하다. 2026-05-22 파일시스템 전수 검증 결과, 핵심 animation 폴더(`Mannequin/Animations` + `Weapons/{Pistol,Rifle,Shotgun}/Animations`)의 `MF_` 애니메이션은 **129개**다 - 하위폴더 합계 `Actions 2 + AimOffsets 15 + Locomotion(Pistol 35 + Rifle 38 + Shotgun 1 + Unarmed 38) = 129`, Weapons 하위 0. 프로젝트 전체 `MF_*.uasset`는 **181개**이며, 나머지 52개는 Material Function이다(`Effects/MaterialFunctions` 35, `UI` 하위 Materials 14, `Mannequin/Materials/Functions` 3 - 129 + 52 = 181). 위 표의 `MF_` 129는 애니메이션 자산만 집계한 검증값이다. 파일명 접두어만으로 전체를 세면 181이 나오므로 범위를 먼저 고정해야 한다(이 수치는 130이 아니다 - 130은 파일시스템 근거가 없다).

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

### 6. 설계 의도와 트레이드오프는 별도 묶음으로 둔다

섹션 1 - 섹션 12 는 "이 시스템이 무엇이고 어떻게 동작하는가" 를 다룬다. 같은 페이지 안에서 "왜 이렇게 만들었는가" 를 같이 다루려고 하면 본문이 두 가지 톤으로 갈라지고, 메커니즘 학습 동선이 흐려진다.

대신 섹션 13 (AnimBP·ALI 책임 분담), 섹션 14 (Invisible Mesh + Copy Pose 아키텍처) 같은 **설계 의도 전용 섹션** 을 후반부에 묶어, 학습자가 메커니즘을 충분히 본 뒤 "왜 이 분배인가, 무엇을 포기했는가" 를 한 번에 본다. 두 섹션 모두 새 사실보다는 **이미 검증된 사실 위에 인과·trade-off 추론을 얹는 성격** 이므로, `note-design` 박스와 `comparison-section` (단일 mesh vs invisible+visible 같은 대비) 를 주된 표현 수단으로 쓴다.

이 묶음은 다음 두 가지 함정을 피한다.

- "기능 페이지마다 설계 의도 박스를 길게 다는" 분산 - 페이지 길이가 늘고 핵심이 묻힌다.
- "설계 의도 페이지" 가 새 사실을 정의 - HTML 사양상 금지. 두 섹션 모두 섹션 1 - 섹션 12 의 사실을 인용만 하고, 트레이드오프는 인용된 사실에서 도출된 추론으로 적는다.

## 권장 문서 구조

### 0. 전체 지도와 학습 경로

역할: 처음 읽는 사람이 Lyra 애니메이션의 큰 구조를 10분 안에 잡는 섹션.

다룰 내용:

- `ABP_Mannequin_Base`가 base pose graph와 state machine을 담당한다.
- `ABP_ItemAnimLayersBase`와 무기별 linked layer가 실제 sequence set을 담당한다.
- `ULyraAnimInstance`는 ASC tag와 ground distance를 ABP에 공급한다.
- `ULyraWeaponInstance`와 cosmetic tag가 linked layer class를 고른다.
- montage, notify, weapon mesh ABP는 locomotion 위에 얹히는 보조 흐름이다.
- 개념(Linked Anim Layers, Distance Matching, Pose Warping 등)은 [`animation-references.md`](animation-references.md)의 공식 문서로, 검증된 로컬 구현 사실은 [`animation-blueprint-analysis.md`](animation-blueprint-analysis.md)·[`animation-code-analysis.md`](animation-code-analysis.md)로 학습한다.

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
- thread-safe 함수는 game object 데이터에 직접 접근할 수 없다 - Property Access는 이 제약을 어떻게 푸는가?

ThreadSafe 갱신 구조 (Monolith 검증):

- **Event Graph는 의도적으로 비어 있다.** `ABP_Mannequin_Base`의 Event Graph에는 안내 주석(`AnimBP Tour #1`) 1개뿐이고, `ABP_ItemAnimLayersBase`도 per-frame 로직을 Event Graph에 두지 않는다(두 ABP 모두 `has_tick = false`). Event Graph는 Game Thread에서 ABP마다 순차 실행되어 병목이 되기 때문이다.
- **모든 per-frame 로직은 `BlueprintThreadSafeUpdateAnimation` 함수에 있다.** 이 함수는 여러 ABP에 대해 병렬 실행될 수 있어 Game Thread 부하를 줄인다.
- `ABP_Mannequin_Base`의 `BlueprintThreadSafeUpdateAnimation` 호출 순서(검증): `UpdateLocationData → UpdateRotationData → UpdateVelocityData → UpdateAccelerationData → UpdateWallDetectionHeuristic → UpdateCharacterStateData → UpdateBlendWeightData → UpdateRootYawOffset → UpdateAimingData → UpdateJumpFallData`, 마지막에 `IsFirstUpdate`를 false로 설정한다.
- `ABP_ItemAnimLayersBase`도 같은 패턴이나, 먼저 main ABP 참조가 유효한지 Branch로 확인한 뒤 `Update Blend Weight Data → UpdateJumpFallData → UpdateSkelControlData`를 호출한다. main ABP(`ABP_Mannequin_Base`)의 데이터는 `GetMainAnimBPThreadSafe`로 thread-safe하게 읽어 온다.
- **Property Access**: thread-safe 함수는 다른 스레드가 game object를 동시에 수정할 수 있어 직접 접근이 금지된다. `K2Node_PropertyAccess` 노드가 안전한 시점에 데이터를 복사해 온다(`ABP_Mannequin_Base`에 13개). `AnimBP Tour #2` 주석이 이 이유를 그래프 안에서 직접 설명한다.
- 상태·레이어별 갱신은 **Anim Node Function**(state/linked layer 노드의 `On Update`·`On Become Relevant`·`On Initial Update` 콜백)으로 분산되며, 이 역시 thread-safe하게 실행된다 - 구체 사례는 섹션 3·4에서 다룬다.

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
- thread-safe 규칙 위반(함수에서 game object 직접 접근)은 컴파일 경고로 드러난다 - Property Access 노드로 교체한다.

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
- `InputCrouchAnimationTest`, `WeaponMeleeAnimationTest` - `ShooterTestsActorAnimationTests.cpp` (`ACTOR_ANIMATION_TEST` 매크로)
- `InputAnimationTest` - `ShooterTestsActorNetworkTests.cpp` (`ACTOR_ANIMATION_NETWORK_TEST` 매크로, 클라이언트/서버 애니메이션 복제 검증)

권장 구성:

- 기능별 디버깅 체크리스트
- 새 weapon 추가 레시피
- 새 cosmetic/body style 추가 레시피
- 새 locomotion sequence 교체 레시피
- 새 montage/action 추가 레시피

작성 우선순위: 상

### 13. AnimBP / ALI 책임 분담과 설계 트레이드오프

역할: 섹션 1 - 섹션 12 에서 본 7종 BP / interface 가 왜 한 거대한 ABP 가 아니라 각자의 책임으로 쪼개져 있는지를 설계 의도와 비용·이득 관점에서 종합한다. **메커니즘 학습이 끝난 독자가 한 번 더 읽으면 "다음에 만들 시스템도 이렇게 쪼개는 게 맞는가" 를 판단할 수 있게 한다.**

핵심 질문:

- `ABP_Mannequin_Base` 가 직접 들고 있지 않은 책임은 무엇이고, 왜 떨어뜨렸는가? (sequence, distance matching, hand IK alpha, weapon fire animation)
- `ABP_ItemAnimLayersBase` 가 `Mannequin_Base` 의 일부가 아니라 별도 BP 인 이유는? (무기 교체 단위 = layer ABP 교체)
- `ALI_ItemAnimLayers` 라는 14-함수 interface 의 비용·이득은? (직접 함수 호출이나 child BP 방식과의 비교)
- 무기 mesh ABP (`ABP_Weap_*`) 가 캐릭터 ABP 와 분리된 이유는? (다른 skeleton, fire/reload 가 캐릭터 montage 와 동기되지만 평가는 독립)
- post-process ABP (`ABP_Manny_PostProcess`, `ABP_Quinn_PostProcess`) 가 별도인 이유는? (mesh 마다 한 번씩, main pose 와 무관한 보정)
- retarget ABP (`ABP_Mannequin_Retarget`, `ABP_UE4_Mannequin_Retarget`) 가 별도인 이유는? (UE4 skeleton 호환)
- 이 분배의 **비용** (BP 간 호출/캐스팅, 변수 동기화, 학습 부담, 코드 검색 어려움) 과 **이득** (무기 추가의 격리, cosmetic 교체의 격리, 멀티스레드 갱신, 디버깅 격리) 의 trade-off 는?

주요 대상:

- `ABP_Mannequin_Base` - state machine, slot, additive, root rotation, Control Rig 호출
- `ABP_ItemAnimLayersBase` - sequence variable, distance matching, stride/orientation warping, hand IK alpha, 14함수 구현
- 무기별 layer ABP (`ABP_{Unarmed,Pistol,Rifle,Shotgun}AnimLayers ±_Feminine`) - sequence 세트만
- `ABP_Weap_{Pistol,Rifle,Shotgun}` - weapon mesh self-animation (별도 skeleton)
- `ABP_Manny_PostProcess`, `ABP_Quinn_PostProcess` - mesh 별 final-pose 보정
- `ABP_Mannequin_Retarget`, `ABP_UE4_Mannequin_Retarget` - UE4 skeleton 호환
- `ALI_ItemAnimLayers` - 14함수 interface

> **섹션 13 의 책임군은 정확히 7개** 다. `ABP_Mannequin_CopyPose` 는 invisible↔visible mesh 동기화 전용이라 섹션 13 의 핵심 책임군에서 제외하고 [섹션 14 (Invisible Mesh + Copy Pose 아키텍처)](#14-invisible-mesh--copy-pose--cosmetic-layer-아키텍처) 에서 단독 설명한다. 섹션 13 의 책임 지도에서는 cross-link 만 둔다.

권장 구성 (HTML 산출 시):

- structure: 7개 BP / interface 의 책임 지도 (`structure-grid` 7장)
- comparison: 책임 / 입력 변수 / 출력 pose / 교체 단위 / 평가 frequency 비교 표 (`comparison-section`)
- decision: "새 기능을 추가할 때 어디에 두는가" 의사결정 표 (`decision-section`)
- note-design: 각 분리의 비용과 이득 (`note-design` 박스로 트레이드오프 한 가지씩)
- (선택) flow: pose 한 frame 이 7종 BP 를 거치는 평가 순서 (주의 flow gate 통과 시에만)

작성 우선순위: 중 - 섹션 1 - 섹션 12 학습이 끝난 독자를 위한 종합 페이지. 새 시스템 (UI 등) 을 분석할 때도 이 페이지의 분배 패턴이 참고가 된다.

검증 포인트:

- 7종 BP / interface 의 존재·parent class·기본 구성은 [`animation-blueprint-analysis.md`](animation-blueprint-analysis.md) 에 모두 검증 완료 로 있다.
- "트레이드오프" 자체는 fact 가 아니라 설계 추론이므로 본문에서 `note-design` 으로 명시한다.
- 호출 횟수·평가 frequency 같은 정량적 비용은 측정하지 않은 한 추정으로만 적는다 (등급 ◐).

### 14. Invisible Mesh + Copy Pose + Cosmetic Layer 아키텍처

역할: 라이라가 왜 "invisible driving mesh + visible cosmetic mesh + Copy Pose ABP" 의 **3단 구성** 으로 캐릭터를 만들었는지를 설계 의도와 trade-off 관점에서 설명한다. **`B_Manny` / `B_Quinn` 의 BP 안 comment 가 이 설계 의도를 직접 적어둔 1차 자료다** - 후속 HTML 페이지는 그 comment 를 인용한다.

핵심 질문:

- 왜 `SKM_Manny` 가 직접 visible body mesh 가 아니라, 별도 `SKM_Manny_Invis` 가 캐릭터의 메인 mesh 인가?
- visible mesh (`SKM_Manny`) 는 어디에 attach 되고, 어떻게 invisible mesh 의 pose 를 따라가는가?
- `ABP_Mannequin_CopyPose` 의 역할과 "Copy Pose From Mesh" 노드는 어떻게 동작하는가? (parent: `AnimInstance`, AnimGraph 3 nodes - Monolith 확인)
- `B_Manny` / `B_Quinn` 의 BP comment 가 명시한 설계 의도는? (*"copy the pose across from the invisible 'driving' mesh component since the skeletons are directly compatible"*)
- modular cosmetic part (head·jacket·hands 등) 가 같은 invisible mesh 의 pose 를 어떻게 공유하는가?
- 이 3단 구성의 **비용** (mesh 1개 → N개로 늘어남에 따른 메모리·draw call·CPU pose 평가) 과 **이득** (cosmetic 교체의 격리, retarget 호환성, modular character parts 의 자유) 의 trade-off 는?
- 단일 mesh 한 개로 합치면 무엇이 불가능해지는가?

주요 대상:

- `SKM_Manny_Invis`, `SKM_Quinn_Invis` - driving mesh (invisible, owner pawn 의 mesh 로 적용되어 animation 평가 주체)
- `SKM_Manny`, `SKM_Quinn` - visible cosmetic skeletal mesh. `B_Manny` / `B_Quinn` 의 root `MeshComponent` (SkeletalMeshComponent, Monolith 확인) 가 이 mesh 를 들고, child actor 로서 owner pawn 의 mesh 에 attach 됨
- `ABP_Mannequin_CopyPose` - parent `AnimInstance`, AnimGraph 3 노드 (`Output Pose ← Copy Pose From Mesh`, `SourceMeshComponent` 핀 미연결 → attached parent 사용). comment: *"copy the pose from the parent mesh component that our mesh component is attached to"*
- `B_Manny`, `B_Quinn` - cosmetic BP (단일 root `MeshComponent` 만 갖는 actor class). BP 내부 comment 가 design intent 명시
- `B_MannequinPawnCosmetics` - `BodyMeshes.SelectBestBodyStyle` 로 invisible driving mesh 를 owner pawn 의 main mesh 로 선택
- `ULyraPawnComponent_CharacterParts` + `FLyraCharacterPartList` (C++) - 두 단계로 책임 분리: (1) `SpawnActorForEntry` 가 `UChildActorComponent` 생성 + `GetSceneComponentToAttachTo()` (owner mesh) 에 attach, (2) `BroadcastChanged` 가 `BodyMeshes.SelectBestBodyStyle(MergedTags)` 로 invisible mesh 선택·적용
- `FLyraAnimBodyStyleSelectionSet` (섹션 6 에서 다룬 mesh 선택 규칙)

권장 구성 (HTML 산출 시):

- structure: 3단 구성도 - `SKM_*_Invis` (driving) → `ABP_Mannequin_Base` 평가 → `ABP_Mannequin_CopyPose` 로 visible mesh 동기화
- flow: 한 frame 의 pose 흐름 - main ABP 가 invisible mesh 의 pose 결정 → visible cosmetic mesh 들이 CopyPose ABP 로 그 pose 를 복제
- reference: `B_Manny`/`B_Quinn` 의 comment 원문 인용 + 한국어 번역
- comparison: 단일 visible mesh 패턴 vs invisible+visible+CopyPose 패턴의 trade-off 비교
- note-design: 메모리·draw call·pose 평가 비용 ↔ cosmetic 교체 유연성의 설계 의도
- recipe: 새 cosmetic part 를 추가할 때의 권장 순서 - `Cosmetic.*` 태그 정의 → mesh rule 등록 → CopyPose ABP 가 적용된 cosmetic actor 생성

작성 우선순위: 중 - 섹션 6 (cosmetic 선택 규칙) 을 본 독자가 이어서 보면 자연스럽다. **섹션 13 보다 섹션 14 를 먼저 만든다** - 섹션 14 는 섹션 6 의 "왜 `SKM_*_Invis` 가 선택되는가" 학습 공백과 바로 이어지므로 학습 도움이 즉시 크다. 섹션 13 은 여러 페이지를 종합하는 후반 설계 페이지라 섹션 14 가 자리잡은 뒤에 만드는 편이 자연스럽다.

quote 사용 가이드 (섹션 14 HTML 작성 시):

- `reference-section` 블록에 "확인 위치: `B_Manny`, `B_Quinn` Blueprint 내부 comment" 표기.
- 원문은 **핵심 구절만 짧게** 인용 (예: *"copy the pose across from the invisible 'driving' mesh component since the skeletons are directly compatible"*).
- 바로 아래에 한국어 해석을 한 줄로 둔다 - "visible mesh 는 invisible driving mesh 와 skeleton 호환성이 있어서 pose 를 복제한다" 정도.
- comment 전문은 검증 원장 ([`animation-blueprint-analysis.md`](animation-blueprint-analysis.md)) 에 두고, HTML 은 학습에 필요한 일부만 노출한다.

검증 포인트:

- `ABP_Mannequin_CopyPose` 의 parent class·AnimGraph 노드 수·"Copy Pose From Mesh" 노드 포함은 Monolith 로 검증 완료 확인됨.
- `B_Manny`/`B_Quinn` 의 design-intent comment 는 Monolith FTS search 로 검증 완료 확인됨 (`B_Manny`, `B_Quinn` 둘 다 같은 comment 보유).
- 4개 mesh (`SKM_Manny`, `SKM_Manny_Invis`, `SKM_Quinn`, `SKM_Quinn_Invis`) 존재는 파일 시스템으로 검증 완료 확인됨.
- ◐ **HTML 과 원장 간 재검수 필요** - 다음 사실들은 현재 [`animation-blueprint-analysis.md`](animation-blueprint-analysis.md) 에 검증 완료 로 추가되었고 HTML 페이지도 이를 인용해 작성됨 (2026-05-24 보강). 이후 원장이 더 갱신되면 HTML 표현과 일치 여부를 재검수:
 - `ABP_Mannequin_CopyPose` 의 "Copy Pose From Mesh" 노드 입력 핀 미연결 + comment 인용 - 원장 검증 완료, HTML 섹션 14 인용 검증 완료
 - `B_Manny` / `B_Quinn` 의 단일 root `MeshComponent` (SkeletalMeshComponent) - 원장 검증 완료, HTML 섹션 14 인용 검증 완료
 - `B_Manny` / `B_Quinn` 의 design-intent comment 전문 - 원장 검증 완료, HTML 섹션 14 핵심 구절 인용 검증 완료
- ◐ **계속 partial 로 유지할 항목** - 본 시점에 직접 확인 안 된 사실:
 - `ABP_Quinn_PostProcess` 의 AnimGraph 내부 노드 enumeration (`ABP_Manny_PostProcess` 와 동일 패턴 추정만)
 - modular cosmetic part (head·jacket·hands 같은 추가 actor) 의 정확한 socket / attach 지점
 - `Use Attached Parent` 가 Copy Pose 노드의 정확한 Epic 공식 옵션 라벨인지 (버전별 라벨 차이 가능)
- ◐ "단일 mesh vs 3단 구성" 비용 비교는 정량 측정이 없으므로 정성 추론 (`note-design`) 으로 표기 - 본 시점 그대로 유지.

## 세부 학습 항목 - 기능 키워드 검증 매핑

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

검증 범례: **검증 완료** Monolith 또는 로컬 소스로 직접 확인 · **◐** 공식 문서와 로컬 간접 단서로 확인했으나 노드 단위는 에디터 확인 필요 · **△** 공식 UE 일반 개념 또는 학습 후보이며 Lyra 로컬 사용 범위는 추가 확인 필요

### 섹션 1·2 - `ABP_Mannequin_Base` 런타임 데이터 & pose graph

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| ThreadSafe Update Animation | `BlueprintThreadSafeUpdateAnimation` - `ABP_Mannequin_Base`는 `Update*Data` 함수 10개를 순차 호출(`UpdateLocationData`→…→`UpdateJumpFallData`), `ABP_ItemAnimLayersBase`는 main ABP 유효성 Branch 후 3개 호출. ABP 간 병렬 실행으로 Game Thread 부하 감소 | 검증 완료 + Epic 문서 |
| Event Graph 미사용 (Game Thread 회피) | `ABP_Mannequin_Base`의 `EventGraph`는 안내 주석 1개뿐(`AnimBP Tour #1`); 두 ABP 모두 `has_tick=false` | 검증 완료 |
| Property access | `ABP_Mannequin_Base` thread-safe 함수의 `K2Node_PropertyAccess` 13개(`BlueprintThreadSafeUpdateAnimation`·`UpdateVelocityData`·`UpdateCharacterStateData` 등); `AnimBP Tour #2` 주석이 사용 이유를 직접 설명 | 검증 완료 + Epic 문서 |
| Apply additive | `AnimGraphNode_ApplyAdditive` 2개 (`AnimGraph`) | 검증 완료 |
| Inertialize blending / Dynamic sequence with blend inertialization | `AnimGraphNode_Inertialization` (`AnimGraph`) | 검증 완료 + Epic 문서 |
| Blend poses | `Blend Poses by Bool/Enum` 계열 일반 개념. Lyra layer 그래프 내부에서의 구체 사용 위치는 에디터 확인 필요 | △ |
| Blend options | state transition의 `blend_mode`·`cross_fade_duration`은 확인. Blend Profile/Mask는 공식 문서 일반 개념으로 별도 확인 필요 | ◐ |
| Calculate velocity Locomotion Data | `UpdateVelocityData` 그래프 (`WorldVelocity`, `LocalVelocity2D`) | 검증 완료 |
| Calculate locomotion direction | `SelectCardinalDirectionFromAngle` 그래프, `LocalVelocityDirection` | 검증 완료 |
| Acceleration locomotion direction | `UpdateAccelerationData` 그래프, `PivotDirection2D` | 검증 완료 |

> 반영 사항: 섹션 1("런타임 상태 입력")의 "주요 대상"에 `BlueprintThreadSafeUpdateAnimation`와 그 하위 함수(`UpdateVelocityData`·`UpdateAccelerationData`·`SelectCardinalDirectionFromAngle`)를 포함했다. ABP 변수의 상당수가 이 thread-safe 함수에서 계산되므로, 원시 입력(C++)과 ABP 내부 데이터 처리를 같은 섹션에서 다룬다. 위 키워드 표는 그래서 섹션 1·2를 함께 묶었다.

### 섹션 3 - `LocomotionSM`

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| State machines and shared rules | `LocomotionSM` + state alias(`PivotSources`·`JumpSources` 등)로 transition rule 공유 | 검증 완료 + Epic 문서(State Aliases) |
| cycle on update | `Cycle` state + `UpdateCycleAnim` anim node function(On Update) | 검증 완료 |
| Anim notify state | `Was Anim Notify State Active in Source State (Pivot)` (Pivot→Cycle rule) | 검증 완료 + Epic 문서 |
| Pivot state with dot product | `PivotSources→Pivot` rule: `LocalVelocity2D · LocalAcceleration2D < 0` (속도와 가속이 반대) | 검증 완료 |
| Sync groups / Sync markers / Sync animations | `SyncGroupNameToRequireValidMarkersRule` (Start→Cycle rule) | ◐ transition rule만 확인; sync 노드는 layer 그래프 |

### 섹션 4·5 - Linked Anim Layer 인터페이스 & 무기별 animation set

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Animation layers / Animation layer interfaces | `ALI_ItemAnimLayers` 인터페이스 14함수 | 검증 완료 + Epic 문서 |
| Link anim class | base ABP `AnimGraph`의 `AnimGraphNode_LinkedAnimLayer` 4개 | 검증 완료 + Epic 문서(Animation Blueprint Linking) |
| Layer interfaces for cycle | `FullBody_CycleState` 인터페이스 함수 (LocomotionSM `Cycle` state가 호출) | 검증 완료 |
| Base animation blueprint in layer blueprint | `GetMainAnimBPThreadSafe` 그래프 - layer가 main ABP 데이터 접근 | 검증 완료 + Epic 문서 |
| Animation blueprint childs | `ABP_ShotgunAnimLayers`(parent `ABP_RifleAnimLayers_C`, data-only) 등 무기별 child layer | 검증 완료 + Epic 문서(Child Animation Blueprint) |
| Select animation for cycle / with directions / with structs | `AnimStruct_CardinalDirections` struct + `Jog_Cardinals`·`Walk_Cardinals` 등 12개 변수; `UpdateCycleAnim`·`GetDesiredPivotSequence` | 검증 완료 |

### 섹션 9 - Warping / Distance Matching / Turn In Place

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Stride Warping | `StrideWarpingStartAlpha`·`StrideWarpingCycleAlpha`·`StrideWarpingPivotAlpha` 변수, `StrideWarpingBlendIn*` 설정 | 검증 완료 + Epic 문서 |
| Orientation warping / ~ for pivot | Epic 공식 문서 "Orientation warping" 전용 섹션; `AnimationWarping` 플러그인 활성 | ◐ Epic·플러그인 확인; layer 그래프 노드 미노출 |
| Lean blend space | `BS_MM_Rifle_Jog_Leans` (base ABP가 직접 참조) | 검증 완료 |
| Calculate Lean angle | `AdditiveLeanAngle` 변수, `UpdateRotationData` 그래프 | 검증 완료 |
| Apply additive | `AnimGraphNode_ApplyAdditive` (lean blend space를 additive로 합성) | 검증 완료 |
| Sequence evaluator | `ConvertToSequenceEvaluatorPure` 16개 노드 (Start/Stop/Pivot/Turn/FallLand) | 검증 완료 |
| Distance matching | `AnimBP Tour #9` 그래프 주석; `AnimationLocomotionLibrary` 플러그인 필요 | 검증 완료 + Epic 문서 |
| Distance matching to target | `DistanceMatchToTarget` (`SetUpStopAnim`·`UpdateStopAnim`·`UpdatePivotAnim`·`UpdateFallLandAnim`) | 검증 완료 |
| AdvanceTime by distance matching | `AdvanceTimeByDistanceMatching` (`UpdateStartAnim`·`UpdatePivotAnim`) | 검증 완료 |
| Distance curve | `LocomotionDistanceCurveName`="Distance", `JumpDistanceCurveName`="GroundDistance" | 검증 완료 |
| Predict Stop location | `PredictGroundMovementStopLocation` (`GetPredictedStopDistance` 그래프) | 검증 완료 |
| Predict Pivot location | `PredictGroundMovementPivotLocation` (`UpdatePivotAnim`) | 검증 완료 |
| Rotate root bone | `AnimGraphNode_RotateRootBone` (base ABP `AnimGraph`) | 검증 완료 + Epic 문서 |
| Root yaw offset | `RootYawOffset`·`RootYawOffsetMode` 변수, `UpdateRootYawOffset` 그래프 | 검증 완료 + Epic 문서 |
| Turn in place | `SetupTurnInPlaceAnim`·`UpdateTurnInPlaceAnim`·`SelectTurnInPlaceAnimation` 그래프; `TurnInPlace_Left/Right` 변수 | 검증 완료 + Epic 문서 |

### 섹션 10 - IK / Control Rig / Foot placement

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Foot placement | `ShouldEnableFootPlacement` 그래프 (`ABP_ItemAnimLayersBase`) | 검증 완료 |
| Disable foot placement when jumping | `ShouldEnableFootPlacement`가 curve/property 조건으로 foot placement 여부를 반환한다. jump/fall별 정확한 분기 의도는 에디터에서 그래프 주석과 입력 pin 확인 필요 | ◐ |

### 검증 한계 - anim layer 그래프

`ABP_ItemAnimLayersBase`의 **anim layer 그래프**(`FullBody_CycleState` 등 `ALI_ItemAnimLayers` 인터페이스 구현)는 현재 Monolith 액션이 완전하게 열거하지 않는다. layer BP의 최상위 `AnimGraph`는 `Output Pose` 1개만 노출되고, 실제 pose 노드는 layer 그래프 안에 있다. 따라서 **Stride/Orientation Warping pose 노드, Blend Poses 노드, sequence player의 sync group 설정** 등 layer 그래프 내부는 에디터에서 직접 확인해야 한다. 위 표의 ◐/△ 항목이 이 한계에 해당한다.

### 섹션 13 - AnimBP / ALI 책임 분담과 설계 트레이드오프

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| 7종 BP/interface 의 책임 분리 | `ABP_Mannequin_Base`, `ABP_ItemAnimLayersBase`, 무기별 layer ABP (8개), `ABP_Weap_{Pistol,Rifle,Shotgun}`, `ABP_Manny_PostProcess` + `ABP_Quinn_PostProcess`, `ABP_Mannequin_Retarget` + `ABP_UE4_Mannequin_Retarget`, `ALI_ItemAnimLayers` (14함수) | 검증 완료 모두 [`animation-blueprint-analysis.md`](animation-blueprint-analysis.md) 에 명시 |
| 무기 교체 단위 | weapon instance CDO 의 `EquippedAnimSet` → layer ABP 교체 | 검증 완료 |
| 14-함수 interface 의 호출 위치 | `ABP_Mannequin_Base.AnimGraph` 의 `LinkedAnimLayer` 4 + `LocomotionSM` state 10 = 14 | 검증 완료 |
| 무기 mesh ABP 분리 이유 | `SK_Pistol_Skeleton`·`SK_Rifle_Skeleton`·`SK_Shotgun_Skeleton` 별도 → 캐릭터 skeleton 과 분리 평가 | 검증 완료 |
| post-process ABP 분리 이유 | mesh 별로 한 번 평가, main pose 와 무관한 보정 - 디자인 추론 | ◐ 추론 (note-design) |
| retarget ABP 분리 이유 | `ABP_UE4_Mannequin_Retarget` 은 UE4 skeleton 호환을 위한 별도 ABP | 검증 완료 파일 존재 + 분리 의도는 ◐ 추론 |
| 분배의 비용 (호출/캐스팅·변수 동기화·학습 부담) | 코드/원장에 명시된 사실 없음 - 설계 추론 | ◐ note-design |
| 분배의 이득 (무기/cosmetic 격리·멀티스레드·디버깅 격리) | thread-safe update + linked layer 의 격리는 검증 완료, 그 외는 추론 | 혼합 |

### 섹션 14 - Invisible Mesh + Copy Pose + Cosmetic Layer 아키텍처

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Invisible driving mesh | `SKM_Manny_Invis`, `SKM_Quinn_Invis` (`/Game/Characters/Heroes/Mannequin/Meshes/`); `B_MannequinPawnCosmetics` 의 `BodyMeshes` rule 이 invisible mesh 를 캐릭터 main mesh 로 적용 | 검증 완료 원장 + CDO |
| Visible cosmetic mesh | `SKM_Manny`, `SKM_Quinn` 파일 존재 | 검증 완료 파일 시스템 |
| Copy Pose ABP | `ABP_Mannequin_CopyPose` - parent `AnimInstance`, AnimGraph 3 nodes, "Copy Pose From Mesh" 노드 포함 | 검증 완료 Monolith |
| `B_Manny`/`B_Quinn` design-intent comment | *"The mesh component has the ABP_Mannequin_CopyPose anim BP, which will just copy the pose across from the invisible 'driving' mesh component since the skeletons are directly compatible. If you change..."* - Monolith FTS search 로 두 BP 모두에서 확인 | 검증 완료 |
| Cosmetic component | `B_MannequinPawnCosmetics` (BP) + `ULyraPawnComponent_CharacterParts` (C++) | 검증 완료 원장 |
| Cosmetic part actor spawn / attach | `FLyraCharacterPartList::SpawnActorForEntry` - `UChildActorComponent` 생성 후 owner pawn 의 `GetSceneComponentToAttachTo()` (Character 면 mesh, 아니면 root) 에 attach | 검증 완료 C++ 직접 |
| Body mesh selection · 적용 | `ULyraPawnComponent_CharacterParts::BroadcastChanged` - `BodyMeshes.SelectBestBodyStyle(MergedTags)` 로 invisible driving mesh 선택 → `SetSkeletalMesh(..., true)` + (있으면) `ForcedPhysicsAsset` 적용 → delegate broadcast | 검증 완료 원장 (code-analysis) |
| Copy Pose From Mesh 노드 입력 핀 (source mesh 지정) | 노드 존재 검증 완료, 정확한 핀 구성 ◐ | ◐ Monolith `get_graph_data` 추가 조회 |
| Visible mesh 가 child component 인지 child actor 인지 | 미확인 | ◐ Monolith CDO 조회 (`B_Manny` / `B_Quinn` components) |
| Modular cosmetic part (head/jacket/hands) 의 mesh attach 방식 | character part 시스템이 존재함은 검증 완료, 구체 attach 위치는 ◐ | ◐ Monolith 추가 조회 |
| 단일 mesh vs 3단 구성 비용 | 정량 측정 없음 | ◐ note-design 추론 |

### 키워드 검토 결과

- 추가 키워드 목록은 학습 항목으로 적절하다. 다만 모두를 동일한 수준의 로컬 사실로 쓰면 안 된다. `✅` 항목은 문서 본문에 확정적으로 반영하고, `◐`/`△` 항목은 "공식 개념", "에디터 확인 과제", "추가 검증 필요"로 구분한다.
- 현재 목록에서 명백히 프로젝트와 무관한 키워드는 발견하지 못했다. 다만 `Blend Poses`, `Blend Profile/Mask`, `Sync group/marker`, `Orientation Warping pose node`는 Monolith의 layer graph 노출 한계 때문에 에디터 직접 확인 후 로컬 구현 사실로 승격해야 한다.
- 섹션 9(Warping/Distance Matching/Turn In Place)에 키워드가 가장 몰린다. 10개 문서 구성에서 `warping-ik`(섹션 9+10)가 가장 두꺼워지므로, 이 문서는 작성 중 분량을 주시하고 필요하면 `distance-warping-turn-in-place.md`와 `ik-postprocess-retarget.md`로 분리한다.
- 이 키워드 목록에는 섹션 8(Aiming/ADS) 항목이 거의 없다. aiming은 별도 조사가 필요하다(`Update Blend Weight Data`, `AimOffsetBlendWeight`, `HipFireUpperBodyOverrideWeight`, `FullBody_Aiming`, `AO_MM_*`, `AO_MF_*` 등).
- 섹션 13(AnimBP/ALI 책임 분담)·섹션 14(Invisible Mesh + Copy Pose 아키텍처) 는 새 사실이 아니라 섹션 1 - 섹션 12 의 사실을 종합해 추론·trade-off 로 표현하는 성격이다. 표의 "분배의 비용", "단일 mesh vs 3단 구성 비용" 같은 항목은 정량 측정이 없으므로 본문에서 `note-design` 으로만 표기하고 검증 완료 로 승격하지 않는다.
- 섹션 14 의 ◐ 항목 (Copy Pose 노드 입력 핀, visible mesh 의 component 종류, modular part attach) 은 HTML 작성 전에 Monolith CDO 조회 → 원장 보강 → HTML 인용 순서로 진행한다. HTML 에서 새 사실을 정의하지 않는다.

## 기존 분석 문서와의 관계

후속 학습 문서를 만들 때 가장 먼저 정해야 할 것은, 이미 있는 두 분석 문서와 새 학습 문서가 어떤 역할을 나눠 갖느냐다. 학습 문서를 만들면서 같은 사실을 다시 조사하면 중복이 생기고 값이 어긋난다.

| 문서군 | 역할 | 사실의 출처 여부 |
|--------|------|-------------------|
| `animation-blueprint-analysis.md`, `animation-code-analysis.md` | **검증 원장(verified fact ledger)** - Monolith·C++ 재조회로 확인한 사실의 단일 출처 | 예. 모든 수치·경로·CDO 값의 근거 |
| 후속 학습 문서 (메커니즘 섹션 1 - 섹션 12 + 설계 의도 섹션 13 - 섹션 14) | **기능별 학습 안내서 + 설계 의도/트레이드오프 종합** - 검증 원장의 사실을 데이터 흐름 순서로 재배열하고 실습·디버깅·확장 레시피를 더함. 섹션 13·섹션 14 는 원장 사실 위에 추론·trade-off 를 얹음 | 아니오. 원장을 인용 |
| `animation-references.md` | 개념 학습용 공식 문서 링크 | 아니오. 외부 개념 |

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

### 설계 의도·아키텍처를 이해하려는 학습자 (메커니즘 학습 완료 후)

섹션 1 - 섹션 12 의 메커니즘 학습이 끝났다고 가정한 경로. "이 시스템을 왜 이렇게 만들었는가, 우리 프로젝트에서 이 분배 패턴을 차용해도 되는가" 를 판단할 수 있게 한다.

1. 섹션 14 - Invisible Mesh + Copy Pose + Cosmetic Layer 아키텍처 (먼저 mesh 측 3단 구성의 의도를 본다 - 섹션 6 의 `SKM_*_Invis` 선택 결과를 구조적으로 설명하므로 학습 공백 메우기가 즉시 됨)
2. 섹션 13 - AnimBP / ALI 책임 분담과 설계 트레이드오프 (그 다음 여러 ABP / ALI 의 책임 분산을 종합으로 본다 - 후반 종합 페이지라 섹션 14 가 자리잡은 뒤가 자연스러움)
3. (선택) 섹션 6 - 장비·cosmetic 선택 규칙을 한 번 더 읽으면 섹션 14 의 mesh 선택 흐름과 자연스럽게 연결된다.
4. (선택) 섹션 10 - IK / Control Rig / post process / retarget 을 섹션 13 의 분배 관점으로 다시 읽으면 post-process / retarget ABP 가 왜 분리됐는지 더 또렷해진다.

순서 근거: 섹션 14 는 섹션 6 의 mesh 선택 결과를 구조적으로 설명하고, 섹션 13 은 여러 ABP / ALI 의 책임 분산을 종합한다. 학습자는 먼저 "왜 invisible mesh 가 나오는지" 를 이해한 뒤 전체 설계 trade-off 를 보는 편이 자연스럽다. HTML 작성 순서·인덱스 카드 순서 (11 → 12) 와 일치.

목표는 라이라의 분배·격리 패턴을 자기 프로젝트에 차용할 때 무엇을 같이 가져가고 무엇을 단순화할지 판단할 수 있게 되는 것이다.

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
| 1 | `animation-overview.md` | 0 | 최상 | 큰 흐름도, 핵심 asset path 지도, 용어표 |
| 2 | `animation-runtime-state.md` | 1 | 최상 | ASC tag↔ABP 변수 표, movement state 표, ThreadSafe 갱신 호출 순서 다이어그램 |
| 3 | `animation-base-abp.md` | 2 | 최상 | pose graph 블록 다이어그램, slot 위치 표 |
| 4 | `animation-locomotion-sm.md` | 3 | 최상 | state/transition 표, alias·conduit 포함 jump-fall 흐름도 |
| 5 | `animation-linked-layers.md` | 4, 5 | 최상 | ALI 인터페이스 14함수 매핑, 무기별 layer 비교표 |
| 6 | `animation-selection-rules.md` | 6 | 최상 | weapon instance CDO 표, cosmetic body mesh rule 표 |
| 7 | `animation-actions-montage.md` | 7 | 상 | montage slot 표, action montage sample 표, ability/equipment 트리거 흐름 |
| 8 | `animation-aiming-additives.md` | 8 | 상 | aim offset 목록, ADS/hipfire blend weight 변수 표, `Update Blend Weight Data` 흐름 |
| 9 | `animation-warping-ik.md` | 9, 10 | 상 | curve 체크리스트, 보정 기능별 graph 목록 |
| 10 | `animation-effects-tests-recipes.md` | 11, 12 | 상 | notify→context effect 흐름, 새 weapon/body/montage 추가 레시피 |

**섹션 12개 → 문서 10개 묶음 근거** (같은 흐름·관심사는 합치고, 결정과 재생은 나눈다):

- 섹션 4(인터페이스·공통 base)와 5(무기별 set)는 같은 linked layer 체계라 `linked-layers` 한 문서에 둔다.
- 섹션 7(montage 액션)은 transient action 재생이고, 섹션 8(aiming/ADS)은 지속적인 aim offset·additive blend이므로 분리한다. `AimOffsets` 폴더가 98개 asset을 갖고 `ABP_ItemAnimLayersBase`의 `Update Blend Weight Data`가 별도 핵심 그래프라는 점도 분리 근거다.
- 섹션 9(distance matching·warping)와 10(IK·Control Rig·post process)은 final pose 보정층이라 `warping-ik` 한 문서에 둔다.
- 섹션 11(notify·context effect·weapon mesh)과 12(테스트·레시피)는 pose 외부 흐름과 검증이라 `effects-tests-recipes` 한 문서에 둔다.
- 반대로 `LocomotionSM`(state 결정)과 `ABP_ItemAnimLayersBase`(state별 재생), weapon layer 선택(CDO/tag)과 layer 내부 로직(pose 생성)은 **합치지 않는다** - 학습자가 "왜 선택됐는가"와 "어떻게 재생되는가"를 구분해야 하기 때문이다.
- `Manny`/`Quinn`은 독립 문서가 아니라 `selection-rules`와 `linked-layers`의 변형 비교 안에서 다룬다.

**작성 순서:** 1~5번을 먼저 만든다(중심 구조 - 이것만 읽어도 "캐릭터가 왜 이 애니메이션을 재생하는지" 설명 가능). 6~10번은 확장·디버깅용 기능별 참고서로 이어 만든다.

**분리 시점:** 한 문서가 지나치게 커지면 그때 분리한다. 분리 1순위 후보는 `retarget-postprocess`(섹션 10 일부), `contextual-interactions`(`Interactions/Bench` 28개 에셋 기반 별도 확장), `asset-authoring-checklist`(확장 레시피)다. `aiming-additives`는 이미 별도 문서로 시작한다.

**폴더 구조:** 현재 `docs/`는 flat 구조다. 학습 문서가 더 커지면 `docs/animation/` 하위 폴더로 옮기고 번호 접두어(`00-overview.md`, `01-runtime-state.md` …)를 붙여 읽는 순서를 강제하는 방안을 고려한다. Lyra 애니메이션은 개념 의존성이 강하다.

## HTML 산출물 대응 표

본 계획의 **메커니즘 학습 12개 섹션 (섹션 1 - 섹션 12) 은 `html/pages/` 의 10개 학습 페이지로 구현 완료** 되었고, **설계 의도 2개 섹션 (섹션 13 - 섹션 14) 도 2개 학습 페이지로 구현 완료** 되었다 (총 12 페이지).

### 페이지별 학습 블록 구성

페이지 성격에 따라 사용하는 블록 종류와 목차명을 분기한다. 자세한 사양은 [`dynamic-html-spec.md`](../common/dynamic-html-spec.md) 의 "학습 블록 7종" 과 "flow gate" 참조.

**구현 완료 (메커니즘 학습)** - 10페이지:

| HTML 페이지 | 포함 섹션 | 목차명 | 사용 학습 블록 |
|-------------|----------|--------|---------------|
| `lyra-animation-overview.html` | 0 | 학습 목차 | structure(runtime map) + reference(하위 페이지 경로 카드) + flow(전체 학습 진입 1개) |
| `lyra-animation-runtime-state.html` | 1 | 흐름 목차 | flow 3개~5 (ASC→AnimInstance→ThreadSafe 갱신 인과) |
| `lyra-animation-base-abp.html` | 2 | 학습 목차 | structure(pose graph stack) + reference(slot 위치 map) + flow(필요한 곳만 1~2개) |
| `lyra-animation-locomotion-sm.html` | 3 | 흐름 목차 | flow 5개 (상태 머신 전이 자체가 흐름) |
| `lyra-animation-linked-layers.html` | 4, 5 | 학습 목차 | reference(14함수 인터페이스) + structure(상속 관계) + comparison(무기별 차이) + flow(layer 교체 1개) |
| `lyra-animation-selection-rules.html` | 6 | 학습 목차 | flow(장비 변경 1개) + decision(SelectBestLayer 우선순위) + reference(bEquipped CDO) + decision(body style rule) |
| `lyra-animation-actions-montage.html` | 7 | 흐름 목차 | flow 3개~5 (ability→montage→slot 인과) |
| `lyra-animation-aiming-additives.html` | 8 | 흐름 목차 | flow 3개~5 (aim data 갱신·additive 합성이 frame pipeline) |
| `lyra-animation-warping-ik.html` | 9, 10 | 학습 목차 | flow(Distance Matching 1개) + structure(correction stack) + reference(보정 기능 카드) + comparison(post process / retarget) |
| `lyra-animation-effects-tests-recipes.html` | 11, 12 | 학습 목차 | flow(Notify→Context Effect 1개) + structure(Weapon Mesh ABP arch) + verification(ShooterTests 매트릭스) + recipe(새 무기/cosmetic/sequence 체크리스트) |

**구현 완료 (설계 의도와 트레이드오프)** - 2페이지 (HTML 생성됨):

| HTML 페이지 | 포함 섹션 | 목차명 | 사용 학습 블록 | 선행 학습 |
|-------------|----------|--------|---------------|-----------|
| `lyra-animation-invisible-copy-pose.html` | 14 | 학습 목차 | structure(3단 구성도) + flow(1개 - pose 복제 흐름) + reference(`B_Manny`/`B_Quinn` comment 인용 + 자산 경로) + comparison(단일 mesh vs 3단 trade-off) + recipe(새 cosmetic part 추가) + note-design N개 | `selection-rules`, `base-abp`, `linked-layers` |
| `lyra-animation-animbp-ali-tradeoffs.html` | 13 | 학습 목차 | structure(7개 책임군 지도) + comparison(책임/입력/출력/교체 단위/평가 frequency) + decision(새 기능 어디에 둘 것인가) + verification(사실 vs 추론 등급 표) + note-design N개 | `base-abp`, `linked-layers`, `selection-rules`, `warping-ik` |

작성 순서 기록: `lyra-animation-invisible-copy-pose.html` 을 먼저 작성. `selection-rules` 페이지가 `SKM_*_Invis` 를 mesh rule 결과로만 보여주는 학습 공백과 이어져 즉시 가치가 크기 때문. `lyra-animation-animbp-ali-tradeoffs.html` 은 여러 메커니즘 페이지를 종합하는 후반 설계 페이지라 섹션 14 가 자리잡은 뒤에 작성.

**흐름 유지 4개 페이지** (`runtime-state`, `locomotion-sm`, `actions-montage`, `aiming-additives`): 모든 블록이 실제 런타임 인과 흐름이라 `flow-section` 만으로 구성한다. 목차명은 `흐름 목차`.

**혼합 8개 페이지** (`overview`, `base-abp`, `linked-layers`, `selection-rules`, `warping-ik`, `effects-tests-recipes`, `invisible-copy-pose`, `animbp-ali-tradeoffs`): 정보 형태가 흐름·구조·결정·참조·비교·레시피·검증이 섞여 있어 학습 블록 7종을 조합한다. 목차명은 `학습 목차`.

### 검증 등급 유지 항목 (HTML 에서 `partial` 또는 `unverified` 로 표시)

| HTML 페이지 | 등급 유지 항목 |
|-------------|---------------|
| `lyra-animation-locomotion-sm.html` | alias 5개 (`PivotSources`·`JumpSources`·`JumpFallInterruptSources`·`IdleAlias`·`CycleAlias`) membership 미확인 → `partial` |
| `lyra-animation-warping-ik.html` | Pose Warping 노드 적용 (layer 그래프 미노출), Orientation Warping 적용 위치, `ShouldEnableFootPlacement` 의 jump/fall 분기, Control Rig 세부 보정 부위 → 모두 `partial` |
| `lyra-animation-invisible-copy-pose.html` | (1) `B_Manny`/`B_Quinn` 의 단일 root `MeshComponent` 와 `MeshComponent` 가 `ABP_Mannequin_CopyPose` 를 사용한다는 사실: 원장에 검증 완료. (2) modular cosmetic part (head·jacket·hands 같은 추가 actor) 의 정확한 socket / attach 지점은 별도 Monolith 조회 전까지 `partial`. (3) 단일 mesh 대비 메모리·draw call·CPU 비용 비교는 정량 측정이 없으므로 `note-design` 으로만 표기 (배지 승격 금지). (4) `Use Attached Parent` 가 Copy Pose 노드의 정확한 옵션 이름인지는 Epic 공식 문서로 확인하되, 라이라 자산이 그 옵션을 명시적으로 설정했는지는 `partial`. **페이지에 적용 완료** - `data-validation="partial"` + 검증 한계 note. |
| `lyra-animation-animbp-ali-tradeoffs.html` | (1) 7개 책임군의 존재·parent class·기본 구성은 [`animation-blueprint-analysis.md`](animation-blueprint-analysis.md) 에 모두 검증 완료. (2) "분배의 비용/이득" - 호출/캐스팅 횟수, 평가 frequency, post-process 분리 의도, retarget 분리 의도는 모두 **설계 추론** 이므로 `note-design` 으로만 표기하고 검증 완료 로 승격하지 않는다. (3) "왜 무기 mesh ABP 가 분리되는가" 같은 의도 설명은 코드에 직접 적혀 있지 않으므로 `partial` 유지. **페이지에 적용 완료** - 사실/추론 분리 verification-section 표 보유. |
| 그 외 페이지 | 별도 유지 항목 없음 (모두 `verified` 가능) |

**규칙:** HTML 페이지의 `data-validation` 과 배지(✓/◐/△) 는 위 표의 "등급 유지 항목" 을 마크다운 원장과 같은 등급으로 표시해야 한다. HTML 에서 임의로 `verified` 로 승격하지 않는다. 자세한 규칙은 [`dynamic-html-spec.md`](../common/dynamic-html-spec.md) 의 "검증 등급 처리 규칙" 절 참조.

**일관성 갱신 순서:** 새 사실이 확인되면 (예: 에디터에서 alias membership 확정) 마크다운 원장(`animation-blueprint-analysis.md`·`animation-code-analysis.md`) → 본 계획의 위 표 → HTML 페이지 순으로 갱신한다. 역방향 금지.

### 페이지별 chapter-brief 4칸 (표준 골격)

모든 학습 페이지는 상단에 `chapter-brief` 4칸 (이 챕터의 질문 / 먼저 알아둘 것 / 선행 학습 / 보충 자료) 을 둔다. 페이지마다 다음 골격을 따른다.

| HTML 페이지 | 이 챕터의 질문 (핵심) | 선행 학습 (내부 페이지) |
|-------------|---------------------|----------------------|
| `lyra-animation-overview.html` | 라이라 애니메이션의 5가지 큰 시스템은 무엇인가? 캐릭터가 화면에 나타나기까지 어떤 인과를 거치는가? | (없음 - 진입 페이지) |
| `lyra-animation-runtime-state.html` | ABP 변수는 어디서 오는가? GAS 태그가 어떻게 미러링되는가? 왜 ThreadSafe 갱신을 쓰는가? | overview |
| `lyra-animation-base-abp.html` | AnimGraph 의 노드 구성은 어떻게 되는가? cached pose 2개는 왜 필요한가? | runtime-state |
| `lyra-animation-locomotion-sm.html` | LocomotionSM 의 state 는 어떻게 전이되는가? alias·conduit 가 왜 필요한가? | base-abp |
| `lyra-animation-linked-layers.html` | base 가 무기별 layer 를 어떻게 바꿔 끼우는가? ALI 14함수는 어디와 대응되는가? | base-abp · locomotion-sm |
| `lyra-animation-selection-rules.html` | 어떤 cosmetic tag 가 어떤 layer / mesh 를 선택하는가? | linked-layers |
| `lyra-animation-actions-montage.html` | Ability 가 montage 를 어떻게 slot 에 합성하는가? | base-abp |
| `lyra-animation-aiming-additives.html` | aim offset / ADS 가 frame pipeline 의 어디서 계산되는가? | runtime-state · linked-layers |
| `lyra-animation-warping-ik.html` | 보정 스택의 7단계는 무엇이고 책임이 어떻게 나뉘는가? Distance Matching 은 어떻게 동작하는가? | linked-layers |
| `lyra-animation-effects-tests-recipes.html` | Notify → Context Effect 가 어떤 데이터로 동작하는가? 새 무기 추가 절차는? | linked-layers · selection-rules · actions-montage |
| `lyra-animation-invisible-copy-pose.html` | `SKM_*_Invis` 가 왜 invisible 인가? visible cosmetic mesh 는 어떻게 pose 를 따라가는가? `ABP_Mannequin_CopyPose` 와 `B_Manny`/`B_Quinn` 의 comment 가 직접 설명하는 의도는? 한 mesh 로 합치면 무엇이 안 되는가? | selection-rules |
| `lyra-animation-animbp-ali-tradeoffs.html` | 7개 책임군은 각각 무엇을 책임지는가? 무기 추가는 어디서 멈추는가? cosmetic 교체는 어디서 멈추는가? post-process / retarget 이 별도인 이유는? 이 분배의 비용은? | base-abp · linked-layers · selection-rules · warping-ik |

> **표의 "선행 학습" 칸은 간략 페이지명만 적었으나, 실제 HTML 의 `chapter-brief` 에는 각 항목 뒤에 em dash (`—`) + "왜 선행인가" 한 줄 이유를 함께 적는다.** 정당성을 한 줄로 못 적는 항목은 prerequisite 이 아니므로 제거한다. 자세한 규칙은 [`dynamic-html-spec.md`](../common/dynamic-html-spec.md) 의 "선행 학습 정당성" 검사 항목.

자세한 4칸 작성 규칙은 [`dynamic-html-spec.md`](../common/dynamic-html-spec.md) 의 "챕터 브리프 - `.chapter-brief`" 절 참조.
