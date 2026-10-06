import { afterEach, describe, expect, it } from "@jest/globals";
import { listRooms } from "@/server/rooms/registry";
import { createClient, createRoom, disposeRooms, sendMessage } from "./harness";

afterEach(async () => {
  await disposeRooms();
});

/**
 * Creates a room where A joined first (host) and B second, both without a
 * color so message handlers stay independent from game rules.
 * @returns The room plus its two clients.
 */
async function setupTwoClients() {
  const room = await createRoom();
  const a = createClient("A");
  const b = createClient("B");
  await room.onJoin(a, { name: "Alice" });
  await room.onJoin(b, { name: "Bob" });
  return { room, a, b };
}

describe("send-message", () => {
  it("should store the message with its author when a client sends one", async () => {
    const { room, a } = await setupTwoClients();

    await sendMessage(room, a, "send-message", "hello");

    expect(room.state.chatMessages).toHaveLength(1);
    expect(room.state.chatMessages[0].content).toBe("hello");
    expect(room.state.chatMessages[0].author).toBe("A");
  });

  it("should mask the profanity when the message contains a banned word", async () => {
    const { room, a } = await setupTwoClients();

    await sendMessage(room, a, "send-message", "putain de merde");

    const content = room.state.chatMessages[0].content;
    expect(content).not.toBe("putain de merde");
    expect(content).toContain("*");
  });

  it("should ignore the message when the payload is not a string", async () => {
    const { room, a } = await setupTwoClients();

    for (const payload of [42, null, undefined, { text: "hi" }]) {
      await sendMessage(room, a, "send-message", payload);
    }

    expect(room.state.chatMessages).toHaveLength(0);
  });
});

describe("update-name", () => {
  it("should store the trimmed name when the player submits a padded name", async () => {
    const { room, a } = await setupTwoClients();

    await sendMessage(room, a, "update-name", "  Bob  ");

    expect(room.state.playerNames.get("A")).toBe("Bob");
  });

  it("should fall back to a generated name when the submitted name is empty or invalid", async () => {
    const { room, a } = await setupTwoClients();

    await sendMessage(room, a, "update-name", "   ");
    expect(room.state.playerNames.get("A")).toBe("Joueur A");

    await sendMessage(room, a, "update-name", 42);
    expect(room.state.playerNames.get("A")).toBe("Joueur A");
  });

  it("should sync the advertised host name when the host renames", async () => {
    const { room, a } = await setupTwoClients();

    await sendMessage(room, a, "update-name", "Zoe");

    expect(room.metadata?.host).toBe("Zoe");
    expect(
      listRooms().find((l) => l.roomId === room.roomId)?.metadata.host,
    ).toBe("Zoe");
  });

  it("should leave the host name untouched when another client renames", async () => {
    const { room, b } = await setupTwoClients();

    await sendMessage(room, b, "update-name", "Zoe");

    expect(room.metadata?.host).toBe("Alice");
  });
});

describe("set-lock", () => {
  it("should toggle the private flag when the host requests it", async () => {
    const { room, a } = await setupTwoClients();

    await sendMessage(room, a, "set-lock", true);
    expect(room.state.isPrivate).toBe(true);
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(false);

    await sendMessage(room, a, "set-lock", false);
    expect(room.state.isPrivate).toBe(false);
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(true);
  });

  it("should ignore the lock when the client is not the host", async () => {
    const { room, b } = await setupTwoClients();

    await sendMessage(room, b, "set-lock", true);

    expect(room.state.isPrivate).toBe(false);
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(true);
  });

  it("should ignore the lock when the payload is not a boolean", async () => {
    const { room, a } = await setupTwoClients();

    for (const payload of ["yes", 1, null]) {
      await sendMessage(room, a, "set-lock", payload);
    }

    expect(room.state.isPrivate).toBe(false);
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(true);
  });
});
