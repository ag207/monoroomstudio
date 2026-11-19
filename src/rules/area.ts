import type { Furniture, Room } from '../domain/types';

/** 남은 바닥 면적 %. 겹친 부분·벽 밖 부분도 그대로 더한다 (PRD 4.6). */
export function freeAreaPct(room: Pick<Room, 'w' | 'h'>, furniture: Furniture[]): number {
  const used = furniture.reduce((s, f) => s + f.w * f.h, 0);
  const pct = (1 - used / (room.w * room.h)) * 100;
  return Math.round(pct * 10) / 10;
}
