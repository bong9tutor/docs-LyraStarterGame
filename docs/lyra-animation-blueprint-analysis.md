# Lyra 애니메이션 블루프린트 분석

확인일: 2026-05-22  
분석 도구: 실행 중인 Unreal Editor + Monolith MCP HTTP endpoint `localhost:9316`  
분석 범위: 캐릭터 AnimBlueprint, linked animation layer, weapon instance Blueprint CDO, cosmetic Blueprint CDO, 주요 animation asset 샘플

## 핵심 요약

Lyra의 플레이어 애니메이션은 하나의 거대한 ABP가 모든 무기와 성별을 직접 분기하는 구조가 아니다. 기본 포즈 그래프와 이동 상태 머신은 `/Game/Characters/Heroes/Mannequin/Animations/ABP_Mannequin_Base`가 담당하고, 실제 무기별 포즈·시퀀스 세트는 `ALI_ItemAnimLayers_C` 인터페이스를 구현한 linked layer ABP로 갈아 끼운다.

런타임에서 어떤 linked layer를 쓸지는 weapon instance Blueprint의 `EquippedAnimSet`과 `UneuippedAnimSet`이 결정한다. 이 선택은 `Cosmetic.AnimationStyle.Feminine` 같은 cosmetic gameplay tag를 기준으로 기본 Manny 계열과 Quinn 계열을 나눈다.

## 애셋 인벤토리

Monolith `project_query get_stats`와 `find_by_type` 기준 주요 애니메이션 애셋은 다음과 같다.

| 타입 | 수량 | 메모 |
|------|------:|------|
| `AnimBlueprint` | 20 | 캐릭터 base/post process/copy pose/retarget, item layers, weapon skeletal mesh ABP 포함 |
| `AnimSequence` | 582 | 이동, 점프, 무기, 상호작용, 포즈 계열 포함 |
| `AnimMontage` | 66 | dash, death, melee, reload, interaction montage 포함 |
| `BlendSpace1D` | 3 | rifle crouch walk, rifle jog leans, unarmed jog walk |
| `AimOffsetBlendSpace` | 6 | unarmed/pistol/rifle aim offset |
| `Skeleton` | 5 | mannequin, UE4 mannequin, pistol/rifle/shotgun weapon skeleton |
| `SkeletalMesh` | 8 | Manny, Quinn, invisible meshes, weapon meshes 포함 |

주 캐릭터 skeleton은 `/Game/Characters/Heroes/Mannequin/Meshes/SK_Mannequin`이다. 이 skeleton은 164개 bone과 3개 virtual bone을 가지며, `ik_hand_root`, `ik_hand_gun`, `ik_hand_r`, `ik_hand_l`, `ik_foot_root`, `ik_foot_l`, `ik_foot_r`, `weapon_r`, `weapon_l` 같은 IK·무기 장착용 bone을 포함한다.

## 전체 구조

| 계층 | 대표 애셋 | 역할 |
|------|-----------|------|
| Base character ABP | `/Game/Characters/Heroes/Mannequin/Animations/ABP_Mannequin_Base` | 이동 상태 머신, cached pose, montage slot, additive, root yaw, Control Rig, linked layer 호출 |
| Item layer interface/base | `/Game/Characters/Heroes/Mannequin/Animations/LinkedLayers/ALI_ItemAnimLayers`, `ABP_ItemAnimLayersBase` | 무기별 시퀀스 변수를 정의하고 idle/start/cycle/stop/pivot/jump/aim/skeletal control layer 로직 제공 |
| Weapon/item layer ABP | `/Game/Characters/Heroes/Mannequin/Animations/Locomotion/{Unarmed,Pistol,Rifle,Shotgun}/` 하위 `ABP_*AnimLayers` 및 `_Feminine` 변형 | `ABP_ItemAnimLayersBase`를 상속하거나 rifle layer를 재사용하며 실제 시퀀스 세트만 교체 |
| Weapon skeletal mesh ABP | `/Game/Weapons/*/Animations/ABP_Weap_*` | 총기 mesh 자체의 fire/reload 등 무기 애니메이션 처리 |
| Cosmetic/weapon selector BP | `/Game/Characters/Cosmetics/B_MannequinPawnCosmetics`, `/ShooterCore/Weapons/*/B_WeaponInstance_*` | body mesh와 item linked layer를 gameplay tag로 선택 |

## `ABP_Mannequin_Base`

