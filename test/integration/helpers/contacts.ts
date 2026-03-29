import assert from "node:assert/strict";
import type { TestContext } from "node:test";

import { JMAP_CONTACTS_CAPABILITY, JmapContacts, type AddressBook } from "jmap-lib";
import { loadSingleUserIntegrationConfig } from "./config.js";
import { createIntegrationClientContext, type IntegrationClientContext } from "./client.js";
import { hasServerCapability } from "./capabilities.js";

export interface ContactsIntegrationContext {
  context: IntegrationClientContext;
  contacts: JmapContacts;
  addressBooks: AddressBook[];
  addressBook: AddressBook;
}

export async function createContactsIntegrationContext(
  t: TestContext,
): Promise<ContactsIntegrationContext | undefined> {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_CONTACTS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_CONTACTS_CAPABILITY}`);
    return undefined;
  }

  const contacts = new JmapContacts(context.client);
  const addressBooks = await contacts.listAddressBooks(context.accountId);
  assert.ok(addressBooks.length > 0, "expected at least one address book");

  return {
    context,
    contacts,
    addressBooks,
    addressBook: addressBooks[0],
  };
}
