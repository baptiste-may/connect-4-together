"use client";

import { useCallback } from "react";
import type { UmamiEventData } from "next-umami";
import { UMAMI_WEBSITE_ID } from "@/libs/static";

type QueuedEvent = { name: string; data?: UmamiEventData };

const queuedEvents: QueuedEvent[] = [];

/**
 * Reads the Umami tracker installed on `window` by the tracker script.
 * @returns The tracker, or `undefined` while the script has not run yet.
 */
function getTracker() {
  return typeof window === "undefined" ? undefined : window.umami;
}

/**
 * Sends every queued event once the Umami tracker is available. Events stay
 * queued while it is not, so none are lost and nothing warns to the console.
 * @returns Nothing.
 */
function flushQueue(): void {
  const tracker = getTracker();
  if (!tracker?.track || queuedEvents.length === 0) return;

  for (const { name, data } of queuedEvents.splice(0)) {
    if (data === undefined) tracker.track(name);
    else tracker.track(name, data);
  }
}

/**
 * Marks the Umami tracker as ready and flushes the events queued before it
 * loaded. Wired to `UmamiProvider`'s `onReady` in `AnalyticsProvider`.
 * @returns Nothing.
 */
export function markAnalyticsReady(): void {
  flushQueue();
}

/**
 * Reports a custom Umami event without ever warning to the console: the call
 * is a no-op when analytics is disabled, sent immediately once the tracker is
 * ready, and queued until it is otherwise.
 * @returns The `event` reporter, taking the event name and optional data.
 */
export function useAnalytics() {
  const event = useCallback((name: string, data?: UmamiEventData) => {
    if (UMAMI_WEBSITE_ID === "") return;

    queuedEvents.push({ name, data });
    flushQueue();
  }, []);

  return { event };
}
