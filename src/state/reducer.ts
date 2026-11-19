import { EMPTY_ROOM, EXAMPLE_ROOM, LIMITS } from '../domain/constants';
import type { Furniture, Room } from '../domain/types';
import { overlapArea } from '../rules/geom';
import { decodeHash } from '../share/link';
import { validateRoom } from './validate';

export type Screen = 'setup' | 'layout';

export interface State {
  screen: Screen;
  room: Room;
  furniture: Furniture[];
  selectedId: string | null;
  linkError: boolean;
  nextId: number;
}

export type Action =
  | { type: 'setRoom'; room: Room }
  | { type: 'loadExample' }
  | { type: 'addWindow' }
  | { type: 'removeWindow'; id: string }
  | { type: 'goto'; screen: Screen }
  | { type: 'add'; name: string; w: number; h: number; ht?: number | null }
  | { type: 'setHeight'; id: string; ht: number | null }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'nudge'; id: string; dx: number; dy: number }
  | { type: 'resize'; id: string; w: number; h: number }
  | { type: 'rotate'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'select'; id: string | null }
  | { type: 'dismissLinkError' };

export const isRoomValid = (room: Room) => Object.keys(validateRoom(room)).length === 0;

/** 첫 상태. 공유 링크가 있으면 그 배치로 화면 2를, 해석에 실패하면 빈 화면 1과 안내를 연다. */
export function initState(hash: string): State {
  const base: State = {
    screen: 'setup',
    room: EMPTY_ROOM,
    furniture: [],
    selectedId: null,
    linkError: false,
    nextId: 1,
  };
  if (!hash.replace(/^#/, '')) return base;
  const shared = decodeHash(hash);
  if (!shared) return { ...base, linkError: true };
  return {
    ...base,
    screen: 'layout',
    room: shared.room,
    furniture: shared.furniture,
    nextId: shared.furniture.length + shared.room.windows.length + 1,
  };
}

/** 새 가구는 방 중앙, 자리가 차 있으면 오른쪽 아래로 20cm씩 비켜 놓는다 (PRD 4.3) */
function placeNew(room: Room, list: Furniture[], w: number, h: number) {
  let x = Math.round((room.w - w) / 2);
  let y = Math.round((room.h - h) / 2);
  for (let i = 0; i < 50 && list.some((o) => overlapArea(o, { x, y, w, h }) > 0); i++) {
    x += 20;
    y += 20;
  }
  return { x, y };
}

function update(state: State, id: string, fn: (f: Furniture) => Furniture): State {
  return { ...state, furniture: state.furniture.map((f) => (f.id === id ? fn(f) : f)) };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setRoom':
      return { ...state, room: action.room };
    case 'loadExample':
      return { ...state, room: EXAMPLE_ROOM, linkError: false };
    case 'addWindow': {
      if (state.room.windows.length >= LIMITS.windowsMax) return state;
      const win = { id: `w${state.nextId}`, wall: 'top' as const, offset: NaN, width: NaN, kind: 'sliding' as const, sill: null };
      return { ...state, nextId: state.nextId + 1, room: { ...state.room, windows: [...state.room.windows, win] } };
    }
    case 'removeWindow':
      return {
        ...state,
        room: { ...state.room, windows: state.room.windows.filter((w) => w.id !== action.id) },
      };
    case 'goto':
      if (action.screen === 'layout' && !isRoomValid(state.room)) return state;
      return { ...state, screen: action.screen, linkError: false };
    case 'add': {
      if (state.furniture.length >= LIMITS.furnitureCountMax) return state;
      const id = `f${state.nextId}`;
      const pos = placeNew(state.room, state.furniture, action.w, action.h);
      const f: Furniture = { id, name: action.name.trim(), w: action.w, h: action.h, ht: action.ht ?? null, ...pos };
      return { ...state, nextId: state.nextId + 1, furniture: [...state.furniture, f], selectedId: id };
    }
    case 'move':
      return update(state, action.id, (f) => ({ ...f, x: action.x, y: action.y }));
    case 'nudge':
      return update(state, action.id, (f) => ({ ...f, x: f.x + action.dx, y: f.y + action.dy }));
    case 'resize':
      return update(state, action.id, (f) => ({ ...f, w: action.w, h: action.h }));
    case 'setHeight':
      return update(state, action.id, (f) => ({ ...f, ht: action.ht }));
    case 'rotate':
      // 가로·세로를 바꾸고 중심점을 유지한다. 방 안쪽으로 보정하지 않는다 (PRD 4.1).
      return update(state, action.id, (f) => ({
        ...f,
        w: f.h,
        h: f.w,
        x: Math.round(f.x + (f.w - f.h) / 2),
        y: Math.round(f.y + (f.h - f.w) / 2),
      }));
    case 'remove':
      return {
        ...state,
        furniture: state.furniture.filter((f) => f.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'dismissLinkError':
      return { ...state, linkError: false };
  }
}
