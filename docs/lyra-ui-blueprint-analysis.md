# Lyra CommonUI 블루프린트 분석

확인일: 2026-05-24  
분석 도구: 실행 중인 Unreal Editor + Monolith MCP HTTP endpoint `localhost:9316`  
분석 범위: HUD layout 위젯 BP, Experience action set CDO, `UGameFeatureAction_AddWidgets` 의 `Layout`/`Widgets` 배열, `UI.Layer.*` / `HUD.Slot.*` 게임플레이 태그

## 핵심 요약

코드 (`docs/lyra-ui-code-analysis.md`) 는 "어떤 메커니즘으로 위젯이 화면에 들어가는가" 를 설명한다. 본 문서는 **그 메커니즘이 라이라 프로젝트에서 실제로 어떤 데이터로 채워져 있는가** 를 검증한 결과다.

핵심 사실 세 가지:

1. Lyra 프로젝트에는 **4개 HUD layout 위젯 BP 파일** (`W_DefaultHUDLayout`, `W_FrontEndHUDLayout`, `W_ShooterHUDLayout`, `W_TopDownArenaHUDLayout`) 의 존재가 파일 시스템으로 확인되며, **이 중 `W_DefaultHUDLayout` 만 CDO 가 본 원장에서 직접 검증**된다. 나머지 3개 layout 의 parent·CDO 는 partial 로 유지한다. 함께 **4개 `UI.Layer.*` 태그** (`Game`, `GameMenu`, `Menu`, `Modal`) 가 정의되어 있다.
2. **`HUD.Slot.*` 태그는 15개** — Lyra 코어 (`Config/DefaultGameplayTags.ini`) 7개 + ShooterCore 플러그인 (`Plugins/GameFeatures/ShooterCore/Config/Tags/ShooterCoreTags.ini`) 8개. 각 태그는 하나 이상의 widget extension point 에 연결.
3. `LAS_ShooterGame_StandardHUD` (LyraExperienceActionSet) 가 ShooterCore Experience 의 HUD 구성을 결정 — 단일 `GameFeatureAction_AddWidgets` 안에 layout 1 + widget 11.

## HUD layout 위젯 BP 인벤토리

`*HUDLayout*.uasset` 파일 시스템 검색 결과.

| 경로 | parent class | 용도 |
|------|--------------|------|
| `/Game/UI/Hud/W_DefaultHUDLayout` | `LyraHUDLayout` (native) | Lyra 코어 게임 layer — escape 메뉴·controller disconnect 처리. CDO 검증됨 (아래) |
| `/Game/UI/FrontEnd/W_FrontEndHUDLayout` | (미확인 — 본 문서 범위 밖) | 프론트엔드/메인 메뉴 layer |
| `/ShooterCore/UserInterface/W_ShooterHUDLayout` | (미확인) | ShooterCore 게임플레이 HUD layer (`LAS_ShooterGame_StandardHUD` 가 push) |
| `/TopDownArena/UserInterface/W_TopDownArenaHUDLayout` | (미확인) | TopDownArena 게임플레이 HUD layer |

> ◐ `W_FrontEndHUDLayout`·`W_ShooterHUDLayout`·`W_TopDownArenaHUDLayout` 의 parent·CDO 는 본 문서 범위에서 직접 확인하지 않음. 본 문서는 `W_DefaultHUDLayout` 만 핵심 사례로 다루며, 다른 layout 은 패턴 동일로 추정.

### `W_DefaultHUDLayout` CDO

Monolith `get_blueprint_info` + `get_cdo_properties` 검증.

