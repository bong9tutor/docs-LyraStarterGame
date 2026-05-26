# Lyra 에셋 비동기 로딩 학습 문서 섹션 설계

확인일: 2026-05-25  
목적: 라이라 에셋 비동기 로딩 분석·학습 문서를 기능별로 어떻게 나눌지 결정 + **다른 UE 프로젝트로 이식 가능한 스텝 바이 스텝 포팅 가이드 제공**

이 문서는 검증 원장 [`asset-loading-code-analysis.md`](asset-loading-code-analysis.md) · [`asset-loading-blueprint-analysis.md`](asset-loading-blueprint-analysis.md) 와 Epic 공식 문서 ([`asset-loading-references.md`](asset-loading-references.md) 참조) 를 바탕으로, 후속 학습 문서를 어떤 기능 단위로 쪼개야 읽기 쉽고 **다른 프로젝트로 옮기기 좋은지** 정리한다.

## 결론

라이라 에셋 비동기 로딩 학습 문서는 **3층 구조 + 포팅 가이드 1절** 로 나눈다:

- **층 1: 부팅 로딩** — `ULyraAssetManager` + `StartupJob` + `ULyraGameData`. 게임 시작 시 한 번.
- **층 2: Experience 로딩** — `ExperienceManagerComponent` 7단계 + AssetBundle + GameFeature. map 전환·매치 시작 시.
- **층 3: 런타임 로딩** — `GetAsset<T>` template + soft pointer + `LoadedAssets` keep-in-memory.

추천 상위 섹션 **8개** + **포팅 가이드 (섹션 9, 본 문서 핵심)**.

0. 전체 지도와 학습 경로
1. UAssetManager 파생과 부팅 진입점
2. Startup Job 큐와 진행률 보고
3. ULyraGameData — 전역 데이터 자산 패턴
4. Primary Asset Type 등록 (DefaultGame.ini)
5. Experience 로딩 7단계 state machine
6. AssetBundle 메타 — Client/Server 자동 수집
7. BP 측 비동기 진입점 (AsyncAction_ExperienceReady)
8. Loading Screen 통합 (CommonLoadingScreen + LoadingScreenSubsystem)
9. **★ 다른 프로젝트로 이식 — 스텝 바이 스텝 포팅 가이드**

## 조사 근거

### 기존 검증 원장 구조

| 문서 | 강점 | 학습 목차로 부족한 점 |
|------|------|---------------------|
| [`asset-loading-code-analysis.md`](asset-loading-code-analysis.md) | 9종 핵심 C++ 책임·런타임 흐름·디버깅 체크리스트 + STARTUP_JOB 매크로 동작 + 7단계 state machine | 코드 중심이라 "어떤 학습 순서로 읽으면 흐름이 잡히는가" 가 분리되어야 한다 |
| [`asset-loading-blueprint-analysis.md`](asset-loading-blueprint-analysis.md) | 8개 PrimaryAssetType + DefaultGameData CDO + 12 widget AssetBundleData 자동 수집 검증 | 설정 중심이라 "왜 이렇게 설정했는가, 다른 프로젝트는 어디까지 복사해야 하는가" 가 분리되어야 한다 |

따라서 후속 학습 문서는 두 원장을 대체하지 않고, **학습 동선** + **포팅 동선** 으로 재배열한다.

### 핵심 코드/설정 분포

| 책임 | 위치 | 학습 섹션 |
|------|------|----------|
| AssetManager 등록 | `Config/DefaultEngine.ini` 의 `AssetManagerClassName` + `[LyraAssetManager]` 절 | 섹션 1 |
| Startup Job 큐 | `LyraAssetManager.cpp::StartInitialLoading` + `LyraAssetManagerStartupJob` | 섹션 2 |
| 전역 데이터 자산 | `LyraGameData.h/.cpp` + `Content/DefaultGameData.uasset` | 섹션 3 |
| Primary Asset Type | `Config/DefaultGame.ini` 의 `[/Script/Engine.AssetManagerSettings]` | 섹션 4 |
| Experience 로딩 | `LyraExperienceManagerComponent.h/.cpp` (7단계 state) | 섹션 5 |
| AssetBundle 메타 | `Source/LyraGame/` 9곳의 `UPROPERTY(meta=(AssetBundles=...))` | 섹션 6 |
| BP 비동기 진입 | `AsyncAction_ExperienceReady.h/.cpp` (4 step) | 섹션 7 |
| Loading Screen | `LyraLoadingScreenSubsystem.h` + CommonLoadingScreen 설정 | 섹션 8 |

## 권장 문서 구조

### 0. 전체 지도와 학습 경로

역할: 처음 읽는 사람이 라이라 비동기 로딩의 3층 구조를 10분 안에 잡는 섹션.

다룰 내용:
- 3층 구조 (부팅 / Experience / 런타임) + 책임 분리
- "부팅 → 자산 인덱싱 → GameData 로드 → GameMode → Experience 선택 → bundle 비동기 로드 → GameFeature 활성화 → Action 실행" 흐름도
- 본 사이트의 후속 섹션 진입 가이드

작성 우선순위: 최상

### 1. UAssetManager 파생과 부팅 진입점

역할: 라이라가 엔진 AssetManager 를 어떻게 교체하고 부팅을 인터셉트하는지.

핵심 질문:
- 왜 `UAssetManager` 를 파생해야 하는가?
- `AssetManagerClassName` ini 키가 어떻게 동작하는가?
- `[/Script/LyraGame.LyraAssetManager]` 절의 `LyraGameDataPath` · `DefaultPawnData` 가 어떻게 ini 에서 멤버로 매핑되는가? (`UPROPERTY(Config)` 패턴)
- `StartInitialLoading()` 오버라이드 vs `PreBeginPIE` 오버라이드의 차이는?

주요 대상:
- `ULyraAssetManager` 클래스 골격
- `UCLASS(Config = Game)` + `UPROPERTY(Config)` 패턴
- `Get()` static singleton — `GEngine->AssetManager` cast
- `DefaultEngine.ini` 의 3개 핵심 설정

작성 우선순위: 최상

### 2. Startup Job 큐와 진행률 보고

