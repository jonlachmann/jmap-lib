import type { JmapGetArgs } from "../core/get";
import type { JmapPatchObject } from "../core/patch";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query";
import type { JmapSetArgs } from "../core/set";

export interface ContactNameComponent {
  kind: "given" | "surname" | "prefix" | "suffix" | "additional";
  value: string;
}

export interface ContactName {
  components: ContactNameComponent[];
  isOrdered?: boolean;
}

export interface ContactEmail {
  address: string;
  contexts?: Record<string, boolean>;
  label?: string;
}

export interface ContactPhone {
  number: string;
  contexts?: Record<string, boolean>;
  label?: string;
}

export interface ContactOrganization {
  name?: string;
  units?: Array<{ name: string }>;
}

export interface ContactAddress {
  street?: string;
  locality?: string;
  region?: string;
  postcode?: string;
  country?: string;
  contexts?: Record<string, boolean>;
  label?: string;
}

export interface ContactCard {
  id: string;
  uid?: string;
  addressBookIds: Record<string, boolean>;
  kind?: "individual" | "group" | "org";
  name?: ContactName;
  emails?: Record<string, ContactEmail>;
  phones?: Record<string, ContactPhone>;
  organizations?: Record<string, ContactOrganization>;
  addresses?: Record<string, ContactAddress>;
  members?: Record<string, boolean>;
  created?: string;
  updated?: string;
}

export interface AddressBook {
  id: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isDefault?: boolean;
  isSubscribed?: boolean;
  myRights?: {
    mayRead: boolean;
    mayWrite: boolean;
    mayShare: boolean;
    mayDelete: boolean;
  };
}

export type AddressBookProperty =
  | "id"
  | "name"
  | "description"
  | "sortOrder"
  | "isDefault"
  | "isSubscribed"
  | "myRights";

export interface AddressBookGetRequest extends JmapGetArgs<AddressBookProperty> {}

export interface AddressBookGetResponse {
  accountId: string;
  state?: string;
  list: AddressBook[];
}

export interface ContactCardQueryFilter {
  inAddressBook?: string;
  text?: string;
}

export type ContactCardQuerySortProperty = string & {};

export interface ContactCardQuerySort extends JmapComparator<ContactCardQuerySortProperty> {}

export interface ContactCardQueryRequest extends JmapQueryArgs<ContactCardQueryFilter, ContactCardQuerySort> {}

export interface ContactCardQueryResponse {
  accountId: string;
  queryState?: string;
  ids: string[];
  position: number;
  total?: number;
}

export interface ContactCardQueryChangesRequest
  extends JmapQueryChangesArgs<ContactCardQueryFilter, ContactCardQuerySort> {}

export interface ContactCardQueryChangesResponse extends JmapQueryChangesResponse {}

export type ContactCardProperty =
  | "id"
  | "uid"
  | "addressBookIds"
  | "kind"
  | "name"
  | "emails"
  | "phones"
  | "organizations"
  | "addresses"
  | "members"
  | "created"
  | "updated";

export interface ContactCardGetRequest extends JmapGetArgs<ContactCardProperty> {
  "#ids"?: {
    resultOf: string;
    name: "ContactCard/query";
    path: "/ids";
  };
}

export interface ContactCardGetResponse {
  accountId: string;
  state?: string;
  list: ContactCard[];
  notFound?: string[];
}

export interface ContactCardMutable {
  uid?: string;
  addressBookIds?: Record<string, boolean>;
  kind?: "individual" | "group" | "org";
  name?: ContactName;
  emails?: Record<string, ContactEmail>;
  phones?: Record<string, ContactPhone>;
  organizations?: Record<string, ContactOrganization>;
  addresses?: Record<string, ContactAddress>;
  members?: Record<string, boolean>;
}

export interface ContactCardCreate extends ContactCardMutable {}

export type ContactCardUpdate = JmapPatchObject<ContactCardMutable>;

export interface ContactCardSetRequest extends JmapSetArgs<ContactCardCreate, ContactCardUpdate> {}
