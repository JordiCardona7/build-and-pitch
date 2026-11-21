import type { InputStatus } from "./types";

const labels: Record<InputStatus, string> = {
  off: "Desactivado", loading: "Preparando…", active: "Activo", denied: "Sin permiso", unsupported: "No disponible", error: "Intenta otra vez",
};

export function InteractIndicators({ handStatus, micStatus }: { handStatus: InputStatus; micStatus: InputStatus }) {
  return <div className="flex flex-wrap gap-3 text-sm" aria-label="Formas de pausar la clase" aria-live="polite">
    {([{ icon: "🎥", label: "Levanta la mano si te pierdes", status: handStatus }, { icon: "🎙️", label: "Di «no entendí»", status: micStatus }] as const).map((item) =>
      <span key={item.icon} className="inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-ink-soft">
        <span aria-hidden="true">{item.icon}</span>{item.label}
        <span className={item.status === "active" ? "font-semibold text-marker-green" : "font-semibold text-ink-soft"}>{labels[item.status]}</span>
      </span>)}
  </div>;
}
