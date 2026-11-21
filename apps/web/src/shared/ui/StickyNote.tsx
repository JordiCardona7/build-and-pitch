import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

type StickyColor = "yellow" | "pink" | "blue" | "gray";

const colorMap: Record<StickyColor, string> = {
  yellow: "bg-sticky-yellow",
  pink: "bg-sticky-pink",
  blue: "bg-sticky-blue",
  gray: "bg-light-gray/40",
};

type StickyNoteProps = HTMLAttributes<HTMLDivElement> & {
  color?: StickyColor;
  rotation?: number;
  title?: ReactNode;
};

export function StickyNote({
  color = "yellow",
  rotation = -1.5,
  title,
  className,
  children,
  style,
  ...props
}: StickyNoteProps) {
  return (
    <div
      className={clsx(
        "rounded-sticky p-4 shadow-warm",
        colorMap[color],
        className,
      )}
      style={{ transform: `rotate(${rotation}deg)`, ...style }}
      {...props}
    >
      {title ? (
        <h3 className="mb-3 font-hand text-xl font-bold text-ink">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}