경로: `/Game/Characters/Heroes/Mannequin/Animations/ABP_Mannequin_Base`

| 항목 | 값 |
|------|----|
| Parent class | `LyraAnimInstance` |
| Skeleton | `/Game/Characters/Heroes/Mannequin/Meshes/SK_Mannequin` |
| Interface | `ALI_ItemAnimLayers_C` |
| Graph 수 | 27 |
| State machine | `LocomotionSM` |
| Linked dependency | `ALI_ItemAnimLayers` |

`AnimGraph`의 주요 node 구성은 다음과 같다.

| Node 계열 | 수량 | 용도 |
|-----------|------:|------|
| `AnimGraphNode_Slot` | 5 | `FullBody`, `UpperBody`, `AdditiveHitReact`, `FullBodyAdditivePreAim`, `UpperBodyAdditive` montage slot |
| `AnimGraphNode_LinkedAnimLayer` | 4 | `FullBody_Aiming`, `FullBodyAdditives`, `FullBody_SkeletalControls`, `LeftHandPose_OverrideState` 호출 |
| `AnimGraphNode_SaveCachedPose` | 2 | `Locomotion`, `UpperbodyLowerbodySplit` 저장 |
| `AnimGraphNode_UseCachedPose` | 3 | 저장된 pose 재사용 |
| `AnimGraphNode_ApplyAdditive` | 2 | upper/body additive 결합 |
| `AnimGraphNode_StateMachine` | 1 | `LocomotionSM` |
| `AnimGraphNode_LayeredBoneBlend` | 1 | 상체/하체 분리 |
| `AnimGraphNode_RotateRootBone` | 1 | root yaw offset 적용 |
| `AnimGraphNode_ControlRig` | 1 | foot placement 또는 skeletal control 보정 |
| `AnimGraphNode_Inertialization` | 1 | 전환 안정화 |

`ABP_Mannequin_Base` 자체가 직접 참조하는 blend space는 `/Game/Characters/Heroes/Mannequin/Animations/Locomotion/Rifle/BS_MM_Rifle_Jog_Leans` 1개뿐이다. 실제 idle/start/cycle/stop/pivot/jump 시퀀스는 linked layer 쪽 변수와 그래프가 담당한다.

### Thread-safe update 그래프

`BlueprintThreadSafeUpdateAnimation` 아래에는 이동/회전/속도/가속도/상태 데이터를 갱신하는 함수들이 분리되어 있다.

| Graph | 주요 역할 |
|-------|-----------|
| `UpdateLocationData` | `WorldLocation`, `DisplacementSinceLastUpdate`, `DisplacementSpeed` 계산 |
| `UpdateRotationData` | `WorldRotation`, `YawDeltaSinceLastUpdate`, `AdditiveLeanAngle`, `YawDeltaSpeed` 갱신 |
| `UpdateVelocityData` | `WorldVelocity`, `LocalVelocity2D`, 방향 angle, cardinal direction 갱신 |
| `UpdateAccelerationData` | `LocalAcceleration2D`, `HasAcceleration`, pivot direction 갱신 |
| `UpdateCharacterStateData` | 지상/웅크림/ADS/발사/점프/낙하/벽 감지 상태 갱신 |
| `UpdateLocomotionStateMachine` | start/stop/pivot/jump-fall 관련 상태 데이터 갱신 |
| `UpdateRootYawOffset` | turn-in-place와 root yaw offset mode 처리 |

### 주요 변수 카테고리

| 카테고리 | 대표 변수 |
|----------|-----------|
| Gameplay Tag Bindings | `GameplayTag_IsADS`, `GameplayTag_IsFiring`, `GameplayTag_IsReloading`, `GameplayTag_IsDashing`, `GameplayTag_IsMelee` |
| Location Data | `WorldLocation`, `DisplacementSinceLastUpdate`, `DisplacementSpeed` |
| Rotation Data | `WorldRotation`, `YawDeltaSinceLastUpdate`, `AdditiveLeanAngle`, `YawDeltaSpeed` |
| Velocity Data | `WorldVelocity`, `LocalVelocity2D`, `LocalVelocityDirectionAngle`, `HasVelocity` |
| Acceleration Data | `LocalAcceleration2D`, `HasAcceleration`, `PivotDirection2D` |
| Character State Data | `IsOnGround`, `IsCrouching`, `ADSStateChanged`, `TimeSinceFiredWeapon`, `IsJumping`, `IsFalling`, `IsRunningIntoWall` |
| Turn In Place | `RootYawOffset`, `TurnYawCurveValue`, `RootYawOffsetMode`, `RootYawOffsetAngleClamp` |
| Settings | `CardinalDirectionDeadZone` |