역할: 부팅 시 비동기 작업 등록·실행·진행률 누적의 정확한 메커니즘.

핵심 질문:
- `STARTUP_JOB` / `STARTUP_JOB_WEIGHTED` 매크로는 무엇을 하는가?
- `FLyraAssetManagerStartupJob::DoJob()` 의 `WaitUntilComplete(0.0f, false)` 가 의미하는 것은?
- 진행률 가중치 (weight) 가 어떻게 누적되어 로딩 화면 진행률로 표시되는가?
- Dedicated server 측 진행률 분기는?
- `UpdateInitialGameContentLoadPercent` 후크에 무엇을 연결할 수 있는가?

주요 대상:
- `STARTUP_JOB_WEIGHTED` 매크로 (람다 캡처 + 람다 시그니처)
- `FLyraAssetManagerStartupJob` USTRUCT
- `SubstepProgressDelegate` 의 60Hz throttle
- `DoAllStartupJobs` 의 누적 progress 계산

작성 우선순위: 상

### 3. ULyraGameData — 전역 데이터 자산 패턴

역할: "어디서든 접근 가능한 전역 자산" 패턴의 라이라 구현.

핵심 질문:
- 왜 `UPrimaryDataAsset` 파생인가? 단순 UDataAsset 과의 차이는?
- `TSoftClassPtr<UGameplayEffect>` 가 hard reference 와 어떻게 다른가?
- `Get()` static 이 `ULyraAssetManager::Get().GetGameData()` 를 통해 어떻게 lazy 로드되는가?
- 새 전역 데이터 (예: `DefaultCameraSettings`) 를 추가하려면 어떤 절차?

주요 대상:
- `ULyraGameData` 의 3개 멤버
- `GetOrLoadTypedGameData<T>` template
- `LoadGameDataOfClass` 의 editor 분기 (`GIsEditor` → 동기 로드)
- Fatal log 처리 — GameData 실패는 복구 불가

작성 우선순위: 상

### 4. Primary Asset Type 등록 (DefaultGame.ini)

역할: 라이라의 8개 type 이 어떤 효과를 만드는가.

핵심 질문:
- `PrimaryAssetTypesToScan` 의 각 필드가 무엇을 의미하는가?
- `-` 와 `+` 의 ini 문법은 무엇인가? (배열 항목 제거/추가)
- `bHasBlueprintClasses=true` 는 언제 필요한가?
- `CookRule=AlwaysCook` 의 의미는?
- `bIsEditorOnly=true` 는 (예: `PrimaryAssetLabel`) 어떤 자산에 적합한가?

주요 대상:
- 8개 type 전체 표 (이미 blueprint-analysis 에 검증됨)
- Map type 의 SpecificAssets — FrontEnd 와 DefaultEditor map 명시
- LyraExperienceActionSet — Directories 비어 있는데 plugin 측에서 자동 발견되는 메커니즘
- Engine 기본 type 2개 (`Map`, `PrimaryAssetLabel`) 를 `-` 로 제거 후 라이라 정책으로 `+` 추가하는 패턴

작성 우선순위: 상

### 5. Experience 로딩 7단계 state machine

역할: Experience 가 시작되어 게임 가능 상태까지의 모든 단계.

핵심 질문:
- `ELyraExperienceLoadState` 7값의 정확한 의미는?
- `SetCurrentExperience` 와 `OnRep_CurrentExperience` 의 server/client 동기화는?
- `ChangeBundleStateForPrimaryAssets` 호출의 NetMode 별 분기는?
- `FLyraBundles::Equipped` 가 무엇인가?
- GameFeature URL 변환과 일괄 활성화 메커니즘은?
- `NumGameFeaturePluginsLoading` 카운트다운이 어떻게 끝나는가?
- Chaos testing delay CVar 의 사용처는?
- Priority 3단 콜백의 용도 분리는?

주요 대상:
- 7단계 state diagram
- `StartExperienceLoad` 의 BundleAssetList + BundlesToLoad 결정 로직
- `OnExperienceLoadComplete` → `OnExperienceFullLoadCompleted` 흐름
- `CallOrRegister_OnExperienceLoaded_*` 3종 (HighPriority / Normal / LowPriority)
- `ShouldShowLoadingScreen` 가상함수 → CommonLoadingScreen 통합

작성 우선순위: 최상

### 6. AssetBundle 메타 — Client/Server 자동 수집

역할: 라이라가 dedicated server 메모리·디스크를 절약하는 방법.

핵심 질문:
- `UPROPERTY(meta=(AssetBundles="Client,Server"))` 가 어떻게 자산을 분류하는가?
- 9곳의 메타 사용처가 모두 무엇을 분류하는가?
- 왜 UI 자산은 `Client` 만이고 게임플레이 자산은 `Client,Server` 양쪽인가?
- `UpdateAssetBundleData()` (Editor only) 가 언제 호출되는가?
- runtime 의 `ChangeBundleStateForPrimaryAssets(asset, [Client])` 가 정확히 무엇을 로드하는가?

주요 대상:
- 9곳 메타 사용처 표 (이미 검증)
- `B_LyraDefaultExperience` 의 AssetBundleData 검증 사례 (1개)
- `LAS_ShooterGame_StandardHUD` 의 12개 widget 검증 사례
- `LoadStateClient` / `LoadStateServer` 와 `FLyraBundles::Equipped` 의 차이

작성 우선순위: 상

### 7. BP 측 비동기 진입점 (AsyncAction_ExperienceReady)

역할: BP 코드가 Experience 로딩 완료를 기다리는 패턴.

핵심 질문:
- `UBlueprintAsyncActionBase` 파생 패턴은?
- 4 step state machine 이 왜 필요한가? (GameState 가 늦게 spawn 될 수 있음)
- 이미 로드된 경우 1 frame 지연하는 이유는?
- `OnReady` BP delegate 가 어떻게 fire 되는가?
- `RegisterWithGameInstance` 의 의미는? (GC 방지)
- `SetReadyToDestroy()` 호출 시점은?

주요 대상:
- 4 step 함수 시그니처 + 의도
- `WaitForExperienceReady` static factory
- `GameStateSetEvent.AddUObject` 패턴
- `CallOrRegister_OnExperienceLoaded` 등록

