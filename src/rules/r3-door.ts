import { LIMITS } from '../domain/constants';
import type { Furniture, Reason, Room } from '../domain/types';
import { doorSquare, insideRoom, overlapArea } from './geom';

/** R3 문 막힘: 문 열림 영역(정사각형 근사)과 겹치면 문제 */
export function checkDoor(room: Room, f: Furniture): Reason | null {
  const sq = doorSquare(room, room.door);
  if (overlapArea(f, sq) === 0) return null;

  // 겹침을 없애는 네 방향 이동 거리. 방 안에 남는 방향을 우선한다.
  const moves = [
    { dx: sq.x + sq.w - f.x, dy: 0 },
    { dx: -(f.x + f.w - sq.x), dy: 0 },
    { dx: 0, dy: sq.y + sq.h - f.y },
    { dx: 0, dy: -(f.y + f.h - sq.y) },
  ].map((m) => ({ dist: Math.abs(m.dx + m.dy), inside: insideRoom(room, { ...f, x: f.x + m.dx, y: f.y + m.dy }) }));
  const pool = moves.some((m) => m.inside) ? moves.filter((m) => m.inside) : moves;
  const move = Math.min(...pool.map((m) => m.dist));

  // 왼쪽 위 모서리를 고정한 채 가로 폭만 줄여 겹침을 없앨 수 있으면 그 최대 폭
  const maxWidth = f.x < sq.x ? sq.x - f.x : 0;
  const fix =
    maxWidth >= LIMITS.furnitureMin
      ? `${move}cm 옮기거나 폭을 ${maxWidth}cm 이하로 줄여 보세요`
      : `${move}cm 옮겨 보세요`;

  return { rule: 'R3', level: 'problem', message: '문 열림 범위를 막아요', fix };
}
