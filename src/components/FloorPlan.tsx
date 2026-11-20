import { useRef, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { LIMITS, OPEN_KIND_LABEL, WALL_LABEL } from '../domain/constants';
import type { Evaluation, Furniture, Room, Verdict, Wall } from '../domain/types';
import { frontLength, frontZone } from '../rules/geom';
import { formatPct, LEVEL_LABEL, LEVEL_SYMBOL } from '../domain/text';
import { FONT_STACK, PLAN_COLORS, VERDICT_COLORS } from '../styles/colors';

// 방 평면도. cm 좌표를 viewBox에 그대로 쓰므로 화면 크기에 맞춰 비율을 유지한 채 확대·축소된다.
// 화면 2 캔버스, 화면 1 미리보기, 저장 팝업, PNG가 모두 이 컴포넌트를 쓴다.

export interface FloorPlanProps {
  room: Pick<Room, 'w' | 'h'> & Partial<Pick<Room, 'door' | 'windows'>>;
  furniture?: Furniture[];
  result?: Evaluation | null;
  selectedId?: string | null;
  interactive?: boolean;
  /** 범례와 남은 바닥 면적을 그림 안에 넣는다 (팝업·PNG용) */
  showLegend?: boolean;
  svgRef?: Ref<SVGSVGElement>;
  label: string;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onNudge?: (id: string, dx: number, dy: number) => void;
  onRemove?: (id: string) => void;
  /** 주면 선택한 가구에 ↻ 회전 버튼이 생기고 R키로도 돈다 */
  onRotate?: (id: string) => void;
}

const NS = 'non-scaling-stroke' as const;
const snap = (v: number) => Math.round(v / LIMITS.dragSnap) * LIMITS.dragSnap;

function wallPoint(room: Pick<Room, 'w' | 'h'>, wall: Wall, t: number): [number, number] {
  switch (wall) {
    case 'top':
      return [t, 0];
    case 'bottom':
      return [t, room.h];
    case 'left':
      return [0, t];
    case 'right':
      return [room.w, t];
  }
}

const NORMAL: Record<Wall, [number, number]> = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] };

type Pt = [number, number];

/** 경첩 P를 중심으로 닫힌 끝 Q에서 방 안쪽(n)으로 반지름 r만큼 열리는 부채꼴. R은 열린 끝. */
function swing(P: Pt, Q: Pt, n: Pt, r: number): { path: string; R: Pt } {
  const R: Pt = [P[0] + n[0] * r, P[1] + n[1] * r];
  // y가 아래로 커지는 좌표에서 외적이 양수면 R→Q가 시계 방향
  const cross = (R[0] - P[0]) * (Q[1] - P[1]) - (R[1] - P[1]) * (Q[0] - P[0]);
  const sweep = cross > 0 ? 1 : 0;
  return { R, path: `M ${P[0]} ${P[1]} L ${R[0]} ${R[1]} A ${r} ${r} 0 0 ${sweep} ${Q[0]} ${Q[1]} Z` };
}

