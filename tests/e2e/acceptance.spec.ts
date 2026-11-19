import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  addCustom,
  addPreset,
  block,
  card,
  placeSelected,
  selectByCard,
  startPlainRoom,
  startWithExample,
} from './helpers';

test.describe('화면 1 방 설정', () => {
  test('AC-01: 320×400을 넣으면 비율이 맞는 방과 12.8㎡', async ({ page }) => {
    await page.goto('/');
    await page.locator('#room-w').fill('320');
    await page.locator('#room-h').fill('400');
    await expect(page.getByTestId('room-area')).toContainText('12.8㎡');
    const preview = page.getByRole('group', { name: /방 평면 미리보기/ });
    const box = (await preview.boundingBox())!;
    const vb = (await preview.getAttribute('viewBox'))!.split(' ').map(Number);
    expect(box.width / box.height).toBeCloseTo(vb[2] / vb[3], 1);
    await expect(preview.getByText('320cm')).toBeVisible();
    await expect(preview.getByText('400cm')).toBeVisible();
  });

  test('AC-02: 가로 100이면 오류 문구와 다음 버튼 비활성', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '원룸 예시 불러오기' }).click();
    await page.locator('#room-w').fill('100');
    await expect(page.getByText('150~1,000cm 사이로 입력해 주세요')).toBeVisible();
    await expect(page.getByRole('button', { name: '다음: 가구 배치하기' })).toBeDisabled();
  });

  test('AC-03: 아래 벽 40cm, 폭 80cm 문의 부채꼴', async ({ page }) => {
    await page.goto('/');
    await page.locator('#room-w').fill('320');
    await page.locator('#room-h').fill('400');
    await page.getByRole('group', { name: '문이 있는 벽' }).getByRole('button', { name: '아래' }).click();
    await page.locator('#door-offset').fill('40');
    await page.locator('#door-width').fill('80');
    const arc = page.locator('[data-door] path');
    await expect(arc).toHaveAttribute('d', /^M 40 400 L 40 320 A 80 80 0 0 1 120 400 Z$/);
  });
});

test.describe('화면 2 가구 배치와 판정', () => {
  test('AC-04·05: 문 막힘 문제가 생기고 옮기면 사라진다', async ({ page }) => {
    await startPlainRoom(page);
    await addCustom(page, '침대', 150, 200);
    await placeSelected(page, 0, 190);
    await expect(block(page, '침대')).toHaveAttribute('data-level', 'problem');
    await expect(card(page, '침대')).toContainText('문 열림 범위를 막아요');

    await placeSelected(page, 0, 100);
    await expect(card(page, '침대')).not.toContainText('문 열림 범위를 막아요');
  });

  test('AC-06·07·08: 통로 20cm 주의, 딱 붙이면 경고 없음, 겹치면 둘 다 문제', async ({ page }) => {
    await startPlainRoom(page);
    await addCustom(page, '침대', 150, 200);
    await placeSelected(page, 0, 100);
    await addPreset(page, '책상');
    await placeSelected(page, 170, 150);

    await expect(block(page, '침대')).toHaveAttribute('data-level', 'warn');
    await expect(block(page, '책상')).toHaveAttribute('data-level', 'warn');
    await expect(card(page, '책상')).toContainText('침대와 통로가 20cm예요');
    await expect(card(page, '침대')).toContainText('책상과 통로가 20cm예요');
    await expect(page.locator('[data-gap="20"]')).toBeVisible();

    await placeSelected(page, 150, 150);
    await expect(card(page, '침대')).not.toContainText('책상과 통로');
    await expect(card(page, '책상')).not.toContainText('침대와 통로');

    await placeSelected(page, 100, 150);
    await expect(block(page, '침대')).toHaveAttribute('data-level', 'problem');
    await expect(block(page, '책상')).toHaveAttribute('data-level', 'problem');
  });

  test('AC-09: 벽 밖으로 끌면 문제와 최대 치수 안내', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    const b = block(page, '수납장');
    const box = (await b.boundingBox())!;
    const plan = (await page.getByRole('group', { name: /가구 배치 평면도/ }).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(plan.x + plan.width - 2, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(b).toHaveAttribute('data-level', 'problem');
    await expect(card(page, '수납장')).toContainText('벽 밖으로 나가요');
    await expect(card(page, '수납장')).toContainText('이 벽에는 최대 320cm까지 들어가요');
    // 끌어 옮기면 10cm 단위로 맞춰진다
    const x = Number(await page.locator('#sel-x').inputValue());
    expect(x % 10).toBe(0);
  });

  test('AC-10: 300×200을 회전하면 200×300', async ({ page }) => {
    await startPlainRoom(page);
    await addCustom(page, '소파', 300, 200);
    await page.getByRole('button', { name: '↻ 90° 회전' }).click();
    await expect(page.locator('#sel-w')).toHaveValue('200');
    await expect(page.locator('#sel-h')).toHaveValue('300');
    await expect(block(page, '소파')).toHaveAttribute('aria-label', /200×300cm/);
  });

  test('AC-11: 침대·책상·옷장이면 남은 바닥 72.5%', async ({ page }) => {
    await startWithExample(page);
    await addPreset(page, '침대');
    await addPreset(page, '책상');
    await addPreset(page, '옷장');
    await expect(page.getByTestId('free-area')).toHaveText('72.5%');
  });

  test('AC-12: 방 설정 수정 후 돌아와도 가구 유지', async ({ page }) => {
    await startWithExample(page);
    await addPreset(page, '침대');
    await addPreset(page, '책상');
    await page.getByRole('button', { name: '방 설정 수정' }).click();
    await expect(page.locator('#room-w')).toHaveValue('320');
    await page.getByRole('button', { name: '다음: 가구 배치하기' }).click();
    await expect(page.locator('[data-furniture]')).toHaveCount(2);
  });

  test('F-209: 화살표 10cm, Shift+화살표 1cm', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    await placeSelected(page, 100, 100);
    await block(page, '수납장').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    await expect(page.locator('#sel-x')).toHaveValue('110');
    await expect(page.locator('#sel-y')).toHaveValue('101');
  });
});

