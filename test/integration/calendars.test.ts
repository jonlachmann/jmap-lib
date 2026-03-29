import test from "node:test";
import assert from "node:assert/strict";

import {
  CalendarEventGet,
  CalendarEventQuery,
  DEFAULT_CALENDAR_EVENT_PROPERTIES,
  JMAP_CALENDARS_PARSE_CAPABILITY,
  JmapCalendars,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";
import { createCalendarsIntegrationContext } from "./helpers/calendars.js";
import { createIntegrationId } from "./helpers/ids.js";
import { uploadIntegrationBlob } from "./helpers/upload.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: lists calendars when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { calendars } = setup;

  assert.ok(Array.isArray(calendars));
  for (const calendar of calendars) {
    assert.equal(typeof calendar.id, "string");
    assert.equal(typeof calendar.name, "string");
  }
});

test("integration: creates a calendar when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient } = setup;
  const clientId = createIntegrationId("create-calendar");
  const calendarId = await calendarsClient.create(context.accountId, clientId, {
    name: `Integration ${clientId}`,
    color: "#336699",
    timeZone: "UTC",
  });

  try {
    assert.equal(typeof calendarId, "string");
    assert.ok(calendarId.length > 0, "expected created calendar id");
  } finally {
    await calendarsClient.destroy(context.accountId, calendarId);
  }
});

test("integration: updates a calendar when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient } = setup;
  const clientId = createIntegrationId("update-calendar");
  const calendarId = await calendarsClient.create(context.accountId, clientId, {
    name: `Original ${clientId}`,
    color: "#336699",
    timeZone: "UTC",
  });

  try {
    const updatedName = `Updated ${clientId}`;
    await calendarsClient.update(context.accountId, calendarId, {
      name: updatedName,
      color: "#663399",
    });

    const calendars = await calendarsClient.list(context.accountId);
    const updated = calendars.find((calendar) => calendar.id === calendarId);
    assert.ok(updated, "expected updated calendar to be listed");
    assert.equal(updated.name, updatedName);
    assert.equal(updated.color, "#663399");
  } finally {
    await calendarsClient.destroy(context.accountId, calendarId);
  }
});

test("integration: destroys a calendar when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient } = setup;
  const clientId = createIntegrationId("destroy-calendar");
  const calendarId = await calendarsClient.create(context.accountId, clientId, {
    name: `Destroy ${clientId}`,
    color: "#336699",
    timeZone: "UTC",
  });

  await calendarsClient.destroy(context.accountId, calendarId);

  const calendars = await calendarsClient.list(context.accountId);
  assert.equal(
    calendars.some((calendar) => calendar.id === calendarId),
    false,
  );
});

test("integration: lists calendar events when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient, calendar } = setup;
  const events = await calendarsClient.listEvents(
    context.accountId,
    [calendar.id],
    DEFAULT_CALENDAR_EVENT_PROPERTIES,
  );

  assert.ok(Array.isArray(events));
  for (const event of events.slice(0, 10)) {
    assert.equal(typeof event.id, "string");
    assert.equal(typeof event.calendarIds, "object");
    if (event.uid !== undefined) {
      assert.equal(typeof event.uid, "string");
    }
  }
});

test("integration: queries calendar events when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient } = setup;
  const events = await calendarsClient.queryEvents(
    context.accountId,
    {},
    { limit: 10, properties: DEFAULT_CALENDAR_EVENT_PROPERTIES },
  );

  assert.ok(Array.isArray(events));
  assert.ok(events.length <= 10);
});

test("integration: queries calendar events with an operator filter when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendar } = setup;

  const batch = context.client.batch();
  const queryCallId = batch.call(new CalendarEventQuery({
    accountId: context.accountId.value,
    filter: {
      operator: "AND",
      conditions: [
        { inCalendars: [calendar.id] },
      ],
    },
    limit: 10,
  }));
  const getCallId = batch.call(
    CalendarEventGet.byQueryResult(context.accountId, queryCallId, DEFAULT_CALENDAR_EVENT_PROPERTIES),
  );

  const response = await batch.send();
  const query = response.get<{ ids: string[] }>(queryCallId, "CalendarEvent/query");
  const events = response.get<{ list: Array<{ id: string; calendarIds: Record<string, boolean> }> }>(
    getCallId,
    "CalendarEvent/get",
  ).list;

  assert.ok(Array.isArray(query.ids));
  assert.ok(events.length <= 10);
  for (const event of events) {
    assert.equal(typeof event.id, "string");
    assert.equal(typeof event.calendarIds, "object");
  }
});

