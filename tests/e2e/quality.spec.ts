import { expect, test } from '@playwright/test';
import { addPreset, presetButton, startWithExample, tabTo } from './helpers';

test('QC-02: 360px 화면에서 가로 스크롤이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: '원룸 예시 불러오기' }).click();
  await page.getByRole('button', { name: '+ 창문 추가' }).click();
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await noOverflow()).toBe(true);

  await page.getByRole('button', { name: '창문 2 삭제' }).click();
  await page.getByRole('button', { name: '다음: 가구 배치하기' }).click();
  await addPreset(page, '침대');
  await addPreset(page, '책상');
  expect(await noOverflow()).toBe(true);

  await page.getByRole('button', { name: '배치도 저장·공유' }).click();
  expect(await noOverflow()).toBe(true);
});

test('QC-04: 키보드만으로 방 설정 → 가구 추가 → 저장', async ({ page }) => {
  await page.goto('/');
  await tabTo(page, /^원룸 예시 불러오기$/);
  await page.keyboard.press('Enter');
  await tabTo(page, /^다음: 가구 배치하기$/);
  await page.keyboard.press('Enter');
  await tabTo(page, /^침대110×200$/);
  await page.keyboard.press('Enter');
  await tabTo(page, /^침대 110×200cm/);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#sel-x')).toHaveValue('95');
  await tabTo(page, /^배치도 저장·공유$/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  const downloading = page.waitForEvent('download');
  await tabTo(page, /^PNG 이미지로 저장$/);
  await page.keyboard.press('Enter');
  expect((await downloading).suggestedFilename()).toMatch(/\.png$/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('QC-05: 최초 로딩 이후 외부 요청이 없다', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (r) => {
    if (!/^(data|blob):/.test(r.url())) requests.push(r.url());
  });

  await page.getByRole('button', { name: '원룸 예시 불러오기' }).click();
  await page.getByRole('button', { name: '다음: 가구 배치하기' }).click();
  await addPreset(page, '침대');
  await addPreset(page, '옷장');
  await page.getByRole('button', { name: '배치도 저장·공유' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG 이미지로 저장' }).click();
  await downloading;
  await page.getByRole('button', { name: '링크 복사' }).click();
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);
});

test('QC-03: 가구 20개에서도 끌어 옮기는 동안 판정이 바로 갱신된다', async ({ page }) => {
  await startWithExample(page);
  for (let i = 0; i < 20; i++) await addPreset(page, '수납장');
  await expect(presetButton(page, '수납장')).toBeDisabled();
  const t = await page.evaluate(async () => {
    const el = document.querySelector('[data-furniture]') as SVGGElement;
    el.focus();
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    return (performance.now() - start) / 10;
  });
  expect(t).toBeLessThan(100);
});
