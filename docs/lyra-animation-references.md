# 라이라(Lyra) 애니메이션 — 온라인 참고 문서 모음

> 라이라의 애니메이션 시스템을 **분석·학습**하고 메뉴얼을 작성할 때 참고할 공식·권위 있는 온라인 문서 목록입니다.
> 작업 개요·분석 도구·아키텍처는 루트 [`CLAUDE.md`](../CLAUDE.md) 를, 실제 에셋/코드 조회는 Monolith·라이더 MCP 를 사용하십시오.
>
> - 기준 엔진 버전: **UE 5.7** — `dev.epicgames.com` 문서는 페이지 우측 상단에서 버전 선택 가능
> - 링크 최종 확인: **2026-05-22**

## 핵심 이해 — 라이라 애니메이션이란

라이라의 캐릭터 애니메이션은 **거의 전부 블루프린트(Animation Blueprint)로 구현**되어 있고, Paragon·Fortnite 의 제작 방식에서 영감을 받았습니다. 핵심은 다음과 같습니다.

- **상태 머신(State Machine) 기반 로코모션** + **Distance Matching** + **Animation Warping** — *모션 매칭(Motion Matching)이 아님*. (모션 매칭 방식은 §4 의 Game Animation Sample 참고)
- **Linked Anim Layers** 로 무기/아이템별 상체 애니메이션을 런타임 교체
- **Thread-Safe Update Animation** + **Property Access** 로 멀티스레드에서 애니메이션 값 계산
- C++ 측(`ULyraAnimInstance`)은 얇은 조율 계층 — **GAS 게임플레이 태그를 ABP 변수로 자동 미러링**하는 역할이 핵심

## 사용법

