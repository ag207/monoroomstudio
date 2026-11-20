import type { Furniture, Reason, Room } from '../domain/types';
import { frontZone, insideRoom, overlapArea } from './geom';

const what = (f: Furniture) => (f.open?.kind === 'drawer' ? '서랍' : '문');

/**
 * R7 문·서랍 열림 공간 (PRD에 없고 나중에 추가): 가구 앞면에서 문(문짝 폭)이나
 * 서랍(서랍 길이)만큼 필요한 공간이 벽 밖으로 나가거나 다른 가구와 겹치면 문제.
 * 막는 가구에도 "○○ 문/서랍 열림 범위를 막아요" 사유를 붙인다.
 *
 * 반환값: 가구 id → 사유 목록
 */
export function checkFrontOpenings(room: Room, all: Furniture[]): Record<string, Reason[]> {
  const out: Record<string, Reason[]> = {};
  const push = (id: string, r: Reason) => (out[id] ??= []).push(r);

  for (const f of all) {
    const zone = frontZone(f);
    if (!zone || !f.open) continue;
    const blockers = all.filter((o) => o.id !== f.id && overlapArea(o, zone) > 0);
    const wall = !insideRoom(room, zone);
    if (!wall && blockers.length === 0) continue;

    const names = [...(wall ? ['벽'] : []), ...blockers.map((o) => o.name)];
    const label = f.open.kind === 'drawer' ? '서랍을 끝까지 뺄' : '문이 열릴';
    push(f.id, {
      rule: 'R7',
      level: 'problem',
      message: `${label} 공간이 부족해요 (${names.join(', ')}에 막혀요)`,
      fix: `앞쪽(${f.open.kind === 'drawer' ? '서랍' : '문짝'} 방향)에 ${f.open.depth}cm를 비워 두세요`,
    });
    for (const o of blockers) {
      push(o.id, {
        rule: 'R7',
        level: 'problem',
        message: `${f.name} ${what(f)} 열림 범위를 막아요`,
        fix: `${f.name} 앞에서 ${f.open.depth}cm 이상 떨어뜨려 보세요`,
      });
    }
  }
  return out;
}
