import { expect, type Page } from '@playwright/test';

// QA.md 시나리오용: 공유 링크 형식으로 원하는 방·가구 상태를 바로 연다.
// 가구: [이름, x, y, 가로, 세로, 높이?, 열림코드?, 깊이?]
// 열림코드 = 종류(0여닫이 1미닫이 2서랍) × 4 + 앞면(0위 1아래 2왼쪽 3오른쪽)
export type F = (string | number | null)[];
export interface QaState {
  r?: [number, number];
  d?: number[];
  ws?: (number | null)[][];
  f?: F[];
}

/** 창문 없는 320×400, 아래 벽 문(40, 폭 80) */
export const PLAIN: QaState = { r: [320, 400], d: [1, 40, 80, 0], ws: [] };
/** 원룸 예시: 오른쪽 벽 미닫이 창(140, 폭 120, 창틀 90) */
export const EXAMPLE: QaState = { r: [320, 400], d: [1, 40, 80, 0], ws: [[3, 140, 120, 0, 90]] };

export const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

export function hashOf(s: QaState) {
  return `#v=1&s=${enc({ r: s.r ?? [320, 400], d: s.d ?? [1, 40, 80, 0], ws: s.ws ?? [], f: s.f ?? [] })}`;
}

/** 상태를 담은 링크로 화면 2를 연다 */
export async function openState(page: Page, s: QaState) {
  await page.goto('/' + hashOf(s));
  await expect(page.getByRole('heading', { name: /^방 \d+×\d+cm/ })).toBeVisible();
}

export const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
