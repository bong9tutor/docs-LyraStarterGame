# Lyra 에셋 비동기 로딩 코드 분석

확인일: 2026-05-25 
분석 도구: 라이더(JetBrains) MCP - `Source/LyraGame/System/` + `Source/LyraGame/GameModes/` + `Source/LyraGame/UI/Foundation/` 핵심 9개 .h/.cpp 직접 확인 
분석 범위: `ULyraAssetManager` + `FLyraAssetManagerStartupJob` + `ULyraGameData` + `ULyraExperienceManagerComponent` + `ULyraExperienceDefinition` + `ULyraExperienceActionSet` + `UAsyncAction_ExperienceReady` + `ULyraLoadingScreenSubsystem` + AssetBundle 메타 사용처

## 핵심 요약

라이라의 에셋 비동기 로딩은 **3층 구조** 입니다:

1. **부팅 로딩 (startup)** - `ULyraAssetManager::StartInitialLoading()` 의 weighted job queue. 게임 부팅 시 한 번. GameplayCueManager + 전역 GameData 로드.
2. **Experience 로딩** - `ULyraExperienceManagerComponent` 의 7단계 state machine. map 전환·매치 시작 시. Primary Asset Type + AssetBundle (Client/Server NetMode 별) + GameFeature 플러그인 비동기 로드.
3. **런타임 ondemand 로딩** - `ULyraAssetManager::GetAsset<T>` / `GetSubclass<T>` template. soft pointer 즉시 동기 로드. `LoadedAssets` set 에 keep-in-memory.

추가로 **`UAsyncAction_ExperienceReady`** 가 BP 측에서 Experience 로드 완료를 기다리는 진입점이고, **`ULyraLoadingScreenSubsystem`** 이 map 전환 가로질러 로딩 widget 클래스를 유지합니다.

## 부팅 로딩 흐름 - `ULyraAssetManager::StartInitialLoading`

엔진 부팅 시 한 번 호출. 라이라가 추가한 정책 3가지:

| 단계 | 코드 위치 | 역할 |
|------|---------|------|
| 1 | `Super::StartInitialLoading()` (엔진) | Primary Asset 인덱싱 - `DefaultGame.ini` 의 8개 type 스캔 |
| 2 | `STARTUP_JOB(InitializeGameplayCueManager())` | `ULyraGameplayCueManager::LoadAlwaysLoadedCues` - always-loaded cue 미리 로드 |
| 3 | `STARTUP_JOB_WEIGHTED(GetGameData(), 25.f)` | 전역 `ULyraGameData` 로드 (weight 25 - 가장 큼) |
| 4 | `DoAllStartupJobs()` | 모든 job 순차 실행 + 진행률 보고 |

### `STARTUP_JOB` 매크로

```cpp
#define STARTUP_JOB_WEIGHTED(JobFunc, JobWeight) \
    StartupJobs.Add(FLyraAssetManagerStartupJob(#JobFunc, [this](const FLyraAssetManagerStartupJob& StartupJob, TSharedPtr<FStreamableHandle>& LoadHandle){JobFunc;}, JobWeight))
#define STARTUP_JOB(JobFunc) STARTUP_JOB_WEIGHTED(JobFunc, 1.f)
```

핵심:
- `#JobFunc` 으로 함수 호출 자체를 문자열로 만들어 job 이름 (로그용)
- 람다 안에서 `JobFunc;` 실행 - `LoadHandle` 인자는 job 이 비동기 핸들을 반환하고 싶을 때 채워줌
- weight 는 진행률 가중치 - `GetGameData` 가 가장 무거워 25 부여

### `FLyraAssetManagerStartupJob` - 비동기 핸들 wrapper

파일: [`../Source/LyraGame/System/LyraAssetManagerStartupJob.h`](../Source/LyraGame/System/LyraAssetManagerStartupJob.h) · `.cpp`

| 멤버 | 역할 |
|------|------|
| `JobName` (FString) | 로그 출력용 - "Startup job \"GetGameData()\" starting" 등 |
| `JobWeight` (float) | 진행률 가중치 |
| `JobFunc` (TFunction) | 람다 - `(StartupJob&, TSharedPtr<FStreamableHandle>&)` 시그니처. job 이 비동기 핸들을 반환하려면 두 번째 인자 (`LoadHandle`) 를 채워야 함 |
| `SubstepProgressDelegate` | 0~1 progress 보고 (의도: 60Hz throttle - 아래 (핵심) 리스크 참고) |

