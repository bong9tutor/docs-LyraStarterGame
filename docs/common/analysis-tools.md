# Unreal Engine 프로젝트 분석 도구 정책 — Monolith MCP 와 라이더(JetBrains) MCP

> 이 문서는 Unreal Engine 프로젝트의 블루프린트·에셋·C++ 소스를 분석할 때 어떤 도구를 어떤 순서로 사용하는지 정의합니다. 모든 UE 프로젝트 분석에 재사용 가능합니다.
> `docs/` 는 [`common/`](.) (재사용 가능 정책 — 본 문서 포함 3종) 과 `../project/` (해당 프로젝트 종속 — 컨텍스트 + 시스템별 검증 원장) 두 하위 폴더로 분리돼 있습니다. 다른 UE 프로젝트 분석은 별도 레포에서 본 `common/` 폴더를 통째 카피해 시작합니다. 본 정책 본문은 **프로젝트 무관 placeholder** (`<프로젝트 핵심 심볼>` · `<프로젝트 루트 절대 경로>` 등) 로 작성됐고, "예시 (라이라)" 라벨이 붙은 문장만 본 레포 사례입니다 — 새 레포에서는 예시 문장만 그 프로젝트 사례로 교체하면 됩니다.
> CLAUDE.md 는 매 turn 적용되는 행동 규칙과 작업 유형별 문서 인덱스만 두고, **분석 도구의 사용 규칙·전제 조건·워크플로우는 이 문서가 단일 출처** 입니다.

## 한 줄 요약

| 분석 대상 | 사용 도구 | 전제 조건 |
|-----------|-----------|----------|
| 블루프린트·애니메이션·머티리얼·Niagara·GAS·UI 등 `.uasset` / `.umap` | **Monolith MCP** (`monolith_*` 툴) | Unreal Editor 실행 중 (포트 `9316`) |
| 프로젝트 C++ 소스 (`Source/`, `Plugins/*/Source/`) | **라이더 MCP** (`mcp__jetbrains__*` 툴) | Rider 가 이 프로젝트를 연 상태로 실행 중 |
| 엔진 C++ 소스 (UE 5.x) | 라이더 MCP `search_symbol(include_external=true)` 또는 Monolith `source_query` | 위와 동일 |
| 텍스트 설정 파일 (`.ini`, `.Build.cs`, `.uplugin`, `.md`) | `Read` / `Grep` / `Glob` | 없음 |

두 도구는 **함께 써야 게임 전체가 보입니다.** Monolith 는 에디터에 들어 있는 살아 있는 그래프·CDO·노드를 보여주고, 라이더는 C++ 의 의미론적 인덱스 (정의·사용처·상속) 를 보여줍니다. 한쪽만 쓰면 "어떻게 호출되는가" 와 "그 호출이 실제 어떤 데이터를 따라가는가" 중 하나를 놓칩니다.

---

## ⚙️ Monolith MCP (블루프린트·에셋 분석)

> **이 프로젝트의 블루프린트/애니메이션/머티리얼/Niagara/GAS/UI 에셋 분석은 반드시 Monolith MCP 를 통해 수행합니다.**

### 왜 Monolith 인가
`.uasset` / `.umap` 은 바이너리 포맷이라 `Read`·`Grep` 같은 텍스트 도구로 내용을 볼 수 없습니다. Monolith 는 Unreal 에디터 안에서 동작하는 플러그인으로, MCP 를 통해 블루프린트 그래프·변수·컴포넌트·함수, 애니메이션 ABP/몽타주, GAS 어빌리티, 머티리얼 그래프 등을 **구조화된 데이터로 직접 조회**합니다. C++ 소스만으로는 게임 동작의 절반밖에 보이지 않으므로, 메뉴얼 작성 시 C++ 분석과 Monolith 블루프린트 분석을 항상 교차 검증하십시오.

### 전제 조건

