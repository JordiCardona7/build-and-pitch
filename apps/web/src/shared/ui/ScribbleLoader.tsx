import { motion, useReducedMotion } from "framer-motion";

type ScribbleLoaderProps = {
  label?: string;
  className?: string;
};

export function ScribbleLoader({
  label = "Revisando…",
  className = "",
}: ScribbleLoaderProps) {
  const reduce = useReducedMotion();

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg viewBox="0 0 120 40" className="h-10 w-28" aria-hidden>
        <motion.path
          d="M8 28 C 24 8, 40 32, 56 16 S 88 30, 112 12"
          fill="none"
          stroke="#1D4ED8"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={
            reduce
              ? { pathLength: 1 }
              : { pathLength: [0, 1, 0.2, 1] }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.circle
          r="4"
          fill="#1D4ED8"
          animate={
            reduce
              ? { cx: 112, cy: 12 }
              : {
                  cx: [8, 56, 112, 56, 8],
                  cy: [28, 16, 12, 28, 28],
                }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </svg>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
