import test from "node:test";
import assert from "node:assert/strict";

import {
  CalendarEventSet,
  type CalendarEventUpdate,
  type ContactCardUpdate,
  type IdentityUpdate,
  type JmapSetArgs,
  type VacationResponseUpdate,
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

test("ContactCardUpdate supports nested patch paths over mutable contact data", () => {
  const update: ContactCardUpdate = {
    "emails/work": { address: "user@example.test" },
    "addresses/home": { locality: "Stockholm" },
    "members/contact-2": true,
  };

  assert.equal(update["emails/work"]?.address, "user@example.test");
  assert.equal(update["addresses/home"]?.locality, "Stockholm");
  assert.equal(update["members/contact-2"], true);
});

test("CalendarEventUpdate supports nested patch paths over mutable event data", () => {
  const update: CalendarEventUpdate = {
    title: "Updated title",
    "calendarIds/personal": true,
    "keywords/$seen": true,
  };

  assert.equal(update.title, "Updated title");
  assert.equal(update["calendarIds/personal"], true);
  assert.equal(update["keywords/$seen"], true);
});

test("IdentityUpdate and VacationResponseUpdate support patch-object ergonomics", () => {
  const identity: IdentityUpdate = {
    textSignature: "Best regards",
    "replyTo/0/email": "reply@example.test",
  };
  const vacation: VacationResponseUpdate = {
    isEnabled: true,
    htmlBody: "<p>Out of office</p>",
  };

  assert.equal(identity.textSignature, "Best regards");
  assert.equal(identity["replyTo/0/email"], "reply@example.test");
  assert.equal(vacation.isEnabled, true);
  assert.equal(vacation.htmlBody, "<p>Out of office</p>");
});