이 변수들은 C++ `ULyraAnimInstance`의 tag property map과 movement component에서 공급되는 데이터, 그리고 ABP 내부 thread-safe 함수 계산값이 섞여 만들어진다.

## `LocomotionSM`

`LocomotionSM`은 `ABP_Mannequin_Base`의 `AnimGraph` 안에 있는 주 이동 상태 머신이다. Entry state는 `Idle`이고, Monolith `get_state_machines` 기준 **정식 state 10개, transition 27개**를 가진다.

### 정식 state (10개)

각 state는 포즈를 직접 만들지 않고 `ALI_ItemAnimLayers` 인터페이스의 `FullBody_*State` linked anim layer를 호출한다. 즉 "어떤 상태인가"는 base ABP가, "그 상태의 실제 포즈"는 무기별 linked layer가 제공한다.

| State | 호출하는 linked layer 함수 | 추가 노드 |
|-------|----------------------------|-----------|
| `Idle` | `FullBody_IdleState` | — |
| `Start` | `FullBody_StartState` | rifle lean blend space additive |
| `Cycle` | `FullBody_CycleState` | rifle lean blend space additive |
| `Stop` | `FullBody_StopState` | — |
| `Pivot` | `FullBody_PivotState` | rifle lean blend space additive |
| `JumpStart` | `FullBody_JumpStartState` | — |
| `JumpStartLoop` | `FullBody_JumpStartLoopState` | — |
| `JumpApex` | `FullBody_JumpApexState` | — |
| `FallLoop` | `FullBody_FallLoopState` | — |
| `FallLand` | `FullBody_FallLandState` | — |

> Monolith `get_state_info`로 확인한 `Cycle` state의 내부 노드는 `ALI_ItemAnimLayers - FullBody_CycleState` (Linked Anim Layer) → `BS_MM_Rifle_Jog_Leans` (BlendSpace Player) → `Apply Additive` → `Output Animation Pose` 4개다. `Start`/`Pivot`도 같은 구조로 lean blend space를 additive로 더한다. base graph가 전역 yaw/lean 보정을 제공하고, 무기별 full-body 동작은 linked layer가 제공하기 때문이다.

### conduit·state alias (transition 그래프의 핵심)

`LocomotionSM`의 transition 그래프는 10개 정식 state만으로 그려지지 않는다. **conduit**과 **state alias**가 분기·그룹화를 담당한다. 이는 라이라 애니메이션 공식 문서가 "State Aliases"를 별도 주제로 다루는 핵심 기법이며, 여기서 빼면 점프/피벗 흐름을 추적할 수 없다.

- **conduit** — 포즈를 갖지 않는 분기 전용 노드. Monolith transition 데이터에서 `to_type":"conduit"` / `from_type":"conduit"`로 확인된다.
  - `JumpSelector` — `IsJumping`이면 `JumpStart`, `IsFalling`이면 `JumpApex`로 분기.
  - `EndInAir` — 착지 후 `HasAcceleration`이면 `CycleAlias`, 아니면 `IdleAlias`로 분기.
- **state alias** — 여러 source state를 하나로 묶어, alias에서 그린 단일 transition이 묶인 모든 state에 적용되게 하는 참조. 정식 state 목록(10개)에도 없고 conduit도 아니므로 alias로 판별된다. transition endpoint로 다음 5개가 확인된다.
  - `PivotSources` → `Pivot` : 이동 계열 state들을 묶어 피벗 진입 조건을 한 번만 정의.
  - `JumpSources` → `JumpSelector` : 점프 가능한 지상 state들을 묶음.
  - `JumpFallInterruptSources` → `EndInAir` : 점프/낙하 중 지면에 닿으면 즉시 탈출하는 묶음.
  - `IdleAlias`, `CycleAlias` : `EndInAir`가 착지 후 복귀할 목적지(`Idle`/`Cycle`의 alias).

> **검증 한계:** alias가 정확히 어떤 state들을 묶는지(membership)는 현재 Monolith 액션(`get_state_info`)이 alias 노드를 반환하지 않아 조회할 수 없다. alias의 *존재*와 *연결된 transition*은 확인했으나, 묶인 state 집합은 에디터의 `LocomotionSM` 그래프에서 직접 확인해야 한다. 이 문서는 추정 membership을 사실로 적지 않는다.

