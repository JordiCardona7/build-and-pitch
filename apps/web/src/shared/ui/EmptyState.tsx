import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line bg-paper-2/50 px-6 py-12 text-center">
      <svg viewBox="0 0 80 60" className="h-14 w-20 text-marker-blue" aria-hidden>
        <path
          d="M8 42 C 20 18, 36 50, 50 24 S 70 40, 76 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="62" cy="14" r="4" fill="currentColor" />
      </svg>
      <div className="space-y-1">
        <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
        {description ? (
          <p className="max-w-sm text-sm text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
