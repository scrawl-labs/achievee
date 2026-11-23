import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** The one container for a group of content, lifted by a shadow. Inside it, at most one sunk layer (fields, chips, tiles). */
export function Surface({ className, flush, ...rest }: HTMLAttributes<HTMLElement> & { flush?: boolean }) {
  return <section className={cx("ac-surface", flush && "ac-surface--flush", className)} {...rest} />;
}
