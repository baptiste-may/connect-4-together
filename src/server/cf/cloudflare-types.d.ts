/**
 * Minimal ambient declarations for the Cloudflare Workers APIs used by this
 * project. Kept hand-rolled on purpose: pulling in `@cloudflare/workers-types`
 * would collide with the DOM lib the Next.js client compiles against. Only the
 * members actually touched are declared.
 */

/** Server-side half of a `WebSocketPair`, once accepted. */
interface WebSocket {
  accept(): void;
}

/** Pair handed to a Durable Object during an upgrade — `0` is the client, `1`
 *  the server end. */
declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

/** Workers-only response option carrying the upgraded WebSocket. */
interface ResponseInit {
  webSocket?: WebSocket | null;
}

/** Cloudflare fetcher binding (Workers Assets, Durable Object stubs, service
 *  bindings). */
interface Fetcher {
  fetch(request: Request): Response | Promise<Response>;
}

/** Handle used by a Durable Object binding to reach one specific instance. */
interface DurableObjectStub {
  fetch(request: Request): Response | Promise<Response>;
}

/** Binding to a Durable Object class declared in `wrangler.jsonc`. */
interface DurableObjectNamespace {
  /** Resolves the instance id for a logical name — all game traffic shares
   *  `"game"`. */
  idFromName(name: string): unknown;
  /** Returns the stub for a previously resolved instance id. */
  get(id: unknown): DurableObjectStub;
}
