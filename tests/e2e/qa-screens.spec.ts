import { expect, test, type Page } from '@playwright/test';
import { addCustom, addPreset, block, card, placeSelected, presetButton, selectByCard, startPlainRoom, startWithExample } from './helpers';
import { EXAMPLE, openState } from './qa-helpers';

// QA.md 3.2 ~ 3.9 중 기존 E2E에 없던 시나리오. 테스트 이름 앞의 ID가 QA.md의 ID다.

const next = (page: Page) => page.getByRole('button', { name: '다음: 가구 배치하기' });
const example = (page: Page) => page.getByRole('button', { name: '원룸 예시 불러오기' });
const err = (page: Page, id: string) => page.locator(`#${id}-err`);

test.describe('QA 화면 1 방 크기', () => {
  test.beforeEach(async ({ page }) => page.goto('/'));

  test('S1-02 최소 경계 150 통과 / 149 오류', async ({ page }) => {
    await example(page).click();
    await page.locator('#room-w').fill('150');
    await expect(next(page)).toBeEnabled();
    await page.locator('#room-w').fill('149');
    await expect(err(page, 'room-w')).toHaveText('150~1,000cm 사이로 입력해 주세요');
    await expect(next(page)).toBeDisabled();
  });

  test('S1-03 최대 경계 1000 통과 / 1001 오류', async ({ page }) => {
    await example(page).click();
    await page.locator('#room-h').fill('1000');
    await expect(next(page)).toBeEnabled();
    await page.locator('#room-h').fill('1001');
    await expect(err(page, 'room-h')).toHaveText('150~1,000cm 사이로 입력해 주세요');
  });

  test('S1-05 빈칸 오류는 칸을 떠난 뒤에만', async ({ page }) => {
    await page.locator('#room-w').click();
    await page.keyboard.type('3');
    await page.keyboard.press('Backspace');
    await expect(err(page, 'room-w')).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(err(page, 'room-w')).toHaveText('숫자를 입력해 주세요');
  });

  test('S1-06 첫 화면: 오류 문구 없음, 다음 비활성, 안내', async ({ page }) => {
    await expect(page.locator('.field-error')).toHaveCount(0);
    await expect(next(page)).toBeDisabled();
    await expect(page.getByText('모든 칸을 올바르게 채우면')).toBeVisible();
  });

  test('S1-07 소수는 반올림', async ({ page }) => {
    await page.locator('#room-w').fill('320.6');
    await expect(page.locator('#room-w')).toHaveValue('321');
  });

  test('S1-08 음수·0은 범위 오류', async ({ page }) => {
    for (const v of ['-320', '0']) {
      await page.locator('#room-w').fill(v);
      await expect(err(page, 'room-w')).toHaveText('150~1,000cm 사이로 입력해 주세요');
    }
  });

  test('S1-09 숫자 아닌 글자는 빈칸 취급, 1e3은 범위 안', async ({ page }) => {
    await page.locator('#room-w').click();
    await page.keyboard.type('abc');
    await page.keyboard.press('Tab');
    await expect(page.locator('#room-w')).toHaveValue('');
    await expect(err(page, 'room-w')).toHaveText('숫자를 입력해 주세요');
    await page.locator('#room-w').fill('1e3');
    await expect(err(page, 'room-w')).toHaveCount(0);
  });

  test('S1-10 미리보기 즉시 갱신', async ({ page }) => {
    await example(page).click();
    await page.locator('#room-w').fill('500');
    const preview = page.getByRole('group', { name: /방 평면 미리보기/ });
    await expect(preview.getByText('500cm')).toBeVisible();
    await expect(page.getByTestId('room-area')).toContainText('20㎡');
  });

  test('S1-11 아주 큰 방·작은 방', async ({ page }) => {
    await example(page).click();
    await page.locator('#room-w').fill('1000');
    await page.locator('#room-h').fill('1000');
    await expect(page.getByTestId('room-area')).toContainText('100㎡');
    await expect(page.getByRole('group', { name: /방 평면 미리보기/ })).toBeVisible();
    await page.locator('#room-w').fill('150');
    await page.locator('#room-h').fill('150');
    await expect(page.getByTestId('room-area')).toContainText('2.3㎡');
  });
});

