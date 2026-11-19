// 모든 길이는 cm 정수. 원점은 방 왼쪽 위, x는 오른쪽, y는 아래쪽으로 증가 (PRD 4.1).

export type Wall = 'top' | 'bottom' | 'left' | 'right';

/** 경첩 위치. 'left' = 벽에서 좌표가 작은 쪽 끝(위·아래 벽은 왼쪽, 왼쪽·오른쪽 벽은 위쪽). */
export type Hinge = 'left' | 'right';

export interface Door {
  wall: Wall;
  /** 벽 시작 모서리(왼쪽 또는 위)에서 문까지 거리 */
  offset: number;
  width: number;
  hinge: Hinge;
}

export interface RoomWindow {
  id: string;
  wall: Wall;
  offset: number;
  width: number;
}

export interface Room {
  w: number;
  h: number;
  door: Door;
  windows: RoomWindow[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Furniture extends Rect {
  id: string;
  name: string;
}

export type Level = 'problem' | 'warn' | 'pass';

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'OK';

export interface Reason {
  rule: RuleId;
  level: Level;
  message: string;
  fix: string;
}

export interface Verdict {
  level: Level;
  reasons: Reason[];
}

/** R4 통로 부족 구간. 캔버스에 표시선으로 그린다. */
export interface Gap {
  aId: string;
  /** 상대 가구 id, 벽이면 'wall' */
  bId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dist: number;
}

export interface Evaluation {
  verdicts: Record<string, Verdict>;
  gaps: Gap[];
  counts: Record<Level, number>;
  /** 남은 바닥 면적 %, 소수 첫째 자리까지 반올림 */
  freeAreaPct: number;
}
