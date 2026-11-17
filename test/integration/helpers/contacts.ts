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
  const addressBooks = (await contacts.getAddressBooks(context.accountId)).list;
  assert.ok(addressBooks.length > 0, "expected at least one address book");

  return {
    context,
    contacts,
    addressBooks,
    addressBook: addressBooks[0],
  };
}

/** Picks an address book the user may add contacts to (RFC 9610 2), or skips the test when there is none. */
export function requireWritableAddressBook(t: TestContext, addressBooks: AddressBook[]): AddressBook | undefined {
  const writable = addressBooks.find((addressBook) => addressBook.myRights?.mayWrite === true);
  if (!writable) t.skip("the account has no address book the user may write to");
  return writable;
}
