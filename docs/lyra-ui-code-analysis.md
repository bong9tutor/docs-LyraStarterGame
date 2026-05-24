# Lyra CommonUI 코드 분석

확인일: 2026-05-24  
분석 범위: `Source/LyraGame/UI/` (핵심 메커니즘 5종) + `Plugins/UIExtension/` 공개 API + `Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.*`

## 핵심 요약

Lyra 의 UI 아키텍처는 **데이터 주도 모듈형**으로, 화면을 만드는 코드와 화면을 채우는 데이터가 분리되어 있다. 주된 책임은 다섯 가지다.

- `ULyraActivatableWidget`: CommonUI 의 activatable widget 을 라이라 input mode (`Default`/`GameAndMenu`/`Game`/`Menu`) 와 묶어 자동으로 input config 를 적용.
- `ALyraHUD`: AHUD 의 얇은 래퍼. 디버그 렌더링과 GameFramework 컴포넌트 확장 수신만 담당하고, 실제 위젯 구성은 **GameFeatureAction 이 외부에서 주입**한다.
- `ULyraHUDLayout`: 한 게임 layer (예: `UI.Layer.Game`) 에 들어가는 활성화 widget. escape 액션 바인딩과 컨트롤러 분리 감지를 책임진다.
- `ULyraTaggedWidget`: gameplay tag 로 가시성을 게이팅하는 widget 베이스. (단, 본문에서 실제 태그 listening 은 미구현 — 코드 주석에 `UE-142237` 명시)
- `UGameFeatureAction_AddWidgets`: Experience 가 활성화될 때 `ALyraHUD` 에 `Layout[]` 과 `Widgets[]` 를 등록. layout 은 layer 에 push, widget 은 `UUIExtensionSubsystem` 슬롯에 register.

이 위에 두 외부 시스템이 얹힌다.

- `UUIExtensionSubsystem` (UIExtension 플러그인): tag 기반 extension point ↔ extension 매칭 허브. Lyra HUD 의 "슬롯에 위젯 꽂기" 가 이 subsystem 으로 이뤄진다.
- `ULyraUIManagerSubsystem`: `UGameUIManagerSubsystem` 파생. 매 tick 으로 HUD 의 `bShowHUD` 값을 보고 root layout 의 visibility 를 동기화한다 (`showhud` 콘솔 명령 등으로 HUD 토글 시 root layout 도 같이 숨김).

## 런타임 흐름

플레이어가 게임에 들어가서 첫 위젯이 화면에 뜨기까지의 큰 흐름.

1. Experience 가 결정되고 (`ULyraExperienceManagerComponent`), `ULyraExperienceActionSet` 에 포함된 `UGameFeatureAction_AddWidgets` 가 활성화된다.
2. `AddToWorld()` 가 `UGameFrameworkComponentManager::AddExtensionHandler(ALyraHUD::StaticClass(), ...)` 로 HUD 액터 등장을 구독한다.
3. `ALyraHUD::PreInitializeComponents()` 가 자신을 receiver 로 등록하고, `BeginPlay()` 가 `NAME_GameActorReady` 이벤트를 발송한다.
4. `HandleActorExtension()` 이 그 이벤트를 받아 `AddWidgets()` 를 호출.
5. `AddWidgets()` 는 두 종류를 등록한다.
   - `Layout[]` 각 항목 → `UCommonUIExtensions::PushContentToLayer_ForPlayer(LocalPlayer, LayerID, LayoutClass)` 로 push.
   - `Widgets[]` 각 항목 → `UUIExtensionSubsystem::RegisterExtensionAsWidgetForContext(SlotID, LocalPlayer, WidgetClass, -1)` 로 register.
6. push 된 layout 은 `ULyraHUDLayout` 이고, `NativeOnInitialized()` 에서 escape action (`UI.Action.Escape`) 바인딩과 (필요 시) 컨트롤러 분리 감지 delegate 를 건다.
7. layout 내부의 extension point 위젯이 자신의 slot tag 로 `RegisterExtensionPoint` 를 호출하면, 4단계에서 등록된 widget 들이 매칭되어 layout 안에 표시된다.

