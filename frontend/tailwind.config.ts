import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F9F7F2",
        foreground: "#1A1A1A",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F3F1ED",
        },
        border: {
          DEFAULT: "#E5E7EB",
          focus: "#4F46E5",
        },
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#10B981",
          bg: "#D1FAE5",
        },
        muted: {
          DEFAULT: "#A4ACAF",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)"],
        sans: ["var(--font-inter)"],
        mono: ["var(--font-jetbrains)"],
      },
    },
  },
};

export default config;
