import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  BlobGet,
  CallId,
  CORE_TASKS_CAPABILITIES,
  CoreEcho,
  EmailSubmissionQueryChanges,
  JmapCalendars,
  JmapClient,
  JmapMail,
  JmapPrincipals,
  JmapSetRefusedError,
  JmapSieve,
  JmapTasks,
  PrincipalQueryChanges,
  ShareNotificationQueryChanges,
  type BlobGetResponse,
  type JmapCoreCapability,
  type JmapSession,
} from "jmap-lib";

type Call = [string, Record<string, unknown>, string];

// Records each request's method calls and answers every call with the given arguments, under its own name.
function recordingClient(answer: (call: Call) => Record<string, unknown> = () => ({}), limits?: Partial<JmapCoreCapability>) {
  const requests: Call[][] = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer token",
    capabilities: ["urn:ietf:params:jmap:core"],
    session: limits && ({ apiUrl: "https://example.test/jmap", capabilities: { "urn:ietf:params:jmap:core": limits } } as unknown as JmapSession),
    fetch: async (_url, init) => {
      const calls = JSON.parse(String(init?.body)).methodCalls as Call[];
      requests.push(calls);
      return new Response(JSON.stringify({ methodResponses: calls.map((call) => [call[0], answer(call), call[2]]) }));
    },
  });
  return { client, requests };
}

const acc = AccountId.of("acc");

test("JmapSieve.deactivate asks for onSuccessDeactivateScript (RFC 9661)", async () => {
  const { client, requests } = recordingClient(() => ({ accountId: "acc", newState: "s" }));
  await new JmapSieve(client).deactivate(acc);
  assert.equal(requests[0][0][1].onSuccessDeactivateScript, true);
  assert.equal("onSuccessActivateScript" in requests[0][0][1], false);
});

test("JmapCalendars.destroy can remove the calendar's events with it", async () => {
  const { client, requests } = recordingClient(() => ({ accountId: "acc", newState: "s", destroyed: ["c1"] }));
  await new JmapCalendars(client).destroy(acc, "c1", true);
  assert.equal(requests[0][0][1].onDestroyRemoveEvents, true);
});

test("JmapCalendars.listEventInstances sorts by start", async () => {
  const { client, requests } = recordingClient(([name]) => name === "CalendarEvent/query" ? { ids: [] } : { list: [] });
  await new JmapCalendars(client).listEventInstances(acc, "2026-01-01T00:00:00", "2026-02-01T00:00:00");
  assert.deepEqual(requests[0][0][1].sort, [{ property: "start" }]);
});

test("JmapBatch can't be sent twice", async () => {
  const { client, requests } = recordingClient();
  const batch = client.batch();
  batch.call(new CoreEcho({}), CallId.of("e"));
  await batch.send();
  await assert.rejects(() => batch.send(), /sent already/);
  assert.equal(requests.length, 1);
});

test("A throwing response observer doesn't keep the response from the caller", async () => {
  const heard: unknown[] = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer token",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async () => new Response(JSON.stringify({ methodResponses: [["Core/echo", { hello: true }, "0"]] })),
    onResponse: () => { throw new Error("cache failed"); },
    onObserverError: (error) => heard.push(error),
  });
  assert.deepEqual(await client.invoke(new CoreEcho({ hello: true })), { hello: true });
  assert.equal(heard.length, 1);
});

test("JmapCalendars.listEvents asks for several calendars as an OR of inCalendar", async () => {
  const { client, requests } = recordingClient(([name]) => name === "CalendarEvent/query" ? { ids: [] } : { list: [] });
  const calendars = new JmapCalendars(client);
  await calendars.listEvents(acc, ["c1"]);
  await calendars.listEvents(acc, ["c1", "c2"]);
  assert.deepEqual(requests[0][0][1].filter, { inCalendar: "c1" });
  assert.deepEqual(requests[1][0][1].filter, { operator: "OR", conditions: [{ inCalendar: "c1" }, { inCalendar: "c2" }] });
});

