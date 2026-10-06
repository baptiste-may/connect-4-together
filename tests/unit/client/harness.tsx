import { type ContextType, type ReactElement } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { jest } from "@jest/globals";
import ThemeProvider from "@/components/providers/ThemeProvider";
import ToastProvider from "@/components/providers/ToastProvider";
import { GameContext } from "@/components/Game";
import type { GameRoom } from "@/libs/room";

/**
 * Renders a UI inside the providers the root layout mounts
 * (`ThemeProvider` wrapping `ToastProvider`).
 * @param ui The element to render.
 * @returns The RTL render result.
 */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  );
}

/**
 * Builds the minimal fake Colyseus room client-side tests need.
 * @param overrides Fields overriding the defaults.
 * @returns The fake room cast to `GameRoom`.
 */
export function makeFakeRoom(
  overrides: Record<string, unknown> = {},
): GameRoom {
  return {
    roomId: "TEST01",
    reconnectionToken: "test-token",
    leave: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    removeAllListeners: jest.fn(),
    ...overrides,
  } as unknown as GameRoom;
}

/**
 * Replaces `global.fetch` with a bare jest mock; each test wires the
 * responses itself with `mockResolvedValue` / `mockRejectedValue`.
 * @returns The installed fetch mock.
 */
export function installFetchMock() {
  const fetchMock =
    jest.fn<(input: string, init?: RequestInit) => Promise<unknown>>();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/**
 * Wraps a JSON payload in a minimal successful `fetch` response.
 * @param body The payload returned by `res.json()`.
 * @returns A response-like object.
 */
export function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

/**
 * The value type of the `GameContext` the game sub-components read from.
 */
export type GameData = NonNullable<ContextType<typeof GameContext>>;

/**
 * Builds a `GameContext` value so game sub-components can be rendered in
 * isolation, without a live Colyseus room.
 * @param overrides Fields overriding the defaults.
 * @returns The context value plus the `room.send` and `onLeaveRoom` spies.
 */
export function makeGameData(overrides: Partial<GameData> = {}) {
  const send = jest.fn();
  const onLeaveRoom = jest.fn();
  const playerNames: Record<string, string> = overrides.playerNames ?? {};
  const room = {
    roomId: "ROOM01",
    sessionId: "s1",
    name: "Normal",
    send,
    leave: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    removeAllListeners: jest.fn(),
  } as unknown as GameRoom;
  const data: GameData = {
    room,
    host: "s1",
    playerNames,
    onLeaveRoom,
    getName: (id: string) => playerNames[id] ?? "Joueur " + id,
    spectators: new Set<string>(),
    players: ["", "", "", ""],
    chatMessages: [],
    turn: 0,
    winner: "",
    yourColor: -1,
    isYourTurn: false,
    nbPlayers: 0,
    isAPlayer: false,
    votedForSkip: new Set<string>(),
    isPrivate: true,
    grid: Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => -1)),
    ...overrides,
  };
  return { data, send, onLeaveRoom };
}

/**
 * Renders UI inside the `GameContext` provider game sub-components read from.
 * @param data The context value from `makeGameData`.
 * @param ui The element to render.
 * @returns The RTL render result.
 */
export function renderWithGame(data: GameData, ui: ReactElement): RenderResult {
  return render(<GameContext.Provider value={data}>{ui}</GameContext.Provider>);
}
