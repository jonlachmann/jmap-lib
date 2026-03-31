import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  CalendarEventQueryChanges,
  ContactCardQueryChanges,
  EmailQueryChanges,
  type JmapQueryAddedItem,
  type JmapQueryChangesArgs,
} from "jmap-lib";

test("JmapQueryChangesArgs models the shared RFC queryChanges arguments", () => {
  const args: JmapQueryChangesArgs<{ text?: string }, { property: "name"; isAscending?: boolean }> = {
    accountId: "acc",
    filter: { text: "alice" },
    sort: [{ property: "name", isAscending: true }],
    sinceQueryState: "query-state-1",
    maxChanges: 20,
    upToId: "item-10",
    calculateTotal: true,
  };

  assert.equal(args.sinceQueryState, "query-state-1");
  assert.equal(args.maxChanges, 20);
  assert.equal(args.upToId, "item-10");
});

test("JmapQueryAddedItem models ids added to a query result", () => {
  const item: JmapQueryAddedItem = {
    id: "item-1",
    index: 2,
  };

  assert.equal(item.id, "item-1");
  assert.equal(item.index, 2);
});

test("EmailQueryChanges preserves shared queryChanges arguments", () => {
  const method = new EmailQueryChanges({
    accountId: AccountId.of("acc").value,
    filter: { text: "invoice" },
    sort: [{ property: "receivedAt", isAscending: false }],
    sinceQueryState: "qs1",
    maxChanges: 50,
    calculateTotal: true,
  });

  assert.equal(method.methodName, "Email/queryChanges");
  assert.equal(method.arguments.sinceQueryState, "qs1");
  assert.equal(method.arguments.maxChanges, 50);
});

test("ContactCardQueryChanges preserves shared queryChanges arguments", () => {
  const method = new ContactCardQueryChanges({
    accountId: AccountId.of("acc").value,
    filter: { text: "alice" },
    sinceQueryState: "qs2",
  });

  assert.equal(method.methodName, "ContactCard/queryChanges");
  assert.equal(method.arguments.sinceQueryState, "qs2");
});

test("CalendarEventQueryChanges preserves shared queryChanges arguments", () => {
  const method = new CalendarEventQueryChanges({
    accountId: AccountId.of("acc").value,
    filter: { text: "planning" },
    sinceQueryState: "qs3",
    upToId: "event-10",
  });

  assert.equal(method.methodName, "CalendarEvent/queryChanges");
  assert.equal(method.arguments.upToId, "event-10");
});
