import type { JmapGetArgs } from "../core/get";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query";
import type { JmapSetArgs } from "../core/set";

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

export interface MailboxGetRequest extends JmapGetArgs<MailboxProperty> {}

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

export interface EmailQuerySort extends JmapComparator<EmailQuerySortProperty> {}

export interface EmailQueryRequest extends JmapQueryArgs<EmailQueryFilter, EmailQuerySort> {}

export interface EmailQueryResponse {
  accountId: string;
  queryState?: string;
  canCalculateChanges?: boolean;
  position: number;
  ids: string[];
  total?: number;
  limit?: number;
}

export interface EmailQueryChangesRequest extends JmapQueryChangesArgs<EmailQueryFilter, EmailQuerySort> {}

export interface EmailQueryChangesResponse extends JmapQueryChangesResponse {}

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

export interface EmailSetRequest extends JmapSetArgs<Record<string, unknown>, Record<string, unknown>> {}

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

export type ThreadProperty = "id" | "emailIds";

export interface ThreadGetRequest extends JmapGetArgs<ThreadProperty> {}

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

export type IdentityProperty =
  | "id"
  | "name"
  | "email"
  | "replyTo"
  | "bcc"
  | "textSignature"
  | "htmlSignature"
  | "mayDelete";

export interface IdentityGetRequest extends JmapGetArgs<IdentityProperty> {}

export interface IdentityGetResponse {
  accountId: string;
  state?: string;
  list: Identity[];
  notFound?: string[];
}

export interface IdentitySetRequest extends JmapSetArgs<Partial<Identity>, Partial<Identity>> {}

export type IdReference<MethodName extends string = string> = {
  resultOf: string;
  name: MethodName;
  path: string;
};

export interface EmailGetRequest extends JmapGetArgs<EmailProperty> {
  "#ids"?: IdReference<"Email/query">;
}

export interface EmailGetResponse {
  accountId: string;
  state?: string;
  list: JmapEmail[];
  notFound?: string[];
}
