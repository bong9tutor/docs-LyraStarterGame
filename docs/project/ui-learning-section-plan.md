# Lyra CommonUI 학습 문서 섹션 설계

확인일: 2026-05-24 
목적: 라이라 CommonUI 분석·학습 문서를 기능별로 어떻게 나눌지 결정하기 위한 정보 구조 설계

이 문서는 검증 원장 [`ui-code-analysis.md`](ui-code-analysis.md), [`ui-blueprint-analysis.md`](ui-blueprint-analysis.md) 와 Epic 공식 CommonUI / Lyra UI 문서 ("공식 온라인 대조 출처" 절 참조) 를 바탕으로, 후속 학습 문서를 어떤 기능 단위로 쪼개야 읽기 쉽고 확장하기 쉬운지 정리한다. 작성 패턴은 [`animation-learning-section-plan.md`](animation-learning-section-plan.md) 와 동일하다.

## 결론

라이라 CommonUI 학습 문서는 위젯 자산 / 폴더 구조 기준이 아니라 **"Experience 가 활성화되어 layer 와 slot 에 위젯이 들어가고, 입력·활성화·스타일이 작동하기까지의 데이터 흐름"** 기준으로 나누는 것이 가장 좋다.

핵심은 다음 다섯 시스템의 책임 분리를 학습 동선의 골격으로 두는 것이다.

- **CommonUI 자체** (Epic 플러그인) - 입력 라우팅 + 활성화 widget + 스타일 + 입력 액션 매핑.
- **CommonGame 의 GameUI Manager** - `UGameUIPolicy` 가 `UPrimaryGameLayout` 의 `UI.Layer.*` 4개를 관리.
- **UIExtension 플러그인** - `HUD.Slot.*` 태그 ↔ `Activatable Widget` 매핑.
- **Lyra 의 GameFeatureAction_AddWidgets** - Experience 가 활성화될 때 위 둘에 위젯을 데이터로 주입.
- **GameSettings 플러그인** - 설정 화면. 라이라 코어 UI 와는 분리된 사실상의 위성 시스템.

추천 상위 섹션은 다음 **8개** 다.

0. 전체 지도와 학습 경로
1. CommonUI 의 입력 라우팅과 활성화 모델
2. HUD 액터와 게임 UI 매니저 (`ALyraHUD` + `UGameUIPolicy` + `ULyraUIManagerSubsystem`)
3. `ULyraHUDLayout` - layer 안 활성화 widget 의 책임
4. `GameFeatureAction_AddWidgets` + `UUIExtensionSubsystem` 의 위젯 주입
5. `ULyraTaggedWidget` 과 가시성 게이팅 (미구현 사실 포함)
6. Common Style 과 라이라 위젯 라이브러리
7. 설정 화면과 `GameSettings` 플러그인
8. (선택) 프론트엔드와 Common User 플러그인

핵심은 "위젯 자산 자체 (W_QuickBar·W_Reticle 등) 를 섹션으로 만들지 않는 것" 이다. 이들은 시스템이 아니라 같은 주입 메커니즘의 변형이고, 학습 효율 측면에서는 메커니즘 → 변형 순서가 맞다. 마찬가지로 "Manny/Quinn 같은 외형 변형 = 시스템 변형 (cosmetic tag) " 가 아니듯, "QuickBar = 시스템 변형 (HUD.Slot.Equipment 위에 얹힌 데이터)" 다.

## 조사 근거

### 기존 분석 문서 구조

현재 검증 원장은 두 가지로 나뉘어 있다.

| 문서 | 강점 | 학습 목차로 부족한 점 |
|------|------|------------------------|
| [`ui-code-analysis.md`](ui-code-analysis.md) | 핵심 5종 C++ + UIExtension public API + UIManagerSubsystem 의 책임·런타임 흐름·디버깅 체크리스트 | 코드 책임 중심이라 "어떤 학습 순서로 읽어야 흐름이 잡히는가" 가 분리되어야 한다 |
| [`ui-blueprint-analysis.md`](ui-blueprint-analysis.md) | 4개 HUD layout BP, 4 + 15개 UI.Layer/HUD.Slot 태그, `LAS_ShooterGame_StandardHUD` CDO (Layout 1 + Widgets 11) 의 구체 검증 | 자산 사전 성격이라 입문자 학습 동선이 약하다 |

따라서 후속 학습 문서는 두 원장을 대체하지 않고, 두 원장의 사실을 데이터 흐름 순서로 재배열하는 안내서로 작성한다.

### 핵심 5종 C++ 의 책임 분포

코드는 pose 처럼 화면을 직접 그리지 않는다. CommonUI / UIExtension / GameUI Manager 가 화면을 그리는 인프라이고, Lyra C++ 는 그 인프라에 라이라 정책 (input mode 4종, escape 액션, 컨트롤러 분리 감지, 위젯 주입 액션, HUD 토글 동기화) 을 얇게 얹는 조율 계층이다.

| 코드 영역 | 대표 파일 | 학습 섹션 |
|-----------|-----------|-----------|
| Activatable widget 입력 정책 | [`../Source/LyraGame/UI/LyraActivatableWidget.h`](../Source/LyraGame/UI/LyraActivatableWidget.h) | 섹션 1 입력·활성화 |
| HUD 액터 | [`../Source/LyraGame/UI/LyraHUD.h`](../Source/LyraGame/UI/LyraHUD.h) | 섹션 2 HUD 액터·UI 매니저 |
| GameUI Manager 라이라 측 | [`../Source/LyraGame/UI/Subsystem/LyraUIManagerSubsystem.h`](../Source/LyraGame/UI/Subsystem/LyraUIManagerSubsystem.h) | 섹션 2 |
| HUD layout | [`../Source/LyraGame/UI/LyraHUDLayout.h`](../Source/LyraGame/UI/LyraHUDLayout.h) | 섹션 3 HUD layout |
| 위젯 주입 액션 | [`../Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.h`](../Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.h) | 섹션 4 주입 |
| Tag 가시성 widget | [`../Source/LyraGame/UI/LyraTaggedWidget.h`](../Source/LyraGame/UI/LyraTaggedWidget.h) | 섹션 5 tagged widget |
| 설정 화면 | [`../Source/LyraGame/UI/LyraSettingScreen.h`](../Source/LyraGame/UI/LyraSettingScreen.h) | 섹션 7 settings |
| 프론트엔드 | [`../Source/LyraGame/UI/Frontend/LyraFrontendStateComponent.h`](../Source/LyraGame/UI/Frontend/LyraFrontendStateComponent.h) | 섹션 8 frontend |

### 플러그인 의존성

`LyraStarterGame.uproject` 와 `UIExtension.uplugin` 기준 활성 UI 플러그인은 다음과 같다.