이 흐름의 핵심은 **HUD layout 도, slot 위젯도 코드가 아니라 데이터가 결정**한다는 점이다. 새 위젯을 추가하려면 C++ 수정 없이 ExperienceActionSet 의 action 배열에 항목 하나만 더한다.

## `ULyraActivatableWidget`

파일:
- [`../Source/LyraGame/UI/LyraActivatableWidget.h`](../Source/LyraGame/UI/LyraActivatableWidget.h)
- [`../Source/LyraGame/UI/LyraActivatableWidget.cpp`](../Source/LyraGame/UI/LyraActivatableWidget.cpp)

`UCommonActivatableWidget` 의 라이라 베이스. activated 상태에서 자동으로 desired input config 를 반환한다.

| 멤버 | 역할 |
|------|------|
| `ELyraWidgetInputMode InputConfig` | `Default` / `GameAndMenu` / `Game` / `Menu` 4종 enum, `EditDefaultsOnly` |
| `EMouseCaptureMode GameMouseCaptureMode` | game input 시 마우스 캡처 모드. 기본값 `CapturePermanently` |
| `GetDesiredInputConfig() override` | enum 을 보고 `FUIInputConfig(ECommonInputMode::All/Game/Menu, GameMouseCaptureMode)` 반환. `Menu` 는 `NoCapture` 로 고정 (마우스 캡처 안 함) |

### enum ↔ FUIInputConfig 매핑

| `ELyraWidgetInputMode` | `ECommonInputMode` | MouseCaptureMode |
|-----------------------|--------------------|------------------|
| `Default` | (TOptional 비어 있음 — 기본 동작) | - |
| `GameAndMenu` | `All` | `GameMouseCaptureMode` |
| `Game` | `Game` | `GameMouseCaptureMode` |
| `Menu` | `Menu` | `NoCapture` (강제) |

### Editor 검증

`ValidateCompiledWidgetTree()` 가 `BP_GetDesiredFocusTarget` 미구현 시 컴파일 경고를 출력. 게임패드 사용성을 위해 사실상 필수.

## `ALyraHUD`

파일:
- [`../Source/LyraGame/UI/LyraHUD.h`](../Source/LyraGame/UI/LyraHUD.h)
- [`../Source/LyraGame/UI/LyraHUD.cpp`](../Source/LyraGame/UI/LyraHUD.cpp)

`AHUD` 의 얇은 래퍼. 헤더 코멘트가 직접 "typically do not need to extend or modify this class, instead you would use an Add Widget action in your experience" 라고 명시한다.

| 함수 | 역할 |
|------|------|
| `PreInitializeComponents()` | `UGameFrameworkComponentManager::AddGameFrameworkComponentReceiver(this)` — 외부 확장이 이 액터에 component/extension 을 붙일 수 있게 함 |
| `BeginPlay()` | `SendGameFrameworkComponentExtensionEvent(NAME_GameActorReady)` — `UGameFeatureAction_AddWidgets` 가 이 이벤트를 듣고 위젯을 push |
| `EndPlay()` | receiver 등록 해제 |
| `GetDebugActorList()` | 모든 `UAbilitySystemComponent` 인스턴스의 avatar/owner actor 를 디버그 표시 대상에 추가 (gameplay debugger 용) |

| 멤버 변수 |
|-----------|
| (위젯·layout 관련 멤버 없음 — 외부 데이터가 모든 구성 담당) |

`PrimaryActorTick.bStartWithTickEnabled = false` — tick 자체를 꺼서 매 frame 부하 없음.

## `ULyraHUDLayout`

파일:
- [`../Source/LyraGame/UI/LyraHUDLayout.h`](../Source/LyraGame/UI/LyraHUDLayout.h)
- [`../Source/LyraGame/UI/LyraHUDLayout.cpp`](../Source/LyraGame/UI/LyraHUDLayout.cpp)

