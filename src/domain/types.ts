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

/** 창문 종류: 미닫이(옆으로 밀기), 여닫이(방 안쪽으로 열기), 기타 */
export type WindowKind = 'sliding' | 'casement' | 'other';

export interface RoomWindow {
  id: string;
  wall: Wall;
  offset: number;
  width: number;
  kind: WindowKind;
  /** 바닥에서 창틀(창 아래)까지 높이. 비우면(null) 모름. */
  sill?: number | null;
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
  /** 가구 높이(바닥에서 윗면까지). 평면의 h(세로)와 다르다. 비우면(null) 모름. */
  ht?: number | null;
}

export type Level = 'problem' | 'warn' | 'pass';

/** R6(여닫이 창 열림 범위)은 PRD에 없고 나중에 추가한 규칙 */
export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'OK';

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
