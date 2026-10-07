/**
 * Cloudflare Worker entrypoint: forwards the Colyseus traffic (WebSockets,
 * matchmaking, lobby listing) to the single game Durable Object and serves
 * everything else from the static Next.js export.
 */
export { GameServer } from "./game-durable-object";

/**
 * Bindings injected by Cloudflare (see `wrangler.jsonc`).
 */
interface Env {
  /** Workers Assets serving the built Next.js site. */
  ASSETS: Fetcher;
  /** The Durable Object namespace hosting the Colyseus server. */
  GAME_DO: DurableObjectNamespace;
}

/**
 * Whether a request belongs to the game server rather than the static site.
 *
 * @param url The request URL.
 * @param request The request to inspect.
 * @returns True when the Durable Object owns this traffic.
 */
function isGameRequest(url: URL, request: Request): boolean {
  return (
    request.headers.get("Upgrade")?.toLowerCase() === "websocket" ||
    url.pathname === "/api/rooms" ||
    url.pathname === "/matchmake" ||
    url.pathname.startsWith("/matchmake/")
  );
}

/**
 * Static site + Colyseus on a single origin.
 *
 * @param request The incoming request.
 * @param env Cloudflare bindings.
 * @returns The response from Workers Assets or the game Durable Object.
 */
const worker = {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);
    if (isGameRequest(url, request)) {
      return env.GAME_DO.get(env.GAME_DO.idFromName("game")).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export default worker;