### transition 조건

27개 transition은 같은 state 쌍 사이에 여러 개가 존재한다(예: `Start → Cycle` 4개). 각 transition rule이 참조하는 변수로 흐름을 읽는다.

| 흐름 | 주요 조건 변수 | 의미 |
|------|----------------|------|
| `Idle → Start` | `HasVelocity`, `HasAcceleration`, `GameplayTag_IsMelee` | 입력/이동이 생기고 근접공격 중이 아니면 이동 시작 |
| `Start → Cycle` | (자동), `Current State Time`·`DisplacementSpeed`, `StartDirection`≠`LocalVelocityDirection`, `RootYawOffset`, `LinkedLayerChanged` | start 재생 완료, 또는 방향 불일치·큰 yaw offset·레이어 교체 시 조기 전이 |
| `Cycle → Stop` / `Start → Stop` | `HasAcceleration`(NOT), `HasVelocity` | 입력이 사라지면 감속 |
| `Stop → Idle` | (자동), `CrouchStateChange`·`ADSStateChanged`·`LinkedLayerChanged` | 정지 완료, 또는 자세/조준/레이어 변화로 재진입 |
| `Stop → Start` | `HasAcceleration` | 정지 도중 다시 입력이 들어오면 재출발 |
| `PivotSources → Pivot` | `LocalVelocity2D · LocalAcceleration2D < 0`, `IsRunningIntoWall`(NOT) | 속도와 가속이 반대 방향(급선회)이고 벽에 막히지 않았을 때 |
| `Pivot → Cycle` / `Pivot → Stop` | `Was Anim Notify State Active`, `IsMovingPerpendicularToInitialPivot`, `LastPivotTime`, `HasAcceleration` | 피벗 애니메이션의 notify state 종료 후 이동/정지 복귀 |
| `JumpSources → JumpSelector` | `IsJumping` / `IsFalling` | 지상에서 점프 또는 낙하 시작 시 점프 분기로 |
| `JumpStart → JumpStartLoop → JumpApex` | (자동), `TimeToJumpApex` | 정점까지 남은 시간 기반 진행 |
| `JumpApex → FallLoop → FallLand` | (자동), `GroundDistance` | 지면 거리(`ULyraAnimInstance::GroundDistance`)가 충분히 가까워지면 착지 |
| `JumpFallInterruptSources → EndInAir` / `FallLand → EndInAir` | `IsOnGround` | 공중 도중 지면에 닿으면 즉시 공중 상태 탈출 |
| `EndInAir → IdleAlias / CycleAlias` | `HasAcceleration` | 착지 후 입력 유무로 idle 또는 이동 복귀 |

`StartDirection`≠`LocalVelocityDirection`, `RootYawOffset` 기반 `Start → Cycle` 조기 전이에는 그래프 주석으로 "카메라가 캐릭터 우측에 있을 때 전진 입력 시 오래 좌측 스트레이프하지 않도록 일찍 Cycle로 보낸다"는 설계 의도가 적혀 있다(`SyncGroupNameToRequireValidMarkersRule`로 sync marker가 유효해질 때까지 대기).

## `ALI_ItemAnimLayers` 인터페이스

경로: `/Game/Characters/Heroes/Mannequin/Animations/LinkedLayers/ALI_ItemAnimLayers`

base ABP와 무기별 linked layer ABP를 잇는 계약(interface)이다. `get_functions` 기준 함수 14개를 선언하며, 이 14개가 base ABP가 linked layer로 호출하는 진입점 전부다.

| 분류 | 인터페이스 함수 | 호출 위치 |
|------|-----------------|-----------|
| 로코모션 state (10) | `FullBody_IdleState`, `FullBody_StartState`, `FullBody_CycleState`, `FullBody_StopState`, `FullBody_PivotState`, `FullBody_JumpStartState`, `FullBody_JumpStartLoopState`, `FullBody_JumpApexState`, `FullBody_FallLoopState`, `FullBody_FallLandState` | `LocomotionSM`의 각 state 내부 |
| AnimGraph 레이어 (4) | `FullBody_Aiming`, `FullBodyAdditives`, `FullBody_SkeletalControls`, `LeftHandPose_OverrideState` | `AnimGraph` 최상위 `LinkedAnimLayer` 노드 |

