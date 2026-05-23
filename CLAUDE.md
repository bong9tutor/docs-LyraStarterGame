# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 언어 / Language

**이 저장소에서의 기본 응답 언어는 한국어입니다.** 코드, 식별자, 엔진/엔진 클래스 이름은 원문(영문) 그대로 두고, 설명·분석·문서는 한국어로 작성합니다.

## 프로젝트 개요

**LyraStarterGame** — Epic Games 가 제공하는 Unreal Engine 5.7 공식 샘플 게임("Lyra"). 모듈형(데이터 주도) 게임 아키텍처와 고급 애니메이션·GAS 통합의 레퍼런스 구현입니다. **이 저장소의 목적은 프로젝트의 블루프린트와 C++ 코드를 심층 분석·학습하여 참고 문서/메뉴얼을 생성하는 것**이며, 모든 작업은 코드/에셋 분석과 문서화에 집중합니다.

- 엔진: UE 5.7 (`LyraStarterGame.uproject` 의 `EngineAssociation: "5.7"`)
- C++ 모듈: `LyraGame`(Runtime), `LyraEditor`(Editor) — `Source/` 하위
- 게임 자체는 C++ 골격 + 대량의 블루프린트/데이터 에셋으로 구성됩니다. **게임플레이 로직의 상당 부분은 `.uasset` 블루프린트 안에 존재**하므로, 분석에는 아래 Monolith MCP 사용이 필수입니다.

---

## ⚙️ 블루프린트·에셋 분석: Monolith MCP 사용 (필수)

> **이 프로젝트의 블루프린트/애니메이션/머티리얼/Niagara/GAS/UI 에셋 분석은 반드시 Monolith MCP 를 통해 수행합니다.**

### 왜 Monolith 인가
`.uasset` / `.umap` 은 바이너리 포맷이라 `Read`·`Grep` 같은 텍스트 도구로 내용을 볼 수 없습니다. Monolith 는 Unreal 에디터 안에서 동작하는 플러그인으로, MCP 를 통해 블루프린트 그래프·변수·컴포넌트·함수, 애니메이션 ABP/몽타주, GAS 어빌리티, 머티리얼 그래프 등을 **구조화된 데이터로 직접 조회**합니다. C++ 소스만으로는 게임 동작의 절반밖에 보이지 않으므로, 메뉴얼 작성 시 C++ 분석과 Monolith 블루프린트 분석을 항상 교차 검증하십시오.

### 설정 상태 (구성 완료)
- `.mcp.json` — `monolith` MCP 서버 등록 (`Plugins/Monolith/Scripts/monolith_proxy.bat` — Python 프록시, 에디터 재시작 시 세션 자동 유지)
- `.claude/settings.local.json` — `monolith` 서버 활성화됨
- Monolith 플러그인 설치 위치: `Plugins/Monolith/`
- **전제 조건: Unreal 에디터가 실행 중이어야 Monolith MCP 가 응답합니다** (HTTP 서버 포트 `9316`). 에디터가 꺼져 있으면 `monolith_*` 툴은 "Unreal Editor not running" 오류를 반환합니다 — 이 경우 사용자에게 에디터 실행을 요청하십시오.

### 핵심 네임스페이스 (각 네임스페이스는 단일 `*_query(action, params)` 툴)
| 툴 | 용도 |
|----|------|
| `monolith_discover` | 사용 가능한 네임스페이스/액션 목록 — **분석 시작 시 항상 먼저 호출** |
| `monolith_status` | 서버 상태·인덱스 상태 확인 |
| `blueprint_query` | 블루프린트 그래프/변수/컴포넌트/함수/노드, CDO 프로퍼티, 데이터 테이블·구조체·열거형 |
| `animation_query` | ABP 상태 머신/전이, 몽타주, 블렌드 스페이스, 스켈레톤, IK Rig — **애니메이션 분석의 핵심** |
| `gas_query` | Gameplay Ability / Effect / AttributeSet / 태그 / 큐 |
| `material_query` · `niagara_query` · `ui_query` · `audio_query` | 머티리얼·VFX·UMG·사운드 에셋 |
| `project_query` | 프로젝트 전체 에셋 FTS5 검색, 참조 추적, 게임플레이 태그 검색 |
| `source_query` | 엔진 C++ 심볼/호출 그래프/클래스 계층 (오프라인 인덱스) |
| `editor_query` | 에디터 로그·출력 조회, 에셋 미리보기 스크린샷 캡처 |