test.describe('QA 화면 1 문', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await example(page).click();
  });

  test('S1-21 벽 바꾸면 부채꼴·라벨 변경', async ({ page }) => {
    await page.getByRole('group', { name: '문이 있는 벽' }).getByRole('button', { name: '왼쪽' }).click();
    await expect(page.getByText('위쪽 모서리에서 거리')).toBeVisible();
    await expect(page.getByRole('group', { name: '경첩 위치' }).getByRole('button', { name: '위' })).toBeVisible();
    await expect(page.locator('[data-door] path')).toHaveAttribute('d', /^M 0 40 /);
  });

  test('S1-22 경첩 바꾸면 부채꼴만 바뀌고 판정은 같음', async ({ page }) => {
    await page.getByRole('group', { name: '경첩 위치' }).getByRole('button', { name: '오른쪽' }).click();
    await expect(page.locator('[data-door] path')).toHaveAttribute('d', /^M 120 400 /);
    await next(page).click();
    await addCustom(page, '침대', 150, 200);
    await placeSelected(page, 0, 190);
    await expect(card(page, '침대')).toContainText('문 열림 범위를 막아요');
  });

  test('S1-23 문 폭 경계 59/60/120/121', async ({ page }) => {
    for (const [v, ok] of [['59', false], ['60', true], ['120', true], ['121', false]] as const) {
      await page.locator('#door-width').fill(v);
      if (ok) await expect(err(page, 'door-width')).toHaveCount(0);
      else await expect(err(page, 'door-width')).toHaveText('문 폭은 60~120cm 사이로 입력해 주세요');
    }
  });

  test('S1-24 문 위치 240 통과 / 241 벽 밖', async ({ page }) => {
    await page.locator('#door-offset').fill('240');
    await expect(err(page, 'door-offset')).toHaveCount(0);
    await page.locator('#door-offset').fill('241');
    await expect(err(page, 'door-offset')).toHaveText('벽 밖으로 나가요');
  });

  test('S1-25 문 위치 음수', async ({ page }) => {
    await page.locator('#door-offset').fill('-1');
    await expect(err(page, 'door-offset')).toHaveText('벽 밖으로 나가요');
  });

  test('S1-26 벽을 바꿔서 위치가 넘침', async ({ page }) => {
    await page.locator('#room-w').fill('400');
    await page.locator('#room-h').fill('320');
    await page.getByRole('group', { name: '문이 있는 벽' }).getByRole('button', { name: '위' }).click();
    await page.locator('#door-offset').fill('300');
    await expect(err(page, 'door-offset')).toHaveCount(0);
    await page.getByRole('group', { name: '문이 있는 벽' }).getByRole('button', { name: '왼쪽' }).click();
    await expect(err(page, 'door-offset')).toHaveText('벽 밖으로 나가요');
  });

  test('S1-27 방을 줄여서 위치가 넘침', async ({ page }) => {
    await page.locator('#door-offset').fill('240');
    await page.locator('#room-w').fill('300');
    await expect(err(page, 'door-offset')).toHaveText('벽 밖으로 나가요');
    await expect(next(page)).toBeDisabled();
  });

  test('S1-28 방 크기가 틀리면 문 위치는 판단 보류', async ({ page }) => {
    await page.locator('#room-w').fill('100');
    await page.locator('#door-offset').fill('999');
    await expect(err(page, 'room-w')).toBeVisible();
    await expect(err(page, 'door-offset')).toHaveCount(0);
  });
});

