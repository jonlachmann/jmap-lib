import test from "node:test";
import assert from "node:assert/strict";

import type { Alert, CalendarEvent, CalendarEventUpdate, Participant, RecurrenceRule, TaskParticipant } from "jmap-lib";

test("A participant's roles are a set, each value true (JSCalendar-bis 3.4.6)", () => {
  const chair: Participant = { calendarAddress: "mailto:alice@example.com", roles: { chair: true, owner: true } };
  // @ts-expect-error A role is in the set or left out, never false
  const notChair: Participant = { calendarAddress: "mailto:alice@example.com", roles: { chair: false } };
  // @ts-expect-error A task's participant has roles (RFC 8984 4.4.6)
  const assignee: TaskParticipant = { sendTo: { imip: "mailto:bob@example.com" } };

  assert.equal(chair.roles?.chair, true);
  assert.ok(notChair);
  assert.ok(assignee);
});

test("An alert's trigger is an offset, an absolute time or a type not known (JSCalendar-bis 3.5.1)", () => {
  const offset: Alert = { trigger: { offset: "-PT15M" } };
  const absolute: Alert = { trigger: { "@type": "AbsoluteTrigger", when: "2026-03-02T08:00:00Z" } };
  const unknown: Alert = { trigger: { "@type": "LocationTrigger", radius: 100 } };
  // @ts-expect-error Without a type a trigger is an offset, which needs one
  const noOffset: Alert = { trigger: { when: "2026-03-02T08:00:00Z" } };
  // @ts-expect-error An offset is a duration
  const minutes: Alert = { trigger: { offset: -15 } };
  // @ts-expect-error An offset is from the start or the end
  const fromDue: Alert = { trigger: { offset: "-PT15M", relativeTo: "due" } };

  assert.ok(offset && absolute && unknown && noOffset && minutes && fromDue);
});

test("An event's rule, occurrences and participants are typed as read and patched", () => {
  const rule: RecurrenceRule = { frequency: "weekly", byDay: [{ day: "mo" }], until: "2026-06-01T00:00:00" };
  // @ts-expect-error A day is the two-letter English name
  const monday: RecurrenceRule = { frequency: "weekly", byDay: [{ day: "monday" }] };
  const event: Pick<CalendarEvent, "recurrenceRule" | "recurrenceOverrides"> = {
    recurrenceRule: rule,
    recurrenceOverrides: {
      "2026-03-09T09:00:00": { excluded: true },
      "2026-03-16T09:00:00": { start: "2026-03-16T10:00:00", "participants/a/participationStatus": "accepted" },
    },
  };
  const update: CalendarEventUpdate = {
    "participants/a/participationStatus": "declined",
    "alerts/reminder": { trigger: { offset: "-PT10M" } },
  };

  assert.ok(monday);
  assert.equal(event.recurrenceOverrides?.["2026-03-16T09:00:00"]?.start, "2026-03-16T10:00:00");
  assert.equal(update["participants/a/participationStatus"], "declined");
});

test("A patch sets a map's entry or a path into it (RFC 8620 5.3)", () => {
  const update: CalendarEventUpdate = {
    "participants/a": { calendarAddress: "mailto:alice@example.com", roles: { required: true } },
    "participants/b/participationStatus": "accepted",
  };
  // @ts-expect-error A path names a property the event has
  const typo: CalendarEventUpdate = { "participant/b/expectReply": true };

  assert.ok(typo);
  assert.equal(update["participants/b/participationStatus"], "accepted");
});
