# 라이라(Lyra) 에셋 비동기 로딩 — 온라인 참고 문서 모음

> 라이라의 에셋 비동기 로딩 시스템 (`ULyraAssetManager` · `FLyraAssetManagerStartupJob` · `ULyraGameData` · `ULyraExperienceManagerComponent` · `UAsyncAction_ExperienceReady` · `ULyraLoadingScreenSubsystem` + AssetBundle 메타) 을 **분석·학습** 하고 다른 프로젝트로 이식할 때 참고할 공식·권위 있는 온라인 문서 목록입니다.
> 작업 개요·분석 도구·아키텍처는 루트 [`../CLAUDE.md`](../CLAUDE.md) 를, 실제 에셋/코드 조회는 Monolith·라이더 MCP 를 사용하십시오.
>
> - 기준 엔진 버전: **UE 5.7** — `dev.epicgames.com` 문서는 페이지 우측 상단에서 버전 선택 가능
> - 링크 최종 확인: **2026-05-25**

## 핵심 이해 — 라이라의 비동기 로딩

라이라의 에셋 로딩은 **Asset Manager 기반 데이터 주도 모델** 입니다. 핵심은 세 가지:

- **Primary Asset Type 등록** — `Config/DefaultGame.ini` 의 `[/Script/Engine.AssetManagerSettings]` 에 등록된 type 만 인덱스됨. 라이라는 8개 type 사용.
- **AssetBundle 메타** — `UPROPERTY(meta=(AssetBundles="Client,Server"))` 로 표시된 soft reference 가 Client/Server bundle 에 자동 수집. `ChangeBundleStateForPrimaryAssets` 가 NetMode 별로 필요한 bundle 만 로드.
- **Startup Job + Experience Manager** — `ULyraAssetManager::StartInitialLoading()` 의 weighted job queue + `ULyraExperienceManagerComponent` 의 7단계 state machine 으로 게임 시작 / Experience 전환 시 비동기 로딩 + 진행률 보고.

추가로 **`ULyraGameData`** 가 전역 GE 클래스 (Damage/Heal/DynamicTag) 의 `TSoftClassPtr` 보관소 역할 — 어디서든 `ULyraGameData::Get()` 으로 접근 가능 (`ULyraAssetManager` 가 startup job 으로 미리 로드).

## 사용법

