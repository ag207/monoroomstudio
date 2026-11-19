# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 현재 상태

첫 버전(v1)이 구현돼 있다 (git 저장소는 아직 아님). 구현의 기준 문서는 다음과 같다.

- `PRD.md` — "방 배치 체크" 첫 버전 PRD. 요구사항(F-xxx, N-xx), 판정 규칙(R1~R5), 완료 조건(AC/QC/TC), 기술 스택(6장)이 모두 여기에 있다. **구현·테스트의 단일 기준**이며, 수치·문구는 PRD 그대로 쓴다.
- `DESIGN-notion.md` — UI 스타일 참고용 디자인 토큰(따뜻한 오프화이트 캔버스, 검정 글자, 파란색 하나만 액션 색, 8px 간격 단위, 입력칸 4px·주 버튼 pill 모서리).
- `기획 단계.txt`, `인테리어 시뮬레이션.txt` — 아이디어 메모와 기획에 쓴 프롬프트. 참고만 한다.

PRD에서 **결정 필요 / 확인 필요**로 표시된 항목(부록)은 임의로 정하지 말고 사용자에게 묻는다.

## 서비스 핵심 제약 (PRD 1.4)

- 로그인·서버 저장·외부 API·외부 AI 없음. 모든 판정은 브라우저 안 규칙 계산.
- 상태는 메모리와 URL 해시에만 둔다. 최초 로딩 이후 네트워크 요청이 없어야 한다 (N-06, QC-05) → 외부 글꼴·CDN·분석 스크립트를 넣지 않는다. 글꼴은 시스템 한글 글꼴 목록(`src/styles/colors.ts`의 `FONT_STACK`)을 쓴다. SVG를 이미지로 그려 PNG를 만들 때 웹폰트는 적용되지 않기 때문이다.
- 화면은 화면 1(방 설정), 화면 2(가구 배치), 화면 2-1(저장·공유 팝업)뿐. 라우터 없이 상태 값으로 전환한다.

## 스택과 명령 (PRD 6장)

TypeScript + React 19 + Vite, SVG 평면도, Pointer Events 드래그, `useReducer` + Context, CSS Modules + 전역 CSS 변수, Vitest, Playwright, ESLint 9(+jsx-a11y) + Prettier, Vercel 정적 배포(`vercel.json`, `dist`, 서버 기능 사용 안 함).

