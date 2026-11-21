import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BoardElements } from "./engine/context";
import { BOARD_THEME, COLORS } from "./engine/theme";
import "./fonts.css";

export type BoardProps = {
  onReady?: (elements: BoardElements) => void | (() => void);
  asideVisible?: boolean;
  className?: string;
  label?: string;
};
export function Board({
  onReady,
  asideVisible = false,
  className = "",
  label = "Pizarra de fracciones",
}: BoardProps) {
  const svg = useRef<SVGSVGElement>(null);
  const defs = useRef<SVGDefsElement>(null);
  const main = useRef<SVGGElement>(null);
  const aside = useRef<SVGGElement>(null);
  const marker = useRef<SVGGElement>(null);
  const eraser = useRef<SVGGElement>(null);
  const id = useId().replace(/:/g, "");
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (
      svg.current &&
      defs.current &&
      main.current &&
      aside.current &&
      marker.current &&
      eraser.current
    ) {
      return onReady?.({
        svg: svg.current,
        defs: defs.current,
        main: main.current,
        aside: aside.current,
        marker: marker.current,
        eraser: eraser.current,
      });
    }
  }, [onReady]);
  return (
    <div className={`relative mx-auto w-full pb-5 ${className}`}>
      <div className="overflow-hidden rounded-xl border border-board-frame bg-gradient-to-b from-card via-board-frame to-card p-2 shadow-xl sm:p-3">
        <svg
          ref={svg}
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={label}
          className="block aspect-[5/3] w-full overflow-hidden rounded-md bg-board shadow-inner"
          data-testid="board"
        >
          <title>{label}</title>
          <defs ref={defs}>
            <clipPath id={`${id}-canvas`}>
              <rect width="1000" height="600" />
            </clipPath>
            <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor={BOARD_THEME.frame} />
              <stop offset=".35" stopColor={BOARD_THEME.board} />
              <stop offset="1" stopColor={BOARD_THEME.frame} />
            </linearGradient>
          </defs>
          <g clipPath={`url(#${id}-canvas)`}>
            <g ref={main} data-board-layer="main" />
            <motion.g
              initial={false}
              animate={
                asideVisible
                  ? { x: 0, y: 0, rotate: 0, opacity: 1 }
                  : { x: 1050, y: 15, rotate: 3, opacity: 0 }
              }
              transition={{
                duration: reducedMotion ? 0 : 0.28,
                ease: "easeOut",
              }}
              aria-hidden={!asideVisible}
              data-testid="aside-sheet"
            >
              <rect
                x="2"
                y="2"
                width="996"
                height="596"
                rx="5"
                fill={BOARD_THEME.sticky}
              />
              <path
                d="M950 0 H1000 V50 Z"
                fill={BOARD_THEME.paper}
                fillOpacity=".65"
              />
              <g ref={aside} data-board-layer="aside" />
            </motion.g>
            <g
              ref={eraser}
              visibility="hidden"
              aria-hidden="true"
              data-testid="board-eraser"
            >
              <rect
                x="-65"
                y="-56"
                width="130"
                height="112"
                rx="16"
                fill={COLORS.negro}
                opacity=".12"
                transform="translate(5 4)"
              />
              <rect
                x="-65"
                y="-56"
                width="130"
                height="112"
                rx="16"
                fill={BOARD_THEME.frame}
                stroke={COLORS.negro}
                strokeWidth="2"
              />
              <rect
                x="-55"
                y="-46"
                width="110"
                height="86"
                rx="10"
                fill={COLORS.azul}
              />
              <path
                d="M-35 -30 H35 M-35 -20 H35"
                stroke={BOARD_THEME.board}
                strokeWidth="3"
                opacity=".4"
              />
            </g>
            <g
              ref={marker}
              transform="translate(900 540) rotate(-38)"
              color={COLORS.azul}
              pointerEvents="none"
              aria-hidden="true"
              data-testid="board-marker"
            >
              <g opacity=".12" transform="translate(4 7)">
                <rect
                  x="10"
                  y="-12"
                  width="166"
                  height="24"
                  rx="8"
                  fill={COLORS.negro}
                />
              </g>
              <path d="M0 0 L14 -5 L18 5 Z" fill="currentColor" />
              <rect
                x="13"
                y="-8"
                width="22"
                height="16"
                rx="3"
                fill="currentColor"
              />
              <rect
                x="32"
                y="-12"
                width="120"
                height="24"
                rx="7"
                fill={`url(#${id}-body)`}
                stroke={BOARD_THEME.frame}
              />
              <rect
                x="60"
                y="-12"
                width="47"
                height="24"
                fill="currentColor"
                opacity=".85"
              />
              <path
                d="M68 -6 V6 M75 -6 V6 M82 -6 V6"
                stroke={BOARD_THEME.board}
                strokeWidth="2"
                opacity=".65"
              />
              <rect
                x="148"
                y="-12"
                width="30"
                height="24"
                rx="7"
                fill="currentColor"
              />
              <path
                d="M156 -6 H171"
                stroke={BOARD_THEME.board}
                strokeWidth="2"
                opacity=".5"
              />
            </g>
          </g>
        </svg>
      </div>
      <div
        aria-hidden="true"
        className="absolute bottom-1 left-1/2 flex h-6 w-2/5 -translate-x-1/2 items-center justify-center gap-3 rounded-b-lg border border-board-frame bg-gradient-to-b from-card to-board-frame shadow-md"
      >
        {["bg-marker-blue", "bg-marker-green", "bg-marker-purple"].map(
          (ink) => (
            <div
              key={ink}
              className="flex h-2.5 w-14 -rotate-3 overflow-hidden rounded-full border border-board-frame bg-card"
            >
              <span className={`ml-auto h-full w-4 ${ink}`} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
