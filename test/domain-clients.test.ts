import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  CORE_CALENDARS_CAPABILITIES,
  CORE_CALENDARS_PARSE_CAPABILITIES,
  CORE_CONTACTS_CAPABILITIES,
  CORE_MAIL_SUBMISSION_CAPABILITIES,
  CORE_MAIL_VACATION_CAPABILITIES,
  CORE_SIEVE_CAPABILITIES,
  JMAP_CALENDARS_CAPABILITY,
  JMAP_CONTACTS_CAPABILITY,
  JmapCalendars,
  JmapClient,
  JmapContacts,
  JmapIdentities,
  JmapMail,
  JmapQuota,
  JmapSieve,
  JmapVacation,
} from "jmap-lib";

test("JmapClient exposes configured capabilities", () => {
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", JMAP_CONTACTS_CAPABILITY],
    fetch: async () => new Response(JSON.stringify({ methodResponses: [] }), { status: 200 }),
  });

  assert.deepEqual(client.getCapabilities(), ["urn:ietf:params:jmap:core", JMAP_CONTACTS_CAPABILITY]);
  assert.equal(client.hasCapability(JMAP_CONTACTS_CAPABILITY), true);
  assert.equal(client.hasCapability(JMAP_CALENDARS_CAPABILITY), false);
});