test.describe('화면 2-1 저장·공유', () => {
  test('AC-13: PNG 이미지 저장', async ({ page }) => {
    await startWithExample(page);
    await addPreset(page, '침대');
    await page.getByRole('button', { name: '배치도 저장·공유' }).click();
    await expect(page.getByRole('dialog', { name: '배치도 저장·공유' })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PNG 이미지로 저장' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^room-layout-\d{8}\.png$/);
    const bytes = readFileSync((await download.path())!);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(2400); // 가로 1200px × 2배
  });

  test('AC-14·F-304: 링크를 새 창에서 열면 같은 배치', async ({ page, context }) => {
    await startWithExample(page);
    await addPreset(page, '침대');
    await addPreset(page, '책상');
    await placeSelected(page, 170, 150);
    await page.getByRole('button', { name: '배치도 저장·공유' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('share-summary')).toBeVisible();
    await expect(dialog.getByRole('list', { name: '가구 치수' })).toContainText('침대110×200cm');
    await dialog.getByRole('button', { name: '링크 복사' }).click();
    await expect(dialog.getByRole('status')).toContainText(/복사/);
    const url = await dialog.locator('#share-link').inputValue();
    expect(url).toMatch(/#v=1&s=/);

    const other = await context.newPage();
    await other.goto(url);
    await expect(other.getByRole('heading', { name: /방 320×400cm/ })).toBeVisible();
    await expect(other.locator('[data-furniture]')).toHaveCount(2);
    await expect(block(other, '책상')).toHaveAttribute('aria-label', /위치 170, 150/);
  });

  test('AC-15: 잘못된 링크는 안내와 빈 화면 1', async ({ page }) => {
    await page.goto('/#v=1&s=broken!!');
    await expect(page.getByRole('alert')).toContainText('링크를 열 수 없어요. 처음부터 시작해 주세요');
    await expect(page.locator('#room-w')).toHaveValue('');
  });
});

test('통로 표시는 선택과 무관하게 판정 카드와 함께 갱신된다', async ({ page }) => {
  await startPlainRoom(page);
  await addCustom(page, '침대', 150, 200);
  await placeSelected(page, 0, 100);
  await addPreset(page, '책상');
  await placeSelected(page, 170, 150);
  await selectByCard(page, '침대');
  await expect(page.locator('#sel-w')).toHaveValue('150');
});
