import { describe, expect, it } from 'vitest';
import { EMPTY_ROOM, EXAMPLE_ROOM } from '../../src/domain/constants';
import type { Room } from '../../src/domain/types';
import { decodeHash, encodeState } from '../../src/share/link';
import { pngFileName } from '../../src/share/png';
import { initState, reducer, type State } from '../../src/state/reducer';
import { heightError, MSG, validateRoom } from '../../src/state/validate';

const base = (): State => ({ ...initState(''), room: EXAMPLE_ROOM, screen: 'layout' });

describe('입력 검증 (PRD 4.2)', () => {
  it('예시 방은 오류 없음', () => {
    expect(validateRoom(EXAMPLE_ROOM)).toEqual({});
  });

  it('AC-02: 방 가로 100은 범위 오류', () => {
    expect(validateRoom({ ...EXAMPLE_ROOM, w: 100 }).w).toBe(MSG.room);
    expect(validateRoom({ ...EXAMPLE_ROOM, h: 1001 }).h).toBe(MSG.room);
  });

  it('빈칸은 숫자 오류', () => {
    const e = validateRoom(EMPTY_ROOM);
    expect(e.w).toBe(MSG.number);
    expect(e['door.width']).toBe(MSG.number);
  });

  it('문 폭 범위와 위치', () => {
    const door = (d: Partial<Room['door']>) => validateRoom({ ...EXAMPLE_ROOM, door: { ...EXAMPLE_ROOM.door, ...d } });
    expect(door({ width: 50 })['door.width']).toBe(MSG.door);
    expect(door({ width: 121 })['door.width']).toBe(MSG.door);
    expect(door({ offset: 241 })['door.offset']).toBe(MSG.outside);
    expect(door({ offset: 240 })).toEqual({});
  });

  it('창문: 벽보다 길거나, 벽 밖이거나, 문과 겹침', () => {
    const win = (w: Partial<Room['windows'][number]>) =>
      validateRoom({ ...EXAMPLE_ROOM, windows: [{ ...EXAMPLE_ROOM.windows[0], ...w }] });
    expect(win({ width: 401 })['win.w1.width']).toBe(MSG.windowLong);
    expect(win({ width: 20 })['win.w1.width']).toBe(MSG.windowShort);
    expect(win({ offset: 300 })['win.w1.offset']).toBe(MSG.outside);
    expect(win({ wall: 'bottom', offset: 100, width: 60 })['win.w1.offset']).toBe(MSG.doorWindow);
    expect(win({ wall: 'bottom', offset: 120, width: 60 })).toEqual({});
  });

  it('창틀 높이는 비워 둘 수 있고, 넣으면 0~300', () => {
    const win = (sill: number | null) =>
      validateRoom({ ...EXAMPLE_ROOM, windows: [{ ...EXAMPLE_ROOM.windows[0], sill }] });
    expect(win(null)).toEqual({});
    expect(win(0)).toEqual({});
    expect(win(301)['win.w1.sill']).toBe(MSG.sill);
    expect(win(-1)['win.w1.sill']).toBe(MSG.sill);
  });

  it('가구 높이는 비워 둘 수 있고, 넣으면 10~300', () => {
    expect(heightError(null)).toBeNull();
    expect(heightError(NaN)).toBeNull();
    expect(heightError(45)).toBeNull();
    expect(heightError(5)).toBe(MSG.height);
    expect(heightError(301)).toBe(MSG.height);
  });
});

describe('reducer', () => {
  it('새 가구는 방 중앙, 자리가 차 있으면 20cm씩 비켜 놓는다', () => {
    let s = reducer(base(), { type: 'add', name: '책상', w: 120, h: 60 });
    expect(s.furniture[0]).toMatchObject({ x: 100, y: 170 });
    s = reducer(s, { type: 'add', name: '책상', w: 120, h: 60 });
    // 세로 60cm가 겹치지 않을 때까지 20cm씩 세 번 비킨다
    expect(s.furniture[1]).toMatchObject({ x: 160, y: 230 });
    expect(s.selectedId).toBe(s.furniture[1].id);
  });

  it('AC-10: 300×200을 회전하면 200×300, 중심 유지', () => {
    let s = reducer(base(), { type: 'add', name: '소파', w: 300, h: 200 });
    const before = s.furniture[0];
    s = reducer(s, { type: 'rotate', id: before.id });
    const after = s.furniture[0];
    expect([after.w, after.h]).toEqual([200, 300]);
    expect(after.x + after.w / 2).toBe(before.x + before.w / 2);
    expect(after.y + after.h / 2).toBe(before.y + before.h / 2);
  });

  it('가구는 20개까지', () => {
    let s = base();
    for (let i = 0; i < 25; i++) s = reducer(s, { type: 'add', name: '수납장', w: 20, h: 20 });
    expect(s.furniture).toHaveLength(20);
  });

  it('AC-12: 화면 1로 갔다가 돌아와도 가구 유지', () => {
    let s = reducer(base(), { type: 'add', name: '침대', w: 110, h: 200 });
    s = reducer(s, { type: 'goto', screen: 'setup' });
    s = reducer(s, { type: 'goto', screen: 'layout' });
    expect(s.screen).toBe('layout');
    expect(s.furniture).toHaveLength(1);
  });

  it('방 설정이 틀리면 화면 2로 넘어가지 않는다', () => {
    const s = reducer({ ...base(), screen: 'setup', room: { ...EXAMPLE_ROOM, w: 100 } }, { type: 'goto', screen: 'layout' });
    expect(s.screen).toBe('setup');
  });

  it('잘못된 해시로 시작하면 빈 화면 1과 안내', () => {
    const s = initState('#v=1&s=garbage!!');
    expect(s).toMatchObject({ screen: 'setup', linkError: true, furniture: [] });
    expect(Number.isNaN(s.room.w)).toBe(true);
  });
});

