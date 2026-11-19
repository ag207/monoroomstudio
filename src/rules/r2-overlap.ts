import type { Furniture, Reason } from '../domain/types';
import { withWa } from '../domain/text';
import { overlapArea } from './geom';

/** R2 겹침: 다른 가구와 넓이 > 0 으로 겹치면 문제. 겹친 상대마다 사유 하나. */
export function checkOverlap(f: Furniture, all: Furniture[]): Reason[] {
  const reasons: Reason[] = [];
  for (const o of all) {
    if (o.id === f.id || overlapArea(f, o) === 0) continue;
    reasons.push({
      rule: 'R2',
      level: 'problem',
      message: `${withWa(o.name)} 겹쳐요`,
      fix: '겹치지 않게 옮겨 보세요',
    });
  }
  return reasons;
}
