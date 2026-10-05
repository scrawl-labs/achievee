export function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

/** 월간 칸처럼 좁은 곳용. 1만 원 이상은 '1.2만'. */
export function formatShortWon(n: number): string {
  if (n < 10000) return n.toLocaleString('ko-KR');
  return `${Math.round(n / 1000) / 10}만`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '10월 5일 (월)' */
export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}
