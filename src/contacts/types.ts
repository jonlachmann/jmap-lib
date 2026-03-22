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

export interface AddressBookGetRequest {
  accountId: string;
}

export interface AddressBookGetResponse {
  accountId: string;
  state?: string;
  list: AddressBook[];
}

export interface ContactCardQueryRequest {
  accountId: string;
  filter?: {
    inAddressBook?: string;
    text?: string;
  };
  limit?: number;
}

export interface ContactCardQueryResponse {
  accountId: string;
  queryState?: string;
  ids: string[];
  position: number;
  total?: number;
}

export interface ContactCardGetRequest {
  accountId: string;
  ids?: readonly string[];
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

export interface ContactCardSetRequest {
  accountId: string;
  create?: Record<string, Partial<ContactCard>>;
  update?: Record<string, Partial<ContactCard>>;
  destroy?: readonly string[];
}
