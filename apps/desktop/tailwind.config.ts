import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "warm-50": "#faf9f7",
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          900: "#4c1d95",
        },
        peach: {
          50: "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
        },
        mint: {
          50: "#ecfdf5",
          500: "#10b981",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        soft: "0 10px 40px -10px rgba(139, 92, 246, 0.08)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 0 3px rgba(0,0,0,0.02)",
        input: "0 8px 25px -5px rgba(139, 92, 246, 0.12)",
        floating: "0 10px 40px -10px rgba(139, 92, 246, 0.15)",
      },
    },
  },
  plugins: [],
} satisfies Config;
