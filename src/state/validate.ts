import { LIMITS } from '../domain/constants';
import type { Room } from '../domain/types';
import { wallLength } from '../rules/geom';

export type Errors = Record<string, string>;

export const MSG = {
  number: '숫자를 입력해 주세요',
  room: '150~1,000cm 사이로 입력해 주세요',
  door: '문 폭은 60~120cm 사이로 입력해 주세요',
  windowShort: '창문 폭은 30cm 이상으로 입력해 주세요',
  windowLong: '창문이 벽보다 길어요',
  outside: '벽 밖으로 나가요',
  doorWindow: '문과 창문이 겹쳐요',
  furniture: '20~400cm 사이로 입력해 주세요',
  name: '이름을 1~10자로 입력해 주세요',
  sill: '창틀 높이는 0~300cm 사이로 입력해 주세요',
  height: '높이는 10~300cm 사이로 입력해 주세요',
} as const;

/** 비워 둘 수 있는 높이 값. null·undefined·NaN 은 '모름'. */
export const isUnknown = (n: number | null | undefined): n is null | undefined => n == null || Number.isNaN(n);

export function sillError(n: number | null | undefined): string | null {
  if (isUnknown(n)) return null;
  return isInt(n) && n >= 0 && n <= LIMITS.sillMax ? null : MSG.sill;
}

export function heightError(n: number | null | undefined): string | null {
  if (isUnknown(n)) return null;
  return isInt(n) && n >= LIMITS.heightMin && n <= LIMITS.heightMax ? null : MSG.height;
}

export const isInt = (n: number) => Number.isInteger(n);

/** 방 설정 입력 검증 (PRD 4.2). 키는 입력 칸 id. 빈 객체면 통과. */
export function validateRoom(room: Room): Errors {
  const e: Errors = {};
  for (const k of ['w', 'h'] as const) {
    const v = room[k];
    if (!isInt(v)) e[k] = MSG.number;
    else if (v < LIMITS.roomMin || v > LIMITS.roomMax) e[k] = MSG.room;
  }
  const sizeOk = !e.w && !e.h;

  const { door } = room;
  const doorLen = wallLength(room, door.wall);
  if (!isInt(door.width)) e['door.width'] = MSG.number;
  else if (door.width < LIMITS.doorMin || door.width > LIMITS.doorMax) e['door.width'] = MSG.door;
  if (!isInt(door.offset)) e['door.offset'] = MSG.number;
  else if (sizeOk && (door.offset < 0 || (isInt(door.width) && door.offset > doorLen - door.width)))
    e['door.offset'] = MSG.outside;

  for (const win of room.windows) {
    const len = wallLength(room, win.wall);
    const wk = `win.${win.id}.width`;
    const ok = `win.${win.id}.offset`;
    if (!isInt(win.width)) e[wk] = MSG.number;
    else if (win.width < LIMITS.windowMin) e[wk] = MSG.windowShort;
    else if (sizeOk && win.width > len) e[wk] = MSG.windowLong;

    if (!isInt(win.offset)) e[ok] = MSG.number;
    else if (sizeOk && !e[wk] && (win.offset < 0 || win.offset > len - win.width)) e[ok] = MSG.outside;
    else if (
      win.wall === door.wall &&
      !e[wk] &&
      isInt(door.offset) &&
      isInt(door.width) &&
      Math.min(win.offset + win.width, door.offset + door.width) - Math.max(win.offset, door.offset) > 0
    )
      e[ok] = MSG.doorWindow;

    const se = sillError(win.sill);
    if (se) e[`win.${win.id}.sill`] = se;
  }
  return e;
}

export function furnitureSizeError(n: number): string | null {
  if (!isInt(n)) return MSG.number;
  if (n < LIMITS.furnitureMin || n > LIMITS.furnitureMax) return MSG.furniture;
  return null;
}

export function nameError(name: string): string | null {
  const t = name.trim();
  return t.length < 1 || t.length > LIMITS.nameMaxLength ? MSG.name : null;
}
