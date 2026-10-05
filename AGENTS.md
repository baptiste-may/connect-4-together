# AGENTS.md

## Stack & commands

Bun project (`bun.lock`, `packageManager: bun@1.4.2`) — use `bun` / `bunx`, not npm/pnpm.

```bash
bun run dev            # nodemon + tsx on src/main.ts (NOT `next dev`)
bun run start          # NODE_ENV=production tsx src/main.ts
bun run lint           # eslint .
bun run format:check   # prettier --check .
bun run build          # next build
bun run typecheck      # tsc --noEmit
```

- **There is no test suite and no test runner.** Verification is lint → format:check → build → typecheck, in that order (CI: `.github/workflows/ci.yml`). Do not add a test framework unless asked.
- **`build` must run before `typecheck`.** `next-env.d.ts` and `.next/types/**` are gitignored but listed in `tsconfig.json` `include`, so `typecheck` fails on a fresh clone or after a `git clean`.
- `dev` is derived from `NODE_ENV !== "production"`, so `bun run start` serves the prebuilt `.next`. Build before starting in production mode.
- Pre-commit hook runs `bunx lint-staged` (eslint --fix + prettier). Installed via `postinstall`; if deps were installed with `--ignore-scripts`, run `bun run postinstall` to restore hooks.
- `react-hooks/set-state-in-effect` is deliberately downgraded to `warn` in `eslint.config.mjs` (pre-existing effects). Don't remove that override; `lint` stays green with the warnings.

## Architecture

One process serves everything on `PORT` (default 3000) — `src/main.ts` is the only entrypoint:

- Next.js in-process (`next({ dev })`), request handler + `getUpgradeHandler` for HMR.
- Colyseus `WebSocketTransport({ noServer: true })` attached to the same HTTP server, with a filter rejecting `/_next/` paths so Next's HMR socket wins. New WS endpoints must not start with `/_next/`.
- Express routes in `main.ts`: `GET /api/rooms`, basic-auth `/admin` (Colyseus monitor), then a catch-all forwarding to Next. Register new routes **before** the catch-all.

Directory ownership:

| Path                                             | Role                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `src/server/server.ts`                           | Registers room type names (`"Normal"`) — add new room types here                                                |
| `src/server/rooms/NormalRoom.ts`                 | The `State` schema + all game rules and message handlers                                                        |
| `src/server/rooms/registry.ts`                   | In-memory public lobby listing behind `GET /api/rooms`                                                          |
| `src/app/page.tsx`                               | Entire lobby + game client, one `"use client"` component; `Game` is `dynamic(..., { ssr: false })`              |
| `src/app/{legal-notice,privacy-policy}/page.mdx` | MDX legal pages; element overrides live in root `mdx-components.tsx`                                            |
| `src/components/providers/*`                     | `useClient`, `useName`, `useTheme`, `useToast` contexts                                                         |
| `src/components/game/*`                          | Reads `useGameData()` from `GameContext` (defined in `components/Game.tsx`)                                     |
| `src/libs/room.ts`                               | Client room/state types — imports `State` from the server room file, so client and server share one schema type |

## Gotchas

- **Adding a `State` field requires three edits**: the `@type` field in `NormalRoom.ts`, a mirror in `Game.tsx` (`useState` + `Callbacks.get(room).listen/onAdd/onRemove/onChange`, with `true` for the initial fire), and a field on the `GameContext` value type. Miss any and the field syncs but never renders.
- `room.send("...")` and `onMessage("...")` are **untyped** string channels — rename one side and you break the other silently. Current set: `set-lock`, `send-message`, `join-color`, `play-piece`, `vote-skip`, `update-name`.
- `tsconfig.json` sets `experimentalDecorators: true` and `useDefineForClassFields: false` — required by `@colyseus/schema` decorators. Do not "modernize" them.
- Board and player counts are hardcoded in several places: `players` is prefilled with 4 empty strings, `newTurn()` cycles `% 4`, `maxClients = 8` (4 players + spectators), board is a flat row-major array of `7 * 6` (`x = index % 7` on the client), and `src/components/game/colors.ts` has exactly 4 colors. Changing any of these needs coordinated edits on both sides.
- `GET /api/rooms` doubles as the client's connection health probe (`ClientProvider` fetches it with a 5s timeout and retries with backoff). Its response must stay `RoomAvailable[]`; failures are what trigger the "Impossible de se connecter au serveur" toast.
- Tailwind **v3** config + daisyUI **v4** (not TW4/daisyUI 5). The `blocklist: ["*:hover"]` in `tailwind.config.ts` is a required workaround: daisyUI's dist is in `content`, and the resulting `.\*\:hover` selector is rejected by Next 16's CSS parser. Don't remove it.
- `.prettierrc` only registers `prettier-plugin-tailwindcss` — every other Prettier default applies (double quotes, semicolons, 80 cols). `bun run format` also reorders Tailwind classes.
- `.env` is gitignored and loaded by `dotenv/config` in `src/main.ts` only. `MONITOR_USER`/`MONITOR_PASSWORD` fall back to a random UUID **per boot**, so `/admin` credentials change on every restart unless set. `SITE_URL` falls back to `http://localhost:3000`; `NEXT_PUBLIC_GOOGLE_ANALYTICS_GA` is inlined at build time via `src/libs/static.ts`.
- `.devmode.json` is Colyseus `devMode` state (gitignored) — room-ID uniqueness uses a presence set keyed `$normal`. Safe to delete when dev state is confusing; never commit it.
- All user-facing strings are French.
- Code in `src/server` and `src/libs` documents every exported function with a JSDoc block including `@param`/`@returns`. Match that; component code is sparsely commented.
