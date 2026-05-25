# 라이라(Lyra) CommonUI - 온라인 참고 문서 모음

> 라이라의 UI 시스템 (CommonUI / UIExtension / GameUI Manager / GameSettings / Common User) 을 **분석·학습** 하고 메뉴얼을 작성할 때 참고할 공식·권위 있는 온라인 문서 목록입니다.
> 작업 개요·분석 도구·아키텍처는 루트 [`CLAUDE.md`](../CLAUDE.md) 를, 실제 에셋/코드 조회는 Monolith·라이더 MCP 를 사용하십시오.
>
> - 기준 엔진 버전: **UE 5.7** - `dev.epicgames.com` 문서는 페이지 우측 상단에서 버전 선택 가능
> - 링크 최종 확인: **2026-05-24**

## 핵심 이해 - 라이라 UI 란

라이라의 UI 는 **하나의 시스템이 아니라 다섯 시스템의 조합** 입니다. C++ 측 코드 (`Source/LyraGame/UI/`) 는 그 위에 얇게 얹힌 라이라 정책일 뿐입니다.

- **CommonUI** (Epic 플러그인) - 입력 라우팅 (`CommonGameViewportClient`, `CommonUIActionRouterBase`), activatable widget, style, input action 매핑, 카드룰 내비게이션
- **CommonGame** (Epic 플러그인) - `UGameUIManagerSubsystem`, `UGameUIPolicy`, `UPrimaryGameLayout` + `UI.Layer.*` 관리
- **UIExtension** (Epic 플러그인, 라이라에 포함) - `UUIExtensionSubsystem`, `UUIExtensionPointWidget` — `HUD.Slot.*` tag 기반 위젯 매칭
- **라이라 액션** - `UGameFeatureAction_AddWidgets` — Experience 가 활성화될 때 위 둘에 위젯을 데이터로 주입
- **GameSettings** (Epic 플러그인) - 설정 화면 데이터 모델

추가로 **Common User** (`UCommonUserSubsystem`, `UCommonSessionSubsystem`) 는 로그인·세션 추상화로, 프론트엔드 흐름에서만 필요한 위성 시스템입니다 (이름은 비슷하지만 CommonUI 와 다른 플러그인).

## 사용법

