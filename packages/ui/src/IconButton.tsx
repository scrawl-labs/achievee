import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Read by screen readers and shown as the tooltip. */
  label: string;
  icon: ReactNode;
  /** ghost (default): no fill until hovered, for row actions. soft: a sunk square, for "add" next to a section title. */
  variant?: "ghost" | "soft";
  size?: "md" | "sm";
};

/** A square button with an icon only: edit, delete, add, close. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, icon, variant = "ghost", size = "md", className, type = "button", title, ...rest }, ref) {
  return (
    <button ref={ref} type={type} aria-label={label} title={title ?? label} className={cx("ac-iconbtn", variant === "soft" && "ac-iconbtn--soft", size === "sm" && "ac-iconbtn--sm", className)} {...rest}>
      {icon}
    </button>
  );
});