| 플러그인 | 역할 | 학습 섹션 |
|----------|------|-----------|
| `CommonUI` | 입력 라우팅, activatable widget, style, input action | 섹션 1, 섹션 6 |
| `CommonGame` | GameUI Manager, PrimaryGameLayout, layer 관리 | 섹션 2 |
| `CommonUser` | 로그인/세션 (Online Subsystem 추상화) | 섹션 8 |
| `CommonLoadingScreen` | 로딩 화면 (라이라 사용) | 섹션 8 |
| `UIExtension` (Epic, 라이라에 포함) | tag 기반 extension point ↔ extension 매칭. 라이라에서는 `UUIExtensionSubsystem` 과 `UUIExtensionPointWidget` 을 통해 HUD slot 주입에 사용. 표면은 작으나 라이라 UI 모듈성의 핵심. 공식 Epic 문서가 빈약해 [`ui-references.md`](ui-references.md) 의 X157 노트와 로컬 헤더 (`UIExtensionSystem.h`·`UIExtensionPointWidget.h`) 가 1차 자료 | 섹션 4 |
| `GameSettings` | 설정 데이터 모델 + 패널 widget | 섹션 7 |

> 정확한 plugin 활성 여부와 의존성은 `.uproject` 와 각 `.uplugin` 의 `Plugins` 필드를 검증 원장에서 확인한다.

## 섹션 분류 원칙

### 1. 위젯 자산보다 데이터 흐름을 우선한다

라이라 UI 의 한 위젯 (예: `W_QuickBar`) 이 화면에 뜨려면 다음을 모두 거친다.

- Experience (`ULyraExperienceDefinition`) 가 선택됨
- 그 안 ActionSet (`ULyraExperienceActionSet`) 의 `Actions[]` 에 `UGameFeatureAction_AddWidgets`
- `GameFeaturesToEnable[]` 의 게임 기능 (`ShooterCore` 등) 활성화
- `AddToWorld` 가 `UGameFrameworkComponentManager` 로 `ALyraHUD` 등장 구독
- `ALyraHUD::BeginPlay` 의 `NAME_GameActorReady`
- `AddWidgets` 가 `UUIExtensionSubsystem::RegisterExtensionAsWidgetForContext(HUD.Slot.Equipment, LocalPlayer, W_QuickBar, -1)`
- 같은 layer 안 `UIExtensionPointWidget` 이 `HUD.Slot.Equipment` 를 구독하고 매칭된 widget 을 표시

자산 기준 (예: "QuickBar 위젯 분석") 으로 섹션을 만들면 위 흐름이 매번 반복된다. 메커니즘 기준으로 먼저 묶으면 자산은 흐름의 변형으로 표현된다.

### 2. layer 와 slot 의 책임을 분리한다

라이라에서 **layer (`UI.Layer.*`) 와 slot (`HUD.Slot.*`) 은 다른 시스템** 이다.

| 관심사 | 담당 시스템 |
|--------|-------------|
| layer 4종 의 정의·등록 | `UGameUIPolicy` (CommonGame), `UPrimaryGameLayout` |
| layer 안 어느 위치에 widget 이 있는가 | layout BP 의 designer tree |
| slot 1개당 widget 0..N 매칭 | `UUIExtensionSubsystem` (UIExtension 플러그인) |
| GameFeatureAction 이 누르는 버튼 | `UCommonUIExtensions::PushContentToLayer_ForPlayer` (layer) + `UUIExtensionSubsystem::RegisterExtensionAsWidgetForContext` (slot) |

학습자가 layer push 와 slot register 를 같은 단계로 오해하면 "왜 `UI.Layer.Game` 안에 slot 이 있는데 다른 subsystem 이 매칭하는가" 가 안 잡힌다. 섹션 2 (layer) 와 섹션 4 (slot) 를 다른 섹션으로 둔다.

### 3. CommonUI 자체 학습은 분리한다

CommonUI 는 그 자체로 큰 플러그인이다 (입력 라우팅, activatable widget, style, input action, 카드룰 내비게이션). 라이라 측 코드는 그 위에 얇게 얹힌 정책일 뿐이다. 따라서 학습 문서는 **CommonUI 일반 개념 → 라이라 측 적용** 순서로 가야 한다.

- 섹션 1 (입력·활성화) 의 절반은 CommonUI 일반, 절반은 라이라 측 `ELyraWidgetInputMode` 4종 적용
- 섹션 6 (스타일·위젯) 도 CommonUI Quickstart 의 5단계 + 라이라가 그 위에 만든 위젯 라이브러리

### 4. 미구현 / 미사용 사실은 그대로 적는다

`ULyraTaggedWidget::HiddenByTags` 는 코드에 인터페이스만 있고 실제 listening 은 `//@TODO` (`UE-142237`). 본 문서는 추정 동작을 사실로 적지 않는다. 섹션 5 의 핵심 메시지는 "이 기능은 미구현이므로 의존하지 말 것" 이고, 대안 (`UCommonUIVisibilitySubsystem`) 을 함께 제시한다.

### 5. 설정·프론트엔드는 위성 시스템으로 분리한다

`GameSettings` 플러그인의 설정 모델 (`UGameSetting`/`UGameSettingRegistry`/`UGameSettingValue`/...) 과 라이라의 `ULyraSettingScreen` 은 코어 HUD 흐름과 분리된 별도 학습 주제다. 마찬가지로 `LyraFrontendStateComponent` + Common User (`UCommonUserSubsystem`/`UCommonSessionSubsystem`) 도 별도. 코어 (섹션 0~섹션 5) 학습 후 섹션 7, 섹션 8 로 두는 편이 학습 부담이 적다.

## 권장 문서 구조

### 0. 전체 지도와 학습 경로

역할: 처음 읽는 사람이 라이라 UI 의 큰 구조를 10분 안에 잡는 섹션.

다룰 내용:

- 다섯 시스템의 역할 분담 (CommonUI / CommonGame / UIExtension / Lyra 액션 / GameSettings).
- "Experience → ActionSet → AddWidgets → ALyraHUD → layer push / slot register → 화면" 흐름도.
- 위젯 자산은 시스템이 아니라 메커니즘의 변형이라는 점.
- 플러그인 의존성 표 (활성/미활성).

작성 우선순위: 최상

### 1. CommonUI 의 입력 라우팅과 활성화 모델

역할: 라이라 측 코드를 보기 전 CommonUI 자체의 입력·활성화 모델을 잡는 섹션. 입력이 어떤 widget 에 도달하고, activatable widget 이 어떻게 켜졌다 꺼지는지.

핵심 질문:

- `CommonGameViewportClient` 가 왜 viewport client 를 교체하는가?
- `CommonUIActionRouterBase` 가 input 을 어떻게 widget node 트리에 라우팅하는가?
- `UCommonActivatableWidget` 의 activate/deactivate 가 무엇을 토글하는가? 왜 widget 을 destroy 하지 않는가?
- back action (`OnHandleBackAction`) 은 어떻게 routing 되는가?
- 라이라 측 `ELyraWidgetInputMode` 4종 (`Default`/`GameAndMenu`/`Game`/`Menu`) 이 `FUIInputConfig(ECommonInputMode::*, GameMouseCaptureMode)` 로 어떻게 매핑되는가?

