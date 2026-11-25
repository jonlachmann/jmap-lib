import type { JmapGetResponse } from "../core/get.js";
import type { JmapQueryResponse } from "../core/query.js";
import type { JmapGetArgs } from "../core/get.js";
import type { JmapPatchObject } from "../core/patch.js";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes.js";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query.js";
import type { JmapSetArgs } from "../core/set.js";

/** RFC 9553 2.2.1.2. */
export interface ContactNameComponent {
  kind: "title" | "given" | "given2" | "surname" | "surname2" | "credential" | "generation" | "separator" | (string & {});
  value: string;
  /** How the value is pronounced, in the name's phoneticSystem or phoneticScript. */
  phonetic?: string;
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
  contexts?: Record<string, true>;
  pref?: number;
  label?: string;
}

/** RFC 9553 2.3.3. features: "mobile", "voice", "text", "video", "fax", "pager", "main-number", "textphone". */
export interface ContactPhone {
  number: string;
  contexts?: Record<string, true>;
  features?: Record<string, true>;
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
  contexts?: Record<string, true>;
  pref?: number;
}

/** RFC 9553 2.6.4. Content the server stores is given as a blobId (RFC 9610 3), a link as a uri. */
export interface ContactMedia {
  kind: "photo" | "sound" | "logo";
  uri?: string;
  blobId?: string;
  mediaType?: string;
  contexts?: Record<string, true>;
  pref?: number;
  label?: string;
}

/** RFC 9553 2.2.2. */
export interface ContactNickname {
  name: string;
  contexts?: Record<string, true>;
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
  contexts?: Record<string, true>;
  pref?: number;
  label?: string;
}

/** RFC 9553 1.4.4: a resource named by a uri. */
export interface ContactResource {
  kind?: string;
  uri: string;
  mediaType?: string;
  contexts?: Record<string, true>;
  pref?: number;
  label?: string;
}

/** RFC 9553 2.4.1. */
export interface ContactCalendar extends ContactResource {
  kind?: "calendar" | "freeBusy" | (string & {});
}

/** RFC 9553 2.4.2: where to send the contact calendar invitations. */
export interface ContactSchedulingAddress {
  uri: string;
  contexts?: Record<string, true>;
  pref?: number;
  label?: string;
}

/** RFC 9553 2.6.2. */
export interface ContactDirectory extends ContactResource {
  kind?: "directory" | "entry" | (string & {});
  listAs?: number;
}

/** RFC 9553 2.3.4. */
export interface ContactLanguagePref {
  language: string;
  contexts?: Record<string, true>;
  pref?: number;
}

/** RFC 9553 2.2.4: how to address the contact. */
export interface ContactSpeakToAs {
  grammaticalGender?: "animate" | "common" | "feminine" | "inanimate" | "masculine" | "neuter" | (string & {});
  pronouns?: Record<string, { pronouns: string; contexts?: Record<string, true>; pref?: number }>;
}

/** RFC 9553 2.8.4. */
export interface ContactPersonalInfo {
  kind: "expertise" | "hobby" | "interest" | (string & {});
  value: string;
  level?: "high" | "medium" | "low" | (string & {});
  listAs?: number;
  label?: string;
}

/** RFC 9553 2.3.2: an account at a service, such as chat or social media. */
export interface ContactOnlineService {
  service?: string;
  uri?: string;
  user?: string;
  contexts?: Record<string, true>;
  pref?: number;
  label?: string;
}

