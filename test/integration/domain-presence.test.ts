import test from "node:test";
import assert from "node:assert/strict";

import { getSingleUserIntegrationSkipReason } from "./helpers/config.js";
import { createCalendarsIntegrationContext } from "./helpers/calendars.js";
import { createContactsIntegrationContext } from "./helpers/contacts.js";
import { createIdentitiesIntegrationContext } from "./helpers/identities.js";
import { createSieveIntegrationContext } from "./helpers/sieve.js";
import { createVacationIntegrationContext } from "./helpers/vacation.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: lists identities when submission is supported", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const identities = await identitiesClient.list(context.accountId);
  assert.ok(Array.isArray(identities));
});

test("integration: lists address books when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { addressBooks } = setup;
  assert.ok(Array.isArray(addressBooks));
});

test("integration: lists calendars when calendars is supported", { skip }, async (t) => {
  const setup = await createCalendarsIntegrationContext(t);
  if (!setup) return;
  const { calendars } = setup;
  assert.ok(Array.isArray(calendars));
});

test("integration: fetches vacation response when vacation is supported", { skip }, async (t) => {
  const setup = await createVacationIntegrationContext(t);
  if (!setup) return;
  const { context, vacationClient } = setup;
  const vacation = await vacationClient.get(context.accountId);
  assert.ok(vacation === undefined || typeof vacation.id === "string");
});

test("integration: lists sieve scripts when sieve is supported", { skip }, async (t) => {
  const setup = await createSieveIntegrationContext(t);
  if (!setup) return;
  const { context, sieve } = setup;
  const scripts = await sieve.list(context.accountId);
  assert.ok(Array.isArray(scripts));
});
