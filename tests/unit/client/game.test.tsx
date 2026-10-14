import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Decoder, Encoder } from "@colyseus/schema";
import { State } from "@/server/rooms/NormalRoom";
import { ChatMessage } from "@/server/utils/Chat";
import Game, { useGameData } from "@/components/Game";
import type { GameRoom } from "@/libs/room";

type GameContextValue = ReturnType<typeof useGameData>;

/**
 * Every `GameContext` value seen by the app, one entry per render. Captured
 * through a mocked `Info` component (rendered inside the provider) so tests
 * can detect in-place mutations of the previous `grid` — a bug React state
 * alone would hide.
 */
const mockContexts: GameContextValue[] = [];

jest.mock("@/components/game/Info", () => ({
  __esModule: true,
  default: function InfoProbe() {
    const { useGameData } =
      jest.requireActual<typeof import("@/components/Game")>(
        "@/components/Game",
      );
    mockContexts.push(useGameData());
    return null;
  },
}));

beforeEach(() => {
  mockContexts.length = 0;
});

/**
 * Builds a server-side state prefilled the way `NormalRoom.onCreate` does:
 * a 42-cell empty board and four empty player slots.
 * @returns A fresh room state ready to encode.
 */
function createState(): State {
  const state = new State();
  for (let i = 0; i < 42; i++) state.board.push(-1);
  for (let i = 0; i < 4; i++) state.players.push("");
  return state;
}

/**
 * Builds the minimal fake room `Game` relies on.
 * @param state The client-side state instance backing `room.state`.
 * @param decoder The decoder `Callbacks.get()` resolves the callbacks from.
 * @param send Spy capturing every `room.send(...)` call.
 * @param roomId The room id; allows changing the room on rerender.
 * @returns The room cast to `GameRoom`, the send spy and the collected
 *   `onLeave` callbacks (so tests can fire an unexpected leave).
 */
function makeRoom(
  state: State,
  decoder: Decoder,
  send = jest.fn(),
  roomId = "test-room",
) {
  const leaveCallbacks: Array<() => void> = [];
  const room = {
    roomId,
    sessionId: "client",
    name: "Normal",
    state,
    serializer: { decoder },
    onLeave: (callback: () => void) => {
      leaveCallbacks.push(callback);
      return { remove: () => {} };
    },
    send,
  } as unknown as GameRoom;
  return { room, send, leaveCallbacks };
}

/**
 * Builds a server/client state pair that mirrors a room already in sync: the
 * seed runs on the server side, then a full snapshot is decoded into a fresh
 * client state so collection callbacks replay their seeded entries on mount.
 * @param seed Mutates the server state before the snapshot is encoded.
 * @returns The server state, its encoder, the client decoder and the client
 *   state.
 */
function makeSyncedStates(seed?: (state: State) => void) {
  const server = createState();
  seed?.(server);
  const encoder = new Encoder(server);
  const fullSync = encoder.encodeAll({ offset: 0 });
  encoder.discardChanges();
  const client = new State();
  const decoder = new Decoder(client);
  decoder.decode(fullSync);
  return { server, encoder, decoder, client };
}

/**
 * Encodes every pending server mutation and decodes it into the client state,
 * firing the subscription callbacks in between.
 * @param encoder The encoder tracking the server state.
 * @param decoder The decoder feeding the client state.
 */
function syncPatch(encoder: Encoder, decoder: Decoder): void {
  const patch = encoder.encode({ offset: 0 });
  encoder.discardChanges();
  decoder.decode(patch);
}

/**
 * Reads the most recent context snapshot captured by the `Info` mock.
 * @returns The context value of the latest render.
 */
function lastContext(): GameContextValue {
  const context = mockContexts[mockContexts.length - 1];
  if (!context) throw new Error("Game never rendered.");
  return context;
}

/**
 * Finds the rendered board container (the 6×7 grid wrapper).
 * @param container The render container.
 * @returns The board element.
 */
function boardOf(container: HTMLElement): HTMLElement {
  const board = container.querySelector<HTMLElement>('[class*="grid-rows-6"]');
  if (!board) throw new Error("Board container not found.");
  return board;
}