### 블루프린트 분석 워크플로우
1. `monolith_status` 로 에디터 연결 확인 → 끊겼으면 사용자에게 에디터 실행 요청
2. `monolith_discover("blueprint")` (또는 대상 네임스페이스)로 액션 시그니처 확인
3. `project_query` 로 대상 에셋 경로 검색 (예: `/Game/Characters/Heroes/...`)
4. `blueprint_query`(`get_blueprint_info` → `get_variables` / `get_components` / `list_graphs` → `get_graph_data`)로 구조 파악
5. 블루프린트가 참조하는 C++ 부모/클래스는 라이더 MCP 로 확인 (아래 `C++ 소스 분석` 절 참조)
6. 발견 내용을 한국어 참고 문서로 정리

---

## 🧩 C++ 소스 분석: 라이더(JetBrains) MCP 사용

> **이 프로젝트의 C++ 소스 코드 분석은 라이더(JetBrains) MCP 를 우선 사용합니다.** Monolith 가 블루프린트·에셋을 담당하면, 라이더 MCP 는 C++ 코드를 담당합니다 — 두 도구를 함께 써야 게임 전체가 보입니다.

### 왜 라이더 MCP 인가
Rider 는 C++ 를 **의미론적으로 인덱싱**하므로, 텍스트 검색(`Grep`)이 놓치거나 오탐하는 심볼 정의·사용처·타입·상속 관계를 정확히 찾습니다. Lyra 의 C++ 계층은 수백 개 클래스가 다중 모듈/플러그인에 걸쳐 있어, IDE 인덱스로 진입점과 클래스 관계를 빠르게 파악할 수 있습니다. 프로젝트 C++ 소스(`Source/`, 각 플러그인)는 Rider 가 자동 인덱싱하므로 별도 설정이 필요 없습니다.

### 연결 조건 및 확인
- MCP 서버 네임스페이스: `jetbrains` (`mcp__jetbrains__*` 툴). 실제 사용 가능 여부는 현재 Claude/Rider 세션 상태에 따라 달라집니다.
- **전제 조건: Rider IDE 가 이 프로젝트를 연 상태로 실행 중이어야 합니다.** 꺼져 있으면 `jetbrains` 툴이 응답하지 않습니다 — 이 경우 사용자에게 Rider 실행을 요청하십시오.
- 분석 시작 시 `get_all_open_file_paths` 또는 `search_symbol("LyraExperienceDefinition")` 같은 가벼운 호출로 연결 상태와 C++ 심볼 인덱스를 확인하십시오.
- 모든 `jetbrains` 툴 호출 시 `projectPath` 에 `D:\Projects\Sample\LyraStarterGame` 을 전달하십시오(모호한 호출 감소).

### 핵심 도구
| 툴 | 용도 |
|----|------|
| `search_symbol` | 클래스/메서드/필드 의미론적 검색 (`include_external=true` 로 엔진 심볼까지 확장) |
| `get_symbol_info` | 심볼의 타입·시그니처·정의 위치 |
| `search_in_files_by_text` / `search_in_files_by_regex` | 파일 내용 검색 |
| `find_files_by_name_keyword` / `find_files_by_glob` | 파일 찾기 |
| `get_file_text_by_path` / `read_file` / `list_directory_tree` | 파일·디렉터리 조회 |
| `get_file_problems` | 컴파일러 에러/경고·코드 인스펙션 |
| `get_solution_projects` / `get_project_dependencies` | 솔루션 모듈·의존성 |

