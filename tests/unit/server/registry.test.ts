import { afterEach, describe, expect, it } from "@jest/globals";
import { listRooms } from "@/server/rooms/registry";
import { createClient, createRoom, disposeRooms } from "./harness";

afterEach(async () => {
  await disposeRooms();
});

describe("registry (GET /api/rooms)", () => {
  it("should expose a freshly created room when it is public", async () => {
    const room = await createRoom();
    const listings = listRooms();
    const listing = listings.find((l) => l.roomId === room.roomId);

    expect(listing).toBeDefined();
    expect(listing?.name).toBe("Normal");
    expect(listing?.clients).toBe(0);
    expect(listing?.maxClients).toBe(8);
    expect(listing?.metadata.host).toBe("");
  });

  it("should advertise the host name when a client has joined", async () => {
    const room = await createRoom();
    await room.onJoin(createClient("HOST1"), { name: "Alice" });

    const listing = listRooms().find((l) => l.roomId === room.roomId);
    expect(listing?.metadata.host).toBe("Alice");
  });

  it("should count the connected clients when players come and go", async () => {
    const room = await createRoom();
    room.clients.push(createClient("ONE"), createClient("TWO"));

    const listing = listRooms().find((l) => l.roomId === room.roomId);
    expect(listing?.clients).toBe(2);
  });

  it("should hide the room when it is marked private", async () => {
    const room = await createRoom();
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(true);

    room.state.isPrivate = true;
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(false);

    room.state.isPrivate = false;
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(true);
  });

  it("should drop the room from the listing when it is disposed", async () => {
    const room = await createRoom();
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(true);

    await room.disconnect();
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(false);
  });
});
