import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["system-ui", "sans-serif"],
      },
      colors: {
        ink: "#1a1612",
        parchment: "#f5f0e8",
        gold: "#b8924a",
      },
    },
  },
  plugins: [],
};

export default config;