한 `UI.Layer.*` 에 push 되는 활성화 widget. `ULyraActivatableWidget` 상속.

| 멤버 / 함수 | 역할 |
|-------------|------|
| `TSoftClassPtr<UCommonActivatableWidget> EscapeMenuClass` | escape 입력 시 push 할 메뉴 (보통 `W_LyraGameMenu`) |
| `TSubclassOf<ULyraControllerDisconnectedScreen> ControllerDisconnectedScreen` | 컨트롤러 분리 시 표시할 widget |
| `FGameplayTagContainer PlatformRequiresControllerDisconnectScreen` | 이 태그가 platform trait 에 모두 있을 때만 컨트롤러 분리 감지 작동. 기본값 `Platform.Trait.Input.PrimarlyController` |
| `NativeOnInitialized()` | `RegisterUIActionBinding(UI.Action.Escape, HandleEscapeAction)` 호출. 플랫폼 조건 충족 시 `IPlatformInputDeviceMapper::GetOnInputDeviceConnectionChange()`·`GetOnInputDevicePairingChange()` 구독 |
| `HandleEscapeAction()` | `UCommonUIExtensions::PushStreamedContentToLayer_ForPlayer(GetOwningLocalPlayer(), UI.Layer.Menu, EscapeMenuClass)` 로 메뉴 push |
| `HandleInputDeviceConnectionChanged/PairingChanged` | 자신의 LocalPlayer 에 영향 있는 변경만 통과 → `NotifyControllerStateChangeForDisconnectScreen()` |
| `NotifyControllerStateChangeForDisconnectScreen()` | `FTSTicker` 로 다음 tick 에 한 번 처리 (rapid 변경 합치기) |
| `ProcessControllerDevicesHavingChangedForDisconnectScreen()` | 매핑된 디바이스 중 connected gamepad 가 0개면 `DisplayControllerDisconnectedMenu`, 있으면 hide |
| `DisplayControllerDisconnectedMenu_Implementation()` | `UI.Layer.Menu` 에 disconnect 화면 push |

### 사용되는 네이티브 태그 (파일 내부 `UE_DEFINE_GAMEPLAY_TAG_STATIC`)

| 태그 | 용도 |
|------|------|
| `UI.Layer.Menu` | escape 메뉴·컨트롤러 분리 화면이 push 되는 layer |
| `UI.Action.Escape` | escape 입력 액션 |
| `Platform.Trait.Input.PrimarlyController` | 컨트롤러 분리 감지가 활성되는 플랫폼 조건 |

> 위 3개 태그는 `UE_DEFINE_GAMEPLAY_TAG_STATIC` 으로 파일 로컬 정의되며, 같은 이름이 `Config/DefaultGameplayTags.ini` 에도 정의되어 있다 (`UI.Layer.Menu` 등). 두 곳의 정의가 일치한다.

## `ULyraTaggedWidget`

파일:
- [`../Source/LyraGame/UI/LyraTaggedWidget.h`](../Source/LyraGame/UI/LyraTaggedWidget.h)
- [`../Source/LyraGame/UI/LyraTaggedWidget.cpp`](../Source/LyraGame/UI/LyraTaggedWidget.cpp)

`UCommonUserWidget` 의 라이라 베이스. owning player 의 태그로 가시성을 제어한다.

| 멤버 | 역할 |
|------|------|
| `FGameplayTagContainer HiddenByTags` | owning player 가 이 태그 중 어느 하나라도 가지면 widget 이 hidden |
| `ESlateVisibility ShownVisibility` | 평소 가시성. 기본값 `Visible` |
| `ESlateVisibility HiddenVisibility` | 숨김 시 가시성. 기본값 `Collapsed` |
| `bool bWantsToBeVisible` | 외부 `SetVisibility` 호출의 의도 기억 (태그 게이팅 해제 시 복귀할 상태) |
| `SetVisibility()` override | 외부 호출 → `bWantsToBeVisible` 갱신 + `Shown/Hidden` 둘 중 하나에 값 기록 → 최종 가시성 계산 |
| `OnWatchedTagsChanged()` | 태그 변경 시 가시성 재계산 |

