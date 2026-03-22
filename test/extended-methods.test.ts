import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  CalendarEventGet,
  ContactCardGet,
  CORE_CALENDARS_CAPABILITIES,
  CORE_CONTACTS_CAPABILITIES,
  EmailSubmissionSet,
  JmapClient,
  SieveScriptSet,
} from "jmap-lib";

test("JmapClient can override capabilities for a request", async () => {
  const requests: Array<{ body: unknown }> = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    accessToken: "secret",
    capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    fetch: async (_url, init) => {
      requests.push({ body: JSON.parse(String(init?.body)) });
      return new Response(
        JSON.stringify({
          methodResponses: [["Calendar/get", { accountId: "acc", list: [] }, "0"]],
        }),
        { status: 200 },
      );
    },
  });

  await client.invoke(
    { methodName: "Calendar/get", arguments: { accountId: "acc" } },
    { capabilities: CORE_CALENDARS_CAPABILITIES },
  );

  assert.deepEqual((requests[0].body as { using: string[] }).using, [...CORE_CALENDARS_CAPABILITIES]);
});

test("ContactCardGet.byQueryResult encapsulates contact query result references", () => {
  const method = ContactCardGet.byQueryResult(AccountId.of("acc"), { value: "q1" } as never);

  assert.deepEqual(method.arguments, {
    accountId: "acc",
    "#ids": {
      resultOf: "q1",
      name: "ContactCard/query",
      path: "/ids",
    },
  });
});

test("CalendarEventGet.byQueryResult encapsulates calendar event query result references", () => {
  const method = CalendarEventGet.byQueryResult(AccountId.of("acc"), { value: "q2" } as never, ["id", "title"]);

  assert.deepEqual(method.arguments, {
    accountId: "acc",
    "#ids": {
      resultOf: "q2",
      name: "CalendarEvent/query",
      path: "/ids",
    },
    properties: ["id", "title"],
  });
});

test("EmailSubmissionSet preserves submission creation payloads", () => {
  const method = new EmailSubmissionSet({
    accountId: "acc",
    create: {
      submission: {
        emailId: "email-1",
        identityId: "ident-1",
      },
    },
  });

  assert.deepEqual(method.arguments.create?.submission, {
    emailId: "email-1",
    identityId: "ident-1",
  });
});

test("SieveScriptSet supports activation hooks", () => {
  const method = new SieveScriptSet({
    accountId: "acc",
    create: {
      script: {
        name: "test",
        blobId: "blob-1",
      },
    },
    onSuccessActivateScript: "#script",
  });

  assert.equal(method.arguments.onSuccessActivateScript, "#script");
});
