import type { JmapMethod } from "../core/method";
import { AccountId, CallId } from "../core/ids";
import type {
  AddressBookGetRequest,
  AddressBookGetResponse,
  ContactCardGetRequest,
  ContactCardGetResponse,
  ContactCardQueryRequest,
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

export class ContactCardQuery implements JmapMethod<ContactCardQueryRequest, ContactCardQueryResponse> {
  readonly methodName = "ContactCard/query";
  readonly arguments: ContactCardQueryRequest;

  constructor(args: ContactCardQueryRequest) {
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

export class ContactCardSet
  implements JmapMethod<ContactCardSetRequest, import("../core/set").JmapSetResponse>
{
  readonly methodName = "ContactCard/set";
  readonly arguments: ContactCardSetRequest;

  constructor(args: ContactCardSetRequest) {
    this.arguments = args;
  }
}
