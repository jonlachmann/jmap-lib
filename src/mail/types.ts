import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes";
import type { JmapGetArgs } from "../core/get";
import type { JmapPatchObject } from "../core/patch";
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

/** RFC 8621 2: what a user may do with a mailbox. */
export interface MailboxRights {
  mayReadItems: boolean;
  mayAddItems: boolean;
  mayRemoveItems: boolean;
  maySetSeen: boolean;
  maySetKeywords: boolean;
  mayCreateChild: boolean;
  mayRename: boolean;
  mayDelete: boolean;
  maySubmit: boolean;
}

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
  myRights?: MailboxRights;
}

export interface MailboxGetRequest extends JmapGetArgs<MailboxProperty> {}

export interface MailboxGetResponse {
  accountId: string;
  state: string;
  list: JmapMailbox[];
  notFound?: string[];
}

export interface MailboxChangesRequest extends JmapChangesArgs {}

export interface MailboxChangesResponse extends JmapChangesResponse {
  updatedProperties?: readonly MailboxProperty[] | null;
}

export interface MailboxQueryFilter {
  parentId?: string | null;
  name?: string;
  role?: JmapMailboxRole | null;
  hasAnyRole?: boolean;
  isSubscribed?: boolean;
}

export type MailboxQuerySortProperty = "sortOrder" | "name";

export interface MailboxQuerySort extends JmapComparator<MailboxQuerySortProperty> {}

export interface MailboxQueryRequest extends JmapQueryArgs<MailboxQueryFilter, MailboxQuerySort> {
  sortAsTree?: boolean;
  filterAsTree?: boolean;
}

export interface MailboxQueryResponse {
  accountId: string;
  queryState?: string;
  canCalculateChanges?: boolean;
  position: number;
  ids: string[];
  total?: number;
  limit?: number;
}

export interface MailboxQueryChangesRequest extends JmapQueryChangesArgs<MailboxQueryFilter, MailboxQuerySort> {}

export interface MailboxQueryChangesResponse extends JmapQueryChangesResponse {}

