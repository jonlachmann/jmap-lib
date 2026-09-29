/**
 * JMAP Event Source (RFC 8620 §7.3) — push notifications via SSE.
 */

/** A per-account map of type name → state string. */
export type TypeState = Record<string, string>;

/** The StateChange object pushed by the server (RFC 8620 §7.1). */
export interface StateChange {
  "@type": "StateChange";
  changed: Record<string, TypeState>;
}

export type JmapEventSourceOptions = {
  /** The eventSourceUrl from the JMAP Session object (URI template). */
  eventSourceUrl: string;
  /** Type names to subscribe to, e.g. ["Email", "Mailbox"]. Default: all ("*"). */
  types?: string[];
  /** "state" to close after first event, "no" to keep open. Default: "no". */
  closeafter?: "state" | "no";
  /** Ping interval in seconds. 0 disables. Default: 300. */
  ping?: number;
  /** Called on every StateChange event. */
  onStateChange: (stateChange: StateChange) => void;
  /** Called on errors. Connection auto-reconnects per SSE spec. */
  onError?: (error: Event) => void;
  /** Custom EventSource constructor, for polyfills or testing. */
  EventSource?: typeof globalThis.EventSource;
};

/**
 * Connects to the JMAP event-source endpoint with the native EventSource, which cannot send an
 * Authorization header. Use connectEventStream for bearer-token authentication.
 */
export function connectEventSource(options: JmapEventSourceOptions): EventSource {
  const url = expandEventSourceUrl(options.eventSourceUrl, {
    types: options.types ?? ["*"],
    closeafter: options.closeafter ?? "no",
    ping: options.ping ?? 300,
  });

  const Ctor = options.EventSource ?? globalThis.EventSource;
  const es = new Ctor(url);

  es.addEventListener("state", (event: MessageEvent) => {
    const data: StateChange = JSON.parse(event.data);
    options.onStateChange(data);
  });

  if (options.onError) {
    es.onerror = options.onError;
  }

  return es;
}

/** Expand the RFC 6570 level-1 URI template from the session. */
function expandEventSourceUrl(
  template: string,
  vars: { types: string[]; closeafter: string; ping: number },
): string {
  return template
    .replace("{types}", encodeURIComponent(vars.types.join(",")))
    .replace("{closeafter}", vars.closeafter)
    .replace("{ping}", String(vars.ping));
}
