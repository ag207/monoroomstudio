import type { Furniture, Reason, Room } from '../domain/types';

/** R1 벽 밖: 방 범위를 벗어나면 문제 */
export function checkBounds(room: Room, f: Furniture): Reason | null {
  const outX = f.x < 0 || f.x + f.w > room.w;
  const outY = f.y < 0 || f.y + f.h > room.h;
  if (!outX && !outY) return null;
  const max = outX ? room.w : room.h;
  return {
    rule: 'R1',
    level: 'problem',
    message: '벽 밖으로 나가요',
    fix: `이 벽에는 최대 ${max}cm까지 들어가요`,
  };
}
