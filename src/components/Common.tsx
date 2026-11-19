import type { Level } from '../domain/types';
import { LEVEL_LABEL, LEVEL_SYMBOL } from '../domain/text';
import type { Screen } from '../state/reducer';

export function Badge({ level }: { level: Level }) {
  return (
    <span className={`badge badge-${level}`}>
      <span aria-hidden="true">{LEVEL_SYMBOL[level]}</span>
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function Legend() {
  return (
    <ul className="legend" aria-label="범례">
      {(['problem', 'warn', 'pass'] as const).map((lv) => (
        <li key={lv}>
          <Badge level={lv} />
        </li>
      ))}
    </ul>
  );
}

export function Header({ screen }: { screen: Screen }) {
  const steps: [Screen, string][] = [
    ['setup', '방 설정'],
    ['layout', '가구 배치'],
  ];
  return (
    <header className="app-header">
      <h1>방 배치 체크</h1>
      <ol className="steps" aria-label="단계">
        {steps.map(([s, name], i) => (
          <li key={s} aria-current={s === screen ? 'step' : undefined}>
            <span className="step-num">{i + 1}</span>
            {name}
          </li>
        ))}
      </ol>
    </header>
  );
}
