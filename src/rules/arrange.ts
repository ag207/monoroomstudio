import type { Furniture, Room } from '../domain/types';
import { evaluate } from './evaluate';
import { overlapArea, ROTATE_SIDE } from './geom';

/** k번(시계 방향 90°씩) 돌린 가구. 앞면 방향도 같이 돈다. */
function turned(f: Furniture, k: number): Furniture {
  let open = f.open ?? null;
  for (let i = 0; i < k && open; i++) open = { ...open, side: ROTATE_SIDE[open.side] };
  return k % 2 ? { ...f, w: f.h, h: f.w, open } : { ...f, open };
}

/** 벽에 붙는 자리, 이미 놓은 가구에 맞닿는 자리, 그리고 듬성듬성한 격자 */
function positions(roomLen: number, len: number, edges: number[]): number[] {
  const max = Math.max(0, roomLen - len);
  const step = Math.max(50, Math.round(roomLen / 8));
  const set = new Set([0, max, ...edges]);
  for (let v = step; v < max; v += step) set.add(v);
  return [...set].filter((v) => v >= 0 && v <= max);
}

/** 판정이 나쁠수록 큰 점수. 같으면 벽에 많이 붙은 자리를 고른다 (가운데 바닥을 비워 두려고). */
function score(room: Room, list: Furniture[], c: Furniture): number {
  const { counts } = evaluate(room, list);
  const touch = +(c.x === 0) + +(c.y === 0) + +(c.x + c.w === room.w) + +(c.y + c.h === room.h);
  return counts.problem * 1000 + counts.warn * 10 - touch;
}

/**
 * 배치 추천: 큰 가구부터 하나씩, 판정(R1~R7) 점수가 가장 좋은 자리와 방향에 놓는다.
 * shortcut: 한 번에 하나씩 정하는 탐욕 방식이라 최적은 아님, 결과가 아쉬우면 여러 순서를 시도하도록 확장.
 */
export function recommendLayout(room: Room, furniture: Furniture[]): Furniture[] {
  const placed: Furniture[] = [];
  for (const f of [...furniture].sort((a, b) => b.w * b.h - a.w * a.h)) {
    let best: Furniture | null = null;
    let bestScore = Infinity;
    // 문·서랍이 있으면 앞면 방향 4가지, 없으면 가로·세로 2가지(정사각형은 1가지)
    const turns = f.open ? 4 : f.w === f.h ? 1 : 2;
    for (const allowOverlap of [false, true]) {
      for (let k = 0; k < turns; k++) {
        const t = turned(f, k);
        const xs = positions(room.w, t.w, placed.flatMap((p) => [p.x + p.w, p.x - t.w]));
        const ys = positions(room.h, t.h, placed.flatMap((p) => [p.y + p.h, p.y - t.h]));
        for (const y of ys) {
          for (const x of xs) {
            const c = { ...t, x, y };
            // 겹치는 자리는 먼저 건너뛴다 (겹치지 않는 자리가 하나도 없을 때만 본다)
            if (!allowOverlap && placed.some((p) => overlapArea(p, c) > 0)) continue;
            const s = score(room, [...placed, c], c);
            if (s < bestScore) {
              bestScore = s;
              best = c;
            }
          }
        }
      }
      if (best) break;
    }
    placed.push(best!);
  }
  const byId = new Map(placed.map((p) => [p.id, p]));
  return furniture.map((f) => byId.get(f.id)!);
}
