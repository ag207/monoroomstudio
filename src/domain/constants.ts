import type { Room } from './types';

export const LIMITS = {
  roomMin: 150,
  roomMax: 1000,
  doorMin: 60,
  doorMax: 120,
  windowMin: 30,
  windowsMax: 4,
  furnitureMin: 20,
  furnitureMax: 400,
  furnitureCountMax: 20,
  nameMaxLength: 10,
  sillMax: 300,
  heightMin: 10,
  heightMax: 300,
  aisleMin: 60,
  windowReach: 10,
  dragSnap: 10,
  gridStep: 50,
} as const;

export const PRESETS = [
  // ht: 가구 높이 기본값 (침대는 매트리스 윗면 기준)
  { name: '침대', w: 110, h: 200, ht: 45 },
  { name: '책상', w: 120, h: 60, ht: 73 },
  { name: '옷장', w: 100, h: 60, ht: 200 },
  { name: '수납장', w: 80, h: 40, ht: 80 },
] as const;

export const EMPTY_ROOM: Room = {
  w: NaN,
  h: NaN,
  door: { wall: 'bottom', offset: NaN, width: NaN, hinge: 'left' },
  windows: [],
};

/** F-106 원룸 예시: 320×400, 아래 벽 문 80cm, 오른쪽 벽 창 120cm */
export const EXAMPLE_ROOM: Room = {
  w: 320,
  h: 400,
  door: { wall: 'bottom', offset: 40, width: 80, hinge: 'left' },
  windows: [{ id: 'w1', wall: 'right', offset: 140, width: 120, kind: 'sliding', sill: 90 }],
};

export const WALL_LABEL = { top: '위', bottom: '아래', left: '왼쪽', right: '오른쪽' } as const;

export const WINDOW_KIND_LABEL = { sliding: '미닫이', casement: '여닫이', other: '기타' } as const;