test.describe('QA 화면 1 창문', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await example(page).click();
  });
  const wall = (page: Page, n: number, name: string) =>
    page.getByRole('group', { name: `창문 ${n} 벽` }).getByRole('button', { name, exact: true }).click();

  test('S1-40 창문 추가·삭제와 번호', async ({ page }) => {
    await page.getByRole('button', { name: '+ 창문 추가' }).click();
    await expect(page.locator('fieldset')).toHaveCount(2);
    await page.getByRole('button', { name: '창문 1 삭제' }).click();
    await expect(page.locator('fieldset')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '창문 1 삭제' })).toBeVisible();
  });

  test('S1-41 창문 최대 4개', async ({ page }) => {
    const add = page.getByRole('button', { name: '+ 창문 추가' });
    for (let i = 0; i < 3; i++) await add.click();
    await expect(page.locator('fieldset')).toHaveCount(4);
    await expect(add).toBeDisabled();
  });

  test('S1-42 새 창문 기본값', async ({ page }) => {
    await page.getByRole('button', { name: '+ 창문 추가' }).click();
    await expect(page.getByRole('group', { name: '창문 2 벽' }).getByRole('button', { name: '위' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('group', { name: '창문 2 종류' }).getByRole('button', { name: '미닫이' })).toHaveAttribute('aria-pressed', 'true');
    const ids = page.locator('fieldset').nth(1).locator('input');
    await expect(ids).toHaveCount(3);
    for (let i = 0; i < 3; i++) await expect(ids.nth(i)).toHaveValue('');
    await expect(next(page)).toBeDisabled();
  });

  test('S1-43 창문 폭 29 오류 / 30 통과', async ({ page }) => {
    await page.locator('#win-w1-width').fill('29');
    await expect(err(page, 'win-w1-width')).toHaveText('창문 폭은 30cm 이상으로 입력해 주세요');
    await page.locator('#win-w1-width').fill('30');
    await expect(err(page, 'win-w1-width')).toHaveCount(0);
  });

  test('S1-44 창문 폭 = 벽 길이 통과', async ({ page }) => {
    await wall(page, 1, '위');
    await page.locator('#win-w1-offset').fill('0');
    await page.locator('#win-w1-width').fill('320');
    await expect(next(page)).toBeEnabled();
  });

  test('S1-45 벽보다 긴 창', async ({ page }) => {
    await wall(page, 1, '위');
    await page.locator('#win-w1-offset').fill('0');
    await page.locator('#win-w1-width').fill('321');
    await expect(err(page, 'win-w1-width')).toHaveText('창문이 벽보다 길어요');
  });

  test('S1-46 창문 위치 200 통과 / 201 벽 밖', async ({ page }) => {
    await wall(page, 1, '위');
    await page.locator('#win-w1-width').fill('120');
    await page.locator('#win-w1-offset').fill('200');
    await expect(err(page, 'win-w1-offset')).toHaveCount(0);
    await page.locator('#win-w1-offset').fill('201');
    await expect(err(page, 'win-w1-offset')).toHaveText('벽 밖으로 나가요');
  });

  test('S1-47 문과 겹침 / S1-48 맞닿음 / S1-49 다른 벽', async ({ page }) => {
    await wall(page, 1, '아래');
    await page.locator('#win-w1-width').fill('60');
    await page.locator('#win-w1-offset').fill('100');
    await expect(err(page, 'win-w1-offset')).toHaveText('문과 창문이 겹쳐요');
    await page.locator('#win-w1-offset').fill('120');
    await expect(err(page, 'win-w1-offset')).toHaveCount(0);
    await wall(page, 1, '위');
    await page.locator('#win-w1-offset').fill('40');
    await expect(next(page)).toBeEnabled();
  });

  test('S1-50 창문끼리 겹침은 오류 없음 (현재 동작)', async ({ page }) => {
    await page.getByRole('button', { name: '+ 창문 추가' }).click();
    await wall(page, 2, '오른쪽');
    const f = page.locator('fieldset').nth(1).locator('input');
    await f.nth(0).fill('150');
    await f.nth(1).fill('100');
    await expect(next(page)).toBeEnabled();
  });

  test('S1-51 창문 종류별 그림', async ({ page }) => {
    const kinds = page.getByRole('group', { name: '창문 1 종류' });
    await expect(page.locator('[data-window-kind="sliding"] line')).toHaveCount(2);
    await kinds.getByRole('button', { name: '여닫이' }).click();
    await expect(page.locator('[data-window-kind="casement"] path')).toHaveCount(2);
    await expect(page.getByText('방 안쪽으로 열리는 범위')).toBeVisible();
    await kinds.getByRole('button', { name: '기타' }).click();
    await expect(page.locator('[data-window-kind="other"] line')).toHaveCount(1);
  });

  test('S1-52 창틀 높이 경계', async ({ page }) => {
    for (const [v, ok] of [['', true], ['0', true], ['300', true], ['301', false], ['-1', false]] as const) {
      await page.locator('#win-w1-sill').fill(v);
      if (ok) await expect(err(page, 'win-w1-sill')).toHaveCount(0);
      else await expect(err(page, 'win-w1-sill')).toHaveText('창틀 높이는 0~300cm 사이로 입력해 주세요');
    }
  });

  test('S1-53 오류 있는 창문을 지우면 다음 활성', async ({ page }) => {
    await page.getByRole('button', { name: '+ 창문 추가' }).click();
    await expect(next(page)).toBeDisabled();
    await page.getByRole('button', { name: '창문 2 삭제' }).click();
    await expect(next(page)).toBeEnabled();
  });
});