/** RFC 9553 2.1.8: how the card relates to another, keyed by that card's uid. */
export interface ContactRelation {
  relation?: Record<string, true>;
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
  addressBookIds: Record<string, true>;
  "@type": "Card";
  /** RFC 9553 2.1.2: the JSContact version, "1.0". */
  version: string;
  prodId?: string;
  kind?: "individual" | "group" | "org" | "location" | "device" | "application" | (string & {});
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
  onlineServices?: Record<string, ContactOnlineService>;
  relatedTo?: Record<string, ContactRelation>;
  language?: string;
  speakToAs?: ContactSpeakToAs;
  preferredLanguages?: Record<string, ContactLanguagePref>;
  calendars?: Record<string, ContactCalendar>;
  schedulingAddresses?: Record<string, ContactSchedulingAddress>;
  cryptoKeys?: Record<string, ContactResource>;
  directories?: Record<string, ContactDirectory>;
  personalInfo?: Record<string, ContactPersonalInfo>;
  /** RFC 9553 2.7.1: per language tag, a patch giving the card in that language. */
  localizations?: Record<string, Record<string, unknown>>;
  /** RFC 9553 2.5.3: free-text tags, as categories. */
  keywords?: Record<string, true>;
  members?: Record<string, true>;
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

/** Every right AddressBookRights holds, for code that reads or sets them by name. */
export const ADDRESS_BOOK_RIGHTS = [
  "mayRead",
  "mayWrite",
  "mayShare",
  "mayDelete",
] as const satisfies readonly (keyof AddressBookRights)[];

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

export type AddressBookGetResponse = JmapGetResponse<AddressBook>;

/** RFC 9610 3.3: the conditions a ContactCard/query filter may hold, each matched as the RFC says. */
export interface ContactCardQueryFilter {
  inAddressBook?: string;
  uid?: string;
  hasMember?: string;
  kind?: string;
  createdBefore?: string;
  createdAfter?: string;
  updatedBefore?: string;
  updatedAfter?: string;
  text?: string;
  name?: string;
  "name/given"?: string;
  "name/surname"?: string;
  "name/surname2"?: string;
  nickname?: string;
  organization?: string;
  email?: string;
  phone?: string;
  onlineService?: string;
  address?: string;
  note?: string;
}

export type ContactCardQuerySortProperty = string & {};

export interface ContactCardQuerySort extends JmapComparator<ContactCardQuerySortProperty> {}

export interface ContactCardQueryRequest extends JmapQueryArgs<ContactCardQueryFilter, ContactCardQuerySort> {}

export type ContactCardQueryResponse = JmapQueryResponse;

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
  | "onlineServices"
  | "relatedTo"
  | "@type"
  | "version"
  | "prodId"
  | "language"
  | "speakToAs"
  | "preferredLanguages"
  | "calendars"
  | "schedulingAddresses"
  | "cryptoKeys"
  | "directories"
  | "personalInfo"
  | "localizations"
  | "keywords"
  | "members"
  | "created"
  | "updated";

export interface ContactCardGetRequest extends JmapGetArgs<ContactCardProperty> {}

export type ContactCardGetResponse = JmapGetResponse<ContactCard>;

export type ContactCardMutable = {
  uid?: string;
  addressBookIds?: Record<string, true>;
  kind?: "individual" | "group" | "org" | "location" | "device" | "application" | (string & {});
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
  onlineServices?: Record<string, ContactOnlineService>;
  relatedTo?: Record<string, ContactRelation>;
  language?: string;
  speakToAs?: ContactSpeakToAs;
  preferredLanguages?: Record<string, ContactLanguagePref>;
  calendars?: Record<string, ContactCalendar>;
  schedulingAddresses?: Record<string, ContactSchedulingAddress>;
  cryptoKeys?: Record<string, ContactResource>;
  directories?: Record<string, ContactDirectory>;
  personalInfo?: Record<string, ContactPersonalInfo>;
  /** RFC 9553 2.7.1: per language tag, a patch giving the card in that language. */
  localizations?: Record<string, Record<string, unknown>>;
  keywords?: Record<string, true>;
  members?: Record<string, true>;
};

/** RFC 9553 2.1 requires @type and version on a card; JmapContacts fills them in when left out. */
export interface ContactCardCreate extends ContactCardMutable {
  "@type"?: "Card";
  version?: string;
}

export type ContactCardUpdate = JmapPatchObject<ContactCardMutable>;

export interface ContactCardSetRequest extends JmapSetArgs<ContactCardCreate, ContactCardUpdate> {}

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
