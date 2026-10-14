/** Trailing debounce as a small object: `call` (re)starts the timer, `flush` runs a pending call now, `cancel` drops it. */
export function createTrailing(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  return {
    call() { cancel(); timer = setTimeout(() => { timer = null; fn(); }, ms); },
    flush() { if (timer !== null) { cancel(); fn(); } },
    cancel,
  };
}
