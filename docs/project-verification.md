# LyraStarterGame 프로젝트 검증 맵

> 검증일: 2026-05-22  
> 범위: 로컬 텍스트 설정, C++ 소스, 플러그인 메타데이터, 에셋 경로 존재 여부, Epic 공식 문서 링크.  
> 제한: `.uasset` / `.umap` 내부의 블루프린트 그래프, 기본값, 애니메이션 상태 머신은 파일 시스템만으로 검증할 수 없습니다. 해당 내용은 Unreal Editor 실행 후 Monolith MCP 로 재확인해야 합니다.
> 관계: 시스템이 **어떻게 동작하고 왜 그렇게 설계되었는지** 의 산문 설명은 [`architecture-overview.md`](architecture-overview.md), 분석 도구 사용 정책은 [`analysis-tools.md`](analysis-tools.md). 본 문서는 같은 시스템의 **파일 경로·메타데이터가 참인지** 검증 표만 둡니다.

## 검증 요약

| 항목 | 확인 위치 | 결과 |
|------|-----------|------|
| 엔진 버전 | `LyraStarterGame.uproject` | `EngineAssociation: "5.7"` |
| 프로젝트 모듈 | `LyraStarterGame.uproject`, `Source/` | `LyraGame` Runtime, `LyraEditor` Editor |
| Game Feature 플러그인 | `Plugins/GameFeatures/*/*.uplugin` | 5개 모두 `EnabledByDefault=false`, `ExplicitlyLoaded=true` |
| Monolith MCP 설정 | `.mcp.json`, `.claude/settings.local.json`, `Plugins/Monolith/` | 프로젝트 설정 존재. 실제 응답 여부는 에디터 실행 상태에 의존 |
| 문서 폴더 | `docs/` | 학습/분석 문서 위치로 적합 |
| 애니메이션 참고 링크 | `animation-references.md` | 2026-05-22 Epic 공식 문서 링크 열람 확인 |

## 주의해서 읽을 부분

- `CLAUDE.md` 는 작업 지침 문서입니다. 실제 구현 근거가 필요한 내용은 이 문서의 파일 경로와 소스를 먼저 확인하십시오.
- `.claudeignore` 는 빌드 산출물, IDE 설정, `Plugins/Developer/*`, `.claude/*` 등을 제외하지만 `Content/` 는 제외하지 않습니다. 다만 `.uasset` 은 바이너리이므로 경로만 확인 가능하고 내부 내용은 Monolith 로 조회해야 합니다.
- `Saved/`, `Intermediate/`, `DerivedDataCache/`, `Binaries/` 는 분석 근거로 쓰지 않는 편이 안전합니다. 실행/빌드 결과물이며 사용자 환경에 따라 계속 변합니다.
- 현재 `.uproject` 에서 활성 확인된 애니메이션 관련 플러그인은 `AnimationLocomotionLibrary`, `AnimationWarping`, `ContextualAnimation` 입니다. `MotionWarping` 과 `PoseSearch` 는 이 프로젝트의 핵심 Lyra 구성으로 활성화되어 있지 않으며, 비교 학습이나 Monolith 자체 기능 맥락에서만 언급해야 합니다.

## 핵심 시스템 맵

### Experience

Lyra 는 맵에 고정된 게임 모드만 두지 않고, 런타임에 `ULyraExperienceDefinition` 을 선택해 게임 구성을 조립합니다.

| 역할 | 주요 파일/에셋 |
|------|----------------|
| Experience 데이터 정의 | `Source/LyraGame/GameModes/LyraExperienceDefinition.h` |
| Experience 로딩/활성화 | `Source/LyraGame/GameModes/LyraExperienceManagerComponent.*` |
| Experience 선택 | `Source/LyraGame/GameModes/LyraGameMode.*`, `Source/LyraGame/GameModes/LyraWorldSettings.*` |
| 프론트엔드/플레이리스트 래퍼 | `Source/LyraGame/GameModes/LyraUserFacingExperienceDefinition.*` |
| 기본 Experience 에셋 | `Content/System/Experiences/B_LyraDefaultExperience.uasset` |
| 프론트엔드 Experience 에셋 | `Content/System/FrontEnd/B_LyraFrontEnd_Experience.uasset` |
| Primary Asset 스캔 설정 | `Config/DefaultGame.ini` |