- `npm run dev` — 개발 서버 (http://localhost:5173)
- `npm run build` — `tsc -b && vite build` (타입 오류가 있으면 실패)
- `npm test` — Vitest 단위 테스트 (`tests/unit`) / 단일 실행: `npx vitest run tests/unit/rules.test.ts -t "AC-06"`
- `npm run e2e` — Playwright, Chromium·WebKit (`tests/e2e`). 매번 빌드한 뒤 `vite preview`(4173 포트)에 대고 돈다. 단일 실행: `npx playwright test tests/e2e/acceptance.spec.ts -g "AC-14" --project=chromium`. 배포된 주소에 대고 돌리려면 `E2E_BASE_URL`을 지정한다.
- `npm run lint` — ESLint

PowerShell에서 `node`/`npm`이 안 잡히면 PATH를 새로 읽는다: `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`.

## 아키텍처 (PRD 6.4 폴더 구조 기준)

- `src/rules/` — 판정 엔진. 순수 함수 `evaluate(room, furniture) → results`. **React를 import하지 않는다 (TC-02).** 규칙마다 파일 하나(`r1-bounds` ~ `r5-window`) + `area.ts`.
- `src/state/` — 단일 reducer. 모든 변경(추가·이동·수정·회전·삭제)이 여기를 지나고 그때마다 `evaluate`를 다시 돌린다 (F-205). 입력 검증(4.2)도 여기.
- `src/share/` — 링크 인코딩(JSON → UTF-8 → base64url, `#v=1&s=...`)과 PNG 저장(화면 SVG를 직렬화 → `<canvas>` 2배 → `toBlob`). 화면 SVG와 PNG가 같아야 하므로 PNG용 그림을 따로 만들지 않는다 (TC-04).
- `src/screens/`, `src/components/` — `FloorPlan`은 cm 좌표를 SVG `viewBox`에 그대로 쓴다. 가구 블록은 포커스 가능한 요소 + aria-label (N-04). 화면 1 미리보기, 화면 2 캔버스, 저장 팝업, PNG가 모두 이 컴포넌트 하나를 쓴다.
- SVG 안의 색은 CSS 변수가 아니라 `src/styles/colors.ts`의 값을 속성으로 직접 넣는다. 직렬화해서 PNG를 만들 때 CSS가 따라가지 않기 때문이다. 판정 색을 바꾸려면 `colors.ts`와 `global.css`를 함께 고친다.
- 선 굵기는 `vector-effect="non-scaling-stroke"`(px 고정)다. `png.ts`가 내보낼 때 이 굵기를 크게 바꾸므로, 새로 넣는 선에도 이 속성을 붙인다.
- `AppContext`는 화면 2 배치를 300ms 디바운스로 주소 해시에 반영한다(새로고침해도 유지). 공유 링크와 형식이 같다.
- 창문 종류(미닫이·여닫이·기타, `RoomWindow.kind`)와 **R6 여닫이 창 열림 막힘**(`src/rules/r6-casement.ts`)은 PRD에 없고 나중에 추가했다. 여닫이는 두 짝 창으로 보고 창 폭의 절반 깊이 직사각형과 겹치면 주의. 링크의 창문 항목은 `[벽, 위치, 폭, 종류]`이고, 종류가 없는 예전 링크(3칸)는 미닫이로 읽는다.
- 높이(PRD에 없고 나중에 추가): 창문 `sill`(바닥~창틀)과 가구 `ht`(바닥~윗면, 평면의 `h`와 다름). 둘 다 비워 둘 수 있고(null = 모름), 기본 가구 4종엔 기본 높이가 있다. 둘 다 알면 R5·R6에서 가구가 창틀 이하일 때 경고하지 않고, 높으면 R5는 "창문을 가려요"로 확정한다. 하나라도 모르면 PRD 원래 문구("가릴 수 있어요")를 쓴다. 링크에는 창문 5번째·가구 6번째 칸으로 담기며, 이 칸이 없는 예전 링크는 null로 읽는다.
- QC-03(가구 20개 재계산 100ms)은 Windows의 Playwright WebKit에서 프레임당 약 110~140ms가 나와 가끔 실패한다. React 갱신 자체는 1ms 미만이고, WebKit의 SVG 그리기 비용이다.
- PRD에 없지만 넣은 것: 선택한 가구 카드의 위치 X/Y 입력 칸(키보드 사용자용, E2E도 이걸로 가구 위치를 정함), 가구 이름 최대 10자(링크 2,000자 제한을 지키려고), 창문 폭 30cm 미만일 때 문구.

## 판정 로직에서 틀리기 쉬운 점 (PRD 4장)

- 계산은 모두 cm 정수, 원점은 방 왼쪽 위, y는 아래로 증가. 가구는 축 정렬 `(x, y, w, h)`.
- 회전: `w`·`h` 교환, 중심 유지, 방 안으로 보정하지 않음(밖으로 나가면 R1).
- 드래그 스냅 10cm, 치수 입력 1cm, 화살표 10cm / Shift+화살표 1cm.
- 문 열림 판정은 사분원이 아니라 **문 폭 × 문 폭 정사각형** 근사 (화면에는 사분원으로 그림).
- 겹침(R2·R3)은 넓이 > 0일 때만. 변이 맞닿는 것은 허용.
- R4 통로: 간격 **0 초과 60 미만**일 때만 주의, 0cm(딱 붙임)는 경고 없음. 마주 보는 변이 겹치는 구간이 있을 때만 계산. 같은 쌍은 한 번만, 두 가구 모두 주의.
- 가구별 최종 판정은 가장 심각한 등급(문제 > 주의 > 통과), 사유는 전부 표시.
- 남은 바닥 면적은 겹침·벽 밖 부분도 그대로 합산.
- 판정 색은 디자인 토큰이 아니라 PRD 3.5 값을 쓴다: 문제 `#A11B1B`/`#FCE4E4`, 주의 `#8A5A00`/`#FFF3D6`, 통과 `#1E6B3A`/`#E3F3E8`. 색만으로 구분하지 말고 기호(●▲✓)와 테두리(실선/점선)를 함께 쓴다.
- 완료 조건 AC-01~15에 구체적 좌표·기대값이 있으므로 단위·E2E 테스트 케이스로 그대로 옮긴다.
