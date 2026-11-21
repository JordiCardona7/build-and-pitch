import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-card border border-line bg-card p-5 shadow-warm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
