import clsx from "clsx";

type ProgressDotsProps = {
  total: number;
  current: number;
};

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2" aria-label={`Paso ${current + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={clsx(
            "h-2.5 w-2.5 rounded-full",
            i <= current ? "bg-marker-blue" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