### (핵심) 60Hz throttle 조건식 리스크 (◐)

`FLyraAssetManagerStartupJob::UpdateSubstepProgressFromStreamable` 의 throttle 코드:

```cpp
double Now = FPlatformTime::Seconds();
if (LastUpdate - Now > 1.0 / 60)            // ← 부등호 방향 의심
{
    SubstepProgressDelegate.Execute(StreamableHandle->GetProgress());
    LastUpdate = Now;
}
```

`LastUpdate <= Now` 이므로 `LastUpdate - Now <= 0` → `> 1.0/60` 가 절대 true 가 안 됨 → **substep progress delegate 가 호출되지 않을 가능성이 큼**. Epic 측 코드에 남은 부등호 방향 bug 로 보이며, 의도는 `Now - LastUpdate > 1.0/60` 인 것으로 추정.

추가로 라이라의 현재 startup job 2개는 람다의 `LoadHandle` 인자를 채우지 않음:
- `GetGameData()` 는 내부에서 `LoadPrimaryAssetsWithType()->WaitUntilComplete()` 호출 (handle 외부 노출 없음)
- `InitializeGameplayCueManager()` 도 handle 반환 안 함

따라서 본 문서의 "진행률 누적 식" 설명은 **지원되는 구조**의 설명이며, 현재 라이라 두 job 에서 세밀한 substep progress 가 실제로 발화한다고 단정할 수 없음. 진행률을 실제로 활용하려면 (a) handle 채우는 job 작성 + (b) 조건식 부등호 확인이 함께 필요.

### `DoJob()` 동작

```cpp
TSharedPtr<FStreamableHandle> FLyraAssetManagerStartupJob::DoJob() const {
    JobFunc(*this, Handle);  // 람다 실행 — 핸들 채워질 수 있음
    if (Handle.IsValid()) {
        Handle->BindUpdateDelegate(...);                  // progress 콜백 등록
        Handle->WaitUntilComplete(0.0f, false);           // ★ 블로킹 wait (timeout=0)
        Handle->BindUpdateDelegate(FStreamableUpdateDelegate());  // 콜백 해제
    }
    return Handle;
}
```

**핵심**: `WaitUntilComplete(0.0f, false)` 가 무한 wait. startup job 은 부팅 시점이라 main thread 가 멈추는 것을 감수. 진행률은 별도 콜백으로 로딩 화면에 반영 가능 (현재 `UpdateInitialGameContentLoadPercent` 는 빈 함수 - 후크만 있음).

### `DoAllStartupJobs()` - 진행률 누적

```cpp
float TotalJobValue = 합(JobWeight);
float AccumulatedJobValue = 0;
for (job : StartupJobs) {
    job.SubstepProgressDelegate.BindLambda([&](float NewProgress) {
        float Overall = (AccumulatedJobValue + NewProgress * job.JobWeight) / TotalJobValue;
        UpdateInitialGameContentLoadPercent(Overall);   // 후크 — 로딩 화면에 전달
    });
    job.DoJob();
    AccumulatedJobValue += job.JobWeight;
    UpdateInitialGameContentLoadPercent(AccumulatedJobValue / TotalJobValue);
}
```

**Dedicated server 분기**: `IsRunningDedicatedServer()` 면 진행률 보고 생략 - 단순 순차 실행.

### `GetGameData()` 의 LoadGameDataOfClass 흐름

`ULyraGameData` 는 `UPrimaryDataAsset` 이므로 Primary Asset System 으로 로드:

```cpp
TSharedPtr<FStreamableHandle> Handle = LoadPrimaryAssetsWithType(PrimaryAssetType);
Handle->WaitUntilComplete(0.0f, false);
Asset = Cast<UPrimaryDataAsset>(Handle->GetLoadedAsset());
GameDataMap.Add(DataClass, Asset);
```