즉 `ABP_Mannequin_Base`의 `AnimGraph`에 있는 `LinkedAnimLayer` 노드 4개와 `LocomotionSM` state 10개가 모두 이 인터페이스 함수에 1:1 대응한다. 무기를 바꾸면 이 14개 함수의 구현체(`ABP_*AnimLayers`)만 통째로 교체된다.

## `ABP_ItemAnimLayersBase`

경로: `/Game/Characters/Heroes/Mannequin/Animations/LinkedLayers/ABP_ItemAnimLayersBase`

| 항목 | 값 |
|------|----|
| Parent class | `AnimInstance` |
| Skeleton | `/Game/Characters/Heroes/Mannequin/Meshes/SK_Mannequin` |
| Interface | `ALI_ItemAnimLayers_C` |
| Graph 수 | 38개 이상 |
| 역할 | weapon/item별 animation set 변수와 linked layer 구현의 공통 부모 |

이 BP는 실제 학습에서 가장 중요하다. `ABP_Mannequin_Base`가 "언제 어떤 상태인가"를 결정한다면, `ABP_ItemAnimLayersBase`는 "그 상태에서 어떤 animation asset을 어떤 방식으로 재생할 것인가"를 결정한다.

### 주요 변수

| 카테고리 | 대표 변수 |
|----------|-----------|
| Anim Set - Idle | `Idle_ADS`, `Idle_Hipfire`, `Idle_Breaks`, `Crouch_Idle`, `Crouch_Idle_Entry`, `Crouch_Idle_Exit`, `LeftHandPose_Override` |
| Anim Set - Aiming | `Aim_HipFirePose`, `Aim_HipFirePose_Crouch`, `IdleAimOffset`, `RelaxedAimOffset` |
| AnimSet - Walk | `Walk_Cardinals`, `Crouch_Walk_Cardinals` |
| Anim Set - Jog | `Jog_Cardinals` |
| Anim Set - Starts | `Jog_Start_Cardinals`, `ADS_Start_Cardinals`, `Crouch_Start_Cardinals` |
| Anim Set - Stops | `Jog_Stop_Cardinals`, `ADS_Stop_Cardinals`, `Crouch_Stop_Cardinals` |
| Anim Set - Pivots | `Jog_Pivot_Cardinals`, `ADS_Pivot_Cardinals`, `Crouch_Pivot_Cardinals` |
| Anim Set - Jump | `Jump_Start`, `Jump_Apex`, `Jump_FallLand`, `Jump_RecoveryAdditive`, `Jump_StartLoop`, `Jump_FallLoop`, `JumpDistanceCurveName` |
| Anim Set - Turn in Place | `TurnInPlace_Left`, `TurnInPlace_Right`, `Crouch_TurnInPlace_Left`, `Crouch_TurnInPlace_Right` |
| Settings | `PlayRateClampStartsPivots`, `PlayRateClampCycle`, `DisableHandIK`, `EnableLeftHandPoseOverride`, `RaiseWeaponAfterFiringDuration`, `LocomotionDistanceCurveName` |
| Skel Control Data | `HandIK_Right_Alpha`, `HandIK_Left_Alpha` |
| Stride Warping | `StrideWarpingStartAlpha`, `StrideWarpingPivotAlpha`, `StrideWarpingCycleAlpha` |

### 주요 그래프

| Graph | Monolith 기준 node 수 | 분석 메모 |
|-------|----------------------:|-----------|
| `UpdatePivotAnim` | 69 | `Predict Ground Movement Pivot Location`, `Distance Match to Target`, `Advance Time by Distance Matching`, `StrideWarpingPivotAlpha` 갱신 |
| `Update Blend Weight Data` | 46 | `HipFireUpperBodyOverrideWeight`, `AimOffsetBlendWeight`를 firing/crouch/curve 값으로 보간 |
| `UpdateStartAnim` | 27 | start sequence 선택, distance matching, play rate 보정 |
| `UpdateCycleAnim` | 27 | sequence player를 가져와 `Set Playrate to Match Speed`, `StrideWarpingCycleAlpha` 보간 |
| `SetUpStopAnim` | 24 | stop sequence와 distance matching 준비 |
| `UpdateStopAnim` | 22 | stop distance matching과 transition 조건 보조 |
| `SetUpStartAnim` | 19 | cardinal direction 기반 start animation 준비 |
| `UpdateTurnInPlaceAnim` | 17 | turn-in-place animation 시간과 yaw curve 처리 |
| `UpdateSkelControlData` | 13 | `DisableHandIK`, curve value 기반 hand IK alpha 설정 |
| `GetPredictedStopDistance` | 10 | `Predict Ground Movement Stop Location`, `Vector Length XY` 사용 |