export function FloorPlan(props: FloorPlanProps) {
  const { room, furniture = [], result, selectedId, interactive = false, showLegend = false } = props;
  const fs = Math.max(10, Math.min(28, Math.max(room.w, room.h) * 0.035));
  const pad = fs * 3;
  const legendH = showLegend ? fs * 3 : 0;
  const localRef = useRef<SVGSVGElement | null>(null);
  const selected = furniture.find((f) => f.id === selectedId);

  const setRef = (el: SVGSVGElement | null) => {
    localRef.current = el;
    const r = props.svgRef;
    if (typeof r === 'function') r(el);
    else if (r) (r as { current: SVGSVGElement | null }).current = el;
  };

  const toCm = (e: PointerEvent) => {
    const ctm = localRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const gridX: number[] = [];
  for (let x = LIMITS.gridStep; x < room.w; x += LIMITS.gridStep) gridX.push(x);
  const gridY: number[] = [];
  for (let y = LIMITS.gridStep; y < room.h; y += LIMITS.gridStep) gridY.push(y);

  return (
    <svg
      ref={setRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-pad} ${-pad} ${room.w + pad * 2} ${room.h + pad * 2 + legendH}`}
      role="group"
      aria-label={props.label}
      fontFamily={FONT_STACK}
      style={{ width: '100%', height: 'auto', display: 'block', touchAction: interactive ? 'none' : undefined }}
      onPointerDown={(e) => {
        if (interactive && e.target === e.currentTarget) props.onSelect?.(null);
      }}
    >
      <rect x={-pad} y={-pad} width={room.w + pad * 2} height={room.h + pad * 2 + legendH} fill={PLAN_COLORS.paper} />
      <rect
        x={0}
        y={0}
        width={room.w}
        height={room.h}
        fill={PLAN_COLORS.floor}
        onPointerDown={() => interactive && props.onSelect?.(null)}
      />
      <g stroke={PLAN_COLORS.grid} strokeWidth={1} vectorEffect={NS} pointerEvents="none">
        {gridX.map((x) => (
          <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={room.h} vectorEffect={NS} />
        ))}
        {gridY.map((y) => (
          <line key={`gy${y}`} x1={0} y1={y} x2={room.w} y2={y} vectorEffect={NS} />
        ))}
      </g>

      {/* 치수 */}
      <g fill={PLAN_COLORS.muted} fontSize={fs} textAnchor="middle" pointerEvents="none">
        <text x={room.w / 2} y={-fs * 0.9}>
          {room.w}cm
        </text>
        <text x={-fs * 0.9} y={room.h / 2} transform={`rotate(-90 ${-fs * 0.9} ${room.h / 2})`}>
          {room.h}cm
        </text>
      </g>

      {/* 벽 */}
      <rect
        x={0}
        y={0}
        width={room.w}
        height={room.h}
        fill="none"
        stroke={PLAN_COLORS.ink}
        strokeWidth={3}
        vectorEffect={NS}
        pointerEvents="none"
      />

      {room.windows?.map((win) => {
        const [x1, y1] = wallPoint(room, win.wall, win.offset);
        const [x2, y2] = wallPoint(room, win.wall, win.offset + win.width);
        const n = NORMAL[win.wall];
        const mid = wallPoint(room, win.wall, win.offset + win.width / 2);
        const half = win.width / 2;
        return (
          <g key={win.id} pointerEvents="none" data-window-kind={win.kind}>
            {win.kind === 'casement' &&
              [swing([x1, y1], mid, n, half), swing([x2, y2], mid, n, half)].map((s, i) => (
                <g key={i}>
                  <path
                    d={s.path}
                    fill={PLAN_COLORS.windowFill}
                    stroke={PLAN_COLORS.window}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    vectorEffect={NS}
                  />
                </g>
              ))}
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PLAN_COLORS.window} strokeWidth={7} vectorEffect={NS} />
            {/* 미닫이는 두 짝이 겹친 모양(가운데 흰 선), 기타는 단색 선 */}
            {win.kind !== 'other' && (
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={2} vectorEffect={NS} />
            )}
          </g>
        );
      })}

      {room.door && <DoorMark room={room} door={room.door} />}

      {furniture.map((f) => (
        <FrontZone
          key={`open-${f.id}`}
          f={f}
          fs={fs}
          blocked={!!result?.verdicts[f.id]?.reasons.some((r) => r.rule === 'R7' && r.message.includes('공간'))}
        />
      ))}

      {furniture.map((f) => (
        <Block
          key={f.id}
          f={f}
          fs={fs}
          verdict={result?.verdicts[f.id]}
          selected={f.id === selectedId}
          interactive={interactive}
          toCm={toCm}
          onSelect={props.onSelect}
          onMove={props.onMove}
          onNudge={props.onNudge}
          onRemove={props.onRemove}
          onRotate={props.onRotate}
        />
      ))}

      {interactive && selected && (
        <SelectionButtons
          f={selected}
          fs={fs}
          bounds={{ x1: -pad, y1: -pad, x2: room.w + pad, y2: room.h + pad }}
          onRotate={props.onRotate}
          onRemove={props.onRemove}
        />
      )}

      {/* 통로 표시선은 가구 위에 그려 거리 글자가 가려지지 않게 한다 */}
      {result?.gaps.map((g, i) => {
        const mx = (g.x1 + g.x2) / 2;
        const my = (g.y1 + g.y2) / 2;
        const horizontal = g.y1 === g.y2;
        return (
          <g key={`gap${i}`} pointerEvents="none" data-gap={g.dist}>
            <line
              x1={g.x1}
              y1={g.y1}
              x2={g.x2}
              y2={g.y2}
              stroke={VERDICT_COLORS.warn.fg}
              strokeWidth={2}
              strokeDasharray="4 3"
              vectorEffect={NS}
            />
            <text
              x={horizontal ? mx : mx + fs * 0.4}
              y={horizontal ? my - fs * 0.4 : my + fs * 0.35}
              fontSize={fs * 0.8}
              fontWeight={700}
              textAnchor={horizontal ? 'middle' : 'start'}
              fill={VERDICT_COLORS.warn.fg}
              stroke="#fff"
              strokeWidth={fs * 0.25}
              paintOrder="stroke"
            >
              {g.dist}cm
            </text>
          </g>
        );
      })}

      {showLegend && result && (
        <g fontSize={fs * 0.85} pointerEvents="none">
          {(['problem', 'warn', 'pass'] as const).map((lv, i) => (
            <text key={lv} x={i * fs * 5} y={room.h + pad * 0.75} fill={VERDICT_COLORS[lv].fg} fontWeight={700}>
              {LEVEL_SYMBOL[lv]} {LEVEL_LABEL[lv]} {result.counts[lv]}
            </text>
          ))}
          <text x={room.w} y={room.h + pad * 0.75} textAnchor="end" fill={PLAN_COLORS.ink}>
            남은 바닥 {formatPct(result.freeAreaPct)}%
          </text>
          <text x={0} y={room.h + pad * 0.75 + fs * 1.3} fill={PLAN_COLORS.muted} fontSize={fs * 0.7}>
            격자 1칸 = {LIMITS.gridStep}cm · 파란 부채꼴 = 문 열림 범위 · 하늘색 = 창문(부채꼴은 여닫이)
          </text>
        </g>
      )}
    </svg>
  );
}

type Bounds = { x1: number; y1: number; x2: number; y2: number };

/**
 * 선택한 가구 모서리 바깥의 동그란 버튼 (↻ 회전, × 삭제).
 * 가구 블록과 형제 요소로 둬서, 누를 때 블록 끌기가 시작되지 않게 한다.
 * bounds(그림 영역) 안으로 위치를 맞춰, 가구가 방 밖에 있어도 버튼은 보이게 한다.
 */
function CornerButton({
  x,
  y,
  fs,
  bounds,
  color,
  glyph,
  label,
  tip,
  data,
  onActivate,
}: {
  x: number;
  y: number;
  fs: number;
  bounds: Bounds;
  color: string;
  glyph: string;
  label: string;
  tip: string;
  data: Record<string, string>;
  onActivate: () => void;
}) {
  const r = fs * 0.95;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const cx = clamp(x, bounds.x1 + r, bounds.x2 - r);
  const cy = clamp(y, bounds.y1 + r, bounds.y2 - r);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      {...data}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <title>{tip}</title>
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={2} vectorEffect={NS} />
      <text
        x={cx}
        y={cy + r * 0.38}
        fontSize={r * 1.15}
        fontWeight={700}
        textAnchor="middle"
        fill="#fff"
        pointerEvents="none"
      >
        {glyph}
      </text>
    </g>
  );
}

/** 선택한 가구 위쪽 가운데에 나란히 놓는 ×(삭제, 왼쪽)·↻(회전, 오른쪽) 버튼 */
function SelectionButtons({
  f,
  fs,
  bounds,
  onRotate,
  onRemove,
}: {
  f: Furniture;
  fs: number;
  bounds: Bounds;
  onRotate?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const r = fs * 0.95;
  const both = Boolean(onRemove && onRotate);
  const half = both ? r * 1.25 : 0; // 두 버튼 중심이 가운데에서 떨어진 거리 (사이 간격 약 0.5r)
  // 가운데를 그림 영역 안으로 맞춰, 가구가 가장자리에 있어도 두 버튼이 겹치거나 잘리지 않게 한다
  const mid = Math.min(Math.max(f.x + f.w / 2, bounds.x1 + r + half), bounds.x2 - r - half);
  const y = f.y - r * 1.4; // 가구 윗변 바로 위
  return (
    <>
      {onRemove && (
        <CornerButton
          x={mid - half}
          y={y}
          fs={fs}
          bounds={bounds}
          color={VERDICT_COLORS.problem.fg}
          glyph="×"
          label={`${f.name} 삭제`}
          tip="삭제 (Delete)"
          data={{ 'data-remove-handle': f.id }}
          onActivate={() => onRemove(f.id)}
        />
      )}
      {onRotate && (
        <CornerButton
          x={mid + half}
          y={y}
          fs={fs}
          bounds={bounds}
          color={PLAN_COLORS.door}
          glyph="↻"
          label={`${f.name} 90° 회전`}
          tip="90° 회전 (R)"
          data={{ 'data-rotate-handle': f.id }}
          onActivate={() => onRotate(f.id)}
        />
      )}
    </>
  );
}

/**
 * 가구 앞면의 문·서랍 열림 공간 (R7). 여닫이는 문짝이 도는 부채꼴, 서랍은 빠져나오는 직사각형.
 * 막혀 있으면 빨갛게 그린다.
 */
function FrontZone({ f, fs, blocked }: { f: Furniture; fs: number; blocked: boolean }) {
  const zone = frontZone(f);
  if (!zone || !f.open) return null;
  const { side, depth, kind } = f.open;
  const stroke = blocked ? VERDICT_COLORS.problem.fg : PLAN_COLORS.muted;
  const fill = blocked ? PLAN_COLORS.openBlockedFill : PLAN_COLORS.openFill;

  // 앞면 변의 두 끝(A→B)과 바깥쪽 방향 n
  const edges: Record<Wall, [Pt, Pt, Pt]> = {
    top: [[f.x, f.y], [f.x + f.w, f.y], [0, -1]],
    bottom: [[f.x, f.y + f.h], [f.x + f.w, f.y + f.h], [0, 1]],
    left: [[f.x, f.y], [f.x, f.y + f.h], [-1, 0]],
    right: [[f.x + f.w, f.y], [f.x + f.w, f.y + f.h], [1, 0]],
  };
  const [A, B, n] = edges[side];
  const len = frontLength(f, side);
  const along: Pt = [(B[0] - A[0]) / len, (B[1] - A[1]) / len];
  const toward = (P: Pt, dir: number, d: number): Pt => [P[0] + along[0] * dir * d, P[1] + along[1] * dir * d];

  let leaves: string[] = [];
  if (kind === 'swing') {
    if (depth * 2 <= len + 1) {
      // 두 짝: 양 끝 경첩에서 가운데 쪽으로
      leaves = [swing(A, toward(A, 1, depth), n, depth).path, swing(B, toward(B, -1, depth), n, depth).path];
    } else {
      const r = Math.min(depth, len);
      leaves = [swing(A, toward(A, 1, r), n, r).path];
    }
  }
  const tfs = Math.max(6, Math.min(fs * 0.7, depth / 2.2, (side === 'top' || side === 'bottom' ? f.w : f.h) / 4));

  return (
    <g pointerEvents="none" data-front-zone={f.id} data-blocked={blocked || undefined}>
      {kind === 'drawer' ? (
        <rect
          x={zone.x}
          y={zone.y}
          width={zone.w}
          height={zone.h}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect={NS}
        />
      ) : (
        leaves.map((d, i) => (
          <path key={i} d={d} fill={fill} stroke={stroke} strokeWidth={1} strokeDasharray="4 3" vectorEffect={NS} />
        ))
      )}
      <text
        x={zone.x + zone.w / 2}
        y={zone.y + zone.h / 2 + tfs * 0.35}
        fontSize={tfs}
        textAnchor="middle"
        fill={stroke}
      >
        {kind === 'drawer' ? '서랍' : '문'} {depth}
      </text>
    </g>
  );
}

function DoorMark({ room, door }: { room: Pick<Room, 'w' | 'h'>; door: Room['door'] }) {
  const start = wallPoint(room, door.wall, door.offset);
  const end = wallPoint(room, door.wall, door.offset + door.width);
  const [P, Q] = door.hinge === 'left' ? [start, end] : [end, start];
  const { path: arc, R } = swing(P, Q, NORMAL[door.wall], door.width);
  return (
    <g pointerEvents="none" data-door="">
      <line x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} stroke={PLAN_COLORS.floor} strokeWidth={5} vectorEffect={NS} />
      <path d={arc} fill={PLAN_COLORS.doorFill} stroke={PLAN_COLORS.door} strokeWidth={1} strokeDasharray="4 3" vectorEffect={NS} />
      <line x1={P[0]} y1={P[1]} x2={R[0]} y2={R[1]} stroke={PLAN_COLORS.door} strokeWidth={2.5} vectorEffect={NS} />
    </g>
  );
}

interface BlockProps {
  f: Furniture;
  fs: number;
  verdict?: Verdict;
  selected: boolean;
  interactive: boolean;
  toCm: (e: PointerEvent) => { x: number; y: number };
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onNudge?: (id: string, dx: number, dy: number) => void;
  onRemove?: (id: string) => void;
  onRotate?: (id: string) => void;
}

function Block(props: BlockProps) {
  const { f, fs, verdict, selected, interactive, toCm, onSelect, onMove, onNudge, onRemove, onRotate } = props;
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const level = verdict?.level ?? 'pass';
  const c = VERDICT_COLORS[level];
  const tfs = Math.max(6, Math.min(fs, f.w / 5, f.h / 2.6));
  const inflate = fs * 0.35;
  const openText = f.open ? `, ${OPEN_KIND_LABEL[f.open.kind]} 앞면 ${WALL_LABEL[f.open.side]}` : '';
  const label = `${f.name} ${f.w}×${f.h}cm${f.ht != null ? `, 높이 ${f.ht}cm` : ''}${openText}, 위치 ${f.x}, ${f.y}, 판정 ${LEVEL_LABEL[level]}`;

  const onPointerDown = (e: PointerEvent<SVGGElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCm(e);
    drag.current = { px: p.x, py: p.y, x: f.x, y: f.y };
    onSelect?.(f.id);
  };
  const onPointerMove = (e: PointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toCm(e);
    const nx = snap(d.x + p.x - d.px);
    const ny = snap(d.y + p.y - d.py);
    if (nx !== f.x || ny !== f.y) onMove?.(f.id, nx, ny);
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    const step = e.shiftKey ? 1 : 10;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (delta[e.key]) {
      e.preventDefault();
      onNudge?.(f.id, ...delta[e.key]);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onRemove?.(f.id);
    } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // e.code 로 보면 한글 입력 상태(ㄱ)에서도 R 자리 키로 돈다
      e.preventDefault();
      onRotate?.(f.id);
    } else if (e.key === 'Escape') {
      onSelect?.(null);
    }
  };

  return (
    <g
      data-furniture={f.id}
      data-level={level}
      {...(interactive
        ? {
            tabIndex: 0,
            role: 'button',
            'aria-label': label,
            'aria-pressed': selected,
            onPointerDown,
            onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onKeyDown,
            onFocus: () => onSelect?.(f.id),
            style: { cursor: 'grab', outline: 'none' },
          }
        : {})}
    >
      {selected && (
        <rect
          x={f.x - inflate}
          y={f.y - inflate}
          width={f.w + inflate * 2}
          height={f.h + inflate * 2}
          fill="none"
          stroke={PLAN_COLORS.ink}
          strokeWidth={2}
          vectorEffect={NS}
        />
      )}
      <rect
        x={f.x}
        y={f.y}
        width={f.w}
        height={f.h}
        fill={c.bg}
        fillOpacity={0.92}
        stroke={c.fg}
        strokeWidth={level === 'problem' ? 3 : 2}
        strokeDasharray={level === 'warn' ? '6 4' : undefined}
        vectorEffect={NS}
      />
      <g fill={c.fg} textAnchor="middle" pointerEvents="none" fontSize={tfs}>
        <text x={f.x + f.w / 2} y={f.y + f.h / 2 - tfs * 0.15} fontWeight={700}>
          {LEVEL_SYMBOL[level]} {f.name}
        </text>
        <text x={f.x + f.w / 2} y={f.y + f.h / 2 + tfs * 1.05} fontSize={tfs * 0.85}>
          {f.w}×{f.h}
        </text>
      </g>
    </g>
  );
}