작성 우선순위: 중

### 8. Loading Screen 통합 (CommonLoadingScreen + LoadingScreenSubsystem)

역할: 로딩 화면이 map 전환을 가로질러 표시되는 메커니즘.

핵심 질문:
- `ILoadingProcessInterface` 가 어떻게 동작하는가?
- CommonLoadingScreen 플러그인이 매 tick 무엇을 polling 하는가?
- `LoadingScreenWidget` (host) 과 `LoadingScreenWidgetClass` (content) 의 분리는?
- `UGameInstanceSubsystem` 이 왜 map 전환을 살아남는가?
- `OnLoadingScreenWidgetChanged` delegate 가 누구에게 broadcast 되는가?

주요 대상:
- `ULyraLoadingScreenSubsystem` API
- `LyraExperienceManagerComponent::ShouldShowLoadingScreen` 구현
- `CommonLoadingScreenSettings.LoadingScreenWidget` ini 설정
- Host widget (`W_LoadingScreen_Host`) ↔ Content widget 분리

작성 우선순위: 중

---

## ★ 섹션 9 — 다른 프로젝트로 이식: 스텝 바이 스텝 포팅 가이드

**본 학습 문서의 가장 중요한 절.** 라이라의 비동기 로딩 시스템을 새 UE 프로젝트로 옮길 때 따라할 체크리스트.

### ★ 사전 경고 — 포팅 전에 반드시 읽을 사실 4가지

1. **ini 절 위치**: 라이라의 핵심 설정 4개 절 (`[/Script/LyraGame.LyraAssetManager]` · `[/Script/Engine.AssetManagerSettings]` · `[/Script/GameFeatures.GameFeaturesSubsystemSettings]` · `[/Script/CommonLoadingScreen.CommonLoadingScreenSettings]`) 은 모두 **`DefaultGame.ini`** 에 있음. `DefaultEngine.ini` 에는 `AssetManagerClassName` 과 `GlobalDefaultGameMode` 만. 이 차이를 무시하고 복사하면 설정이 적용 안 됨.
2. **Experience definition 자체는 동기 로드**: `SetCurrentExperience(FPrimaryAssetId)` 의 `AssetPath.TryLoad()` 가 blocking 호출. 소스에 `//@TODO: Async load the experience definition itself` 주석 있음. 비동기는 그 다음 단계 (bundle + GameFeature) 부터.
3. **DefaultGameData 의 soft class 멤버는 즉시 로드 보장 없음**: `TSoftClassPtr<UGameplayEffect>` 이므로 GameData 자산 로드 ≠ GE 클래스 로드. 사용 시점에 `GetSubclass` 가 동기 로드. 첫 호출 시 hitch 가능 — preload 가 필요하면 startup job 추가 필요.
4. **AssetBundleData 수집은 2가지 메커니즘**: `meta=(AssetBundles)` 자동 수집 + `AddAdditionalAssetBundleData` override. 커스텀 GameFeatureAction 에서 자산 배열을 들고 있다면 override 필요 — 자동 수집만으로는 안 됨 (라이라 사례: `GameFeatureAction_AddWidget.cpp:34-38` 의 `Widgets[]` 11개).

### 포팅 범위 결정 (3 옵션)

먼저 어디까지 가져갈지 결정. 옵션마다 작업량이 다름:

| 옵션 | 가져갈 부분 | 작업 시간 (대략) | 적합한 경우 |
|------|-----------|-----------------|------------|
| **A (최소)** | AssetManager 파생 + Primary Asset Type 등록 | 1시간 | "전역 데이터 자산 1개만 필요" |
| **B (중간)** | A + GameData 패턴 + Startup Job 큐 | 4시간 | "부팅 시 비동기 로드 + 진행률 보고 필요" |
| **C (전체)** | B + Experience 시스템 + GameFeature 통합 + Loading Screen | 1-2일 | "라이라 풍의 데이터 주도 게임 모드 시스템 필요" |

### 옵션 A — 최소 포팅 (1시간)

**목표**: 새 프로젝트가 `UAssetManager` 파생을 사용 + Primary Asset Type 1~2개 등록.

#### A.1 — Build.cs 의존성 추가

`Source/{프로젝트명}/{프로젝트명}.Build.cs` 의 `PublicDependencyModuleNames` 에 `"GameplayTags"` 가 있는지 확인 (대부분 기본). 추가 의존성은 없음.

#### A.2 — AssetManager 파생 클래스 작성

`Source/{프로젝트명}/System/{Prefix}AssetManager.h`:

```cpp
#pragma once
#include "Engine/AssetManager.h"
#include "{Prefix}AssetManager.generated.h"

UCLASS(Config = Game)
class {APITAG} U{Prefix}AssetManager : public UAssetManager {
    GENERATED_BODY()
public:
    U{Prefix}AssetManager();
    static U{Prefix}AssetManager& Get();

protected:
    virtual void StartInitialLoading() override;
};
```

`.cpp`:

```cpp
U{Prefix}AssetManager& U{Prefix}AssetManager::Get() {
    check(GEngine);
    if (auto* Singleton = Cast<U{Prefix}AssetManager>(GEngine->AssetManager)) return *Singleton;
    UE_LOG(LogTemp, Fatal, TEXT("AssetManagerClassName 설정 확인 — {Prefix}AssetManager 여야 함"));
    return *NewObject<U{Prefix}AssetManager>();
}

void U{Prefix}AssetManager::StartInitialLoading() {
    Super::StartInitialLoading();
    // TODO: 여기에 라이라 풍의 startup job 추가 (옵션 B)
}
```

#### A.3 — DefaultEngine.ini 에 AssetManagerClassName 등록

`Config/DefaultEngine.ini` 에 (또는 기존 `[/Script/Engine.Engine]` 절 안에) 추가:

```ini
[/Script/Engine.Engine]
AssetManagerClassName=/Script/{프로젝트명}.{Prefix}AssetManager
```

**검증**: 에디터 재시작 후 `LogAssetManager` 로그에서 새 클래스명 확인.

