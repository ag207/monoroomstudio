import type { Evaluation, Furniture, Level, Reason, Room, Verdict } from '../domain/types';
import { withWa } from '../domain/text';
import { checkBounds } from './r1-bounds';
import { checkOverlap } from './r2-overlap';
import { checkDoor } from './r3-door';
import { findAisleGaps } from './r4-aisle';
import { checkWindow } from './r5-window';
import { checkCasement } from './r6-casement';
import { checkFrontOpenings } from './r7-front';
import { freeAreaPct } from './area';

const RANK: Record<Level, number> = { pass: 0, warn: 1, problem: 2 };

const PASS: Reason = { rule: 'OK', level: 'pass', message: '문제없어요', fix: '' };

/** 모든 규칙을 실행하고 가구별 최종 판정(가장 심각한 등급)을 낸다. */
export function evaluate(room: Room, furniture: Furniture[]): Evaluation {
  const reasons: Record<string, Reason[]> = {};
  for (const f of furniture) {
    reasons[f.id] = [
      checkBounds(room, f),
      ...checkOverlap(f, furniture),
      checkDoor(room, f),
      checkWindow(room, f),
      checkCasement(room, f),
    ].filter((r): r is Reason => r !== null);
  }

  const front = checkFrontOpenings(room, furniture);
  for (const [id, list] of Object.entries(front)) reasons[id].push(...list);

  const byId = new Map(furniture.map((f) => [f.id, f]));
  const gaps = findAisleGaps(room, furniture);
  for (const g of gaps) {
    const aisle = (other: string): Reason => ({
      rule: 'R4',
      level: 'warn',
      message: `${withWa(other)} 통로가 ${g.dist}cm예요`,
      fix: '지나다니려면 60cm 이상이 좋아요',
    });
    if (g.bId === 'wall') {
      reasons[g.aId].push(aisle('벽'));
    } else {
      reasons[g.aId].push(aisle(byId.get(g.bId)!.name));
      reasons[g.bId].push(aisle(byId.get(g.aId)!.name));
    }
  }

  const verdicts: Record<string, Verdict> = {};
  const counts: Record<Level, number> = { problem: 0, warn: 0, pass: 0 };
  for (const f of furniture) {
    const list = reasons[f.id].sort((a, b) => RANK[b.level] - RANK[a.level]);
    const level: Level = list.length ? list[0].level : 'pass';
    verdicts[f.id] = { level, reasons: list.length ? list : [PASS] };
    counts[level]++;
  }

  return { verdicts, gaps, counts, freeAreaPct: freeAreaPct(room, furniture) };
}
