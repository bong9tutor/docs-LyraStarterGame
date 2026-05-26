# Lyra 에셋 비동기 로딩 블루프린트 분석

확인일: 2026-05-25  
분석 도구: Monolith MCP (`blueprint_query.get_cdo_properties` ✅) + Rider MCP (`search_in_files_by_regex` ✅) + ini 파일 직접 확인  
분석 범위: 에셋 비동기 로딩 관련 핵심 자산·설정 — `Content/DefaultGameData` · 8개 Primary Asset Type · Experience 자산의 AssetBundleData · GameFeatures 플러그인 메타데이터 · CommonLoadingScreen 설정

## 핵심 요약

코드 ([`asset-loading-code-analysis.md`](asset-loading-code-analysis.md)) 가 "어떤 메커니즘으로 자산이 비동기 로드되는가" 를 설명하면, 본 문서는 **그 메커니즘이 라이라 프로젝트에서 실제 어떤 데이터·설정으로 채워져 있는가** 를 검증한 결과다.

핵심 사실:

1. **DefaultGameData CDO** — `Content/DefaultGameData.uasset` 의 3개 GE 클래스 모두 ✓ (Damage_SetByCaller · Heal_SetByCaller · DynamicTag).
2. **8개 Primary Asset Type** 등록 — `DefaultGame.ini` 의 라이라 custom 8개. 엔진 기본 2개 (`Map`, `PrimaryAssetLabel`) 는 `-` 로 제거 후 `+` 로 라이라 정책 추가.
3. **AssetBundleData 자동 수집 검증** — `B_LyraDefaultExperience` 에 1개 (`W_DefaultHUDLayout_C`), `LAS_ShooterGame_StandardHUD` 에 12개 widget 모두 자동 수집됨. `meta=(AssetBundles="Client")` 메타가 의도대로 작동.
4. **Engine.ini 의 3개 핵심 설정** — `AssetManagerClassName` · `[LyraAssetManager]` 절 · `[GameFeaturesSubsystemSettings]` 가 라이라 부팅의 시작점.
5. **5개 GameFeature 플러그인** 모두 `EnabledByDefault=false`, `ExplicitlyLoaded=true` — Experience 가 명시적으로 활성화하는 모듈형 설계.

## 핵심 ini 설정 (포팅 시 1순위 확인)

★ **핵심 정정**: 라이라의 4개 설정 절은 `DefaultEngine.ini` 가 아니라 **`DefaultGame.ini`** 에 있음. `DefaultEngine.ini` 에는 `AssetManagerClassName` 과 `GlobalDefaultGameMode` 만.

### `Config/DefaultEngine.ini` — 2개 핵심 키 (라이라 검증 ✅)

| 절 | 키 | 값 | 의미 |
|----|----|-----|------|
| `[/Script/Engine.Engine]` | `AssetManagerClassName` | `/Script/LyraGame.LyraAssetManager` | 엔진이 부팅 시 이 클래스를 instantiate (line 26) |
| `[/Script/EngineSettings.GameMapsSettings]` | `GlobalDefaultGameMode` | `/Game/B_LyraGameMode.B_LyraGameMode_C` | 기본 GameMode (line 66) |

### `Config/DefaultGame.ini` — 4개 절 (라이라 검증 ✅)

| 라인 | 절 | 키 | 값 |
|------|----|----|-----|
| 51 | `[/Script/GameFeatures.GameFeaturesSubsystemSettings]` | `GameFeaturesManagerClassName` | `/Script/LyraGame.LyraGameFeaturePolicy` |
| 54 | `[/Script/LyraGame.LyraAssetManager]` | `LyraGameDataPath` | `/Game/DefaultGameData.DefaultGameData` |
| 54 | `[/Script/LyraGame.LyraAssetManager]` | `DefaultPawnData` | `/Game/Characters/Heroes/EmptyPawnData/DefaultPawnData_EmptyPawn.DefaultPawnData_EmptyPawn` |
| 58 | `[/Script/Engine.AssetManagerSettings]` | `PrimaryAssetTypesToScan` 8개 | (다음 표) |
| 83 | `[/Script/CommonLoadingScreen.CommonLoadingScreenSettings]` | `LoadingScreenWidget` | `/Game/UI/Foundation/LoadingScreen/W_LoadingScreen_Host.W_LoadingScreen_Host_C` |

### `Config/DefaultGame.ini` — `[/Script/Engine.AssetManagerSettings]` 의 8개 Primary Asset Type `-` 로 엔진 기본 (`Map`, `PrimaryAssetLabel`) 제거 후 라이라 정책으로 `+` 등록:

