import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CALENDAR_EVENT_PROPERTIES,
  JMAP_CALENDARS_CAPABILITY,
  JmapCalendars,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";

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

function createClientId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
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