| 속성 | 값 | 메모 |
|------|----|------|
| Parent class | `LyraHUDLayout` (native) | C++ 베이스 |
| Generated class | `W_DefaultHUDLayout_C` | |
| Graph | `EventGraph` 만 (function 0개, variable 0개) | 그래프 거의 비어 있음 — 디자인은 디자이너 트리에서 |
| `EscapeMenuClass` | `/Game/UI/Hud/W_LyraGameMenu` | escape 입력 시 `UI.Layer.Menu` 로 push |
| `ControllerDisconnectedScreen` | `/Game/UI/Foundation/Dialogs/W_ControllerDisconnected` | gamepad 연결 끊김 시 |
| `PlatformRequiresControllerDisconnectScreen` | `[Platform.Trait.Input.PrimarlyController]` | 콘솔/모바일 같은 패드 우선 플랫폼에서만 |
| `InputConfig` | `GameAndMenu` (`ELyraWidgetInputMode`) | 게임 입력 + 메뉴 입력 동시 허용 |
| `GameMouseCaptureMode` | `CapturePermanently` | |
| `bAutoActivate` | `false` | push 시 명시적으로 활성화 |
| `bSupportsActivationFocus` | `true` | 게임패드 포커스 지원 |
| `bIsModal` | `false` | modal 아님 — 게임 입력 계속 |

추가로 디자이너 트리 안에 `SubtitleDisplay` (`UW_SubtitleDisplayHost_C`) 와 `SafeZone_0` (`USafeZone`) 슬롯이 있음 (기본값 None — runtime 에 채워지는 듯).

## `UI.Layer.*` 태그 — 4종

`Config/DefaultGameplayTags.ini` 정의 (Lyra 코어).

| 태그 | 용도 (추정 + 코드 단서) |
|------|------------------------|
| `UI.Layer.Game` | 평상시 게임 HUD layer — `LAS_ShooterGame_StandardHUD` 가 `W_ShooterHUDLayout` 을 여기 push |
| `UI.Layer.GameMenu` | 게임 도중 띄우는 보조 메뉴 (인벤토리·맵 등) layer |
| `UI.Layer.Menu` | escape 메뉴·controller disconnect 같은 일반 메뉴 layer — `ULyraHUDLayout::HandleEscapeAction()` 이 `UI.Layer.Menu` 로 push |
| `UI.Layer.Modal` | 모달 다이얼로그용 최상위 layer |

`UGameUIPolicy` (CommonGame 플러그인) 에 이 4개 layer 가 등록되어 있을 것 — 본 문서 범위 밖.

## `HUD.Slot.*` 태그 — 15종

### Lyra 코어 (`Config/DefaultGameplayTags.ini`)

| 태그 | 등록되는 widget (확인된 사례) |
|------|------------------------------|
| `HUD.Slot.ExtraEquipment` | (미확인) |
| `HUD.Slot.InfrequentAbilities` | (미확인) |
| `HUD.Slot.LeftSideTouchInputs` | `W_OnScreenJoystick_Left` (ShooterCore) |
| `HUD.Slot.LeftSideTouchRegion` | `W_TouchRegion_Left` (ShooterCore) |
| `HUD.Slot.RespawnTimer` | (미확인) |
| `HUD.Slot.RightSideTouchInputs` | `W_OnScreenJoystick_Right`, `W_FireButton` (ShooterCore — 동일 slot 에 2개 widget) |
| `HUD.Slot.RightSideTouchRegion` | `W_TouchRegion_Right` (ShooterCore) |

### ShooterCore 플러그인 (`Plugins/GameFeatures/ShooterCore/Config/Tags/ShooterCoreTags.ini`)

| 태그 | 등록되는 widget |
|------|----------------|
| `HUD.Slot.EliminationFeed` | `W_EliminationFeed` |
| `HUD.Slot.Equipment` | `W_QuickBar` |
| `HUD.Slot.ModeStatus` | (미확인 — ShooterCore 의 다른 action set 일 가능성) |
| `HUD.Slot.PerfStats.Graph` | `W_PerfStatContainer_GraphOnly` |
| `HUD.Slot.PerfStats.Text` | `W_PerfStatContainer_TextOnly` |
| `HUD.Slot.Reticle` | `W_WeaponReticleHost` |
| `HUD.Slot.TeamScore` | (미확인 — `B_LyraShooterGame_ControlPoints` 등 다른 action set 일 가능성) |
| `HUD.Slot.TopAccolades` | `W_AccoladeHostWidget` |

> "(미확인)" 은 `LAS_ShooterGame_StandardHUD` 에 등장하지 않은 슬롯. 다른 ActionSet (`B_LyraShooterGame_ControlPoints`, `B_ShooterGame_Elimination`, `B_ShooterGame_Perf` 등) 또는 다른 Experience 에서 사용될 가능성이 높지만 본 문서 범위에서 직접 확인하지 않음.

