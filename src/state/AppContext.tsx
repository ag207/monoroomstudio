import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Evaluation } from '../domain/types';
import { evaluate } from '../rules/evaluate';
import { encodeState } from '../share/link';
import { initState, isRoomValid, reducer, type Action, type State } from './reducer';

interface Ctx {
  state: State;
  dispatch: Dispatch<Action>;
  /** 방 설정이 유효할 때만 계산된다 */
  result: Evaluation | null;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, window.location.hash, initState);

  // 모든 변경은 reducer를 지나므로, 방·가구가 바뀔 때마다 판정을 다시 계산한다 (F-205).
  const result = useMemo(
    () => (isRoomValid(state.room) ? evaluate(state.room, state.furniture) : null),
    [state.room, state.furniture],
  );

  // 화면 2의 현재 배치를 주소 해시에 반영한다 (새로고침해도 유지). 잘못된 링크는 지운다.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const hash = state.screen === 'layout' ? '#' + encodeState(state.room, state.furniture) : '';
      if (hash === window.location.hash) return;
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search + hash);
      } catch {
        /* 일부 브라우저는 history 호출 횟수를 제한한다 */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [state.screen, state.room, state.furniture]);

  const value = useMemo(() => ({ state, dispatch, result }), [state, result]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