주요 대상:

- CommonUI: `UCommonActivatableWidget`, `UCommonActivatableWidgetStack`, `UCommonActivatableWidgetSwitcher`
- 라이라: `ULyraActivatableWidget`, `ELyraWidgetInputMode`
- `BP_GetDesiredFocusTarget` 미구현 시 컴파일 경고 - 게임패드 UX 의 핵심

검증 포인트:

- 라이라 widget 의 CDO 에서 `InputConfig` 값이 의도와 맞는지 (`W_DefaultHUDLayout = GameAndMenu` 검증됨).
- `BP_GetDesiredFocusTarget` 구현 여부 - 미구현 시 게임패드 포커스 못 잡음.

작성 우선순위: 최상

### 2. HUD 액터와 게임 UI 매니저

역할: 위젯이 들어갈 컨테이너 (`UPrimaryGameLayout` + `UI.Layer.*` 4종) 와 HUD 액터의 역할을 잡는 섹션.

핵심 질문:

- `AHUD` 의 라이라 래퍼 `ALyraHUD` 는 무엇을 추가하는가? 왜 거의 비어 있는가?
- `UGameUIManagerSubsystem` (CommonGame) 과 `ULyraUIManagerSubsystem` 의 역할 분담은?
- `UGameUIPolicy` 가 layer 4종 (`UI.Layer.Game/GameMenu/Menu/Modal`) 을 어떻게 관리하는가?
- `bShowHUD = false` 가 root layout 가시성을 어떻게 토글하는가?

주요 대상:

- `ALyraHUD` (`GameFrameworkComponentReceiver` 등록, `NAME_GameActorReady` 발송)
- `UGameUIManagerSubsystem` / `UGameUIPolicy` / `UPrimaryGameLayout` (CommonGame)
- `ULyraUIManagerSubsystem::SyncRootLayoutVisibilityToShowHUD`
- `UI.Layer.Game`, `UI.Layer.GameMenu`, `UI.Layer.Menu`, `UI.Layer.Modal` 4종 태그

검증 포인트:

- 콘솔 `showhud` 입력 시 root layout 이 `Collapsed` 로 가는지 (`ULyraUIManagerSubsystem` 의 매 tick 동기화 확인).
- `UGameUIPolicy` CDO 에 4개 layer 가 모두 등록돼 있는지 - 본 원장 범위 밖, 별도 확인 필요.

작성 우선순위: 최상

### 3. `ULyraHUDLayout` - layer 안 활성화 widget

역할: layer 에 push 되는 단위 widget 의 책임을 잡는 섹션. escape 메뉴와 컨트롤러 분리 화면 두 가지 정책이 여기 모인다.

핵심 질문:

- `ULyraHUDLayout::NativeOnInitialized` 가 어떤 액션을 바인딩하는가?
- escape 입력 (`UI.Action.Escape`) 이 `UI.Layer.Menu` 로 어떤 widget 을 push 하는가?
- 컨트롤러 분리 감지가 작동하는 플랫폼 조건은? (`Platform.Trait.Input.PrimarlyController`)
- `W_DefaultHUDLayout` 의 CDO 가 보여주는 값은? (`EscapeMenuClass = W_LyraGameMenu`, `ControllerDisconnectedScreen = W_ControllerDisconnected`)

주요 대상:

- `ULyraHUDLayout` (`HandleEscapeAction`, `HandleInputDeviceConnectionChanged/PairingChanged`, `ProcessControllerDevicesHavingChangedForDisconnectScreen`)
- `UCommonUIExtensions::PushStreamedContentToLayer_ForPlayer` / `PushContentToLayer_ForPlayer`
- `IPlatformInputDeviceMapper` (input device 연결/페어링 delegate)
- 4개 layout BP (`W_DefaultHUDLayout`, `W_FrontEndHUDLayout`, `W_ShooterHUDLayout`, `W_TopDownArenaHUDLayout`)
- `ULyraControllerDisconnectedScreen`

검증 포인트:

- `W_DefaultHUDLayout` CDO 값 (검증 원장에 기록).
- PC 에서 컨트롤러 분리 감지가 작동 안 함이 정상 (`Platform.Trait.Input.PrimarlyController` 없음).

작성 우선순위: 최상

### 4. `GameFeatureAction_AddWidgets` + `UUIExtensionSubsystem` 의 위젯 주입

역할: 라이라 UI 의 모듈형 동작의 핵심 메커니즘. "어떤 데이터가 어디에 들어가서 무엇이 화면에 뜨는가" 를 설명.

핵심 질문:

- `UGameFeatureAction_AddWidgets` 의 `Layout[]` 과 `Widgets[]` 는 각각 무엇이 다른가?
- `FLyraHUDLayoutRequest` 와 `FLyraHUDElementEntry` 의 구조는?
- layer push 는 `UCommonUIExtensions::PushContentToLayer_ForPlayer`, widget register 는 `UUIExtensionSubsystem::RegisterExtensionAsWidgetForContext` - 두 호출의 차이는?
- `UIExtensionPointWidget` (또는 동등한 BP 위젯) 이 layout 안에서 어떻게 slot 을 구독하는가?
- `EUIExtensionPointMatch` (ExactMatch vs PartialMatch) 와 `AllowedDataClasses` contract 가 어떻게 매칭을 통제하는가?
- 한 slot 에 widget 2개가 등록되면 어떻게 표시되는가? (예: `HUD.Slot.RightSideTouchInputs` 에 `W_OnScreenJoystick_Right` + `W_FireButton`)

주요 대상:

- `UGameFeatureAction_AddWidgets` (`AddToWorld`, `HandleActorExtension`, `AddWidgets`, `RemoveWidgets`)
- `UUIExtensionSubsystem` (`RegisterExtensionAsWidgetForContext`, `RegisterExtensionPointForContext`, `FUIExtensionPoint::DoesExtensionPassContract`)
- `UGameFrameworkComponentManager` (확장 핸들러, `NAME_GameActorReady` 이벤트)
- 4 + 15개 `UI.Layer.*` / `HUD.Slot.*` 태그 표
- `LAS_ShooterGame_StandardHUD` 검증 사례 (Layout 1 + Widgets 11)

검증 포인트:

- `LAS_ShooterGame_StandardHUD` CDO 의 Layout/Widgets 값과 본 섹션 표 대조.
- 같은 slot 에 2개 widget 등록되는 경우의 priority 처리 (`-1` 동등 시 등록 순서?).

작성 우선순위: 최상

### 5. `ULyraTaggedWidget` 과 가시성 게이팅