### 검증 한계 — 태그 listening 미구현

`NativeConstruct()` 와 `NativeDestruct()` 모두 `//@TODO` 주석만 남아 있고, `SetVisibility()`·`OnWatchedTagsChanged()` 내부의 `bHasHiddenTags` 가 **`false` 로 하드코딩**되어 있다 (`//@TODO: Foo->HasAnyTags(HiddenByTags)`). 즉 **현재 시점에서 `HiddenByTags` 는 가시성에 영향을 주지 않는다.** 코드 상단 주석에 `UE-142237` 이슈 번호가 명시되어 있다.

따라서 본 클래스는 인터페이스만 정의된 상태로 봐야 하며, 위젯에 `HiddenByTags` 를 채워도 실제 동작하지 않는다. 새 UI 를 만들 때 가시성 게이팅이 필요하면 별도 메커니즘 (custom binding, viewmodel, blueprint event 등) 을 써야 한다.

## `UGameFeatureAction_AddWidgets`

파일:
- [`../Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.h`](../Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.h)
- [`../Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.cpp`](../Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.cpp)

> 클래스 이름은 복수형 `AddWidgets` (파일명은 단수형 `AddWidget.h/.cpp`). 디스플레이 이름은 `"Add Widgets"`.

Lyra UI 의 모듈형 동작 핵심. `UGameFeatureAction_WorldActionBase` 상속.

### 데이터 구조

```cpp
USTRUCT() struct FLyraHUDLayoutRequest {
    TSoftClassPtr<UCommonActivatableWidget> LayoutClass; // AssetBundles=Client
    FGameplayTag LayerID;                                 // Categories=UI.Layer
};

USTRUCT() struct FLyraHUDElementEntry {
    TSoftClassPtr<UUserWidget> WidgetClass; // AssetBundles=Client
    FGameplayTag SlotID;
};

UCLASS class UGameFeatureAction_AddWidgets : UGameFeatureAction_WorldActionBase {
    TArray<FLyraHUDLayoutRequest> Layout;   // 한 액션 안에 여러 layout 가능
    TArray<FLyraHUDElementEntry>  Widgets;  // 한 액션 안에 여러 widget 가능
};
```

### 흐름

| 단계 | 코드 |
|------|------|
| 1. world 추가 | `AddToWorld()` → `UGameFrameworkComponentManager::AddExtensionHandler(ALyraHUD::StaticClass(), HandleActorExtension)` |
| 2. HUD 등장 | `ALyraHUD::BeginPlay()` 가 `NAME_GameActorReady` 발송 |
| 3. dispatcher | `HandleActorExtension()` — `Added` 계열이면 `AddWidgets`, `Removed` 계열이면 `RemoveWidgets` |
| 4. layout push | `Layout[]` 각 항목 → `UCommonUIExtensions::PushContentToLayer_ForPlayer(LocalPlayer, LayerID, LayoutClass)` |
| 5. widget register | `Widgets[]` 각 항목 → `UUIExtensionSubsystem::RegisterExtensionAsWidgetForContext(SlotID, LocalPlayer, WidgetClass, -1)` |
| 6. 비활성 | `OnGameFeatureDeactivating()` → `Reset()` → 각 layout `DeactivateWidget()` + 각 extension handle `Unregister()` |

### 검증 (editor)

`IsDataValid()` 가 `Layout[].LayoutClass.IsNull()`·`LayerID.IsValid()`·`Widgets[].WidgetClass.IsNull()`·`SlotID.IsValid()` 모두 체크. 비어 있거나 무효한 항목이 있으면 invalid 결과 + context 에 에러 추가.

### per-context 데이터

