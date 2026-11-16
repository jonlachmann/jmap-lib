import type { JmapMethod } from "../core/method";
import { AccountId, CallId } from "../core/ids";
import type { JmapSetResponse } from "../core/set";
import type {
  AddressBookChangesRequest,
  AddressBookChangesResponse,
  AddressBookGetRequest,
  AddressBookGetResponse,
  AddressBookSetRequest,
  ContactCardParseRequest,
  ContactCardParseResponse,
  ContactCardChangesRequest,
  ContactCardChangesResponse,
  ContactCardGetRequest,
  ContactCardGetResponse,
  ContactCardQueryRequest,
  ContactCardQueryChangesRequest,
  ContactCardQueryChangesResponse,
  ContactCardQueryResponse,
  ContactCardSetRequest,
} from "./types";

export class AddressBookGet implements JmapMethod<AddressBookGetRequest, AddressBookGetResponse> {
  readonly methodName = "AddressBook/get";
  readonly arguments: AddressBookGetRequest;

  constructor(args: AddressBookGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): AddressBookGet {
    return new AddressBookGet({ accountId: accountId.value });
  }
}

export class AddressBookChanges implements JmapMethod<AddressBookChangesRequest, AddressBookChangesResponse> {
  readonly methodName = "AddressBook/changes";
  readonly arguments: AddressBookChangesRequest;

  constructor(args: AddressBookChangesRequest) {
    this.arguments = args;
  }
}

export class ContactCardChanges implements JmapMethod<ContactCardChangesRequest, ContactCardChangesResponse> {
  readonly methodName = "ContactCard/changes";
  readonly arguments: ContactCardChangesRequest;

  constructor(args: ContactCardChangesRequest) {
    this.arguments = args;
  }
}

export class ContactCardQuery implements JmapMethod<ContactCardQueryRequest, ContactCardQueryResponse> {
  readonly methodName = "ContactCard/query";
  readonly arguments: ContactCardQueryRequest;

  constructor(args: ContactCardQueryRequest) {
    this.arguments = args;
  }
}

export class ContactCardQueryChanges
  implements JmapMethod<ContactCardQueryChangesRequest, ContactCardQueryChangesResponse>
{
  readonly methodName = "ContactCard/queryChanges";
  readonly arguments: ContactCardQueryChangesRequest;

  constructor(args: ContactCardQueryChangesRequest) {
    this.arguments = args;
  }
}

export class ContactCardGet implements JmapMethod<ContactCardGetRequest, ContactCardGetResponse> {
  readonly methodName = "ContactCard/get";
  readonly arguments: ContactCardGetRequest;

  constructor(args: ContactCardGetRequest) {
    this.arguments = args;
  }

  static byIds(accountId: AccountId, ids: readonly string[]): ContactCardGet {
    return new ContactCardGet({ accountId: accountId.value, ids });
  }

  static byQueryResult(accountId: AccountId, queryCallId: CallId): ContactCardGet {
    return new ContactCardGet({
      accountId: accountId.value,
      "#ids": {
        resultOf: queryCallId.value,
        name: "ContactCard/query",
        path: "/ids",
      },
    });
  }
}

export class AddressBookSet
  implements JmapMethod<AddressBookSetRequest, JmapSetResponse>
{
  readonly methodName = "AddressBook/set";
  readonly arguments: AddressBookSetRequest;

  constructor(args: AddressBookSetRequest) {
    this.arguments = args;
  }
}

/** One vCard per blob as a card, not stored (Stalwart's and Cyrus' ContactCard/parse). */
export class ContactCardParse implements JmapMethod<ContactCardParseRequest, ContactCardParseResponse> {
  readonly methodName = "ContactCard/parse";
  readonly arguments: ContactCardParseRequest;

  constructor(args: ContactCardParseRequest) {
    this.arguments = args;
  }
}

export class ContactCardSet
  implements JmapMethod<ContactCardSetRequest, JmapSetResponse>
{
  readonly methodName = "ContactCard/set";
  readonly arguments: ContactCardSetRequest;

  constructor(args: ContactCardSetRequest) {
    this.arguments = args;
  }
}
