import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { markAnalyticsReady, useAnalytics } from "@/libs/analytics";

jest.mock("@/libs/static", () => ({
  __esModule: true,
  UMAMI_WEBSITE_ID: "test-website-id",
}));

/**
 * Installs a tracker that records every call through `track`.
 * @returns The `track` spy.
 */
function installTracker() {
  const track = jest.fn();
  window.umami = { track } as unknown as typeof window.umami;
  return track;
}

/**
 * Empties the module-level queue shared across tests by flushing any leftover
 * into a throwaway tracker, then removes the tracker again.
 * @returns Nothing.
 */
function drainQueue(): void {
  installTracker();
  markAnalyticsReady();
  delete window.umami;
}

beforeEach(() => {
  drainQueue();
});

describe("useAnalytics", () => {
  it("should queue events until the tracker is ready, then flush them when marked ready", () => {
    const { result } = renderHook(() => useAnalytics());

    act(() => result.current.event("view-change", { view: "lobby" }));

    const track = installTracker();
    expect(track).not.toHaveBeenCalled();

    act(() => markAnalyticsReady());
    expect(track).toHaveBeenCalledWith("view-change", { view: "lobby" });
  });

  it("should send an event immediately when the tracker is already loaded", () => {
    const track = installTracker();
    const { result } = renderHook(() => useAnalytics());

    act(() => result.current.event("create-room"));

    expect(track).toHaveBeenCalledWith("create-room");
  });

  it("should keep events queued while the tracker stays missing", () => {
    const { result } = renderHook(() => useAnalytics());

    act(() => result.current.event("game-won", { youWon: true }));
    act(() => markAnalyticsReady());

    const track = installTracker();
    expect(track).not.toHaveBeenCalled();
  });

  it("should flush a queued event without data using a single-argument track call", () => {
    const { result } = renderHook(() => useAnalytics());

    act(() => result.current.event("donation-click"));

    const track = installTracker();
    act(() => markAnalyticsReady());

    expect(track).toHaveBeenCalledWith("donation-click");
  });
});