```cpp
struct FPerActorData {
    TArray<TWeakObjectPtr<UCommonActivatableWidget>> LayoutsAdded; // push 한 layout
    TArray<FUIExtensionHandle> ExtensionHandles;                   // register 한 widget handle
};
struct FPerContextData {
    TArray<TSharedPtr<FComponentRequestHandle>> ComponentRequests;
    TMap<FObjectKey, FPerActorData> ActorData;                     // HUD 액터 별
};
TMap<FGameFeatureStateChangeContext, FPerContextData> ContextData; // PIE 멀티 세션 대비
```

여러 PIE 세션이 같은 액션을 활성화해도 context 별로 분리 관리.

## `UUIExtensionSubsystem` (UIExtension 플러그인)

파일:
- [`../Plugins/UIExtension/Source/Public/UIExtensionSystem.h`](../Plugins/UIExtension/Source/Public/UIExtensionSystem.h)

`UWorldSubsystem` 파생. tag 기반 pub/sub 패턴으로 **extension point** (구독자, layout 안 위젯) ↔ **extension** (공급자, GameFeatureAction 이 등록한 위젯) 을 매칭한다.

### 데이터 타입

| 타입 | 의미 |
|------|------|
| `FUIExtension` | 한 extension. `ExtensionPointTag`, `Priority`, `ContextObject`, `Data` (=widget class 등) |
| `FUIExtensionPoint` | 한 extension point. `ExtensionPointTag`, `ContextObject`, 매칭 모드 (`ExactMatch`/`PartialMatch`), 허용 `AllowedDataClasses[]`, 콜백 |
| `FUIExtensionHandle` / `FUIExtensionPointHandle` | 등록 핸들. `Unregister()` 로 제거 |
| `FUIExtensionRequest` | 매칭 결과를 콜백에 전달하는 페이로드 |
| `EUIExtensionPointMatch` | `ExactMatch` (정확히 같은 태그만) / `PartialMatch` (하위 태그까지) |

### 주요 API

| C++ 함수 | 역할 |
|----------|------|
| `RegisterExtensionPoint(Tag, Match, AllowedClasses[], Callback)` | extension point 등록 (구독자). 매칭 시 callback 호출 |
| `RegisterExtensionPointForContext(Tag, Context, Match, AllowedClasses[], Callback)` | context object 와 함께 등록 (특정 player 대상) |
| `RegisterExtensionAsWidget(Tag, WidgetClass, Priority)` | widget extension 등록 (공급자) |
| `RegisterExtensionAsWidgetForContext(Tag, Context, WidgetClass, Priority)` | context-aware widget extension (`UGameFeatureAction_AddWidgets` 가 사용 — context = LocalPlayer) |
| `RegisterExtensionAsData(Tag, Context, Data, Priority)` | data extension |
| `UnregisterExtension(Handle)` / `UnregisterExtensionPoint(Handle)` | 등록 해제 |

K2 (blueprint) 노출 변형도 동일 시그니처로 제공 (`K2_RegisterExtensionAsWidget` 등).

### 내부 자료구조

```cpp
TMap<FGameplayTag, FExtensionPointList> ExtensionPointMap; // tag → point[]
TMap<FGameplayTag, FExtensionList>       ExtensionMap;     // tag → extension[]
```

신규 extension 등록 시 같은 tag (혹은 partial 매칭) 의 모든 point 에 `EUIExtensionAction::Added` 콜백. unregister 시 `Removed`.

### 매칭 contract

`FUIExtensionPoint::DoesExtensionPassContract(Extension)` 가 (a) tag 매칭, (b) `AllowedDataClasses` 가 비어 있지 않으면 data class 의 isA 체크 두 가지를 본다. 통과한 extension 만 콜백을 받는다.

### `UUIExtensionPointWidget` — layout 안 slot 구독 widget

파일: [`../Plugins/UIExtension/Source/Public/Widgets/UIExtensionPointWidget.h`](../Plugins/UIExtension/Source/Public/Widgets/UIExtensionPointWidget.h)

HUD layout 안에 배치되어 자신의 slot tag 를 구독하고, `UGameFeatureAction_AddWidgets` 가 register 한 widget 들을 자기 위치에 표시하는 widget. UIExtension 의 "extension point" 측 representative.