**★ 위치 주의**: `AssetManagerClassName` 만 `DefaultEngine.ini` 에 둠. AssetManager 의 config 속성 (`LyraGameDataPath` 등) 과 `PrimaryAssetTypesToScan` 은 A.4 이후의 **`DefaultGame.ini`** 에. 라이라 패턴이 그렇고, 다른 위치에 두면 엔진이 못 읽음.

#### A.4 — Primary Asset Type 1개 등록 (옵션)

새 type 이 필요하면 (예: `MyGameData`):

`Config/DefaultGame.ini`:

```ini
[/Script/Engine.AssetManagerSettings]
+PrimaryAssetTypesToScan=(PrimaryAssetType="MyGameData",AssetBaseClass="/Script/{프로젝트명}.MyGameData",bHasBlueprintClasses=False,bIsEditorOnly=False,Directories=,SpecificAssets=("/Game/MyGameData.MyGameData"),Rules=(Priority=-1,ChunkId=-1,bApplyRecursively=True,CookRule=AlwaysCook))
```

**완료 검증**: 에디터에서 `Window → Asset Manager` → `Primary Asset Types` 탭에 새 type 표시.

### 옵션 B — 중간 포팅 (4시간) — A 위에 추가

**목표**: 전역 데이터 자산 + 부팅 시 비동기 로드 + 진행률 보고.

#### B.1 — StartupJob 패턴 복사

`Source/{프로젝트명}/System/{Prefix}AssetManagerStartupJob.h` + `.cpp` 를 라이라에서 직접 복사. 클래스명만 prefix 교체.

복사 위치:
- 원본: `LyraStarterGame/Source/LyraGame/System/LyraAssetManagerStartupJob.h` + `.cpp`
- 변경: `Lyra` → 프로젝트 prefix

이 파일은 의존성이 `Engine/StreamableManager.h` 만이라 그대로 복사 가능.

#### B.2 — AssetManager 에 startup job 추가

`{Prefix}AssetManager.cpp` 의 `StartInitialLoading` 안에 매크로 추가:

```cpp
#define STARTUP_JOB_WEIGHTED(JobFunc, JobWeight) \
    StartupJobs.Add(F{Prefix}AssetManagerStartupJob(#JobFunc, [this](const F{Prefix}AssetManagerStartupJob& StartupJob, TSharedPtr<FStreamableHandle>& LoadHandle){JobFunc;}, JobWeight))
#define STARTUP_JOB(JobFunc) STARTUP_JOB_WEIGHTED(JobFunc, 1.f)

void U{Prefix}AssetManager::StartInitialLoading() {
    Super::StartInitialLoading();
    STARTUP_JOB_WEIGHTED(GetMyGameData(), 25.f);
    DoAllStartupJobs();
}
```

`DoAllStartupJobs` 도 라이라에서 복사 (`LyraAssetManager.cpp` 의 같은 이름 함수).

#### B.3 — GameData 전역 자산 패턴 작성

`Source/{프로젝트명}/System/MyGameData.h`:

```cpp
#pragma once
#include "Engine/DataAsset.h"
#include "MyGameData.generated.h"

UCLASS(BlueprintType, Const)
class {APITAG} UMyGameData : public UPrimaryDataAsset {
    GENERATED_BODY()
public:
    static const UMyGameData& Get();
    
    // 여기에 전역 자산 멤버 추가
    UPROPERTY(EditDefaultsOnly)
    TSoftClassPtr<class UGameplayEffect> MyGlobalEffect;
};
```

`AssetManager` 에 `GetMyGameData()` 추가 + `LoadGameDataOfClass` 헬퍼 (라이라에서 복사):

```cpp
// AssetManager.h
template <typename GameDataClass>
const GameDataClass& GetOrLoadTypedGameData(const TSoftObjectPtr<GameDataClass>& DataPath);

const UMyGameData& GetMyGameData();

protected:
UPROPERTY(Config)
TSoftObjectPtr<UMyGameData> MyGameDataPath;

UPROPERTY(Transient)
TMap<TObjectPtr<UClass>, TObjectPtr<UPrimaryDataAsset>> GameDataMap;
```

#### B.4 — DefaultGame.ini 에 GameData 경로 등록

★ **`DefaultGame.ini`** 에 (라이라가 `[/Script/LyraGame.LyraAssetManager]` 를 `DefaultGame.ini:54` 에 두는 패턴 — `DefaultEngine.ini` 가 아님):

```ini
[/Script/{프로젝트명}.{Prefix}AssetManager]
MyGameDataPath=/Game/MyGameData.MyGameData
```

#### B.5 — 자산 생성

에디터에서 `Content/MyGameData.uasset` 생성 (`UMyGameData` 인스턴스). 전역 멤버 채워 넣기.

**완료 검증**: 부팅 시 로그에서 `Startup job "GetMyGameData()" took N.NN seconds to complete` 출력 확인.

### 옵션 C — 전체 포팅 (1-2일) — B 위에 추가

**목표**: Experience 시스템 + GameFeature 통합 + Loading Screen.

#### C.1 — 의존성 플러그인 활성화

`.uproject` 에 다음 플러그인 추가 (또는 에디터 Plugins 메뉴에서):
- `GameFeatures` (엔진 기본, 활성화만)
- `ModularGameplay` (엔진 기본, 활성화만)
- `CommonLoadingScreen` (엔진 Experimental, 활성화)

`Source/{프로젝트명}/{프로젝트명}.Build.cs` 의 `PublicDependencyModuleNames` 에 추가:
```csharp
"GameFeatures",
"ModularGameplay",
"CommonLoadingScreen",
"GameplayAbilities",   // GameFeatureAction_AddAbilities 사용 시
"EnhancedInput",       // GameFeatureAction_AddInputBinding 사용 시
```

#### C.2 — Experience Definition 4종 클래스 복사

라이라에서 `Source/LyraGame/GameModes/` 의 4개 파일을 직접 복사 + prefix 교체:
- `LyraExperienceDefinition.h/.cpp` → `MyExperienceDefinition.h/.cpp`
- `LyraExperienceActionSet.h/.cpp` → `MyExperienceActionSet.h/.cpp`
- `LyraExperienceManager.h/.cpp` (PIE 멀티세션 추적 — 보조)
- `LyraExperienceManagerComponent.h/.cpp` (핵심 — 7단계 state machine)
- `AsyncAction_ExperienceReady.h/.cpp` (BP 진입점)

