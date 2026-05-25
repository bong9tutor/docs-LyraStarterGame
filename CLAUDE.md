# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

이 파일은 **매 turn 적용되는 행동 규칙** 과 **작업 유형별 시작 문서 인덱스** 만 둡니다. 시스템 아키텍처·분석 도구 사용 정책·작업 절차 같은 분량 있는 사실은 `docs/` 의 단일 출처 문서로 분리되어 있습니다 — 이 레포는 단일 프로젝트 (라이라) 전용이라 `docs/` 가 평면 구조이고, **다른 UE 프로젝트로 카피해 재사용 가능한 공통 문서** 와 **이 프로젝트 종속 분석 문서** 가 한 폴더에 함께 있으며 [`docs/README.md`](docs/README.md) 인덱스가 두 그룹을 구분합니다.

---

## 언어 / Language

**이 저장소에서의 기본 응답 언어는 한국어입니다.** 코드, 식별자, 엔진/엔진 클래스 이름은 원문(영문) 그대로 두고, 설명·분석·문서는 한국어로 작성합니다.

## 프로젝트 개요

**LyraStarterGame** — Epic Games 가 제공하는 Unreal Engine 5.7 공식 샘플 게임("Lyra"). 모듈형(데이터 주도) 게임 아키텍처와 고급 애니메이션·GAS 통합의 레퍼런스 구현입니다. **이 저장소의 목적은 프로젝트의 블루프린트와 C++ 코드를 심층 분석·학습하여 참고 문서/메뉴얼을 생성하는 것**이며, 모든 작업은 코드/에셋 분석과 문서화에 집중합니다.

- 엔진: UE 5.7 (`LyraStarterGame.uproject` 의 `EngineAssociation: "5.7"`)
- C++ 모듈: `LyraGame`(Runtime), `LyraEditor`(Editor) — `Source/` 하위
- 게임 자체는 C++ 골격 + 대량의 블루프린트/데이터 에셋으로 구성됩니다. **게임플레이 로직의 상당 부분은 `.uasset` 블루프린트 안에 존재** 하므로, 분석에는 전용 MCP 도구가 필요합니다 — [`docs/analysis-tools.md`](docs/analysis-tools.md) 참고.

---

## 작업 스타일 (사용자 선호)

이 저장소에서 사용자는 **자율적·직선적 실행** 을 선호합니다. 다음 습관을 피하십시오:

- **불필요한 sub-question** — 사용자가 큰 방향을 줬으면 `AskUserQuestion` 없이 의미 단위 한 묶음으로 끝까지 실행합니다. `AskUserQuestion` 은 결과가 정말 갈리는 결정 (데이터 손상 위험·길이 크게 다른 두 경로 등) 에만 씁니다. 사용자가 한 번 답한 큰 방향을 매 sub-step 에서 재확인하지 않습니다.
- **작업의 과도한 분할** — 한 의미 단위 (예: "정책 + 인덱스 + 실제 페이지 갱신") 는 한 묶음으로 처리하고 중간 보고로 끊지 않습니다. 사용자가 "정책만" 같이 명시적으로 좁힌 turn 에서만 분할합니다.
- **편집 1건마다 검증** — puppeteer · 테스트 · 빌드 같은 무거운 검증은 묶음 끝에 1회. 중간에는 사실 확인용 가벼운 조회 (Read · Grep · 간단한 Bash) 만 합니다.
- **장황한 summary** — 결과 보고는 2~3 문장 (예: "X 적용, Y 통과, 다음 대기"). 표·스크린샷·체크리스트는 사용자가 명시적으로 요청할 때만 답에 포함합니다.
- **이전 지시의 잘못된 일반화** — 사용자가 한 turn 에 "정책 먼저" 같이 좁힌 지시를 한 것은 그 turn 한정입니다. 다음 turn 의 기본값으로 일반화하지 마십시오 — 매 turn 의 명시적 지시만으로 해석합니다.

위 규칙을 따르되, 정말 destructive 한 작업 (대량 삭제·force push·외부 publish·되돌리기 어려운 변경) 은 여전히 사전 확인합니다 — 이건 가드레일이지 confirmation overhead 가 아닙니다.

---

## 작업 유형별 시작 문서

이 표가 본 파일의 핵심입니다. **공통(일반)** 문서는 다른 UE 프로젝트 분석에도 재사용 가능하고, **이 저장소 (라이라)** 절은 LyraStarterGame 종속입니다.

### 공통 — 모든 UE 프로젝트 분석에 재사용 가능

| 작업 유형 | 먼저 읽을 문서 |
|-----------|----------------|
| 분석 도구 (Monolith / Rider MCP) 사용 정책·전제 조건·핵심 네임스페이스·블루프린트 분석 워크플로우 | [`docs/analysis-tools.md`](docs/analysis-tools.md) |
| 분석 5단계 (C++ → 블루프린트 → 교차 검증 → 문서화 → HTML) · HTML 산출물 품질 규칙 요약 | [`docs/documentation-workflow.md`](docs/documentation-workflow.md) |
| HTML 산출물 작성·갱신 사양 (확장 절차 A/B · flow gate · chapter-brief · 색 의미 · 검증 등급 처리) | [`docs/dynamic-html-spec.md`](docs/dynamic-html-spec.md) |

### 이 저장소 (LyraStarterGame) 종속

| 작업 유형 | 먼저 읽을 문서 |
|-----------|----------------|
| 라이라 시스템 아키텍처 (Experience · Game Features · Pawn 초기화 · GAS · Animation + 그 외 + 분석 시 알아둘 프로젝트 고유 사항) | [`docs/architecture-overview.md`](docs/architecture-overview.md) |
| 라이라 파일 경로·플러그인 메타데이터·핵심 시스템 검증 표 | [`docs/project-verification.md`](docs/project-verification.md) |
| 라이라 시스템별 분석 문서 목록 (애니메이션 · CommonUI · …) | [`docs/README.md`](docs/README.md) (시스템별 그룹화된 인덱스) |

전체 문서 목록과 새 프로젝트 추가 절차는 [`docs/README.md`](docs/README.md) 가 단일 인덱스입니다.
