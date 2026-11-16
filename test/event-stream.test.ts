import { test } from "node:test";
import assert from "node:assert/strict";
import { SseParser, connectEventStream } from "jmap-lib";

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
    getToken: () => "token",
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
