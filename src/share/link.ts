import { LIMITS } from '../domain/constants';
import type { Furniture, Hinge, Room, Wall } from '../domain/types';
import { furnitureSizeError, isInt, nameError, validateRoom } from '../state/validate';

// 공유 링크: JSON → UTF-8 → base64url, URL 해시에 `v=1&s=...` 로 담는다 (PRD 4.7).

const VERSION = '1';
const WALLS: Wall[] = ['top', 'bottom', 'left', 'right'];
const HINGES: Hinge[] = ['left', 'right'];

type Compact = {
  r: [number, number];
  d: [number, number, number, number];
  ws: [number, number, number][];
  f: [string, number, number, number, number][];
};

function toBase64Url(text: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** 해시 문자열(`#` 제외)을 만든다 */
export function encodeState(room: Room, furniture: Furniture[]): string {
  const c: Compact = {
    r: [room.w, room.h],
    d: [WALLS.indexOf(room.door.wall), room.door.offset, room.door.width, HINGES.indexOf(room.door.hinge)],
    ws: room.windows.map((w) => [WALLS.indexOf(w.wall), w.offset, w.width]),
    f: furniture.map((f) => [f.name, f.x, f.y, f.w, f.h]),
  };
  return `v=${VERSION}&s=${toBase64Url(JSON.stringify(c))}`;
}

const ints = (a: unknown, n: number): a is number[] =>
  Array.isArray(a) && a.length === n && a.every((v) => typeof v === 'number' && isInt(v));

/** 해시를 해석한다. 형식이 틀리거나 값이 허용 범위를 벗어나면 null. */
export function decodeHash(hash: string): { room: Room; furniture: Furniture[] } | null {
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const s = params.get('s');
    if (params.get('v') !== VERSION || !s) return null;
    const c = JSON.parse(fromBase64Url(s)) as Compact;

    if (!ints(c.r, 2) || !ints(c.d, 4) || !Array.isArray(c.ws) || !Array.isArray(c.f)) return null;
    if (c.ws.length > LIMITS.windowsMax || c.f.length > LIMITS.furnitureCountMax) return null;
    const wall = (i: number) => WALLS[i];
    if (!wall(c.d[0]) || !HINGES[c.d[3]]) return null;

    const room: Room = {
      w: c.r[0],
      h: c.r[1],
      door: { wall: wall(c.d[0]), offset: c.d[1], width: c.d[2], hinge: HINGES[c.d[3]] },
      windows: c.ws.map((w, i) => {
        if (!ints(w, 3) || !wall(w[0])) throw new Error('window');
        return { id: `w${i + 1}`, wall: wall(w[0]), offset: w[1], width: w[2] };
      }),
    };
    if (Object.keys(validateRoom(room)).length) return null;

    const furniture: Furniture[] = c.f.map((f, i) => {
      if (!Array.isArray(f) || typeof f[0] !== 'string' || !ints(f.slice(1), 4)) throw new Error('furniture');
      const [name, x, y, w, h] = f;
      if (nameError(name) || furnitureSizeError(w) || furnitureSizeError(h)) throw new Error('furniture');
      if (Math.abs(x) > 2 * LIMITS.roomMax || Math.abs(y) > 2 * LIMITS.roomMax) throw new Error('furniture');
      return { id: `f${i + 1}`, name: name.trim(), x, y, w, h };
    });
    return { room, furniture };
  } catch {
    return null;
  }
}