역할: tag 기반 가시성 게이팅의 의도와 **현재 미구현 상태** 를 명확히 알리는 섹션.

핵심 질문:

- `ULyraTaggedWidget::HiddenByTags` 가 의도하는 동작은?
- 왜 현재 시점 (UE 5.7) 에서 동작하지 않는가? (`UE-142237`, `bHasHiddenTags = false` 하드코딩)
- 대안: `UCommonUIVisibilitySubsystem` (platform trait 기반 가시성) 의 사용처는?
- 가시성 게이팅이 필요한 경우 권장 방식은?

주요 대상:

- `ULyraTaggedWidget` (`SetVisibility`, `OnWatchedTagsChanged`, `NativeConstruct`/`NativeDestruct` 의 `@TODO`)
- `UCommonUIVisibilitySubsystem` (platform trait container)
- 대안 패턴: viewmodel binding, widget BP custom binding, GAS event 기반

검증 포인트:

- 코드 주석의 `UE-142237` 이슈 번호 확인.
- 후속 엔진 버전에서 구현 여부 추적 (현재 5.7 기준 미구현).

작성 우선순위: 상

### 6. Common Style 과 라이라 위젯 라이브러리

역할: CommonUI 의 일반 위젯 라이브러리와 라이라가 그 위에 만든 라이브러리를 정리.

핵심 질문:

- CommonUI Quickstart 의 5단계 (viewport routing → input action data table → default nav → controller data → styles) 는 무엇인가?
- `CommonInputActionDataBase`, `CommonUIInputData`, `CommonInputBaseControllerData` 데이터 자산의 차이는?
- 라이라가 사용하는 CommonUI 파생 위젯은? (`LyraButtonBase`, `LyraActionWidget`, `LyraBoundActionButton`, `LyraTabButtonBase`, `LyraTabListWidgetBase`)
- Common Style 자산 (`CommonButtonStyle`, `CommonTextStyle`, `CommonBorderStyle`) 이 어떻게 일괄 테마를 만드는가?
- 라이라 측 입력 액션 (`UI.Action.Confirm/Cancel/NextTab/PreviousTab/Escape`) 의 매핑은?

주요 대상:

- Common UI Quickstart 5단계 (Epic 공식)
- `CommonButtonBase`, `CommonTextBlock`, `CommonBorder`, `CommonActivatableWidgetSwitcher/Stack`
- 라이라: `ULyraButtonBase`, `ULyraActionWidget`, `ULyraBoundActionButton`, `ULyraTabButtonBase`, `ULyraTabListWidgetBase`, `ULyraWidgetFactory`, `ULyraListView`
- 입력 액션 데이터 테이블 (Lyra 측 자산 - 별도 확인 필요)
- `UI.Action.*` 태그 6종 (Confirm, Cancel, NextTab, PreviousTab + escape, 그 외)

검증 포인트:

- 프로젝트 설정의 `Game Viewport Client Class = CommonGameViewportClient` 확인.
- `Project Settings → Common Input Settings` 의 `Input Data`, `Platform Input` 배열 확인.

작성 우선순위: 중

### 7. 라이라 설정 화면과 `GameSettings` 플러그인

역할: 설정 화면이 어떻게 만들어지는지, 라이라가 어떤 settings 를 노출하는지.

핵심 질문:

- `UGameSetting` / `UGameSettingRegistry` / `UGameSettingValue` / `UGameSettingCollection` 의 책임 분담은?
- value 타입 specialization (`UGameSettingValueScalarDynamic`, `UGameSettingValueDiscreteDynamic_Bool/Number/Enum`) 의 차이는?
- `UGameSettingPanel` / `UGameSettingListEntryBase` / `UGameSettingVisualData` 가 어떻게 데이터 ↔ UI 를 연결하는가?
- edit condition (`FWhenCondition`, `FWhenPlatformHasTrait`, `FWhenPlayingAsPrimaryPlayer`) 가 언제 사용되는가?
- `ULyraSettingScreen` 의 진입점은? Video / Audio / Gameplay / Control / Mouse&Keyboard / Gamepad 카테고리 구성?

주요 대상:

- `GameSettings` 플러그인 코어 클래스 (위 목록)
- 라이라: `ULyraSettingScreen`, `Source/LyraGame/Settings/` 의 settings registry 파생 클래스들 (별도 확인 필요)
- `ULyraSettingsLocal`, `ULyraSettingsShared` (라이라 측 설정 데이터)

검증 포인트:

- 설정 한 항목 (예: Master Volume) 의 정의가 registry / value / list entry 어디에 분포하는지 추적.
- platform trait 기반 edit condition 의 실제 사용 사례.

작성 우선순위: 중 (코어 HUD 분석 후 별도 학습)

### 8. (선택) 프론트엔드와 Common User 플러그인

역할: 메인 메뉴 진입·세션 생성/참가 흐름.

핵심 질문:

- `ULyraFrontendStateComponent` 가 어떤 상태 머신을 운영하는가?
- `W_LyraStartup` → `W_ExperienceSelectionScreen` → 매치 시작의 사용자 동선은?
- Common User: `UCommonUserSubsystem` (로그인·인증·권한) 과 `UCommonSessionSubsystem` (세션) 의 차이?
- `ULyraUserFacingExperienceDefinition` 이 어떻게 매치 옵션을 정의하고 세션 서브시스템에 전달하는가?
- `ULyraLoadingScreenSubsystem` 의 로딩 화면 표시 흐름은?

주요 대상:

- `ULyraFrontendStateComponent`, `ULyraLobbyBackground`, `ULyraLoadingScreenSubsystem`
- Common User: `UCommonUserSubsystem`, `UCommonSessionSubsystem`
- `UCommonGameInstance` (라이라가 상속)
- `ULyraUserFacingExperienceDefinition`
- `W_LyraStartup`, `W_ExperienceSelectionScreen`

작성 우선순위: 하 (코어 학습 완료 후 선택적)

## 세부 학습 항목 - 기능 키워드 검증 매핑

각 섹션이 다룰 **개별 기능 단위** 를 키워드로 조사해, Epic 공식 문서 (2026-05-24 열람) 와 코드 / Monolith 조회로 교차 검증했다. 후속 학습 문서는 아래 항목을 다루되 검증 등급을 유지해야 한다.

검증 범례: **검증 완료** 검증 원장 또는 C++ 직접 확인 · **◐** 공식 문서 + 라이라 간접 단서로 확인했으나 노드·CDO 단위는 에디터 확인 필요 · **△** 공식 UE 일반 개념 또는 학습 후보이며 라이라 로컬 사용 범위는 추가 확인 필요

### 공식 온라인 대조 출처