test.describe('QA 화면 1 이동·안내', () => {
  test('S1-60 다음 → 화면 2, 단계 표시', async ({ page }) => {
    await startWithExample(page);
    await expect(page.locator('.steps li[aria-current="step"]')).toContainText('가구 배치');
  });

  test('S1-61 오류 상태에서 Enter로 넘어가지 않음', async ({ page }) => {
    await page.goto('/');
    await example(page).click();
    await page.locator('#room-w').fill('100');
    await page.locator('#room-w').press('Enter');
    await expect(page.locator('#room-w')).toBeVisible();
  });

  test('S1-62 화면 1 새로고침하면 입력 사라짐 (현재 동작)', async ({ page }) => {
    await page.goto('/');
    await example(page).click();
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.locator('#room-w')).toHaveValue('');
  });

  test('S1-63 잘못된 링크 안내 닫기', async ({ page }) => {
    await page.goto('/#v=1&s=broken!!');
    await page.getByRole('button', { name: '안내 닫기' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.goto('about:blank');
    await page.goto('/#v=1&s=broken!!');
    await expect(page.getByRole('alert')).toBeVisible();
    await example(page).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});

test.describe('QA 화면 2 가구 추가', () => {
  test('S2-01 기본 4종 기본값', async ({ page }) => {
    await startWithExample(page);
    const expectCard = async (w: string, h: string, ht: string, kind: string, depth?: string) => {
      await expect(page.locator('#sel-w')).toHaveValue(w);
      await expect(page.locator('#sel-h')).toHaveValue(h);
      await expect(page.locator('#sel-ht')).toHaveValue(ht);
      await expect(page.getByRole('group', { name: '열림 방식' }).getByRole('button', { name: kind })).toHaveAttribute('aria-pressed', 'true');
      if (depth) await expect(page.locator('#sel-open-depth')).toHaveValue(depth);
    };
    await addPreset(page, '침대');
    await expectCard('110', '200', '45', '없음');
    await addPreset(page, '책상');
    await expectCard('120', '60', '73', '없음');
    await addPreset(page, '옷장');
    await expectCard('100', '60', '200', '여닫이 문', '50');
    await addPreset(page, '수납장');
    await expectCard('80', '40', '80', '서랍', '35');
  });

  test('S2-04 붐비면 방 밖에 놓이고 R1', async ({ page }) => {
    await startPlainRoom(page);
    for (let i = 0; i < 8; i++) await addPreset(page, '수납장');
    await expect(page.locator('[data-verdict]').filter({ hasText: '벽 밖으로 나가요' }).first()).toBeVisible();
  });

  test('S2-06 이름 경계', async ({ page }) => {
    await startPlainRoom(page);
    await page.getByRole('button', { name: '+ 직접 입력' }).click();
    const name = page.locator('#custom-name');
    const add = page.getByRole('button', { name: '추가', exact: true });
    await page.locator('#custom-w').fill('100');
    await page.locator('#custom-h').fill('100');
    await name.fill('');
    await name.blur();
    await expect(page.getByText('이름을 1~10자로 입력해 주세요')).toBeVisible();
    await expect(add).toBeDisabled();
    await name.fill('   ');
    await expect(add).toBeDisabled();
    await name.fill('가');
    await expect(add).toBeEnabled();
    await name.fill('가나다라마바사아자차');
    await expect(add).toBeEnabled();
    await name.fill('');
    await name.pressSequentially('가나다라마바사아자차카');
    await expect(name).toHaveValue('가나다라마바사아자차');
  });

  test('S2-07 이름 앞뒤 공백 제거', async ({ page }) => {
    await startPlainRoom(page);
    await addCustom(page, ' 소파 ', 150, 80);
    await expect(page.getByRole('heading', { name: '소파', exact: true }).first()).toBeVisible();
  });

  test('S2-08 직접 입력 치수 경계', async ({ page }) => {
    await startPlainRoom(page);
    await page.getByRole('button', { name: '+ 직접 입력' }).click();
    await page.locator('#custom-name').fill('상자');
    await page.locator('#custom-h').fill('50');
    const add = page.getByRole('button', { name: '추가', exact: true });
    for (const [v, ok] of [['19', false], ['20', true], ['400', true], ['401', false]] as const) {
      await page.locator('#custom-w').fill(v);
      if (ok) await expect(add).toBeEnabled();
      else {
        await expect(add).toBeDisabled();
        await expect(page.locator('#custom-w-err')).toHaveText('20~400cm 사이로 입력해 주세요');
      }
    }
  });

  test('S2-09 높이 경계', async ({ page }) => {
    await startPlainRoom(page);
    await page.getByRole('button', { name: '+ 직접 입력' }).click();
    await page.locator('#custom-name').fill('상자');
    await page.locator('#custom-w').fill('50');
    await page.locator('#custom-h').fill('50');
    const add = page.getByRole('button', { name: '추가', exact: true });
    for (const [v, ok] of [['9', false], ['10', true], ['300', true], ['301', false]] as const) {
      await page.locator('#custom-ht').fill(v);
      if (ok) await expect(add).toBeEnabled();
      else await expect(page.locator('#custom-ht-err')).toHaveText('높이는 10~300cm 사이로 입력해 주세요');
    }
  });

  test('S2-10 같은 이름 가구 두 개 (현재 동작)', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await addPreset(page, '침대');
    await expect(block(page, '침대')).toHaveCount(2);
  });

  test('S2-11·12 20개 제한과 해제', async ({ page }) => {
    test.slow(); // 20번 추가: WebKit(Windows)은 SVG 다시 그리기가 느려 시간이 더 든다
    await startPlainRoom(page);
    for (let i = 0; i < 20; i++) await addPreset(page, '수납장');
    await expect(presetButton(page, '침대')).toBeDisabled();
    await expect(page.getByText('가구는 20개까지 놓을 수 있어요.')).toBeVisible();
    await page.getByRole('button', { name: '+ 직접 입력' }).click();
    await page.locator('#custom-name').fill('상자');
    await page.locator('#custom-w').fill('30');
    await page.locator('#custom-h').fill('30');
    await expect(page.getByRole('button', { name: '추가', exact: true })).toBeDisabled();
    await block(page, '수납장').first().focus();
    await page.keyboard.press('Delete');
    await expect(presetButton(page, '침대')).toBeEnabled();
  });
});

test.describe('QA 화면 2 선택·이동·편집', () => {
  test('S2-20·21 선택 표시와 해제 (빈 바닥, Esc)', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await expect(block(page, '침대')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-remove-handle], [data-rotate-handle]')).toHaveCount(2);
    const plan = (await page.getByRole('group', { name: /가구 배치 평면도/ }).boundingBox())!;
    await page.mouse.click(plan.x + plan.width * 0.2, plan.y + plan.height * 0.85);
    await expect(page.locator('[data-rotate-handle]')).toHaveCount(0);
    await expect(page.getByText('가구를 누르면 여기서')).toBeVisible();
    await block(page, '침대').focus();
    await expect(page.locator('[data-rotate-handle]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-rotate-handle]')).toHaveCount(0);
  });

  test('S2-25 평면도 밖에서 놓아도 끌기가 풀림', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    const b = (await block(page, '수납장').boundingBox())!;
    const plan = (await page.getByRole('group', { name: /가구 배치 평면도/ }).boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(plan.x + plan.width + 150, b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
    const x = await page.locator('#sel-x').inputValue();
    await page.mouse.move(plan.x + plan.width / 2, plan.y + plan.height / 2, { steps: 4 });
    await expect(page.locator('#sel-x')).toHaveValue(x);
  });

  test('S2-27 카드 치수 수정 즉시 반영', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await page.locator('#sel-w').fill('150');
    await expect(block(page, '침대')).toHaveAttribute('aria-label', /150×200cm/);
  });

  test('S2-28 잘못된 치수는 반영 안 되고 마지막 값 유지', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await addPreset(page, '책상');
    await selectByCard(page, '침대');
    await page.locator('#sel-w').fill('10');
    await expect(page.locator('#sel-w-err')).toHaveText('20~400cm 사이로 입력해 주세요');
    await expect(block(page, '침대')).toHaveAttribute('aria-label', /110×200cm/);
    await selectByCard(page, '책상');
    await selectByCard(page, '침대');
    await expect(page.locator('#sel-w')).toHaveValue('110');
  });

  test('S2-29 위치 칸 범위 2000 / 2001 / 빈칸', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    await page.locator('#sel-x').fill('2000');
    await expect(block(page, '수납장')).toHaveAttribute('aria-label', /위치 2000,/);
    await page.locator('#sel-x').fill('2001');
    await expect(page.locator('#sel-x-err')).toHaveText('숫자를 입력해 주세요');
    await expect(block(page, '수납장')).toHaveAttribute('aria-label', /위치 2000,/);
    await page.locator('#sel-x').fill('');
    await page.locator('#sel-x').blur();
    await expect(page.locator('#sel-x-err')).toHaveText('숫자를 입력해 주세요');
  });

  test('S2-31 입력 칸에서 Backspace·Delete는 가구를 지우지 않음', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await page.locator('#sel-w').click();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');
    await expect(block(page, '침대')).toHaveCount(1);
  });

  test('S2-33 방을 줄이면 가구는 남고 R1', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    await placeSelected(page, 240, 0);
    await page.getByRole('button', { name: '방 설정 수정' }).click();
    await page.locator('#room-w').fill('200');
    await next(page).click();
    await expect(block(page, '수납장')).toHaveAttribute('data-level', 'problem');
    await expect(card(page, '수납장')).toContainText('이 벽에는 최대 200cm까지 들어가요');
  });

  test('S2-34 새로고침해도 배치 유지', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await addPreset(page, '책상');
    await page.waitForTimeout(600);
    await page.reload();
    await expect(page.locator('[data-furniture]')).toHaveCount(2);
  });

  test('S2-35 옮기자마자 새로고침 (결과 기록용)', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await page.waitForTimeout(600);
    await page.locator('#sel-x').fill('0');
    await page.reload();
    const label = await block(page, '침대').getAttribute('aria-label');
    test.info().annotations.push({ type: 'observed', description: label ?? '' });
  });
});