**의존성 정리**: `#include "LyraLogChannels.h"` → 새 LogChannel 정의 또는 `LogTemp` 로 대체. `#include "Settings/LyraSettingsLocal.h"` → 사용처 확인 후 제거 가능.

#### C.3 — GameMode 가 Experience 선택하도록

새 `MyGameMode` 의 `InitGame` 또는 `BeginPlay` 안에서:

```cpp
auto* Component = GameState->FindComponentByClass<UMyExperienceManagerComponent>();
Component->SetCurrentExperience(FPrimaryAssetId(MyExperienceType, MyExperienceAssetName));
```

`GameState` 의 `Components` 에 `MyExperienceManagerComponent` 추가 (또는 GameMode 가 `AddComponent` 호출).

#### C.4 — Primary Asset Type 4개 등록 (DefaultGame.ini)

```ini
[/Script/Engine.AssetManagerSettings]
+PrimaryAssetTypesToScan=(PrimaryAssetType="MyExperienceDefinition",AssetBaseClass="/Script/{프로젝트명}.MyExperienceDefinition",bHasBlueprintClasses=True,bIsEditorOnly=False,Directories=((Path="/Game/Experiences")),SpecificAssets=,Rules=(Priority=-1,ChunkId=-1,bApplyRecursively=True,CookRule=AlwaysCook))
+PrimaryAssetTypesToScan=(PrimaryAssetType="MyExperienceActionSet",AssetBaseClass="/Script/{프로젝트명}.MyExperienceActionSet",bHasBlueprintClasses=False,bIsEditorOnly=False,Directories=,SpecificAssets=,Rules=(Priority=-1,ChunkId=-1,bApplyRecursively=True,CookRule=AlwaysCook))
+PrimaryAssetTypesToScan=(PrimaryAssetType="GameFeatureData",AssetBaseClass="/Script/GameFeatures.GameFeatureData",bHasBlueprintClasses=False,bIsEditorOnly=False,Directories=,SpecificAssets=,Rules=(Priority=-1,ChunkId=-1,bApplyRecursively=True,CookRule=AlwaysCook))
+PrimaryAssetTypesToScan=(PrimaryAssetType="Map",AssetBaseClass="/Script/Engine.World",bHasBlueprintClasses=False,bIsEditorOnly=False,Directories=((Path="/Game/Maps")),SpecificAssets=,Rules=(Priority=-1,ChunkId=-1,bApplyRecursively=True,CookRule=AlwaysCook))
```

**중요**: `bHasBlueprintClasses=true` 는 ExperienceDefinition 만 (BP 파생 Experience 자산 indexing 위해).

#### C.5 — GameFeature 플러그인 작성 (옵션)

새 Game Feature 가 필요하면 에디터 `Plugins → New Plugin → Game Feature (Modular)`. 생성 후 `.uplugin` 편집:

```json
{
    "EnabledByDefault": false,
    "ExplicitlyLoaded": true
}
```

이 두 키가 라이라 패턴의 핵심. `false`/`true` 가 아니면 자동 로드되어 Experience 데이터 주도가 깨짐.

#### C.6 — AssetBundle 메타 적용 (자동 수집)

자산 참조 멤버에 메타 추가:

```cpp
// UI 자산
UPROPERTY(EditAnywhere, meta=(AssetBundles="Client"))
TSoftClassPtr<UUserWidget> MyWidget;

// 게임플레이 자산
UPROPERTY(EditAnywhere, meta=(AssetBundles="Client,Server"))
TSoftClassPtr<UGameplayAbility> MyAbility;
```

**검증**: 자산 저장 후 Monolith 또는 에디터에서 PrimaryDataAsset 의 `AssetBundleData.Bundles[Client].BundleAssets` 에 자동 등장 확인.

#### C.6b — ★ 커스텀 GameFeatureAction 이 자산 배열을 들고 있다면 `AddAdditionalAssetBundleData` override

라이라 사례: `UGameFeatureAction_AddWidgets` 의 `Widgets[]` 11개는 메타 자동 수집으로 안 잡힘 — override 가 추가:

```cpp
// MyGameFeatureAction_AddFoo.h
virtual void AddAdditionalAssetBundleData(FAssetBundleData& AssetBundleData) override;

// MyGameFeatureAction_AddFoo.cpp
#if WITH_EDITORONLY_DATA
void UMyGameFeatureAction_AddFoo::AddAdditionalAssetBundleData(FAssetBundleData& AssetBundleData) {
    for (const FMyFooEntry& Entry : FooArray) {
        AssetBundleData.AddBundleAsset(
            UGameFeaturesSubsystemSettings::LoadStateClient,
            Entry.AssetPtr.ToSoftObjectPath().GetAssetPath());
    }
}
#endif
```

**확인 항목**:
- 커스텀 GameFeatureAction 에 `TArray<FMyStruct>` 멤버가 있고, struct 안에 soft pointer 가 있나? → 메타 자동 수집 안 됨 → override 필요
- 한 자산이 여러 bundle 에 등록되어야 하나? → override 로 둘 다 호출
- `WITH_EDITORONLY_DATA` 가드 — runtime 에 호출 안 됨 (cooking 시점)

**검증**: 에디터에서 자산 save → reopen → CDO 의 `AssetBundleData.Bundles[Client].BundleAssets` 가 메타로 잡힌 것 + override 가 추가한 것 둘 다 포함하는지 확인.

#### C.7 — Loading Screen 통합

`Config/DefaultGame.ini` (★ 라이라가 `DefaultGame.ini:83` 에 두는 패턴):

```ini
[/Script/CommonLoadingScreen.CommonLoadingScreenSettings]
LoadingScreenWidget=/Game/UI/W_MyLoadingHost.W_MyLoadingHost_C
```

`MyExperienceManagerComponent` 가 `ILoadingProcessInterface` 구현 (라이라 코드 그대로 복사). `ShouldShowLoadingScreen` 가 `LoadState != Loaded` 인 동안 true 반환.

