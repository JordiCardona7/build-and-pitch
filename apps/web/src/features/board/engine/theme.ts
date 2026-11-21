/** SVG cannot consume Tailwind background classes. These are DESIGN.md tokens. */
export const COLORS = {
  negro: "#1F2430",
  azul: "#1D4ED8",
  rojo: "#D62828",
  verde: "#15803D",
  morado: "#7C3AED",
  naranja: "#EA7A12",
} as const;
export const BOARD_THEME = {
  board: "#FFFFFF",
  frame: "#C9CDD3",
  paper: "#FBF6EC",
  line: "#E4D9C6",
  sticky: "#FFE58A",
} as const;
export const color = (name: keyof typeof COLORS = "negro"): string =>
  COLORS[name] ?? COLORS.negro;