### 분석 도구 역할 분담
| 분석 대상 | 사용 도구 |
|-----------|-----------|
| 블루프린트·애니메이션·머티리얼·Niagara·GAS·UI 등 `.uasset` / `.umap` | **Monolith MCP** (UE 에디터 필요) |
| 프로젝트 C++ 소스 (`Source/`, `Plugins/*/Source/`) | **라이더 MCP** `jetbrains` (Rider 필요) |
| 엔진 C++ 소스 (UE 5.7) | 라이더 MCP `search_symbol(include_external=true)` 또는 Monolith `source_query` |
| 텍스트 설정 파일 (`.ini`, `.Build.cs`, `.uplugin`, `.md`) | `Read` / `Grep` / `Glob` |

---

## 핵심 아키텍처

Lyra 의 핵심은 **하드코딩이 아닌 데이터 주도 + 모듈형 조립**입니다. 아래 다섯 시스템의 상호작용을 이해하면 전체 그림이 잡힙니다.

### 1. Experience 시스템 — 모듈형 게임 모드
하나의 맵이 고정된 게임 모드를 갖지 않습니다. 런타임에 **Experience**(데이터 에셋)를 로드해 게임플레이를 조립합니다.
- `ULyraExperienceDefinition` (`GameModes/`) — `UPrimaryDataAsset`. 활성화할 **Game Feature 플러그인 목록**, **`DefaultPawnData`**, 실행할 **`UGameFeatureAction` 목록**, 조합할 `ULyraExperienceActionSet` 들을 정의.
- `ULyraExperienceManagerComponent` — GameState 에 부착. Experience 와 그것이 요구하는 Game Feature 플러그인을 비동기 로드/활성화하고 완료를 브로드캐스트.
- `ALyraGameMode` / `ALyraGameState` — `ALyraGameMode` 가 월드 세팅·플레이리스트·커맨드라인 등에서 Experience 를 선택하고, `DefaultPawnData` 기반으로 폰을 스폰.
- `ULyraUserFacingExperienceDefinition` — 프론트엔드 메뉴에 노출되는 매치메이킹/플레이리스트용 래퍼.
- `AsyncAction_ExperienceReady` — 블루프린트에서 Experience 로드 완료를 대기하는 진입점.
- 핵심 콘텐츠: `Content/System/Experiences/B_LyraDefaultExperience`, `Plugins/GameFeatures/ShooterCore/Content/Experiences/`.

### 2. Game Features / Modular Gameplay
각 게임 모드 기능은 **Game Feature 플러그인**(`Plugins/GameFeatures/`)으로 분리되어, Experience 가 요청할 때만 로드됩니다: `ShooterCore`, `ShooterMaps`, `ShooterTests`, `ShooterExplorer`, `TopDownArena`.
- Experience 가 실행하는 액션들이 게임플레이를 "주입"합니다 — `Source/LyraGame/GameFeatures/` 의 `UGameFeatureAction_*`: `AddAbilities`, `AddInputBinding`, `AddInputContextMapping`, `AddWidget`, `AddGameplayCuePath`, `SplitscreenConfig` (다수가 `WorldActionBase` 상속).
- `ULyraGameFeaturePolicy` — 프로젝트의 Game Feature 로딩 정책.
- **로딩 특성:** 각 Game Feature 플러그인의 `.uplugin` 은 `"ExplicitlyLoaded": true` + `"EnabledByDefault": false` 로 설정되어 있어, 프로젝트 시작 시 자동 로드되지 않고 **Experience 가 요청할 때만 로드·활성화**됩니다. 이것이 "필요한 기능만 조립"하는 모듈형 설계의 핵심입니다.