`BlueprintThreadSafeUpdateAnimation`은 `Update Blend Weight Data`, `UpdateJumpFallData`, `UpdateSkelControlData`를 연쇄 호출한다. 이는 layer BP도 base ABP처럼 thread-safe update에 맞춰 pose 선택용 값을 선계산한다는 뜻이다.

## 무기별 linked layer ABP

이 layer ABP들은 모두 `/Game/Characters/Heroes/Mannequin/Animations/Locomotion/` 아래 무기별 폴더(`Unarmed/`, `Pistol/`, `Rifle/`, `Shotgun/`)에 위치한다. 각 ABP의 전체 경로는 `.../Locomotion/<무기>/<ABP 이름>` 형식이다 — 예: `.../Locomotion/Pistol/ABP_PistolAnimLayers`, `.../Locomotion/Pistol/ABP_PistolAnimLayers_Feminine`, `.../Locomotion/Shotgun/ABP_ShotgunAnimLayers`.

| ABP | Parent | 참조 sequence | 참조 blend/aim offset | 메모 |
|-----|--------|--------------:|----------------------:|------|
| `ABP_UnarmedAnimLayers` | `ABP_ItemAnimLayersBase_C` | 65 | 1 | 기본 unarmed 세트 |
| `ABP_UnarmedAnimLayers_Feminine` | `ABP_ItemAnimLayersBase_C` | 65 | 1 | Quinn용 unarmed 세트 |
| `ABP_PistolAnimLayers` | `ABP_ItemAnimLayersBase_C` | 65 | 2 | pistol ADS/hipfire 포함 |
| `ABP_PistolAnimLayers_Feminine` | `ABP_ItemAnimLayersBase_C` | 66 | 2 | feminine pistol aim offset 포함 |
| `ABP_RifleAnimLayers` | `ABP_ItemAnimLayersBase_C` | 67 | 2 | rifle crouch/hipfire/ADS 세트 |
| `ABP_RifleAnimLayers_Feminine` | `ABP_ItemAnimLayersBase_C` | 65 | 2 | feminine rifle 세트 |
| `ABP_ShotgunAnimLayers` | `ABP_RifleAnimLayers_C` | 1 | 0 | rifle layer를 대부분 재사용하고 shotgun idle 중심으로 override |
| `ABP_ShotgunAnimLayers_Feminine` | `ABP_RifleAnimLayers_Feminine_C` | 1 | 0 | feminine rifle layer를 재사용 |

Shotgun layer가 rifle layer를 상속하는 점이 중요하다. Shotgun은 독립된 full locomotion set을 새로 갖기보다 rifle 계열 이동 체계를 재사용하고, shotgun 특화 idle/pose만 덮는 방식이다.

## Weapon instance의 AnimLayer 선택

경로:

- `/ShooterCore/Weapons/B_WeaponInstance_Base`
- `/ShooterCore/Weapons/Pistol/B_WeaponInstance_Pistol`
- `/ShooterCore/Weapons/Rifle/B_WeaponInstance_Rifle`
- `/ShooterCore/Weapons/Shotgun/B_WeaponInstance_Shotgun`

`B_WeaponInstance_Base`의 parent는 `LyraRangedWeaponInstance`이고, `B_WeaponInstance_Pistol`/`_Rifle`/`_Shotgun`은 다시 `B_WeaponInstance_Base_C`를 상속한다.

### linked layer 선택 (`EquippedAnimSet` / `UneuippedAnimSet`)

`EquippedAnimSet`, `UneuippedAnimSet`은 `LyraWeaponInstance`에 정의된 `FLyraAnimLayerSelectionSet` 프로퍼티다. `Uneuipped`는 실제 코드와 애셋에 존재하는 오탈자 프로퍼티명이므로 문서에서도 그대로 표기한다.

