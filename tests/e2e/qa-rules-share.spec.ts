import { readFileSync } from 'node:fs';
import { devices, expect, test, type Page } from '@playwright/test';
import { addPreset, block, card, startPlainRoom, startWithExample } from './helpers';
import { PLAIN, enc, hashOf, noHorizontalScroll, openState, type F } from './qa-helpers';

// QA.md 3.10 ~ 3.14 중 화면에서만 확인할 수 있는 것.
// 판정 계산(R-xx), 면적 계산, 링크 해석은 tests/unit 에서 검사하므로 여기서는 화면 표시만 본다.

const R = (page: Page, f: F[], base = PLAIN) => openState(page, { ...base, f });
const BED_DOOR: F = ['침대', 0, 190, 150, 200];

test.describe('QA 판정 화면 표시', () => {
  test('R-07 문 막힘 사유와 고치는 방법이 카드에 나옴', async ({ page }) => {
    await R(page, [BED_DOOR]);
    await expect(card(page, '침대')).toContainText('문 열림 범위를 막아요');
    await expect(card(page, '침대')).toContainText('70cm 옮기거나 폭을 40cm 이하로 줄여 보세요');
  });
  test('R-11 통로 부족 표시선과 거리', async ({ page }) => {
    await R(page, [['침대', 0, 100, 150, 200], ['책상', 170, 150, 120, 60]]);
    await expect(page.locator('[data-gap="20"]')).toBeVisible();
  });
  test('R-27 막힌 문 열림 공간은 빨갛게', async ({ page }) => {
    await R(page, [['옷장', 0, 0, 100, 60, 200, 1, 50], ['침대', 0, 90, 110, 200]]);
    await expect(card(page, '침대')).toContainText('옷장 문 열림 범위를 막아요');
    await expect(page.locator('[data-front-zone][data-blocked]')).toHaveCount(1);
  });
  test('R-33·35 문제 사유가 먼저, 판정 패널 개수', async ({ page }) => {
    await R(page, [BED_DOOR, ['책상', 170, 150, 120, 60]]);
    const text = await card(page, '침대').innerText();
    expect(text.indexOf('문 열림 범위를 막아요')).toBeGreaterThan(-1);
    expect(text.indexOf('문 열림 범위를 막아요')).toBeLessThan(text.indexOf('통로가'));
    await expect(page.getByTestId('verdict-counts')).toHaveText(/문제 1.*주의 1.*통과 0/);
  });
});

test.describe('QA 남은 바닥 면적 표시', () => {
  test('A-03 정수면 소수점 없음', async ({ page }) => {
    await R(page, [['큰장', 0, 0, 160, 400]]);
    await expect(page.getByTestId('free-area')).toHaveText('50%');
  });
  test('A-05 0% 미만 (결과 기록용)', async ({ page }) => {
    await openState(page, { r: [150, 150], d: [1, 40, 80, 0], ws: [], f: [['큰가구', 0, 0, 400, 400]] });
    const v = await page.getByTestId('free-area').innerText();
    test.info().annotations.push({ type: 'observed', description: v });
  });
});

