export type JmapMailboxRole =
  | "all"
  | "archive"
  | "drafts"
  | "important"
  | "inbox"
  | "junk"
  | "sent"
  | "snoozed"
  | "trash"
  | (string & {});

export type MailboxProperty =
  | "id"
  | "name"
  | "parentId"
  | "role"
  | "sortOrder"
  | "totalEmails"
  | "unreadEmails"
  | "totalThreads"
  | "unreadThreads"
  | "isSubscribed"
  | "myRights";

export interface JmapMailbox {
  id: string;
  name: string;
  parentId?: string | null;
  role?: JmapMailboxRole | null;
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
  ids?: readonly string[] | null;
  properties?: readonly MailboxProperty[];
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

export type EmailQuerySortProperty =
  | "id"
  | "receivedAt"
  | "sentAt"
  | "size"
  | "from"
  | "to"
  | "subject"
  | "hasKeyword"
  | "someInThreadHaveKeyword"
  | (string & {});

export interface EmailQuerySort {
  property: EmailQuerySortProperty;
  isAscending?: boolean;
}

export interface EmailQueryRequest {
  accountId: string;
  filter?: EmailQueryFilter;
  sort?: readonly EmailQuerySort[];
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

export type EmailProperty =
  | "id"
  | "threadId"
  | "mailboxIds"
  | "keywords"
  | "size"
  | "receivedAt"
  | "sentAt"
  | "from"
  | "to"
  | "cc"
  | "bcc"
  | "replyTo"
  | "subject"
  | "preview"
  | "hasAttachment";

export interface JmapEmail {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords?: Record<string, boolean>;
  receivedAt?: string;
  sentAt?: string;
  from?: JmapEmailAddress[];
  to?: JmapEmailAddress[];
  cc?: JmapEmailAddress[];
  bcc?: JmapEmailAddress[];
  replyTo?: JmapEmailAddress[];
  subject?: string;
  preview?: string;
  hasAttachment?: boolean;
  size?: number;
}

export type IdReference<MethodName extends string = string> = {
  resultOf: string;
  name: MethodName;
  path: string;
};

export interface EmailGetRequest {
  accountId: string;
  ids?: readonly string[];
  "#ids"?: IdReference<"Email/query">;
  properties?: readonly EmailProperty[];
}

export interface EmailGetResponse {
  accountId: string;
  state?: string;
  list: JmapEmail[];
  notFound?: string[];
}