test.describe('QA 화면 2 회전·삭제', () => {
  test('S2-40 카드 버튼으로도 회전', async ({ page }) => {
    await startPlainRoom(page);
    await addCustom(page, '소파', 300, 200);
    await page.getByRole('button', { name: '↻ 90° 회전' }).click();
    await expect(page.locator('#sel-w')).toHaveValue('200');
  });

  test('S2-41 중심 유지, 벽 밖으로 나가도 보정 안 함', async ({ page }) => {
    await startPlainRoom(page);
    await addCustom(page, '소파', 300, 200);
    await placeSelected(page, 10, 10);
    await page.getByRole('button', { name: '소파 90° 회전' }).click();
    await expect(block(page, '소파')).toHaveAttribute('aria-label', /200×300cm.*위치 60, -40/);
    await expect(block(page, '소파')).toHaveAttribute('data-level', 'problem');
  });

  test('S2-42 한글 입력 상태(ㄱ)에서도 R 회전', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await block(page, '침대').focus();
    await block(page, '침대').dispatchEvent('keydown', { key: 'ㄱ', code: 'KeyR', bubbles: true });
    await expect(block(page, '침대')).toHaveAttribute('aria-label', /200×110cm/);
  });

  test('S2-43 Ctrl+R은 회전하지 않음', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await block(page, '침대').dispatchEvent('keydown', { key: 'r', code: 'KeyR', ctrlKey: true, bubbles: true });
    await expect(block(page, '침대')).toHaveAttribute('aria-label', /110×200cm/);
  });

  test('S2-44 회전하면 앞면 방향도 돎', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '옷장');
    await page.getByRole('button', { name: '옷장 90° 회전' }).click();
    await expect(block(page, '옷장')).toHaveAttribute('aria-label', /여닫이 문 앞면 왼쪽/);
    await page.getByRole('button', { name: '옷장 90° 회전' }).click();
    await expect(block(page, '옷장')).toHaveAttribute('aria-label', /여닫이 문 앞면 위/);
  });

  test('S2-45 삭제 4가지 방법', async ({ page }) => {
    await startPlainRoom(page);
    for (const n of ['침대', '책상', '옷장', '수납장']) await addPreset(page, n);
    await page.getByRole('button', { name: '수납장 삭제' }).click();
    await block(page, '옷장').focus();
    await page.keyboard.press('Delete');
    await block(page, '책상').focus();
    await page.keyboard.press('Backspace');
    await selectByCard(page, '침대');
    await page.getByRole('button', { name: '삭제', exact: true }).click();
    await expect(page.locator('[data-furniture]')).toHaveCount(0);
    await expect(page.getByTestId('free-area')).toHaveText('100%');
  });

  async function handleCircles(page: Page) {
    return page.evaluate(() => {
      const svg = document.querySelector('[aria-label^="가구 배치 평면도"]') as SVGSVGElement;
      const [vx, vy, vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number);
      const c = (sel: string) => {
        const e = document.querySelector(sel + ' circle')!;
        return { x: +e.getAttribute('cx')!, y: +e.getAttribute('cy')!, r: +e.getAttribute('r')! };
      };
      return { vb: { x1: vx, y1: vy, x2: vx + vw, y2: vy + vh }, del: c('[data-remove-handle]'), rot: c('[data-rotate-handle]') };
    });
  }
  const inside = (b: { x1: number; y1: number; x2: number; y2: number }, c: { x: number; y: number; r: number }) =>
    c.x - c.r >= b.x1 - 0.01 && c.x + c.r <= b.x2 + 0.01 && c.y - c.r >= b.y1 - 0.01 && c.y + c.r <= b.y2 + 0.01;

  test('S2-46 가장자리에서도 버튼이 잘리거나 겹치지 않음', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    for (const [x, y] of [[240, 0], [0, 0], [240, 360]]) {
      await placeSelected(page, x, y);
      const h = await handleCircles(page);
      expect(inside(h.vb, h.del)).toBe(true);
      expect(inside(h.vb, h.rot)).toBe(true);
      expect(Math.hypot(h.del.x - h.rot.x, h.del.y - h.rot.y)).toBeGreaterThanOrEqual(h.del.r * 2);
      expect(h.del.x).toBeLessThan(h.rot.x);
    }
  });

  test('S2-47 방 밖 가구도 버튼은 보이고 눌림', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    await placeSelected(page, 1000, 800);
    const h = await handleCircles(page);
    expect(inside(h.vb, h.rot)).toBe(true);
    await page.getByRole('button', { name: '수납장 90° 회전' }).click();
    await expect(block(page, '수납장')).toHaveAttribute('aria-label', /40×80cm/);
  });

  test('S2-48 ↻ 를 누른 채 끌어도 이동하지 않고 회전만', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '책상');
    await placeSelected(page, 100, 100);
    const r = (await page.locator('[data-rotate-handle]').boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2 + 4, r.y + r.height / 2 + 3, { steps: 3 });
    await page.mouse.up();
    // 120×60 → 60×120, 중심 (160,130) 유지 → (130, 70)
    await expect(block(page, '책상')).toHaveAttribute('aria-label', /60×120cm.*위치 130, 70/);
  });

  test('S2-49 키보드로 × ↻ 버튼', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await page.getByRole('button', { name: '침대 90° 회전' }).focus();
    await page.keyboard.press(' ');
    await expect(block(page, '침대')).toHaveAttribute('aria-label', /200×110cm/);
    await page.getByRole('button', { name: '침대 삭제' }).focus();
    await page.keyboard.press('Enter');
    await expect(block(page, '침대')).toHaveCount(0);
  });
});

