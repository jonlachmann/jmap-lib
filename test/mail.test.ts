import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  CallId,
  EmailGet,
  JmapClient,
  JmapMail,
  MailboxChanges,
  MailboxQuery,
  MailboxQueryChanges,
  MailboxSet,
  SearchSnippetGet,
} from "jmap-lib";

test("EmailGet.byQueryResult encapsulates #ids references", () => {
  const method = EmailGet.byQueryResult(AccountId.of("acc"), CallId.of("query-1"), ["id", "subject"]);

  assert.deepEqual(method.arguments, {
    accountId: "acc",
    "#ids": {
      resultOf: "query-1",
      name: "Email/query",
      path: "/ids",
    },
    properties: ["id", "subject"],
  });
});

test("SearchSnippetGet.byQueryResult takes the query's ids and filter", () => {
  const method = SearchSnippetGet.byQueryResult(AccountId.of("acc"), CallId.of("query-1"), { text: "budget" });

  assert.deepEqual(method.arguments, {
    accountId: "acc",
    filter: { text: "budget" },
    "#emailIds": { resultOf: "query-1", name: "Email/query", path: "/ids" },
  });
});

test("JmapMail.getAllMailboxes preserves successes and failures per account", async () => {
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const accountId = body.methodCalls[0][1].accountId;

      if (accountId === "bad") {
        return new Response(
          JSON.stringify({
            methodResponses: [["Mailbox/get/error", { type: "accountNotFound" }, "0"]],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          methodResponses: [
            ["Mailbox/get", { accountId, list: [{ id: "inbox", name: "Inbox" }] }, "0"],
          ],
        }),
        { status: 200 },
      );
    },
  });

  const mail = new JmapMail(client);
  const result = await mail.getAllMailboxes({
    accountIds: [AccountId.of("good"), AccountId.of("bad")],
  });

  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].accountId.value, "good");
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].accountId.value, "bad");
});

test("JmapMail.listPage batches Email/query and Email/get and computes hasMore", async () => {
  const requests: Array<{ body: unknown }> = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      requests.push({ body: JSON.parse(String(init?.body)) });
      return new Response(
        JSON.stringify({
          methodResponses: [
            ["Email/query", { accountId: "acc", ids: ["e1", "e2"], position: 0, total: 3 }, "0"],
            [
              "Email/get",
              {
                accountId: "acc",
                list: [
                  { id: "e1", threadId: "t1", mailboxIds: {}, subject: "One" },
                  { id: "e2", threadId: "t2", mailboxIds: {}, subject: "Two" },
                ],
              },
              "1",
            ],
          ],
        }),
        { status: 200 },
      );
    },
  });

  const mail = new JmapMail(client);
  const result = await mail.listPage({
    accountId: AccountId.of("acc"),
    limit: 2,
    position: 0,
    properties: ["id", "subject"],
  });

  assert.equal(result.query.total, 3);
  assert.equal(result.emails.length, 2);
  assert.equal(result.hasMore, true);

  const body = requests[0].body as { methodCalls: Array<[string, Record<string, unknown>, string]> };
  assert.equal(body.methodCalls.length, 2);
  assert.equal(body.methodCalls[0][0], "Email/query");
  assert.equal(body.methodCalls[1][0], "Email/get");
  assert.deepEqual(body.methodCalls[1][1]["#ids"], {
    resultOf: "0",
    name: "Email/query",
    path: "/ids",
  });
});

test("JmapMail.listPage falls back to limit-based hasMore when total is absent", async () => {
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async () =>
      new Response(
        JSON.stringify({
          methodResponses: [
            ["Email/query", { accountId: "acc", ids: ["e1", "e2"], position: 10 }, "0"],
            [
              "Email/get",
              {
                accountId: "acc",
                list: [
                  { id: "e1", threadId: "t1", mailboxIds: {} },
                  { id: "e2", threadId: "t2", mailboxIds: {} },
                ],
              },
              "1",
            ],
          ],
        }),
        { status: 200 },
      ),
  });

  const mail = new JmapMail(client);
  const result = await mail.listPage({
    accountId: AccountId.of("acc"),
    limit: 2,
  });

  assert.equal(result.hasMore, true);
});

test("Mailbox/query, Mailbox/queryChanges, and Mailbox/set preserve typed mailbox arguments", () => {
  const query = new MailboxQuery({
    accountId: "acc",
    filter: { name: "Projects" },
    sort: [{ property: "name", isAscending: true }],
    sortAsTree: true,
    filterAsTree: true,
  });
  const queryChanges = new MailboxQueryChanges({
    accountId: "acc",
    filter: { role: "inbox" },
    sort: [{ property: "sortOrder", isAscending: true }],
    sinceQueryState: "q1",
  });
  const set = new MailboxSet({
    accountId: "acc",
    create: {
      mailbox: {
        name: "Projects",
        isSubscribed: true,
      },
    },
    onDestroyRemoveEmails: false,
  });
  const changes = new MailboxChanges({
    accountId: "acc",
    sinceState: "m1",
  });

  assert.equal(query.methodName, "Mailbox/query");
  assert.equal(query.arguments.sortAsTree, true);
  assert.equal(query.arguments.filterAsTree, true);
  assert.equal(queryChanges.methodName, "Mailbox/queryChanges");
  assert.equal(queryChanges.arguments.sinceQueryState, "q1");
  assert.equal(set.methodName, "Mailbox/set");
  assert.equal(set.arguments.create?.mailbox?.name, "Projects");
  assert.equal(changes.methodName, "Mailbox/changes");
});

test("EmailGet.byThreads takes its ids from a Thread/get in the same request", () => {
  const get = EmailGet.byThreads(AccountId.of("acc"), CallId.of("t"), ["id", "mailboxIds"], { fetchAllBodyValues: true });
  assert.deepEqual(get.arguments, {
    accountId: "acc",
    "#ids": { resultOf: "t", name: "Thread/get", path: "/list/*/emailIds" },
    properties: ["id", "mailboxIds"],
    fetchAllBodyValues: true,
  });
});
