import test from "node:test";
import assert from "node:assert/strict";

import {
  JMAP_CONTACTS_CAPABILITY,
  JmapContacts,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: can fetch address books when contacts is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return;
  }

  const contacts = new JmapContacts(context.client);
  const addressBooks = await contacts.listAddressBooks(context.accountId);

  assert.ok(Array.isArray(addressBooks));
  assert.ok(addressBooks.length > 0, "expected at least one address book");
  for (const addressBook of addressBooks) {
    assert.equal(typeof addressBook.id, "string");
    assert.equal(typeof addressBook.name, "string");
  }
});

test("integration: can list contacts from an address book when contacts is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return;
  }

  const contacts = new JmapContacts(context.client);
  const addressBooks = await contacts.listAddressBooks(context.accountId);
  assert.ok(addressBooks.length > 0, "expected at least one address book");
  const contactCards = await contacts.list(context.accountId, addressBooks[0].id);

  assert.ok(Array.isArray(contactCards));
  for (const contact of contactCards.slice(0, 10)) {
    assert.equal(typeof contact.id, "string");
    assert.equal(typeof contact.addressBookIds, "object");
  }
});

test("integration: can search contacts when contacts is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return;
  }

  const contacts = new JmapContacts(context.client);
  const result = await contacts.search(context.accountId, "a", 10);

  assert.ok(Array.isArray(result));
  assert.ok(result.length <= 10);
});
