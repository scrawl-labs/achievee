import { forwardRef, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  /** md (default): in a form, next to a Field. sm: small settings in the footer (language, theme). */
  size?: "md" | "sm";
};

/** Picks one of a fixed set (category, weekday, unit). The same sunk layer and focus ring as a Field, with a chevron. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ size = "md", className, ...rest }, ref) {
  return <select ref={ref} className={cx("ac-select", size === "sm" && "ac-select--sm", className)} {...rest} />;
});
