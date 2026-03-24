import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        aria: {
          bg:     "#08080f",
          bg2:    "#0d0d1c",
          bg3:    "#12122a",
          teal:   "#7DF9C4",
          blue:   "#7DC4F9",
          yellow: "#F9E97D",
          red:    "#F97D7D",
          purple: "#B47DF9",
          orange: "#F9A87D",
          dim:    "#44445a",
          text:   "#d0d0f0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
