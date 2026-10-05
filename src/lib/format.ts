export function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

/** 월간 칸처럼 좁은 곳용. 1만 원 이상은 '1.2만'. */
export function formatShortWon(n: number): string {
  if (n < 10000) return n.toLocaleString('ko-KR');
  return `${Math.round(n / 1000) / 10}만`;
}