| Weapon instance | Equipped default | Equipped feminine rule | `Uneuipped` default | `Uneuipped` feminine rule |
|-----------------|------------------|-------------------------|--------------------|--------------------------|
| `B_WeaponInstance_Base` | 없음(`None`) | 없음 | `ABP_UnarmedAnimLayers_C` | `ABP_UnarmedAnimLayers_Feminine_C` |
| `B_WeaponInstance_Pistol` | `ABP_PistolAnimLayers_C` | `ABP_PistolAnimLayers_Feminine_C` | `ABP_UnarmedAnimLayers_C` | `ABP_UnarmedAnimLayers_Feminine_C` |
| `B_WeaponInstance_Rifle` | `ABP_RifleAnimLayers_C` | `ABP_RifleAnimLayers_Feminine_C` | `ABP_UnarmedAnimLayers_C` | `ABP_UnarmedAnimLayers_Feminine_C` |
| `B_WeaponInstance_Shotgun` | `ABP_ShotgunAnimLayers_C` | `ABP_ShotgunAnimLayers_Feminine_C` | `ABP_UnarmedAnimLayers_C` | `ABP_UnarmedAnimLayers_Feminine_C` |

위 표는 각 weapon instance의 CDO를 Monolith `get_cdo_properties`로 직접 읽어 확인했다. 각 `AnimSet`은 `DefaultLayer` 1개와 `LayerRules` 배열을 가지며, feminine rule은 `RequiredTags = Cosmetic.AnimationStyle.Feminine` 단일 태그 규칙으로 들어 있다.

선택 규칙은 단순하다. cosmetic tag container가 `Cosmetic.AnimationStyle.Feminine`을 포함하면 feminine layer를, 아니면 `DefaultLayer`를 반환한다. 이 규칙은 C++ `FLyraAnimLayerSelectionSet::SelectBestLayer`가 실행하고, 어느 set을 쓸지는 `ULyraWeaponInstance::PickBestAnimLayer(bEquipped, CosmeticTags)`가 `bEquipped`로 고른다(`LyraWeaponInstance.cpp:78`).

### 그 외 애니메이션 관련 CDO 프로퍼티

`AnimSet` 외에도 `B_WeaponInstance_*` CDO에는 Animation 카테고리 프로퍼티가 더 있다(`get_cdo_properties` 확인).

| 프로퍼티 | 타입 | `_Base` | `_Pistol` | `_Rifle` |
|----------|------|---------|-----------|----------|
| `WeaponEquipMontage` | `UAnimMontage*` | `None` | `AM_MM_Pistol_Equip` | `AM_MM_Rifle_Equip` |
| `WeaponUnequipMontage` | `UAnimMontage*` | `AM_MM_Generic_Unequip` | `AM_MM_Generic_Unequip` | `AM_MM_Generic_Unequip` |
| `MeleeAttackMontage` | `UAnimMontage*` | `AM_MM_Pistol_Melee` | `AM_MM_Pistol_Melee` | `AM_MM_Rifle_Melee` |
| `CosmeticAnimStyleTags` | `FGameplayTagContainer` | 비어 있음 | 비어 있음 | 비어 있음 |

`WeaponEquipMontage`/`WeaponUnequipMontage`/`MeleeAttackMontage`는 장착·해제·근접공격 시 base ABP의 montage slot에 재생할 몽타주다. `CosmeticAnimStyleTags`는 기본값이 비어 있으나, `PickBestAnimLayer`에 넘기는 cosmetic tag와 결합되는 무기 측 태그 컨테이너이므로 코스메틱-레이어 선택 흐름을 분석할 때 함께 봐야 한다.

## Cosmetic body mesh 선택

관련 Blueprint:

- `/ShooterCore/Game/B_Hero_ShooterMannequin`
- `/Game/Characters/Cosmetics/B_MannequinPawnCosmetics`

`B_Hero_ShooterMannequin`은 `PawnCosmeticsComponent`로 `B_MannequinPawnCosmetics_C`를 사용한다. 이 component의 `BodyMeshes` CDO 값은 다음과 같다.

| Required tags | Mesh |
|---------------|------|
| `Cosmetic.AnimationStyle.Masculine`, `Cosmetic.BodyStyle.Medium` | `/Game/Characters/Heroes/Mannequin/Meshes/SKM_Manny_Invis` |
| `Cosmetic.AnimationStyle.Feminine`, `Cosmetic.BodyStyle.Medium` | `/Game/Characters/Heroes/Mannequin/Meshes/SKM_Quinn_Invis` |
| Default | `/Game/Characters/Heroes/Mannequin/Meshes/SKM_Manny_Invis` |

Forced physics asset은 `/Game/Characters/Heroes/Mannequin/Rig/PA_Mannequin`이다. Manny와 Quinn visible mesh 샘플은 같은 skeleton을 공유하고, 각각 `weapon_r_muzzle`, `foot_r_Socket`, `foot_l_Socket` socket 3개와 LOD 4개를 가진다.