describe('공유 링크 (PRD 4.7)', () => {
  const furniture = [
    { id: 'f1', name: '침대', x: 0, y: 100, w: 110, h: 200, ht: 45 },
    { id: 'f2', name: '책상', x: 170, y: 150, w: 120, h: 60, ht: null },
  ];

  it('인코딩 → 디코딩하면 같은 방과 배치', () => {
    const hash = encodeState(EXAMPLE_ROOM, furniture);
    expect(hash).toMatch(/^v=1&s=[A-Za-z0-9_-]+$/);
    const back = decodeHash('#' + hash)!;
    expect(back.room).toEqual(EXAMPLE_ROOM);
    expect(back.furniture).toEqual(furniture);
  });

  it('가구 20개(이름 10자)여도 2,000자를 넘지 않는다', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `f${i}`,
      name: '가나다라마바사아자차',
      x: 1000 + i,
      y: -1000,
      w: 400,
      h: 400,
      ht: 300,
    }));
    const full: Room = {
      ...EXAMPLE_ROOM,
      w: 1000,
      h: 1000,
      windows: [0, 1, 2, 3].map((i) => ({
        id: `w${i + 1}`,
        wall: 'top' as const,
        offset: 200 + i * 200,
        width: 100,
        kind: 'casement' as const,
        sill: 300,
      })),
    };
    const url = `https://room-layout-check.vercel.app/#${encodeState(full, many)}`;
    expect(url.length).toBeLessThan(2000);
    expect(decodeHash(url.slice(url.indexOf('#')))).not.toBeNull();
  });

  it('창문 종류가 링크에 담기고, 종류가 없는 예전 링크는 미닫이로 읽는다', () => {
    const room: Room = { ...EXAMPLE_ROOM, windows: [{ ...EXAMPLE_ROOM.windows[0], kind: 'casement' }] };
    expect(decodeHash('#' + encodeState(room, []))!.room.windows[0].kind).toBe('casement');

    const legacy = { r: [320, 400], d: [1, 40, 80, 0], ws: [[3, 140, 120]], f: [['bed', 0, 100, 110, 200]] };
    const s = btoa(JSON.stringify(legacy)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const back = decodeHash(`#v=1&s=${s}`)!;
    expect(back.room.windows[0]).toMatchObject({ kind: 'sliding', sill: null });
    expect(back.furniture[0].ht).toBeNull();
  });

  it('높이가 범위를 벗어난 링크는 열지 않는다', () => {
    expect(decodeHash('#' + encodeState(EXAMPLE_ROOM, [{ ...furniture[0], ht: 999 }]))).toBeNull();
    const badSill = { ...EXAMPLE_ROOM, windows: [{ ...EXAMPLE_ROOM.windows[0], sill: 500 }] };
    expect(decodeHash('#' + encodeState(badSill, []))).toBeNull();
  });

  it('형식이 틀리거나 값이 범위를 벗어나면 null', () => {
    expect(decodeHash('#v=2&s=abc')).toBeNull();
    expect(decodeHash('#v=1&s=%%%')).toBeNull();
    expect(decodeHash('#v=1')).toBeNull();
    expect(decodeHash('#' + encodeState({ ...EXAMPLE_ROOM, w: 100 }, []))).toBeNull();
    expect(decodeHash('#' + encodeState(EXAMPLE_ROOM, [{ ...furniture[0], w: 10 }]))).toBeNull();
    expect(decodeHash('#' + encodeState(EXAMPLE_ROOM, [{ ...furniture[0], name: '' }]))).toBeNull();
  });
});

describe('PNG 파일 이름', () => {
  it('room-layout-YYYYMMDD.png', () => {
    expect(pngFileName(new Date(2026, 10, 9))).toBe('room-layout-20261109.png');
  });
});