(옵션) `ULyraLoadingScreenSubsystem` 복사 — map 전환 너머 widget 클래스 유지 필요할 때만.

#### C.8 — 첫 Experience 자산 생성

에디터에서:
1. `Content/Experiences/B_MyDefaultExperience.uasset` 생성 (`MyExperienceDefinition` BP 파생).
2. `DefaultPawnData` 지정 (기존 또는 새 PawnData 자산).
3. `GameFeaturesToEnable` 에 활성화할 플러그인 이름 추가.
4. `Actions[]` 에 `GameFeatureAction_AddWidgets` 등 추가.

#### C.9 — 부팅 → Experience 활성화 통합 검증

전체 흐름 검증:
1. 에디터에서 PIE 시작.
2. 로그 `LogTemp` (또는 새 LogChannel) 에서 `Startup job ... took ... seconds` 출력 확인.
3. GameState 가 spawn 되고 `SetCurrentExperience` 호출 로그 확인.
4. `OnExperienceLoadComplete` → `OnExperienceFullLoadCompleted` → `LoadState = Loaded` 로그 확인.
5. BP 측에서 `Wait For Experience Ready` 노드 사용 시 `OnReady` 발화 확인.
6. 로딩 화면이 `LoadState != Loaded` 동안 표시되고 `Loaded` 도달 시 사라지는지 확인.

### 흔한 포팅 함정 — 체크리스트

| 함정 | 증상 | 해결 |
|------|------|------|
| `AssetManagerClassName` 미설정 | `Cast` fail + Fatal log | `DefaultEngine.ini` 의 `[/Script/Engine.Engine].AssetManagerClassName` 확인 |
| ★ ini 절 위치 혼동 — `[LyraAssetManager]` / `[GameFeaturesSubsystemSettings]` / `[CommonLoadingScreenSettings]` 를 `DefaultEngine.ini` 에 둠 | 설정이 적용 안 됨 (절은 있는데 키가 안 읽힘) | 4개 절 모두 **`DefaultGame.ini`** 로 이동. `DefaultEngine.ini` 는 `AssetManagerClassName` + `GlobalDefaultGameMode` 만 |
| Primary Asset Type `Directories` 가 잘못된 경로 | 자산이 indexing 안 됨 → Experience 로드 실패 | 에디터 `Window → Asset Manager` 에서 type 확인 |
| `bHasBlueprintClasses=false` 인데 BP Experience 사용 | BP Experience 자산이 indexing 안 됨 | 해당 type 의 ini 항목을 `true` 로 수정 |
| `ExplicitlyLoaded=false` 인 GameFeature | 부팅 시 자동 로드 → Experience 데이터 주도 깨짐 | `.uplugin` 의 `ExplicitlyLoaded=true` 로 |
| AssetBundle 메타 안 추가 | dedicated server 가 runtime 에 widget 자산 로드 → 메모리 낭비 (cook 측은 별도 검증) | UI 자산 멤버에 `meta=(AssetBundles="Client")` 추가 |
| ★ 커스텀 GameFeatureAction 의 자산 배열이 bundle 에 안 잡힘 | runtime bundle load 시 자산 누락 → 화면에 안 뜸 | `AddAdditionalAssetBundleData` override 작성 (위 C.6b 참고) |
| `GameData` 클래스 미등록 | `Get()` 호출 시 Fatal log | `PrimaryAssetTypesToScan` 에 type + `[AssetManager]` 절에 path 둘 다 |
| ★ GameData 의 soft class 가 첫 사용 시 hitch | 게임 중 갑작스러운 frame 멈춤 | 자주 쓰이는 GE 는 startup job 에서 `GetSubclass` 호출로 preload (또는 strong reference 로 바꿈) |
| `CallOrRegister_OnExperienceLoaded` 미사용 | Experience 가 아직 로드 안 됐는데 코드 실행 → race condition | `IsExperienceLoaded` 검사 또는 callback 등록 패턴 사용 |
| `RegisterWithGameInstance` 안 호출 | BP AsyncAction 이 GC 됨 → callback 안 옴 | `WaitForExperienceReady` 의 `Action->RegisterWithGameInstance(World)` 확인 |
| ★ Startup progress 가 화면에 안 보임 | 진행률 bar 가 안 움직임 | `FLyraAssetManagerStartupJob` 의 60Hz throttle 부등호 방향 확인 (`Now - LastUpdate > 1.0/60` 이 정상 — 라이라 코드는 `LastUpdate - Now > 1.0/60` 으로 의심) + job 의 람다가 `LoadHandle` 인자를 채우는지 |

### 포팅 후 측정 (필수 검증 4종)

성능·정상성 측정 방법:

1. **부팅 시간**: 명령줄에 `-LogAssetLoads` + `-LogLoadTimes` → 모든 동기 로드 시간 출력. `Startup job "..." took N.NN seconds` 로그 패턴 확인.
2. **메모리**: `Lyra.DumpLoadedAssets` (또는 동일 이름 콘솔 명령 작성) → keep-in-memory 자산 목록. 의도하지 않은 keep 가 있으면 `bKeepInMemory=false` 적용.
3. **Experience 로딩 시간**: `LogLyraExperience` (또는 새 채널) 에서 `StartExperienceLoad` ↔ `OnExperienceFullLoadCompleted` 사이 timestamp 차이.
4. **★ 필수 — dedicated server cook 산출물 비교**: AssetBundle 적용 전후 `cooked-windows-server` 와 `cooked-windows-client` 폴더 크기를 직접 비교. UI 자산이 server cooked 산출물에서 제외되는지 검증 (runtime bundle 로드 정책 vs 실제 cook 결과는 다를 수 있음 — chunk/stage 설정, 다른 참조 경로 때문).

---

## 세부 학습 항목 — 기능 키워드 검증 매핑

각 섹션이 다룰 **개별 기능 단위** 를 키워드로 정리. `✅` = 코드/CDO 직접 확인 · `◐` = 패턴 일반 개념 (구현 라이라 확인) · `△` = UE 일반 개념.

