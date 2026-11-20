// SVG 평면도에서 쓰는 색. PNG로 직렬화해도 남도록 CSS 변수 대신 값을 직접 넣는다.
// tokens.css의 같은 이름 변수와 값을 맞춘다.

export const VERDICT_COLORS = {
  problem: { fg: '#A11B1B', bg: '#FCE4E4' },
  warn: { fg: '#8A5A00', bg: '#FFF3D6' },
  pass: { fg: '#1E6B3A', bg: '#E3F3E8' },
} as const;

export const PLAN_COLORS = {
  ink: '#000000',
  muted: '#615d59',
  grid: '#e6e6e6',
  floor: '#ffffff',
  paper: '#f6f5f4',
  window: '#62aef0',
  windowFill: 'rgba(98, 174, 240, 0.12)',
  door: '#0075de',
  doorFill: 'rgba(0, 117, 222, 0.08)',
  openFill: 'rgba(97, 93, 89, 0.08)',
  openBlockedFill: 'rgba(161, 27, 27, 0.10)',
} as const;

export const FONT_STACK =
  '"Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
