import { useCallback, useState } from 'react';
import { Badge, Legend } from '../components/Common';
import { FloorPlan } from '../components/FloorPlan';
import { DraftNumberField, NumberField } from '../components/NumberField';
import { LIMITS, PRESETS } from '../domain/constants';
import type { Furniture } from '../domain/types';
import { formatPct } from '../domain/text';
import { useApp } from '../state/AppContext';
import { furnitureSizeError, nameError } from '../state/validate';
import { ShareDialog } from './ShareDialog';
import s from './Layout.module.css';

const anyInt = (n: number) => (Number.isInteger(n) && Math.abs(n) <= 2 * LIMITS.roomMax ? null : '숫자를 입력해 주세요');

function CustomForm({ disabled }: { disabled: boolean }) {
  const { dispatch } = useApp();
  const [name, setName] = useState('');
  const [w, setW] = useState(NaN);
  const [h, setH] = useState(NaN);
  const [nameTouched, setNameTouched] = useState(false);
  const nErr = nameError(name);
  const ok = !nErr && !furnitureSizeError(w) && !furnitureSizeError(h);
  return (
    <form
      className={s.custom}
      aria-label="가구 직접 입력"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok || disabled) return;
        dispatch({ type: 'add', name, w, h });
        setName('');
        setW(NaN);
        setH(NaN);
        setNameTouched(false);
      }}
    >
      <div className="field">
        <label htmlFor="custom-name">이름</label>
        <input
          id="custom-name"
          value={name}
          maxLength={LIMITS.nameMaxLength}
          placeholder="예: 소파"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          aria-invalid={nameTouched && nErr ? true : undefined}
        />
        {nameTouched && nErr && <p className="field-error">{nErr}</p>}
      </div>
      <div className={s.row}>
        <NumberField id="custom-w" label="가로" value={w} onChange={setW} error={furnitureSizeError(w)} />
        <NumberField id="custom-h" label="세로" value={h} onChange={setH} error={furnitureSizeError(h)} />
      </div>
      <button type="submit" className="btn btn-utility" disabled={!ok || disabled}>
        추가
      </button>
    </form>
  );
}

function SelectedCard({ f }: { f: Furniture }) {
  const { dispatch, result } = useApp();
  const level = result?.verdicts[f.id]?.level ?? 'pass';
  const resizeW = useCallback((w: number) => dispatch({ type: 'resize', id: f.id, w, h: f.h }), [dispatch, f.id, f.h]);
  const resizeH = useCallback((h: number) => dispatch({ type: 'resize', id: f.id, w: f.w, h }), [dispatch, f.id, f.w]);
  const moveX = useCallback((x: number) => dispatch({ type: 'move', id: f.id, x, y: f.y }), [dispatch, f.id, f.y]);
  const moveY = useCallback((y: number) => dispatch({ type: 'move', id: f.id, x: f.x, y }), [dispatch, f.id, f.x]);
  return (
    <section className={`card ${s.selected}`} aria-labelledby="sel-title">
      <div className={s.selectedHead}>
        <h2 id="sel-title">{f.name}</h2>
        <Badge level={level} />
      </div>
      <div className={s.row}>
        <DraftNumberField id="sel-w" label="가로" committed={f.w} validate={furnitureSizeError} onCommit={resizeW} />
        <DraftNumberField id="sel-h" label="세로" committed={f.h} validate={furnitureSizeError} onCommit={resizeH} />
      </div>
      <div className={s.row}>
        <DraftNumberField id="sel-x" label="위치 X (왼쪽 벽에서)" committed={f.x} validate={anyInt} onCommit={moveX} />
        <DraftNumberField id="sel-y" label="위치 Y (위쪽 벽에서)" committed={f.y} validate={anyInt} onCommit={moveY} />
      </div>
      <div className={s.row}>
        <button type="button" className="btn btn-utility" onClick={() => dispatch({ type: 'rotate', id: f.id })}>
          ↻ 90° 회전
        </button>
        <button type="button" className="btn btn-utility btn-danger" onClick={() => dispatch({ type: 'remove', id: f.id })}>
          삭제
        </button>
      </div>
      <p className="muted small">평면도에서 끌어 옮기거나, 가구를 선택한 뒤 화살표 키로 10cm씩(Shift: 1cm) 옮길 수 있어요.</p>
    </section>
  );
}