**Editor 시점 예외**: `GIsEditor` 면 `DataClassPath.LoadSynchronous()` 직접 호출 + `LoadPrimaryAssetsWithType` 별도 호출 - editor 의 재귀적 PostLoad 호출 가드.

**실패 처리**: `Fatal log` - GameData 로드 실패는 복구 불가 ("This is not recoverable and likely means you do not have the correct data to run %s").

### `PreBeginPIE` (editor 한정)

PIE 시작 직전 `GetGameData()` 호출 - PIE 시간을 startup 시간에 포함하지 않기 위함. 빈 후크로 "experience 전체 preload" 도 가능 (현재는 GameData 만).

## `ULyraAssetManager` - 핵심 API 4종

파일: [`../Source/LyraGame/System/LyraAssetManager.h`](../Source/LyraGame/System/LyraAssetManager.h) · `.cpp`

### 1. `GetAsset<T>(TSoftObjectPtr<T>, bKeepInMemory=true)` - template

```cpp
template<typename AssetType>
AssetType* GetAsset(const TSoftObjectPtr<AssetType>& AssetPointer, bool bKeepInMemory = true);
```

- `AssetPointer.Get()` 시도 → 이미 로드돼 있으면 즉시 반환
- 안 돼 있으면 `SynchronousLoadAsset(AssetPath)` 호출 → `UAssetManager::GetStreamableManager().LoadSynchronous(AssetPath, false)`
- `bKeepInMemory=true` 면 `LoadedAssets` (TSet) 에 추가 - GC 방지

### 2. `GetSubclass<T>(TSoftClassPtr<T>, bKeepInMemory=true)` - template

같은 패턴이지만 `TSoftClassPtr<T>` → `TSubclassOf<T>` 반환.

### 3. `SynchronousLoadAsset(FSoftObjectPath)` - static

```cpp
if (UAssetManager::IsInitialized())
    return UAssetManager::GetStreamableManager().LoadSynchronous(AssetPath, false);
return AssetPath.TryLoad();  // AssetManager 가 아직 준비 안 됐을 때 fallback
```

### 4. `AddLoadedAsset(const UObject*)` - keep-in-memory

```cpp
FScopeLock LoadedAssetsLock(&LoadedAssetsCritical);  // thread-safe
LoadedAssets.Add(Asset);
```

`LoadedAssets` 는 `TSet<TObjectPtr<const UObject>>` - UPROPERTY 로 GC 방지. critical section 으로 multi-thread 안전.

### 콘솔 명령 - `Lyra.DumpLoadedAssets`

```cpp
static FAutoConsoleCommand CVarDumpLoadedAssets(
    TEXT("Lyra.DumpLoadedAssets"),
    ...
    FConsoleCommandDelegate::CreateStatic(ULyraAssetManager::DumpLoadedAssets)
);
```

현재 추적 중인 모든 `LoadedAssets` 출력 - 메모리 누수 디버깅용.

### 명령줄 플래그 - `-LogAssetLoads`

```cpp
static bool bLogAssetLoads = FParse::Param(FCommandLine::Get(), TEXT("LogAssetLoads"));
```

활성 시 `SynchronousLoadAsset` 이 `FScopeLogTime` 로 동기 로드 시간 출력 - 부팅 핫스팟 식별용.

## `ULyraGameData` - 전역 GE 클래스 보관소

파일: [`../Source/LyraGame/System/LyraGameData.h`](../Source/LyraGame/System/LyraGameData.h) · `.cpp`

`UPrimaryDataAsset` 파생. 3개 멤버:

| 멤버 | 타입 | 검증된 자산 값 |
|------|------|---------------|
| `DamageGameplayEffect_SetByCaller` | `TSoftClassPtr<UGameplayEffect>` | `/Game/GameplayEffects/Damage/GE_Damage_Basic_SetByCaller_C` |
| `HealGameplayEffect_SetByCaller` | `TSoftClassPtr<UGameplayEffect>` | `/Game/GameplayEffects/Heal/GE_Heal_SetByCaller_C` |
| `DynamicTagGameplayEffect` | `TSoftClassPtr<UGameplayEffect>` | `/Game/GameplayEffects/GE_DynamicTag_C` |