test("JmapTasks fetches an extension's properties only for an account that has it", async () => {
  const requests: Call[][] = [];
  const session = {
    apiUrl: "https://example.test/jmap",
    capabilities: { "urn:ietf:params:jmap:core": {}, "urn:ietf:params:jmap:tasks:recurrences": {} },
    accounts: {
      own: { accountCapabilities: { "urn:ietf:params:jmap:tasks": {}, "urn:ietf:params:jmap:tasks:recurrences": {} } },
      shared: { accountCapabilities: { "urn:ietf:params:jmap:tasks": {} } },
    },
  } as unknown as JmapSession;
  const client = new JmapClient({
    endpoint: session.apiUrl,
    authorization: "Bearer token",
    capabilities: Object.keys(session.capabilities),
    session,
    fetch: async (_url, init) => {
      const calls = JSON.parse(String(init?.body)).methodCalls as Call[];
      requests.push(calls);
      return new Response(JSON.stringify({ methodResponses: calls.map((call) => [call[0], { list: [] }, call[2]]) }));
    },
  });
  const tasks = new JmapTasks(client);
  await tasks.getTasks(AccountId.of("own"), ["t1"]);
  await tasks.getTasks(AccountId.of("shared"), ["t1"]);
  assert.ok((requests[0][0][1].properties as string[]).includes("recurrenceOverrides"));
  assert.ok(!(requests[1][0][1].properties as string[]).includes("recurrenceOverrides"));
});

test("JmapTasks names the extensions the account has in using, as it asks for their properties", async () => {
  const usings: string[][] = [];
  const session = {
    apiUrl: "https://example.test/jmap",
    capabilities: { "urn:ietf:params:jmap:core": {}, "urn:ietf:params:jmap:tasks": {} },
    accounts: {
      own: { accountCapabilities: { "urn:ietf:params:jmap:tasks": {}, "urn:ietf:params:jmap:tasks:recurrences": {} } },
    },
  } as unknown as JmapSession;
  const client = new JmapClient({
    endpoint: session.apiUrl,
    authorization: "Bearer token",
    capabilities: [...CORE_TASKS_CAPABILITIES],
    session,
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { using: string[]; methodCalls: Call[] };
      usings.push(body.using);
      return new Response(JSON.stringify({ methodResponses: body.methodCalls.map((call) => [call[0], { list: [] }, call[2]]) }));
    },
  });
  await new JmapTasks(client).getTasks(AccountId.of("own"), ["t1"]);
  assert.ok(usings[0].includes("urn:ietf:params:jmap:tasks:recurrences"));
});

test("listEvents and listTasks with no ids ask for nothing; without the argument they list all", async () => {
  const { client, requests } = recordingClient(([name]) => name.endsWith("/query") ? { ids: [] } : { list: [] });
  assert.deepEqual(await new JmapCalendars(client).listEvents(acc, []), []);
  assert.deepEqual(await new JmapTasks(client).listTasks(acc, []), []);
  assert.equal(requests.length, 0);
  await new JmapCalendars(client).listEvents(acc);
  assert.equal(requests[0][0][1].filter, undefined);
});

test("JmapMail.destroyMany splits by maxObjectsInSet and answers with every request's results", async () => {
  const { client, requests } = recordingClient(([, args]) => ({
    accountId: "acc", oldState: `s${requests.length - 1}`, newState: `s${requests.length}`, destroyed: args.destroy,
  }), { maxObjectsInSet: 2 });
  const response = await new JmapMail(client).destroyMany(acc, ["e1", "e2", "e3"]);
  assert.deepEqual(requests.map((calls) => calls[0][1].destroy), [["e1", "e2"], ["e3"]]);
  assert.deepEqual(response.destroyed, ["e1", "e2", "e3"]);
  assert.equal(response.oldState, "s0");
  assert.equal(response.newState, "s2");
});

test("BlobGet asks for data, digests and a range (RFC 9404 4.2)", async () => {
  const { client, requests } = recordingClient(() => ({ accountId: "acc", list: [{ id: "B1", "data:asText": "quick bro", "digest:sha": "Qi", size: 45 }], notFound: [] }));
  const response = await client.invoke<unknown, BlobGetResponse>(new BlobGet({
    accountId: "acc",
    ids: ["B1"],
    properties: ["data:asText", "digest:sha", "size"],
    offset: 4,
    length: 9,
  }));
  assert.deepEqual(requests[0][0], ["Blob/get", { accountId: "acc", ids: ["B1"], properties: ["data:asText", "digest:sha", "size"], offset: 4, length: 9 }, "0"]);
  assert.equal(response.list[0]["digest:sha"], "Qi");
});