test.describe('QA 저장·공유', () => {
  const open = (page: Page) => page.getByRole('button', { name: '배치도 저장·공유' }).click();

  test('SH-01 × 버튼으로 닫기', async ({ page }) => {
    await R(page, [['침대', 0, 0, 110, 200]]);
    await open(page);
    await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(block(page, '침대')).toHaveCount(1);
  });
  test('SH-02 가구 없음 요약', async ({ page }) => {
    await R(page, []);
    await open(page);
    await expect(page.getByTestId('share-summary')).toHaveText('아직 놓인 가구가 없어요');
    await expect(page.getByRole('list', { name: '가구 치수' })).toHaveCount(0);
  });
  test('SH-03 모두 통과 요약', async ({ page }) => {
    await R(page, [['침대', 0, 0, 110, 200]]);
    await open(page);
    await expect(page.getByTestId('share-summary')).toHaveText('✓ 모든 가구가 통과했어요');
  });
  test('SH-04 문제·주의 요약', async ({ page }) => {
    await R(page, [BED_DOOR, ['책상', 170, 150, 120, 60]]);
    await open(page);
    await expect(page.getByTestId('share-summary')).toHaveText('● 문제 1개 · ▲ 주의 1개');
  });
  test('SH-05 치수 목록 (높이 있음/없음)', async ({ page }) => {
    await R(page, [['침대', 0, 0, 110, 200, 45], ['상자', 200, 0, 50, 50, null]]);
    await open(page);
    const list = page.getByRole('list', { name: '가구 치수' });
    await expect(list).toContainText('110×200cm · 높이 45cm');
    await expect(list.getByRole('listitem').filter({ hasText: '상자' })).toHaveText(/상자\s*50×50cm$/);
  });
  test('SH-06 미리보기에 × ↻ 버튼 없음, 범례 있음', async ({ page }) => {
    await R(page, [['침대', 0, 0, 110, 200]]);
    await block(page, '침대').focus();
    await open(page);
    const d = page.getByRole('dialog');
    await expect(d.locator('[data-rotate-handle], [data-remove-handle]')).toHaveCount(0);
    await expect(d.getByText('남은 바닥 82.8%')).toBeVisible();
  });
  test('SH-07·08 PNG 저장 (한글 이름 포함)', async ({ page }, info) => {
    await R(page, [['옷장', 0, 0, 100, 60, 200, 1, 50], ['침대', 0, 90, 110, 200, 45], ['책상', 170, 150, 120, 60]]);
    await open(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG 이미지로 저장' }).click()]);
    expect(dl.suggestedFilename()).toMatch(/^room-layout-\d{8}\.png$/);
    const out = info.outputPath('qa-layout.png');
    await dl.saveAs(out);
    const bytes = readFileSync(out);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(2400);
    await expect(page.getByRole('status')).toHaveText('PNG 이미지를 저장했어요.');
    info.annotations.push({ type: 'png', description: out });
  });
  test('SH-09 큰 방 + 가구 20개 PNG', async ({ page }, info) => {
    const f: F[] = Array.from({ length: 20 }, (_, i) => [`가구${i + 1}`, (i % 5) * 180, Math.floor(i / 5) * 220, 150, 180, 100]);
    await openState(page, { r: [1000, 1000], d: [1, 40, 80, 0], ws: [], f });
    await open(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG 이미지로 저장' }).click()]);
    const out = info.outputPath('qa-big.png');
    await dl.saveAs(out);
    expect(readFileSync(out).readUInt32BE(16)).toBe(2400);
    info.annotations.push({ type: 'png', description: out });
  });
  test('SH-11 클립보드 실패 시 직접 복사 안내', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
        configurable: true,
      });
    });
    await R(page, [['침대', 0, 0, 110, 200]]);
    await open(page);
    await page.getByRole('button', { name: '링크 복사' }).click();
    await expect(page.getByRole('status')).toHaveText('자동 복사가 안 돼요. 선택된 링크를 직접 복사해 주세요 (Ctrl+C).');
    const sel = await page.evaluate(() => {
      const el = document.getElementById('share-link') as HTMLInputElement;
      return document.activeElement === el && el.selectionStart === 0 && el.selectionEnd === el.value.length;
    });
    expect(sel).toBe(true);
  });
  test('SH-12·13 링크 칸 전체 선택, 현재 주소로 만들어짐', async ({ page, baseURL }) => {
    await R(page, [['침대', 0, 0, 110, 200]]);
    await open(page);
    const input = page.locator('#share-link');
    await input.click();
    await expect
      .poll(() => input.evaluate((el: HTMLInputElement) => el.selectionStart === 0 && el.selectionEnd === el.value.length))
      .toBe(true);
    expect(await input.inputValue()).toMatch(new RegExp(`^${new URL(baseURL!).origin}/#v=1&s=`));
  });
});

