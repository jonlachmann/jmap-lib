import { paginate } from "../core/paginate.js";
import { CORE_CONTACTS_CAPABILITIES } from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { AccountId } from "../core/ids.js";
import type { JmapFilter } from "../core/query.js";
import { CREATION_ID, createdOne, assertSetOk, type JmapCreated, type JmapSetResponse } from "../core/set.js";
import {
  AddressBookChanges,
  AddressBookGet,
  AddressBookSet,
  ContactCardChanges,
  ContactCardGet,
  ContactCardQuery,
  ContactCardQueryChanges,
  ContactCardSet,
} from "./methods.js";
import type {
  AddressBookChangesRequest,
  AddressBookChangesResponse,
  AddressBookGetRequest,
  AddressBookGetResponse,
  AddressBookCreate,
  AddressBookUpdate,
  AddressBookSetRequest,
  ContactCard,
  ContactCardCreate,
  ContactCardUpdate,
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
} from "./types.js";

/** The card with the @type and version RFC 9553 2.1 requires, where the caller left them out. */
function asCard(contact: ContactCardCreate): ContactCardCreate {
  return { "@type": "Card", version: "1.0", ...contact };
}

export class JmapContacts {
  constructor(private readonly client: JmapClient) {}

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

  async createAddressBook(accountId: AccountId, addressBook: AddressBookCreate): Promise<JmapCreated> {
    const response = await this.client.invoke<AddressBookSetRequest, JmapSetResponse>(
      new AddressBookSet({ accountId: accountId.value, create: { [CREATION_ID]: addressBook } }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );

    return createdOne(response, "address book");
  }

  async updateAddressBook(accountId: AccountId, addressBookId: string, updates: AddressBookUpdate): Promise<JmapSetResponse> {
    const response = await this.client.invoke<AddressBookSetRequest, JmapSetResponse>(
      new AddressBookSet({ accountId: accountId.value, update: { [addressBookId]: updates } }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );
    assertSetOk(response, "address book");
    return response;
  }

  /** Destroy the address book, and with onDestroyRemoveContents its cards too (RFC 9610 2.3); without, one holding
   *  cards is refused. */
  async destroyAddressBook(accountId: AccountId, addressBookId: string, onDestroyRemoveContents?: boolean): Promise<JmapSetResponse> {
    const response = await this.client.invoke<AddressBookSetRequest, JmapSetResponse>(
      new AddressBookSet({ accountId: accountId.value, destroy: [addressBookId], onDestroyRemoveContents }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );
    assertSetOk(response, "address book");
    return response;
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
    return paginate<ContactCard>(
      this.client,
      CORE_CONTACTS_CAPABILITIES,
      (position, limit) => new ContactCardQuery({
        accountId: accountId.value,
        filter: addressBookId ? { inAddressBook: addressBookId } : undefined,
        position,
        limit,
      }),
      (queryCallId) => ContactCardGet.byQueryResult(accountId, queryCallId),
    );
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
    return response.get<ContactCardGetResponse>(getCallId, "ContactCard/get").list;
  }

  /** The cards a query finds, in its order, from its position, fetched in the same request; the total when asked
   *  (RFC 8620 5.5). */
  async queryCards(
    accountId: AccountId,
    options: {
      filter?: JmapFilter<ContactCardQueryFilter>;
      sort?: readonly ContactCardQuerySort[];
      position?: number;
      limit?: number;
      calculateTotal?: boolean;
    } = {},
  ): Promise<{ cards: ContactCard[]; position: number; total?: number }> {
    const batch = this.client.batch({ capabilities: CORE_CONTACTS_CAPABILITIES });
    const queryCallId = batch.call(new ContactCardQuery({ accountId: accountId.value, ...options } satisfies ContactCardQueryRequest));
    const getCallId = batch.call(ContactCardGet.byQueryResult(accountId, queryCallId));
    const response = await batch.send();
    const query = response.get<ContactCardQueryResponse>(queryCallId, "ContactCard/query");
    const cards = response.get<ContactCardGetResponse>(getCallId, "ContactCard/get").list;
    return { cards, position: query.position, total: query.total };
  }

  async queryChanges(
    accountId: AccountId,
    options: {
      filter?: JmapFilter<ContactCardQueryFilter>;
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

  async create(accountId: AccountId, contact: ContactCardCreate): Promise<JmapCreated> {
    const response = await this.client.invoke<ContactCardSetRequest, JmapSetResponse>(
      new ContactCardSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: asCard(contact) },
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );

    return createdOne(response, "contact");
  }

  /** Create several cards in one ContactCard/set; what wasn't created is in the response's notCreated, not thrown. */
  async createCards(accountId: AccountId, contacts: Record<string, ContactCardCreate>): Promise<JmapSetResponse> {
    return this.client.invoke<ContactCardSetRequest, JmapSetResponse>(
      new ContactCardSet({
        accountId: accountId.value,
        create: Object.fromEntries(Object.entries(contacts).map(([id, contact]) => [id, asCard(contact)])),
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );
  }

  async update(accountId: AccountId, contactId: string, updates: ContactCardUpdate): Promise<JmapSetResponse> {
    const response = await this.client.invoke<ContactCardSetRequest, JmapSetResponse>(
      new ContactCardSet({
        accountId: accountId.value,
        update: { [contactId]: updates },
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );

    assertSetOk(response, "contact");

    return response;
  }

  async destroy(accountId: AccountId, contactId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<ContactCardSetRequest, JmapSetResponse>(
      new ContactCardSet({
        accountId: accountId.value,
        destroy: [contactId],
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );

    assertSetOk(response, "contact");

    return response;
  }
}
