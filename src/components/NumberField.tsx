import { useEffect, useState } from 'react';

interface Props {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  error?: string | null;
  placeholder?: string;
  /** 칸 아래 도움말 (오류가 없을 때) */
  hint?: string;
}

const parse = (s: string) => (s.trim() === '' ? NaN : Math.round(Number(s)));
const show = (n: number) => (Number.isNaN(n) ? '' : String(n));

/** 숫자 입력 칸. 오류는 칸 아래에 보여 주되, 빈칸 오류는 칸을 떠난 뒤에만 보인다. */
export function NumberField({ id, label, value, onChange, error, placeholder, hint }: Props) {
  const [touched, setTouched] = useState(false);
  const visible = error && (touched || !Number.isNaN(value));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          step={1}
          value={show(value)}
          placeholder={placeholder}
          aria-invalid={visible ? true : undefined}
          aria-describedby={visible ? `${id}-err` : hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(parse(e.target.value))}
          onBlur={() => setTouched(true)}
        />
        <span className="field-suffix">cm</span>
      </div>
      {visible ? (
        <p id={`${id}-err`} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="muted small">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * 이미 반영된 값(committed)을 고치는 숫자 칸. 입력 중 값은 따로 들고 있다가
 * 유효할 때만 onCommit 한다. 바깥에서 값이 바뀌면(회전 등) 입력 칸도 따라간다.
 */
export function DraftNumberField({
  id,
  label,
  committed,
  validate,
  onCommit,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  /** 빈칸(NaN)도 값으로 다룬다: 비워 둘 수 있는 칸은 validate가 NaN을 통과시키면 된다 */
  committed: number;
  validate: (n: number) => string | null;
  onCommit: (n: number) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState(committed);
  const [prev, setPrev] = useState(committed);
  // NaN !== NaN 이므로 Object.is 로 비교한다
  if (!Object.is(committed, prev)) {
    setPrev(committed);
    setDraft(committed);
  }
  const error = validate(draft);
  useEffect(() => {
    if (!error && !Object.is(draft, committed)) onCommit(draft);
  }, [draft, error, committed, onCommit]);
  return (
    <NumberField
      id={id}
      label={label}
      value={draft}
      onChange={setDraft}
      error={error}
      placeholder={placeholder}
      hint={hint}
    />
  );
}