| PrimaryAssetType | AssetBaseClass | Directories | SpecificAssets | bHasBlueprintClasses | bIsEditorOnly | CookRule |
|------------------|---------------|-------------|----------------|---------------------|--------------|----------|
| `Map` | `Engine.World` | `/Game/Maps` | `L_LyraFrontEnd`, `L_DefaultEditorOverview` | false | false | AlwaysCook |
| `LyraGameData` | `LyraGame.LyraGameData` | (없음) | `/Game/DefaultGameData` | false | false | AlwaysCook |
| `PrimaryAssetLabel` | `Engine.PrimaryAssetLabel` | `/Game` | (없음) | false | **true** | Unknown |
| `GameFeatureData` | `GameFeatures.GameFeatureData` | `/Game/Unused` | (없음) | false | false | AlwaysCook |
| **`LyraExperienceDefinition`** | `LyraGame.LyraExperienceDefinition` | `/Game/System/Experiences` | `B_LyraFrontEnd_Experience` | **true** | false | AlwaysCook |
| `LyraUserFacingExperienceDefinition` | `LyraGame.LyraUserFacingExperienceDefinition` | `/Game/UI/Temp`, `/Game/System/Playlists` | (없음) | false | false | AlwaysCook |
| `LyraLobbyBackground` | `LyraGame.LyraLobbyBackground` | (없음) | (없음) | false | false | AlwaysCook |
| `LyraExperienceActionSet` | `LyraGame.LyraExperienceActionSet` | (없음) | (없음) | false | false | AlwaysCook |

기타 설정:
- `bShouldManagerDetermineTypeAndName=false`
- `bShouldGuessTypeAndNameInEditor=true`
- `bShouldAcquireMissingChunksOnLoad=false`
- `bShouldWarnAboutInvalidAssets=true`

**관찰**:
- `LyraExperienceActionSet` 와 `LyraLobbyBackground` 는 `Directories` 도 `SpecificAssets` 도 비어 있음 — Game Feature 플러그인의 `Content/` 폴더에서 type 매칭으로 자동 발견. plugin 활성화 시 인덱싱.
- `PrimaryAssetLabel` 만 `bIsEditorOnly=true` — 쿠킹 단계에서만 사용.
- `LyraExperienceDefinition` 만 `bHasBlueprintClasses=true` — BP 파생 Experience 자산 인덱싱 (`B_LyraDefaultExperience` 등).

## DefaultGameData 자산 — CDO 검증 ✅

경로: `/Game/DefaultGameData.uasset`

| 필드 | 값 |
|------|-----|
| `native_class` | `LyraGameData` |
| `parent_class` | `PrimaryDataAsset` |
| `DamageGameplayEffect_SetByCaller` | `/Game/GameplayEffects/Damage/GE_Damage_Basic_SetByCaller.GE_Damage_Basic_SetByCaller_C` |
| `HealGameplayEffect_SetByCaller` | `/Game/GameplayEffects/Heal/GE_Heal_SetByCaller.GE_Heal_SetByCaller_C` |
| `DynamicTagGameplayEffect` | `/Game/GameplayEffects/GE_DynamicTag.GE_DynamicTag_C` |
| `AssetBundleData.Bundles` | **`[]`** (비어 있음) |

**해석 (정정 — 피드백 반영)**:
- `Bundles=[]` — GameData 자체는 AssetBundle 등록 없음. 3개 GE 멤버는 **`TSoftClassPtr<UGameplayEffect>`** 이므로 GameData 로드만으로 GE 클래스가 메모리에 올라오지 않음.
- `LyraAssetManager::StartInitialLoading` 의 weight 25 startup job 이 부팅 시 로드하는 것은 **GameData primary asset 객체 + 3개 GE 의 soft class 경로 접근 가능 상태**까지.
- 실제 GE 클래스 인스턴스화는 사용 시점에 `ULyraAssetManager::GetSubclass(SoftClassPtr)` 가 동기 로드 + `LoadedAssets` set 에 keep-in-memory. 첫 호출 시점에 hitch 가능.

## Experience 자산의 AssetBundleData — CDO 검증 ✅

### `B_LyraDefaultExperience` (라이라 기본)

| 필드 | 값 |
|------|-----|
| `native_class` | `LyraExperienceDefinition` |
| `GameFeaturesToEnable` | `[]` (코어 — 추가 GameFeature 없음) |
| `DefaultPawnData` | `/Game/Characters/Heroes/SimplePawnData/SimplePawnData` |
| `Actions[]` | `[GameFeatureAction_AddWidgets_0]` 1개 |
| `ActionSets[]` | `[]` |
| **`AssetBundleData.Bundles`** | **1개** — `BundleName=Client, BundleAssets=[W_DefaultHUDLayout_C]` |