test("JmapQuota.get asks for Quota/get under the quota capability, beside the client's", async () => {
  let using: string[] | undefined;
  const quota = new JmapQuota(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      using = body.using;
      return new Response(
        JSON.stringify({
          methodResponses: [["Quota/get", { accountId: "acc", list: [{ id: "q1", resourceType: "octets", used: 1, hardLimit: 10, scope: "account", name: "Mail", types: ["Email"] }] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const response = await quota.get(AccountId.of("acc"));

  assert.equal(response.list[0].used, 1);
  assert.deepEqual(using, ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail", "urn:ietf:params:jmap:quota"]);
});

test("JmapIdentities.list uses submission capabilities", async () => {
  let using: string[] | undefined;
  const identities = new JmapIdentities(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [["Identity/get", { accountId: "acc", list: [{ id: "id1", name: "User", email: "u@example.test" }] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const list = await identities.list(AccountId.of("acc"));

  assert.equal(list[0].id, "id1");
  assert.deepEqual(using, [...CORE_MAIL_SUBMISSION_CAPABILITIES]);
});

test("JmapIdentities.changes uses submission capabilities", async () => {
  let using: string[] | undefined;
  const identities = new JmapIdentities(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [[
            "Identity/changes",
            { accountId: "acc", oldState: "s1", newState: "s2", hasMoreChanges: false, created: [], updated: [], destroyed: [] },
            "0",
          ]],
        }),
        { status: 200 },
      );
    },
  }));

  const result = await identities.changes(AccountId.of("acc"), "s1");

  assert.equal(result.newState, "s2");
  assert.deepEqual(using, [...CORE_MAIL_SUBMISSION_CAPABILITIES]);
});

test("JmapVacation.get uses vacation capabilities", async () => {
  let using: string[] | undefined;
  const vacation = new JmapVacation(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [["VacationResponse/get", { accountId: "acc", list: [{ id: "singleton", isEnabled: false, fromDate: null, toDate: null, subject: "", textBody: "", htmlBody: null }] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const result = await vacation.get(AccountId.of("acc"));

  assert.equal(result?.id, "singleton");
  assert.deepEqual(using, [...CORE_MAIL_VACATION_CAPABILITIES]);
});

test("JmapContacts.getAddressBooks uses contacts capabilities", async () => {
  let using: string[] | undefined;
  const contacts = new JmapContacts(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [["AddressBook/get", { accountId: "acc", list: [{ id: "ab1", name: "Default" }] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const result = (await contacts.getAddressBooks(AccountId.of("acc"))).list;

  assert.equal(result[0].id, "ab1");
  assert.deepEqual(using, [...CORE_CONTACTS_CAPABILITIES]);
});

test("JmapCalendars.getCalendars uses calendar capabilities", async () => {
  let using: string[] | undefined;
  const calendars = new JmapCalendars(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [["Calendar/get", { accountId: "acc", list: [{ id: "cal1", name: "Primary" }] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const result = (await calendars.getCalendars(AccountId.of("acc"))).list;

  assert.equal(result[0].id, "cal1");
  assert.deepEqual(using, [...CORE_CALENDARS_CAPABILITIES]);
});

test("JmapCalendars.parse uses calendars parse capabilities", async () => {
  let using: string[] | undefined;
  const calendars = new JmapCalendars(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [["CalendarEvent/parse", { accountId: "acc", parsed: { "blob-1": [{ title: "Parsed" }] } }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const result = await calendars.parse(AccountId.of("acc"), "blob-1");

  assert.equal(result[0].title, "Parsed");
  assert.deepEqual(using, [...CORE_CALENDARS_PARSE_CAPABILITIES]);
});

test("JmapSieve.list uses sieve capabilities", async () => {
  let using: string[] | undefined;
  const sieve = new JmapSieve(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [["SieveScript/get", { accountId: "acc", list: [{ id: "s1", name: "main", blobId: "b1", isActive: true }] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const result = await sieve.list(AccountId.of("acc"));

  assert.equal(result[0].id, "s1");
  assert.deepEqual(using, [...CORE_SIEVE_CAPABILITIES]);
});

test("JmapMail.submit uses submission capabilities", async () => {
  let using: string[] | undefined;
  const mail = new JmapMail(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [["EmailSubmission/set", { accountId: "acc", created: { submission: { id: "sub-1" } } }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  await mail.submit(AccountId.of("acc"), "identity-1", "email-1");

  assert.deepEqual(using, [...CORE_MAIL_SUBMISSION_CAPABILITIES]);
});

test("JmapMail changes helpers delegate to standard /changes methods", async () => {
  const requests: Array<{ methodName: string; args: unknown }> = [];
  const responses = [
    { methodResponses: [["Mailbox/changes", { accountId: "acc", oldState: "m1", newState: "m2", hasMoreChanges: false, created: [], updated: ["inbox"], destroyed: [] }, "0"]] },
    { methodResponses: [["Email/changes", { accountId: "acc", oldState: "e1", newState: "e2", hasMoreChanges: false, created: ["email-1"], updated: [], destroyed: [] }, "0"]] },
    { methodResponses: [["Thread/changes", { accountId: "acc", oldState: "t1", newState: "t2", hasMoreChanges: false, created: [], updated: [], destroyed: ["thread-1"] }, "0"]] },
  ];

  const mail = new JmapMail(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      requests.push({
        methodName: body.methodCalls[0][0],
        args: body.methodCalls[0][1],
      });
      return new Response(JSON.stringify(responses[requests.length - 1]), { status: 200 });
    },
  }));

  const mailboxChanges = await mail.getMailboxChanges(AccountId.of("acc"), "m1", { maxChanges: 5 });
  const emailChanges = await mail.getEmailChanges(AccountId.of("acc"), "e1");
  const threadChanges = await mail.getThreadChanges(AccountId.of("acc"), "t1");

  assert.equal(mailboxChanges.updated[0], "inbox");
  assert.equal(emailChanges.created[0], "email-1");
  assert.equal(threadChanges.destroyed[0], "thread-1");
  assert.deepEqual(requests, [
    {
      methodName: "Mailbox/changes",
      args: { accountId: "acc", sinceState: "m1", maxChanges: 5 },
    },
    {
      methodName: "Email/changes",
      args: { accountId: "acc", sinceState: "e1" },
    },
    {
      methodName: "Thread/changes",
      args: { accountId: "acc", sinceState: "t1" },
    },
  ]);
});

test("JmapMail mailbox query and set helpers delegate to mailbox methods", async () => {
  const requests: Array<{ methodName: string; args: unknown }> = [];
  const responses = [
    { methodResponses: [["Mailbox/query", { accountId: "acc", queryState: "q1", canCalculateChanges: true, position: 0, ids: ["mbox-1"], total: 1 }, "0"]] },
    { methodResponses: [["Mailbox/queryChanges", { accountId: "acc", oldQueryState: "q1", newQueryState: "q2", removed: [], added: [{ id: "mbox-2", index: 1 }], total: 2 }, "0"]] },
    { methodResponses: [["Mailbox/set", { accountId: "acc", created: { new: { id: "mbox-3" } } }, "0"]] },
    { methodResponses: [["Mailbox/set", { accountId: "acc", updated: { "mbox-3": null } }, "0"]] },
    { methodResponses: [["Mailbox/set", { accountId: "acc", destroyed: ["mbox-3"] }, "0"]] },
  ];

  const mail = new JmapMail(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      requests.push({
        methodName: body.methodCalls[0][0],
        args: body.methodCalls[0][1],
      });
      return new Response(JSON.stringify(responses[requests.length - 1]), { status: 200 });
    },
  }));

  const query = await mail.queryMailboxes(AccountId.of("acc"), {
    filter: { name: "Projects" },
    sort: [{ property: "name", isAscending: true }],
    sortAsTree: true,
  });
  const queryChanges = await mail.queryMailboxChanges(AccountId.of("acc"), {
    filter: { name: "Projects" },
    sort: [{ property: "name", isAscending: true }],
    sinceQueryState: "q1",
    calculateTotal: true,
  });
  const mailboxId = (await mail.createMailbox(AccountId.of("acc"), {
    name: "Projects",
  })).id;
  await mail.updateMailbox(AccountId.of("acc"), mailboxId, { isSubscribed: true });
  await mail.destroyMailbox(AccountId.of("acc"), mailboxId);

  assert.equal(query.ids[0], "mbox-1");
  assert.equal(queryChanges.newQueryState, "q2");
  assert.equal(mailboxId, "mbox-3");
  assert.deepEqual(requests, [
    {
      methodName: "Mailbox/query",
      args: {
        accountId: "acc",
        filter: { name: "Projects" },
        sort: [{ property: "name", isAscending: true }],
        sortAsTree: true,
      },
    },
    {
      methodName: "Mailbox/queryChanges",
      args: {
        accountId: "acc",
        filter: { name: "Projects" },
        sort: [{ property: "name", isAscending: true }],
        sinceQueryState: "q1",
        calculateTotal: true,
      },
    },
    {
      methodName: "Mailbox/set",
      args: {
        accountId: "acc",
        create: { new: { name: "Projects" } },
      },
    },
    {
      methodName: "Mailbox/set",
      args: {
        accountId: "acc",
        update: { "mbox-3": { isSubscribed: true } },
      },
    },
    {
      methodName: "Mailbox/set",
      args: {
        accountId: "acc",
        destroy: ["mbox-3"],
      },
    },
  ]);
});

test("JmapMail.getThreadEmails fetches the thread's emails in one request, newest first", async () => {
  const requests: Array<{ methodCalls: unknown[][] }> = [];
  const mail = new JmapMail(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({
        methodResponses: [
          ["Thread/get", { accountId: "acc", list: [{ id: "thread-1", emailIds: ["e1", "e2"] }] }, "0"],
          ["Email/get", {
            accountId: "acc",
            list: [
              { id: "e1", threadId: "thread-1", mailboxIds: {}, receivedAt: "2024-01-01T00:00:00Z" },
              { id: "e2", threadId: "thread-1", mailboxIds: {}, receivedAt: "2024-02-01T00:00:00Z" },
            ],
          }, "1"],
        ],
      }), { status: 200 });
    },
  }));

  const emails = await mail.getThreadEmails(AccountId.of("acc"), "thread-1");

  assert.deepEqual(emails.map((email) => email.id), ["e2", "e1"]);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].methodCalls[1][1], {
    accountId: "acc",
    "#ids": { resultOf: "0", name: "Thread/get", path: "/list/*/emailIds" },
  });
});

test("JmapMail.updateKeywords surfaces set errors", async () => {
  const mail = new JmapMail(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async () =>
      new Response(
        JSON.stringify({
          methodResponses: [["Email/set", { accountId: "acc", notUpdated: { "email-1": { description: "nope" } } }, "0"]],
        }),
        { status: 200 },
      ),
  }));

  await assert.rejects(
    () => mail.updateKeywords(AccountId.of("acc"), "email-1", { "$seen": true }),
    /nope/,
  );
});
