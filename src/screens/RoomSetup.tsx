import { FloorPlan } from '../components/FloorPlan';
import { NumberField } from '../components/NumberField';
import { LIMITS, WALL_LABEL, WINDOW_KIND_LABEL } from '../domain/constants';
import type { Door, Room, RoomWindow, Wall, WindowKind } from '../domain/types';
import { formatPct } from '../domain/text';
import { useApp } from '../state/AppContext';
import { validateRoom, type Errors } from '../state/validate';
import s from './RoomSetup.module.css';

const WALLS: Wall[] = ['top', 'bottom', 'left', 'right'];
const WINDOW_KINDS: WindowKind[] = ['sliding', 'casement', 'other'];

/** 미리보기에는 오류 없는 부분만 그린다 */
function previewRoom(room: Room, e: Errors) {
  if (e.w || e.h) return null;
  return {
    w: room.w,
    h: room.h,
    door: e['door.width'] || e['door.offset'] ? undefined : room.door,
    windows: room.windows.filter((w) => !e[`win.${w.id}.width`] && !e[`win.${w.id}.offset`]),
  };
}

function hingeLabels(wall: Wall): [string, string] {
  return wall === 'top' || wall === 'bottom' ? ['왼쪽', '오른쪽'] : ['위', '아래'];
}

