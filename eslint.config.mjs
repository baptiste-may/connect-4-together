import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Reported by react-hooks v7 on pre-existing localStorage/derived-state
      // effects; kept as warnings until those effects are refactored.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
