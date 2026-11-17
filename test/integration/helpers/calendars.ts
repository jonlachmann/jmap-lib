import assert from "node:assert/strict";
import type { TestContext } from "node:test";

import { JMAP_CALENDARS_CAPABILITY, JmapCalendars, type Calendar } from "jmap-lib";
import { loadSingleUserIntegrationConfig } from "./config.js";
import { createIntegrationClientContext, type IntegrationClientContext } from "./client.js";
import { hasServerCapability } from "./capabilities.js";

export interface CalendarsIntegrationContext {
  context: IntegrationClientContext;
  calendarsClient: JmapCalendars;
  calendars: Calendar[];
  calendar: Calendar;
}

export async function createCalendarsIntegrationContext(
  t: TestContext,
): Promise<CalendarsIntegrationContext | undefined> {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return undefined;
  }

  const calendarsClient = new JmapCalendars(context.client);
  const calendars = (await calendarsClient.getCalendars(context.accountId)).list;
  assert.ok(calendars.length > 0, "expected at least one calendar");

  return {
    context,
    calendarsClient,
    calendars,
    calendar: calendars[0],
  };
}