export interface EmailQueryFilter {
  [key: string]: unknown;
  inMailbox?: string;
  inMailboxOtherThan?: string[];
  before?: string;
  after?: string;
  minSize?: number;
  maxSize?: number;
  hasAttachment?: boolean;
  text?: string;
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  hasKeyword?: string;
  notKeyword?: string;
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

export interface EmailQueryRequest extends JmapQueryArgs<EmailQueryFilter, EmailQuerySort> {
  collapseThreads?: boolean;
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

export interface EmailQueryChangesRequest extends JmapQueryChangesArgs<EmailQueryFilter, EmailQuerySort> {
  collapseThreads?: boolean;
}

export interface EmailQueryChangesResponse extends JmapQueryChangesResponse {}

export interface EmailChangesRequest extends JmapChangesArgs {}

export interface EmailChangesResponse extends JmapChangesResponse {}

export interface JmapEmailAddress {
  name?: string;
  email: string;
}

export interface EmailBodyValue {
  value: string;
  charset?: string;
  isEncodingProblem?: boolean;
  isTruncated?: boolean;
}

export interface EmailBodyPartReference {
  partId: string;
  type?: string;
}

export interface EmailAttachment {
  blobId: string;
  type: string;
  name?: string;
  size?: number;
  disposition?: "attachment" | "inline";
  cid?: string;
  partId?: string;
}

export type JmapKeyword = string & {};

export type EmailProperty =
  | "id"
  | "threadId"
  | "mailboxIds"
  | "keywords"
  | "size"
  | "receivedAt"
  | "sentAt"
  | "messageId"
  | "inReplyTo"
  | "references"
  | "from"
  | "sender"
  | "to"
  | "cc"
  | "bcc"
  | "replyTo"
  | "subject"
  | "preview"
  | "hasAttachment"
  | "bodyValues"
  | "textBody"
  | "htmlBody"
  | "attachments"
  /** RFC 8621 4.1.3: a header field by name, with an optional form and :all, such as "header:List-Id:asText". */
  | `header:${string}`;

export interface JmapEmail {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords?: Record<JmapKeyword, boolean>;
  receivedAt?: string;
  sentAt?: string;
  messageId?: string[];
  inReplyTo?: string[];
  references?: string[];
  from?: JmapEmailAddress[];
  /** RFC 8621 4.1.2.3: the Sender header, who sent the message for its author. */
  sender?: JmapEmailAddress[];
  to?: JmapEmailAddress[];
  cc?: JmapEmailAddress[];
  bcc?: JmapEmailAddress[];
  replyTo?: JmapEmailAddress[];
  subject?: string;
  preview?: string;
  hasAttachment?: boolean;
  size?: number;
  bodyValues?: Record<string, EmailBodyValue>;
  textBody?: EmailBodyPartReference[];
  htmlBody?: EmailBodyPartReference[];
  attachments?: EmailAttachment[];
  /** RFC 8621 4.1.3: the header fields asked for by name; the form asked for decides the value's shape, and null is
   *  a field the message doesn't have. */
  [header: `header:${string}`]: unknown;
}

export type EmailMutable = {
  mailboxIds?: Record<string, boolean>;
  keywords?: Record<JmapKeyword, boolean>;
  from?: JmapEmailAddress[];
  to?: JmapEmailAddress[];
  cc?: JmapEmailAddress[];
  bcc?: JmapEmailAddress[];
  replyTo?: JmapEmailAddress[];
  subject?: string;
  bodyValues?: Record<string, EmailBodyValue>;
  textBody?: EmailBodyPartReference[];
  htmlBody?: EmailBodyPartReference[];
  attachments?: EmailAttachment[];
};

export interface EmailCreate extends EmailMutable {
  messageId?: string[];
  inReplyTo?: string[];
  references?: string[];
}

export type EmailUpdate = JmapPatchObject<EmailMutable>;

export interface EmailSetRequest extends JmapSetArgs<EmailCreate, EmailUpdate> {}

export interface MailboxSetEntry {
  name?: string;
  parentId?: string | null;
  role?: JmapMailboxRole | null;
  sortOrder?: number;
  isSubscribed?: boolean;
}

export interface MailboxSetRequest extends JmapSetArgs<MailboxSetEntry, MailboxSetEntry> {
  onDestroyRemoveEmails?: boolean;
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
  /**
   * RFC 8621 §7.5: Email/set patches applied if the keyed submission succeeds. Keys are
   * EmailSubmission ids or "#" + a creation id from `create`.
   */
  onSuccessUpdateEmail?: Record<string, Record<string, unknown>>;
  /** EmailSubmission ids or "#" + a creation id, whose Email is destroyed on success. */
  onSuccessDestroyEmail?: string[];
}

export interface Thread {
  id: string;
  emailIds: string[];
}

export type ThreadProperty = "id" | "emailIds";

export interface ThreadGetRequest extends JmapGetArgs<ThreadProperty> {}

export interface ThreadGetResponse {
  accountId: string;
  state: string;
  list: Thread[];
  notFound?: string[];
}

export interface ThreadChangesRequest extends JmapChangesArgs {}

export interface ThreadChangesResponse extends JmapChangesResponse {}

export interface Identity {
  id: string;
  name: string;
  email: string;
  replyTo?: JmapEmailAddress[] | null;
  bcc?: JmapEmailAddress[] | null;
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
  state: string;
  list: Identity[];
  notFound?: string[];
}

export interface IdentityChangesRequest extends JmapChangesArgs {}

export interface IdentityChangesResponse extends JmapChangesResponse {}

export type IdentityMutable = {
  name?: string;
  email?: string;
  replyTo?: JmapEmailAddress[] | null;
  bcc?: JmapEmailAddress[] | null;
  textSignature?: string;
  htmlSignature?: string;
};

export interface IdentityCreate extends IdentityMutable {}

export type IdentityUpdate = JmapPatchObject<IdentityMutable>;

export interface IdentitySetRequest extends JmapSetArgs<IdentityCreate, IdentityUpdate> {}

export type IdReference<MethodName extends string = string> = {
  resultOf: string;
  name: MethodName;
  path: string;
};

export interface EmailGetRequest extends JmapGetArgs<EmailProperty> {
  "#ids"?: IdReference<"Email/query" | "Thread/get">;
  fetchTextBodyValues?: boolean;
  fetchHTMLBodyValues?: boolean;
  fetchAllBodyValues?: boolean;
  maxBodyValueBytes?: number;
}

export interface EmailGetResponse {
  accountId: string;
  state: string;
  list: JmapEmail[];
  notFound?: string[];
}