### 3. Pawn/Character 초기화 — GameFrameworkComponentManager Init State
폰은 여러 컴포넌트로 조립되며, 컴포넌트들은 `IGameFrameworkInitStateInterface` 를 통해 **단계적 초기화 상태**를 동기화합니다. 상태 순서(`LyraGameplayTags.h` 의 네이티브 태그):
`InitState_Spawned` → `InitState_DataAvailable` → `InitState_DataInitialized` → `InitState_GameplayReady`
- `ULyraPawnExtensionComponent` (`Character/`) — **모든 폰의 초기화 조율자(coordinator)**. `ULyraPawnData` 를 보유하고, ASC 등록/해제를 중개하며 다른 컴포넌트의 초기화 진행을 게이팅.
- `ULyraHeroComponent` — 플레이어(또는 플레이어를 모사하는 봇) 전용. Enhanced Input 바인딩과 카메라 모드 결정을 담당. `PawnExtensionComponent` 에 의존.
- `ULyraPawnData` (`UPrimaryDataAsset`) — 폰을 정의하는 불변 데이터: `PawnClass`, `AbilitySets`, `InputConfig`, `DefaultCameraMode`, `TagRelationshipMapping`.
- 폰 클래스: `ALyraCharacter`(+`ULyraCharacterMovementComponent`, `ULyraHealthComponent`), `ALyraPawn`, `ALyraCharacterWithAbilities`(ASC 를 폰이 직접 소유 — 보통은 PlayerState 소유).

### 4. Gameplay Ability System (GAS)
- `ULyraAbilitySystemComponent` — 보통 `ALyraPlayerState` 가 소유하고 폰이 아바타가 됨.
- `ULyraAbilitySet` (`UPrimaryDataAsset`) — 어빌리티/이펙트/AttributeSet 묶음을 한 번에 부여하고, `FLyraAbilitySet_GrantedHandles` 로 회수.
- `ULyraGameplayAbility` 및 파생: `_Death`, `_Jump`, `_Reset`, `Weapons/LyraGameplayAbility_RangedWeapon`, `Equipment/LyraGameplayAbility_FromEquipment`.
- AttributeSet: `Attributes/` — `ULyraHealthSet`, `ULyraCombatSet`, 베이스 `ULyraAttributeSet`. 데미지/힐 계산은 `Executions/LyraDamageExecution`·`LyraHealExecution`(`UGameplayEffectExecutionCalculation`).
- `ULyraAbilityTagRelationshipMapping` — 태그 기반으로 어빌리티를 서로 차단/취소.
- 게임 흐름은 `Phases/` 의 `ULyraGamePhaseSubsystem` + `ULyraGamePhaseAbility` 로 단계 관리(워밍업/플레이/종료 등).

### 5. 애니메이션 시스템 (이 프로젝트의 중점)
C++ 측은 **얇은 조율 계층**이고, 실제 로코모션 로직은 블루프린트 ABP 안에 있습니다 — 그래서 Monolith `animation_query`/`blueprint_query` 분석이 필수입니다.
- `ULyraAnimInstance` (`Animation/`) — 베이스 `UAnimInstance`. `FGameplayTagBlueprintPropertyMap` 으로 **GAS 게임플레이 태그를 ABP 변수에 자동 미러링**(태그 추가/제거 시 bool 변수 자동 갱신 — ABP 에서 수동 태그 쿼리 금지). `ULyraCharacterMovementComponent::GetGroundInfo()` 에서 `GroundDistance` 를 노출.
- 코스메틱 기반 애니메이션 선택 — `Cosmetics/LyraCosmeticAnimationTypes.h`:
  - `FLyraAnimLayerSelectionSet` — 코스메틱 게임플레이 태그에 따라 **Linked Anim Layer**(`UAnimInstance` 서브클래스)를 선택.
  - `FLyraAnimBodyStyleSelectionSet` — 코스메틱 태그에 따라 `USkeletalMesh`(+강제 `UPhysicsAsset`)를 선택.