공식 Epic 문서·커뮤니티 자료의 정식 목록은 별도 문서 [`ui-references.md`](ui-references.md) 에 있다 - 카테고리별 분류 (공식 라이라 / CommonUI 시스템 / UI Extension / 학습 자료) + 문서 ↔ 라이라 프로젝트 매핑 표. 본 섹션 설계는 그 references 문서를 1차 참고로 둔다. HTML 페이지의 `chapter-brief` "보충 자료" 칸도 같은 references 문서의 URL 을 인용한다.

### 섹션 1 - CommonUI 입력 · 활성화

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Input Routing | `CommonGameViewportClient` (프로젝트 설정 적용) | ◐ Epic 문서; Lyra `DefaultEngine.ini` 확인 필요 |
| Action Router | `CommonUIActionRouterBase`, `UIActionRouterTypes` | △ 일반 개념 |
| Activatable widget lifecycle | `UCommonActivatableWidget::NativeOnActivated/Deactivated` | 검증 완료 Epic API + 라이라 상속 |
| Activatable input config | `ULyraActivatableWidget::GetDesiredInputConfig` 가 `ELyraWidgetInputMode` 4종 → `FUIInputConfig` 매핑 | 검증 완료 |
| Activatable widget stack/switcher | `UCommonActivatableWidgetStack`, `UCommonActivatableWidgetSwitcher` | ◐ Epic 문서; Lyra 위젯 사용 위치 별도 확인 |
| Back action | `IsBackHandler`, `OnHandleBackAction` | △ 일반 개념; 라이라 사용 위치 별도 확인 |
| Desired focus target | `BP_GetDesiredFocusTarget` 미구현 시 컴파일 경고 | 검증 완료 `ULyraActivatableWidget::ValidateCompiledWidgetTree` |
| Modal widget | `bIsModal` 속성 | 검증 완료 `W_DefaultHUDLayout` CDO 에서 `false` 확인 |

### 섹션 2 - HUD 액터 · UI 매니저

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `AHUD` 라이라 래퍼 | `ALyraHUD::PreInitializeComponents`/`BeginPlay`/`EndPlay` | 검증 완료 |
| GameFramework component receiver | `UGameFrameworkComponentManager::AddGameFrameworkComponentReceiver(this)` | 검증 완료 |
| `NAME_GameActorReady` 이벤트 | `BeginPlay` 발송 → `UGameFeatureAction_AddWidgets::HandleActorExtension` | 검증 완료 |
| Debug actor list | `ALyraHUD::GetDebugActorList` - 모든 ASC 의 avatar/owner | 검증 완료 |
| Game UI Manager | `UGameUIManagerSubsystem` (CommonGame) → `ULyraUIManagerSubsystem` | 검증 완료 |
| `UGameUIPolicy` / `UPrimaryGameLayout` | layer 등록 | ◐ CommonGame 플러그인 ; 라이라 정책 자산 별도 확인 |
| `bShowHUD` 동기화 | `ULyraUIManagerSubsystem::SyncRootLayoutVisibilityToShowHUD` | 검증 완료 |
| `UI.Layer.*` 4종 | `UI.Layer.Game/GameMenu/Menu/Modal` (`Config/DefaultGameplayTags.ini`) | 검증 완료 |

### 섹션 3 - `ULyraHUDLayout`

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Escape 액션 바인딩 | `RegisterUIActionBinding(UI.Action.Escape, HandleEscapeAction)` | 검증 완료 |
| Escape 메뉴 push | `UCommonUIExtensions::PushStreamedContentToLayer_ForPlayer(LocalPlayer, UI.Layer.Menu, EscapeMenuClass)` | 검증 완료 |
| `EscapeMenuClass` CDO | `W_DefaultHUDLayout` → `/Game/UI/Hud/W_LyraGameMenu` | 검증 완료 |
| Controller disconnect | `IPlatformInputDeviceMapper` connection/pairing delegate | 검증 완료 |
| Platform trait gating | `Platform.Trait.Input.PrimarlyController` 검사 | 검증 완료 |
| Disconnect 화면 push | `UCommonUIExtensions::PushContentToLayer_ForPlayer(UI.Layer.Menu, ControllerDisconnectedScreen)` | 검증 완료 |
| Disconnect 화면 CDO | `W_DefaultHUDLayout` → `/Game/UI/Foundation/Dialogs/W_ControllerDisconnected` | 검증 완료 |
| HUD layout BP 인벤토리 | `W_DefaultHUDLayout`, `W_FrontEndHUDLayout`, `W_ShooterHUDLayout`, `W_TopDownArenaHUDLayout` | 검증 완료 |
| `W_FrontEnd*`·`W_Shooter*`·`W_TopDown*` 의 parent · CDO | (미확인) | ◐ Monolith 추가 조회 필요 |

### 섹션 4 - 위젯 주입 (`GameFeatureAction_AddWidgets` + UIExtension)

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `UGameFeatureAction_AddWidgets` 데이터 구조 | `Layout[]: FLyraHUDLayoutRequest`, `Widgets[]: FLyraHUDElementEntry` | 검증 완료 |
| `AddToWorld` → extension handler | `UGameFrameworkComponentManager::AddExtensionHandler(ALyraHUD::StaticClass(), ...)` | 검증 완료 |
| Dispatcher | `HandleActorExtension` (Added/Removed) | 검증 완료 |
| Layout push | `UCommonUIExtensions::PushContentToLayer_ForPlayer(LocalPlayer, LayerID, LayoutClass)` | 검증 완료 |
| Widget register | `UUIExtensionSubsystem::RegisterExtensionAsWidgetForContext(SlotID, LocalPlayer, WidgetClass, -1)` | 검증 완료 |
| Per-context 데이터 분리 | `TMap<FGameFeatureStateChangeContext, FPerContextData>` (PIE 멀티 세션) | 검증 완료 |
| Data validation | `IsDataValid` - null LayoutClass/WidgetClass, 무효 LayerID/SlotID 모두 invalid | 검증 완료 |
| `UUIExtensionSubsystem` 매칭 | `RegisterExtensionPoint`, `RegisterExtensionAsWidget`, `FUIExtensionPoint::DoesExtensionPassContract` | 검증 완료 |
| `EUIExtensionPointMatch` | `ExactMatch` vs `PartialMatch` | 검증 완료 Epic UIExtension 헤더 |
| `AllowedDataClasses` contract | extension point 가 받는 data class isA 체크 | 검증 완료 |
| `HUD.Slot.*` 태그 15종 | Lyra core 7 + ShooterCore 8 | 검증 완료 |
| `LAS_ShooterGame_StandardHUD` CDO | Layout 1 (`W_ShooterHUDLayout → UI.Layer.Game`) + Widgets 11 | 검증 완료 |
| 같은 slot 에 widget 2개 | `HUD.Slot.RightSideTouchInputs` 에 joystick + fire button | 검증 완료 |
| 다른 Experience 의 ActionSet | `B_LyraShooterGame_ControlPoints`, `B_ShooterGame_Elimination`, `B_ShooterGame_Perf` | ◐ 파일 존재만 확인; CDO 별도 조회 필요 |
| `UIExtensionPointWidget` (layout 안 slot 구독 widget) | 위치 · 계층 | ◐ 에디터 확인 필요 |

