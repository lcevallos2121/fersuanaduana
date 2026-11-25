import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        hud: ["var(--font-hud)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        cyan: { hud: "#38e1ff" },
        amber: { hud: "#ffb347" },
      },
    },
  },
  plugins: [],
};

export default config;