## `LAS_ShooterGame_StandardHUD` — 검증된 액션 세트

경로: `/ShooterCore/Experiences/LAS_ShooterGame_StandardHUD`  
native class: `LyraExperienceActionSet`  
parent class: `PrimaryDataAsset`

### CDO

| 속성 | 값 |
|------|-----|
| `Actions[]` | `GameFeatureAction_AddWidgets_0` (subobject) 1개 |
| `GameFeaturesToEnable[]` | `["ShooterCore"]` |
| `AssetBundleData.Bundles[Client].BundleAssets` | 12개 widget asset (위젯 cooking 보장) |

### `GameFeatureAction_AddWidgets_0` 의 Layout (1개)

| LayoutClass | LayerID |
|-------------|---------|
| `/ShooterCore/UserInterface/W_ShooterHUDLayout` | `UI.Layer.Game` |

### `GameFeatureAction_AddWidgets_0` 의 Widgets (11개)

| WidgetClass | SlotID |
|-------------|--------|
| `/ShooterCore/UserInterface/Notifications/EliminationFeed/W_EliminationFeed` | `HUD.Slot.EliminationFeed` |
| `/ShooterCore/UserInterface/HUD/W_QuickBar` | `HUD.Slot.Equipment` |
| `/ShooterCore/UserInterface/Notifications/Accolades/W_AccoladeHostWidget` | `HUD.Slot.TopAccolades` |
| `/ShooterCore/UserInterface/HUD/W_WeaponReticleHost` | `HUD.Slot.Reticle` |
| `/Game/UI/PerfStats/W_PerfStatContainer_GraphOnly` | `HUD.Slot.PerfStats.Graph` |
| `/Game/UI/PerfStats/W_PerfStatContainer_TextOnly` | `HUD.Slot.PerfStats.Text` |
| `/Game/UI/Hud/W_OnScreenJoystick_Left` | `HUD.Slot.LeftSideTouchInputs` |
| `/Game/UI/Hud/W_OnScreenJoystick_Right` | `HUD.Slot.RightSideTouchInputs` |
| `/ShooterCore/UserInterface/W_FireButton` | `HUD.Slot.RightSideTouchInputs` |
| `/Game/UI/Hud/W_TouchRegion_Right` | `HUD.Slot.RightSideTouchRegion` |
| `/ShooterCore/Input/W_TouchRegion_Left` | `HUD.Slot.LeftSideTouchRegion` |

### 관찰

- **layer 1개 + widget 11개 가 하나의 ActionSet 에 모여 있다.** 즉 "ShooterCore Experience 의 표준 HUD" 라는 한 가지 의도가 한 데이터 자산에 집중.
- **`HUD.Slot.RightSideTouchInputs` 에 2개 widget** (`W_OnScreenJoystick_Right` + `W_FireButton`) — 한 slot 에 여러 extension 등록 가능 (priority 는 모두 `-1`).
- **모바일 widget이 데스크탑 build 에도 등록**되어 있다 (`W_OnScreenJoystick_*`, `W_TouchRegion_*`, `W_FireButton`). 실제 표시 여부는 widget 자체의 platform/visibility 게이팅 (예: `UCommonUIVisibilitySubsystem`) 이 결정할 것으로 추정.
- **두 모듈에서 widget 이 섞임** — `/ShooterCore/` 와 `/Game/` (Lyra core) 양쪽. ActionSet 이 ShooterCore plugin 안에 있어도 core widget 도 자유롭게 참조 가능.

## 다른 Experience 의 widget 관련 ActionSet (목록만)

`grep` 으로 확인된 `HUD.Slot` 또는 `UI.Layer` 참조 자산 (`.uasset` 바이너리 — 정확한 사용은 Monolith 추가 조회 필요).

- `/ShooterCore/Experiences/B_LyraShooterGame_ControlPoints` — Control Points 게임 모드 Experience
- `/ShooterCore/Experiences/B_ShooterGame_Elimination` — Elimination 게임 모드 Experience
- `/ShooterCore/Experiences/B_ShooterGame_Perf` — 성능 측정용 Experience
- `/ShooterCore/Accolades/B_EliminationFeedRelay` — accolade 처리
- `/ShooterCore/Game/Dash/GA_Hero_Dash`, `GA_Emote`, `GA_Melee` 등 ability — UI 와 직접 관련은 적을 가능성

