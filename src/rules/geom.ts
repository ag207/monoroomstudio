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

/** 앞면 변의 길이 (앞면이 위·아래면 가로, 왼쪽·오른쪽이면 세로) */
export function frontLength(f: Pick<Furniture, 'w' | 'h'>, side: Wall): number {
  return side === 'top' || side === 'bottom' ? f.w : f.h;
}

/**
 * 문·서랍을 열 때 필요한 앞쪽 공간. 앞면 변 전체 길이 × 필요한 깊이 직사각형으로 근사한다.
 * 미닫이 문이나 열림 정보가 없으면 null.
 */
export function frontZone(f: Furniture): Rect | null {
  const o = f.open;
  if (!o || o.kind === 'slide' || !(o.depth > 0)) return null;
  switch (o.side) {
    case 'top':
      return { x: f.x, y: f.y - o.depth, w: f.w, h: o.depth };
    case 'bottom':
      return { x: f.x, y: f.y + f.h, w: f.w, h: o.depth };
    case 'left':
      return { x: f.x - o.depth, y: f.y, w: o.depth, h: f.h };
    case 'right':
      return { x: f.x + f.w, y: f.y, w: o.depth, h: f.h };
  }
}

/** 가구를 90° 돌릴 때 앞면 방향도 같이 돈다 (시계 방향) */
export const ROTATE_SIDE: Record<Wall, Wall> = { top: 'right', right: 'bottom', bottom: 'left', left: 'top' };

export function insideRoom(room: Pick<Room, 'w' | 'h'>, r: Rect): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= room.w && r.y + r.h <= room.h;
}