```cpp
UCLASS(MinimalAPI)
class UUIExtensionPointWidget : public UDynamicEntryBoxBase {
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "UI Extension")
    FGameplayTag ExtensionPointTag;                              // 이 widget 이 구독할 slot tag

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "UI Extension")
    EUIExtensionPointMatch ExtensionPointTagMatch = ExactMatch;  // ExactMatch | PartialMatch

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "UI Extension")
    TArray<TObjectPtr<UClass>> DataClasses;                      // 허용 data class (비어 있으면 모두 허용)

    UPROPERTY(... IsBindableEvent="True")
    FOnGetWidgetClassForData GetWidgetClassForData;              // data → widget class 변환 (Data 등록 모드용)

    UPROPERTY(... IsBindableEvent="True")
    FOnConfigureWidgetForData ConfigureWidgetForData;            // entry widget 생성 후 구성
};
```

| 멤버 / 함수 | 역할 |
|-------------|------|
| `ExtensionPointTag` | 이 widget 이 구독할 slot tag (`HUD.Slot.*` 등) |
| `ExtensionPointTagMatch` | `ExactMatch` 면 정확한 태그만, `PartialMatch` 면 하위 태그도 |
| `DataClasses` | 빈 배열이면 모든 data 허용, 비어 있지 않으면 isA 매칭 |
| `RebuildWidget()` override | 슬레이트 빌드 시 `RegisterExtensionPoint()` 호출 |
| `RegisterExtensionPoint()` | `UUIExtensionSubsystem` 에 자신을 등록 |
| `RegisterExtensionPointForPlayerState()` | player state context 를 가진 등록 (멀티플레이어용) |
| `OnAddOrRemoveExtension(Action, Request)` | 매칭된 extension 이 등록·해제될 때 entry widget 생성·제거 |
| `ResetExtensionPoint()` | 등록 해제 + entry widget 모두 제거 |
| `ValidateCompiledDefaults()` | (Editor 한정) BP 컴파일 시 검증 |

부모 `UDynamicEntryBoxBase` 가 entry widget 들의 위치·간격을 panel-like 로 관리. 따라서 layout BP 디자이너에서 `UUIExtensionPointWidget` 을 panel 처럼 배치하고 `ExtensionPointTag` 만 설정하면, runtime 에 매칭된 widget 들이 자동으로 그 자리에 들어간다.

## `ULyraUIManagerSubsystem`

파일:
- [`../Source/LyraGame/UI/Subsystem/LyraUIManagerSubsystem.h`](../Source/LyraGame/UI/Subsystem/LyraUIManagerSubsystem.h)
- [`../Source/LyraGame/UI/Subsystem/LyraUIManagerSubsystem.cpp`](../Source/LyraGame/UI/Subsystem/LyraUIManagerSubsystem.cpp)

`UGameUIManagerSubsystem` (CommonGame 플러그인) 파생. 라이라 측 추가 동작은 한 가지 — **HUD 의 `bShowHUD` 토글을 root layout 가시성으로 동기화**.

| 함수 | 역할 |
|------|------|
| `Initialize()` | `FTSTicker` 로 매 frame `Tick()` 등록 |
| `Tick(DeltaTime)` | `SyncRootLayoutVisibilityToShowHUD()` 호출, 항상 `true` 반환 (계속 tick) |
| `SyncRootLayoutVisibilityToShowHUD()` | `GetCurrentUIPolicy()` 의 `GetRootLayout(LocalPlayer)` 가시성을 `HUD->bShowHUD` 에 따라 `SelfHitTestInvisible` ↔ `Collapsed` 토글 |

콘솔 `showhud` 또는 코드로 `bShowHUD = false` 설정 시 root layout 전체가 사라진다 (디버그/스크린샷용).

`UGameUIManagerSubsystem` 자체 (CommonGame) 가 `UGameUIPolicy` 통해 각 LocalPlayer 의 `UPrimaryGameLayout` 을 관리한다 — Lyra 는 이 상위 메커니즘을 그대로 사용.

