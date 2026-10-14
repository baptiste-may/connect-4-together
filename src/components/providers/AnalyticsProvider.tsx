"use client";

import UmamiProvider from "next-umami";
import { markAnalyticsReady } from "@/libs/analytics";
import {
  UMAMI_DOMAINS,
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
} from "@/libs/static";

/**
 * Mounts the self-hosted Umami tracker and flushes the events queued by
 * `useAnalytics` before it finished loading.
 * @returns The Umami script, or `null` when no website ID is configured.
 */
export default function AnalyticsProvider() {
  if (UMAMI_WEBSITE_ID === "") return null;

  return (
    <UmamiProvider
      websiteId={UMAMI_WEBSITE_ID}
      src={UMAMI_SCRIPT_URL}
      domains={UMAMI_DOMAINS}
      performance
      onReady={markAnalyticsReady}
    />
  );
}