1. 분석할 UI 주제를 아래 목록에서 찾습니다.
2. 공식 문서로 **개념** 을 학습합니다.
3. [섹션 5: 문서 ↔ 프로젝트 매핑](#5-문서--프로젝트-매핑) 으로 라이라의 실제 구현 위치를 찾습니다.
4. Monolith (`blueprint_query`·`ui_query`·`project_query`)·라이더 MCP 로 해당 에셋/코드를 조회해 **문서 내용과 교차 검증** 합니다.

---

## 1. 공식 라이라 문서 (최우선)

### ⭐ Lyra Sample Game
<https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine>

라이라 프로젝트 전체 개요. UMG widget 인벤토리, GameFeatures + Common User 위치, FrontEnd Map (`L_LyraFrontEnd`) 등 UI 관련 내용을 포함.

### Lyra Sample Game Settings
<https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-settings-in-unreal-engine>

`GameSettings` 플러그인의 라이라 적용 — `UGameSettingRegistry`, `UGameSetting`, `UGameSettingValue`, `UGameSettingCollection`, value type specialization (`ScalarDynamic`, `DiscreteDynamic_Bool/Number/Enum`), `UGameSettingPanel`, `UGameSettingListEntryBase`, edit conditions (`FWhenCondition`, `FWhenPlatformHasTrait`, `FWhenPlayingAsPrimaryPlayer`).

### Common User Plugin in Lyra
<https://dev.epicgames.com/documentation/en-us/unreal-engine/common-user-plugin-in-unreal-engine-for-lyra-sample-game>

로그인·세션·OSS 추상화. `UCommonUserSubsystem`, `UCommonSessionSubsystem`, `CommonGameInstance`, `W_LyraStartup`, `W_ExperienceSelectionScreen`, `LyraUserFacingExperienceDefinition`.

### Lyra Sample Game Interaction System
<https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-interaction-system-in-unreal-engine>

interactable 액터와의 상호작용 UI. 본 원장 범위 밖이지만 UI 흐름의 한 갈래.

---

## 2. 라이라가 사용하는 CommonUI 시스템

각 항목은 *공식 문서 + 라이라에서의 쓰임* 순으로 정리.

### Overview of Advanced Multiplatform UI with Common UI
<https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-advanced-multiplatform-user-interfaces-with-common-ui-for-unreal-engine>

CommonUI 가 해결하는 문제 (다층 메뉴 내비게이션, 콘솔별 버튼 아이콘, 선택적 widget 상호작용) 와 핵심 시스템 (`CommonGameViewportClient`, `CommonUIActionRouterBase`, `UIActionRouterTypes`, `CommonActivatableWidget`).

### Common UI Quickstart Guide
<https://dev.epicgames.com/documentation/en-us/unreal-engine/common-ui-quickstart-guide-for-unreal-engine>

5단계 셋업 — (1) Viewport input routing → (2) Input Action Data Tables (`CommonInputActionDataBase`) → (3) Default 내비게이션 (`CommonUIInputData`) → (4) Controller data (`CommonInputBaseControllerData`) → (5) Style 자산. 새 프로젝트에 CommonUI 를 도입할 때의 정석 절차.

### UCommonActivatableWidget API
<https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/CommonUI/UCommonActivatableWidget>

활성화 widget 의 핵심 API — `GetDesiredFocusTarget`, `GetDesiredInputConfig`, `BP_OnActivated/Deactivated`, `BP_GetDesiredFocusTarget`, `IsBackHandler`, `IsModal`, `OnHandleBackAction`, `VisibilityBoundWidgets`. 라이라 `ULyraActivatableWidget` 의 직접 부모.

### UCommonActivatableWidgetStack API
<https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/CommonUI/UCommonActivatableWidgetStack>

activatable widget 들을 stack 으로 관리. push/pop 으로 화면 전환.

### UCommonActivatableWidgetSwitcher API
<https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/CommonUI/UCommonActivatableWidgetSwitcher>

탭 같은 전환에 쓰이는 animated switcher.

---

## 3. UI Extension System

UIExtension 플러그인의 Epic 공식 문서는 매우 빈약합니다. **커뮤니티 자료가 실질적 1차 자료** 입니다.

### UI Extension UE5 (X157 Dev Notes)
<https://x157.github.io/UE5/UIExtension/>

UIExtension subsystem 의 의도와 사용 패턴 — `Extension Point` gameplay tag ↔ `Activatable Widget` 매핑, Experience 별 widget 교체 (`HUD.Slot.Score` 가 Experience 마다 다른 widget 으로). 라이라의 `GameFeatureAction_AddWidgets` 흐름 이해의 핵심 참고.

---

## 4. 학습 자료 (커뮤니티)

### Exploring Lyra - Part 5 (UI)
<https://dev.epicgames.com/community/learning/tutorials/oDaG/unreal-engine-exploring-lyra-part-5-ui>

라이라 UI 흐름을 분해·디버깅하며 학습하는 커뮤니티 가이드. Epic Developer Community 정식 등록 튜토리얼.

### How Common UI is Setup in LyraStarterGame (X157)
<https://x157.github.io/UE5/LyraStarterGame/CommonUI/>

라이라가 CommonUI 를 설정하는 실제 패턴을 분석한 커뮤니티 자료.

### Common UI Plugin (X157)
<https://x157.github.io/UE5/CommonUI/>

CommonUI 자체에 대한 커뮤니티 노트 — Quickstart 보다 깊은 내용을 다룸.

### XistCommonGameSample (GitHub — Lyra 풍 HUD 참조 구현)
<https://github.com/XistGG/XistCommonGameSample>

UE 5.7 기준 Lyra-like HUD & Input Setup 의 미니멀 참조 프로젝트. 라이라 전체 코드보다 작아서 학습용으로 좋음.

### LyraStarterGame Plugins (X157)
<https://x157.github.io/UE5/LyraStarterGame/Plugins/>

라이라가 사용하는 플러그인 전체 목록과 각 플러그인의 역할.

---

## 5. 문서 ↔ 프로젝트 매핑

온라인 개념을 라이라 프로젝트의 실제 구현으로 연결합니다. 분석 시 이 표를 출발점으로 삼으십시오.

| 온라인 개념 | 라이라 구현 위치 | 조회 도구 |
|-------------|------------------|-----------|
| `UCommonActivatableWidget` | `Source/LyraGame/UI/LyraActivatableWidget.h` (`ULyraActivatableWidget`) | 라이더 MCP |
| `CommonGameViewportClient` | `Source/LyraGame/UI/LyraGameViewportClient.h` (`ULyraGameViewportClient`) + `Config/DefaultEngine.ini` `GameViewportClientClassName` | `Read` (헤더 + ini) |
| `UGameUIManagerSubsystem` | `Source/LyraGame/UI/Subsystem/LyraUIManagerSubsystem.h` (`ULyraUIManagerSubsystem`) | 라이더 MCP |
| `UGameUIPolicy` / `UPrimaryGameLayout` | (CommonGame 플러그인 — 라이라 측 policy 자산은 별도 확인 필요) | Monolith `blueprint_query` |
| `UUIExtensionSubsystem` | `Plugins/UIExtension/Source/Public/UIExtensionSystem.h` (라이라에 포함된 Epic 플러그인) | 라이더 MCP / `Read` |
| `UUIExtensionPointWidget` (layout 안 slot 구독 widget) | `Plugins/UIExtension/Source/Public/Widgets/UIExtensionPointWidget.h` | `Read` |
| `UGameFeatureAction_AddWidgets` | `Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.h` | 라이더 MCP |
| HUD layout widget | `Content/UI/Hud/W_DefaultHUDLayout` (Lyra core), `Content/UI/FrontEnd/W_FrontEndHUDLayout`, ShooterCore·TopDownArena 측 layout | Monolith `blueprint_query` |
| `UI.Layer.*` 태그 (Game/GameMenu/Menu/Modal) | `Config/DefaultGameplayTags.ini` 정의 + `Source/LyraGame/UI/LyraHUDLayout.cpp` 의 `UE_DEFINE_GAMEPLAY_TAG_STATIC` 네이티브 정의 | `Read` (ini + .cpp) |
| `HUD.Slot.*` 태그 (15종) | `Config/DefaultGameplayTags.ini` (Lyra core 7종) + `Plugins/GameFeatures/ShooterCore/Config/Tags/ShooterCoreTags.ini` (8종) | `Read` (ini) |
| Experience action set | `Plugins/GameFeatures/ShooterCore/Content/Experiences/LAS_ShooterGame_StandardHUD` 등 | Monolith `blueprint_query.get_cdo_properties` |
| `UGameSettingRegistry` 외 GameSettings 모델 | `Source/LyraGame/Settings/LyraGameSettingRegistry.h` 외 (별도 시스템 — 본 references 범위 밖) | 라이더 MCP |
| `UCommonUserSubsystem` / `UCommonSessionSubsystem` | CommonUser 플러그인 + `Source/LyraGame/UI/Frontend/` 의 라이라 측 사용 | 라이더 MCP |
| 입력 액션 (`UI.Action.*` 태그) | `Config/DefaultGameplayTags.ini` (`UI.Action.Back`) + `Config/DefaultInput.ini` (`UI.Action.Escape` InputActions) + (`Cancel/Confirm/NextTab/PreviousTab` 은 Monolith 인덱스에 확인되나 정의 위치 별도 조회 필요) | `Read` (ini) / Monolith |

> 콘텐츠 경로·에셋 이름은 라이라 버전에 따라 다를 수 있습니다. 정확한 경로는 Monolith `project_query` 로 확인하십시오.