### 섹션 5 - `ULyraTaggedWidget`

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `HiddenByTags` 인터페이스 | `FGameplayTagContainer HiddenByTags` 속성 | 검증 완료 |
| Shown/Hidden visibility | `ShownVisibility`, `HiddenVisibility` 기본값 (Visible/Collapsed) | 검증 완료 |
| `bWantsToBeVisible` 의도 보존 | 외부 `SetVisibility` 호출의 의도 기억 | 검증 완료 |
| 태그 listening 미구현 | `bHasHiddenTags = false` 하드코딩 + `//@TODO`, `UE-142237` 이슈 | 검증 완료 (코드에 명시) |
| 대안 - `UCommonUIVisibilitySubsystem` | platform trait 기반 widget 가시성. 라이라 사용 위치 확인됨: `Source/LyraGame/UI/LyraHUDLayout.cpp`, `Source/LyraGame/UI/Foundation/LyraControllerDisconnectedScreen.cpp`, `Source/LyraGame/Settings/CustomSettings/LyraSettingValueDiscrete_PerfStat.cpp`, `Source/LyraGame/Development/LyraPlatformEmulationSettings.cpp` | 검증 완료 사용처 직접 확인 (단, `ULyraTaggedWidget::HiddenByTags` 자체는 여전히 미구현 - `UE-142237` TODO 유지) |

### 섹션 6 - Common Style · 위젯 라이브러리

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| Viewport 입력 라우팅 | `Config/DefaultEngine.ini` 의 `GameViewportClientClassName=/Script/LyraGame.LyraGameViewportClient` + `ULyraGameViewportClient : UCommonGameViewportClient` 상속 (`Source/LyraGame/UI/LyraGameViewportClient.h`) | 검증 완료 두 파일 직접 확인 |
| Input Action Data Table | `CommonInputActionDataBase` row | ◐ Epic Quickstart; Lyra 측 자산 별도 확인 |
| Default 내비게이션 | `CommonUIInputData` (Click/Back) | ◐ |
| Controller data | `CommonInputBaseControllerData` per-platform | ◐ |
| Style 자산 | `CommonButtonStyle`, `CommonTextStyle`, `CommonBorderStyle` | △ Epic API; Lyra 사용 자산 별도 확인 |
| `LyraButtonBase` | `Source/LyraGame/UI/Foundation/LyraButtonBase.h` | 검증 완료 파일 존재 |
| `LyraActionWidget` | `Source/LyraGame/UI/Foundation/LyraActionWidget.h` | 검증 완료 파일 존재 |
| `LyraBoundActionButton` | `Source/LyraGame/UI/Common/LyraBoundActionButton.h` | 검증 완료 |
| `LyraTabButtonBase` / `LyraTabListWidgetBase` | `Source/LyraGame/UI/Common/` | 검증 완료 |
| `LyraWidgetFactory` | `Source/LyraGame/UI/Common/LyraWidgetFactory.h` | 검증 완료 |
| `LyraListView` | `Source/LyraGame/UI/Common/LyraListView.h` | 검증 완료 |
| `UI.Action.*` 태그 (혼합 출처) | `UI.Action.Back` (ini 정의), `UI.Action.Escape` (`Config/DefaultInput.ini` 의 `InputActions`), `UI.Action.Cancel/Confirm/NextTab/PreviousTab` (Monolith tag 인덱스 확인) | ◐ Monolith 인덱스에 6종 모두 존재; `Cancel/Confirm/NextTab/PreviousTab` 의 정의 위치 (CommonInput data table 또는 widget CDO) 는 Monolith 추가 조회 필요 |

### 섹션 7 - 설정 화면 · GameSettings 플러그인

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `UGameSettingRegistry` | 한 설정 그룹의 컨테이너 | ◐ Epic 문서; Lyra registry 클래스 별도 확인 |
| `UGameSetting` / `UGameSettingValue` / `UGameSettingCollection` | 코어 클래스 | ◐ Epic 문서 |
| Value 종류 | `ValueScalarDynamic`, `ValueDiscreteDynamic_Bool/Number/Enum` | ◐ |
| `UGameSettingPanel` / `UGameSettingListEntryBase` / `UGameSettingVisualData` | UI 연결 | ◐ |
| Edit conditions | `FWhenCondition`, `FWhenPlatformHasTrait`, `FWhenPlayingAsPrimaryPlayer` | ◐ |
| `ULyraSettingScreen` | `Source/LyraGame/UI/LyraSettingScreen.h` | 검증 완료 파일 존재 |
| Lyra settings 데이터 | `ULyraSettingsLocal`, `ULyraSettingsShared` | ◐ 파일 존재 가정; 별도 확인 |
| Frontend perf settings 적용 | `Source/LyraGame/UI/Frontend/ApplyFrontendPerfSettingsAction.h` | 검증 완료 |

### 섹션 8 - 프론트엔드 · Common User

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `LyraFrontendStateComponent` | `Source/LyraGame/UI/Frontend/LyraFrontendStateComponent.h` | 검증 완료 |
| `LyraLobbyBackground` | `Source/LyraGame/UI/Frontend/LyraLobbyBackground.h` | 검증 완료 |
| `LyraLoadingScreenSubsystem` | `Source/LyraGame/UI/Foundation/LyraLoadingScreenSubsystem.h` | 검증 완료 |
| `UCommonUserSubsystem` | 로그인·인증·권한 | ◐ Epic Common User 문서 |
| `UCommonSessionSubsystem` | 세션 (호스팅 / P2P / EOS) | ◐ |
| `CommonGameInstance` | Lyra `UGameInstance` 가 상속 | ◐ 확인 필요 |
| `ULyraUserFacingExperienceDefinition` | 매치 옵션 정의 → 세션 서브시스템 | 검증 완료 Epic 문서 + Lyra 헤더 존재 |
| `W_LyraStartup` / `W_ExperienceSelectionScreen` | 로그인·매치 선택 widget | ◐ Epic Common User 문서 |

### 키워드 검토 결과

- 위 키워드 목록은 학습 항목으로 적절. 모두 동일한 수준의 로컬 사실로 적으면 안 됨 - `✅` 만 본문에 확정적으로 반영, `◐`/`△` 는 "공식 개념", "에디터/Monolith 추가 조회 과제", "추가 검증 필요" 로 구분한다.
- 현재 목록에서 명백히 라이라와 무관한 키워드는 발견 안 됨.
- 섹션 4 (위젯 주입) 와 섹션 6 (스타일·위젯) 에 키워드가 가장 몰린다. 섹션 4 는 라이라 UI 모듈성의 핵심이라 그대로 두고, 섹션 6 는 분량이 크면 (`common-styles-and-input.html` + `lyra-widget-library.html`) 두 페이지로 분할 가능.
- 섹션 5 (TaggedWidget) 키워드가 적어 보이지만 "**미구현 인터페이스를 명확히 알리는 것**" 이 학습 목적이므로 별도 섹션 유지.
- 섹션 8 (Frontend/Common User) 는 일부 검증 항목이 ◐ 가 많다. 코어 학습 완료 후 별도 분석 사이클이 필요.

