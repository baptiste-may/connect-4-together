import "@testing-library/jest-dom";
// Augments `expect` from `@jest/globals` (what the test files import) — the
// root entry only extends the legacy global `jest` namespace types.
import "@testing-library/jest-dom/jest-globals";
import { TextDecoder, TextEncoder } from "node:util";

// jsdom does not expose the encoding globals. Importing the room state pulls
// in `colyseus`, which loads express, which needs `TextDecoder` at import time.
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
