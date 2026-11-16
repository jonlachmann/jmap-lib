import type { JmapGetArgs } from "../core/get";
import type { JmapPatchObject } from "../core/patch";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query";
import type { JmapSetArgs } from "../core/set";

export interface ContactNameComponent {
  kind: "given" | "surname" | "prefix" | "suffix" | "additional";
  value: string;
}

/** RFC 9553 2.2.1.2: the parts of the name, its full form, or both. */
export interface ContactName {
  components?: ContactNameComponent[];
  isOrdered?: boolean;
  /** The name as a whole, as the person would write it; some clients (Apple's) send only this. */
  full?: string;
}

/** RFC 9553 2.3.1. contexts: "work", "private". */
export interface ContactEmail {
  address: string;
  contexts?: Record<string, boolean>;
  pref?: number;
  label?: string;
}

/** RFC 9553 2.3.3. features: "mobile", "voice", "text", "video", "fax", "pager", "main-number", "textphone". */
export interface ContactPhone {
  number: string;
  contexts?: Record<string, boolean>;
  features?: Record<string, boolean>;
  pref?: number;
  label?: string;
}

export interface ContactOrganization {
  name?: string;
  units?: Array<{ name: string }>;
}

/** RFC 9553 2.5.1.2: one part of an address. kind: "name", "number", "apartment", "locality", "region", "postcode",
 *  "country", "separator" and others. */
export interface ContactAddressComponent {
  kind: string;
  value: string;
}

/** RFC 9553 2.5.1: its parts, its whole as written (full), or both. */
export interface ContactAddress {
  components?: ContactAddressComponent[];
  full?: string;
  isOrdered?: boolean;
  defaultSeparator?: string;
  countryCode?: string;
  contexts?: Record<string, boolean>;
  pref?: number;
}

/** RFC 9553 2.6.4. Content the server stores is given as a blobId (RFC 9610 3), a link as a uri. */
export interface ContactMedia {
  kind: "photo" | "sound" | "logo";
  uri?: string;
  blobId?: string;
  mediaType?: string;
  contexts?: Record<string, boolean>;
  pref?: number;
  label?: string;
}

/** RFC 9553 2.2.2. */
export interface ContactNickname {
  name: string;
  contexts?: Record<string, boolean>;
  pref?: number;
}

/** RFC 9553 2.2.5. kind: "title" or "role"; organizationId: the key of the organization it is held at. */
export interface ContactTitle {
  name: string;
  kind?: "title" | "role";
  organizationId?: string;
}

/** RFC 9553 2.8.3. */
export interface ContactNote {
  note: string;
  created?: string;
  author?: { name?: string; uri?: string };
}

/** RFC 9553 2.6.3. */
export interface ContactLink {
  uri: string;
  kind?: "contact";
  contexts?: Record<string, boolean>;
  pref?: number;
  label?: string;
}

/** RFC 9553 2.8.1.1: a date whose parts may be missing; a Timestamp gives a moment instead. */
export type ContactAnniversaryDate =
  | { "@type"?: "PartialDate"; year?: number; month?: number; day?: number; calendarScale?: string }
  | { "@type": "Timestamp"; utc: string };

/** RFC 9553 2.8.1. kind: "birth", "death", "wedding" and others. */
export interface ContactAnniversary {
  kind: string;
  date: ContactAnniversaryDate;
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
  media?: Record<string, ContactMedia>;
  nicknames?: Record<string, ContactNickname>;
  titles?: Record<string, ContactTitle>;
  notes?: Record<string, ContactNote>;
  links?: Record<string, ContactLink>;
  anniversaries?: Record<string, ContactAnniversary>;
  members?: Record<string, boolean>;
  created?: string;
  updated?: string;
}

/** RFC 9610 2: what a user may do with an address book. */
export interface AddressBookRights {
  mayRead: boolean;
  mayWrite: boolean;
  mayShare: boolean;
  mayDelete: boolean;
}

export interface AddressBook {
  id: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isDefault?: boolean;
  isSubscribed?: boolean;
  /** RFC 9670 4: the principals it is shared with and their rights; null when with no one. */
  shareWith?: Record<string, Partial<AddressBookRights>> | null;
  myRights?: AddressBookRights;
}

export type AddressBookProperty =
  | "id"
  | "name"
  | "description"
  | "sortOrder"
  | "isDefault"
  | "isSubscribed"
  | "shareWith"
  | "myRights";

export interface AddressBookGetRequest extends JmapGetArgs<AddressBookProperty> {}

export interface AddressBookGetResponse {
  accountId: string;
  state: string;
  list: AddressBook[];
}

/** RFC 9610 3.3: the conditions a ContactCard/query filter may hold, each matched as the RFC says. */
export interface ContactCardQueryFilter {
  inAddressBook?: string;
  uid?: string;
  hasMember?: string;
  kind?: string;
  text?: string;
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
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
  | "media"
  | "nicknames"
  | "titles"
  | "notes"
  | "links"
  | "anniversaries"
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
  state: string;
  list: ContactCard[];
  notFound?: string[];
}

export type ContactCardMutable = {
  uid?: string;
  addressBookIds?: Record<string, boolean>;
  kind?: "individual" | "group" | "org";
  name?: ContactName;
  emails?: Record<string, ContactEmail>;
  phones?: Record<string, ContactPhone>;
  organizations?: Record<string, ContactOrganization>;
  addresses?: Record<string, ContactAddress>;
  media?: Record<string, ContactMedia>;
  nicknames?: Record<string, ContactNickname>;
  titles?: Record<string, ContactTitle>;
  notes?: Record<string, ContactNote>;
  links?: Record<string, ContactLink>;
  anniversaries?: Record<string, ContactAnniversary>;
  members?: Record<string, boolean>;
};

export interface ContactCardCreate extends ContactCardMutable {}

export type ContactCardUpdate = JmapPatchObject<ContactCardMutable>;

export interface ContactCardSetRequest extends JmapSetArgs<ContactCardCreate, ContactCardUpdate> {}

export interface ContactCardParseRequest {
  accountId: string;
  blobIds: readonly string[];
  properties?: readonly ContactCardProperty[];
}

/** Each blob's vCard as a card, not stored: no id or address book, media inline as data: uris. */
export interface ContactCardParseResponse {
  accountId: string;
  parsed?: Record<string, Partial<ContactCard>> | null;
  notParsable?: string[] | null;
  notFound?: string[] | null;
}

/** What a client may set on an address book (RFC 9610 2). */
export type AddressBookMutable = {
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isSubscribed?: boolean;
  shareWith?: Record<string, Partial<AddressBookRights>> | null;
};

export interface AddressBookCreate extends AddressBookMutable {
  name: string;
}

export type AddressBookUpdate = JmapPatchObject<AddressBookMutable>;

export interface AddressBookSetRequest extends JmapSetArgs<AddressBookCreate, AddressBookUpdate> {
  onDestroyRemoveContents?: boolean;
  onSuccessSetIsDefault?: string | null;
}

export interface AddressBookChangesRequest extends JmapChangesArgs {}

export interface AddressBookChangesResponse extends JmapChangesResponse {}

export interface ContactCardChangesRequest extends JmapChangesArgs {}

export interface ContactCardChangesResponse extends JmapChangesResponse {}