export function RoomSetup() {
  const { state, dispatch } = useApp();
  const { room } = state;
  const errors = validateRoom(room);
  const valid = Object.keys(errors).length === 0;
  const preview = previewRoom(room, errors);

  const setRoom = (patch: Partial<Room>) => dispatch({ type: 'setRoom', room: { ...room, ...patch } });
  const setDoor = (patch: Partial<Door>) => setRoom({ door: { ...room.door, ...patch } });
  const setWin = (id: string, patch: Partial<RoomWindow>) =>
    setRoom({ windows: room.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) });

  const m2 = preview ? (room.w * room.h) / 10000 : 0;

  return (
    <main className={s.main}>
      {state.linkError && (
        <div className={s.alert} role="alert">
          <p>링크를 열 수 없어요. 처음부터 시작해 주세요</p>
          <button type="button" className="btn-icon" aria-label="안내 닫기" onClick={() => dispatch({ type: 'dismissLinkError' })}>
            ×
          </button>
        </div>
      )}
      <div className={s.grid}>
        <form
          className={`card ${s.form}`}
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: 'goto', screen: 'layout' });
          }}
          noValidate
        >
          <section className={s.section} aria-labelledby="sec-size">
            <div className={s.sectionHead}>
              <h2 id="sec-size">① 방 크기</h2>
              <button type="button" className="btn-link" onClick={() => dispatch({ type: 'loadExample' })}>
                원룸 예시 불러오기
              </button>
            </div>
            <div className={s.row}>
              <NumberField id="room-w" label="가로" value={room.w} error={errors.w} onChange={(w) => setRoom({ w })} />
              <NumberField id="room-h" label="세로" value={room.h} error={errors.h} onChange={(h) => setRoom({ h })} />
            </div>
          </section>

          <section className={s.section} aria-labelledby="sec-door">
            <h2 id="sec-door">② 문</h2>
            <div className="field">
              <span className="field-label" id="door-wall-label">
                문이 있는 벽
              </span>
              <div className="segmented" role="group" aria-labelledby="door-wall-label">
                {WALLS.map((w) => (
                  <button key={w} type="button" aria-pressed={room.door.wall === w} onClick={() => setDoor({ wall: w })}>
                    {WALL_LABEL[w]}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.row}>
              <NumberField
                id="door-offset"
                label={room.door.wall === 'top' || room.door.wall === 'bottom' ? '왼쪽 모서리에서 거리' : '위쪽 모서리에서 거리'}
                value={room.door.offset}
                error={errors['door.offset']}
                onChange={(offset) => setDoor({ offset })}
              />
              <NumberField
                id="door-width"
                label="문 폭"
                value={room.door.width}
                error={errors['door.width']}
                onChange={(width) => setDoor({ width })}
              />
            </div>
            <div className="field">
              <span className="field-label" id="door-hinge-label">
                경첩 위치
              </span>
              <div className="segmented" role="group" aria-labelledby="door-hinge-label">
                {(['left', 'right'] as const).map((h, i) => (
                  <button key={h} type="button" aria-pressed={room.door.hinge === h} onClick={() => setDoor({ hinge: h })}>
                    {hingeLabels(room.door.wall)[i]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={s.section} aria-labelledby="sec-win">
            <h2 id="sec-win">③ 창문</h2>
            {room.windows.length === 0 && <p className="muted small">창문이 없으면 비워 두세요.</p>}
            {room.windows.map((win, i) => (
              <fieldset key={win.id} className={s.window}>
                <legend className="visually-hidden">창문 {i + 1}</legend>
                <div className={s.windowHead}>
                  <span aria-hidden="true">창문 {i + 1}</span>
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`창문 ${i + 1} 삭제`}
                    onClick={() => dispatch({ type: 'removeWindow', id: win.id })}
                  >
                    ×
                  </button>
                </div>
                <div className="field">
                  <span className="field-label">
                    창문이 있는 벽
                  </span>
                  <div className="segmented" role="group" aria-label={`창문 ${i + 1} 벽`}>
                    {WALLS.map((w) => (
                      <button key={w} type="button" aria-pressed={win.wall === w} onClick={() => setWin(win.id, { wall: w })}>
                        {WALL_LABEL[w]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">
                    창문 종류
                  </span>
                  <div className="segmented" role="group" aria-label={`창문 ${i + 1} 종류`}>
                    {WINDOW_KINDS.map((k) => (
                      <button key={k} type="button" aria-pressed={win.kind === k} onClick={() => setWin(win.id, { kind: k })}>
                        {WINDOW_KIND_LABEL[k]}
                      </button>
                    ))}
                  </div>
                  {win.kind === 'casement' && (
                    <p className="muted small">방 안쪽으로 열리는 범위(창 폭의 절반)를 막는 가구는 주의로 표시돼요.</p>
                  )}
                </div>
                <div className={s.row}>
                  <NumberField
                    id={`win-${win.id}-offset`}
                    label="모서리에서 거리"
                    value={win.offset}
                    error={errors[`win.${win.id}.offset`]}
                    onChange={(offset) => setWin(win.id, { offset })}
                  />
                  <NumberField
                    id={`win-${win.id}-width`}
                    label="폭"
                    value={win.width}
                    error={errors[`win.${win.id}.width`]}
                    onChange={(width) => setWin(win.id, { width })}
                  />
                </div>
                <NumberField
                  id={`win-${win.id}-sill`}
                  label="창틀 높이 (바닥에서 창 아래까지)"
                  value={win.sill ?? NaN}
                  error={errors[`win.${win.id}.sill`]}
                  placeholder="예: 90"
                  hint="비워 두면 '모름'으로 보고, 창문 앞 가구는 가릴 수 있다고만 알려 드려요. 바닥까지 내려오는 창은 0."
                  onChange={(n) => setWin(win.id, { sill: Number.isNaN(n) ? null : n })}
                />
              </fieldset>
            ))}
            <button
              type="button"
              className="btn btn-utility"
              disabled={room.windows.length >= LIMITS.windowsMax}
              onClick={() => dispatch({ type: 'addWindow' })}
            >
              + 창문 추가
            </button>
          </section>

          <button type="submit" className="btn btn-primary" disabled={!valid}>
            다음: 가구 배치하기
          </button>
          {!valid && <p className="muted small">모든 칸을 올바르게 채우면 다음으로 넘어갈 수 있어요.</p>}
        </form>

        <section className={`card ${s.preview}`} aria-labelledby="sec-preview">
          <h2 id="sec-preview">미리보기</h2>
          {preview ? (
            <>
              <div className={s.plan}>
                <FloorPlan room={preview} label={`방 평면 미리보기, 가로 ${room.w}cm 세로 ${room.h}cm`} />
              </div>
              <p className={s.area} data-testid="room-area">
                면적 {formatPct(Math.round(m2 * 10) / 10)}㎡ · 약 {formatPct(Math.round((m2 / 3.3058) * 10) / 10)}평
              </p>
            </>
          ) : (
            <p className={`muted ${s.empty}`}>방 가로·세로를 입력하면 미리보기가 나와요.</p>
          )}
        </section>
      </div>
    </main>
  );
}