`AssetBundleData.Bundles=[]` - GameData 자체는 bundle 등록 없음. 멤버는 모두 `TSoftClassPtr<UGameplayEffect>` 이므로 GameData 자산 로드 ≠ GE 클래스 로드. **사용 시점에 `ULyraAssetManager::GetSubclass(SoftClassPtr)` 가 동기 로드 + `LoadedAssets` 에 keep-in-memory.** "전역 GE 클래스 즉시 사용 가능" 표현은 잘못 - soft class 경로 접근 가능까지가 정확한 보장.

전역 접근:
```cpp
const ULyraGameData& ULyraGameData::Get() {
    return ULyraAssetManager::Get().GetGameData();
}
```

## Primary Asset Types - `DefaultGame.ini`

`[/Script/Engine.AssetManagerSettings].PrimaryAssetTypesToScan` 에 8개 type 등록 (`-` 로 엔진 기본 제거 후 `+` 로 라이라 custom 추가):

| Type | AssetBaseClass | Directories / SpecificAssets | CookRule | bHasBlueprintClasses |
|------|---------------|----------------------------|----------|---------------------|
| `Map` | `Engine.World` | `/Game/Maps` + `L_LyraFrontEnd`, `L_DefaultEditorOverview` | AlwaysCook | false |
| `LyraGameData` | `LyraGame.LyraGameData` | `/Game/DefaultGameData` 단일 자산 | AlwaysCook | false |
| `PrimaryAssetLabel` | `Engine.PrimaryAssetLabel` | `/Game` (editor only) | Unknown | false |
| `GameFeatureData` | `GameFeatures.GameFeatureData` | `/Game/Unused` | AlwaysCook | false |
| `LyraExperienceDefinition` | `LyraGame.LyraExperienceDefinition` | `/Game/System/Experiences` + `B_LyraFrontEnd_Experience` | AlwaysCook | **true** |
| `LyraUserFacingExperienceDefinition` | `LyraGame.LyraUserFacingExperienceDefinition` | `/Game/UI/Temp` + `/Game/System/Playlists` | AlwaysCook | false |
| `LyraLobbyBackground` | `LyraGame.LyraLobbyBackground` | (none) | AlwaysCook | false |
| `LyraExperienceActionSet` | `LyraGame.LyraExperienceActionSet` | (none - Plugins 측에서 자동 발견) | AlwaysCook | false |

**`bHasBlueprintClasses=true`** - Experience 만. BP 파생 Experience 도 indexing 대상 (`B_LyraDefaultExperience` 등).

## Experience 로딩 - 7단계 state machine

`ULyraExperienceManagerComponent` (UGameStateComponent + ILoadingProcessInterface):

```
Unloaded → Loading → LoadingGameFeatures → LoadingChaosTestingDelay (옵션) → ExecutingActions → Loaded
                                                                                                  ↓
                                                                                              Deactivating
```

### `SetCurrentExperience(FPrimaryAssetId)` - 진입점

server 측 `ALyraGameMode` 가 Experience 선택 후 호출:

```cpp
ULyraAssetManager& AssetManager = ULyraAssetManager::Get();
FSoftObjectPath AssetPath = AssetManager.GetPrimaryAssetPath(ExperienceId);
TSubclassOf<ULyraExperienceDefinition> AssetClass = Cast<UClass>(AssetPath.TryLoad());  // ★ 동기 로드
const ULyraExperienceDefinition* Experience = GetDefault<ULyraExperienceDefinition>(AssetClass);
CurrentExperience = Experience;        // ReplicatedUsing=OnRep_CurrentExperience
StartExperienceLoad();
```

`CurrentExperience` 가 복제되므로 client 도 `OnRep_CurrentExperience` 가 `StartExperienceLoad` 호출.

**(핵심) 주의 - Experience definition class 자체는 동기 로드**: `AssetPath.TryLoad()` 는 blocking 호출. 소스에 `//@TODO: Async load the experience definition itself` 주석이 남아 있음 (`LyraExperienceManagerComponent.cpp` 첫 부분). bundle 과 GameFeature 의 비동기 로드는 그 다음 단계 (`StartExperienceLoad`) 부터. 대규모 Experience definition (큰 default 객체) 의 경우 이 한 번의 동기 로드 시간이 hitch 로 나타날 수 있음 - async 화는 라이라가 명시적으로 남긴 후속 과제.

