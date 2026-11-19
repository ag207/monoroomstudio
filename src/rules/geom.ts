import type { Door, Rect, Room, Wall } from '../domain/types';

/** 두 직사각형이 겹치는 넓이. 변이 맞닿기만 하면 0. */
export function overlapArea(a: Rect, b: Rect): number {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

export function wallLength(room: Pick<Room, 'w' | 'h'>, wall: Wall): number {
  return wall === 'top' || wall === 'bottom' ? room.w : room.h;
}

/** 문 열림 영역: 사분원을 감싸는 문 폭 × 문 폭 정사각형 (PRD 4.4) */
export function doorSquare(room: Pick<Room, 'w' | 'h'>, door: Door): Rect {
  const s = door.width;
  switch (door.wall) {
    case 'top':
      return { x: door.offset, y: 0, w: s, h: s };
    case 'bottom':
      return { x: door.offset, y: room.h - s, w: s, h: s };
    case 'left':
      return { x: 0, y: door.offset, w: s, h: s };
    case 'right':
      return { x: room.w - s, y: door.offset, w: s, h: s };
  }
}

export function insideRoom(room: Pick<Room, 'w' | 'h'>, r: Rect): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= room.w && r.y + r.h <= room.h;
}