**의미**: `B_LyraDefaultExperience` 안의 `GameFeatureAction_AddWidgets_0` 가 `W_DefaultHUDLayout_C` (soft class ptr) 를 참조 → `meta=(AssetBundles="Client")` 메타로 자동 수집 → `AssetBundleData.Bundles[Client]` 에 등장 → Experience 로딩 시 `ChangeBundleStateForPrimaryAssets(B_LyraDefaultExperience, [Client])` 가 widget 까지 함께 로드.

### `LAS_ShooterGame_StandardHUD` (ShooterCore Experience 가 사용)

| 필드 | 값 |
|------|-----|
| `native_class` | `LyraExperienceActionSet` |
| `Actions[]` | `[GameFeatureAction_AddWidgets_0]` 1개 |
| `GameFeaturesToEnable` | `["ShooterCore"]` |
| **`AssetBundleData.Bundles`** | **1개** — `BundleName=Client, BundleAssets=[12개 widget]` |

**12개 widget 모두 검증** (Monolith CDO) — **수집 메커니즘 2가지**: Layout 1개는 `meta=(AssetBundles="Client")` 자동 수집 (`GameFeatureAction_AddWidget.h:20`), Widgets 11개는 `UGameFeatureAction_AddWidgets::AddAdditionalAssetBundleData` override 가 `LoadStateClient` bundle 에 명시 추가 (`GameFeatureAction_AddWidget.cpp:34-38`):
- `/ShooterCore/UserInterface/W_ShooterHUDLayout_C`
- `/ShooterCore/UserInterface/Notifications/EliminationFeed/W_EliminationFeed_C`
- `/ShooterCore/UserInterface/HUD/W_QuickBar_C`
- `/ShooterCore/UserInterface/Notifications/Accolades/W_AccoladeHostWidget_C`
- `/ShooterCore/UserInterface/HUD/W_WeaponReticleHost_C`
- `/Game/UI/PerfStats/W_PerfStatContainer_GraphOnly_C`
- `/Game/UI/PerfStats/W_PerfStatContainer_TextOnly_C`
- `/Game/UI/Hud/W_OnScreenJoystick_Left_C`
- `/Game/UI/Hud/W_OnScreenJoystick_Right_C`
- `/ShooterCore/UserInterface/W_FireButton_C`
- `/Game/UI/Hud/W_TouchRegion_Right_C`
- `/ShooterCore/Input/W_TouchRegion_Left_C`

**의미**:
- **Runtime 측 (✅ verified)**: `LAS_ShooterGame_StandardHUD` 의 12 widget 이 `Client` bundle 에 등록 → dedicated server 의 `StartExperienceLoad()` 는 `LoadStateClient` 를 `BundlesToLoad` 에 포함하지 않으므로 server 는 widget 자산을 **runtime 메모리에 로드하지 않음**.
- **Cook 산출물 측 (◐ partial)**: "dedicated server 빌드 cook 결과에서 widget 자산이 제외된다" 는 별도 검증 필요. AssetBundle 은 로딩 정책을 제어하지만 cook rule · chunk/stage · 다른 참조 경로에 따라 패키징 결과는 달라질 수 있음. 포팅 후 측정 절에서 cook 산출물 직접 비교 권장.

## AssetBundles 메타 사용처 — 10개 (코어 9 + 플러그인 1)

★ **정정**: 이전 "9개" 는 `Source/LyraGame/` 한정 검색 결과. GameFeature 플러그인 런타임 코드까지 포함하면 **10곳**.

### 라이라 코어 (`Source/LyraGame/`) — 9곳 ✅

| 파일 | 라인 | bundle | 자산 타입 (UPROPERTY 의미) |
|------|------|--------|--------------------------|
| `Source/LyraGame/GameFeatures/GameFeatureAction_AddAbilities.h` | 24 · 38 · 42 · 64 | `Client,Server` | TSubclassOf<UGameplayAbility> + UAttributeSet 클래스 + GE 클래스 + AttributeSet 자산 |
| `Source/LyraGame/GameFeatures/GameFeatureAction_AddInputBinding.h` | 37 | `Client,Server` | `TSoftObjectPtr<ULyraInputConfig>` |
| `Source/LyraGame/GameFeatures/GameFeatureAction_AddInputContextMapping.h` | 20 | `Client,Server` | `TSoftObjectPtr<UInputMappingContext>` |
| `Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.h` | 20 · 35 | **`Client`** 만 | `LayoutClass` + `WidgetClass` (server 는 UI 평가 안 함) — Widgets 배열은 `AddAdditionalAssetBundleData` override 가 추가 (cpp:34-38) |
| `Source/LyraGame/Input/LyraInputModifiers.h` | 117 | `Client,Server` | input modifier 의 reference 자산 |