### `StartExperienceLoad()` 단계별

```cpp
LoadState = ELyraExperienceLoadState::Loading;

// 1. PrimaryAssetId 수집 — Experience 자체 + ActionSets
TSet<FPrimaryAssetId> BundleAssetList;
BundleAssetList.Add(CurrentExperience->GetPrimaryAssetId());
for (ActionSet : CurrentExperience->ActionSets)
    BundleAssetList.Add(ActionSet->GetPrimaryAssetId());

// 2. 로드할 bundle 결정 — NetMode 별
TArray<FName> BundlesToLoad;
BundlesToLoad.Add(FLyraBundles::Equipped);                          // 라이라 커스텀 bundle
if (bLoadClient) BundlesToLoad.Add(LoadStateClient);                // Client 자산
if (bLoadServer) BundlesToLoad.Add(LoadStateServer);                // Server 자산
// GIsEditor 면 둘 다 로드 (PIE 양쪽 모두 시뮬레이션)

// 3. ChangeBundleStateForPrimaryAssets — 핵심 비동기 호출
TSharedPtr<FStreamableHandle> BundleLoadHandle = AssetManager.ChangeBundleStateForPrimaryAssets(
    BundleAssetList.Array(),
    BundlesToLoad,
    {},                                          // RemoveBundles 없음
    false,                                       // bRemoveAllBundles=false
    FStreamableDelegate(),                       // 콜백 — 아래에서 별도 바인딩
    FStreamableManager::AsyncLoadHighPriority);

// 4. 완료 콜백 바인딩
FStreamableDelegate OnAssetsLoaded = FStreamableDelegate::CreateUObject(this, &ThisClass::OnExperienceLoadComplete);
if (!Handle.IsValid() || Handle->HasLoadCompleted())
    FStreamableHandle::ExecuteDelegate(OnAssetsLoaded);     // 즉시 실행
else
    Handle->BindCompleteDelegate(OnAssetsLoaded);
```

**`FLyraBundles::Equipped`** - `static const FName Equipped("Equipped")`. 라이라가 추가한 custom bundle 이름. 무기 등 "장착 가능" 자산을 따로 묶을 때 사용.

### `OnExperienceLoadComplete()` - GameFeature 활성화

```cpp
// 1. GameFeature URL 수집 — Experience + 모든 ActionSet 의 GameFeaturesToEnable
for (PluginName : CurrentExperience->GameFeaturesToEnable + ActionSet->GameFeaturesToEnable) {
    FString PluginURL;
    UGameFeaturesSubsystem::Get().GetPluginURLByName(PluginName, PluginURL);
    GameFeaturePluginURLs.AddUnique(PluginURL);
}

// 2. 일괄 비동기 활성화
NumGameFeaturePluginsLoading = GameFeaturePluginURLs.Num();
LoadState = ELyraExperienceLoadState::LoadingGameFeatures;
for (URL : GameFeaturePluginURLs) {
    ULyraExperienceManager::NotifyOfPluginActivation(URL);  // PIE 멀티 세션 추적
    UGameFeaturesSubsystem::Get().LoadAndActivateGameFeaturePlugin(
        URL,
        FGameFeaturePluginLoadComplete::CreateUObject(this, &ThisClass::OnGameFeaturePluginLoadComplete));
}
```

**`NumGameFeaturePluginsLoading` 카운트다운**: 각 GameFeature 가 완료될 때마다 `OnGameFeaturePluginLoadComplete` → `--NumGameFeaturePluginsLoading`. 0 도달 시 `OnExperienceFullLoadCompleted`.

### `OnExperienceFullLoadCompleted()` - Action 활성화

