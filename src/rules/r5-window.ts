import { LIMITS } from '../domain/constants';
import type { Furniture, Reason, Room, RoomWindow } from '../domain/types';
import { heightVsSill } from './geom';

function nearWindow(room: Room, f: Furniture, win: RoomWindow): boolean {
  const horizontalWall = win.wall === 'top' || win.wall === 'bottom';
  // 벽 방향으로 창문 범위와 겹치는지 (맞닿기만 하면 겹침 아님)
  const [a1, a2] = horizontalWall ? [f.x, f.x + f.w] : [f.y, f.y + f.h];
  if (Math.min(a2, win.offset + win.width) - Math.max(a1, win.offset) <= 0) return false;
  const dist = {
    top: f.y,
    bottom: room.h - (f.y + f.h),
    left: f.x,
    right: room.w - (f.x + f.w),
  }[win.wall];
  return dist <= LIMITS.windowReach;
}

/**
 * R5 창문 가림: 창문 벽에서 10cm 안이고 창문 범위와 겹치면 주의 (가구당 한 번).
 * 가구 높이와 창틀 높이를 모두 알면: 창틀 이하면 경고하지 않고, 높으면 '가려요'로 확정한다.
 * 하나라도 모르면 PRD 원래 문구('가릴 수 있어요')를 쓴다.
 */
export function checkWindow(room: Room, f: Furniture): Reason | null {
  const near = room.windows.filter((w) => nearWindow(room, f, w));
  const above = near.filter((w) => heightVsSill(f, w) === 'above');
  if (above.length) {
    const sill = Math.min(...above.map((w) => w.sill as number));
    return {
      rule: 'R5',
      level: 'warn',
      message: '창문을 가려요',
      fix: `가구 높이 ${f.ht}cm가 창틀 ${sill}cm보다 높아요. 창문 앞을 비우거나 더 낮은 가구를 놓아 보세요`,
    };
  }
  if (near.some((w) => heightVsSill(f, w) === 'unknown')) {
    return {
      rule: 'R5',
      level: 'warn',
      message: '창문을 가릴 수 있어요',
      fix: '가구 높이와 창틀 높이를 넣으면 가리는지 정확히 알려 드려요',
    };
  }
  return null;
}
