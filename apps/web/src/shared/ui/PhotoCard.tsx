import clsx from "clsx";
import type { ReactNode } from "react";
import { ScribbleLoader } from "./ScribbleLoader";

type PhotoCardProps = {
  imageUrl?: string;
  name?: string;
  statusLabel?: string;
  pending?: boolean;
  errorBox?: { x: number; y: number; w: number; h: number } | null;
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function PhotoCard({
  imageUrl,
  name,
  statusLabel,
  pending,
  errorBox,
  footer,
  className,
  onClick,
}: PhotoCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group relative w-full overflow-hidden rounded-card border border-line bg-card text-left shadow-warm",
        onClick && "cursor-pointer hover:-translate-y-0.5 transition",
        className,
      )}
    >
      <div className="absolute left-3 top-3 z-10 h-4 w-10 -rotate-6 rounded-sm bg-sticky-yellow/90 shadow" />
      <div className="absolute right-4 top-2 z-10 h-4 w-10 rotate-3 rounded-sm bg-sticky-pink/80 shadow" />

      <div className="relative aspect-[3/4] bg-paper-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name ? `Hoja de ${name}` : "Hoja del alumno"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-soft">
            Sin foto
          </div>
        )}

        {errorBox ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <ellipse
              cx={(errorBox.x + errorBox.w / 2) * 100}
              cy={(errorBox.y + errorBox.h / 2) * 100}
              rx={(errorBox.w / 2) * 100 * 1.15}
              ry={(errorBox.h / 2) * 100 * 1.25}
              fill="none"
              stroke="#D62828"
              strokeWidth="1.4"
              strokeDasharray="3 1.5"
              opacity="0.95"
            />
          </svg>
        ) : null}

        {pending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/70 backdrop-blur-[1px]">
            <ScribbleLoader label="Leyendo…" />
          </div>
        ) : null}
      </div>

      <div className="space-y-1 border-t border-line p-3">
        <p className="font-semibold text-ink">{name || "Sin nombre"}</p>
        {statusLabel ? (
          <p className="text-sm text-ink-soft">{statusLabel}</p>
        ) : null}
        {footer}
      </div>
    </button>
  );
}
