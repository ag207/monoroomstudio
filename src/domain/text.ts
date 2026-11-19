/** 받침 유무에 따라 '와/과'를 붙인다. 한글이 아니면 '와'. */
export function withWa(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) {
    return word + ((last - 0xac00) % 28 === 0 ? '와' : '과');
  }
  return word + '와';
}

/** 정수면 소수점 없이, 아니면 소수 첫째 자리까지 */
export function formatPct(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export const LEVEL_LABEL = { problem: '문제', warn: '주의', pass: '통과' } as const;
export const LEVEL_SYMBOL = { problem: '●', warn: '▲', pass: '✓' } as const;
