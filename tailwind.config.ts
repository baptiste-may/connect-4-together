import type { Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "node_modules/daisyui/dist/**/*.js",
    "node_modules/react-daisyui/dist/**/*.js",
    "./mdx-components.tsx",
  ],
  theme: {},
  plugins: [daisyui],
  daisyui: {
    themes: ["retro", "dark", "light"],
  },
  blocklist: [
    // daisyUI's dist/base.js declares a top-level `*:hover` rule. Because that
    // file is part of `content`, Tailwind treats `*:hover` as a candidate class
    // and emits `.\*\:hover`, which it then nests into invalid selectors
    // (`.table > *tr:hover`). Next 16's CSS parser rejects the result, so this
    // candidate has to be blocked while the rest of daisyUI stays scanned.
    "*:hover",
  ],
  safelist: [
    "bg-red-600",
    "bg-yellow-400",
    "bg-green-600",
    "bg-cyan-400",
    "bg-red-600/75",
    "bg-yellow-400/75",
    "bg-green-600/75",
    "bg-cyan-400/75",
    "border-red-600",
    "border-yellow-400",
    "border-green-600",
    "border-cyan-400",
  ],
} satisfies Config;
