import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  CallId,
  ContactCardGet,
  ContactCardQuery,
  EmailGet,
  EmailQuery,
  JmapClient,
  MailboxGet,
  type JmapMethod,
} from "jmap-lib";

test("custom flow: consumers can compose a typed low-level mail batch", async () => {
  const requests: Array<{ body: { using: string[]; methodCalls: unknown[] } }> = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { using: string[]; methodCalls: unknown[] };
      requests.push({ body });

      return new Response(
        JSON.stringify({
          methodResponses: [
            ["Mailbox/get", {
              accountId: "acc",
              list: [{ id: "inbox", name: "Inbox", role: "inbox" }],
            }, "mailboxes"],
            ["Email/query", {
              accountId: "acc",
              ids: ["e1", "e2"],
              position: 0,
              total: 2,
            }, "query"],
            ["Email/get", {
              accountId: "acc",
              list: [
                { id: "e1", threadId: "t1", mailboxIds: { inbox: true }, subject: "First" },
                { id: "e2", threadId: "t2", mailboxIds: { inbox: true }, subject: "Second" },
              ],
            }, "emails"],
          ],
        }),
        { status: 200 },
      );
    },
  });

  const batch = client.batch();
  const mailboxesCallId = batch.call(MailboxGet.all(AccountId.of("acc")), CallId.of("mailboxes"));
  const queryCallId = batch.call(new EmailQuery({
    accountId: "acc",
    filter: { inMailbox: "inbox" },
    sort: [{ property: "receivedAt", isAscending: false }],
    limit: 2,
    calculateTotal: true,
  }), CallId.of("query"));
  const emailsCallId = batch.call(
    EmailGet.byQueryResult(AccountId.of("acc"), queryCallId, ["id", "threadId", "mailboxIds", "subject"]),
    CallId.of("emails"),
  );

  const response = await batch.send();

  const mailboxes = response.get<{ list: Array<{ id: string; role?: string }> }>(mailboxesCallId, "Mailbox/get");
  const query = response.get<{ ids: string[]; total: number }>(queryCallId, "Email/query");
  const emails = response.get<{ list: Array<{ id: string; subject?: string }> }>(emailsCallId, "Email/get");

  assert.equal(mailboxes.list[0].role, "inbox");
  assert.deepEqual(query.ids, ["e1", "e2"]);
  assert.deepEqual(emails.list.map((email) => email.subject), ["First", "Second"]);
  assert.deepEqual(requests[0].body.methodCalls, [
    ["Mailbox/get", { accountId: "acc" }, "mailboxes"],
    ["Email/query", {
      accountId: "acc",
      filter: { inMailbox: "inbox" },
      sort: [{ property: "receivedAt", isAscending: false }],
      limit: 2,
      calculateTotal: true,
    }, "query"],
    ["Email/get", {
      accountId: "acc",
      "#ids": { resultOf: "query", name: "Email/query", path: "/ids" },
      properties: ["id", "threadId", "mailboxIds", "subject"],
    }, "emails"],
  ]);
});

test("custom flow: consumers can issue cross-domain batches and inspect raw responses", async () => {
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail", "urn:ietf:params:jmap:contacts"],
    fetch: async () =>
      new Response(
        JSON.stringify({
          methodResponses: [
            ["Mailbox/get", { accountId: "acc", list: [{ id: "inbox", name: "Inbox" }] }, "m1"],
            ["ContactCard/query", { accountId: "acc", ids: ["c1"], position: 0, total: 1 }, "c1q"],
            ["ContactCard/get", {
              accountId: "acc",
              list: [{ id: "c1", addressBookIds: { ab1: true }, emails: { primary: { address: "u@example.test" } } }],
            }, "c1g"],
          ],
        }),
        { status: 200 },
      ),
  });

  const batch = client.batch({ capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail", "urn:ietf:params:jmap:contacts"] });
  batch.call(MailboxGet.all(AccountId.of("acc")), CallId.of("m1"));
  const contactQueryCallId = batch.call(new ContactCardQuery({
    accountId: "acc",
    filter: { text: "user" },
    limit: 5,
  }), CallId.of("c1q"));
  batch.call(ContactCardGet.byQueryResult(AccountId.of("acc"), contactQueryCallId), CallId.of("c1g"));

  const response = await batch.send();

  assert.equal(response.first<{ list: Array<{ id: string }> }>("Mailbox/get").list[0].id, "inbox");
  assert.equal(response.first<{ ids: string[] }>("ContactCard/query").ids[0], "c1");
  assert.equal(response.allRaw().length, 3);
});

test("custom flow: consumers can invoke an ad hoc typed method without adding a convenience wrapper", async () => {
  type BlobCopyRequest = {
    fromAccountId: string;
    accountId: string;
    blobIds: string[];
  };

  type BlobCopyResponse = {
    accountId: string;
    copied: Record<string, { blobId: string }>;
  };

  const blobCopyMethod: JmapMethod<BlobCopyRequest, BlobCopyResponse> = {
    methodName: "Blob/copy",
    arguments: {
      fromAccountId: "source",
      accountId: "target",
      blobIds: ["blob-1"],
    },
  };

  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { methodCalls: Array<[string, BlobCopyRequest, string]> };
      assert.equal(body.methodCalls[0][0], "Blob/copy");
      assert.deepEqual(body.methodCalls[0][1], blobCopyMethod.arguments);

      return new Response(
        JSON.stringify({
          methodResponses: [["Blob/copy", {
            accountId: "target",
            copied: { "blob-1": { blobId: "blob-2" } },
          }, "0"]],
        }),
        { status: 200 },
      );
    },
  });

  const result = await client.invoke(blobCopyMethod);

  assert.equal(result.copied["blob-1"].blobId, "blob-2");
});
