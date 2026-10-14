import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { markAnalyticsReady, useAnalytics } from "@/libs/analytics";

jest.mock("@/libs/static", () => ({
  __esModule: true,
  UMAMI_WEBSITE_ID: "",
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

beforeEach(() => {
  delete window.umami;
});

describe("useAnalytics when Umami is disabled", () => {
  it("should not track any event when no website ID is configured", () => {
    const track = installTracker();
    const { result } = renderHook(() => useAnalytics());

    act(() => result.current.event("create-room"));
    act(() => result.current.event("game-won", { youWon: false }));

    expect(track).not.toHaveBeenCalled();
  });

  it("should not throw when marked ready while disabled", () => {
    expect(() => act(() => markAnalyticsReady())).not.toThrow();
  });
});