```cpp
// 1. (옵션) chaos testing delay — lyra.chaos.ExperienceDelayLoad.MinSecs CVar
if (LoadState != ChaosDelay && DelaySecs > 0) {
    GetWorld()->GetTimerManager().SetTimer(..., DelaySecs, false);
    return;
}

LoadState = ELyraExperienceLoadState::ExecutingActions;

// 2. GameFeatureAction 활성화 — 3단계 lifecycle
FGameFeatureActivatingContext Context;
Context.SetRequiredWorldContextHandle(...);   // PIE 멀티 세션 격리

for (Action : Experience->Actions + ActionSet->Actions) {
    Action->OnGameFeatureRegistering();
    Action->OnGameFeatureLoading();
    Action->OnGameFeatureActivating(Context);
}

LoadState = ELyraExperienceLoadState::Loaded;

// 3. Priority 3단 콜백 broadcast
OnExperienceLoaded_HighPriority.Broadcast(CurrentExperience);
OnExperienceLoaded_HighPriority.Clear();
OnExperienceLoaded.Broadcast(CurrentExperience);
OnExperienceLoaded.Clear();
OnExperienceLoaded_LowPriority.Broadcast(CurrentExperience);
OnExperienceLoaded_LowPriority.Clear();
```

**Priority 3단**: 시스템 셋업 (HighPriority) → 일반 게임플레이 (Normal) → UI/디버그 (LowPriority). 콜백 등록 측은 `CallOrRegister_OnExperienceLoaded_*` 3종 중 골라 사용.

### `ShouldShowLoadingScreen(OutReason)` - `ILoadingProcessInterface`

`LyraExperienceManagerComponent.cpp:447` 에 구현. CommonLoadingScreen 플러그인이 매 tick 호출 → `LoadState != Loaded` 면 true 반환 → 로딩 화면 유지.

### Chaos testing CVar 2종

```
lyra.chaos.ExperienceDelayLoad.MinSecs (default 0)
lyra.chaos.ExperienceDelayLoad.RandomSecs (default 0)
```

`OnExperienceFullLoadCompleted` 직전에 `[MinSecs, MinSecs+RandomSecs]` 사이 random delay. 빠른 로딩 시점 race condition 테스트용.

## BP 측 비동기 진입 - `UAsyncAction_ExperienceReady`

파일: [`../Source/LyraGame/GameModes/AsyncAction_ExperienceReady.h`](../Source/LyraGame/GameModes/AsyncAction_ExperienceReady.h) · `.cpp`

`UBlueprintAsyncActionBase` 파생. BP 노드 `Wait For Experience Ready`.

### 4 step state machine

| Step | 함수 | 트리거 |
|------|------|--------|
| 0 | `WaitForExperienceReady(WorldContextObject)` (static) | BP 가 호출 → `NewObject` + `RegisterWithGameInstance(World)` |
| Activate | `Activate()` override | GameState 있으면 Step2, 없으면 `World->GameStateSetEvent.AddUObject(this, Step1)` |
| 1 | `Step1_HandleGameStateSet(AGameStateBase*)` | GameState 가 늦게 set 될 때 callback. `GameStateSetEvent.RemoveAll(this)` + Step2 |
| 2 | `Step2_ListenToExperienceLoading(AGameStateBase*)` | `FindComponentByClass<ULyraExperienceManagerComponent>()`. **이미 loaded 면** `SetTimerForNextTick` 으로 1 frame 지연 후 Step4 (의도 코멘트: "people don't write stuff that relies on this always being true"). 아니면 `CallOrRegister_OnExperienceLoaded` 등록 → Step3 |
| 3 | `Step3_HandleExperienceLoaded(Experience)` | Experience 로딩 완료 callback → Step4 |
| 4 | `Step4_BroadcastReady()` | `OnReady.Broadcast()` (BP delegate) + `SetReadyToDestroy()` |

**핵심**: `Step2` 의 "이미 loaded 면 1 frame 지연" - BP 코드가 즉시 실행 가정으로 작성될 수 있는 미묘한 버그 방지.

## 로딩 화면 - `ULyraLoadingScreenSubsystem`

파일: [`../Source/LyraGame/UI/Foundation/LyraLoadingScreenSubsystem.h`](../Source/LyraGame/UI/Foundation/LyraLoadingScreenSubsystem.h)

`UGameInstanceSubsystem` - map 전환 너머 유지.

| 멤버 | 역할 |
|------|------|
| `LoadingScreenWidgetClass` (TSubclassOf<UUserWidget>) | 현재 로딩 화면 컨텐츠 widget 클래스 |
| `SetLoadingScreenContentWidget(NewWidgetClass)` (BP) | 클래스 교체 → `OnLoadingScreenWidgetChanged` 발화 |
| `GetLoadingScreenContentWidget()` (BP Pure) | 현재 클래스 조회 |
| `OnLoadingScreenWidgetChanged` (delegate) | host widget 이 listen → 새 클래스로 swap |

