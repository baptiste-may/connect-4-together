import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import ClientProvider, {
  useClient,
} from "@/components/providers/ClientProvider";
import NameProvider, { useName } from "@/components/providers/NameProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useToast } from "@/components/providers/ToastProvider";
import NameInput from "@/components/NameInput";
import { installFetchMock, jsonResponse, renderWithProviders } from "./harness";

/** Reports the connection state exposed by `ClientProvider`. */
function ClientProbe() {
  const { isLoading, client, rooms } = useClient();
  return (
    <>
      <span data-testid="status">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="client">{client === undefined ? "none" : "ok"}</span>
      <span data-testid="rooms">{rooms === undefined ? -1 : rooms.length}</span>
    </>
  );
}

/** Pushes a toast so tests can drive `ToastProvider`. */
function ToastTrigger() {
  const alert = useToast();
  return (
    <button
      type="button"
      onClick={() => alert({ title: "Titre du toast", status: "info" })}
    >
      Afficher un toast
    </button>
  );
}

/** Exposes the name held by `NameProvider` and its setter. */
function NameProbe() {
  const { name, setName } = useName();
  return (
    <>
      <span data-testid="name">{name}</span>
      <button type="button" onClick={() => setName("alice")}>
        Enregistrer
      </button>
    </>
  );
}

/** Exposes the theme held by `ThemeProvider` and its setter. */
function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme("dark")}>
        Thème sombre
      </button>
    </>
  );
}

/**
 * Drains the pending promise chain without touching timers, so a probe that
 * resolves immediately reaches its `setConnection` call.
 * @returns Resolves once the microtask queue has emptied.
 */
