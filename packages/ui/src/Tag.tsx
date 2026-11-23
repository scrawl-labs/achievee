import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** A word shown, not picked (emotion words on an entry). Use a Chip when it can be pressed. `count` shows ×n after it. */
export function Tag({ children, count, size = "md", className }: { children: ReactNode; count?: number; size?: "md" | "lg"; className?: string }) {
  return <span className={cx("ac-tag", size === "lg" && "ac-tag--lg", className)}>{children}{count != null && <em>×{count}</em>}</span>;
}

/** Tags on one wrapping line. */
export function TagRow({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx("ac-tags", className)} {...rest} />;
}
