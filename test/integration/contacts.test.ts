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

test("integration: can create a contact when contacts is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return;
  }

  const contacts = new JmapContacts(context.client);
  const addressBooks = await contacts.listAddressBooks(context.accountId);
  assert.ok(addressBooks.length > 0, "expected at least one address book");

  const contactId = await contacts.create(
    context.accountId,
    createClientId("create-contact"),
    buildContactPayload(addressBooks[0].id, "Create contact"),
  );

  try {
    assert.equal(typeof contactId, "string");
    assert.ok(contactId.length > 0, "expected created contact id");
  } finally {
    await contacts.destroy(context.accountId, contactId);
  }
});

test("integration: can get a created contact when contacts is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return;
  }

  const contacts = new JmapContacts(context.client);
  const addressBooks = await contacts.listAddressBooks(context.accountId);
  assert.ok(addressBooks.length > 0, "expected at least one address book");

  const contactId = await contacts.create(
    context.accountId,
    createClientId("get-contact"),
    buildContactPayload(addressBooks[0].id, "Get contact"),
  );

  try {
    const contact = await contacts.get(context.accountId, contactId);

    assert.ok(contact, "expected created contact to be fetchable");
    assert.equal(contact?.id, contactId);
    assert.equal(typeof contact?.addressBookIds, "object");
  } finally {
    await contacts.destroy(context.accountId, contactId);
  }
});

test("integration: can update a contact when contacts is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return;
  }

  const contacts = new JmapContacts(context.client);
  const addressBooks = await contacts.listAddressBooks(context.accountId);
  assert.ok(addressBooks.length > 0, "expected at least one address book");

  const updatedGivenName = `Updated-${Date.now()}`;
  const contactId = await contacts.create(
    context.accountId,
    createClientId("update-contact"),
    buildContactPayload(addressBooks[0].id, "Update contact"),
  );

  try {
    await contacts.update(context.accountId, contactId, {
      name: {
        components: [
          { kind: "given", value: updatedGivenName },
          { kind: "surname", value: "Integration" },
        ],
      },
    });

    const contact = await contacts.get(context.accountId, contactId);
    assert.ok(contact, "expected updated contact to be fetchable");
    assert.equal(contact?.name?.components[0]?.value, updatedGivenName);
  } finally {
    await contacts.destroy(context.accountId, contactId);
  }
});

test("integration: can destroy a contact when contacts is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return;
  }

  const contacts = new JmapContacts(context.client);
  const addressBooks = await contacts.listAddressBooks(context.accountId);
  assert.ok(addressBooks.length > 0, "expected at least one address book");

  const contactId = await contacts.create(
    context.accountId,
    createClientId("destroy-contact"),
    buildContactPayload(addressBooks[0].id, "Destroy contact"),
  );

  await contacts.destroy(context.accountId, contactId);

  const contact = await contacts.get(context.accountId, contactId);
  assert.equal(contact, undefined);
});

function createClientId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function buildContactPayload(addressBookId: string, givenName: string) {
  return {
    addressBookIds: { [addressBookId]: true },
    kind: "individual" as const,
    name: {
      components: [
        { kind: "given" as const, value: givenName },
        { kind: "surname" as const, value: "Integration" },
      ],
    },
    emails: {
      primary: {
        address: `jmap-lib-${Date.now()}@example.test`,
      },
    },
  };
}
