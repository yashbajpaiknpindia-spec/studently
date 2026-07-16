import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#120F1F",
        surface: "#F8F7FD",
        brand: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          400: "#7C3AED",
          500: "#4F46E5",
          600: "#4338CA",
          700: "#3B2E8C",
        },
        blue: {
          600: "#2563EB",
        },
        gold: {
          500: "#F0A93A",
          600: "#E8871A",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg,#4F46E5 0%,#7C3AED 55%,#2563EB 100%)",
        "brand-dark": "linear-gradient(120deg,#120F1F 0%,#241B4E 45%,#1E2A6E 100%)",
      },
      keyframes: {
        floatSlow: {
          "0%,100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(3deg)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(18,183,106,0.35)" },
          "100%": { boxShadow: "0 0 0 8px rgba(18,183,106,0)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        floatSlow: "floatSlow 7s ease-in-out infinite",
        pulseRing: "pulseRing 1.6s ease-out infinite",
        fadeUp: "fadeUp 0.7s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 1.4s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