test("JmapMail.copyEmail names the email it copies and the account it comes from (RFC 8621 4.7)", async () => {
  const { client, requests } = recordingClient(() => ({
    fromAccountId: "other", accountId: "acc", oldState: "1", newState: "2",
    created: { new: { id: "E2", blobId: "B", threadId: "T", size: 10 } },
  }));
  const copied = await new JmapMail(client).copyEmail(acc, AccountId.of("other"), "E1", { mailboxIds: { inbox: true } }, { onSuccessDestroyOriginal: true });

  assert.equal(copied.id, "E2");
  assert.equal(requests[0][0][0], "Email/copy");
  assert.deepEqual(requests[0][0][1], {
    fromAccountId: "other",
    accountId: "acc",
    create: { new: { mailboxIds: { inbox: true }, id: "E1" } },
    onSuccessDestroyOriginal: true,
  });
});

test("JmapMail.importEmail sends the blob as an EmailImport and throws the server's refusal (RFC 8621 4.8)", async () => {
  const { client, requests } = recordingClient(() => ({ accountId: "acc", oldState: "1", newState: "2", created: { new: { id: "E1", blobId: "B1", threadId: "T", size: 3 } } }));
  const mail = new JmapMail(client);
  const imported = await mail.importEmail(acc, { blobId: "B1", mailboxIds: { inbox: true }, keywords: { $seen: true } });

  assert.equal(imported.id, "E1");
  assert.equal(requests[0][0][0], "Email/import");
  assert.deepEqual(requests[0][0][1].emails, { new: { blobId: "B1", mailboxIds: { inbox: true }, keywords: { $seen: true } } });

  const refusing = recordingClient(() => ({ accountId: "acc", oldState: "1", newState: "1", notCreated: { new: { type: "alreadyExists", existingId: "E0" } } }));
  await assert.rejects(() => new JmapMail(refusing.client).importEmail(acc, { blobId: "B1", mailboxIds: { inbox: true } }), (error: unknown) =>
    error instanceof JmapSetRefusedError && error.setError.existingId === "E0");
});

test("JmapMail.listSubmissions queries and gets in one request, naming submission (RFC 8621 7.3)", async () => {
  const { client, requests } = recordingClient(([name]) => name === "EmailSubmission/query"
    ? { ids: ["S1"] }
    : { list: [{ id: "S1", identityId: "I", emailId: "E", undoStatus: "pending" }], notFound: [] });
  const submissions = await new JmapMail(client).listSubmissions(acc, { undoStatus: "pending" }, { sort: [{ property: "sendAt", isAscending: false }] });

  assert.equal(submissions[0].undoStatus, "pending");
  assert.deepEqual(requests[0].map(([name]) => name), ["EmailSubmission/query", "EmailSubmission/get"]);
  assert.deepEqual(requests[0][0][1].filter, { undoStatus: "pending" });
  assert.deepEqual(requests[0][1][1]["#ids"], { resultOf: "0", name: "EmailSubmission/query", path: "/ids" });
});

test("JmapMail cancels a submission by its undoStatus and destroys one (RFC 8621 7.5)", async () => {
  const { client, requests } = recordingClient(() => ({ accountId: "acc", oldState: "1", newState: "2" }));
  const mail = new JmapMail(client);
  await mail.cancelSubmission(acc, "S1");
  await mail.destroySubmission(acc, "S1");

  assert.deepEqual(requests[0][0][1].update, { S1: { undoStatus: "canceled" } });
  assert.deepEqual(requests[1][0][1].destroy, ["S1"]);
  assert.equal(requests[1][0][0], "EmailSubmission/set");

  const refusing = recordingClient(() => ({ accountId: "acc", oldState: "1", newState: "1", notUpdated: { S1: { type: "cannotUnsend" } } }));
  await assert.rejects(() => new JmapMail(refusing.client).cancelSubmission(acc, "S1"), JmapSetRefusedError);
});

test("JmapMail.getSubmissions and getSubmissionChanges name their methods", async () => {
  const { client, requests } = recordingClient(() => ({ list: [], notFound: [] }));
  const mail = new JmapMail(client);
  await mail.getSubmissions(acc, ["S1"]);
  await mail.getSubmissionChanges(acc, "s1", { maxChanges: 5 });

  assert.deepEqual(requests[0][0], ["EmailSubmission/get", { accountId: "acc", ids: ["S1"] }, "0"]);
  assert.deepEqual(requests[1][0], ["EmailSubmission/changes", { accountId: "acc", sinceState: "s1", maxChanges: 5 }, "0"]);
  assert.equal(new EmailSubmissionQueryChanges({ accountId: "acc", sinceQueryState: "q" }).methodName, "EmailSubmission/queryChanges");
});