`ALyraGameMode` 의 Experience 선택 경로는 URL 옵션 `Experience`, PIE 개발자 설정, 커맨드라인 `Experience=`, `ALyraWorldSettings::DefaultGameplayExperience`, 마지막 기본값 `B_LyraDefaultExperience` 순서로 확인됩니다.

### Game Features

Game Feature 플러그인은 Experience 가 필요로 할 때 로드되는 기능 묶음입니다.

| 플러그인 | 메타데이터 검증 |
|----------|----------------|
| `ShooterCore` | `EnabledByDefault=false`, `ExplicitlyLoaded=true` |
| `ShooterMaps` | `EnabledByDefault=false`, `ExplicitlyLoaded=true` |
| `ShooterTests` | `EnabledByDefault=false`, `ExplicitlyLoaded=true` |
| `ShooterExplorer` | `EnabledByDefault=false`, `ExplicitlyLoaded=true` |
| `TopDownArena` | `EnabledByDefault=false`, `ExplicitlyLoaded=true` |

게임 기능 주입은 `Source/LyraGame/GameFeatures/` 의 `UGameFeatureAction_*` 계열이 담당합니다. 핵심 액션은 `AddAbilities`, `AddInputBinding`, `AddInputContextMapping`, `AddWidget`, `AddGameplayCuePath`, `SplitscreenConfig` 입니다.

### Pawn / Ability System

| 역할 | 주요 파일 |
|------|-----------|
| 폰 데이터 | `Source/LyraGame/Character/LyraPawnData.h` |
| 폰 초기화 조율 | `Source/LyraGame/Character/LyraPawnExtensionComponent.*` |
| 플레이어 입력/카메라 연결 | `Source/LyraGame/Character/LyraHeroComponent.*` |
| 기본 캐릭터 | `Source/LyraGame/Character/LyraCharacter.*` |
| PlayerState ASC 소유 | `Source/LyraGame/Player/LyraPlayerState.*` |
| 자기 포함 ASC 캐릭터 변형 | `Source/LyraGame/Character/LyraCharacterWithAbilities.*` |

초기화 상태 태그는 `Source/LyraGame/LyraGameplayTags.*` 의 `InitState.Spawned` -> `InitState.DataAvailable` -> `InitState.DataInitialized` -> `InitState.GameplayReady` 순서입니다.

`ULyraPawnData` 에서 확인되는 주요 데이터는 `PawnClass`, `AbilitySets`, `TagRelationshipMapping`, `InputConfig`, `DefaultCameraMode` 입니다. `ALyraPlayerState` 는 일반 플레이어용 `ULyraAbilitySystemComponent` 를 보유하며, `ALyraCharacterWithAbilities` 는 ASC 를 캐릭터가 직접 보유하는 예외 변형입니다.

### GAS

| 역할 | 주요 파일 |
|------|-----------|
| ASC 확장 | `Source/LyraGame/AbilitySystem/LyraAbilitySystemComponent.*` |
| 어빌리티/이펙트/AttributeSet 묶음 | `Source/LyraGame/AbilitySystem/LyraAbilitySet.*` |
| 태그 관계 매핑 | `Source/LyraGame/AbilitySystem/LyraAbilityTagRelationshipMapping.*` |
| Health / Combat AttributeSet | `Source/LyraGame/AbilitySystem/Attributes/` |
| 데미지/힐 실행 계산 | `Source/LyraGame/AbilitySystem/Executions/` |
| 게임 페이즈 | `Source/LyraGame/AbilitySystem/Phases/` |

GAS 관련 블루프린트 어빌리티, Gameplay Effect, Gameplay Cue 의 실제 에셋 구성은 Monolith `gas_query` 와 `project_query` 로 확인해야 합니다.

### Animation

