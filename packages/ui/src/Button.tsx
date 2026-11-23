import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "soft" | "ghost" | "quiet" | "danger";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary: the one main action of a Surface. soft (default): secondary. ghost: cancel. quiet: rare actions. danger: only in a Dialog. */
  variant?: ButtonVariant;
  size?: "md" | "sm";
};

/** Starts an action. The label says what happens: 저장, 삭제, 단어 고르기. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "soft", size = "md", className, type = "button", ...rest }, ref) {
  return <button ref={ref} type={type} className={cx("ac-btn", variant !== "soft" && `ac-btn--${variant}`, size === "sm" && "ac-btn--sm", className)} {...rest} />;
});

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: "md" | "sm" };

/** Looks like a Button but goes somewhere (another site, another page). Use a Button when it starts an action. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink({ variant = "soft", size = "md", className, ...rest }, ref) {
  return <a ref={ref} className={cx("ac-btn", variant !== "soft" && `ac-btn--${variant}`, size === "sm" && "ac-btn--sm", className)} {...rest} />;
});