test.describe('QA 공유 링크 화면', () => {
  test('L-02 받은 사람이 고쳐도 보낸 사람 화면은 그대로', async ({ page, context }) => {
    await R(page, [['침대', 0, 0, 110, 200]]);
    const other = await context.newPage();
    await other.goto('/' + hashOf({ ...PLAIN, f: [['침대', 0, 0, 110, 200]] }));
    await other.locator('[data-furniture]').first().focus();
    await other.keyboard.press('ArrowRight');
    await expect(block(other, '침대')).toHaveAttribute('aria-label', /위치 10, 0/);
    await expect(block(page, '침대')).toHaveAttribute('aria-label', /위치 0, 0/);
  });
  test('L-04·05 예전 형식 링크가 화면에 미닫이·모름·없음으로 채워짐', async ({ page }) => {
    await page.goto('/#v=1&s=' + enc({ r: [320, 400], d: [1, 40, 80, 0], ws: [[3, 140, 120]], f: [['bed', 0, 100, 110, 200]] }));
    await block(page, 'bed').focus();
    await expect(page.locator('#sel-ht')).toHaveValue('');
    await expect(page.getByRole('group', { name: '열림 방식' }).getByRole('button', { name: '없음' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '방 설정 수정' }).click();
    await expect(page.getByRole('group', { name: '창문 1 종류' }).getByRole('button', { name: '미닫이' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#win-w1-sill')).toHaveValue('');
  });
  test('L-24 # 뒤 내용은 서버로 가지 않음', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await R(page, [['침대', 0, 0, 110, 200]]);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.some((u) => u.includes('v=1&s='))).toBe(false);
  });
});

test.describe('QA 비기능', () => {
  for (const width of [768, 1024]) {
    test(`N-03 ${width}px에서 가로 스크롤 없음`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.getByRole('button', { name: '원룸 예시 불러오기' }).click();
      expect(await noHorizontalScroll(page)).toBe(true);
      await page.getByRole('button', { name: '다음: 가구 배치하기' }).click();
      await addPreset(page, '침대');
      await addPreset(page, '옷장');
      expect(await noHorizontalScroll(page)).toBe(true);
    });
  }

  test('N-07 로딩 후 오프라인에서도 판정·PNG·링크 동작', async ({ page, context }) => {
    await startWithExample(page);
    await context.setOffline(true);
    await addPreset(page, '침대');
    await addPreset(page, '옷장');
    await expect(page.getByTestId('verdict-counts')).toBeVisible();
    await page.getByRole('button', { name: '배치도 저장·공유' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG 이미지로 저장' }).click()]);
    expect(dl.suggestedFilename()).toMatch(/\.png$/);
    expect(await page.locator('#share-link').inputValue()).toMatch(/#v=1&s=/);
    await context.setOffline(false);
  });

  test('N-09 스크린 리더용 이름', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await expect(block(page, '침대')).toHaveAttribute('aria-label', /^침대 110×200cm, 높이 45cm, 위치 \d+, \d+, 판정 (통과|주의|문제)$/);
    await expect(page.getByRole('button', { name: '침대 90° 회전' })).toBeVisible();
    await expect(page.getByRole('button', { name: '침대 삭제' })).toBeVisible();
  });

  test('N-10 색 말고도 기호·테두리로 구분', async ({ page }) => {
    await R(page, [BED_DOOR, ['책상', 170, 150, 120, 60], ['상자', 280, 0, 40, 40]]);
    await expect(block(page, '침대')).toContainText('●');
    await expect(block(page, '책상')).toContainText('▲');
    await expect(block(page, '책상').locator('rect').last()).toHaveAttribute('stroke-dasharray', '6 4');
    await expect(page.locator('[data-furniture][data-level="pass"]').first()).toContainText('✓');
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType: _ignored, ...pixel5 } = devices['Pixel 5'];

test.describe('QA 비기능 터치 (휴대폰)', () => {
  test.use(pixel5);
  test('N-04 탭으로 추가·선택·회전·삭제, 평면도는 터치 스크롤 막음', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Pixel 5 에뮬레이션은 Chromium 기준');
    await page.goto('/');
    await page.getByRole('button', { name: '원룸 예시 불러오기' }).tap();
    await page.getByRole('button', { name: '다음: 가구 배치하기' }).tap();
    await page.locator('section[aria-labelledby="add-title"]').getByRole('button', { name: /^침대\s*\d/ }).tap();
    await page.getByRole('button', { name: '침대 90° 회전' }).tap();
    await expect(block(page, '침대')).toHaveAttribute('aria-label', /200×110cm/);
    await page.getByRole('button', { name: '침대 삭제' }).tap();
    await expect(block(page, '침대')).toHaveCount(0);
    const touchAction = await page.getByRole('group', { name: /가구 배치 평면도/ }).evaluate((el) => getComputedStyle(el).touchAction);
    expect(touchAction).toBe('none');
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});