**CommonLoadingScreen 플러그인과의 분리**:
- `[CommonLoadingScreen.CommonLoadingScreenSettings].LoadingScreenWidget = W_LoadingScreen_Host` - 외곽 host widget
- `ULyraLoadingScreenSubsystem.LoadingScreenWidgetClass` - host 안에 표시할 컨텐츠 widget
- map transition 동안 host 는 `ILoadingProcessInterface::ShouldShowLoadingScreen` true 인 동안 떠 있음

## AssetBundle 메타 - 라이라 코어 9곳 + 플러그인 1곳 = 10곳

### 라이라 코어 (`Source/LyraGame/`) - 9곳

`UPROPERTY(meta=(AssetBundles="..."))` 직접 메타:

| 파일 | 라인 | bundle | UPROPERTY |
|------|------|--------|-----------|
| `GameFeatureAction_AddAbilities.h` | 24 · 38 · 42 · 64 | `Client,Server` | ability/effect/attribute 자산 - server 도 필요 |
| `GameFeatureAction_AddInputBinding.h` | 37 | `Client,Server` | input config |
| `GameFeatureAction_AddInputContextMapping.h` | 20 | `Client,Server` | input mapping context |
| `GameFeatureAction_AddWidget.h` | 20 · 35 | **`Client`** 만 | `LayoutClass` + `WidgetClass` - server 는 UI 평가 안 함 |
| `LyraInputModifiers.h` | 117 | `Client,Server` | input modifier 의 reference 자산 |

### GameFeature 플러그인 측 - 1곳 추가

| 파일 | 라인 | bundle | UPROPERTY |
|------|------|--------|-----------|
| `Plugins/GameFeatures/ShooterCore/Source/ShooterCoreRuntime/Public/Input/AimAssistInputModifier.h` | 347 | `Client,Server` | aim assist 측 input modifier 자산 |

### AssetBundleData 수집 - 2가지 메커니즘

라이라는 `AssetBundleData.Bundles[].BundleAssets` 를 **두 방식**으로 수집:

**방식 1 - `meta=(AssetBundles)` 자동 수집** (Editor only):
- `UPrimaryDataAsset::UpdateAssetBundleData()` 가 위 10곳의 `UPROPERTY` 메타를 스캔 → 자동으로 bundle 에 등록
- 검증 사례: `B_LyraDefaultExperience.AssetBundleData.Bundles[Client] = [W_DefaultHUDLayout_C]` (1개) - `GameFeatureAction_AddWidget.h:20` 의 `LayoutClass` 메타가 자동 수집

**방식 2 - `AddAdditionalAssetBundleData` override** (코드로 추가):
- `GameFeatureAction_AddWidget.cpp:34-38` 에 정확히 구현:
 ```cpp
  void UGameFeatureAction_AddWidgets::AddAdditionalAssetBundleData(FAssetBundleData& AssetBundleData) {
      for (const FLyraHUDElementEntry& Entry : Widgets)
          AssetBundleData.AddBundleAsset(LoadStateClient, Entry.WidgetClass.ToSoftObjectPath().GetAssetPath());
  }
  ```
- `LyraExperienceDefinition.cpp:75` + `LyraExperienceActionSet.cpp:53` 가 `for (Action) { Action->AddAdditionalAssetBundleData(AssetBundleData); }` 호출 - 모든 GameFeatureAction 에 override 기회 제공
- 검증 사례: `LAS_ShooterGame_StandardHUD.AssetBundleData.Bundles[Client] = [12 widget]` 중 **Layout 1개는 메타 자동 수집, Widgets 11개는 override 가 추가**
- 추가 사례: `LyraGameplayCueManager.cpp:401` 의 `BundleData.AddBundleAssetsTruncated(LoadStateClient, CuePaths)` - cue 측 동일 패턴

### Runtime 동작 vs Cook 결과 분리

