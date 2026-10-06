import type { ComponentType } from "react";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import Page from "@/app/page";
import {
  installFetchMock,
  jsonResponse,
  makeFakeRoom,
  renderWithProviders,
} from "./harness";

jest.mock("@colyseus/sdk", () => {
  const client = {
    create: jest.fn(),
    joinOrCreate: jest.fn(),
    joinById: jest.fn(),
    reconnect: jest.fn(),
  };
  return {
    __esModule: true,
    Client: jest.fn(() => client),
    __client: client,
  };
});

jest.mock("next/dynamic", () => {
  const { createElement, useEffect, useState } =
    jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: (loader: () => Promise<unknown>) => {
      function DynamicStub(props: Record<string, unknown>) {
        const [Loaded, setLoaded] = useState<unknown>(null);
        // Lazy state captures the factory's loader without making it an
        // outer-scope effect dependency.
        const [pending] = useState<Promise<unknown>>(loader);
        useEffect(() => {
          let cancelled = false;
          void pending.then((mod) => {
            if (!cancelled) {
              setLoaded(() => (mod as { default: unknown }).default);
            }
          });
          return () => {
            cancelled = true;
          };
        }, [pending]);
        if (Loaded === null) return null;
        return createElement(
          Loaded as ComponentType<Record<string, unknown>>,
          props,
        );
      }
      return DynamicStub;
    },
  };
});

jest.mock("@/components/Game", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: function GameStub({
      onLeaveRoom,
    }: {
      onLeaveRoom: (intentional: boolean) => void;
    }) {
      return createElement(
        "div",
        { "data-testid": "game" },
        createElement(
          "button",
          { onClick: () => onLeaveRoom(true) },
          "Quitter volontairement",
        ),
        createElement(
          "button",
          { onClick: () => onLeaveRoom(false) },
          "Déconnexion subie",
        ),
      );
    },
  };
});

jest.mock("@next/third-parties/google", () => ({
  __esModule: true,
  GoogleAnalytics: function GoogleAnalytics() {
    return null;
  },
}));

type ClientMock = {
  create: jest.Mock<
    (name: string, options: Record<string, unknown>) => Promise<unknown>
  >;
  joinOrCreate: jest.Mock<
    (name: string, options: Record<string, unknown>) => Promise<unknown>
  >;
  joinById: jest.Mock<
    (roomId: string, options: Record<string, unknown>) => Promise<unknown>
  >;
  reconnect: jest.Mock<(token: string) => Promise<unknown>>;
};

/**
 * Returns the fake Colyseus client shared by the `@colyseus/sdk` mock.
 * @returns The mock's client object.
 */
function sdkMock(): ClientMock {
  return (jest.requireMock("@colyseus/sdk") as { __client: ClientMock })
    .__client;
}

/**
 * Lets promise chains and React effects settle: every `await` below drains the
 * whole microtask queue, and three rounds cover probe → room promise →
 * dynamic import of the game.
 * @returns Resolves once the page has caught up.
 */
async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
}

/**
 * Builds a public-room entry the way `GET /api/rooms` returns it.
 * @param roomId Room identifier.
 * @param host Display name of the room host.
 * @returns A `RoomAvailable`-shaped payload.
 */
function listing(roomId: string, host: string) {
  return {
    roomId,
    name: "Normal",
    clients: 1,
    maxClients: 8,
    metadata: { host },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const client = sdkMock();
  client.create.mockReset().mockResolvedValue(makeFakeRoom());
  client.joinOrCreate.mockReset().mockResolvedValue(makeFakeRoom());
  client.joinById.mockReset().mockResolvedValue(makeFakeRoom());
  client.reconnect.mockReset().mockResolvedValue(makeFakeRoom());
  localStorage.clear();
  localStorage.setItem("name", "Alice");
});