1. 분석할 애니메이션 주제를 아래 목록에서 찾습니다.
2. 공식 문서로 **개념**을 학습합니다.
3. [§5 문서 ↔ 프로젝트 매핑](#5-문서--프로젝트-매핑) 으로 라이라의 실제 구현 위치를 찾습니다.
4. Monolith(`animation_query`·`blueprint_query`)·라이더 MCP 로 해당 에셋/코드를 조회해 **문서 내용과 교차 검증**합니다.

---

## 1. 공식 라이라 문서 (최우선)

### ⭐ Animation in Lyra Sample Game
<https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-in-lyra-sample-game-in-unreal-engine>

라이라 애니메이션 분석의 **1차 기준 문서**. 다루는 주제:

- 에셋 개요 — 공식 문서의 `AnimBP_Mannequin_Base` 설명과 AnimGraph 구조. 현재 로컬 프로젝트의 실제 에셋명은 `ABP_Mannequin_Base` 입니다.
- Blueprint Thread-Safe Update Animation (멀티스레드 애니메이션 갱신)
- Anim Node Functions, State Aliases (상태 머신 전이 단순화)
- 상·하체 레이어링 (Layered Blend Per Bone)
- Linked Layer Animation Blueprint — `ALI_ItemAnimLayers` 인터페이스, `ABP_ItemAnimLayersBase`
- Distance Matching & Stride Warping, Orientation Warping
- Turn In Place 와 Root Yaw Offset
- Property Access, 게임플레이 태그 바인딩, 몽타주/노티파이, Rewind Debugger·Pose Watch 디버깅

### Lyra Sample Game (전체 개요)
<https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine>

라이라 프로젝트 전체 개요. 애니메이션은 GAS·장비 시스템과 맞물리므로 함께 참고.

### Adapting Lyra Animation to Your UE5 Game (Epic 기술 블로그)
<https://www.unrealengine.com/en-US/tech-blog/adapting-lyra-animation-to-your-ue5-game>

라이라 애니메이션 시스템을 다른 프로젝트로 이식·재사용하는 방법을 다루는 Epic 공식 기술 블로그.

---

## 2. 라이라가 사용하는 UE 애니메이션 시스템

각 항목은 *공식 문서 + 라이라에서의 쓰임* 순으로 정리했습니다.

### Animation Blueprints — 기초
<https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprints-in-unreal-engine>
AnimGraph·EventGraph·상태 머신의 기본 개념. 라이라의 모든 ABP 분석의 토대.

### Animation Blueprint Linking — Linked Anim Layers
<https://dev.epicgames.com/documentation/en-us/unreal-engine/using-animation-blueprint-linking-in-unreal-engine>
ABP 그래프의 일부 섹션을 런타임에 교체하는 시스템. 라이라는 무기/아이템별 상체 애니메이션을 **Anim Layer Interface(`ALI_ItemAnimLayers`)** + **`ABP_ItemAnimLayersBase`** 파생 레이어로 교체합니다. 어떤 레이어를 적용할지는 C++ 의 `FLyraAnimLayerSelectionSet`(`Cosmetics/LyraCosmeticAnimationTypes.h`)이 코스메틱 태그로 선택.

### Layered Animations — Layered Blend Per Bone
<https://dev.epicgames.com/documentation/en-us/unreal-engine/using-layered-animations-in-unreal-engine>
본(bone) 단위 가중치로 상·하체를 분리 블렌딩. 라이라의 조준/사격 상체와 로코모션 하체를 결합.

### Distance Matching
<https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/DistanceMatching>
시간이 아닌 "이동 거리"로 애니메이션 재생을 구동해 발 미끄러짐을 줄이는 기법. 라이라는 jog 사이클·시작·정지에 Distance Curve 모디파이어를 적용. `AnimationLocomotionLibrary` 플러그인 기반.

### Pose Warping — Stride / Orientation Warping
<https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine>
보폭(Stride)·이동 방향(Orientation)에 맞춰 포즈를 절차적으로 보정해 애니메이션과 실제 이동의 불일치를 해소. 라이라는 `AnimationWarping` 플러그인 사용.

### Control Rig — 런타임 절차적 본 제어
<https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine>
<https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-animation-blueprints-in-unreal-engine>
발 IK·지면 정렬 등 절차적 보정. ABP 의 AnimGraph 안에서 Control Rig 노드로 사용.

### Contextual Animation System
<https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/ContextualAnimationSystem>
둘 이상의 액터가 정렬·동기화되는 상호작용 애니메이션. 라이라는 `ContextualAnimation` 플러그인 활성. (현재 공식 문서는 Blueprint API 수준 — 개념은 플러그인/샘플로 보완)

---

## 3. 학습 자료 (튜토리얼·강의)

### Your First 60 Minutes With Motion Matching
<https://dev.epicgames.com/community/learning/tutorials/lwlG/unreal-engine-your-first-60-minutes-with-motion-matching>
모션 매칭 입문 — 라이라의 상태 머신 방식과 대비해 학습하면 유용.

### Exploring Lyra — Part 3: Animation (커뮤니티 튜토리얼)
<https://forums.unrealengine.com/t/community-tutorial-exploring-lyra-part-3-animation/1584148>
라이라 애니메이션 흐름을 분해·디버깅하며 학습하는 커뮤니티 가이드.

### Epic Developer Community — Learning 포털
<https://dev.epicgames.com/community/learning/>
라이라·애니메이션 관련 강의·튜토리얼을 검색하는 기점.

---

## 4. 보완·비교 자료 (현대적 애니메이션 접근)

라이라(상태 머신 + Distance Matching + Warping)와 **대비**해 학습하면 설계 의도가 명확해집니다.

### Motion Warping
<https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-warping-in-unreal-engine>
루트 모션을 런타임 타깃 위치/회전에 맞춰 워프하는 별도 UE 시스템. 현재 `LyraStarterGame.uproject` 에서는 `MotionWarping` 플러그인이 활성화되어 있지 않으므로, 라이라 핵심 구현으로 보지 말고 비교/보완 개념으로만 참고합니다.

### Game Animation Sample Project
<https://dev.epicgames.com/documentation/en-us/unreal-engine/game-animation-sample-project-in-unreal-engine>
<https://www.unrealengine.com/en-US/blog/game-animation-sample>
UE 5.4+ 의 **모션 매칭 기반** 애니메이션 전용 샘플(500+ 애니메이션). 애니메이션 선택을 Chooser·Proxy Table 로 처리하고 Pose Warping 으로 보완. 라이라의 "수작업 상태 머신" 방식과 정반대 접근.

### Motion Matching / Pose Search
<https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-in-unreal-engine>
<https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-debugging-in-unreal-engine>
포즈 데이터베이스에서 현재 궤적에 가장 맞는 포즈를 런타임 선택. **클래식 라이라에는 사용되지 않음** — 차세대 접근으로 알아둘 것. 현재 프로젝트의 `.uproject` 에서 `PoseSearch` 는 활성 플러그인으로 확인되지 않았으며, `Plugins/Monolith/` 자체가 PoseSearch 기능을 의존성으로 포함하는 것과 구분해야 합니다.

---

## 5. 문서 ↔ 프로젝트 매핑

온라인 개념을 라이라 프로젝트의 실제 구현으로 연결합니다. 분석 시 이 표를 출발점으로 삼으십시오.

| 온라인 개념 | 라이라 구현 위치 | 조회 도구 |
|-------------|------------------|-----------|
| AnimInstance 기반 클래스 | `Source/LyraGame/Animation/LyraAnimInstance.h/.cpp` | 라이더 MCP |
| 게임플레이 태그 → ABP 변수 미러링 | `ULyraAnimInstance` 의 `FGameplayTagBlueprintPropertyMap` | 라이더 MCP |
| Linked Anim Layer 선택 로직 | `FLyraAnimLayerSelectionSet` (`Cosmetics/LyraCosmeticAnimationTypes.h`) | 라이더 MCP |
| 바디 스타일(스켈레탈 메시) 선택 | `FLyraAnimBodyStyleSelectionSet` (동일 파일) | 라이더 MCP |
| 베이스 ABP / AnimGraph / 상태 머신 | `ABP_Mannequin_Base` 등 (라이라 콘텐츠, 공식 문서의 `AnimBP_Mannequin_Base` 명칭과 다를 수 있음) | Monolith `animation_query` |
| 무기별 Linked Layer | `ABP_ItemAnimLayersBase` 파생 + `ALI_ItemAnimLayers` 인터페이스 | Monolith `animation_query` / `blueprint_query` |
| Distance Matching / Warping 플러그인 | `AnimationLocomotionLibrary`·`AnimationWarping`·`ContextualAnimation` (`.uproject` 활성 확인됨) | `Read` (`LyraStarterGame.uproject`) |
| 애니메이션 콘텐츠(시퀀스/몽타주/블렌드스페이스) | `Content/Characters/Heroes/Mannequin*` 하위 | Monolith `animation_query` / `project_query` |

> 콘텐츠 경로·에셋 이름은 라이라 버전에 따라 다를 수 있습니다. 정확한 경로는 Monolith `project_query` 로 확인하십시오.
