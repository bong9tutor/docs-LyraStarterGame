# 수강생 안내 (태그별)

본 저장소의 git tag 마다 수강생 / 팀 프로젝트 인원에게 공지한 슬랙 안내 문구를 보관합니다. 새 tag 가 추가될 때마다 같은 형식으로 위에 추가합니다 (최신 tag 가 맨 위).

각 항목은 다음 구조를 갖습니다.

- **본문**: 슬랙으로 발송한 안내 메시지 원문
- **링크**: 메시지에 함께 첨부한 학습 사이트 / 레포지토리 URL
- **메타**: 발송일, git tag, (필요 시) 발송 대상 / 채널

## 0.1 (2026-05-26)

git tag: [`0.1`](https://github.com/bong9tutor/docs-LyraStarterGame/releases/tag/0.1)

### 본문

라이라 (Lyra, UE 5.7) 를 학습 하시거나 라이라 애니메이션을 활용 한 팀 프로젝트를 진행 하고 계신 수강생분들을 위해 라이라 시스템 분석 문서를 공개 합니다.

1. 라이라의 4 시스템 (애니메이션 / CommonUI / 에셋 비동기 로딩 / GAS) 을 다루며 총 37 학습 페이지로 구성 되어 있습니다.
2. 각 시스템 마다 코드와 블루프린트의 사실을 정리한 검증 원장 (마크다운) 과, 그 사실을 학습 동선 순으로 재배열 한 HTML 학습 페이지가 짝을 이루는 구조 입니다.
3. 블루프린트 분석은 'Monolith' MCP 를 사용 해서 5.7 버전 에디터 에서 직접 조회 하였고,
4. 모노리스 MCP 를 통해 조회되지 않은 알아두면 좋을 내용도 추가 하였습니다.
5. C++ 분석은 JetBrains Rider MCP 를 사용 하였습니다.
6. 모든 분석은 AI (Claude Code) 를 통해 정책 기반 으로 자동화 하였고,
7. 학습 페이지에 인용 되는 모든 사실은 검증 원장 의 단일 출처에서만 가져 오도록 작성 하였습니다.
8. 학습 사이트는 GitHub Pages 에 정적 HTML 로 배포 되어 있어서 별도 설치 없이 브라우저 클릭 만으로 바로 읽을 수 있습니다.
9. 3단 반응형 레이아웃 (사이드바 + 본문 + 페이지 TOC), 다크모드 토글을 지원 합니다.
10. 사이드바 에서 원하는 시스템을 선택 한 뒤 "전체 지도" 페이지 부터 순서대로 읽으면 학습 동선이 자연 스럽게 이어 집니다.

### 링크

학습 사이트 홈:
https://bong9tutor.github.io/docs-LyraStarterGame/html/

시스템별 진입점:
- 애니메이션 (12 페이지): https://bong9tutor.github.io/docs-LyraStarterGame/html/pages/lyra-animation-overview.html
- CommonUI (7 페이지): https://bong9tutor.github.io/docs-LyraStarterGame/html/pages/lyra-ui-overview.html
- 에셋 비동기 로딩 (9 페이지): https://bong9tutor.github.io/docs-LyraStarterGame/html/pages/lyra-asset-loading-overview.html
- GAS (9 페이지): https://bong9tutor.github.io/docs-LyraStarterGame/html/pages/lyra-gas-overview.html

문서 레포지토리:
https://github.com/bong9tutor/docs-LyraStarterGame
