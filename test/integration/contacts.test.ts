import test from "node:test";
import assert from "node:assert/strict";

import {
  ContactCardGet,
  ContactCardQuery,
  type ContactCardQueryRequest,
  type ContactCardQueryResponse,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
} from "./helpers/config.js";
import { createContactsIntegrationContext } from "./helpers/contacts.js";
import { createIntegrationId } from "./helpers/ids.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: lists address books when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { addressBooks } = setup;

  assert.ok(Array.isArray(addressBooks));
  for (const addressBook of addressBooks) {
    assert.equal(typeof addressBook.id, "string");
    assert.equal(typeof addressBook.name, "string");
  }
});

test("integration: lists contacts from an address book when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { context, contacts, addressBook } = setup;
  const contactCards = await contacts.list(context.accountId, addressBook.id);

  assert.ok(Array.isArray(contactCards));
  for (const contact of contactCards.slice(0, 10)) {
    assert.equal(typeof contact.id, "string");
    assert.equal(typeof contact.addressBookIds, "object");
  }
});

test("integration: searches contacts when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { context, contacts } = setup;
  const result = await contacts.search(context.accountId, "a", 10);

  assert.ok(Array.isArray(result));
  assert.ok(result.length <= 10);
});

test("integration: queries contacts with an operator filter when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { context, addressBook } = setup;

  const batch = context.client.batch();
  const queryCallId = batch.call(new ContactCardQuery({
    accountId: context.accountId.value,
    filter: {
      operator: "AND",
      conditions: [
        { inAddressBook: addressBook.id },
      ],
    },
    limit: 10,
  }));
  const getCallId = batch.call(ContactCardGet.byQueryResult(context.accountId, queryCallId));

  const response = await batch.send();
  const query = response.get<{ ids: string[] }>(queryCallId, "ContactCard/query");
  const contactCards = response.get<{ list: Array<{ id: string; addressBookIds: Record<string, boolean> }> }>(
    getCallId,
    "ContactCard/get",
  ).list;

  assert.ok(Array.isArray(query.ids));
  assert.ok(contactCards.length <= 10);
  for (const contact of contactCards) {
    assert.equal(typeof contact.id, "string");
    assert.equal(typeof contact.addressBookIds, "object");
  }
});

test("integration: queries seeded contacts and reports query changes deterministically", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { context, contacts, addressBook } = setup;
  const marker = createIntegrationId("query-contacts");

  const initialQuery = await context.client.invoke<ContactCardQueryRequest, ContactCardQueryResponse>(new ContactCardQuery({
    accountId: context.accountId.value,
    filter: {
      operator: "AND",
      conditions: [
        { inAddressBook: addressBook.id },
        { text: marker },
      ],
    },
    limit: 10,
    calculateTotal: true,
  }));

  assert.deepEqual(initialQuery.ids, []);
  assert.ok(initialQuery.queryState, "expected initial contact query state");

  const firstContactId = (await contacts.create(
    context.accountId,
    buildContactPayload(addressBook.id, `${marker}-alpha`),
  )).id;
  const secondContactId = (await contacts.create(
    context.accountId,
    buildContactPayload(addressBook.id, `${marker}-beta`),
  )).id;

  try {
    const batch = context.client.batch();
    const queryCallId = batch.call(new ContactCardQuery({
      accountId: context.accountId.value,
      filter: {
        operator: "AND",
        conditions: [
          { inAddressBook: addressBook.id },
          { text: marker },
        ],
      },
      limit: 10,
    }));
    const getCallId = batch.call(ContactCardGet.byQueryResult(context.accountId, queryCallId));

    const response = await batch.send();
    const query = response.get<{ ids: string[] }>(queryCallId, "ContactCard/query");
    const contactCards = response.get<{ list: Array<{ id: string }> }>(getCallId, "ContactCard/get").list;
    const changes = await contacts.queryChanges(context.accountId, {
      filter: {
        operator: "AND",
        conditions: [
          { inAddressBook: addressBook.id },
          { text: marker },
        ],
      },
      sinceQueryState: initialQuery.queryState!,
      calculateTotal: true,
    });

    assert.ok(query.ids.includes(firstContactId), "expected first seeded contact in query results");
    assert.ok(query.ids.includes(secondContactId), "expected second seeded contact in query results");
    assert.ok(contactCards.some((contact) => contact.id === firstContactId));
    assert.ok(contactCards.some((contact) => contact.id === secondContactId));
    assert.deepEqual(changes.removed, []);
    assert.ok(changes.added?.some((entry) => entry.id === firstContactId));
    assert.ok(changes.added?.some((entry) => entry.id === secondContactId));
    assert.equal(changes.total, query.ids.length);
  } finally {
    await contacts.destroy(context.accountId, firstContactId);
    await contacts.destroy(context.accountId, secondContactId);
  }
});

test("integration: creates a contact when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { context, contacts, addressBook } = setup;

  const contactClientId = createClientId("create-contact");
  const contactId = (await contacts.create(
    context.accountId,
    buildContactPayload(addressBook.id, "Create contact"),
  )).id;

  try {
    assert.equal(typeof contactId, "string");
    assert.ok(contactId.length > 0, "expected created contact id");
  } finally {
    await contacts.destroy(context.accountId, contactId);
  }
});

test("integration: gets a created contact when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { context, contacts, addressBook } = setup;

  const contactClientId = createClientId("get-contact");
  const contactId = (await contacts.create(
    context.accountId,
    buildContactPayload(addressBook.id, "Get contact"),
  )).id;

  try {
    const contact = await contacts.get(context.accountId, contactId);

    assert.ok(contact, "expected created contact to be fetchable");
    assert.equal(contact?.id, contactId);
    assert.equal(typeof contact?.addressBookIds, "object");
  } finally {
    await contacts.destroy(context.accountId, contactId);
  }
});

test("integration: updates a contact when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { context, contacts, addressBook } = setup;

  const updatedGivenName = `Updated-${Date.now()}`;
  const contactClientId = createClientId("update-contact");
  const contactId = (await contacts.create(
    context.accountId,
    buildContactPayload(addressBook.id, "Update contact"),
  )).id;

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
    assert.equal(contact?.name?.components?.[0]?.value, updatedGivenName);
  } finally {
    await contacts.destroy(context.accountId, contactId);
  }
});

test("integration: destroys a contact when contacts is supported", { skip }, async (t) => {
  const setup = await createContactsIntegrationContext(t);
  if (!setup) return;
  const { context, contacts, addressBook } = setup;

  const contactClientId = createClientId("destroy-contact");
  const contactId = (await contacts.create(
    context.accountId,
    buildContactPayload(addressBook.id, "Destroy contact"),
  )).id;

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
