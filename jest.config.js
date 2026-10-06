/** Shared settings for both unit projects (node + jsdom). */
const shared = {
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "<rootDir>/tests/integration/",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "json", "node"],
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      ...shared,
      displayName: "server",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/server/**/*.test.ts"],
    },
    {
      ...shared,
      displayName: "client",
      testEnvironment: "jsdom",
      // jsdom defaults to the "browser" condition, which makes `colyseus`
      // resolve to its ESM build; that build statically imports `ws`, whose
      // CJS named exports the Jest ESM loader cannot see.
      testEnvironmentOptions: { customExportConditions: [] },
      testMatch: ["<rootDir>/tests/unit/client/**/*.test.{ts,tsx}"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/jest-dom.ts"],
    },
  ],
};