### GameFeature 플러그인 (`Plugins/GameFeatures/`) — 1곳 추가 ✅

| 파일 | 라인 | bundle | 자산 타입 |
|------|------|--------|-----------|
| `Plugins/GameFeatures/ShooterCore/Source/ShooterCoreRuntime/Public/Input/AimAssistInputModifier.h` | 347 | `Client,Server` | aim assist 측 input modifier 자산 |

### `AddAdditionalAssetBundleData` override — 코드 측 추가 사례

`UPROPERTY` 메타가 아닌 코드로 bundle 에 등록하는 override 도 라이라에서 사용:

| 파일 | 라인 | 추가 대상 | bundle |
|------|------|----------|--------|
| `Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.cpp` | 34-38 | `Widgets[]` 11개 (LAS_ShooterGame_StandardHUD 사례) | `LoadStateClient` |
| `Source/LyraGame/AbilitySystem/LyraGameplayCueManager.cpp` | 401 | cue paths | `LoadStateClient` (truncated 변형) |

`LyraExperienceDefinition.cpp:75` + `LyraExperienceActionSet.cpp:53` 가 `for (Action) { Action->AddAdditionalAssetBundleData(AssetBundleData); }` 호출 — 모든 GameFeatureAction 에 override 기회 제공.

### bundle 분류 원칙

- UI 자산 → `Client` 만
- 게임플레이 자산 (ability/effect/attribute/input) → `Client,Server` 양쪽

## GameFeature 플러그인 5개 — 메타데이터 ✅

`Plugins/GameFeatures/*/*.uplugin` 모두 동일 패턴:

| 플러그인 | EnabledByDefault | ExplicitlyLoaded |
|----------|-----------------|------------------|
| `ShooterCore` | `false` | `true` |
| `ShooterMaps` | `false` | `true` |
| `ShooterTests` | `false` | `true` |
| `ShooterExplorer` | `false` | `true` |
| `TopDownArena` | `false` | `true` |

**해석**: 부팅 시 자동 로드 안 됨. Experience 가 `GameFeaturesToEnable` 에 명시한 플러그인만 `ULyraExperienceManagerComponent::OnExperienceLoadComplete` 가 `UGameFeaturesSubsystem::LoadAndActivateGameFeaturePlugin` 으로 활성화.

## 부팅 → Experience 활성화 — 전체 흐름 검증

다음 흐름이 `B_LyraDefaultExperience` 활성화 시점에 어떻게 실행되는지 검증:

1. **부팅** — `ULyraAssetManager::StartInitialLoading()`
   - `Super::StartInitialLoading()` 가 8개 Primary Asset Type 인덱싱 → `LyraExperienceDefinition` 의 BP 파생 자산 4개 (`B_LyraDefaultExperience` 등) 등록
   - Startup job 2개 실행 — `InitializeGameplayCueManager`, `GetGameData` (weight 25)
   - `DefaultGameData.uasset` 로드 완료 → 3개 GE 클래스 사용 가능 상태

2. **GameMode 가 Experience 결정** — `ALyraGameMode` 가 PrimaryAssetId 선택
   - URL 옵션 → PIE 설정 → 커맨드라인 `Experience=` → `ALyraWorldSettings::DefaultGameplayExperience` → `B_LyraDefaultExperience` 순서

3. **`SetCurrentExperience(B_LyraDefaultExperience)`** — server
   - `AssetManager.GetPrimaryAssetPath(...).TryLoad()` 로 BP 클래스 동기 로드
   - `CurrentExperience` 복제 → client 측 `OnRep_CurrentExperience` 트리거

4. **`StartExperienceLoad()`**
   - `BundleAssetList = [B_LyraDefaultExperience]` (ActionSets 비어 있음)
   - `BundlesToLoad = [Equipped, LoadStateClient]` (client) 또는 `[Equipped, LoadStateServer]` (dedicated server)
   - `ChangeBundleStateForPrimaryAssets` 가 비동기 로드 — 클라이언트면 `W_DefaultHUDLayout_C` 까지 로드 (AssetBundleData 검증)

5. **`OnExperienceLoadComplete()`**
   - `GameFeaturesToEnable = []` → GameFeature 로드 건너뜀 → 즉시 `OnExperienceFullLoadCompleted`