describe("Game state synchronisation", () => {
  it("should seed players and grid when the room state is already synced", () => {
    const state = createState();
    state.board[35] = 0;
    state.players[0] = "s1";
    state.players[1] = "s2";
    const decoder = new Decoder(state);
    const { room } = makeRoom(state, decoder);

    const { container } = render(<Game room={room} onLeaveRoom={jest.fn()} />);

    // The effect seeds from `room.state` instead of waiting for a change
    // callback that will never replay the initial values.
    expect(lastContext().players).toEqual(["s1", "s2", "", ""]);
    expect(lastContext().grid[5][0]).toBe(0);
    expect(screen.getByText("Joueur s1")).toBeInTheDocument();
    expect(screen.getByText("Joueur s2")).toBeInTheDocument();
    expect(screen.getByText("0 / 2")).toBeInTheDocument();

    // Index 35 = row 5, column 0, player color 0 (`bg-red-600`).
    const cell = boardOf(container).children[35];
    expect(cell.querySelector(".bg-red-600")).not.toBeNull();
  });

  it("should apply a board patch without mutating the previous grid when the state changes", () => {
    const server = createState();
    const encoder = new Encoder(server);
    const fullSync = encoder.encodeAll({ offset: 0 });
    encoder.discardChanges();

    // Fresh client state: the effect runs before the first ROOM_STATE.
    const clientState = new State();
    const decoder = new Decoder(clientState);
    const { room } = makeRoom(clientState, decoder);

    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    // First ROOM_STATE arrives after the effect subscribed.
    act(() => {
      decoder.decode(fullSync);
    });
    const beforePatch = lastContext().grid;
    expect(beforePatch[5][1]).toBe(-1);

    // A server piece lands on index 36 = row 5, column 1.
    act(() => {
      server.board[36] = 1;
      const patch = encoder.encode({ offset: 0 });
      encoder.discardChanges();
      decoder.decode(patch);
    });

    const afterPatch = lastContext().grid;
    expect(afterPatch[5][1]).toBe(1);
    // The handler must copy the row: mutating it in place would rewrite the
    // previously rendered grid as well.
    expect(beforePatch[5][1]).toBe(-1);
    expect(mockContexts[0].grid[5][1]).toBe(-1);
  });

  it("should display the stored player name when the state already carries one at mount", () => {
    const { decoder, client } = makeSyncedStates((state) => {
      state.players[0] = "s1";
      state.playerNames.set("s1", "Alice");
    });
    const { room } = makeRoom(client, decoder);

    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Joueur s1")).not.toBeInTheDocument();
  });

  it("should rename the player when a playerNames patch arrives", () => {
    const { server, encoder, decoder, client } = makeSyncedStates((state) => {
      state.players[0] = "s1";
      state.playerNames.set("s1", "Alice");
    });
    const { room } = makeRoom(client, decoder);
    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    act(() => {
      server.playerNames.set("s1", "Alicia");
      syncPatch(encoder, decoder);
    });

    expect(screen.getByText("Alicia")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("should fall back to the generated name when the playerNames entry is removed", () => {
    const { server, encoder, decoder, client } = makeSyncedStates((state) => {
      state.players[0] = "s1";
      state.playerNames.set("s1", "Alice");
    });
    const { room } = makeRoom(client, decoder);
    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    act(() => {
      server.playerNames.delete("s1");
      syncPatch(encoder, decoder);
    });

    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Joueur s1")).toBeInTheDocument();
  });

  it("should list the seeded spectator when the state already carries one at mount", () => {
    const { decoder, client } = makeSyncedStates((state) => {
      state.spectators.add("spec1");
    });
    const { room } = makeRoom(client, decoder);

    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    expect(screen.getByText("Joueur spec1")).toBeInTheDocument();
  });

  it("should remove the spectator from the list when a spectators patch arrives", () => {
    const { server, encoder, decoder, client } = makeSyncedStates((state) => {
      state.spectators.add("spec1");
    });
    const { room } = makeRoom(client, decoder);
    render(<Game room={room} onLeaveRoom={jest.fn()} />);
    expect(screen.getByText("Joueur spec1")).toBeInTheDocument();

    act(() => {
      server.spectators.delete("spec1");
      syncPatch(encoder, decoder);
    });

    expect(screen.queryByText("Joueur spec1")).not.toBeInTheDocument();
  });

  it("should count the seeded skip vote when the state already carries it at mount", () => {
    const { decoder, client } = makeSyncedStates((state) => {
      state.players[0] = "s1";
      state.players[1] = "s2";
      state.votedForSkip.add("s1");
    });
    const { room } = makeRoom(client, decoder);

    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("should drop the skip vote when a votedForSkip patch arrives", () => {
    const { server, encoder, decoder, client } = makeSyncedStates((state) => {
      state.players[0] = "s1";
      state.players[1] = "s2";
      state.votedForSkip.add("s1");
    });
    const { room } = makeRoom(client, decoder);
    render(<Game room={room} onLeaveRoom={jest.fn()} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    act(() => {
      server.votedForSkip.delete("s1");
      syncPatch(encoder, decoder);
    });

    expect(screen.getByText("0 / 2")).toBeInTheDocument();
  });

  it("should show the seeded chat message when the state already carries one at mount", () => {
    const { decoder, client } = makeSyncedStates((state) => {
      state.chatMessages.push(new ChatMessage("bonjour", "s1"));
    });
    const { room } = makeRoom(client, decoder);

    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    expect(screen.getByText("bonjour")).toBeInTheDocument();
  });
});

describe("Game messages", () => {
  it("should send play-piece with the clicked column when a piece is played", () => {
    const state = createState();
    const decoder = new Decoder(state);
    const { room, send } = makeRoom(state, decoder);

    const { container } = render(<Game room={room} onLeaveRoom={jest.fn()} />);

    const board = boardOf(container);
    const overlay = board.lastElementChild as HTMLElement;
    fireEvent.click(overlay.children[3]);

    expect(send).toHaveBeenCalledWith("play-piece", 3);
  });

  it("should send join-color with the chosen slot when a color is picked", () => {
    const state = createState();
    const decoder = new Decoder(state);
    const { room, send } = makeRoom(state, decoder);

    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    const buttons = screen.getAllByRole("button", { name: "Rejoindre" });
    expect(buttons).toHaveLength(4);
    fireEvent.click(buttons[2]);

    expect(send).toHaveBeenCalledWith("join-color", 2);
  });

  it("should send vote-skip when the client occupies a seat", () => {
    const state = createState();
    state.players[0] = "client";
    const decoder = new Decoder(state);
    const { room, send } = makeRoom(state, decoder);

    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Voter pour Reset/ }));

    expect(send).toHaveBeenCalledWith("vote-skip");
  });

  it("should send set-lock with the toggled visibility when the host presses the lock", () => {
    const state = createState();
    state.host = "client";
    const decoder = new Decoder(state);
    const { room, send } = makeRoom(state, decoder);

    const { container } = render(<Game room={room} onLeaveRoom={jest.fn()} />);

    const lockButton = container.querySelector<HTMLElement>("h1 button");
    expect(lockButton).not.toBeNull();
    fireEvent.click(lockButton!);

    // `isPrivate` starts false on the state, so the toggle sends `true`.
    expect(send).toHaveBeenCalledWith("set-lock", true);
  });

  it("should send send-message with the typed text when the form is submitted", () => {
    const state = createState();
    const decoder = new Decoder(state);
    const { room, send } = makeRoom(state, decoder);

    render(<Game room={room} onLeaveRoom={jest.fn()} />);

    const input = screen.getByPlaceholderText("Type here");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.submit(input.closest("form")!);

    expect(send).toHaveBeenCalledWith("send-message", "hello");
  });

  it("should leave the room when the intentional leave callback runs", () => {
    const state = createState();
    const decoder = new Decoder(state);
    const { room } = makeRoom(state, decoder);
    const onLeaveRoom = jest.fn();

    render(<Game room={room} onLeaveRoom={onLeaveRoom} />);

    fireEvent.click(screen.getByRole("button", { name: "Quitter la partie" }));

    expect(onLeaveRoom).toHaveBeenCalledWith(true);
  });
});

describe("Game shell and lifecycle", () => {
  it("should clear the chat when the room changes", () => {
    const { decoder, client } = makeSyncedStates((state) => {
      state.chatMessages.push(new ChatMessage("bonjour", "s1"));
    });
    const { room } = makeRoom(client, decoder);
    const onLeaveRoom = jest.fn();
    const view = render(<Game room={room} onLeaveRoom={onLeaveRoom} />);
    expect(screen.getByText("bonjour")).toBeInTheDocument();

    const { decoder: otherDecoder, client: otherClient } = makeSyncedStates();
    const { room: otherRoom } = makeRoom(
      otherClient,
      otherDecoder,
      jest.fn(),
      "other-room",
    );

    view.rerender(<Game room={otherRoom} onLeaveRoom={onLeaveRoom} />);

    expect(screen.queryByText("bonjour")).not.toBeInTheDocument();
  });

  it("should notify the parent when the room disconnects unexpectedly", () => {
    const state = createState();
    const decoder = new Decoder(state);
    const { room, leaveCallbacks } = makeRoom(state, decoder);
    const onLeaveRoom = jest.fn();

    render(<Game room={room} onLeaveRoom={onLeaveRoom} />);

    expect(leaveCallbacks).toHaveLength(1);
    act(() => leaveCallbacks[0]());

    expect(onLeaveRoom).toHaveBeenCalledWith(false);
  });

  it("should close the drawer when the overlay is clicked", () => {
    const state = createState();
    const decoder = new Decoder(state);
    const { room } = makeRoom(state, decoder);

    const { container } = render(<Game room={room} onLeaveRoom={jest.fn()} />);

    const drawer = container.querySelector(".drawer");
    expect(drawer?.getAttribute("aria-expanded")).toBe("true");
    const overlay = container.querySelector("label.drawer-overlay");
    expect(overlay).not.toBeNull();

    fireEvent.click(overlay!);

    expect(drawer?.getAttribute("aria-expanded")).toBe("false");
  });

  it("should throw when a sub-component reads the game data outside the provider", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    function MissingProviderProbe() {
      useGameData();
      return null;
    }

    expect(() => render(<MissingProviderProbe />)).toThrow(
      "GameContext provider not found.",
    );
    errorSpy.mockRestore();
  });
});
