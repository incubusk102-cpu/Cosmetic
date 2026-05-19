import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm, premium, medical-adjacent palette
        ink: {
          DEFAULT: "#1A1A1F",
          soft: "#3A3A42",
          muted: "#6B6B74",
        },
        paper: {
          DEFAULT: "#FAF7F2",
          raised: "#FFFFFF",
        },
        slate: {
          950: "#0E0F12",
          900: "#15171B",
        },
        accent: {
          DEFAULT: "#5C7A6A", // muted sage
          ink: "#374E42",
        },
        verdict: {
          safe: "#2F7A4A",
          caution: "#B8861B",
          avoid: "#A8412E",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-plex-serif)", "Georgia", "serif"],
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20,20,25,0.04), 0 4px 12px rgba(20,20,25,0.04)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