### 섹션 1 — AssetManager 파생

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `UAssetManager` 파생 | `LyraAssetManager.h` | ✅ |
| `AssetManagerClassName` ini | `DefaultEngine.ini:26` | ✅ |
| `UPROPERTY(Config)` 패턴 | `LyraGameDataPath` · `DefaultPawnData` | ✅ |
| `Get()` static singleton | `GEngine->AssetManager` cast | ✅ |
| `StartInitialLoading` 오버라이드 | `LyraAssetManager.cpp` | ✅ |
| `PreBeginPIE` 오버라이드 (editor) | 동일 파일 | ✅ |

### 섹션 2 — Startup Job

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `STARTUP_JOB_WEIGHTED` 매크로 | `LyraAssetManager.cpp` | ✅ |
| `FLyraAssetManagerStartupJob` USTRUCT | `LyraAssetManagerStartupJob.h` | ✅ |
| `WaitUntilComplete(0.0f, false)` 블로킹 | `DoJob()` | ✅ |
| `SubstepProgressDelegate` 60Hz throttle | `UpdateSubstepProgressFromStreamable` | ✅ |
| `DoAllStartupJobs` 누적 진행률 | `LyraAssetManager.cpp` | ✅ |
| Dedicated server 분기 | `IsRunningDedicatedServer()` | ✅ |
| `UpdateInitialGameContentLoadPercent` 후크 | 빈 함수 — 사용자 채움 | ✅ |

### 섹션 3 — GameData 전역 자산

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `UPrimaryDataAsset` 파생 | `LyraGameData.h` | ✅ |
| 3개 GE 클래스 보관 | CDO 검증 (Damage_SetByCaller / Heal_SetByCaller / DynamicTag) | ✅ |
| `GetOrLoadTypedGameData<T>` template | `LyraAssetManager.h` | ✅ |
| `LoadGameDataOfClass` editor 분기 | `GIsEditor` 분기 | ✅ |
| Fatal log 처리 | "This is not recoverable" | ✅ |

### 섹션 4 — Primary Asset Type

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| 8개 type 등록 | `DefaultGame.ini` | ✅ |
| `-` 후 `+` 패턴 | `Map`, `PrimaryAssetLabel` | ✅ |
| `bHasBlueprintClasses=true` 의미 | Experience 만 true | ✅ |
| `CookRule=AlwaysCook` | 7/8 type | ✅ |
| `bIsEditorOnly=true` | PrimaryAssetLabel | ✅ |

### 섹션 5 — Experience 7단계

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `ELyraExperienceLoadState` 7값 | `LyraExperienceManagerComponent.h` | ✅ |
| `SetCurrentExperience` 진입점 | `LyraExperienceManagerComponent.cpp` | ✅ |
| `OnRep_CurrentExperience` 복제 | 동일 파일 | ✅ |
| `ChangeBundleStateForPrimaryAssets` NetMode 분기 | `bLoadClient` / `bLoadServer` | ✅ |
| `FLyraBundles::Equipped` 커스텀 bundle | `LyraAssetManager.cpp` | ✅ |
| GameFeature URL 변환 | `GetPluginURLByName` | ✅ |
| `NumGameFeaturePluginsLoading` 카운트다운 | 동일 파일 | ✅ |
| Chaos testing delay CVar | `lyra.chaos.ExperienceDelayLoad.*` | ✅ |
| Priority 3단 콜백 | `OnExperienceLoaded_*Priority` | ✅ |
| `ShouldShowLoadingScreen` 구현 | line 447 | ✅ |

### 섹션 6 — AssetBundle 메타

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `meta=(AssetBundles="Client,Server")` 9곳 | Rider grep | ✅ |
| UI 자산은 `Client` 만 | `GameFeatureAction_AddWidget.h` | ✅ |
| 게임플레이 자산은 `Client,Server` | `GameFeatureAction_AddAbilities.h` 외 | ✅ |
| `UpdateAssetBundleData()` 자동 수집 | `B_LyraDefaultExperience` 1개 widget CDO | ✅ |
| `LAS_ShooterGame_StandardHUD` 12 widget | CDO 검증 | ✅ |
| `LoadStateClient` / `LoadStateServer` | `LyraExperienceManagerComponent.cpp` | ✅ |

### 섹션 7 — AsyncAction

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `UBlueprintAsyncActionBase` 파생 | `AsyncAction_ExperienceReady.h` | ✅ |
| 4 step state machine | `Step1~Step4` | ✅ |
| `RegisterWithGameInstance` (GC 방지) | `WaitForExperienceReady` | ✅ |
| `GameStateSetEvent.AddUObject` | `Step1_HandleGameStateSet` | ✅ |
| 이미 로드 시 1 frame 지연 | `SetTimerForNextTick` | ✅ |
| `SetReadyToDestroy()` | `Step4_BroadcastReady` | ✅ |

### 섹션 8 — Loading Screen

| 학습 키워드 | Lyra 구현 앵커 | 검증 |
|-------------|----------------|------|
| `ILoadingProcessInterface` 구현 | `LyraExperienceManagerComponent.h` | ✅ |
| `ShouldShowLoadingScreen` 구현 | line 447 | ✅ |
| `UGameInstanceSubsystem` (map 전환 너머) | `LyraLoadingScreenSubsystem.h` | ✅ |
| Host widget vs Content widget | CommonLoadingScreen 설정 + Subsystem | ✅ |
| `OnLoadingScreenWidgetChanged` delegate | `LyraLoadingScreenSubsystem.h` | ✅ |
| `LoadingScreenWidget` ini 설정 | `DefaultEngine.ini` | ✅ |

## HTML 산출물 대응표

위 8개 학습 섹션 + 1개 포팅 가이드 = **HTML 9페이지** 권장. 사양 ([`dynamic-html-spec.md`](dynamic-html-spec.md)) 의 "확장 절차 B" 와 "다중 시스템 구조" 를 따라야 한다 — 파일명 접두어 `lyra-asset-loading-`, 시스템 내 번호.

