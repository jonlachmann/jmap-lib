import test from "node:test";
import assert from "node:assert/strict";

import type {
  AddressBookMutable,
  AddressBookUpdate,
  CalendarEventMutable,
  CalendarEventUpdate,
  CalendarMutable,
  CalendarUpdate,
  ContactCardMutable,
  ContactCardUpdate,
  EmailMutable,
  EmailUpdate,
  IdentityMutable,
  IdentityUpdate,
  NoteBookMutable,
  NoteBookUpdate,
  NoteMutable,
  NoteUpdate,
  SieveScriptMutable,
  SieveScriptUpdate,
  TaskListMutable,
  TaskListUpdate,
  TaskMutable,
  TaskUpdate,
  VacationResponseMutable,
  VacationResponseUpdate,
} from "jmap-lib";

// Whole properties are a patch too (RFC 8620 5.3): changes a caller holds as the mutable shape, not written out as a
// literal, are an update as they are.
const asUpdates = {
  addressBook: (changes: AddressBookMutable): AddressBookUpdate => changes,
  calendar: (changes: CalendarMutable): CalendarUpdate => changes,
  calendarEvent: (changes: CalendarEventMutable): CalendarEventUpdate => changes,
  contactCard: (changes: ContactCardMutable): ContactCardUpdate => changes,
  email: (changes: EmailMutable): EmailUpdate => changes,
  identity: (changes: IdentityMutable): IdentityUpdate => changes,
  noteBook: (changes: NoteBookMutable): NoteBookUpdate => changes,
  note: (changes: NoteMutable): NoteUpdate => changes,
  sieveScript: (changes: SieveScriptMutable): SieveScriptUpdate => changes,
  taskList: (changes: TaskListMutable): TaskListUpdate => changes,
  task: (changes: TaskMutable): TaskUpdate => changes,
  vacationResponse: (changes: VacationResponseMutable): VacationResponseUpdate => changes,
};

test("changes held as the mutable shape are an update", () => {
  const changes: ContactCardMutable = { kind: "group", members: { "ADA-1": true } };
  const update = asUpdates.contactCard(changes);

  assert.deepEqual(update, { kind: "group", members: { "ADA-1": true } });
});

test("a patch built one path at a time keeps each path's type", () => {
  const patch: ContactCardUpdate = {};
  for (const member of ["ADA-1", "BOB-2"]) patch[`members/${member}` as const] = true;
  patch["members/CAROL-3"] = null;

  assert.deepEqual(patch, { "members/ADA-1": true, "members/BOB-2": true, "members/CAROL-3": null });
});

test("what isn't a valid update stays refused", () => {
  const refused: unknown[] = [];

  // @ts-expect-error a property the type doesn't have
  refused.push({ membres: { "ADA-1": true } } satisfies ContactCardUpdate);
  // @ts-expect-error a path under a property the type doesn't have
  refused.push({ "membrs/ADA-1": true } satisfies ContactCardUpdate);
  // @ts-expect-error a path's value of the wrong type
  refused.push({ "members/ADA-1": "yes" } satisfies ContactCardUpdate);
  // @ts-expect-error a whole property of the wrong type
  refused.push({ members: { "ADA-1": "yes" } } satisfies ContactCardUpdate);
  // @ts-expect-error a path into a property that holds no keys
  refused.push({ "kind/group": "group" } satisfies ContactCardUpdate);
  // @ts-expect-error a value outside the property's union
  refused.push({ kind: "robot" } satisfies ContactCardUpdate);
  // @ts-expect-error an email's keyword set as a string
  refused.push({ "keywords/$seen": "true" } satisfies EmailUpdate);
  // @ts-expect-error mailbox ids given as a list
  refused.push({ mailboxIds: ["inbox"] } satisfies EmailUpdate);
  // @ts-expect-error an event's title set to a number
  refused.push({ title: 1 } satisfies CalendarEventUpdate);

  // Values not written as literals are checked too
  const wrongPathValue = { "members/ADA-1": "yes" as string };
  // @ts-expect-error a held value with a path of the wrong type
  refused.push(((): ContactCardUpdate => wrongPathValue)());
  const wrongWhole = { members: { "ADA-1": "yes" } };
  // @ts-expect-error a held value with a whole property of the wrong type
  refused.push(((): ContactCardUpdate => wrongWhole)());
  const sneaky: ContactCardMutable & { "members/ADA-1": string } = { "members/ADA-1": "yes" };
  // @ts-expect-error the mutable shape widened with a path of the wrong type
  refused.push(((): ContactCardUpdate => sneaky)());
  const badPatch: ContactCardUpdate = {};
  // @ts-expect-error a path one at a time under a property the type doesn't have
  badPatch[`membrs/${"ADA-1"}` as const] = true;
  // @ts-expect-error a path one at a time with a value of the wrong type
  badPatch[`members/${"ADA-1"}` as const] = "yes";

  assert.equal(refused.length, 12);
});
