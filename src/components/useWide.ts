"use client";
import { useEffect, useState } from "react";

/** True on screens wide enough for a side panel next to the time grid. Starts false (phone layout) until measured. */
export function useWide(minWidth = 1100) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(`(min-width: ${minWidth}px)`);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [minWidth]);
  return wide;
}
