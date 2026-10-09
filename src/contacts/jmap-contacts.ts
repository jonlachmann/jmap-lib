import { CORE_CONTACTS_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import type { FilterOperatorCondition } from "../core/query";
import { getSetError } from "../core/set";
import {
  AddressBookChanges,
  AddressBookGet,
  ContactCardChanges,
  ContactCardGet,
  ContactCardQuery,
  ContactCardQueryChanges,
  ContactCardSet,
} from "./methods";
import type {
  AddressBookChangesRequest,
  AddressBookChangesResponse,
  AddressBookGetRequest,
  AddressBookGetResponse,
  AddressBook,
  ContactCard,
  ContactCardChangesRequest,
  ContactCardChangesResponse,
  ContactCardGetRequest,
  ContactCardGetResponse,
  ContactCardSetRequest,
  ContactCardQueryRequest,
  ContactCardQueryResponse,
  ContactCardQueryChangesRequest,
  ContactCardQueryChangesResponse,
  ContactCardQueryFilter,
  ContactCardQuerySort,
} from "./types";

export class JmapContacts {
  constructor(private readonly client: JmapClient) {}

  async listAddressBooks(accountId: AccountId): Promise<AddressBook[]> {
    const response = await this.client.invoke<AddressBookGetRequest, AddressBookGetResponse>(AddressBookGet.all(accountId), {
      capabilities: CORE_CONTACTS_CAPABILITIES,
    });
    return response.list;
  }

  async getAddressBooks(accountId: AccountId): Promise<AddressBookGetResponse> {
    return this.client.invoke<AddressBookGetRequest, AddressBookGetResponse>(AddressBookGet.all(accountId), {
      capabilities: CORE_CONTACTS_CAPABILITIES,
    });
  }

  async getAddressBookChanges(accountId: AccountId, sinceState: string, options?: { maxChanges?: number }): Promise<AddressBookChangesResponse> {
    return this.client.invoke<AddressBookChangesRequest, AddressBookChangesResponse>(
      new AddressBookChanges({ accountId: accountId.value, sinceState, maxChanges: options?.maxChanges }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );
  }

  async getChanges(accountId: AccountId, sinceState: string, options?: { maxChanges?: number }): Promise<ContactCardChangesResponse> {
    return this.client.invoke<ContactCardChangesRequest, ContactCardChangesResponse>(
      new ContactCardChanges({ accountId: accountId.value, sinceState, maxChanges: options?.maxChanges }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );
  }

  /** Cards by id with the state they are at; no ids gives the state alone. */
  async getCards(accountId: AccountId, ids: readonly string[]): Promise<ContactCardGetResponse> {
    return this.client.invoke<ContactCardGetRequest, ContactCardGetResponse>(ContactCardGet.byIds(accountId, ids), {
      capabilities: CORE_CONTACTS_CAPABILITIES,
    });
  }

  async list(accountId: AccountId, addressBookId?: string): Promise<ContactCard[]> {
    const PAGE_SIZE = 256;
    const allContacts: ContactCard[] = [];
    let position = 0;

    for (;;) {
      const batch = this.client.batch({ capabilities: CORE_CONTACTS_CAPABILITIES });
      const queryCallId = batch.call(new ContactCardQuery({
        accountId: accountId.value,
        filter: addressBookId ? { inAddressBook: addressBookId } : undefined,
        limit: PAGE_SIZE,
        position,
        calculateTotal: true,
      }));
      const getCallId = batch.call(ContactCardGet.byQueryResult(accountId, queryCallId));
      const response = await batch.send();

      const queryResult = response.get<ContactCardQueryResponse>(queryCallId, "ContactCard/query");
      const contacts = response.get<ContactCardGetResponse>(getCallId, "ContactCard/get").list;
      allContacts.push(...contacts);

      const total = queryResult.total ?? contacts.length;
      position += contacts.length;
      if (position >= total || contacts.length < PAGE_SIZE) break;
    }

    return allContacts;
  }

  async get(accountId: AccountId, contactId: string): Promise<ContactCard | undefined> {
    const response = await this.client.invoke<ContactCardGetRequest, ContactCardGetResponse>(ContactCardGet.byIds(accountId, [contactId]), {
      capabilities: CORE_CONTACTS_CAPABILITIES,
    });
    return response.list[0];
  }

  async search(accountId: AccountId, text: string, limit = 50): Promise<ContactCard[]> {
    const batch = this.client.batch({ capabilities: CORE_CONTACTS_CAPABILITIES });
    const queryCallId = batch.call(new ContactCardQuery({
      accountId: accountId.value,
      filter: { text },
      limit,
    } satisfies ContactCardQueryRequest));
    const getCallId = batch.call(ContactCardGet.byQueryResult(accountId, queryCallId));
    const response = await batch.send();
    return response.get<import("./types").ContactCardGetResponse>(getCallId, "ContactCard/get").list;
  }

  async queryChanges(
    accountId: AccountId,
    options: {
      filter?: FilterOperatorCondition<ContactCardQueryFilter>;
      sort?: readonly ContactCardQuerySort[];
      sinceQueryState: string;
      maxChanges?: number;
      upToId?: string;
      calculateTotal?: boolean;
    },
  ): Promise<ContactCardQueryChangesResponse> {
    return this.client.invoke<ContactCardQueryChangesRequest, ContactCardQueryChangesResponse>(
      new ContactCardQueryChanges({
        accountId: accountId.value,
        filter: options.filter,
        sort: options.sort,
        sinceQueryState: options.sinceQueryState,
        maxChanges: options.maxChanges,
        upToId: options.upToId,
        calculateTotal: options.calculateTotal,
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );
  }

  async create(accountId: AccountId, clientId: string, contact: Partial<ContactCard>): Promise<string> {
    const response = await this.client.invoke<ContactCardSetRequest, import("../core/set").JmapSetResponse>(
      new ContactCardSet({
        accountId: accountId.value,
        create: { [clientId]: contact },
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create contact");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("ContactCard/set did not return an id");
    }

    return createdId;
  }

  async update(accountId: AccountId, contactId: string, updates: Partial<ContactCard>): Promise<void> {
    const response = await this.client.invoke<ContactCardSetRequest, import("../core/set").JmapSetResponse>(
      new ContactCardSet({
        accountId: accountId.value,
        update: { [contactId]: updates },
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", contactId);
    if (error) {
      throw new Error(error.description || "Failed to update contact");
    }
  }

  async destroy(accountId: AccountId, contactId: string): Promise<void> {
    const response = await this.client.invoke<ContactCardSetRequest, import("../core/set").JmapSetResponse>(
      new ContactCardSet({
        accountId: accountId.value,
        destroy: [contactId],
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", contactId);
    if (error) {
      throw new Error(error.description || "Failed to delete contact");
    }
  }
}
