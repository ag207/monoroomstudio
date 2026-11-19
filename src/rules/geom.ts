import type { Door, Furniture, Rect, Room, RoomWindow, Wall } from '../domain/types';

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

/**
 * 여닫이 창 열림 영역. 양쪽으로 열리는 두 짝 창으로 보고, 한 짝 폭(창 폭의 절반)만큼
 * 방 안쪽으로 들어온 직사각형으로 근사한다. 문(4.4)과 같은 방식의 근사다.
 */
export function casementZone(room: Pick<Room, 'w' | 'h'>, win: Pick<RoomWindow, 'wall' | 'offset' | 'width'>): Rect {
  const d = Math.ceil(win.width / 2);
  switch (win.wall) {
    case 'top':
      return { x: win.offset, y: 0, w: win.width, h: d };
    case 'bottom':
      return { x: win.offset, y: room.h - d, w: win.width, h: d };
    case 'left':
      return { x: 0, y: win.offset, w: d, h: win.width };
    case 'right':
      return { x: room.w - d, y: win.offset, w: d, h: win.width };
  }
}

/**
 * 가구가 창틀보다 높은지. 'below' = 창틀 이하라 창을 가리지 않음, 'above' = 가림,
 * 'unknown' = 가구 높이나 창틀 높이를 모름.
 */
export function heightVsSill(f: Pick<Furniture, 'ht'>, win: Pick<RoomWindow, 'sill'>): 'below' | 'above' | 'unknown' {
  if (f.ht == null || win.sill == null || Number.isNaN(f.ht) || Number.isNaN(win.sill)) return 'unknown';
  return f.ht <= win.sill ? 'below' : 'above';
}

export function insideRoom(room: Pick<Room, 'w' | 'h'>, r: Rect): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= room.w && r.y + r.h <= room.h;
}
