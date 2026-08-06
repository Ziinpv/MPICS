import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#ecf8f1",
          100: "#d1f0de",
          200: "#a8e0c2",
          300: "#72c99d",
          400: "#3fa975",
          500: "#1f8a58",
          600: "#146f47",
          700: "#0f5839",
          800: "#0d4630",
          900: "#0a3a28",
          950: "#052116",
        },
        accent: {
          50: "#fff8eb",
          100: "#ffefc6",
          200: "#ffdb88",
          300: "#ffc14a",
          400: "#ffa61f",
          500: "#f98507",
          600: "#dd6102",
          700: "#b74106",
          800: "#94320c",
          900: "#7a2a0d",
        },
        success: {
          DEFAULT: "#15803d",
          soft: "#dcfce7",
        },
        warning: {
          DEFAULT: "#d97706",
          soft: "#fef3c7",
        },
        danger: {
          DEFAULT: "#dc2626",
          soft: "#fee2e2",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(10, 58, 40, 0.04), 0 8px 24px rgba(10, 58, 40, 0.06)",
        "card-hover": "0 2px 4px rgba(10, 58, 40, 0.06), 0 12px 28px rgba(10, 58, 40, 0.1)",
        soft: "0 1px 3px rgba(15, 23, 42, 0.06)",
        focus: "0 0 0 3px rgba(31, 138, 88, 0.22)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
