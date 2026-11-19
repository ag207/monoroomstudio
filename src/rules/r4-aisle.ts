import { LIMITS } from '../domain/constants';
import type { Furniture, Gap, Rect, Room } from '../domain/types';
import { overlapArea } from './geom';

const isAisle = (d: number) => d > 0 && d < LIMITS.aisleMin;

/** 간격 사이를 다른 가구가 채우고 있으면 통로로 보지 않는다. */
function blocked(between: Rect, all: Furniture[], skip: string[]): boolean {
  return all.some((o) => !skip.includes(o.id) && overlapArea(o, between) > 0);
}

/** 두 가구 사이 간격. 마주 보는 변이 서로 겹치는 구간이 있을 때만 계산한다. */
function pairGap(a: Furniture, b: Furniture): Gap | null {
  const oy1 = Math.max(a.y, b.y);
  const oy2 = Math.min(a.y + a.h, b.y + b.h);
  if (oy2 > oy1) {
    const [l, r] = a.x <= b.x ? [a, b] : [b, a];
    const d = r.x - (l.x + l.w);
    if (d > 0) {
      const ym = Math.round((oy1 + oy2) / 2);
      return { aId: a.id, bId: b.id, x1: l.x + l.w, y1: ym, x2: r.x, y2: ym, dist: d };
    }
  }
  const ox1 = Math.max(a.x, b.x);
  const ox2 = Math.min(a.x + a.w, b.x + b.w);
  if (ox2 > ox1) {
    const [t, u] = a.y <= b.y ? [a, b] : [b, a];
    const d = u.y - (t.y + t.h);
    if (d > 0) {
      const xm = Math.round((ox1 + ox2) / 2);
      return { aId: a.id, bId: b.id, x1: xm, y1: t.y + t.h, x2: xm, y2: u.y, dist: d };
    }
  }
  return null;
}

function gapRect(g: Gap, a: Furniture, b?: Furniture): Rect {
  if (g.y1 === g.y2) {
    const y1 = b ? Math.max(a.y, b.y) : a.y;
    const y2 = b ? Math.min(a.y + a.h, b.y + b.h) : a.y + a.h;
    return { x: Math.min(g.x1, g.x2), y: y1, w: Math.abs(g.x2 - g.x1), h: y2 - y1 };
  }
  const x1 = b ? Math.max(a.x, b.x) : a.x;
  const x2 = b ? Math.min(a.x + a.w, b.x + b.w) : a.x + a.w;
  return { x: x1, y: Math.min(g.y1, g.y2), w: x2 - x1, h: Math.abs(g.y2 - g.y1) };
}

/** 가구와 네 벽 사이 간격 */
function wallGaps(room: Room, f: Furniture): Gap[] {
  const cx = Math.round(f.x + f.w / 2);
  const cy = Math.round(f.y + f.h / 2);
  const right = f.x + f.w;
  const bottom = f.y + f.h;
  return [
    { aId: f.id, bId: 'wall', x1: 0, y1: cy, x2: f.x, y2: cy, dist: f.x },
    { aId: f.id, bId: 'wall', x1: right, y1: cy, x2: room.w, y2: cy, dist: room.w - right },
    { aId: f.id, bId: 'wall', x1: cx, y1: 0, x2: cx, y2: f.y, dist: f.y },
    { aId: f.id, bId: 'wall', x1: cx, y1: bottom, x2: cx, y2: room.h, dist: room.h - bottom },
  ];
}

/** R4 통로 부족: 0cm 초과 60cm 미만 간격. 같은 쌍은 한 번만 반환한다. */
export function findAisleGaps(room: Room, all: Furniture[]): Gap[] {
  const gaps: Gap[] = [];
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    for (let j = i + 1; j < all.length; j++) {
      const b = all[j];
      const g = pairGap(a, b);
      if (g && isAisle(g.dist) && !blocked(gapRect(g, a, b), all, [a.id, b.id])) gaps.push(g);
    }
    for (const g of wallGaps(room, a)) {
      if (isAisle(g.dist) && !blocked(gapRect(g, a), all, [a.id])) gaps.push(g);
    }
  }
  return gaps;
}
