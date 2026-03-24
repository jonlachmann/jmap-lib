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
  JMAP_SIEVE_CAPABILITY,
  JMAP_SUBMISSION_CAPABILITY,
  JMAP_VACATION_RESPONSE_CAPABILITY,
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
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core", JMAP_CONTACTS_CAPABILITY],
    fetch: async () => new Response(JSON.stringify({ methodResponses: [] }), { status: 200 }),
  });

  assert.deepEqual(client.getCapabilities(), ["urn:ietf:params:jmap:core", JMAP_CONTACTS_CAPABILITY]);
  assert.equal(client.hasCapability(JMAP_CONTACTS_CAPABILITY), true);
  assert.equal(client.hasCapability(JMAP_CALENDARS_CAPABILITY), false);
});

test("JmapQuota.get delegates to Quota/get", async () => {
  let using: string[] | undefined;
  const quota = new JmapQuota(new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      using = body.using;
      return new Response(
        JSON.stringify({
          methodResponses: [["Quota/get", { accountId: "acc", list: [{ used: 1, hardLimit: 10 }] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const response = await quota.get(AccountId.of("acc"));

  assert.equal(response.list[0].used, 1);
  assert.deepEqual(using, ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"]);
});

test("JmapIdentities.list uses submission capabilities", async () => {
  let using: string[] | undefined;
  const identities = new JmapIdentities(new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
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

test("JmapVacation.get uses vacation capabilities", async () => {
  let using: string[] | undefined;
  const vacation = new JmapVacation(new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
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

test("JmapContacts.listAddressBooks uses contacts capabilities", async () => {
  let using: string[] | undefined;
  const contacts = new JmapContacts(new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
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

  const result = await contacts.listAddressBooks(AccountId.of("acc"));

  assert.equal(result[0].id, "ab1");
  assert.deepEqual(using, [...CORE_CONTACTS_CAPABILITIES]);
});

test("JmapCalendars.list uses calendar capabilities", async () => {
  let using: string[] | undefined;
  const calendars = new JmapCalendars(new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
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

  const result = await calendars.list(AccountId.of("acc"));

  assert.equal(result[0].id, "cal1");
  assert.deepEqual(using, [...CORE_CALENDARS_CAPABILITIES]);
});

test("JmapCalendars.parse uses calendars parse capabilities", async () => {
  let using: string[] | undefined;
  const calendars = new JmapCalendars(new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
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
    accessToken: "secret",
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
    accessToken: "secret",
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

test("JmapMail.getThreadEmails sorts newest first", async () => {
  const responses = [
    {
      methodResponses: [["Thread/get", { accountId: "acc", list: [{ id: "thread-1", emailIds: ["e1", "e2"] }] }, "0"]],
    },
    {
      methodResponses: [["Email/get", {
        accountId: "acc",
        list: [
          { id: "e1", threadId: "thread-1", mailboxIds: {}, receivedAt: "2024-01-01T00:00:00Z" },
          { id: "e2", threadId: "thread-1", mailboxIds: {}, receivedAt: "2024-02-01T00:00:00Z" },
        ],
      }, "0"]],
    },
  ];

  const mail = new JmapMail(new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async () => new Response(JSON.stringify(responses.shift()), { status: 200 }),
  }));

  const emails = await mail.getThreadEmails(AccountId.of("acc"), "thread-1");

  assert.deepEqual(emails.map((email) => email.id), ["e2", "e1"]);
});

test("JmapMail.updateKeywords surfaces set errors", async () => {
  const mail = new JmapMail(new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
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
