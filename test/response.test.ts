import test from "node:test";
import assert from "node:assert/strict";

import { CallId, JmapProtocolError, JmapResponse } from "jmap-lib";

test("JmapResponse.get resolves a response by call id", () => {
  const response = new JmapResponse({
    methodResponses: [
      ["Mailbox/get", { list: [{ id: "inbox" }] }, "0"],
      ["Email/get", { list: [{ id: "e1" }] }, "1"],
    ],
  });

  assert.deepEqual(response.get<{ list: Array<{ id: string }> }>(CallId.of("1"), "Email/get"), {
    list: [{ id: "e1" }],
  });
});

test("JmapResponse.first resolves the first matching method response", () => {
  const response = new JmapResponse({
    methodResponses: [
      ["Mailbox/get", { list: [{ id: "inbox" }] }, "0"],
    ],
  });

  assert.deepEqual(response.first<{ list: Array<{ id: string }> }>("Mailbox/get"), {
    list: [{ id: "inbox" }],
  });
});

test("JmapResponse throws when responses are missing", () => {
  const response = new JmapResponse({ methodResponses: [] });

  assert.throws(() => response.get(CallId.of("99"), "Email/get"), /Missing JMAP response/);
  assert.throws(() => response.first("Email/get"), /Missing JMAP response/);
});

test("JmapResponse surfaces method errors", () => {
  const response = new JmapResponse({
    methodResponses: [
      ["error", { type: "invalidArguments" }, "0"],
    ],
  });

  assert.throws(() => response.first("Email/get"), JmapProtocolError);
});

test("JmapResponse.get surfaces method errors by call id", () => {
  const response = new JmapResponse({
    methodResponses: [
      ["error", { type: "invalidArguments" }, "0"],
    ],
  });

  assert.throws(() => response.get(CallId.of("0"), "Email/get"), JmapProtocolError);
});