## Blend space 샘플

| Asset | Axis | Sample 수 | 용도 |
|-------|------|----------:|------|
| `BS_MM_Rifle_Jog_Leans` | `LeanAngle`, -20~20 | 3 | center/left/right rifle jog lean additive |
| `BS_MM_Rifle_Crouch_Walk` | `Direction`, -180~180 | 5 | crouch walk forward/back/left/right |
| `BS_MM_Unarmed_Jog_Walk` | `Speed`, 200~400 | 2 | unarmed walk/jog forward blend |

`BS_MM_Rifle_Jog_Leans`는 `ABP_Mannequin_Base`가 직접 참조한다. 나머지 locomotion blend/aim offset은 item layer ABP의 변수 세트로 주입된다.

## Montage 샘플

| Montage | Slot | 길이 | Blend In/Out | Notify |
|---------|------|-----:|-------------:|-------:|
| `AM_MM_Dash_Forward` | `FullBody` | 0.933s | 0.0667 / 0.33 | 0 |
| `AM_MM_Rifle_GrenadeToss` | `UpperBody`, `UpperBodyAdditive` | 0.867s | 0.15 / 0.20 | 0 |
| `AM_MM_Pistol_Melee` | `UpperBody`, `UpperBodyAdditive` | 1.15s | 0.0667 / 0.40 | 2 |

Base AnimGraph에 `FullBody`, `UpperBody`, `UpperBodyAdditive` slot이 존재하므로 이 montage들은 locomotion pose 위에 slot 기반으로 합성된다.

## Weapon skeletal mesh ABP

| ABP | Skeleton | 역할 |
|-----|----------|------|
| `/Game/Weapons/Pistol/Animations/ABP_Weap_Pistol` | `SK_Pistol_Skeleton` | pistol mesh fire/reload animation |
| `/Game/Weapons/Rifle/Animations/ABP_Weap_Rifle` | `SK_Rifle_Skeleton` | rifle mesh fire/reload animation |
| `/Game/Weapons/Shotgun/Animations/ABP_Weap_Shotgun` | `SK_Shotgun_Skeleton` | shotgun mesh fire/reload animation |

이 ABP들은 캐릭터 locomotion ABP와 별개로 무기 skeletal mesh 자체를 움직인다. 캐릭터 손 IK와 weapon mesh animation은 같은 사건에서 함께 재생될 수 있지만, skeleton과 AnimBP는 분리되어 있다.

## 학습 순서

1. `ABP_Mannequin_Base`의 `AnimGraph`에서 pose가 어떻게 `Locomotion`, `UpperbodyLowerbodySplit`, slot, linked layer, Control Rig를 통과하는지 따라간다.
2. `LocomotionSM`에서 state 이름과 linked layer 함수 이름을 대응시킨다.
3. `ABP_ItemAnimLayersBase`의 변수 카테고리를 보고 무기별 layer ABP가 어떤 sequence set을 채우는지 확인한다.
4. `B_WeaponInstance_*`의 CDO에서 equipped/unequipped layer 선택 규칙을 확인한다.
5. Cosmetic component가 어떤 tag를 만들어 body mesh와 animation style을 동시에 바꾸는지 확인한다.

## 확장 시 주의점

새 무기를 추가할 때는 캐릭터 ABP를 복제하기보다 `ABP_ItemAnimLayersBase` 계열의 새 linked layer를 만들고 weapon instance의 `EquippedAnimSet`에 연결하는 편이 Lyra 구조와 맞다.

새 body style을 추가할 때는 mesh 선택과 animation layer 선택을 함께 설계해야 한다. mesh만 바꾸고 `Cosmetic.AnimationStyle.*` 태그를 맞추지 않으면 잘못된 Manny/Quinn animation set이 선택될 수 있다.

Montage를 추가할 때는 어떤 slot을 쓰는지 먼저 정해야 한다. full-body 동작은 `FullBody`, 상체 동작은 `UpperBody`와 `UpperBodyAdditive` slot을 타며, base AnimGraph의 layered blend 위치에 따라 locomotion과 합성된다.

Distance Matching, Stride Warping, Turn In Place, Hand IK alpha는 `ABP_ItemAnimLayersBase`의 update graph와 curve 값에 강하게 의존한다. sequence를 교체할 때 curve 이름과 distance curve 존재 여부를 함께 검증해야 한다.