6. **`OnExperienceFullLoadCompleted()`**
   - `Actions = [GameFeatureAction_AddWidgets_0]` 1개 → `OnGameFeatureRegistering` + `OnGameFeatureLoading` + `OnGameFeatureActivating(Context)` 순차 호출
   - `GameFeatureAction_AddWidgets` 가 `ALyraHUD` 에 `W_DefaultHUDLayout_C` push → 화면 표시
   - `LoadState = Loaded`
   - Priority 3단 callback broadcast

7. **BP 측 `WaitForExperienceReady`** 가 listen 중이었으면 `Step4_BroadcastReady` → `OnReady` BP delegate.

## 자산 분포 — 정리

| 카테고리 | 검증 위치 | 수량 |
|---------|----------|------|
| Primary Asset Type | `Config/DefaultGame.ini` | 8 |
| Experience BP (라이라 코어) | `/Game/System/Experiences/B_LyraDefaultExperience` + FrontEnd | 2 |
| Experience BP (ShooterCore 플러그인) | `/ShooterCore/Experiences/B_*` | **3개** — `B_LyraShooterGame_ControlPoints` · `B_ShooterGame_Elimination` · `B_ShooterGame_Perf` (검증 ✅) |
| ExperienceActionSet 자산 | `/ShooterCore/Experiences/LAS_*` | 다수 — 본 시점 미전수 |
| GameFeature 플러그인 | `Plugins/GameFeatures/*` | 5 |
| AssetBundles 메타 사용처 | `Source/LyraGame/` 다양한 위치 | 9곳 |
| Loading Screen Host widget | `Content/UI/Foundation/LoadingScreen/W_LoadingScreen_Host` | 1 |

## 학습 순서 (자산 분석 측)

1. `Config/DefaultEngine.ini` — `AssetManagerClassName` + `[LyraAssetManager]` 절 확인 → 부팅 시작점.
2. `Config/DefaultGame.ini` — 8개 PrimaryAssetType 표 확인.
3. `Content/DefaultGameData.uasset` CDO → 전역 GE 클래스 보관소 패턴 학습.
4. `B_LyraDefaultExperience` CDO → Experience + AssetBundleData 자동 수집 사례 (1개 widget).
5. `LAS_ShooterGame_StandardHUD` CDO → 더 큰 ActionSet 의 AssetBundleData 사례 (12개 widget).
6. `Plugins/GameFeatures/ShooterCore/ShooterCore.uplugin` → ExplicitlyLoaded=true 패턴 확인.
7. AssetBundles 메타 9곳을 Rider 로 직접 열어 — UI 자산은 Client, 게임플레이는 Client+Server 분류 원칙 학습.

## 확장 시 권장 방식

**새 Primary Asset Type 등록**:
- `DefaultGame.ini` 의 `[/Script/Engine.AssetManagerSettings]` 에 `+PrimaryAssetTypesToScan=(...)` 추가
- `AssetBaseClass` 는 새 UPrimaryDataAsset 파생 C++ 클래스 경로
- `Directories` 는 자산이 위치할 폴더
- `CookRule=AlwaysCook` (런타임에 필요한 자산은 모두 이 설정)

**새 Experience 추가**:
- `ULyraExperienceDefinition` 상속 BP 작성 (`B_MyExperience`)
- `GameFeaturesToEnable` 에 필요한 플러그인 명시
- `DefaultPawnData` 지정
- `Actions[]` + `ActionSets[]` 에 GameFeatureAction 또는 ActionSet 등록
- 자산 경로가 `PrimaryAssetTypesToScan` 의 `Directories` 안에 있어야 인덱싱됨

**Experience 가 무거운 자산을 preload**:
- `LyraExperienceManagerComponent::StartExperienceLoad` 의 `PreloadAssetList` (현재 빈 후크) 에 PrimaryAssetId 추가
- 이 set 은 `ChangeBundleStateForPrimaryAssets` 호출되지만 **블로킹 wait 없음** — Experience 활성화는 진행하면서 background 로 로드 → 게임 진행 중 streaming

**새 bundle 이름 추가**:
- `LyraAssetManager.h` 에 `static const FName MyBundle = FName("MyBundle")` (`FLyraBundles` struct 안)
- 자산 측 `UPROPERTY(meta=(AssetBundles="MyBundle"))` 메타 추가
- `LyraExperienceManagerComponent::StartExperienceLoad` 의 `BundlesToLoad.Add(FLyraBundles::MyBundle)` 추가

자세한 포팅 절차는 [`asset-loading-learning-section-plan.md`](asset-loading-learning-section-plan.md) 의 "포팅 가이드" 절 참고.
