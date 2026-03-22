import test from "node:test";
import assert from "node:assert/strict";

import {
  JMAP_CALENDARS_CAPABILITY,
  JMAP_CONTACTS_CAPABILITY,
  JMAP_SIEVE_CAPABILITY,
  JMAP_SUBMISSION_CAPABILITY,
  JMAP_VACATION_RESPONSE_CAPABILITY,
  JmapCalendars,
  JmapContacts,
  JmapIdentities,
  JmapSieve,
  JmapVacation,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: identities are a first-class surface when submission is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return;
  }

  const identities = await new JmapIdentities(context.client).list(context.accountId);
  assert.ok(Array.isArray(identities));
});

test("integration: contacts are a first-class surface when contacts is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return;
  }

  const addressBooks = await new JmapContacts(context.client).listAddressBooks(context.accountId);
  assert.ok(Array.isArray(addressBooks));
});

test("integration: calendars are a first-class surface when calendars is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CALENDARS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CALENDARS_CAPABILITY}`);
    return;
  }

  const calendars = await new JmapCalendars(context.client).list(context.accountId);
  assert.ok(Array.isArray(calendars));
});

test("integration: vacation response is a first-class surface when vacation is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_VACATION_RESPONSE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_VACATION_RESPONSE_CAPABILITY}`);
    return;
  }

  const vacation = await new JmapVacation(context.client).get(context.accountId);
  assert.ok(vacation === undefined || typeof vacation.id === "string");
});

test("integration: sieve is a first-class surface when sieve is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SIEVE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SIEVE_CAPABILITY}`);
    return;
  }

  const scripts = await new JmapSieve(context.client).list(context.accountId);
  assert.ok(Array.isArray(scripts));
});