export function Layout() {
  const { state, dispatch, result } = useApp();
  const [sharing, setSharing] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const { room, furniture, selectedId } = state;
  const selected = furniture.find((f) => f.id === selectedId) ?? null;
  const full = furniture.length >= LIMITS.furnitureCountMax;

  const onSelect = useCallback((id: string | null) => dispatch({ type: 'select', id }), [dispatch]);
  const onMove = useCallback((id: string, x: number, y: number) => dispatch({ type: 'move', id, x, y }), [dispatch]);
  const onNudge = useCallback((id: string, dx: number, dy: number) => dispatch({ type: 'nudge', id, dx, dy }), [dispatch]);
  const onRemove = useCallback((id: string) => dispatch({ type: 'remove', id }), [dispatch]);

  return (
    <main className={s.main}>
      <div className={s.grid}>
        <aside className={s.left} aria-label="가구">
          <section className="card" aria-labelledby="add-title">
            <h2 id="add-title">가구 추가</h2>
            <div className={s.presets}>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className={`btn btn-utility ${s.preset}`}
                  disabled={full}
                  onClick={() => dispatch({ type: 'add', name: p.name, w: p.w, h: p.h })}
                >
                  <strong>{p.name}</strong>
                  <span className="muted small">
                    {p.w}×{p.h}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-link"
              aria-expanded={showCustom}
              aria-controls="custom-area"
              onClick={() => setShowCustom((v) => !v)}
            >
              + 직접 입력
            </button>
            <div id="custom-area" hidden={!showCustom}>
              {showCustom && <CustomForm disabled={full} />}
            </div>
            {full && <p className="muted small">가구는 {LIMITS.furnitureCountMax}개까지 놓을 수 있어요.</p>}
          </section>
          {selected ? (
            <SelectedCard key={selected.id} f={selected} />
          ) : (
            <p className={`card muted small ${s.hint}`}>가구를 누르면 여기서 치수를 바꾸고 회전·삭제할 수 있어요.</p>
          )}
        </aside>

        <section className={`card ${s.canvas}`} aria-labelledby="plan-title">
          <div className={s.canvasHead}>
            <h2 id="plan-title">
              방 {room.w}×{room.h}cm <span className="muted small">· 격자 1칸 {LIMITS.gridStep}cm</span>
            </h2>
            <Legend />
          </div>
          <div className={s.plan}>
            <FloorPlan
              room={room}
              furniture={furniture}
              result={result}
              selectedId={selectedId}
              interactive
              label="가구 배치 평면도. 가구를 선택하고 화살표 키로 옮길 수 있어요."
              onSelect={onSelect}
              onMove={onMove}
              onNudge={onNudge}
              onRemove={onRemove}
            />
          </div>
          <p className={s.free}>
            남은 바닥 면적 <strong data-testid="free-area">{formatPct(result?.freeAreaPct ?? 100)}%</strong>
          </p>
        </section>

        <aside className={s.right} aria-labelledby="verdict-title">
          <section className="card">
            <h2 id="verdict-title">판정 결과</h2>
            <div className={s.counts} aria-live="polite" data-testid="verdict-counts">
              <span className="badge badge-problem">● 문제 {result?.counts.problem ?? 0}</span>
              <span className="badge badge-warn">▲ 주의 {result?.counts.warn ?? 0}</span>
              <span className="badge badge-pass">✓ 통과 {result?.counts.pass ?? 0}</span>
            </div>
          </section>
          {furniture.length === 0 && <p className="card muted small">가구를 추가하면 판정 결과가 여기에 나와요.</p>}
          <ul className={s.cards}>
            {furniture.map((f) => {
              const v = result?.verdicts[f.id];
              if (!v) return null;
              return (
                <li key={f.id} className={`card ${s.verdict} ${f.id === selectedId ? s.active : ''}`} data-verdict={f.id}>
                  <button type="button" className={s.verdictHead} onClick={() => onSelect(f.id)}>
                    <h3>{f.name}</h3>
                    <Badge level={v.level} />
                  </button>
                  <ul className={s.reasons}>
                    {v.reasons.map((r, i) => (
                      <li key={i} className={s[r.level]}>
                        <p>{r.message}</p>
                        {r.fix && <p className="muted small">{r.fix}</p>}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <div className={s.footer}>
        <button type="button" className="btn btn-secondary" onClick={() => dispatch({ type: 'goto', screen: 'setup' })}>
          방 설정 수정
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setSharing(true)}>
          배치도 저장·공유
        </button>
      </div>

      {sharing && result && <ShareDialog result={result} onClose={() => setSharing(false)} />}
    </main>
  );
}
