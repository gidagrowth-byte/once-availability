import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        leaf: "#2f7d5a",
        mist: "#f3f7f4",
        line: "#06c755",
      },
      boxShadow: {
        soft: "0 14px 40px rgba(24, 33, 47, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
