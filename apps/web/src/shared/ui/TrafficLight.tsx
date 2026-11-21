import clsx from "clsx";

type TrafficLightProps = {
  counts: { rojo: number; amarillo: number; verde: number; revisar?: number };
  huge?: boolean;
  className?: string;
};

function Lamp({
  color,
  glow,
  count,
  label,
  huge,
}: {
  color: string;
  glow: string;
  count: number;
  label: string;
  huge?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={clsx(
          "rounded-full ring-2 ring-ink/10",
          color,
          glow,
          huge ? "h-16 w-16" : "h-10 w-10",
        )}
      />
      <p
        className={clsx(
          "font-display font-extrabold tabular-nums text-ink",
          huge ? "text-5xl md:text-semaforo" : "text-3xl",
        )}
      >
        {count}
      </p>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

export function TrafficLight({ counts, huge, className }: TrafficLightProps) {
  return (
    <div
      className={clsx(
        "flex flex-wrap items-end justify-center gap-8 rounded-card border border-line bg-paper-2/80 px-6 py-5 shadow-warm",
        className,
      )}
    >
      <Lamp
        color="bg-light-red"
        glow="shadow-[0_0_18px_rgba(239,68,68,0.45)]"
        count={counts.rojo}
        label="Rojo"
        huge={huge}
      />
      <Lamp
        color="bg-light-yellow"
        glow="shadow-[0_0_18px_rgba(245,183,0,0.45)]"
        count={counts.amarillo}
        label="Amarillo"
        huge={huge}
      />
      <Lamp
        color="bg-light-green"
        glow="shadow-[0_0_18px_rgba(34,197,94,0.45)]"
        count={counts.verde}
        label="Verde"
        huge={huge}
      />
      {typeof counts.revisar === "number" ? (
        <Lamp
          color="bg-light-gray"
          glow="shadow-none"
          count={counts.revisar}
          label="Revisar"
          huge={huge}
        />
      ) : null}
    </div>
  );
}
