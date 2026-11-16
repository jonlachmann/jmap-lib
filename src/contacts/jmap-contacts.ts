import { CORE_CONTACTS_CAPABILITIES, CORE_CONTACTS_PARSE_CAPABILITIES } from "../core/capabilities";
import { BlobUpload, type BlobUploadResponse } from "../core/blob";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import type { FilterOperatorCondition } from "../core/query";
import { CREATION_ID, createdOne, getSetError, type JmapCreated, type JmapSetResponse } from "../core/set";
import {
  AddressBookChanges,
  AddressBookGet,
  AddressBookSet,
  ContactCardParse,
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
  AddressBookCreate,
  AddressBookUpdate,
  AddressBookSetRequest,
  ContactCardParseRequest,
  ContactCardParseResponse,
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
    const error = getSetError(response, "notUpdated", addressBookId);
    if (error) {
      throw new Error(error.description || "Failed to update address book");
    }
    return response;
  }

  /** Destroy the address book, and with onDestroyRemoveContents its cards too (RFC 9610 2.3); without, one holding
   *  cards is refused. */
  async destroyAddressBook(accountId: AccountId, addressBookId: string, onDestroyRemoveContents?: boolean): Promise<JmapSetResponse> {
    const response = await this.client.invoke<AddressBookSetRequest, JmapSetResponse>(
      new AddressBookSet({ accountId: accountId.value, destroy: [addressBookId], onDestroyRemoveContents }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );
    const error = getSetError(response, "notDestroyed", addressBookId);
    if (error) {
      throw new Error(error.description || "Failed to delete address book");
    }
    return response;
  }

  /**
   * Parse vCards into cards without storing them, in one request.
   *
   * @param cards One vCard each, as its octets.
   * @returns Each card in the order given, or null for one the server couldn't read.
   */
  async parseCards(accountId: AccountId, cards: readonly Uint8Array[]): Promise<Array<Partial<ContactCard> | null>> {
    const creationIds = cards.map((_, index) => `card${index}`);
    const batch = this.client.batch({ capabilities: CORE_CONTACTS_PARSE_CAPABILITIES });
    const uploadId = batch.call(new BlobUpload({
      accountId: accountId.value,
      create: Object.fromEntries(cards.map((card, index) => [creationIds[index], { data: [{ "data:asBase64": toBase64(card) }], type: "text/vcard" }])),
    }));
    const parseId = batch.call(new ContactCardParse({ accountId: accountId.value, blobIds: creationIds.map((id) => `#${id}`) }));
    const response = await batch.send();
    const uploaded = response.get<BlobUploadResponse>(uploadId, "Blob/upload");
    const parsed = response.get<ContactCardParseResponse>(parseId, "ContactCard/parse");
    return creationIds.map((id) => {
      const blobId = uploaded.created?.[id]?.id;
      return (blobId && parsed.parsed?.[blobId]) || null;
    });
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

  /** The cards a query finds, in its order, from its position, fetched in the same request; the total when asked
   *  (RFC 8620 5.5). */
  async queryCards(
    accountId: AccountId,
    options: {
      filter?: FilterOperatorCondition<ContactCardQueryFilter>;
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
    const query = response.get<import("./types").ContactCardQueryResponse>(queryCallId, "ContactCard/query");
    const cards = response.get<import("./types").ContactCardGetResponse>(getCallId, "ContactCard/get").list;
    return { cards, position: query.position, total: query.total };
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

  async create(accountId: AccountId, contact: Partial<ContactCard>): Promise<JmapCreated> {
    const response = await this.client.invoke<ContactCardSetRequest, JmapSetResponse>(
      new ContactCardSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: contact },
      }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );

    return createdOne(response, "contact");
  }

  /** Create several cards in one ContactCard/set; what wasn't created is in the response's notCreated, not thrown. */
  async createCards(accountId: AccountId, contacts: Record<string, Partial<ContactCard>>): Promise<JmapSetResponse> {
    return this.client.invoke<ContactCardSetRequest, JmapSetResponse>(
      new ContactCardSet({ accountId: accountId.value, create: contacts }),
      { capabilities: CORE_CONTACTS_CAPABILITIES },
    );
  }

  async update(accountId: AccountId, contactId: string, updates: Partial<ContactCard>): Promise<JmapSetResponse> {
    const response = await this.client.invoke<ContactCardSetRequest, JmapSetResponse>(
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

    const error = getSetError(response, "notDestroyed", contactId);
    if (error) {
      throw new Error(error.description || "Failed to delete contact");
    }

    return response;
  }
}

/** Encode the octets as base64, a chunk at a time so a large card doesn't overflow the argument list. */
function toBase64(octets: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < octets.length; i += 0x8000) binary += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binary);
}