test("integration: queries seeded calendar events deterministically and destroys them afterwards", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient, calendar } = setup;
  const marker = createIntegrationId("query-events");

  const firstEventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("query-event-1"),
    buildEventPayload(calendar.id, `${marker}-alpha`),
  );
  const secondEventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("query-event-2"),
    buildEventPayload(calendar.id, `${marker}-beta`),
  );

  try {
    const batch = context.client.batch();
    const queryCallId = batch.call(new CalendarEventQuery({
      accountId: context.accountId.value,
      filter: {
        operator: "AND",
        conditions: [
          { inCalendars: [calendar.id] },
          { text: marker },
        ],
      },
      limit: 10,
    }));
    const getCallId = batch.call(
      CalendarEventGet.byQueryResult(context.accountId, queryCallId, DEFAULT_CALENDAR_EVENT_PROPERTIES),
    );

    const response = await batch.send();
    const query = response.get<{ ids: string[] }>(queryCallId, "CalendarEvent/query");
    const events = response.get<{ list: Array<{ id: string }> }>(getCallId, "CalendarEvent/get").list;

    assert.ok(query.ids.includes(firstEventId), "expected first seeded event in query results");
    assert.ok(query.ids.includes(secondEventId), "expected second seeded event in query results");
    assert.ok(events.some((event) => event.id === firstEventId));
    assert.ok(events.some((event) => event.id === secondEventId));
  } finally {
    await calendarsClient.destroyEvent(context.accountId, firstEventId);
    await calendarsClient.destroyEvent(context.accountId, secondEventId);
  }
});

test("integration: creates a calendar event when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient, calendar } = setup;

  const eventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("create-event"),
    buildEventPayload(calendar.id, "Create event"),
  );

  try {
    assert.equal(typeof eventId, "string");
    assert.ok(eventId.length > 0, "expected created calendar event id");
  } finally {
    await calendarsClient.destroyEvent(context.accountId, eventId);
  }
});

test("integration: gets a created calendar event when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient, calendar } = setup;

  const eventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("get-event"),
    buildEventPayload(calendar.id, "Get event"),
  );

  try {
    const event = await calendarsClient.getEvent(
      context.accountId,
      eventId,
      DEFAULT_CALENDAR_EVENT_PROPERTIES,
    );

    assert.ok(event, "expected created event to be fetchable");
    assert.equal(event?.id, eventId);
    assert.equal(typeof event?.calendarIds, "object");
  } finally {
    await calendarsClient.destroyEvent(context.accountId, eventId);
  }
});

test("integration: updates a calendar event when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient, calendar } = setup;

  const updatedTitle = `Updated event ${Date.now()}`;
  const eventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("update-event"),
    buildEventPayload(calendar.id, "Original event"),
  );

  try {
    await calendarsClient.updateEvent(context.accountId, eventId, {
      title: updatedTitle,
      description: "Updated by integration test",
    });

    const event = await calendarsClient.getEvent(
      context.accountId,
      eventId,
      DEFAULT_CALENDAR_EVENT_PROPERTIES,
    );

    assert.ok(event, "expected updated event to be fetchable");
    assert.equal(event?.title, updatedTitle);
  } finally {
    await calendarsClient.destroyEvent(context.accountId, eventId);
  }
});

test("integration: destroys a calendar event when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { context, calendarsClient, calendar } = setup;

  const eventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("destroy-event"),
    buildEventPayload(calendar.id, "Destroy event"),
  );

  await calendarsClient.destroyEvent(context.accountId, eventId);

  const event = await calendarsClient.getEvent(
    context.accountId,
    eventId,
    DEFAULT_CALENDAR_EVENT_PROPERTIES,
  );

  assert.equal(event, undefined);
});

test("integration: parses calendar events from an uploaded ics blob when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_PARSE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_PARSE_CAPABILITY}`);
    return;
  }

  const blobId = await uploadIntegrationBlob(context, {
    contentType: "text/calendar; charset=utf-8",
    body: buildIcsPayload(),
  });

  const parsed = await new JmapCalendars(context.client).parse(context.accountId, blobId);
  assert.ok(Array.isArray(parsed));
  assert.ok(parsed.length > 0, "expected at least one parsed event");
  assert.equal(parsed[0].title, "JMAP Integration Event");
  assert.ok(
    typeof parsed[0].start === "string" && parsed[0].start.startsWith("2030-01-15T10:00:00"),
    "expected parsed event start time to match the uploaded event",
  );
});

function createClientId(prefix: string): string {
  return createIntegrationId(prefix);
}

function buildEventPayload(calendarId: string, title: string) {
  return {
    calendarIds: { [calendarId]: true },
    uid: `jmap-lib-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    start: "2030-01-15T10:00:00",
    duration: "PT30M",
    timeZone: "UTC",
    showWithoutTime: false,
  };
}

function buildIcsPayload(): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jmap-lib//integration//EN",
    "BEGIN:VEVENT",
    "UID:jmap-lib-parse-test",
    "DTSTAMP:20300115T090000Z",
    "DTSTART:20300115T100000Z",
    "DTEND:20300115T103000Z",
    "SUMMARY:JMAP Integration Event",
    "DESCRIPTION:Created by integration test",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