> 각 자산이 정확히 어떤 slot/layer 를 추가하는지는 본 문서 범위 밖. 후속 분석에서 확인.

## ActivatableWidget input mode — 실제 사용 사례

`W_DefaultHUDLayout` CDO 의 `InputConfig = GameAndMenu` 가 검증된 유일한 사례. 다른 widget 의 input mode 분포는 별도 조사 필요. 다만 패턴은 다음과 같이 추정 (코드 단서 + 사양 의도):

| 위젯 종류 | 예상 `InputConfig` |
|-----------|-------------------|
| HUD layout (게임 layer) | `GameAndMenu` (게임 입력 + 메뉴 입력 동시) |
| 메인 메뉴·설정 화면 | `Menu` (마우스 자유, 게임 입력 차단) |
| popup 다이얼로그 | `Menu` 또는 `GameAndMenu` |
| 게임 안 인벤토리 | `GameAndMenu` (이동 가능 + 메뉴 조작) |

> ◐ 위 매핑은 코드의 enum 의미에서 추론한 일반 패턴. 각 widget BP 의 실제 CDO 값은 별도 검증.

## 검증 한계

본 분석에서 확인하지 못한 부분.

- `W_FrontEndHUDLayout`·`W_ShooterHUDLayout`·`W_TopDownArenaHUDLayout` 의 CDO·내부 디자이너 트리.
- 다른 ExperienceActionSet (`B_LyraShooterGame_ControlPoints` 등) 의 `Actions[]` 안 `GameFeatureAction_AddWidgets` 구성.
- HUD layout BP 안의 **extension point widget** (slot tag 를 `RegisterExtensionPoint` 로 등록하는 자식 위젯) 의 정확한 위치·계층.
- `UGameUIPolicy` (CommonGame 플러그인) 에 등록된 layer 목록 — 실제로 push 가능한 layer 가 4개 `UI.Layer.*` 와 일치하는지.
- `ULyraTaggedWidget` 의 미구현 태그 listening 이 후속 엔진 버전에서 구현됐는지 (현재 5.7 기준 미구현).

## 학습 순서

1. `W_DefaultHUDLayout` 의 디자이너 트리를 에디터에서 열어 extension point widget 의 위치 확인 — slot tag 와 layout 안 위치의 대응을 시각적으로 파악.
2. `LAS_ShooterGame_StandardHUD` 의 `GameFeatureAction_AddWidgets` CDO 를 열어 Layout + Widgets 배열 확인 — 본 문서 표와 대조.
3. `B_LyraDefaultExperience` 등 다른 Experience 가 어떤 ActionSet 을 포함하는지 추적 — 같은 widget 이 여러 Experience 에 등록될 수도, Experience 별로 다른 widget 세트일 수도 있다.
4. 새 widget 을 만들 때는 `Config/DefaultGameplayTags.ini` 의 기존 `HUD.Slot.*` 태그 재활용 또는 새 태그 정의를 결정 → 적절한 ActionSet 에 항목 추가.

## 확장 시 권장 방식

- **같은 게임 모드에 widget 만 추가**: 기존 Experience 의 ActionSet (예: `LAS_ShooterGame_StandardHUD`) 의 `Widgets[]` 에 항목 추가. 코드 수정 없음.
- **새 게임 모드 (Experience) 에 다른 HUD**: 새 ActionSet 작성 + 새 layout BP + 필요한 widget 들 → 새 Experience 의 `ActionSets[]` 에 등록.
- **공통 widget 을 여러 게임 모드에 공유**: 별도 ActionSet 으로 묶고 여러 Experience 가 그 ActionSet 을 동시에 포함하게 한다.
- **태그 가시성 게이팅**: `ULyraTaggedWidget::HiddenByTags` 는 현재 미구현이므로 사용하지 말 것. 대신 widget BP 측 binding, 또는 `UCommonUIVisibilitySubsystem` 의 platform trait 기반 가시성, 또는 별도 binding 메커니즘을 사용한다.
