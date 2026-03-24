import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CALENDAR_EVENT_PROPERTIES,
  JMAP_CALENDARS_CAPABILITY,
  JMAP_CALENDARS_PARSE_CAPABILITY,
  JmapCalendars,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";
import { createIntegrationId } from "./helpers/ids.js";
import { uploadIntegrationBlob } from "./helpers/upload.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: can fetch calendars when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
  const calendars = await calendarsClient.list(context.accountId);

  assert.ok(Array.isArray(calendars));
  assert.ok(calendars.length > 0, "expected at least one calendar");
  for (const calendar of calendars) {
    assert.equal(typeof calendar.id, "string");
    assert.equal(typeof calendar.name, "string");
  }
});

test("integration: can create a calendar when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
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

test("integration: can update a calendar when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
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

test("integration: can destroy a calendar when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
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

test("integration: can list calendar events when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
  const calendars = await calendarsClient.list(context.accountId);
  assert.ok(calendars.length > 0, "expected at least one calendar");
  const events = await calendarsClient.listEvents(
    context.accountId,
    [calendars[0].id],
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

test("integration: can query calendar events when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
  const events = await calendarsClient.queryEvents(
    context.accountId,
    {},
    { limit: 10, properties: DEFAULT_CALENDAR_EVENT_PROPERTIES },
  );

  assert.ok(Array.isArray(events));
  assert.ok(events.length <= 10);
});

test("integration: can create a calendar event when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
  const calendars = await calendarsClient.list(context.accountId);
  assert.ok(calendars.length > 0, "expected at least one calendar");

  const eventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("create-event"),
    buildEventPayload(calendars[0].id, "Create event"),
  );

  try {
    assert.equal(typeof eventId, "string");
    assert.ok(eventId.length > 0, "expected created calendar event id");
  } finally {
    await calendarsClient.destroyEvent(context.accountId, eventId);
  }
});

test("integration: can get a created calendar event when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
  const calendars = await calendarsClient.list(context.accountId);
  assert.ok(calendars.length > 0, "expected at least one calendar");

  const eventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("get-event"),
    buildEventPayload(calendars[0].id, "Get event"),
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

test("integration: can update a calendar event when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
  const calendars = await calendarsClient.list(context.accountId);
  assert.ok(calendars.length > 0, "expected at least one calendar");

  const updatedTitle = `Updated event ${Date.now()}`;
  const eventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("update-event"),
    buildEventPayload(calendars[0].id, "Original event"),
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

test("integration: can destroy a calendar event when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendarsClient = new JmapCalendars(context.client);
  const calendars = await calendarsClient.list(context.accountId);
  assert.ok(calendars.length > 0, "expected at least one calendar");

  const eventId = await calendarsClient.createEvent(
    context.accountId,
    createClientId("destroy-event"),
    buildEventPayload(calendars[0].id, "Destroy event"),
  );

  await calendarsClient.destroyEvent(context.accountId, eventId);

  const event = await calendarsClient.getEvent(
    context.accountId,
    eventId,
    DEFAULT_CALENDAR_EVENT_PROPERTIES,
  );

  assert.equal(event, undefined);
});

test("integration: can parse calendar events from an uploaded ics blob when calendars is supported", { skip }, async (t) => {
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
