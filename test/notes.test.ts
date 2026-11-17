import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  CORE_NOTES_CAPABILITIES,
  JMAP_NOTES_CAPABILITY,
  JmapClient,
  JmapNotes,
  NoteBookChanges,
  NoteBookGet,
  NoteBookSet,
  NoteChanges,
  NoteCopy,
  NoteGet,
  NoteQuery,
  NoteQueryChanges,
  NoteSet,
} from "jmap-lib";

// Captures every request body and replies with the given method responses.
function createRecordingClient(methodResponses: unknown[][]) {
  const requests: { using: string[]; methodCalls: [string, Record<string, unknown>, string][] }[] = [];
  const client = new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({ methodResponses: methodResponses.map((r, i) => [...r, String(i)]) }),
        { status: 200 },
      );
    },
  });
  return { notes: new JmapNotes(client), requests };
}

const acc = AccountId.of("acc");

// --- Capability constants ---

test("notes capability uses the private URI", () => {
  assert.equal(JMAP_NOTES_CAPABILITY, "urn:x-jmap-lib:notes");
  assert.deepEqual([...CORE_NOTES_CAPABILITIES], ["urn:ietf:params:jmap:core", "urn:x-jmap-lib:notes"]);
});

// --- Method classes ---

test("method classes have spec method names", () => {
  assert.equal(NoteBookGet.all(acc).methodName, "NoteBook/get");
  assert.equal(new NoteBookChanges({ accountId: "acc", sinceState: "s" }).methodName, "NoteBook/changes");
  assert.equal(new NoteBookSet({ accountId: "acc" }).methodName, "NoteBook/set");
  assert.equal(NoteGet.byIds(acc, ["n1"]).methodName, "Note/get");
  assert.equal(new NoteChanges({ accountId: "acc", sinceState: "s" }).methodName, "Note/changes");
  assert.equal(new NoteSet({ accountId: "acc" }).methodName, "Note/set");
  assert.equal(new NoteCopy({ fromAccountId: "a", accountId: "b", create: {} }).methodName, "Note/copy");
  assert.equal(new NoteQuery({ accountId: "acc" }).methodName, "Note/query");
  assert.equal(new NoteQueryChanges({ accountId: "acc", sinceQueryState: "q" }).methodName, "Note/queryChanges");
});

test("NoteGet.byQueryResult references Note/query ids", () => {
  const method = NoteGet.byQueryResult(acc, { value: "c0" } as never, ["title"]);
  assert.deepEqual(method.arguments, {
    accountId: "acc",
    "#ids": { resultOf: "c0", name: "Note/query", path: "/ids" },
    properties: ["title"],
  });
});

// --- JmapNotes convenience client ---

test("getNoteBooks sends notes capabilities", async () => {
  const { notes, requests } = createRecordingClient([
    ["NoteBook/get", { accountId: "acc", list: [{ id: "nb1", name: "Notes", role: "inbox" }] }],
  ]);

  const result = (await notes.getNoteBooks(acc)).list;

  assert.equal(result[0].role, "inbox");
  assert.deepEqual(requests[0].using, [...CORE_NOTES_CAPABILITIES]);
});

test("destroyNoteBook passes onDestroyRemoveNotes and surfaces noteBookHasNote", async () => {
  const { notes, requests } = createRecordingClient([
    ["NoteBook/set", {
      accountId: "acc",
      notDestroyed: { nb1: { type: "noteBookHasNote", description: "notebook not empty" } },
    }],
  ]);

  await assert.rejects(() => notes.destroyNoteBook(acc, "nb1", false), /notebook not empty/);
  assert.equal(requests[0].methodCalls[0][1].onDestroyRemoveNotes, false);
});

test("createNote returns the created id", async () => {
  const { notes, requests } = createRecordingClient([
    ["Note/set", { accountId: "acc", created: { new: { id: "note-1" } } }],
  ]);

  const id = (await notes.createNote(acc, {
    noteBookId: "nb1",
    title: "Shopping",
    description: "<p>Milk</p>",
    descriptionContentType: "text/html",
  })).id;

  assert.equal(id, "note-1");
  assert.deepEqual(requests[0].methodCalls[0][1].create, {
    new: { noteBookId: "nb1", title: "Shopping", description: "<p>Milk</p>", descriptionContentType: "text/html" },
  });
});

test("createNote throws on SetError", async () => {
  const { notes } = createRecordingClient([
    ["Note/set", { accountId: "acc", notCreated: { new: { type: "alreadyExists", description: "uid exists" } } }],
  ]);

  await assert.rejects(() => notes.createNote(acc, { noteBookId: "nb1", uid: "u1" }), /uid exists/);
});

test("setFlagged patches the $flagged keyword", async () => {
  const { notes, requests } = createRecordingClient([
    ["Note/set", { accountId: "acc", updated: { n1: null } }],
    ["Note/set", { accountId: "acc", updated: { n1: null } }],
  ]);

  await notes.setFlagged(acc, "n1", true);
  await notes.setFlagged(acc, "n1", false);

  assert.deepEqual(requests[0].methodCalls[0][1].update, { n1: { "keywords/$flagged": true } });
  assert.deepEqual(requests[1].methodCalls[0][1].update, { n1: { "keywords/$flagged": null } });
});

test("moveNote updates noteBookId", async () => {
  const { notes, requests } = createRecordingClient([
    ["Note/set", { accountId: "acc", updated: { n1: null } }],
  ]);

  await notes.moveNote(acc, "n1", "trash");
  assert.deepEqual(requests[0].methodCalls[0][1].update, { n1: { noteBookId: "trash" } });
});

test("queryNotes sends hasKeyword sort with keyword", async () => {
  const { notes, requests } = createRecordingClient([
    ["Note/query", { accountId: "acc", ids: ["n1"], position: 0 }],
    ["Note/get", { accountId: "acc", list: [{ id: "n1", noteBookId: "nb1" }] }],
  ]);

  const result = await notes.queryNotes(acc, { inNoteBook: "nb1", text: "milk" }, {
    sort: [{ property: "hasKeyword", keyword: "$flagged", isAscending: false }],
  });

  assert.equal(result[0].id, "n1");
  const queryArgs = requests[0].methodCalls[0][1];
  assert.deepEqual(queryArgs.filter, { inNoteBook: "nb1", text: "milk" });
  assert.deepEqual(queryArgs.sort, [{ property: "hasKeyword", keyword: "$flagged", isAscending: false }]);
});

test("listNotes filters by notebook", async () => {
  const { notes, requests } = createRecordingClient([
    ["Note/query", { accountId: "acc", ids: ["n1"], position: 0, total: 1 }],
    ["Note/get", { accountId: "acc", list: [{ id: "n1", noteBookId: "nb1", title: "A" }] }],
  ]);

  const result = await notes.listNotes(acc, "nb1");

  assert.equal(result[0].title, "A");
  assert.deepEqual(requests[0].methodCalls[0][1].filter, { inNoteBook: "nb1" });
});

test("copyNote sends source id and returns new id", async () => {
  const { notes, requests } = createRecordingClient([
    ["Note/copy", { fromAccountId: "src", accountId: "acc", created: { new: { id: "n-copy" } } }],
  ]);

  const { id } = await notes.copyNote(acc, AccountId.of("src"), { id: "n1", noteBookId: "nb1" });

  assert.equal(id, "n-copy");
  assert.deepEqual(requests[0].methodCalls[0][1].create, { new: { id: "n1", noteBookId: "nb1" } });
});