`ChangeBundleStateForPrimaryAssets(asset, [Client])` 호출 시 그 bundle 의 자산만 비동기 로드 - **runtime 메모리 로드 정책은 verified ✓**.

**하지만 dedicated server 가 widget 자산을 cooking 단계에서 제외하는지는 별도 검증 필요 (◐)** - AssetBundle 은 로딩 상태와 번들 분류를 제어하지만, 프로젝트 cook rule · chunk/stage 설정 · 참조 경로에 따라 패키징 결과는 다를 수 있음. 정확한 결과는 cook 산출물 비교 필요.

## 디버깅 체크리스트

부팅이 느릴 때:
1. 명령줄에 `-LogAssetLoads` 추가 → 모든 동기 로드 시간 출력.
2. `Lyra.DumpLoadedAssets` 콘솔 → 메모리 누수 후보 확인.
3. `STARTUP_JOB` 의 weight 합산 확인 - `GetGameData` 가 25 비중. 더 무거운 job 추가 시 weight 조정.
4. `UpdateInitialGameContentLoadPercent` 가 빈 함수 - 로딩 화면 진행률 표시하려면 여기 hook 추가.

Experience 가 안 로드될 때:
1. `Config/DefaultGame.ini` 의 `PrimaryAssetTypesToScan` 에 해당 Experience type (`LyraExperienceDefinition`) 등록되어 있는지.
2. Experience 자산이 `Directories` 또는 `SpecificAssets` 경로에 있는지.
3. `bHasBlueprintClasses=true` 인지 (BP 파생 Experience 면 필수).
4. server 측 `ALyraGameMode` 가 `SetCurrentExperience(FPrimaryAssetId)` 호출했는지 - 로그 `LogLyraExperience` 확인.
5. `lyra.chaos.ExperienceDelayLoad.*` CVar 가 0 이 아닌지 (테스트 잔재).
6. GameFeature plugin 의 `.uplugin` 이 `ExplicitlyLoaded=true` 인지 - false 면 부팅 시 자동 로드되어 Experience 활성화 시점에 이미 로드 상태.

로딩 화면이 안 사라질 때:
1. `LyraExperienceManagerComponent.cpp:447` 의 `ShouldShowLoadingScreen` 호출 빈도 확인.
2. `LoadState == Loaded` 도달했는지 - `LogLyraExperience` 의 "OnExperienceFullLoadCompleted" 로그.
3. CommonLoadingScreen 의 추가 host (`ILoadingProcessInterface` 다른 구현체) 가 true 반환 중인지.

## 확장 시 권장 방식

**새 Primary Asset Type 추가**: `Config/DefaultGame.ini` 의 `[/Script/Engine.AssetManagerSettings]` 에 `+PrimaryAssetTypesToScan=(...)` 한 줄 추가. `AssetBaseClass` · `Directories` · `CookRule=AlwaysCook` 지정.

**새 startup job 추가**: `LyraAssetManager.cpp::StartInitialLoading` 에 `STARTUP_JOB_WEIGHTED(MyFunc(), Weight)` 추가. 무거운 작업은 weight 25 이상. progress 보고가 필요하면 `JobFunc` 람다 안에서 `LoadHandle` 채워줘 자동 추적.

**새 전역 데이터 자산**: `LyraGameData` 패턴 복사 - `UPrimaryDataAsset` 파생 + `Config/DefaultEngine.ini` 의 `[/Script/LyraGame.LyraAssetManager]` 에 path 추가 + `Config/DefaultGame.ini` 의 `PrimaryAssetTypesToScan` 에 새 type 등록 + AssetManager 에 `GetMyData()` 헬퍼.

**새 bundle 이름**: `FLyraBundles::MyBundle = FName("MyBundle")` static 정의. `meta=(AssetBundles="MyBundle")` 메타로 soft reference 수집. `ExperienceManagerComponent::StartExperienceLoad` 의 `BundlesToLoad` 에 추가.

**Experience 가 추가 자산 preload**: `StartExperienceLoad` 의 `PreloadAssetList` (현재 비어 있는 후크) 에 추가. 이 set 은 `ChangeBundleStateForPrimaryAssets` 호출되지만 **블로킹 wait 없음** - Experience 활성화는 진행하면서 background 로 로드.