- 캐릭터 파츠/코스메틱: `Cosmetics/LyraPawnComponent_CharacterParts`, `LyraControllerComponent_CharacterParts` — 어떤 메시/애니 레이어를 적용할지 구동.
- 고급 애니메이션 기능 플러그인(활성): `AnimationLocomotionLibrary`, `AnimationWarping`, `ContextualAnimation`. 무기별 애니 레이어는 `Equipment` 시스템과 연동.
- 애니메이션 콘텐츠: `Content/Characters/Heroes/Mannequin`, `Mannequin_UE4`.

### 그 외 주요 시스템
- **카메라** (`Camera/`) — 스택 기반. `ULyraCameraComponent` 가 `ULyraCameraMode`(`_ThirdPerson` 등)를 블렌딩. 어빌리티가 `ULyraHeroComponent::SetAbilityCameraMode()` 로 카메라를 일시 오버라이드.
- **Input** (`Input/`) — Enhanced Input. `ULyraInputConfig` 가 `InputAction` ↔ 게임플레이 태그를 매핑, `ULyraInputComponent` 가 태그로 어빌리티를 바인딩. 입력 매핑은 GameFeature 액션이 주입.
- **Equipment / Inventory / Weapons** — `ULyraInventoryItemDefinition` + `InventoryFragment_*`(데이터 조립), `ULyraEquipmentManagerComponent` / `ULyraQuickBarComponent`, `ULyraWeaponInstance` / `ULyraRangedWeaponInstance` / `ULyraWeaponStateComponent`.
- **Teams** (`Teams/`) — `ULyraTeamSubsystem`, `ILyraTeamAgentInterface`, `ULyraTeamInfoBase`(Public/Private 복제 분리), `ULyraTeamDisplayAsset`.
- **UI** (`UI/`) — **CommonUI** 기반. `ULyraActivatableWidget`, `ALyraHUD` + `ULyraHUDLayout`, `ULyraTaggedWidget`. 위젯은 `UIExtension` 플러그인 + `GameFeatureAction_AddWidget` 으로 슬롯에 주입. 설정 화면은 `GameSettings` 플러그인 사용.
- **메시징** — `GameplayMessageRouter` 플러그인의 `UGameplayMessageSubsystem` 으로 시스템 간 디커플링된 pub/sub(직접 참조 회피).
- **System 계층** (`System/`) — `ULyraAssetManager`(커스텀 `UAssetManager`, 시작 작업 큐), `ULyraGameData`(전역 데이터 에셋, `Content/DefaultGameData`), `ULyraGameInstance` / `ULyraGameEngine`, `ULyraReplicationGraph`(네트워크 릴리번시 최적화), `ULyraSignificanceManager`. `GameplayTagStack` — 복제되는 태그-카운트 컨테이너.

---

## 분석 시 알아둘 프로젝트 고유 사항

- **파일 도구로 안 보이는 것들:** `.claudeignore` 가 `Binaries`/`Intermediate`/`Saved`/`DerivedDataCache`/`*.sln`/`Plugins/Developer/*` 등을 제외합니다. `Content/` 는 제외하지 않으므로 `.uasset` 경로는 `Glob` 로 보이지만, 바이너리라서 내용은 Monolith 로만 조회할 수 있습니다.
- **Content 폴더 출처:** 표준 Lyra 콘텐츠는 Epic Games Launcher / Fab 에서 받은 샘플 에셋입니다(루트 `README.md` 참조).
- **개발자 작업 폴더:** `Content/Developers/bong9/` 는 개인 작업 공간 — 분석 시 Epic 원본 샘플 에셋과 구분하십시오.
- **게임플레이 태그가 핵심 연결고리:** 네이티브 태그는 `LyraGameplayTags.h/.cpp` 에 `UE_DECLARE_GAMEPLAY_TAG_EXTERN` 으로 선언됩니다(`InitState_*`, `InputTag_*`, `Status_*`, `Movement_Mode_*` 등). 그 외 태그는 `Config/DefaultGameplayTags.ini` 및 각 플러그인 `Config/Tags/*.ini` 에 정의됩니다. 시스템 간 동작은 대부분 태그로 연결되므로 분석의 출발점으로 삼으십시오.
- **C++ 헤더를 읽을 때:** 일부 모듈은 `#define UE_API <MODULE>_API` 매크로로 export 를 표기합니다(`ULyraPawnExtensionComponent` 등) — `LYRAGAME_API` 와 같은 의미. `.cpp` 끝의 `#include UE_INLINE_GENERATED_CPP_BY_NAME(...)` 는 엔진 표준 관용구입니다.
- **로그 카테고리:** 런타임 동작 추적의 단서는 `LyraLogChannels.h` 의 로그 카테고리(`LogLyra` 등)에서 시작합니다.

