import clsx from "clsx";
import { motion } from "framer-motion";
import type { LightStatus } from "@/shared/api";

const statusColor: Record<LightStatus, string> = {
  rojo: "bg-light-red/15 text-marker-red ring-light-red/30",
  amarillo: "bg-light-yellow/25 text-ink ring-light-yellow/40",
  verde: "bg-light-green/20 text-marker-green ring-light-green/40",
  revisar: "bg-light-gray/25 text-ink-soft ring-light-gray/40",
};

type StatusChipProps = {
  name: string;
  status: LightStatus;
  onClick?: () => void;
  layoutId?: string;
};

export function StatusChip({ name, status, onClick, layoutId }: StatusChipProps) {
  return (
    <motion.button
      layout
      layoutId={layoutId}
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-pill px-3 py-1 text-sm font-medium ring-1 transition hover:brightness-95",
        statusColor[status],
      )}
    >
      {name}
    </motion.button>
  );
}
