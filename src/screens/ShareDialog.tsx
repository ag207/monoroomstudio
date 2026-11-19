import { useEffect, useRef, useState } from 'react';
import { FloorPlan } from '../components/FloorPlan';
import type { Evaluation } from '../domain/types';
import { formatPct } from '../domain/text';
import { useApp } from '../state/AppContext';
import { encodeState } from '../share/link';
import { downloadPng } from '../share/png';
import s from './ShareDialog.module.css';

export function ShareDialog({ result, onClose }: { result: Evaluation; onClose: () => void }) {
  const { state } = useApp();
  const { room, furniture } = state;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const url = `${window.location.origin}${window.location.pathname}#${encodeState(room, furniture)}`;

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  const save = async () => {
    if (!svgRef.current) return;
    setSaving(true);
    try {
      await downloadPng(svgRef.current);
      setStatus('PNG 이미지를 저장했어요.');
    } catch {
      setStatus('이미지를 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('링크를 복사했어요.');
    } catch {
      linkRef.current?.select();
      setStatus('자동 복사가 안 돼요. 선택된 링크를 직접 복사해 주세요 (Ctrl+C).');
    }
  };

  const { problem, warn } = result.counts;
  const summary =
    furniture.length === 0
      ? '아직 놓인 가구가 없어요'
      : problem + warn === 0
        ? '✓ 모든 가구가 통과했어요'
        : `● 문제 ${problem}개 · ▲ 주의 ${warn}개`;
  const summaryLevel = furniture.length === 0 ? '' : problem ? s.problem : warn ? s.warn : s.pass;

  return (
    <dialog ref={dialogRef} className={s.dialog} aria-labelledby="share-title" onClose={onClose}>
      <div className={s.head}>
        <div>
          <h2 id="share-title">배치도 저장·공유</h2>
          <p className="muted small">판정 결과가 표시된 배치도를 이미지로 저장하거나 링크로 보낼 수 있어요.</p>
        </div>
        <button type="button" className="btn-icon" aria-label="닫기" onClick={() => dialogRef.current?.close()}>
          ×
        </button>
      </div>
      <div className={s.body}>
        <div className={s.previewCol}>
          <div className={s.plan}>
            <FloorPlan
              svgRef={svgRef}
              room={room}
              furniture={furniture}
              result={result}
              showLegend
              label="저장할 배치도 미리보기"
            />
          </div>
          <p className="muted small">
            방 {room.w}×{room.h}cm · 남은 바닥 면적 {formatPct(result.freeAreaPct)}%
          </p>
        </div>
        <div className={s.side}>
          <p className={`${s.summary} ${summaryLevel}`} data-testid="share-summary">
            {summary}
          </p>
          {furniture.length > 0 && (
            <ul className={s.list} aria-label="가구 치수">
              {furniture.map((f) => (
                <li key={f.id}>
                  <span>{f.name}</span>
                  <span className="muted">
                    {f.w}×{f.h}cm
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            PNG 이미지로 저장
          </button>
          <div className="field">
            <label htmlFor="share-link">공유 링크</label>
            <div className={s.linkRow}>
              <input id="share-link" ref={linkRef} readOnly value={url} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn btn-utility" onClick={copy}>
                링크 복사
              </button>
            </div>
          </div>
          <p className="muted small">로그인 없이 링크 안에 방과 배치가 담겨 있어요. 링크를 연 사람은 이어서 수정할 수 있어요.</p>
          <p className={s.status} role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </dialog>
  );
}
