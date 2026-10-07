/** Upper bound for a message extracted from an HTTP body. */
const MAX_MESSAGE_LENGTH = 160;

/** Keys a JSON error body may carry its message under, by priority. */
const JSON_MESSAGE_KEYS = ["error", "message", "detail"] as const;

/**
 * Transport-level failures raised when no server answered at all: they carry
 * nothing a player can act on, so they are dropped rather than displayed.
 */
const TRANSPORT_FAILURE =
  /^(?:failed to fetch|networkerror when attempting|fetch failed|load failed|network request failed|all endpoints failed to respond)/i;

/**
 * Collapses whitespace, drops markup-looking payloads and truncates a raw
 * candidate so it fits a toast.
 * @param raw The candidate text.
 * @returns The cleaned message, or `undefined` when nothing displayable is left.
 */
function sanitize(raw: string): string | undefined {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed === "" || collapsed.startsWith("<")) return undefined;
  return collapsed.length > MAX_MESSAGE_LENGTH
    ? `${collapsed.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
    : collapsed;
}

/**
 * Reads a response body without letting a malformed body replace the original
 * failure with a parsing error.
 * @param read The body accessor (`res.json()` / `res.text()`).
 * @returns The parsed body, or `undefined` when reading or parsing fails.
 */
async function readBody(read: () => Promise<unknown>): Promise<unknown> {
  try {
    return await read();
  } catch {
    return undefined;
  }
}

/**
 * Builds the message to display for a failed HTTP request.
 * The body is only used when its content type is JSON or plain text, so HTML
 * error pages (Next.js, reverse-proxies) are never dumped into a toast. When
 * no body message is usable, the status line is returned instead.
 * @param res The response of a failed request (`res.ok === false`).
 * @returns A short, user-facing message.
 */
export async function httpErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers?.get("content-type")?.toLowerCase() ?? "";
  let message: string | undefined;

  if (contentType.includes("json")) {
    const body = await readBody(() => res.json());
    if (body !== null && typeof body === "object") {
      for (const key of JSON_MESSAGE_KEYS) {
        const value = (body as Record<string, unknown>)[key];
        if (typeof value !== "string") continue;
        message = sanitize(value);
        if (message !== undefined) break;
      }
    }
  } else if (contentType.startsWith("text/") && !contentType.includes("html")) {
    const body = await readBody(() => res.text());
    if (typeof body === "string") message = sanitize(body);
  }

  if (message !== undefined) return message;

  const statusText = res.statusText?.trim() ?? "";
  return statusText === "" ? String(res.status) : `${res.status} ${statusText}`;
}

/**
 * Pulls the message out of a thrown value, whatever shape it has.
 * @param err The thrown value.
 * @returns The raw message, or `undefined` when there is none.
 */
function rawMessage(err: unknown): string | undefined {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err !== null && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

/**
 * Builds the message to display for a caught error, `undefined` when it holds
 * nothing worth showing (no message, browser network failure, SDK transport
 * failure). Callers keep their generic title in that case.
 * @param err The caught value.
 * @returns A short, user-facing message, or `undefined`.
 */
export function thrownErrorMessage(err: unknown): string | undefined {
  const raw = rawMessage(err);
  if (raw === undefined) return undefined;
  const message = sanitize(raw);
  // Browsers report fetch failures as `TypeError`s ("Failed to fetch"), the
  // SDK as `ServerError`s carrying the same text: neither helps a player.
  if (message === undefined || TRANSPORT_FAILURE.test(message))
    return undefined;
  return message;
}
