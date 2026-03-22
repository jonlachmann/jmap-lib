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
  [key: string]: unknown;
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

export interface EmailSetRequest {
  accountId: string;
  create?: Record<string, Record<string, unknown>>;
  update?: Record<string, Record<string, unknown>>;
  destroy?: readonly string[];
}

export interface EmailSubmission {
  id: string;
  identityId: string;
  emailId: string;
  threadId?: string;
  envelope?: {
    mailFrom: JmapEmailAddress;
    rcptTo: JmapEmailAddress[];
  };
  sendAt?: string;
  undoStatus?: "pending" | "final" | "canceled";
}

export interface EmailSubmissionSetRequest {
  accountId: string;
  create?: Record<string, {
    emailId: string;
    identityId: string;
  }>;
}

export interface Thread {
  id: string;
  emailIds: string[];
}

export interface ThreadGetRequest {
  accountId: string;
  ids?: readonly string[];
}

export interface ThreadGetResponse {
  accountId: string;
  state?: string;
  list: Thread[];
  notFound?: string[];
}

export interface Identity {
  id: string;
  name: string;
  email: string;
  replyTo?: JmapEmailAddress[];
  bcc?: JmapEmailAddress[];
  textSignature?: string;
  htmlSignature?: string;
  mayDelete?: boolean;
}

export interface IdentityGetRequest {
  accountId: string;
  ids?: readonly string[] | null;
}

export interface IdentityGetResponse {
  accountId: string;
  state?: string;
  list: Identity[];
  notFound?: string[];
}

export interface IdentitySetRequest {
  accountId: string;
  create?: Record<string, Partial<Identity>>;
  update?: Record<string, Partial<Identity>>;
  destroy?: readonly string[];
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
