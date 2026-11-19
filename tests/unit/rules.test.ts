import { describe, expect, it } from 'vitest';
import { EXAMPLE_ROOM } from '../../src/domain/constants';
import type { Furniture, Room } from '../../src/domain/types';
import { withWa } from '../../src/domain/text';
import { evaluate } from '../../src/rules/evaluate';
import { freeAreaPct } from '../../src/rules/area';
import { doorSquare, overlapArea } from '../../src/rules/geom';

// 320×400, 아래 벽 문(40, 폭 80), 오른쪽 벽 창(140, 폭 120)
const room: Room = EXAMPLE_ROOM;
const noWindow: Room = { ...room, windows: [] };

const f = (id: string, name: string, x: number, y: number, w: number, h: number): Furniture => ({ id, name, x, y, w, h });
const messages = (r: ReturnType<typeof evaluate>, id: string) => r.verdicts[id].reasons.map((x) => x.message);

describe('geom', () => {
  it('맞닿은 변은 겹침 넓이 0', () => {
    expect(overlapArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(0);
    expect(overlapArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(25);
  });

  it('문 열림 영역은 문 폭 정사각형 (PRD 4.4 예시)', () => {
    expect(doorSquare(room, room.door)).toEqual({ x: 40, y: 320, w: 80, h: 80 });
    expect(doorSquare(room, { wall: 'right', offset: 10, width: 90, hinge: 'left' })).toEqual({ x: 230, y: 10, w: 90, h: 90 });
  });
});

describe('R1 벽 밖', () => {
  it('AC-09: 벽 밖으로 나가면 문제와 최대 치수 안내', () => {
    const r = evaluate(room, [f('a', '침대', 250, 0, 110, 200)]);
    expect(r.verdicts.a.level).toBe('problem');
    const reason = r.verdicts.a.reasons.find((x) => x.rule === 'R1')!;
    expect(reason.message).toBe('벽 밖으로 나가요');
    expect(reason.fix).toBe('이 벽에는 최대 320cm까지 들어가요');
  });

  it('세로 방향으로 나가면 세로 길이를 안내', () => {
    const r = evaluate(noWindow, [f('a', '옷장', 0, 380, 100, 60)]);
    expect(r.verdicts.a.reasons.find((x) => x.rule === 'R1')!.fix).toBe('이 벽에는 최대 400cm까지 들어가요');
  });
});

describe('R2 겹침', () => {
  it('AC-08: 두 가구가 겹치면 둘 다 문제', () => {
    const r = evaluate(noWindow, [f('a', '침대', 0, 0, 110, 200), f('b', '책상', 100, 50, 120, 60)]);
    expect(r.verdicts.a.level).toBe('problem');
    expect(r.verdicts.b.level).toBe('problem');
    expect(messages(r, 'a')).toContain('책상과 겹쳐요');
    expect(messages(r, 'b')).toContain('침대와 겹쳐요');
  });

  it('변이 맞닿기만 하면 겹침 아님', () => {
    const r = evaluate(noWindow, [f('a', '침대', 0, 0, 110, 200), f('b', '책상', 110, 0, 120, 60)]);
    expect(r.verdicts.a.reasons.some((x) => x.rule === 'R2')).toBe(false);
  });
});

describe('R3 문 막힘', () => {
  it('AC-04: 침대(150×200)를 (0,190)에 놓으면 문 막힘 문제', () => {
    const r = evaluate(room, [f('bed', '침대', 0, 190, 150, 200)]);
    expect(r.verdicts.bed.level).toBe('problem');
    const reason = r.verdicts.bed.reasons.find((x) => x.rule === 'R3')!;
    expect(reason.message).toBe('문 열림 범위를 막아요');
    expect(reason.fix).toBe('70cm 옮기거나 폭을 40cm 이하로 줄여 보세요');
  });

  it('AC-05: (0,100)으로 옮기면 R3가 사라진다', () => {
    const r = evaluate(room, [f('bed', '침대', 0, 100, 150, 200)]);
    expect(r.verdicts.bed.reasons.some((x) => x.rule === 'R3')).toBe(false);
  });

  it('왼쪽 모서리가 문 안쪽이면 폭 안내 없이 이동만 안내', () => {
    const r = evaluate(noWindow, [f('a', '수납장', 60, 340, 80, 40)]);
    expect(r.verdicts.a.reasons.find((x) => x.rule === 'R3')!.fix).toBe('60cm 옮겨 보세요');
  });
});

describe('R4 통로 부족', () => {
  const bed = f('bed', '침대', 0, 100, 150, 200);

  it('AC-06: 침대 오른쪽 20cm에 책상을 두면 둘 다 주의와 표시선', () => {
    const r = evaluate(noWindow, [bed, f('desk', '책상', 170, 150, 120, 60)]);
    expect(r.verdicts.bed.level).toBe('warn');
    expect(r.verdicts.desk.level).toBe('warn');
    expect(messages(r, 'bed')).toContain('책상과 통로가 20cm예요');
    expect(messages(r, 'desk')).toContain('침대와 통로가 20cm예요');
    const gap = r.gaps.find((g) => g.bId === 'desk')!;
    expect(gap).toMatchObject({ aId: 'bed', x1: 150, x2: 170, dist: 20 });
  });

  it('AC-07: 침대에 딱 붙이면 두 가구 사이 R4 경고가 없다', () => {
    const r = evaluate(noWindow, [bed, f('desk', '책상', 150, 150, 120, 60)]);
    expect(messages(r, 'bed').some((m) => m.includes('책상과 통로'))).toBe(false);
    expect(messages(r, 'desk').some((m) => m.includes('침대와 통로'))).toBe(false);
    expect(r.gaps.some((g) => g.bId === 'desk' || g.bId === 'bed')).toBe(false);
  });

  it('간격 60cm 이상은 경고하지 않고, 59cm는 경고', () => {
    const at = (x: number) => evaluate(noWindow, [bed, f('desk', '책상', x, 150, 60, 60)]);
    expect(at(210).gaps.some((g) => g.bId === 'desk')).toBe(false);
    expect(at(209).gaps.find((g) => g.bId === 'desk')?.dist).toBe(59);
  });

  it('마주 보는 변이 겹치는 구간이 없으면 계산하지 않는다', () => {
    const r = evaluate(noWindow, [f('a', '침대', 0, 0, 110, 200), f('b', '책상', 130, 220, 120, 60)]);
    expect(r.gaps.some((g) => g.bId === 'b')).toBe(false);
  });

  it('벽과의 간격도 검사한다', () => {
    const r = evaluate(noWindow, [f('a', '책상', 30, 150, 120, 60)]);
    expect(messages(r, 'a')).toContain('벽과 통로가 30cm예요');
  });

  it('사이에 다른 가구가 있으면 그 쌍은 통로로 보지 않는다', () => {
    const r = evaluate(noWindow, [
      f('a', 'A', 0, 0, 50, 50),
      f('b', 'B', 60, 0, 20, 50),
      f('c', 'C', 90, 0, 50, 50),
    ]);
    expect(r.gaps.some((g) => g.aId === 'a' && g.bId === 'c')).toBe(false);
    expect(r.gaps.some((g) => g.aId === 'a' && g.bId === 'b')).toBe(true);
  });
});

describe('R5 창문 가림', () => {
  it('창문 벽에서 10cm 안이고 창문 범위와 겹치면 주의', () => {
    const r = evaluate(room, [f('a', '수납장', 280, 160, 40, 80)]);
    expect(r.verdicts.a.level).toBe('warn');
    expect(messages(r, 'a')).toContain('창문을 가릴 수 있어요');
  });

  it('높이를 모르면 가릴 수 있다고 안내 (예시 방 창틀 90cm, 가구 높이 모름)', () => {
    const r = evaluate(room, [f('a', '수납장', 280, 160, 40, 80)]);
    expect(r.verdicts.a.reasons.find((x) => x.rule === 'R5')!.fix).toContain('높이를 넣으면');
  });

  it('가구가 창틀 이하이면 경고 없음, 높으면 가려요로 확정', () => {
    const low = evaluate(room, [{ ...f('a', '수납장', 280, 160, 40, 80), ht: 80 }]);
    expect(low.verdicts.a.reasons.some((x) => x.rule === 'R5')).toBe(false);
    expect(low.verdicts.a.level).toBe('pass');

    const exact = evaluate(room, [{ ...f('a', '수납장', 280, 160, 40, 80), ht: 90 }]);
    expect(exact.verdicts.a.reasons.some((x) => x.rule === 'R5')).toBe(false);

    const high = evaluate(room, [{ ...f('a', '옷장', 260, 160, 60, 100), ht: 200 }]);
    const reason = high.verdicts.a.reasons.find((x) => x.rule === 'R5')!;
    expect(reason.message).toBe('창문을 가려요');
    expect(reason.fix).toContain('가구 높이 200cm가 창틀 90cm보다 높아요');
  });

  it('10cm보다 멀거나 창문 범위 밖이면 경고 없음', () => {
    expect(evaluate(room, [f('a', '수납장', 260, 160, 40, 80)]).verdicts.a.reasons.some((x) => x.rule === 'R5')).toBe(false);
    expect(evaluate(room, [f('a', '수납장', 280, 0, 40, 80)]).verdicts.a.reasons.some((x) => x.rule === 'R5')).toBe(false);
  });
});

describe('R6 여닫이 창 열림 막힘', () => {
  // 위 벽, 100~220 위치에 폭 120 여닫이 창 → 열림 영역 (100, 0, 120, 60)
  const casement: Room = { ...noWindow, windows: [{ id: 'w1', wall: 'top', offset: 100, width: 120, kind: 'casement' }] };

  it('열림 영역과 겹치면 주의와 띄울 거리 안내', () => {
    const r = evaluate(casement, [f('a', '책상', 100, 30, 120, 60)]);
    expect(r.verdicts.a.level).toBe('warn');
    const reason = r.verdicts.a.reasons.find((x) => x.rule === 'R6')!;
    expect(reason.message).toBe('여닫이 창 열림 범위를 막아요');
    expect(reason.fix).toContain('60cm 이상 띄워 보세요');
  });

  it('가구가 창틀 이하이면 창이 위로 열리므로 경고 없음, 높으면 주의', () => {
    const withSill: Room = { ...casement, windows: [{ ...casement.windows[0], sill: 90 }] };
    const low = evaluate(withSill, [{ ...f('a', '책상', 100, 30, 120, 60), ht: 73 }]);
    expect(low.verdicts.a.reasons.some((x) => x.rule === 'R6')).toBe(false);
    const high = evaluate(withSill, [{ ...f('a', '옷장', 100, 30, 120, 60), ht: 200 }]);
    expect(high.verdicts.a.reasons.find((x) => x.rule === 'R6')!.fix).toContain('창틀보다 낮은 가구');
  });

  it('열림 영역 경계에 맞닿기만 하면 경고 없음', () => {
    const r = evaluate(casement, [f('a', '책상', 100, 60, 120, 60)]);
    expect(r.verdicts.a.reasons.some((x) => x.rule === 'R6')).toBe(false);
  });

  it('미닫이·기타 창은 R6를 검사하지 않는다', () => {
    for (const kind of ['sliding', 'other'] as const) {
      const room2: Room = { ...casement, windows: [{ ...casement.windows[0], kind }] };
      const r = evaluate(room2, [f('a', '책상', 100, 30, 120, 60)]);
      expect(r.verdicts.a.reasons.some((x) => x.rule === 'R6')).toBe(false);
    }
  });
});

describe('최종 판정', () => {
  it('아무 규칙에도 걸리지 않으면 통과', () => {
    const r = evaluate(noWindow, [f('a', '침대', 0, 0, 110, 200)]);
    expect(r.verdicts.a).toEqual({ level: 'pass', reasons: [{ rule: 'OK', level: 'pass', message: '문제없어요', fix: '' }] });
  });

  it('가장 심각한 등급이 최종 판정이고 사유는 모두 보여 준다', () => {
    const r = evaluate(room, [f('a', '침대', 0, 190, 150, 200), f('b', '책상', 170, 150, 120, 60)]);
    expect(r.verdicts.a.level).toBe('problem');
    expect(r.verdicts.a.reasons[0].level).toBe('problem');
    expect(r.verdicts.a.reasons.some((x) => x.rule === 'R4')).toBe(true);
    expect(r.counts).toEqual({ problem: 1, warn: 1, pass: 0 });
  });

  it('가구 20개 재계산이 100ms 안에 끝난다 (N-03)', () => {
    const many = Array.from({ length: 20 }, (_, i) => f(`f${i}`, `가구${i}`, (i % 5) * 60, Math.floor(i / 5) * 90, 50, 80));
    const t = performance.now();
    evaluate(room, many);
    expect(performance.now() - t).toBeLessThan(100);
  });
});

describe('남은 바닥 면적', () => {
  it('AC-11: 침대·책상·옷장을 320×400 방에 놓으면 72.5%', () => {
    const list = [f('a', '침대', 0, 0, 110, 200), f('b', '책상', 0, 0, 120, 60), f('c', '옷장', 0, 0, 100, 60)];
    expect(freeAreaPct(room, list)).toBe(72.5);
  });

  it('가구가 없으면 100', () => {
    expect(freeAreaPct(room, [])).toBe(100);
  });
});

describe('조사', () => {
  it('받침에 따라 와/과', () => {
    expect(withWa('침대')).toBe('침대와');
    expect(withWa('책상')).toBe('책상과');
    expect(withWa('벽')).toBe('벽과');
    expect(withWa('TV')).toBe('TV와');
  });
});