---

## 📁 docs/ — 참고 문서 및 분석 산출물

분석·학습용 참고 문서와 산출 메뉴얼은 `docs/` 폴더에 모읍니다.

| 문서 | 내용 |
|------|------|
| [`docs/README.md`](docs/README.md) | `docs/` 폴더 인덱스 |
| [`docs/lyra-project-verification.md`](docs/lyra-project-verification.md) | **프로젝트 구조와 문서 검증 맵** — 실제 설정/C++/에셋 경로 기준으로 확인한 핵심 시스템, 검증 제한, 문서 작성 체크리스트. |
| [`docs/lyra-animation-references.md`](docs/lyra-animation-references.md) | **라이라 애니메이션 분석·학습용 공식 온라인 참고 문서 모음** — Epic 공식 문서 URL + 라이라 구현 매핑. 애니메이션 시스템을 분석하기 전에 먼저 읽으십시오. |
| [`docs/lyra-dynamic-html-spec.md`](docs/lyra-dynamic-html-spec.md) | **다이나믹 HTML 산출물 사양** — 분석·학습 결과를 HTML 로 표현할 때의 폴더 구조(`dynamic-html/`), 기술 스택, 표준 컴포넌트, 금지 사항. `dynamic-html/` 작업을 시작·갱신하기 전에 반드시 읽으십시오. |

새로 작성하는 시스템별 분석 메뉴얼도 `docs/` 에 저장하고 `docs/README.md` 목록에 등록합니다.

---

## 메뉴얼/참고문서 작성 워크플로우

이 저장소의 1차 목표는 분석 결과를 한국어 참고 문서로 산출하는 것입니다. 권장 절차:
1. **C++ 골격 파악** — 라이더 MCP(`search_symbol` → `get_symbol_info`)로 `Source/LyraGame/<시스템>/` 의 클래스 관계·진입점 확인.
2. **블루프린트/데이터 계층 파악** — Monolith(`blueprint_query`·`animation_query`·`gas_query` 등)로 해당 시스템이 사용하는 `.uasset` 의 실제 구성·기본값·노드 그래프 조회.
3. **교차 검증** — 블루프린트가 가리키는 C++ 부모/엔진 클래스를 라이더 MCP 로 확인해 동작을 확정.
4. **문서화** — 시스템별로 "목적 → 핵심 클래스/에셋 → 데이터 흐름 → 확장 방법" 구조의 한국어 문서를 작성하여 `docs/` 에 저장하고 `docs/README.md` 목록에 등록. 전체 구조와 검증 제한은 [`docs/lyra-project-verification.md`](docs/lyra-project-verification.md), 애니메이션 분석은 [`docs/lyra-animation-references.md`](docs/lyra-animation-references.md) 를 함께 참고.
5. **다이나믹 HTML 산출(선택)** — 분석 결과를 인터랙티브 학습 페이지로 노출할 경우 [`docs/lyra-dynamic-html-spec.md`](docs/lyra-dynamic-html-spec.md) 의 폴더 구조·기술 스택·금지 사항을 그대로 따라 `dynamic-html/` 에 산출합니다. 마크다운 검증 원장이 사실의 단일 출처이고, HTML 은 그 사실을 시각화·인터랙션 형태로 재표현한 것입니다 — 이 관계는 사양 문서에서 정의합니다.
