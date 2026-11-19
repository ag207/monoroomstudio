import { expect, type Page } from '@playwright/test';

/** 화면 1을 예시 방(320×400, 아래 벽 문 40/80)으로 채우고 화면 2로 간다 */
export async function startWithExample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '원룸 예시 불러오기' }).click();
  await page.getByRole('button', { name: '다음: 가구 배치하기' }).click();
  await expect(page.getByRole('heading', { name: /방 320×400cm/ })).toBeVisible();
}

/** 창문 없는 320×400 방, 아래 벽 문(40, 폭 80) */
export async function startPlainRoom(page: Page) {
  await page.goto('/');
  await page.locator('#room-w').fill('320');
  await page.locator('#room-h').fill('400');
  await page.getByRole('group', { name: '문이 있는 벽' }).getByRole('button', { name: '아래' }).click();
  await page.locator('#door-offset').fill('40');
  await page.locator('#door-width').fill('80');
  await page.getByRole('button', { name: '다음: 가구 배치하기' }).click();
  await expect(page.getByRole('heading', { name: /방 320×400cm/ })).toBeVisible();
}

export async function addCustom(page: Page, name: string, w: number, h: number) {
  const toggle = page.getByRole('button', { name: '+ 직접 입력' });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await page.locator('#custom-name').fill(name);
  await page.locator('#custom-w').fill(String(w));
  await page.locator('#custom-h').fill(String(h));
  await page.getByRole('button', { name: '추가', exact: true }).click();
}

export const presetButton = (page: Page, name: string) =>
  page.locator('section[aria-labelledby="add-title"]').getByRole('button', { name: new RegExp(`^${name}\\s*\\d`) });

export async function addPreset(page: Page, name: string) {
  await presetButton(page, name).click();
}

/** 선택한 가구의 위치를 입력 칸으로 정한다 */
export async function placeSelected(page: Page, x: number, y: number) {
  await page.locator('#sel-x').fill(String(x));
  await page.locator('#sel-y').fill(String(y));
}

/** 판정 카드에서 가구를 선택한다 */
export async function selectByCard(page: Page, name: string) {
  await page.locator('[data-verdict]').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button').click();
}

export const card = (page: Page, name: string) =>
  page.locator('[data-verdict]').filter({ has: page.getByRole('heading', { name, exact: true }) });

export const block = (page: Page, name: string) => page.locator(`[data-furniture][aria-label^="${name} "]`);

/** Tab 키만으로 이름(글자 또는 aria-label)이 맞는 요소까지 이동한다 */
export async function tabTo(page: Page, match: RegExp, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const name = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? el.getAttribute('aria-label') || el.textContent || '' : '';
    });
    if (match.test(name.trim())) return;
  }
  throw new Error(`Tab으로 ${match} 에 도달하지 못했어요`);
}
