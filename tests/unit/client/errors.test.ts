import { describe, expect, it } from "@jest/globals";
import { httpErrorMessage, thrownErrorMessage } from "@/libs/errors";
import { errorResponse } from "./harness";

describe("httpErrorMessage", () => {
  it("should return the error field of a JSON body", async () => {
    const res = errorResponse(500, { error: "Base de données indisponible" });

    await expect(httpErrorMessage(res)).resolves.toBe(
      "Base de données indisponible",
    );
  });

  it("should fall back to the message then the detail field", async () => {
    await expect(
      httpErrorMessage(errorResponse(500, { message: "Salle complète" })),
    ).resolves.toBe("Salle complète");

    await expect(
      httpErrorMessage(errorResponse(400, { detail: "Code invalide" })),
    ).resolves.toBe("Code invalide");
  });

  it("should collapse whitespace and truncate a long message", async () => {
    const res = errorResponse(500, { error: `  ${"x".repeat(400)}  ` });
    const message = await httpErrorMessage(res);

    expect(message).toHaveLength(160);
    expect(message!.endsWith("…")).toBe(true);
  });

  it("should read a plain-text body", async () => {
    const res = errorResponse(502, "Bad gateway\nretry later", "text/plain");

    await expect(httpErrorMessage(res)).resolves.toBe(
      "Bad gateway retry later",
    );
  });

  it("should ignore HTML bodies", async () => {
    const res = errorResponse(
      500,
      "<html><body><h1>Internal error</h1></body></html>",
      "text/html; charset=utf-8",
    );

    await expect(httpErrorMessage(res)).resolves.toBe("500");
  });

  it("should fall back to the status line without a content type", async () => {
    await expect(
      httpErrorMessage({ ok: false, status: 503 } as unknown as Response),
    ).resolves.toBe("503");

    await expect(
      httpErrorMessage({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      } as unknown as Response),
    ).resolves.toBe("503 Service Unavailable");
  });

  it("should fall back to the status line when the body cannot be read", async () => {
    const res = {
      ok: false,
      status: 500,
      headers: { get: () => "application/json" },
      json: async () => {
        throw new Error("not json");
      },
      text: async () => {
        throw new Error("not text");
      },
    } as unknown as Response;

    await expect(httpErrorMessage(res)).resolves.toBe("500");
  });
});

describe("thrownErrorMessage", () => {
  it("should return the message of a plain error", () => {
    expect(thrownErrorMessage(new Error("boom"))).toBe("boom");
    expect(thrownErrorMessage('room "ROOM01" is locked')).toBe(
      'room "ROOM01" is locked',
    );
  });

  it("should return the message of an object carrying one", () => {
    expect(thrownErrorMessage({ message: "salle introuvable" })).toBe(
      "salle introuvable",
    );
  });

  it("should collapse whitespace and truncate a long message", () => {
    const message = thrownErrorMessage(new Error(`line\n${"y".repeat(400)}`));

    expect(message).toHaveLength(160);
    expect(message!.endsWith("…")).toBe(true);
  });

  it("should drop transport failures and browser network noise", () => {
    expect(
      thrownErrorMessage(new TypeError("Failed to fetch")),
    ).toBeUndefined();
    expect(thrownErrorMessage(new TypeError("Load failed"))).toBeUndefined();
    expect(thrownErrorMessage(new Error("Failed to fetch"))).toBeUndefined();
    expect(thrownErrorMessage(new Error("fetch failed"))).toBeUndefined();
    expect(
      thrownErrorMessage(
        new Error("NetworkError when attempting to fetch resource."),
      ),
    ).toBeUndefined();
  });

  it("should keep a TypeError that is not transport noise", () => {
    expect(thrownErrorMessage(new TypeError("room is not a function"))).toBe(
      "room is not a function",
    );
  });

  it("should drop values without a displayable message", () => {
    expect(thrownErrorMessage(undefined)).toBeUndefined();
    expect(thrownErrorMessage(null)).toBeUndefined();
    expect(thrownErrorMessage(42)).toBeUndefined();
    expect(thrownErrorMessage(new Error())).toBeUndefined();
    expect(thrownErrorMessage(new Error("   "))).toBeUndefined();
    expect(thrownErrorMessage({ message: 42 })).toBeUndefined();
    expect(thrownErrorMessage(new Error("<html>boom</html>"))).toBeUndefined();
  });
});
