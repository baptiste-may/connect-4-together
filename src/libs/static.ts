export const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
export const UMAMI_SCRIPT_URL =
  process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ||
  "https://stats.may-baptiste.fr/script.js";

export const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || "";
export const UMAMI_DOMAINS = ["connect-4-together.may-baptiste.fr"];
export const currentVersion = process.env.version || "";
