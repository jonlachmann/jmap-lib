import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  EmailGet,
  EmailQuery,
  JmapClient,
  JmapHttpError,
  JmapNetworkError,
  JmapProtocolError,
  MailboxId,
} from "jmap-lib";

test("JmapBatch auto-generates call ids and sends a batched request", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "token",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          methodResponses: [
            ["Email/query", { ids: ["e1"], position: 0, total: 1 }, "0"],
            ["Email/get", { list: [{ id: "e1", threadId: "t1", mailboxIds: {} }] }, "1"],
          ],
        }),
        { status: 200 },
      );
    },
  });

  const batch = client.batch();
  const firstCallId = batch.call(
    EmailQuery.page({
      accountId: AccountId.of("acc"),
      mailboxId: MailboxId.of("inbox"),
      limit: 10,
      position: 0,
    }),
  );
  const secondCallId = batch.call(EmailGet.byQueryResult(AccountId.of("acc"), firstCallId));

  assert.equal(firstCallId.value, "0");
  assert.equal(secondCallId.value, "1");

  const response = await batch.send();
  assert.deepEqual(response.get<{ ids: string[] }>(firstCallId, "Email/query"), { ids: ["e1"], position: 0, total: 1 });
  assert.equal(requests.length, 1);

  const body = JSON.parse(String(requests[0].init?.body));
  assert.deepEqual(body.using, ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"]);
  assert.deepEqual(body.methodCalls[1][1]["#ids"], {
    resultOf: "0",
    name: "Email/query",
    path: "/ids",
  });
});

test("JmapClient.invoke posts a single method with headers", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          methodResponses: [
            ["Mailbox/get", { accountId: "acc", list: [{ id: "inbox", name: "Inbox" }] }, "0"],
          ],
        }),
        { status: 200 },
      );
    },
  });

  const result = await client.invoke({
    methodName: "Mailbox/get",
    arguments: { accountId: "acc" },
  });

  assert.deepEqual(result, { accountId: "acc", list: [{ id: "inbox", name: "Inbox" }] });
  assert.equal(requests[0].url, "https://example.test/jmap");
  assert.equal((requests[0].init?.headers as Record<string, string>).authorization, "Bearer secret");
  assert.equal((requests[0].init?.headers as Record<string, string>)["content-type"], "application/json");
});

test("JmapClient accepts a custom authorization header", async () => {
  const requests: Array<{ init?: RequestInit }> = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    authorizationHeader: "Basic dXNlcjpwYXNz",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      requests.push({ init });
      return new Response(
        JSON.stringify({
          methodResponses: [["Mailbox/get", { accountId: "acc", list: [] }, "0"]],
        }),
        { status: 200 },
      );
    },
  });

  await client.invoke({
    methodName: "Mailbox/get",
    arguments: { accountId: "acc" },
  });

  assert.equal((requests[0].init?.headers as Record<string, string>).authorization, "Basic dXNlcjpwYXNz");
});

test("JmapClient throws on HTTP errors", async () => {
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async () => new Response("bad request", { status: 400 }),
  });

  await assert.rejects(
    () => client.invoke({ methodName: "Mailbox/get", arguments: { accountId: "acc" } }),
    (error: unknown) => error instanceof JmapHttpError && error.status === 400 && error.body === "bad request",
  );
});

test("JmapClient throws on JMAP method errors", async () => {
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async () =>
      new Response(
        JSON.stringify({
          methodResponses: [
            ["error", { type: "accountNotFound" }, "0"],
          ],
        }),
        { status: 200 },
      ),
  });

  await assert.rejects(
    () => client.invoke({ methodName: "Mailbox/get", arguments: { accountId: "acc" } }),
    (error: unknown) => error instanceof JmapProtocolError && error.type === "accountNotFound",
  );
});

test("JmapClient throws a network error when the request gets no response", async () => {
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async () => { throw new TypeError("Failed to fetch"); },
  });

  await assert.rejects(
    () => client.invoke({ methodName: "Mailbox/get", arguments: { accountId: "acc" } }),
    (error: unknown) => error instanceof JmapNetworkError && error.cause instanceof TypeError,
  );
});

test("JmapClient.sendRaw sends createdIds and keeps a method's error among the responses", async () => {
  let body: { createdIds?: Record<string, string>; methodCalls: unknown[] } | undefined;
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        methodResponses: [["error", { type: "invalidArguments" }, "0"], ["Task/set", { accountId: "a", updated: { t9: null } }, "1"]],
        createdIds: { t1: "t9" },
      }), { status: 200 });
    },
  });

  const response = await client.sendRaw(
    [["Task/set", { accountId: "a", bad: true }, "0"], ["Task/set", { accountId: "a", update: { "#t1": {} } }, "1"]],
    { createdIds: { t1: "t9" } },
  );

  assert.deepEqual(body?.createdIds, { t1: "t9" });
  assert.equal(response.methodResponses?.length, 2);
  assert.deepEqual(response.createdIds, { t1: "t9" });
});

test("onResponse sees each request's calls and response before the caller gets it", async () => {
  const seen: string[] = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "token",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async () => new Response(JSON.stringify({
      methodResponses: [["Email/get", { list: [], state: "s1" }, "0"]],
      sessionState: "x",
    }), { status: 200 }),
    onResponse: async (calls, response) => {
      await Promise.resolve();
      seen.push(`${calls[0][0]}:${response.methodResponses?.[0][0]}:${response.sessionState}`);
    },
  });

  await client.invoke(EmailGet.byIds(AccountId.of("acc"), []));
  seen.push("caller");
  assert.deepEqual(seen, ["Email/get:Email/get:x", "caller"]);
});
