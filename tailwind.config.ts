import type {Config} from "tailwindcss";
import daisyui from "daisyui";

export default {
    content: [
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "node_modules/daisyui/dist/**/*.js",
        "node_modules/react-daisyui/dist/**/*.js",
        "./mdx-components.tsx"
    ],
    theme: {},
    plugins: [
        daisyui
    ],
    daisyui: {
        themes: [
            "retro",
            "dark",
            "light"
        ]
    },
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
    ]
} satisfies Config;