async function flushProbe(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

/**
 * Advances the fake clock by `ms`, draining microtasks around the jump so a
 * whole probe chain (`fetch` → `race` → `catch` → next retry) runs.
 * @param ms Milliseconds to advance.
 * @returns Resolves once timers and promises settled.
 */
async function advanceFake(ms: number): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
    await jest.advanceTimersByTimeAsync(ms);
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ToastProvider", () => {
  it("should render a toast when one is pushed through the context", () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByRole("button", { name: "Afficher un toast" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Titre du toast");
  });

  it("should close the toast when its close button is clicked", () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByRole("button", { name: "Afficher un toast" }));
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should dismiss the toast when five seconds have elapsed", async () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByRole("button", { name: "Afficher un toast" }));

    await advanceFake(4999);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await advanceFake(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("NameProvider", () => {
  it("should generate and store a name when none is stored", () => {
    renderWithProviders(
      <NameProvider>
        <NameProbe />
      </NameProvider>,
    );

    const stored = localStorage.getItem("name");
    expect(stored).not.toBeNull();
    expect(screen.getByTestId("name")).toHaveTextContent(stored!);
  });

  it("should keep the stored name when one already exists", () => {
    localStorage.setItem("name", "Alice");

    renderWithProviders(
      <NameProvider>
        <NameProbe />
      </NameProvider>,
    );

    expect(screen.getByTestId("name")).toHaveTextContent("Alice");
    expect(localStorage.getItem("name")).toBe("Alice");
  });

  it("should persist the capitalised name and confirm it when the name is submitted", () => {
    localStorage.setItem("name", "Bob");

    renderWithProviders(
      <NameProvider>
        <NameProbe />
      </NameProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(localStorage.getItem("name")).toBe("Alice");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Votre nom a été mis à jour !",
    );
  });
});

describe("NameInput", () => {
  it("should capitalise and persist the draft when the field loses focus", () => {
    localStorage.setItem("name", "alice");

    renderWithProviders(
      <NameProvider>
        <NameInput />
      </NameProvider>,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("alice");

    fireEvent.change(input, { target: { value: "bob" } });
    expect(input).toHaveValue("Bob");

    fireEvent.blur(input);

    expect(localStorage.getItem("name")).toBe("Bob");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Votre nom a été mis à jour !",
    );
  });

  it("should restore the stored name when the draft is cleared", () => {
    localStorage.setItem("name", "alice");

    renderWithProviders(
      <NameProvider>
        <NameInput />
      </NameProvider>,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(input).toHaveValue("alice");
    expect(localStorage.getItem("name")).toBe("alice");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ThemeProvider", () => {
  it("should default to the retro theme when no theme is stored", () => {
    renderWithProviders(<ThemeProbe />);

    expect(screen.getByTestId("theme")).toHaveTextContent("retro");
  });

  it("should persist the selected theme on the document when the theme changes", () => {
    renderWithProviders(<ThemeProbe />);

    fireEvent.click(screen.getByRole("button", { name: "Thème sombre" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});

describe("ClientProvider", () => {
  it("should become ready when the room probe answers", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          roomId: "ROOM01",
          name: "Normal",
          clients: 1,
          maxClients: 8,
          metadata: { host: "Bob" },
        },
      ]),
    );

    renderWithProviders(
      <ClientProvider>
        <ClientProbe />
      </ClientProvider>,
    );
    await flushProbe();

    expect(fetchMock).toHaveBeenCalledWith("/api/rooms");
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(screen.getByTestId("client")).toHaveTextContent("ok");
    expect(screen.getByTestId("rooms")).toHaveTextContent(/^1$/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should retry with a backoff and warn only once when the room probe fails", async () => {
    const fetchMock = installFetchMock();
    fetchMock
      .mockRejectedValueOnce(new Error("server down"))
      .mockRejectedValueOnce(new Error("server down"))
      .mockResolvedValueOnce(jsonResponse([]));

    renderWithProviders(
      <ClientProvider>
        <ClientProbe />
      </ClientProvider>,
    );

    await flushProbe();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("alert")).toHaveLength(1);

    await advanceFake(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await advanceFake(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole("alert")).toHaveLength(1);

    await advanceFake(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await advanceFake(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("should warn and retry when the room probe times out", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(
      <ClientProvider>
        <ClientProbe />
      </ClientProvider>,
    );

    await advanceFake(4999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await advanceFake(1);
    expect(screen.getAllByRole("alert")).toHaveLength(1);

    await advanceFake(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should warn and retry when the room probe answers a non-ok status", async () => {
    const fetchMock = installFetchMock();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(jsonResponse([]));

    renderWithProviders(
      <ClientProvider>
        <ClientProbe />
      </ClientProvider>,
    );

    await flushProbe();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("alert")).toHaveLength(1);

    await advanceFake(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
  });

  it("should ignore a probe that resolves after unmount", async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = installFetchMock();
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { unmount } = renderWithProviders(
      <ClientProvider>
        <ClientProbe />
      </ClientProvider>,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();

    await act(async () => {
      resolveFetch(jsonResponse([]));
      for (let i = 0; i < 8; i++) await Promise.resolve();
    });
    // Reaching here without a post-unmount state update is the assertion.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should ignore a probe that rejects after unmount", async () => {
    let rejectFetch!: (reason?: unknown) => void;
    const fetchMock = installFetchMock();
    fetchMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectFetch = reject;
        }),
    );

    const { unmount } = renderWithProviders(
      <ClientProvider>
        <ClientProbe />
      </ClientProvider>,
    );
    unmount();

    await act(async () => {
      rejectFetch(new Error("server down"));
      for (let i = 0; i < 8; i++) await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("provider guards", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("should throw when useClient is used outside ClientProvider", () => {
    expect(() => render(<ClientProbe />)).toThrow();
  });

  it("should throw when useName is used outside NameProvider", () => {
    expect(() => render(<NameProbe />)).toThrow();
  });

  it("should throw when useTheme is used outside ThemeProvider", () => {
    expect(() => render(<ThemeProbe />)).toThrow();
  });

  it("should throw when useToast is used outside ToastProvider", () => {
    expect(() => render(<ToastTrigger />)).toThrow();
  });
});
