/** 0 = nothing done, 1..4 = completion ratio buckets (drives the pastel colour of badges and bars). */
export const levelOf = (done: number, total: number) => {
  if (!total || !done) return 0;
  const r = done / total;
  return r === 1 ? 4 : r >= 0.6 ? 3 : r >= 0.3 ? 2 : 1;
};
