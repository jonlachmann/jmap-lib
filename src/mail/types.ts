export interface JmapMailbox {
  id: string;
  name: string;
  parentId?: string | null;
  role?: string | null;
  sortOrder?: number;
  totalEmails?: number;
  unreadEmails?: number;
  totalThreads?: number;
  unreadThreads?: number;
  isSubscribed?: boolean;
  myRights?: Record<string, boolean>;
}

export interface MailboxGetRequest {
  accountId: string;
  ids?: string[] | null;
  properties?: string[];
}

export interface MailboxGetResponse {
  accountId: string;
  state?: string;
  list: JmapMailbox[];
  notFound?: string[];
}

export interface EmailQueryFilter {
  inMailbox?: string;
}

export interface EmailQuerySort {
  property: string;
  isAscending?: boolean;
}

export interface EmailQueryRequest {
  accountId: string;
  filter?: EmailQueryFilter;
  sort?: EmailQuerySort[];
  position?: number;
  limit?: number;
  calculateTotal?: boolean;
}

export interface EmailQueryResponse {
  accountId: string;
  queryState?: string;
  canCalculateChanges?: boolean;
  position: number;
  ids: string[];
  total?: number;
  limit?: number;
}

export interface JmapEmailAddress {
  name?: string;
  email: string;
}

export interface JmapEmail {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords?: Record<string, boolean>;
  receivedAt?: string;
  from?: JmapEmailAddress[];
  to?: JmapEmailAddress[];
  subject?: string;
  preview?: string;
  hasAttachment?: boolean;
  size?: number;
}

export type IdReference = {
  resultOf: string;
  name: string;
  path: string;
};

export interface EmailGetRequest {
  accountId: string;
  ids?: string[];
  "#ids"?: IdReference;
  properties?: string[];
}

export interface EmailGetResponse {
  accountId: string;
  state?: string;
  list: JmapEmail[];
  notFound?: string[];
}