## HTML 산출물 대응표

위 8개 학습 섹션을 실제 `html/pages/lyra-ui-*.html` 페이지로 어떻게 매핑할지의 권장안. 사양 ([`dynamic-html-spec.md`](../common/dynamic-html-spec.md)) 의 "확장 절차 B" 와 "다중 시스템 구조" 를 따라야 한다 - 파일명 접두어 `lyra-ui-`, 시스템 내 번호 (글로벌 번호 X).

| 페이지 번호 | HTML 파일 | 포함 섹션 | 목차명 | 권장 학습 블록 |
|-------------|-----------|-----------|--------|----------------|
| 1 | `lyra-ui-overview.html` | 섹션 0 | 학습 목차 | structure (5개 시스템 책임 지도) + flow (Experience → 화면) + reference (학습 경로) |
| 2 | `lyra-ui-input-activation.html` | 섹션 1 | 학습 목차 | structure (CommonUI 입력 라우팅) + decision (`ELyraWidgetInputMode` 매핑) + reference (activatable API) + verification (focus / input config 확인) |
| 3 | `lyra-ui-hud-manager.html` | 섹션 2 | 학습 목차 | structure (HUD / UI Manager / Policy) + flow (`showhud` 동기화) + reference (`UI.Layer.*` 4종) |
| 4 | `lyra-ui-hud-layout.html` | 섹션 3 | 학습 목차 | flow (Escape 메뉴 push) + flow (Controller disconnect) + reference (`W_DefaultHUDLayout` CDO) |
| 5 | `lyra-ui-widget-injection.html` | 섹션 4 | 학습 목차 | flow (AddWidgets 런타임) + structure (UIExtension pub/sub) + comparison (layer push vs slot register) + reference (`LAS_ShooterGame_StandardHUD`) |
| 6 | `lyra-ui-tagged-widget-visibility.html` | 섹션 5 | 학습 목차 | structure (`ULyraTaggedWidget`) + verification (미구현 항목) + decision (가시성 대안 선택) + `note-warning` |
| 7 | `lyra-ui-styles-widgets.html` | 섹션 6 | 항목 목차 또는 학습 목차 | reference (라이라 위젯 라이브러리) + structure (Common Style 자산) + recipe (새 버튼·탭 작성) |
| - (보류) | `lyra-ui-settings.html` (분리 예정) | 섹션 7 | 학습 목차 | structure (`UGameSetting` 모델) + reference (settings registry) + recipe (새 설정 추가) | **HTML 생성 보류** - 현재 원장 범위가 `Source/LyraGame/UI/` 중심이라 `Source/LyraGame/Settings/` 원장 보강 (`LyraGameSettingRegistry`·`LyraSettingsLocal`·`LyraSettingsShared`·6 종 카테고리 `_Audio/Gamepad/Gameplay/MouseAndKeyboard/PerfStats/Video.cpp`) 후 별도 페이지로 작성 |
| - (보류) | `lyra-ui-frontend-common-user.html` (분리 예정) | 섹션 8 | 학습 목차 | structure (`LyraFrontendStateComponent` + Common User) + flow (로그인 → 매치 선택 → 세션) + reference (`W_LyraStartup`·`W_ExperienceSelectionScreen`) | **HTML 생성 보류** - Common User 의 `UCommonUserSubsystem`·`UCommonSessionSubsystem` 인스턴스화 위치와 `W_*` widget CDO 가 원장 미보강. Settings 와 성격이 다르므로 분리

원칙:
- 페이지 1~7 은 우선순위 "최상~중" 의 코어 학습. 페이지 8 은 위성 시스템이라 선택.
- 섹션 6 가 분량이 크면 페이지 7 을 `lyra-ui-common-styles.html` + `lyra-ui-widget-library.html` 두 페이지로 분할 가능 (위 표는 1페이지 안).
- 각 페이지 카드의 `<h3>` 첫 번째 단어는 시스템 내 페이지 번호 - 마침표 + 공백 (`1. ...`). 사양의 "번호 ↔ 제목 구분자" 절 준수.

## 검증 등급 유지 항목

HTML 페이지가 마크다운 원장보다 높은 등급으로 사실을 표시하지 않도록, 각 페이지마다 **partial / unverified 로 유지해야 할 항목** 을 미리 정한다. 사양의 "검증 등급 처리 규칙" 을 따른다.

| HTML 페이지 | partial / unverified 유지 항목 |
|-------------|-------------------------------|
| `lyra-ui-input-activation.html` | `CommonUIActionRouterBase` 의 라이라 사용 위치, back action 의 실제 routing, `UCommonActivatableWidgetStack` / `Switcher` 사용 사례는 ◐ |
| `lyra-ui-hud-manager.html` | `UGameUIPolicy` / `UPrimaryGameLayout` CDO 의 layer 4종 등록 여부는 별도 확인 전까지 ◐ |
| `lyra-ui-hud-layout.html` | `W_FrontEndHUDLayout`·`W_ShooterHUDLayout`·`W_TopDownArenaHUDLayout` 의 parent · CDO 는 ◐ (`W_DefaultHUDLayout` 만 검증 완료) |
| `lyra-ui-widget-injection.html` | 다른 Experience ActionSet (`B_LyraShooterGame_ControlPoints` 등) 의 `GameFeatureAction_AddWidgets` CDO 는 ◐ ; layout 안 `UUIExtensionPointWidget` 의 위치·계층은 ◐ (UMG designer tree 확인 필요) |
| `lyra-ui-tagged-widget-visibility.html` | `HiddenByTags` 런타임 listening 미구현 사실은 검증 완료 (코드 주석 명시 - `UE-142237`). 대안 (`UCommonUIVisibilitySubsystem`) 의 라이라 사용 위치는 검증 완료 - `LyraHUDLayout.cpp`·`LyraControllerDisconnectedScreen.cpp`·`LyraSettingValueDiscrete_PerfStat.cpp`·`LyraPlatformEmulationSettings.cpp` 4 파일에서 확인됨 |
| `lyra-ui-styles-widgets.html` | Common Style 자산·input action data table·controller data 의 라이라 CDO 는 모두 ◐ 까지 ; 라이라 측 widget 파생 클래스의 파일 존재만 검증 완료, BP 사용 위치는 ◐ |
| `lyra-ui-settings.html` · `lyra-ui-frontend-common-user.html` (둘 다 보류) | HTML 미생성. 생성 전 `Source/LyraGame/Settings/` 와 `Source/LyraGame/UI/Frontend/` + Common User 인스턴스화 위치를 원장에 검증 완료 로 보강 필요. 보강된 뒤에도 partial 로 유지될 항목: 각 `UGameSetting*` 값 클래스의 정확한 카테고리 매핑, `W_LyraStartup` / `W_ExperienceSelectionScreen` 의 CDO 와 세션 옵션 흐름 |

