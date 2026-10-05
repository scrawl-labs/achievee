import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 900px)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** 넓은 화면(PC)인지. 좁으면 사이드바를 숨기고 패널을 하단 시트로 연다. */
export function useIsWide(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches);
}
