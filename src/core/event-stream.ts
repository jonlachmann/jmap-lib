/**
 * JMAP Event Source over fetch (RFC 8620 §7.3). Unlike native EventSource, it sends the token in
 * the Authorization header and handles reconnection itself, so it can report connection state.
 * As EventSource does, it sends the last event id it saw when it reconnects (Last-Event-ID), from
 * which the server tells it at once what changed while it was away.
 */

import type { StateChange } from "./event-source";

/** "reconnecting" after the first failure; "offline" after repeated failures or close(). */
export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";

export type JmapEventStreamOptions = {
  /** The eventSourceUrl from the JMAP Session object (URI template). */
  eventSourceUrl: string;
  /** Returns a currently-valid bearer token. Called again before every reconnect. */
  getToken: () => Promise<string | null> | string | null;
  /** Type names to subscribe to, e.g. ["Email", "Mailbox"]. Default: all ("*"). */
  types?: string[];
  /** Ping interval in seconds the server should use. Default: 30. */
  ping?: number;
  /** Called on every StateChange event. */
  onStateChange: (stateChange: StateChange) => void;
  /** Called whenever the connection state changes. */
  onConnectionChange?: (state: ConnectionState) => void;
  /** Reconnect after this long without data. Default: 2.5 × the ping interval. */
  stallTimeoutMs?: number;
  /** Custom fetch implementation. Default: globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** The last event id an earlier stream saw, sent on the first connection so nothing missed since is lost. */
  lastEventId?: string;
};

export type JmapEventStream = {
  /** Stop listening and close the connection. Not restartable. */
  close: () => void;
  /** The last reported connection state. */
  readonly state: ConnectionState;
  /** The last event id the server set, for a stream that follows this one. */
  readonly lastEventId: string | undefined;
};

const BASE_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;

/** Splits decoded text/event-stream chunks into events, buffering frames split across chunks. */
export class SseParser {
  private buffer = "";
  private lastWasCr = false;
  /** The id the stream last set, by any frame, one without data included (the EventSource processing model). */
  lastEventId: string | undefined;

  /** Feed a decoded chunk; returns the events completed by it. */
  push(chunk: string): Array<{ event: string; data: string; id?: string }> {
    if (this.lastWasCr && chunk.startsWith("\n")) chunk = chunk.slice(1);
    this.lastWasCr = chunk.endsWith("\r");
    this.buffer += chunk.replace(/\r\n?/g, "\n");

    const events: Array<{ event: string; data: string; id?: string }> = [];
    let boundary = this.buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const raw = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const parsed = parseFrame(raw);
      if (parsed.id !== undefined) this.lastEventId = parsed.id;
      if (parsed.data !== null) events.push({ event: parsed.event, data: parsed.data, id: parsed.id });
      boundary = this.buffer.indexOf("\n\n");
    }

    return events;
  }
}

/** A frame's fields; data is null when it has none, which dispatches nothing. */
function parseFrame(raw: string): { event: string; data: string | null; id?: string } {
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];

  for (const line of raw.split("\n")) {
    if (line === "" || line.startsWith(":")) continue; // comment / keep-alive
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    // One space after the colon is not part of the value
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    // An id holding NUL is ignored (EventSource)
    else if (field === "id" && !value.includes("\0")) id = value;
  }

  return { event, data: data.length === 0 ? null : data.join("\n"), id };
}

/** Expand the RFC 6570 level-1 URI template from the session. */
function expandUrl(template: string, vars: { types: string[]; ping: number }): string {
  return template
    .replace("{types}", encodeURIComponent(vars.types.join(",")))
    .replace("{closeafter}", "no")
    .replace("{ping}", String(vars.ping));
}

/**
 * Connects to the JMAP event-source endpoint, reconnecting on failure until closed.
 */
export function connectEventStream(options: JmapEventStreamOptions): JmapEventStream {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const pingSeconds = options.ping ?? 30;
  const stallTimeoutMs = options.stallTimeoutMs ?? pingSeconds * 2500;
  const url = expandUrl(options.eventSourceUrl, {
    types: options.types ?? ["*"],
    ping: pingSeconds,
  });

  let closed = false;
  let attempt = 0;
  let state: ConnectionState = "connecting";
  let controller: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let lastEventId = options.lastEventId;

  function setState(next: ConnectionState): void {
    if (state === next) return;
    state = next;
    options.onConnectionChange?.(next);
  }

  async function run(): Promise<void> {
    controller = new AbortController();
    // Abort if no data arrives in time; a dead peer can leave the socket open
    let stallTimer = setTimeout(() => controller?.abort(), stallTimeoutMs);
    const resetStall = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => controller?.abort(), stallTimeoutMs);
    };

    try {
      const token = await options.getToken();
      if (!token) throw new Error("Not signed in");

      const response = await doFetch(url, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "text/event-stream",
          ...(lastEventId === undefined ? {} : { "last-event-id": lastEventId }),
        },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok || !response.body) {
        throw new Error(`Event stream failed: HTTP ${response.status}`);
      }

      attempt = 0;
      setState("live");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new SseParser();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        resetStall();

        const frames = parser.push(decoder.decode(value, { stream: true }));
        lastEventId = parser.lastEventId ?? lastEventId;
        for (const frame of frames) {
          // Other events, such as ping, only reset the stall timer
          if (frame.event !== "state") continue;
          try {
            options.onStateChange(JSON.parse(frame.data) as StateChange);
          } catch {
            // Neither a malformed frame nor a throwing handler closes the connection
          }
        }
      }
    } catch {
      // Errors, including a stall abort, fall through to the reconnect below
    } finally {
      clearTimeout(stallTimer);
      controller = null;
    }

    if (closed) return;

    // Exponential backoff with jitter
    setState(attempt === 0 ? "reconnecting" : "offline");
    const delay = Math.min(BASE_RETRY_MS * 2 ** attempt, MAX_RETRY_MS);
    attempt += 1;
    retryTimer = setTimeout(run, delay * (0.5 + Math.random() * 0.5));
  }

  void run();

  return {
    close() {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      controller?.abort();
      setState("offline");
    },
    get state() {
      return state;
    },
    get lastEventId() {
      return lastEventId;
    },
  };
}
