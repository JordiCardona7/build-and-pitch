import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "md" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-50",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-base",
        variant === "primary" &&
          "bg-marker-blue text-white shadow-warm hover:brightness-110",
        variant === "secondary" &&
          "border border-ink/20 bg-card text-ink hover:bg-paper-2",
        variant === "ghost" && "text-ink-soft hover:bg-paper-2 hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