| 페이지 번호 | HTML 파일 | 포함 섹션 | 목차명 | 권장 학습 블록 |
|-------------|-----------|-----------|--------|----------------|
| 1 | `lyra-asset-loading-overview.html` | 섹션 0 | 학습 목차 | structure (3층 구조) + flow (부팅→Experience→런타임) + reference (학습 경로) |
| 2 | `lyra-asset-loading-assetmanager-bootstrap.html` | 섹션 1 | 학습 목차 | structure (AssetManager 파생) + reference (ini 설정 3종) + recipe (최소 설정 단계) |
| 3 | `lyra-asset-loading-startup-jobs.html` | 섹션 2 | 학습 목차 | structure (StartupJob USTRUCT) + flow (DoJob 동작) + reference (매크로 + 진행률 누적 식) |
| 4 | `lyra-asset-loading-gamedata.html` | 섹션 3 | 학습 목차 | structure (UPrimaryDataAsset 패턴) + reference (DefaultGameData CDO 3개) + recipe (전역 자산 추가) |
| 5 | `lyra-asset-loading-primary-asset-types.html` | 섹션 4 | 학습 목차 | reference (8개 type 표) + decision (ini 필드 의미) + recipe (새 type 등록) |
| 6 | `lyra-asset-loading-experience-state-machine.html` | 섹션 5 | 흐름 목차 | flow (7단계 state) + flow (StartExperienceLoad) + flow (GameFeature 일괄 활성화) + reference (Priority 3단 콜백) |
| 7 | `lyra-asset-loading-asset-bundles.html` | 섹션 6 | 학습 목차 | structure (UPROPERTY 메타) + reference (9곳 사용처 + 12 widget 사례) + decision (Client vs Client,Server 결정) |
| 8 | `lyra-asset-loading-bp-async-loading-screen.html` | 섹션 7 + 8 | 학습 목차 | flow (AsyncAction 4 step) + structure (Loading Screen 통합) + reference (CommonLoadingScreen 설정) |
| 9 | **`lyra-asset-loading-porting-guide.html`** | **★ 섹션 9** | 학습 목차 | recipe (옵션 A 4단계) + recipe (옵션 B 5단계) + recipe (옵션 C 9단계) + decision (옵션 결정 표) + verification (흔한 함정 8종) + verification (포팅 후 측정 4종) |

원칙:
- 페이지 1~6 은 우선순위 "최상~상". 페이지 7~8 은 보조.
- **페이지 9 (포팅 가이드) 가 본 시스템 학습의 핵심 산출물** — 다른 프로젝트로 옮길 때 직접 따라할 체크리스트.

## 검증 등급 유지 항목

| HTML 페이지 | partial / unverified 유지 항목 |
|-------------|-------------------------------|
| `lyra-asset-loading-startup-jobs.html` | `UpdateInitialGameContentLoadPercent` 후크에 무엇을 연결하는지는 라이라가 비워둠 — "사용자 채움" 표기 |
| `lyra-asset-loading-experience-state-machine.html` | Priority 3단 콜백 (HighPriority/Normal/LowPriority) 의 실제 사용 분포는 라이라 측 코드 베이스 전수 조사 필요. 본 시점 ◐ |
| `lyra-asset-loading-asset-bundles.html` | 9곳 메타 사용처 모두 ✅. `UpdateAssetBundleData()` 호출 시점은 엔진 내부 (Editor only) — 라이라 측 control 없음 |
| `lyra-asset-loading-porting-guide.html` | 옵션 A·B·C 단계는 라이라 코드/ini 직접 참조 ✅. "흔한 함정 8종" 중 일부 (예: ChunkId / Asset Registry) 는 라이라 사용 안 함 — 일반 GAS 패턴으로만 노출 |

## 독자별 학습 경로

### 처음 보는 개발자 (라이라 분석 목적)

1. 전체 지도 (섹션 0)
2. AssetManager 파생 (섹션 1)
3. Startup Job (섹션 2)
4. GameData 전역 자산 (섹션 3)
5. Primary Asset Type (섹션 4)
6. Experience 7단계 (섹션 5)

목표는 "부팅 → Experience 활성화 까지의 전체 흐름" 을 한 페이지에 그릴 수 있게 되는 것.

### 다른 프로젝트로 이식하려는 개발자 (본 시스템의 1차 독자)

1. 전체 지도 (섹션 0) — 3층 구조 이해
2. **포팅 가이드 (섹션 9) — 옵션 A/B/C 결정**
3. 선택한 옵션의 단계 따라가며 필요한 섹션 (1~8) 참조
4. 포팅 완료 후 "흔한 함정 8종" + "포팅 후 측정 4종" 으로 검증

목표는 새 UE 프로젝트에 라이라 풍의 데이터 주도 자산 로딩을 구축할 수 있게 되는 것.

### 성능 최적화 담당자

1. AssetBundle 메타 (섹션 6) — server 메모리 절약
2. Startup Job 진행률 (섹션 2) — 부팅 시간 측정
3. Experience 7단계 (섹션 5) — Experience 로딩 시간 측정
4. 런타임 GetAsset (섹션 1 부록) — keep-in-memory 정책

목표는 부팅 시간·dedicated server 메모리·Experience 전환 시간을 측정·개선할 수 있게 되는 것.

## 기존 시스템과의 관계

본 시스템 (`asset-loading`) 은 다른 시스템과 다음 관계:

- **GAS (`gas`)** — `ULyraGameData` 가 3개 GE 클래스 보관, GameFeatureAction_AddAbilities 가 `meta=(AssetBundles="Client,Server")` 사용. 본 시스템 학습 후 GAS 학습으로 자연 이어짐.
- **CommonUI (`ui`)** — GameFeatureAction_AddWidget 이 `meta=(AssetBundles="Client")` 사용 → Experience 활성화 시 widget 자산 자동 로드. UI 학습자도 본 시스템의 섹션 6 (AssetBundle) 알아야 함.
- **Animation (`animation`)** — 라이라 ABP 는 strong reference 가 많아 본 시스템과 직접 관계 적음. 단, `LyraPawnData` 가 `LyraAssetManager.DefaultPawnData` 로 등록되는 점에서 부팅 흐름 연결.

다른 시스템 분석 후 본 시스템을 보면 "왜 그 시스템이 GameFeatureAction 으로 자산을 주입했는지" 의 큰 그림이 잡힌다.
