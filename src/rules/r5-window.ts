import { LIMITS } from '../domain/constants';
import type { Furniture, Reason, Room, RoomWindow } from '../domain/types';

function blocksWindow(room: Room, f: Furniture, win: RoomWindow): boolean {
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

/** R5 창문 가림: 창문 벽에서 10cm 안이고 창문 범위와 겹치면 주의 (가구당 한 번) */
export function checkWindow(room: Room, f: Furniture): Reason | null {
  if (!room.windows.some((w) => blocksWindow(room, f, w))) return null;
  return {
    rule: 'R5',
    level: 'warn',
    message: '창문을 가릴 수 있어요',
    fix: '가구 높이가 창문 아래인지 확인해 보세요',
  };
}