## Blueprint ↔ C++ 대응표

| Blueprint / Asset | C++ 연결부 | 의미 |
|-------------------|------------|------|
| `W_DefaultHUDLayout` 등 layout BP | `ULyraHUDLayout` | escape 메뉴·controller disconnect 처리 |
| `W_LyraGameMenu` 등 popup BP | `ULyraActivatableWidget` 또는 `UCommonActivatableWidget` | input mode 자동 적용 |
| `W_QuickBar`·`W_Reticle` 등 슬롯 widget BP | `UCommonUserWidget` (또는 `ULyraTaggedWidget`) | extension subsystem 에 등록되어 slot 에 표시 |
| `LAS_ShooterGame_StandardHUD` Experience action set | `UGameFeatureAction_AddWidgets` | 어떤 layout 을 어느 layer 에, 어떤 widget 을 어느 slot 에 등록할지 데이터로 정의 |
| `UI.Layer.*` 게임플레이 태그 | `FLyraHUDLayoutRequest::LayerID` | layout push 대상 |
| `HUD.Slot.*` 게임플레이 태그 | `FLyraHUDElementEntry::SlotID` + extension point 의 tag | widget 매칭 키 |
| `ALyraHUD` | `AHUD` 의 라이라 래퍼 | GameFeatureAction 의 anchor 액터 |

## 디버깅 체크리스트

UI 가 예상대로 안 보일 때:

1. 현재 Experience 가 의도한 ActionSet 을 포함하는지 확인 (`B_LyraDefaultExperience` 등).
2. ActionSet 의 `Actions` 배열에 `GameFeatureAction_AddWidgets` 가 있는지, 그 안 `Layout`/`Widgets` 가 비어 있지 않은지.
3. `Widgets[].SlotID` 가 layout 안 extension point 의 tag 와 일치하는지 — 한 글자라도 다르면 매칭 안 됨. `PartialMatch` 모드라면 부모 태그도 OK.
4. 위젯이 layer 에 push 됐지만 안 보인다면 `ULyraUIManagerSubsystem` 이 `bShowHUD=false` 로 collapsed 시켰는지 확인 (`showhud` 콘솔로 토글).
5. escape 메뉴가 안 뜨면 `W_DefaultHUDLayout` 의 `EscapeMenuClass` CDO 가 null 인지 확인 (`ensure(!EscapeMenuClass.IsNull())` 가 가드).
6. controller disconnect 메뉴 안 뜨면 platform tag 확인 (`Platform.Trait.Input.PrimarlyController` 가 platform traits 에 있어야 함). PC 에서는 기본적으로 안 뜬다.
7. `ULyraTaggedWidget` 의 `HiddenByTags` 가 동작 안 한다고 보고된다면 **정상** — 미구현 상태이므로 다른 게이팅 메커니즘을 써야 한다.

## 확장 시 권장 방식

새 HUD 위젯을 추가하려면:

1. widget BP 작성 (`UCommonUserWidget` 또는 적절한 베이스 상속).
2. layout 안 적당한 extension point 의 slot tag 확인 (또는 새 slot tag 정의 + layout BP 에 extension point widget 추가).
3. 이 위젯을 노출하고 싶은 Experience 의 ActionSet 의 `GameFeatureAction_AddWidgets.Widgets[]` 에 `WidgetClass + SlotID` 항목 추가.
4. 다른 Experience 에는 영향 없음 — Experience 별로 다른 widget 세트가 가능.

새 layout / layer 를 추가하려면:

1. `Config/DefaultGameplayTags.ini` 에 새 `UI.Layer.*` 태그 정의.
2. `ULyraHUDLayout` 파생 widget BP 작성 (필요하면 새 C++ 클래스).
3. `Layout[]` 에 `(LayoutClass, LayerID)` 항목 추가.
4. `UGameUIPolicy` 에 layer ID 가 등록되어 있어야 push 가 동작 — CommonGame 플러그인 측 설정.