test.describe('QA 화면 2 문·서랍', () => {
  test('S2-61 수납장 서랍 그림', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    await expect(page.locator('[data-front-zone] rect')).toHaveCount(1);
    await expect(page.locator('[data-front-zone]')).toContainText('서랍 35');
  });

  test('S2-62 침대·책상은 열림 없음', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '침대');
    await addPreset(page, '책상');
    await expect(page.locator('[data-front-zone]')).toHaveCount(0);
  });

  test('S2-63 방식 바꾸기', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '옷장');
    const kinds = page.getByRole('group', { name: '열림 방식' });
    await kinds.getByRole('button', { name: '서랍' }).click();
    await expect(page.locator('#sel-open-depth')).toHaveValue('40');
    await kinds.getByRole('button', { name: '미닫이 문' }).click();
    await expect(page.locator('#sel-open-depth')).toHaveCount(0);
    await expect(page.getByText('미닫이 문은 옆으로 밀어 열어서')).toBeVisible();
    await expect(page.locator('[data-front-zone]')).toHaveCount(0);
    await kinds.getByRole('button', { name: '없음' }).click();
    await expect(page.getByRole('group', { name: '앞면 방향' })).toHaveCount(0);
    await kinds.getByRole('button', { name: '여닫이 문' }).click();
    await expect(page.locator('#sel-open-depth')).toHaveValue('50');
  });

  test('S2-64 앞면 방향 바꾸면 그림 위치 이동', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    await placeSelected(page, 100, 100);
    await page.getByRole('group', { name: '앞면 방향' }).getByRole('button', { name: '왼쪽' }).click();
    await expect(page.locator('[data-front-zone] rect')).toHaveAttribute('x', '65');
    await page.getByRole('group', { name: '앞면 방향' }).getByRole('button', { name: '위' }).click();
    await expect(page.locator('[data-front-zone] rect')).toHaveAttribute('y', '65');
  });

  test('S2-65 깊이 경계', async ({ page }) => {
    await startPlainRoom(page);
    await addPreset(page, '수납장');
    for (const [v, msg] of [['9', '10~150cm 사이로 입력해 주세요'], ['10', null], ['150', null], ['151', '10~150cm 사이로 입력해 주세요']] as const) {
      await page.locator('#sel-open-depth').fill(v);
      if (msg) await expect(page.locator('#sel-open-depth-err')).toHaveText(msg);
      else await expect(page.locator('[data-front-zone]')).toContainText(`서랍 ${v}`);
    }
    await page.locator('#sel-open-depth').fill('');
    await page.locator('#sel-open-depth').blur();
    await expect(page.locator('#sel-open-depth-err')).toHaveText('숫자를 입력해 주세요');
  });

  test('S2-66·67 여닫이 기본 깊이 최소 10 / 최대 150', async ({ page }) => {
    await startPlainRoom(page);
    await addCustom(page, '좁은장', 20, 40);
    await page.getByRole('group', { name: '열림 방식' }).getByRole('button', { name: '여닫이 문' }).click();
    await expect(page.locator('#sel-open-depth')).toHaveValue('10');
    await addCustom(page, '넓은장', 400, 40);
    await page.getByRole('group', { name: '열림 방식' }).getByRole('button', { name: '여닫이 문' }).click();
    await expect(page.locator('#sel-open-depth')).toHaveValue('150');
  });

  test('S2-68 직접 입력 가구는 열림 없음으로 시작', async ({ page }) => {
    await openState(page, EXAMPLE);
    await addCustom(page, '선반', 80, 30);
    await expect(page.getByRole('group', { name: '열림 방식' }).getByRole('button', { name: '없음' })).toHaveAttribute('aria-pressed', 'true');
  });
});