| 역할 | 주요 파일/에셋 |
|------|----------------|
| C++ AnimInstance 베이스 | `Source/LyraGame/Animation/LyraAnimInstance.*` |
| 태그 -> ABP 변수 미러링 | `FGameplayTagBlueprintPropertyMap` |
| 지면 거리 노출 | `ULyraCharacterMovementComponent::GetGroundInfo()` -> `ULyraAnimInstance::GroundDistance` |
| Linked Anim Layer 선택 | `Source/LyraGame/Cosmetics/LyraCosmeticAnimationTypes.*` |
| 베이스 ABP 경로 | `Content/Characters/Heroes/Mannequin/Animations/ABP_Mannequin_Base.uasset` |
| Anim Layer Interface | `Content/Characters/Heroes/Mannequin/Animations/LinkedLayers/ALI_ItemAnimLayers.uasset` |
| Linked Layer 베이스 ABP | `Content/Characters/Heroes/Mannequin/Animations/LinkedLayers/ABP_ItemAnimLayersBase.uasset` |

공식 문서의 일부 설명은 베이스 ABP 를 `AnimBP_Mannequin_Base` 로 부르지만, 현재 로컬 프로젝트의 실제 에셋명은 `ABP_Mannequin_Base` 입니다. ABP 내부 상태 머신, AnimGraph, 노드 함수, Property Access 구성은 Monolith `animation_query` / `blueprint_query` 로 확인해야 합니다.

### UI / 메시징 / 시스템

| 시스템 | 주요 파일 |
|--------|-----------|
| CommonUI 기반 위젯 | `Source/LyraGame/UI/` |
| 위젯 주입 | `Source/LyraGame/GameFeatures/GameFeatureAction_AddWidget.*`, `UIExtension` 플러그인 |
| Gameplay Message | `GameplayMessageRouter` 플러그인, `Source/LyraGame/Messages/` |
| AssetManager / GameData | `Source/LyraGame/System/LyraAssetManager.*`, `Source/LyraGame/System/LyraGameData.*`, `Content/DefaultGameData.uasset` |
| Replication Graph | `Source/LyraGame/System/LyraReplicationGraph.*` |
| 팀 시스템 | `Source/LyraGame/Teams/` |

## 문서 작성 체크리스트

1. C++ 는 `Source/LyraGame/` 와 관련 플러그인 `Source/` 에서 먼저 근거를 찾습니다.
2. 데이터 에셋/블루프린트는 파일 경로 존재만으로 결론 내리지 말고 Monolith 로 내부 구조를 확인합니다.
3. 온라인 문서는 Epic 공식 문서를 우선 사용하고, 문서에 URL 과 확인 날짜를 남깁니다.
4. 세션 상태(예: Rider MCP 연결됨, Unreal Editor 실행 중)는 문서에 고정 사실로 쓰지 말고 “확인 방법” 또는 “전제 조건”으로 적습니다.
5. 새 시스템 분석 문서는 [`README.md`](README.md) (이 프로젝트의 시스템 인덱스) 의 해당 시스템 섹션에 등록합니다. 새 프로젝트가 추가될 때만 루트 [`README.md`](README.md) 의 "프로젝트별 분석" 표를 갱신합니다.

## 환경·MCP 설정 (이 저장소)

분석 도구가 이 저장소에 어떻게 등록·활성화되어 있는지 — 다른 프로젝트에서는 다를 수 있으니 그 프로젝트의 검증 맵을 참고하십시오. 도구의 역할·전제 조건·교차 검증 원칙은 공통 문서 [`analysis-tools.md`](analysis-tools.md) 가 단일 출처입니다.

| 항목 | 위치 / 값 | 비고 |
|------|-----------|------|
| Monolith MCP 서버 등록 | `.mcp.json` | `monolith` 서버 항목 — `Plugins/Monolith/Scripts/monolith_proxy.bat` 호출 (Python 프록시, 에디터 재시작 시 세션 자동 유지) |
| Monolith 서버 활성화 | `.claude/settings.local.json` | `enabledMcpjsonServers` 에 `monolith` 등록 |
| Monolith 플러그인 설치 위치 | `Plugins/Monolith/` | 프로젝트에 포함 |
| Rider `projectPath` | `D:\Projects\Sample\LyraStarterGame` | 모든 `jetbrains` 툴 호출 시 전달 |
| 연결 확인 심볼 | `LyraExperienceDefinition` | `search_symbol` 가벼운 호출용 |
