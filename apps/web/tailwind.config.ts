import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBF6EC",
        "paper-2": "#F3EBDD",
        card: "#FFFFFF",
        ink: "#1F2430",
        "ink-soft": "#5B6170",
        line: "#E4D9C6",
        board: "#FFFFFF",
        "board-frame": "#C9CDD3",
        "marker-blue": "#1D4ED8",
        "marker-red": "#D62828",
        "marker-green": "#15803D",
        "marker-purple": "#7C3AED",
        "marker-orange": "#EA7A12",
        "sticky-yellow": "#FFE58A",
        "sticky-pink": "#FFC9D6",
        "sticky-blue": "#C7E3FF",
        "light-red": "#EF4444",
        "light-yellow": "#F5B700",
        "light-green": "#22C55E",
        "light-gray": "#A8A29E",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        hand: ["Caveat", "cursive"],
      },
      fontSize: {
        "semaforo": ["4.5rem", { lineHeight: "1", fontWeight: "800" }],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
        sticky: "4px",
      },
      boxShadow: {
        warm: "0 1px 0 #E4D9C6, 0 8px 24px rgba(91,70,40,.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