- **Unreal 에디터가 실행 중이어야 Monolith MCP 가 응답합니다** (기본 HTTP 서버 포트 `9316`). 에디터가 꺼져 있으면 `monolith_*` 툴은 "Unreal Editor not running" 오류를 반환합니다 — 이 경우 사용자에게 에디터 실행을 요청하십시오.
- 프로젝트별 등록 위치 (`.mcp.json`), Monolith 플러그인 설치 경로 (`Plugins/Monolith/`), 활성화된 서버 목록 (`.claude/settings.local.json`) 같은 환경 설정은 프로젝트마다 다르므로 해당 프로젝트의 `project-verification.md` 의 "환경·MCP 설정" 절을 참고하십시오. **예시 (라이라):** [`../project/project-verification.md`](../project/project-verification.md).

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
3. `project_query` 로 대상 에셋 경로 검색 (`/Game/<프로젝트 콘텐츠 루트>/...`). **예시 (라이라):** `/Game/Characters/Heroes/...`
4. `blueprint_query`(`get_blueprint_info` → `get_variables` / `get_components` / `list_graphs` → `get_graph_data`)로 구조 파악
5. 블루프린트가 참조하는 C++ 부모/클래스는 라이더 MCP 로 확인 (아래 절 참조)
6. 발견 내용을 한국어 참고 문서로 정리

---

## 🧩 라이더(JetBrains) MCP (C++ 소스 분석)

> **이 프로젝트의 C++ 소스 코드 분석은 라이더(JetBrains) MCP 를 우선 사용합니다.** Monolith 가 블루프린트·에셋을 담당하면, 라이더 MCP 는 C++ 코드를 담당합니다.

### 왜 라이더 MCP 인가
Rider 는 C++ 를 **의미론적으로 인덱싱**하므로, 텍스트 검색(`Grep`)이 놓치거나 오탐하는 심볼 정의·사용처·타입·상속 관계를 정확히 찾습니다. 대형 UE 프로젝트의 C++ 계층은 수백 개 클래스가 다중 모듈/플러그인에 걸쳐 있어, IDE 인덱스로 진입점과 클래스 관계를 빠르게 파악할 수 있습니다. 프로젝트 C++ 소스(`Source/`, 각 플러그인)는 Rider 가 자동 인덱싱하므로 별도 설정이 필요 없습니다.

### 연결 조건 및 확인

- MCP 서버 네임스페이스: `jetbrains` (`mcp__jetbrains__*` 툴). 실제 사용 가능 여부는 현재 Claude/Rider 세션 상태에 따라 달라집니다.
- **전제 조건: Rider IDE 가 이 프로젝트를 연 상태로 실행 중이어야 합니다.** 꺼져 있으면 `jetbrains` 툴이 응답하지 않습니다 — 이 경우 사용자에게 Rider 실행을 요청하십시오.
- 분석 시작 시 `get_all_open_file_paths` 또는 `search_symbol("<프로젝트 핵심 심볼>")` 같은 가벼운 호출로 연결 상태와 C++ 심볼 인덱스를 확인하십시오. `<프로젝트 핵심 심볼>` 은 그 프로젝트의 진입 클래스 (Experience Definition · GameMode · 주요 GAS Ability Set 등) 가 좋습니다. **예시 (라이라):** `search_symbol("LyraExperienceDefinition")`.
- 모든 `jetbrains` 툴 호출 시 `projectPath` 에 분석 중인 프로젝트의 절대 경로 (`<프로젝트 루트 절대 경로>`) 를 전달하십시오 (모호한 호출 감소). **예시 (라이라):** `D:\Projects\Sample\LyraStarterGame`.

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

---

## 두 도구를 교차 검증하기

라이더로 찾은 C++ 클래스가 실제로 어떤 블루프린트에서 어떤 기본값과 함께 사용되는지, 또는 Monolith 로 찾은 블루프린트가 어떤 C++ 부모를 가지며 어떤 가상 함수를 오버라이드하는지는 두 도구를 번갈아 호출해서만 알 수 있습니다. 분석 표준 절차는 [`documentation-workflow.md`](documentation-workflow.md) 의 "분석 5단계" 를 따르십시오.
