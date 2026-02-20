import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0f172a",
        panel: "#111b2f",
        accent: "#2dd4bf",
        warning: "#f97316",
        danger: "#ef4444",
        success: "#22c55e"
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "Consolas", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,191,0.35), 0 0 30px rgba(45,212,191,0.25)",
        danger: "0 0 0 1px rgba(239,68,68,0.35), 0 0 24px rgba(239,68,68,0.3)"
      }
    }
  },
  plugins: []
};

export default config;
