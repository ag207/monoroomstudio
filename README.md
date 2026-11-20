# monoroomstudio · 방 배치 체크

가구를 사기 전에 **"방에 들어가는지, 문이 막히지 않는지, 통로가 남는지"**를 바로 판정해 주는 웹 서비스입니다.
방 치수와 문·창문 위치를 넣고 가구를 놓아 보면, 규칙에 따라 문제·주의·통과를 표시하고 배치도를 PNG나 링크로 공유할 수 있습니다.

**바로 쓰기: https://monoroomstudio.vercel.app**

- 로그인 없음, 서버 저장 없음, 외부 API·AI 없음. 모든 판정은 브라우저 안에서 계산합니다.
- 배치는 주소(`#` 뒤)에 담깁니다. 링크를 보내면 받은 사람이 같은 배치를 열고 이어서 고칠 수 있습니다.

## 쓰는 법

1. **방 설정**: 가로·세로(cm), 문(벽·위치·폭·경첩), 창문 0~4개(벽·위치·폭·종류·창틀 높이). "원룸 예시 불러오기"로 바로 시작할 수 있습니다.
2. **가구 배치**: 침대·책상·옷장·수납장 또는 직접 입력한 가구를 놓고 끌어서 옮깁니다.
   - 선택한 가구 위의 **↻** (또는 R키)로 회전, **×** (또는 Delete)로 삭제
   - 화살표 10cm, Shift+화살표 1cm 이동
   - 왼쪽 카드에서 치수·위치·높이·문/서랍 설정
   - **배치 추천받기**: 놓은 가구를 판정 규칙이 가장 좋은 자리·방향으로 다시 놓음 (AI 아님, 규칙 기반). "되돌리기"로 원래대로
3. **저장·공유**: 판정이 표시된 배치도를 PNG로 받거나 링크를 복사합니다.

## 판정 규칙

| 규칙 | 언제 | 등급 |
|---|---|---|
| R1 벽 밖 | 가구가 방을 벗어남 | 문제 |
| R2 겹침 | 가구끼리 겹침 (맞닿기는 괜찮음) | 문제 |
| R3 문 막힘 | 방문 열림 범위(문 폭 × 문 폭)를 막음 | 문제 |
| R4 통로 부족 | 가구·벽 사이가 0cm 초과 60cm 미만 | 주의 |
| R5 창문 가림 | 창문 벽 10cm 안, 가구가 창틀보다 높거나 높이를 모름 | 주의 |
| R6 여닫이 창 | 여닫이 창 열림 범위를 창틀보다 높은 가구가 막음 | 주의 |
| R7 문·서랍 | 가구 앞 문·서랍 열 공간이 벽이나 다른 가구에 막힘 | 문제 |

남은 바닥 면적(%)도 함께 보여 줍니다. 자세한 기준은 [PRD.md](PRD.md) 4장을 보세요 (R6·R7은 PRD 이후 추가).

## 개발

Node.js LTS가 필요합니다.

```powershell
npm install
npm run dev        # http://localhost:5173
```

| 명령 | 내용 |
|---|---|
| `npm run build` | 타입 검사 + 정적 빌드 (`dist/`) |
| `npm test` | 단위 테스트 (Vitest, 판정·검증·링크) |
| `npm run e2e` | E2E 테스트 (Playwright, Chromium·WebKit). 처음 한 번 `npx playwright install chromium webkit` |
| `npm run lint` | ESLint |

배포된 주소에 대고 E2E를 돌리려면 `$env:E2E_BASE_URL='https://monoroomstudio.vercel.app'; npm run e2e`.

### 기술 스택

TypeScript, React, Vite, SVG 평면도, Vitest, Playwright, Vercel(정적 배포).

### 폴더

| 폴더 | 내용 |
|---|---|
| `src/rules/` | 판정 엔진 (R1~R7, 면적). React에 의존하지 않는 순수 함수 |
| `src/state/` | 상태(reducer), 입력 검증 |
| `src/share/` | 공유 링크 인코딩·해석, PNG 저장 |
| `src/screens/`, `src/components/` | 화면과 평면도(SVG) |
| `tests/unit/`, `tests/e2e/` | 단위·E2E 테스트 |

## 배포

`main` 브랜치에 push하면 Vercel이 자동으로 빌드·배포합니다 (`vercel.json`).

## 문서

- [PRD.md](PRD.md): 요구사항, 판정 규칙, 완료 조건
- [QA.md](QA.md): 기능 목록과 QA 시나리오
- [QA-RESULT.md](QA-RESULT.md): 최근 QA 결과
- [DESIGN-notion.md](DESIGN-notion.md): 디자인 참고 토큰
- [CLAUDE.md](CLAUDE.md): 코드 작업 안내 (아키텍처, 주의점)
