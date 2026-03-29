import test from "node:test";
import assert from "node:assert/strict";

import {
  CalendarEventSet,
  type JmapSetArgs,
} from "jmap-lib";

test("JmapSetArgs models the shared RFC set arguments", () => {
  const args: JmapSetArgs<{ name: string }, { name?: string }> = {
    accountId: "acc",
    ifInState: "state-1",
    create: {
      c1: { name: "Created" },
    },
    update: {
      existing: { name: "Updated" },
    },
    destroy: ["obsolete"],
  };

  assert.equal(args.accountId, "acc");
  assert.equal(args.ifInState, "state-1");
  assert.equal(args.create?.c1.name, "Created");
  assert.equal(args.update?.existing.name, "Updated");
  assert.deepEqual(args.destroy, ["obsolete"]);
});

test("CalendarEventSet combines shared set arguments with method-specific fields", () => {
  const method = new CalendarEventSet({
    accountId: "acc",
    ifInState: "state-2",
    update: {
      event1: { title: "Updated event" },
    },
    sendSchedulingMessages: true,
  });

  assert.deepEqual(method.arguments, {
    accountId: "acc",
    ifInState: "state-2",
    update: {
      event1: { title: "Updated event" },
    },
    sendSchedulingMessages: true,
  });
});
