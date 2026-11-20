import type { FrontOpening, Room } from './types';

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
  openDepthMin: 10,
  openDepthMax: 150,
  drawerDefault: 40,
  aisleMin: 60,
  windowReach: 10,
  dragSnap: 10,
  gridStep: 50,
} as const;

export const PRESETS = [
  // ht: 가구 높이 기본값 (침대는 매트리스 윗면 기준)
  // open: 앞면은 평면의 아래쪽. 옷장은 두 짝 여닫이(문짝 폭 = 가로의 절반), 수납장은 서랍
  { name: '침대', w: 110, h: 200, ht: 45, open: null },
  { name: '책상', w: 120, h: 60, ht: 73, open: null },
  { name: '옷장', w: 100, h: 60, ht: 200, open: { kind: 'swing', side: 'bottom', depth: 50 } },
  { name: '수납장', w: 80, h: 40, ht: 80, open: { kind: 'drawer', side: 'bottom', depth: 35 } },
] as const satisfies readonly { name: string; w: number; h: number; ht: number; open: FrontOpening | null }[];

export const OPEN_KIND_LABEL = { swing: '여닫이 문', slide: '미닫이 문', drawer: '서랍' } as const;

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
