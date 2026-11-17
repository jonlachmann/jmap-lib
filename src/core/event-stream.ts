/**
 * JMAP Event Source over fetch (RFC 8620 §7.3). Unlike native EventSource, it sends the token in
 * the Authorization header and handles reconnection itself, so it can report connection state.
 * As EventSource does, it sends the last event id it saw when it reconnects (Last-Event-ID), from
 * which the server tells it at once what changed while it was away.
 */

import type { JmapAuthorization } from "./client.js";
import { expandUriTemplate } from "./session.js";

/** A per-account map of type name → state string. */
export type TypeState = Record<string, string>;

/** The StateChange object pushed by the server (RFC 8620 7.1). */
export interface StateChange {
  "@type": "StateChange";
  changed: Record<string, TypeState>;
}

/**
 * "reconnecting" after the first failure, "unreachable" once a reconnect has failed too (it keeps retrying),
 * "unauthorized" when there is no authorization or the server refused it with 401 or 403 (it stops), "closed" after
 * close().
 */
export type ConnectionState = "connecting" | "live" | "reconnecting" | "unreachable" | "unauthorized" | "closed";

export type JmapEventStreamOptions = {
  /** The eventSourceUrl from the JMAP Session object (URI template). */
  eventSourceUrl: string;
  /**
   * Read again before every reconnect, so a function can give a token that is still valid. Null (signed out) stops the
   * stream; a function that throws is retried as a network failure is.
   */
  authorization: JmapAuthorization;
  /** Type names to subscribe to, e.g. ["Email", "Mailbox"]. Default: all ("*"). */
  types?: string[];
  /** Ping interval in seconds the server should use; 0 asks for none, and turns off the stall timeout. Default: 30. */
  ping?: number;
  /** Called on every StateChange event. */
  onStateChange: (stateChange: StateChange) => void;
  /**
   * Called with a frame that isn't JSON, or what onStateChange threw, neither of which closes the connection; and with
   * the reason the stream stopped as "unauthorized".
   */
  onError?: (error: unknown) => void;
  /** Called whenever the connection state changes. */
  onConnectionChange?: (state: ConnectionState) => void;
  /** Reconnect after this long without data. Default: 2.5 × the ping interval; none when ping is 0. */
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

/**
 * Connects to the JMAP event-source endpoint, reconnecting on failure until closed or refused authorization.
 */
export function connectEventStream(options: JmapEventStreamOptions): JmapEventStream {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const pingSeconds = options.ping ?? 30;
  const stallTimeoutMs = options.stallTimeoutMs ?? (pingSeconds > 0 ? pingSeconds * 2500 : undefined);
  const url = expandUriTemplate(options.eventSourceUrl, {
    types: (options.types ?? ["*"]).join(","),
    closeafter: "no",
    ping: String(pingSeconds),
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

  // Abort if no data arrives in time; a dead peer can leave the socket open
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  function resetStall(): void {
    clearTimeout(stallTimer);
    if (stallTimeoutMs !== undefined) stallTimer = setTimeout(() => controller?.abort(), stallTimeoutMs);
  }

  /** Reads the stream until it ends; returns why it was refused when it has no authorization, and throws on a failure. */
  async function listen(signal: AbortSignal): Promise<string | undefined> {
    const authorization = typeof options.authorization === "string" ? options.authorization : await options.authorization();
    if (!authorization) return "No authorization for the event stream: signed out";

    const response = await doFetch(url, {
      headers: {
        authorization,
        accept: "text/event-stream",
        ...(lastEventId === undefined ? {} : { "last-event-id": lastEventId }),
      },
      signal,
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) return `Event stream refused: HTTP ${response.status}`;
    if (!response.ok || !response.body) throw new Error(`Event stream failed: HTTP ${response.status}`);

    attempt = 0;
    setState("live");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) return undefined;
      resetStall();

      const frames = parser.push(decoder.decode(value, { stream: true }));
      lastEventId = parser.lastEventId ?? lastEventId;
      for (const frame of frames) {
        // Other events, such as ping, only reset the stall timer
        if (frame.event !== "state") continue;
        try {
          options.onStateChange(JSON.parse(frame.data) as StateChange);
        } catch (error) {
          options.onError?.(error);
        }
      }
    }
  }

  async function run(): Promise<void> {
    controller = new AbortController();
    resetStall();

    let refusal: string | undefined;
    try {
      refusal = await listen(controller.signal);
    } catch {
      // Network errors, a stall abort and other statuses fall through to the reconnect below
    } finally {
      clearTimeout(stallTimer);
      controller = null;
    }

    if (closed) return;

    if (refusal !== undefined) {
      setState("unauthorized");
      options.onError?.(new Error(refusal));
      return;
    }

    // Exponential backoff with jitter
    setState(attempt === 0 ? "reconnecting" : "unreachable");
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
      setState("closed");
    },
    get state() {
      return state;
    },
    get lastEventId() {
      return lastEventId;
    },
  };
}