describe("Page", () => {
  it("should list the rooms returned by the probe when the lobby loads", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse([listing("ROOM01", "Bob")]));

    renderWithProviders(<Page />);
    await settle();

    expect(fetchMock).toHaveBeenCalledWith("/api/rooms");
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
  });

  it("should refresh the room list when the refresh button is clicked", async () => {
    const fetchMock = installFetchMock();
    fetchMock
      .mockResolvedValueOnce(jsonResponse([listing("ROOM01", "Bob")]))
      .mockResolvedValueOnce(jsonResponse([listing("ROOM02", "Zoe")]));
    const { container } = renderWithProviders(<Page />);
    await settle();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    const refresh = container
      .querySelector(".lucide-list-restart")
      ?.closest("button");
    expect(refresh).not.toBeNull();
    fireEvent.click(refresh!);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Zoe")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("should create a private room when the create button is clicked", async () => {
    installFetchMock().mockResolvedValue(jsonResponse([]));

    renderWithProviders(<Page />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "Créer une partie" }));
    await settle();

    expect(sdkMock().create).toHaveBeenCalledWith("Normal", {
      name: "Alice",
      isPrivate: true,
    });
    expect(screen.getByTestId("game")).toBeInTheDocument();
    expect(localStorage.getItem("reconnectionToken")).toBe("test-token");
  });

  it("should join a random room when the random join button is clicked", async () => {
    installFetchMock().mockResolvedValue(jsonResponse([]));

    renderWithProviders(<Page />);
    await settle();

    fireEvent.click(
      screen.getByRole("button", { name: "Rejoindre une partie" }),
    );
    await settle();

    expect(sdkMock().joinOrCreate).toHaveBeenCalledWith("Normal", {
      name: "Alice",
    });
    expect(screen.getByTestId("game")).toBeInTheDocument();
  });

  it("should join the room when its list entry is clicked", async () => {
    installFetchMock().mockResolvedValue(
      jsonResponse([listing("ROOM01", "Bob")]),
    );

    renderWithProviders(<Page />);
    await settle();

    const row = screen.getByText("Bob").closest("tr")!;
    fireEvent.click(within(row).getByRole("button"));
    await settle();

    expect(sdkMock().joinById).toHaveBeenCalledWith("ROOM01", {
      name: "Alice",
    });
    expect(screen.getByTestId("game")).toBeInTheDocument();
  });

  it("should join the room when a valid code is submitted", async () => {
    installFetchMock().mockResolvedValue(jsonResponse([]));

    renderWithProviders(<Page />);
    await settle();

    const input = screen.getByPlaceholderText("XXXXXX");
    fireEvent.change(input, { target: { value: "ROOM77" } });
    fireEvent.submit(input.closest("form")!);
    await settle();

    expect(sdkMock().joinById).toHaveBeenCalledWith("ROOM77", {
      name: "Alice",
    });
    expect(screen.getByTestId("game")).toBeInTheDocument();
    expect(localStorage.getItem("reconnectionToken")).toBe("test-token");
  });

  it("should report an error when the submitted room code does not exist", async () => {
    installFetchMock().mockResolvedValue(jsonResponse([]));
    sdkMock().joinById.mockRejectedValueOnce(new Error("not found"));

    renderWithProviders(<Page />);
    await settle();

    const input = screen.getByPlaceholderText("XXXXXX");
    fireEvent.change(input, { target: { value: "NOPE12" } });
    fireEvent.submit(input.closest("form")!);
    await settle();

    expect(sdkMock().joinById).toHaveBeenCalledWith("NOPE12", {
      name: "Alice",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "La partie n'existe pas.",
    );
    expect(screen.queryByTestId("game")).not.toBeInTheDocument();
  });

  it("should reconnect to the room when a stored reconnection token is valid", async () => {
    localStorage.setItem("reconnectionToken", "stored-token");
    installFetchMock().mockResolvedValue(jsonResponse([]));

    renderWithProviders(<Page />);
    await settle();

    expect(sdkMock().reconnect).toHaveBeenCalledWith("stored-token");
    expect(screen.getByTestId("game")).toBeInTheDocument();
    expect(localStorage.getItem("reconnectionToken")).toBe("test-token");
  });

  it("should drop the stored token when it is no longer valid", async () => {
    localStorage.setItem("reconnectionToken", "stale-token");
    sdkMock().reconnect.mockRejectedValueOnce(new Error("expired"));
    installFetchMock().mockResolvedValue(jsonResponse([]));

    renderWithProviders(<Page />);
    await settle();

    expect(sdkMock().reconnect).toHaveBeenCalledWith("stale-token");
    expect(screen.queryByTestId("game")).not.toBeInTheDocument();
    expect(localStorage.getItem("reconnectionToken")).toBeNull();
  });

  it("should ignore a join submission while the probe is still loading", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithProviders(<Page />);
    fireEvent.submit(screen.getByPlaceholderText("XXXXXX").closest("form")!);
    await settle();

    expect(sdkMock().joinById).not.toHaveBeenCalled();
  });

  it("should ignore a refresh while the probe is still loading", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse([listing("ROOM01", "Bob")]));

    const { container } = renderWithProviders(<Page />);

    const refresh = container
      .querySelector(".lucide-list-restart")
      ?.closest("button");
    fireEvent.click(refresh!);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("should keep the current list when a refresh fails", async () => {
    const fetchMock = installFetchMock();
    fetchMock
      .mockResolvedValueOnce(jsonResponse([listing("ROOM01", "Bob")]))
      .mockResolvedValueOnce({ ok: false, status: 500 });
    const { container } = renderWithProviders(<Page />);
    await settle();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    const refresh = container
      .querySelector(".lucide-list-restart")
      ?.closest("button");
    fireEvent.click(refresh!);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("should report an error when creating a room fails", async () => {
    installFetchMock().mockResolvedValue(jsonResponse([]));
    sdkMock().create.mockReset().mockRejectedValue(new Error("boom"));

    renderWithProviders(<Page />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "Créer une partie" }));
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Une erreur est survenue",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(screen.queryByTestId("game")).not.toBeInTheDocument();
  });

  it("should report an error when joining a random room fails", async () => {
    installFetchMock().mockResolvedValue(jsonResponse([]));
    sdkMock().joinOrCreate.mockReset().mockRejectedValue(new Error("boom"));

    renderWithProviders(<Page />);
    await settle();

    fireEvent.click(
      screen.getByRole("button", { name: "Rejoindre une partie" }),
    );
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Une erreur est survenue",
    );
    expect(screen.queryByTestId("game")).not.toBeInTheDocument();
  });

  it("should return to the lobby when the game reports an intentional leave", async () => {
    installFetchMock().mockResolvedValue(jsonResponse([]));
    const room = makeFakeRoom();
    sdkMock().create.mockReset().mockResolvedValue(room);

    renderWithProviders(<Page />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Créer une partie" }));
    await settle();
    expect(screen.getByTestId("game")).toBeInTheDocument();
    expect(localStorage.getItem("reconnectionToken")).toBe("test-token");

    fireEvent.click(
      screen.getByRole("button", { name: "Quitter volontairement" }),
    );
    await settle();

    expect(room.removeAllListeners).toHaveBeenCalled();
    expect(room.leave).toHaveBeenCalled();
    expect(localStorage.getItem("reconnectionToken")).toBeNull();
    expect(screen.queryByTestId("game")).not.toBeInTheDocument();
    expect(screen.getByText("Connect 4 Together")).toBeInTheDocument();
  });

  it("should return to the lobby when the game reports an unintentional leave", async () => {
    installFetchMock().mockResolvedValue(jsonResponse([]));
    const room = makeFakeRoom();
    sdkMock().create.mockReset().mockResolvedValue(room);
    sdkMock().reconnect.mockReset().mockRejectedValue(new Error("gone"));

    renderWithProviders(<Page />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Créer une partie" }));
    await settle();
    expect(screen.getByTestId("game")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Déconnexion subie" }));
    await settle();

    expect(room.removeAllListeners).toHaveBeenCalled();
    expect(room.leave).not.toHaveBeenCalled();
    expect(screen.queryByTestId("game")).not.toBeInTheDocument();
    expect(screen.getByText("Connect 4 Together")).toBeInTheDocument();
  });
});