test("JmapPrincipals lists share notifications newest first and dismisses them by destroying (RFC 9670 3)", async () => {
  const notification = {
    id: "N1", created: "2026-01-01T00:00:00Z", changedBy: { name: "Ann", email: null, principalId: "P1" },
    objectType: "Calendar", objectAccountId: "acc2", objectId: "C1", oldRights: null, newRights: { mayRead: true }, name: "Team",
  };
  const { client, requests } = recordingClient(([name]) => name === "ShareNotification/query"
    ? { ids: ["N1"] }
    : name === "ShareNotification/get" ? { list: [notification], notFound: [] } : { accountId: "acc", oldState: "1", newState: "2", destroyed: ["N1"] });
  const principals = new JmapPrincipals(client);
  const listed = await principals.listShareNotifications(acc, { objectType: "Calendar" });
  await principals.dismissShareNotifications(acc, ["N1"]);

  assert.equal(listed[0].objectId, "C1");
  assert.deepEqual(requests[0][0][1].sort, [{ property: "created", isAscending: false }]);
  assert.deepEqual(requests[0][0][1].filter, { objectType: "Calendar" });
  assert.deepEqual(requests[0][1][1]["#ids"], { resultOf: "0", name: "ShareNotification/query", path: "/ids" });
  assert.deepEqual(requests[1][0], ["ShareNotification/set", { accountId: "acc", destroy: ["N1"] }, "0"]);
  assert.equal(new ShareNotificationQueryChanges({ accountId: "acc", sinceQueryState: "q" }).methodName, "ShareNotification/queryChanges");
});

test("JmapPrincipals.update patches a principal and throws a forbidden refusal (RFC 9670 2.3)", async () => {
  const { client, requests } = recordingClient(() => ({ accountId: "acc", oldState: "1", newState: "2", updated: { P1: null } }));
  const principals = new JmapPrincipals(client);
  await principals.update(acc, "P1", { name: "Ann B", timeZone: "Europe/Stockholm" });
  await principals.getChanges(acc, "s1");
  await principals.queryChanges(acc, "q1", { type: "location" });

  assert.deepEqual(requests[0][0], ["Principal/set", { accountId: "acc", update: { P1: { name: "Ann B", timeZone: "Europe/Stockholm" } } }, "0"]);
  assert.deepEqual(requests[1][0], ["Principal/changes", { accountId: "acc", sinceState: "s1" }, "0"]);
  assert.deepEqual(requests[2][0], ["Principal/queryChanges", { accountId: "acc", sinceQueryState: "q1", filter: { type: "location" } }, "0"]);
  assert.equal(new PrincipalQueryChanges({ accountId: "acc", sinceQueryState: "q" }).methodName, "Principal/queryChanges");

  const refusing = recordingClient(() => ({ accountId: "acc", oldState: "1", newState: "1", notUpdated: { P1: { type: "forbidden" } } }));
  await assert.rejects(() => new JmapPrincipals(refusing.client).update(acc, "P1", { name: "x" }), JmapSetRefusedError);
});

test("JmapCalendars creates a participant identity as the default with onSuccessSetIsDefault (draft-ietf-jmap-calendars-34 3.3)", async () => {
  const { client, requests } = recordingClient(([name]) => name === "ParticipantIdentity/set"
    ? { accountId: "acc", oldState: "1", newState: "2", created: { new: { id: "PI1", isDefault: true } } }
    : { accountId: "acc", oldState: "1", newState: "2", hasMoreChanges: false, created: [], updated: [], destroyed: [] });
  const calendars = new JmapCalendars(client);
  const created = await calendars.createParticipantIdentity(acc, { name: "Ann", calendarAddress: "mailto:ann@example.com" }, { isDefault: true });
  await calendars.updateParticipantIdentity(acc, "PI1", { name: "Ann B" });
  await calendars.setDefaultParticipantIdentity(acc, "PI1");
  await calendars.destroyParticipantIdentity(acc, "PI1");
  await calendars.getParticipantIdentityChanges(acc, "s1");

  assert.equal(created.id, "PI1");
  assert.deepEqual(requests[0][0][1], {
    accountId: "acc",
    create: { new: { name: "Ann", calendarAddress: "mailto:ann@example.com" } },
    onSuccessSetIsDefault: "#new",
  });
  assert.deepEqual(requests[1][0][1].update, { PI1: { name: "Ann B" } });
  assert.deepEqual(requests[2][0][1], { accountId: "acc", onSuccessSetIsDefault: "PI1" });
  assert.deepEqual(requests[3][0][1].destroy, ["PI1"]);
  assert.deepEqual(requests[4][0], ["ParticipantIdentity/changes", { accountId: "acc", sinceState: "s1" }, "0"]);
});