**원장 보강이 우선** - 위 ◐ 항목 중 자주 인용될 사실은 HTML 생성 전에 Monolith / 라이더 MCP 로 확인해 원장 (`ui-code-analysis.md` · `ui-blueprint-analysis.md`) 에 먼저 추가하고 검증 완료 로 승격한다. HTML 페이지에서 새 사실을 정의하지 않는다.

## 원장 범위 한계 (Settings / Frontend)

현재 검증 원장 (`ui-code-analysis.md` · `ui-blueprint-analysis.md`) 의 분석 범위는 `Source/LyraGame/UI/` 중심이다. 다만 섹션 7 (Settings) 와 섹션 8 (Frontend / Common User) 의 실제 구현은 다른 폴더에 있다.

- Settings: `Source/LyraGame/Settings/` (`LyraGameSettingRegistry.h/.cpp`, `LyraSettingsLocal.h/.cpp`, `LyraSettingsShared.h/.cpp`, `LyraGameSettingRegistry_{Audio,Gamepad,Gameplay,MouseAndKeyboard,PerfStats,Video}.cpp`)
- Frontend / Common User: `Source/LyraGame/UI/Frontend/` + Common User 플러그인 사용 위치

따라서 섹션 7·섹션 8 의 HTML 페이지를 생성하려면 **현재 원장으로는 부족** 하며, 다음 둘 중 하나가 선행돼야 한다.

1. `ui-code-analysis.md` 를 "UI + Settings + Frontend" 원장으로 확장한다 (현재 문서 구조 유지에 단순).
2. Settings / Frontend 를 별도 시스템 (`settings`, `frontend`) 으로 분리하고 새 원장 그룹을 만든다 (사양 "확장 절차 A" 따름).

본 섹션 설계는 섹션 7·섹션 8 을 우선순위 "중·하" 로 두므로, 코어 (섹션 0~섹션 6) HTML 페이지 생성을 완료한 뒤 위 선택을 결정한다. 그 전에는 섹션 7·섹션 8 의 HTML 페이지를 만들지 않는다.

## 기존 분석 문서와의 관계

후속 학습 문서가 같은 사실을 다시 조사하면 중복이 생기고 값이 어긋난다. 역할을 다음과 같이 나눈다.

| 문서군 | 역할 | 사실의 출처 여부 |
|--------|------|-------------------|
| [`ui-code-analysis.md`](ui-code-analysis.md), [`ui-blueprint-analysis.md`](ui-blueprint-analysis.md) | **검증 원장 (verified fact ledger)** - Monolith · C++ 재조회로 확인한 사실의 단일 출처 | 예. 모든 수치·경로·CDO 값의 근거 |
| 후속 8개 학습 문서 | **기능별 학습 안내서** - 검증 원장의 사실을 데이터 흐름 순서로 재배열하고 실습·디버깅·확장 레시피를 더함 | 아니오. 원장을 인용 |
| [`ui-references.md`](ui-references.md) | 개념 학습용 공식 문서·커뮤니티 자료 링크 + 문서 ↔ 프로젝트 매핑 | 아니오. 외부 개념 |

운영 규칙:

- 학습 문서는 사실을 새로 조사하지 말고 검증 원장을 인용한다. 원장에 없는 사실이 필요하면 Monolith · 라이더 MCP 로 확인한 뒤 **원장에 먼저 추가** 하고 학습 문서가 그것을 인용한다.
- 학습 문서가 원장과 어긋나는 내용을 발견하면 Monolith · 라이더 MCP 로 재확인하고 양쪽을 함께 갱신한다.
- 두 분석 문서를 유지해야 하는 이유: 학습 문서는 흐름 위주라 "이 값이 어디서 검증됐는가" 의 추적성이 약해진다. 원장이 추적성을 담당하면 학습 문서는 가벼워진다.
- 공식 온라인 자료의 정식 목록과 카테고리 분류는 [`ui-references.md`](ui-references.md) 에 분리되어 있다 - `animation-references.md` 와 동일한 형식. 본 섹션 설계는 그 references 문서를 1차 참고로 인용한다.

## 독자별 학습 경로

### 처음 보는 개발자

1. 전체 지도와 학습 경로 (섹션 0)
2. CommonUI 의 입력·활성화 모델 (섹션 1)
3. HUD 액터와 게임 UI 매니저 (섹션 2)
4. `ULyraHUDLayout` (섹션 3)
5. 위젯 주입 - `GameFeatureAction_AddWidgets` + UIExtension (섹션 4)

목표는 "왜 이 widget 이 이 위치에 떠 있는가" 를 한 흐름으로 설명할 수 있게 되는 것.

### 블루프린트 / UI 디자이너 학습자

1. CommonUI 의 입력·활성화 모델 (섹션 1)
2. HUD 액터와 게임 UI 매니저 (섹션 2)
3. `ULyraHUDLayout` (섹션 3)
4. 위젯 주입 (섹션 4)
5. Common Style · 위젯 라이브러리 (섹션 6)

위젯 자산을 만들 때 어디에 등록해야 화면에 보이는지, 어떤 베이스 클래스를 상속해야 하는지 파악.

### C++ 시스템 학습자

1. CommonUI 의 입력·활성화 모델 (섹션 1)
2. HUD 액터와 게임 UI 매니저 (섹션 2)
3. 위젯 주입 (섹션 4)
4. `ULyraTaggedWidget` 의 미구현 인터페이스 (섹션 5) - 어떤 인터페이스에 의존하면 안 되는지
5. 설정 화면과 `GameSettings` (섹션 7)

GameFeatureAction 의 component manager 연동, UIExtension subsystem 의 매칭 contract, settings registry 의 데이터 모델 등 메커니즘 중심.

### 콘텐츠 확장 담당자 (새 위젯 / 새 layer / 새 Experience HUD)

1. 위젯 주입 (섹션 4) - 가장 핵심
2. `ULyraHUDLayout` (섹션 3)
3. HUD 액터와 게임 UI 매니저 (섹션 2)
4. Common Style · 위젯 라이브러리 (섹션 6)
5. (Experience HUD 신규 작성) 설정 화면 (섹션 7) - 설정 항목 추가 시

목표는 코드 수정 없이 새 widget 을 새 Experience 에 노출할 수 있게 되는 것 - `GameFeatureAction_AddWidgets.Widgets[]` 에 항목 추가 한 줄로 끝나는 지점을 이해.
