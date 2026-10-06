import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "@jest/globals";
import { useStoredValue, writeStoredValue } from "@/libs/storedValue";

beforeEach(() => {
  localStorage.clear();
});

describe("useStoredValue", () => {
  it("should fall back to the server value when nothing is stored", () => {
    const { result } = renderHook(() => useStoredValue("name", "fallback"));

    expect(result.current).toBe("fallback");
  });

  it("should return the stored value instead of the server value when one is stored", () => {
    localStorage.setItem("name", "Alice");
    const { result } = renderHook(() => useStoredValue("name", "fallback"));

    expect(result.current).toBe("Alice");
  });

  it("should re-render subscribers when the key is written", () => {
    const { result } = renderHook(() => useStoredValue("name", "fallback"));

    act(() => {
      writeStoredValue("name", "Bob");
    });

    expect(result.current).toBe("Bob");
    expect(localStorage.getItem("name")).toBe("Bob");
  });

  it("should keep keys isolated from each other when they are written independently", () => {
    const { result } = renderHook(() => ({
      name: useStoredValue("name", "fallback"),
      theme: useStoredValue("theme", "retro"),
    }));

    act(() => {
      writeStoredValue("name", "Bob");
    });

    expect(result.current.name).toBe("Bob");
    expect(result.current.theme).toBe("retro");
  });

  it("should stop notifying the hook when it unmounts", () => {
    const { result, unmount } = renderHook(() =>
      useStoredValue("name", "fallback"),
    );

    unmount();
    act(() => {
      writeStoredValue("name", "Bob");
    });

    expect(result.current).toBe("fallback");
  });

  it("should render the server value when rendered on the server", () => {
    function Probe() {
      return createElement("span", null, useStoredValue("name", "fallback"));
    }

    expect(renderToString(createElement(Probe))).toContain("fallback");
  });
});
