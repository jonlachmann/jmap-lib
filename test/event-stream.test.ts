import { test } from "node:test";
import assert from "node:assert/strict";
import { SseParser, connectEventStream, type ConnectionState } from "jmap-lib";

test("a frame split across chunks is delivered once, whole", () => {
  const parser = new SseParser();

  assert.deepEqual(parser.push("event: sta"), []);
  assert.deepEqual(parser.push('te\ndata: {"a":'), []);

  const events = parser.push('1}\n\n');
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "state");
  assert.deepEqual(JSON.parse(events[0].data), { a: 1 });
});

test("several frames in one chunk all come out, in order", () => {
  const parser = new SseParser();
  const events = parser.push(
    'event: ping\ndata: {}\n\nevent: state\ndata: {"n":1}\n\nevent: state\ndata: {"n":2}\n\n',
  );

  assert.deepEqual(
    events.map((e) => [e.event, e.data]),
    [["ping", "{}"], ["state", '{"n":1}'], ["state", '{"n":2}']],
  );
});

test("a CRLF split across chunks is one line ending", () => {
  const parser = new SseParser();

  assert.deepEqual(parser.push("event: state\r"), []);
  assert.deepEqual(parser.push('\ndata: {"a":1}\r'), []);
  const events = parser.push("\n\r\n");

  assert.equal(events.length, 1);
  assert.equal(events[0].event, "state");
  assert.equal(events[0].data, '{"a":1}');
});

test("CRLF framing parses the same as LF", () => {
  const parser = new SseParser();
  const events = parser.push('event: state\r\ndata: {"a":1}\r\n\r\n');

  assert.equal(events.length, 1);
  assert.equal(events[0].event, "state");
  assert.equal(events[0].data, '{"a":1}');
});

test("multi-line data is rejoined with newlines", () => {
  const parser = new SseParser();
  const events = parser.push("event: state\ndata: line one\ndata: line two\n\n");

  assert.equal(events[0].data, "line one\nline two");
});

test("comment-only frames yield nothing", () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push(": keep-alive\n\n"), []);
});

test("a frame with an id and no data sets the last event id without an event", () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push("id: abc\n\n"), []);
  assert.equal(parser.lastEventId, "abc");
  parser.push('event: state\nid: def\ndata: {}\n\n');
  assert.equal(parser.lastEventId, "def");
  parser.push("event: ping\ndata: {}\n\n");
  assert.equal(parser.lastEventId, "def");
});

test("a reconnect sends the last event id seen", async () => {
  const sent: Array<string | null> = [];
  let reconnected!: () => void;
  const second = new Promise<void>((resolve) => (reconnected = resolve));
  const stream = connectEventStream({
    eventSourceUrl: "https://example.test/es?types={types}&closeafter={closeafter}&ping={ping}",
    authorization: () => "Bearer token",
    onStateChange: () => {},
    fetch: async (_url, init) => {
      sent.push(new Headers(init?.headers).get("last-event-id"));
      if (sent.length === 2) reconnected();
      // The first connection sets an id and ends; the second stays open
      const body = sent.length === 1 ? "id: abc\n\n" : "";
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body));
          if (sent.length === 1) controller.close();
          else init?.signal?.addEventListener("abort", () => controller.error(new Error("aborted")));
        },
      }), { status: 200 });
    },
  });
  await second;
  stream.close();
  assert.deepEqual(sent, [null, "abc"]);
  assert.equal(stream.lastEventId, "abc");
});

const eventSourceUrl = "https://example.test/es?types={types}&closeafter={closeafter}&ping={ping}";

// Lets the stream's pending promises settle; setImmediate isn't mocked with setTimeout
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

// A response whose body stays open until the request is aborted
function openStream(init: RequestInit | undefined, aborted?: () => void): Response {
  return new Response(new ReadableStream({
    start(controller) {
      init?.signal?.addEventListener("abort", () => {
        aborted?.();
        controller.error(new Error("aborted"));
      });
    },
  }), { status: 200 });
}

test("a 401 stops the stream as unauthorized, without retrying", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const states: ConnectionState[] = [];
  const errors: unknown[] = [];
  let requests = 0;
  const stream = connectEventStream({
    eventSourceUrl,
    authorization: "Bearer token",
    onStateChange: () => {},
    onConnectionChange: (state) => states.push(state),
    onError: (error) => errors.push(error),
    fetch: async () => {
      requests += 1;
      return new Response(null, { status: 401 });
    },
  });
  await settle();
  t.mock.timers.tick(120_000);
  await settle();
  assert.deepEqual(states, ["unauthorized"]);
  assert.equal(stream.state, "unauthorized");
  assert.equal(requests, 1);
  assert.match(String(errors[0]), /401/);
});

test("no authorization stops the stream as unauthorized", async () => {
  const errors: unknown[] = [];
  let requests = 0;
  const stream = connectEventStream({
    eventSourceUrl,
    authorization: () => null,
    onStateChange: () => {},
    onError: (error) => errors.push(error),
    fetch: async () => {
      requests += 1;
      return new Response(null, { status: 200 });
    },
  });
  await settle();
  assert.equal(stream.state, "unauthorized");
  assert.equal(requests, 0);
  assert.match(String(errors[0]), /signed out/);
});

test("a network failure is retried: reconnecting, then unreachable", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const states: ConnectionState[] = [];
  let requests = 0;
  const stream = connectEventStream({
    eventSourceUrl,
    authorization: "Bearer token",
    onStateChange: () => {},
    onConnectionChange: (state) => states.push(state),
    fetch: async () => {
      requests += 1;
      throw new TypeError("fetch failed");
    },
  });
  await settle();
  assert.deepEqual(states, ["reconnecting"]);
  t.mock.timers.tick(1000);
  await settle();
  assert.deepEqual(states, ["reconnecting", "unreachable"]);
  assert.equal(requests, 2);
  stream.close();
});

test("close() aborts the connection and reports closed", async () => {
  const states: ConnectionState[] = [];
  let aborted = false;
  const stream = connectEventStream({
    eventSourceUrl,
    authorization: "Bearer token",
    onStateChange: () => {},
    onConnectionChange: (state) => states.push(state),
    fetch: async (_url, init) => openStream(init, () => (aborted = true)),
  });
  await settle();
  stream.close();
  await settle();
  assert.deepEqual(states, ["live", "closed"]);
  assert.equal(stream.state, "closed");
  assert.ok(aborted);
});

test("ping 0 asks for no pings and never aborts for a stall", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let url = "";
  let aborted = false;
  const stream = connectEventStream({
    eventSourceUrl,
    authorization: "Bearer token",
    ping: 0,
    onStateChange: () => {},
    fetch: async (requestUrl, init) => {
      url = String(requestUrl);
      return openStream(init, () => (aborted = true));
    },
  });
  await settle();
  t.mock.timers.tick(3_600_000);
  await settle();
  assert.match(url, /ping=0/);
  assert.equal(stream.state, "live");
  assert.ok(!aborted);
  stream.close();
});