1. 분석할 비동기 로딩 주제를 아래 목록에서 찾습니다.
2. 공식 문서로 **개념** 을 학습합니다.
3. [섹션 5: 문서 ↔ 프로젝트 매핑](#5-문서--프로젝트-매핑) 으로 라이라의 실제 구현 위치를 찾습니다.
4. Monolith (`blueprint_query` · `project_query`) · 라이더 MCP 로 해당 에셋/코드를 조회해 **문서 내용과 교차 검증** 합니다.
5. 다른 프로젝트로 이식할 때는 [`asset-loading-learning-section-plan.md`](asset-loading-learning-section-plan.md) 의 "포팅 가이드" 절을 따릅니다 (체크리스트 형식).

---

## 1. 공식 라이라 문서 (최우선)

### ⭐ Lyra Sample Game
<https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine>

라이라 프로젝트 전체 개요. Asset Manager · Experience · Game Features 의 통합 그림.

### Experiences in Lyra Sample Game
<https://dev.epicgames.com/documentation/en-us/unreal-engine/experience-system-in-lyra-sample-game>

`ULyraExperienceDefinition` + `ULyraExperienceActionSet` + Experience Manager Component 의 라이라 구현. Game Feature 플러그인 활성화 흐름.

### Lyra Game Features
<https://dev.epicgames.com/documentation/en-us/unreal-engine/game-features-and-modular-gameplay-plugins-in-unreal-engine>

Game Features 시스템 일반 + 라이라 적용. `ExplicitlyLoaded=true` 패턴 + GameFeatureAction (`AddAbilities` · `AddWidget` 등) 의 자산 참조.

---

## 2. 라이라가 사용하는 UE 비동기 로딩 시스템

각 항목은 *공식 문서 + 라이라에서의 쓰임* 순으로 정리.

### Asset Manager
<https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine>

`UAssetManager` 의 책임 (Primary Asset 인덱싱 · 비동기 로드 · bundle 관리). 라이라는 `ULyraAssetManager` 로 파생해 (a) startup job 큐 (b) `GetGameData()` / `GetDefaultPawnData()` 헬퍼 (c) `LoadedAssets` keep-in-memory set 을 추가.

### Asset Manager Settings (Primary Asset Types)
<https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-manager-settings-in-unreal-engine>

`[/Script/Engine.AssetManagerSettings].PrimaryAssetTypesToScan` 의 정확한 구조. 라이라는 8개 type 등록 (`Map`, `LyraGameData`, `PrimaryAssetLabel`, `GameFeatureData`, `LyraExperienceDefinition`, `LyraUserFacingExperienceDefinition`, `LyraLobbyBackground`, `LyraExperienceActionSet`).

### Streamable Manager + FStreamableHandle
<https://dev.epicgames.com/documentation/en-us/unreal-engine/loading-streamable-assets-in-unreal-engine>

`FStreamableManager` 의 `RequestAsyncLoad` · `LoadSynchronous`. `FStreamableHandle` 의 `WaitUntilComplete` · `BindCompleteDelegate` · `GetProgress`. 라이라 `FLyraAssetManagerStartupJob::DoJob` 의 `WaitUntilComplete(0.0f, false)` 패턴 + 60Hz 제한 progress 업데이트.

### Asset Bundles
<https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-bundles-in-unreal-engine>

`meta=(AssetBundles="Client,Server")` UPROPERTY 메타. soft reference 가 자동으로 PrimaryDataAsset 의 `AssetBundleData.Bundles[<name>].BundleAssets` 에 수집됨 (cooking 시 `UpdateAssetBundleData()` 가 빌드). 라이라는 9개 위치에서 사용 — UI 자산은 `Client` 만, gameplay 자산 (ability/effect/input) 은 `Client,Server` 양쪽.

### Soft Object Pointers
<https://dev.epicgames.com/documentation/en-us/unreal-engine/referencing-assets-in-unreal-engine>

`TSoftObjectPtr<T>` · `TSoftClassPtr<T>` · `FSoftObjectPath`. 메모리에 즉시 로드하지 않는 참조. 라이라 `ULyraAssetManager::GetAsset<T>` / `GetSubclass<T>` template 이 동기 로드 헬퍼.

### Game Features Subsystem
<https://dev.epicgames.com/documentation/en-us/unreal-engine/game-features-and-modular-gameplay-plugins-in-unreal-engine>

`UGameFeaturesSubsystem::LoadAndActivateGameFeaturePlugin` 의 URL 기반 비동기 로드. 라이라 `ULyraExperienceManagerComponent::OnExperienceLoadComplete` 가 Experience 가 요청한 GameFeature URL 들을 일괄 호출.

### Loading Process Interface
<https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/CommonLoadingScreen/ILoadingProcessInterface>

`ILoadingProcessInterface::ShouldShowLoadingScreen(OutReason)` 가상함수. `ULyraExperienceManagerComponent` 가 구현 → CommonLoadingScreen 플러그인이 호출.

### Blueprint Async Action
<https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-asynchronous-actions-in-unreal-engine>

`UBlueprintAsyncActionBase` 파생. BP 측 비동기 노드 구현 방법. 라이라 `UAsyncAction_ExperienceReady` 가 이 패턴으로 `WaitForExperienceReady` BP 노드 제공 (4 step state machine).

---

## 3. 라이라가 사용하는 보조 시스템

### CommonLoadingScreen Plugin
<https://github.com/EpicGames/UnrealEngine/tree/release/Engine/Plugins/Experimental/CommonLoadingScreen> (Epic GitHub)

엔진 experimental 플러그인. `[/Script/CommonLoadingScreen.CommonLoadingScreenSettings]` 에 `LoadingScreenWidget` 등록 → 로딩 화면 widget 자동 표시. 라이라는 `W_LoadingScreen_Host` 사용.

### Game Instance Subsystem
<https://dev.epicgames.com/documentation/en-us/unreal-engine/subsystems-in-unreal-engine>

`UGameInstanceSubsystem` — GameInstance 라이프사이클 (게임 종료까지 유지, map transition 가로지름). 라이라 `ULyraLoadingScreenSubsystem` 이 사용 — 로딩 화면 widget 클래스를 map 전환 너머 유지.

### LoadAlwaysLoadedCues (GameplayCueManager)
<https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-cues-for-the-gameplay-ability-system-in-unreal-engine>

`ULyraGameplayCueManager::LoadAlwaysLoadedCues` 가 라이라 `StartInitialLoading` 의 첫 startup job 으로 호출 — 자주 쓰이는 cue 를 미리 로드.

---

## 4. 학습 자료 (커뮤니티)

### Tom Looman — Asset Manager Guide
<https://www.tomlooman.com/unreal-engine-asset-manager-async-loading/>

Asset Manager + Primary Asset Type + AssetBundle 기초의 사실상 표준 가이드. 라이라 분석 전 개념 정리에 적합.

### X157 — Lyra Experience System
<https://x157.github.io/UE5/LyraExperience/>

라이라 Experience 시스템 + 비동기 로딩 흐름 커뮤니티 분석. ExperienceManagerComponent 의 state machine 다이어그램 포함.

### Exploring Lyra — Experience & Asset Loading (커뮤니티 튜토리얼)
<https://dev.epicgames.com/community/learning/tutorials/>

Epic Developer Community 의 라이라 분해 튜토리얼 시리즈. Experience 활성화 흐름 디버깅 가이드.

---

## 5. 문서 ↔ 프로젝트 매핑

온라인 개념을 라이라 프로젝트의 실제 구현으로 연결합니다. 분석 시 이 표를 출발점으로 삼으십시오.

| 온라인 개념 | 라이라 구현 위치 | 조회 도구 |
|-------------|------------------|-----------|
| `UAssetManager` 파생 | `Source/LyraGame/System/LyraAssetManager.h/.cpp` | 라이더 MCP |
| `AssetManagerClassName` 등록 | `Config/DefaultEngine.ini` 의 `[/Script/Engine.Engine].AssetManagerClassName=/Script/LyraGame.LyraAssetManager` | `Read` (ini) |
| Asset Manager config | `Config/DefaultEngine.ini` 의 `[/Script/LyraGame.LyraAssetManager]` 절 — `LyraGameDataPath` · `DefaultPawnData` | `Read` (ini) |
| Primary Asset Types | `Config/DefaultGame.ini` 의 `[/Script/Engine.AssetManagerSettings]` 절 — 8개 type | `Read` (ini) |
| Startup Job 패턴 | `Source/LyraGame/System/LyraAssetManagerStartupJob.h/.cpp` + `LyraAssetManager.cpp` 의 `STARTUP_JOB` 매크로 | 라이더 MCP |
| 전역 GameData 자산 (UPrimaryDataAsset) | `Source/LyraGame/System/LyraGameData.h/.cpp` + `Content/DefaultGameData.uasset` | 라이더 MCP + Monolith `blueprint_query.get_cdo_properties` |
| Experience Manager Component | `Source/LyraGame/GameModes/LyraExperienceManagerComponent.h/.cpp` | 라이더 MCP |
| Experience Definition (PrimaryDataAsset) | `Source/LyraGame/GameModes/LyraExperienceDefinition.h/.cpp` + `Content/System/Experiences/*` | 라이더 MCP + Monolith |
| Experience ActionSet | `Source/LyraGame/GameModes/LyraExperienceActionSet.h/.cpp` + `Plugins/.../Experiences/LAS_*.uasset` | 라이더 MCP + Monolith |
| BP 측 비동기 액션 | `Source/LyraGame/GameModes/AsyncAction_ExperienceReady.h/.cpp` | 라이더 MCP |
| Loading Process Interface 구현 | `LyraExperienceManagerComponent.cpp` 의 `ShouldShowLoadingScreen` 오버라이드 | 라이더 MCP |
| Loading Screen Subsystem | `Source/LyraGame/UI/Foundation/LyraLoadingScreenSubsystem.h` (GameInstanceSubsystem) | 라이더 MCP |
| CommonLoadingScreen 설정 | `Config/DefaultEngine.ini` 의 `[/Script/CommonLoadingScreen.CommonLoadingScreenSettings].LoadingScreenWidget` | `Read` (ini) |
| AssetBundles 메타 사용처 (9곳) | `Source/LyraGame/GameFeatures/GameFeatureAction_{AddAbilities,AddInputBinding,AddInputContextMapping,AddWidget}.h` + `LyraInputModifiers.h` | 라이더 MCP `search_in_files_by_regex` |
| GameFeatures Manager 등록 | `Config/DefaultEngine.ini` 의 `[/Script/GameFeatures.GameFeaturesSubsystemSettings].GameFeaturesManagerClassName=/Script/LyraGame.LyraGameFeaturePolicy` | `Read` (ini) |
| GameFeature 활성화 호출 | `LyraExperienceManagerComponent.cpp` 의 `UGameFeaturesSubsystem::Get().LoadAndActivateGameFeaturePlugin(URL, callback)` | 라이더 MCP |

> 콘텐츠 경로·에셋 이름은 라이라 버전에 따라 다를 수 있습니다. 정확한 경로는 Monolith `project_query` 로 확인하십시오.
