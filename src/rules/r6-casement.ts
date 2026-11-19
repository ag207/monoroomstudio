import type { Furniture, Reason, Room } from '../domain/types';
import { casementZone, heightVsSill, overlapArea } from './geom';

/**
 * R6 여닫이 창 열림 막힘 (PRD에 없고 나중에 추가): 여닫이 창의 열림 영역과
 * 넓이 > 0 으로 겹치면 주의. 가구가 창틀 높이 이하이면 창이 가구 위로 열리므로 경고하지 않는다.
 */
export function checkCasement(room: Room, f: Furniture): Reason | null {
  const hits = room.windows.filter(
    (w) => w.kind === 'casement' && overlapArea(f, casementZone(room, w)) > 0 && heightVsSill(f, w) !== 'below',
  );
  if (hits.length === 0) return null;
  const depth = Math.max(...hits.map((w) => Math.ceil(w.width / 2)));
  const known = hits.every((w) => heightVsSill(f, w) === 'above');
  return {
    rule: 'R6',
    level: 'warn',
    message: '여닫이 창 열림 범위를 막아요',
    fix: known
      ? `창을 열려면 창문 벽에서 ${depth}cm 이상 띄우거나, 창틀보다 낮은 가구를 놓아 보세요`
      : `창을 열려면 창문 벽에서 ${depth}cm 이상 띄워 보세요. 가구 높이와 창틀 높이를 넣으면 더 정확해요`,
  };
}
