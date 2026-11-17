import type { JmapResultReference } from "../core/reference.js";
import type { JmapGetResponse } from "../core/get.js";
import type { JmapQueryResponse } from "../core/query.js";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes.js";
import type { JmapGetArgs } from "../core/get.js";
import type { JmapPatchObject } from "../core/patch.js";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query.js";
import type { JmapSetArgs, JmapSetError } from "../core/set.js";
import type { JmapCopyArgs, JmapCopyResponse } from "../core/copy.js";

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

export type MailboxGetResponse = JmapGetResponse<JmapMailbox>;

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

export type MailboxQueryResponse = JmapQueryResponse;

export interface MailboxQueryChangesRequest extends JmapQueryChangesArgs<MailboxQueryFilter, MailboxQuerySort> {}

export interface MailboxQueryChangesResponse extends JmapQueryChangesResponse {}

/** RFC 8621 4.4.1. */
export interface EmailQueryFilter {
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
  allInThreadHaveKeyword?: string;
  someInThreadHaveKeyword?: string;
  noneInThreadHaveKeyword?: string;
  /** A header field's name, and optionally text its value must contain. */
  header?: [name: string] | [name: string, value: string];
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
  | "allInThreadHaveKeyword"
  | "someInThreadHaveKeyword"
  | (string & {});

/** RFC 8621 4.4.2: the keyword sorts name their keyword. */
export interface EmailQuerySort extends JmapComparator<EmailQuerySortProperty> {
  keyword?: string;
}

export interface EmailQueryRequest extends JmapQueryArgs<EmailQueryFilter, EmailQuerySort> {
  collapseThreads?: boolean;
}

export type EmailQueryResponse = JmapQueryResponse;

export interface EmailQueryChangesRequest extends JmapQueryChangesArgs<EmailQueryFilter, EmailQuerySort> {
  collapseThreads?: boolean;
}

export interface EmailQueryChangesResponse extends JmapQueryChangesResponse {}

export interface EmailChangesRequest extends JmapChangesArgs {}

export interface EmailChangesResponse extends JmapChangesResponse {}

export interface JmapEmailAddress {
  name?: string | null;
  email: string;
}

export interface EmailBodyValue {
  value: string;
  charset?: string;
  isEncodingProblem?: boolean;
  isTruncated?: boolean;
}

export interface EmailHeader {
  name: string;
  value: string;
}

/**
 * RFC 8621 4.1.4: a leaf part of the message, as in textBody, htmlBody and attachments, with the properties the server
 * gives by default (bodyProperties not given).
 */
export interface EmailBodyPart {
  partId: string;
  blobId: string;
  size: number;
  headers?: EmailHeader[];
  name: string | null;
  type: string;
  charset: string | null;
  disposition: string | null;
  cid: string | null;
  language: string[] | null;
  location: string | null;
  [header: `header:${string}`]: unknown;
}

/** RFC 8621 4.1.4: the message's whole MIME tree; a multipart part has subParts, and no partId or blobId. */
export interface EmailBodyStructure extends Omit<EmailBodyPart, "partId" | "blobId"> {
  partId: string | null;
  blobId: string | null;
  subParts?: EmailBodyStructure[] | null;
}

/** RFC 8621 4.6: a part to create, with its content in bodyValues under partId, or an uploaded blobId. */
export interface EmailBodyPartCreate {
  partId?: string;
  blobId?: string;
  headers?: EmailHeader[];
  name?: string | null;
  type?: string;
  charset?: string | null;
  disposition?: string | null;
  cid?: string | null;
  language?: string[] | null;
  location?: string | null;
  subParts?: EmailBodyPartCreate[];
  [header: `header:${string}`]: unknown;
}

export type JmapKeyword = string & {};

export type EmailProperty =
  | "id"
  | "blobId"
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
  | "headers"
  | "bodyStructure"
  | "bodyValues"
  | "textBody"
  | "htmlBody"
  | "attachments"
  /** RFC 8621 4.1.3: a header field by name, with an optional form and :all, such as "header:List-Id:asText". */
  | `header:${string}`;

export interface JmapEmail {
  id: string;
  /** The raw message (RFC 5322). */
  blobId?: string;
  threadId: string;
  mailboxIds: Record<string, true>;
  keywords?: Record<JmapKeyword, true>;
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
  headers?: EmailHeader[];
  bodyStructure?: EmailBodyStructure;
  bodyValues?: Record<string, EmailBodyValue>;
  textBody?: EmailBodyPart[];
  htmlBody?: EmailBodyPart[];
  attachments?: EmailBodyPart[];
  /** RFC 8621 4.1.3: the header fields asked for by name; the form asked for decides the value's shape, and null is
   *  a field the message doesn't have. */
  [header: `header:${string}`]: unknown;
}

/** RFC 8621 4.6: only an Email's mailboxes and keywords change after it is made. */
export type EmailMutable = {
  mailboxIds?: Record<string, true>;
  keywords?: Record<JmapKeyword, true>;
};

export interface EmailCreate extends EmailMutable {
  mailboxIds: Record<string, true>;
  receivedAt?: string;
  sentAt?: string;
  messageId?: string[];
  inReplyTo?: string[];
  references?: string[];
  from?: JmapEmailAddress[];
  sender?: JmapEmailAddress[];
  to?: JmapEmailAddress[];
  cc?: JmapEmailAddress[];
  bcc?: JmapEmailAddress[];
  replyTo?: JmapEmailAddress[];
  subject?: string;
  headers?: EmailHeader[];
  bodyStructure?: EmailBodyPartCreate;
  bodyValues?: Record<string, EmailBodyValue>;
  textBody?: EmailBodyPartCreate[];
  htmlBody?: EmailBodyPartCreate[];
  attachments?: EmailBodyPartCreate[];
  [header: `header:${string}`]: unknown;
}

export type EmailUpdate = JmapPatchObject<EmailMutable>;

export interface EmailSetRequest extends JmapSetArgs<EmailCreate, EmailUpdate> {}

/** What the server answers for an Email it made by Email/copy or Email/import (RFC 8621 4.7, 4.8). */
export interface EmailCreated {
  id: string;
  blobId: string;
  threadId: string;
  size: number;
}

/** RFC 8621 4.7: a copy sets only these; the message stays as it is. */
export interface EmailCopyObject {
  mailboxIds: Record<string, true>;
  keywords?: Record<JmapKeyword, true>;
  receivedAt?: string;
}

export interface EmailCopyRequest extends JmapCopyArgs<EmailCopyObject> {}

export type EmailCopyResponse = JmapCopyResponse<EmailCreated>;

/** RFC 8621 4.8: a message uploaded as a blob, to make an Email of. */
export interface EmailImportObject {
  blobId: string;
  /** At least one. */
  mailboxIds: Record<string, true>;
  keywords?: Record<JmapKeyword, true>;
  /** The most recent Received header's time, or the import's, when not given. */
  receivedAt?: string;
}

export interface EmailImportRequest {
  accountId: string;
  ifInState?: string | null;
  emails: Record<string, EmailImportObject>;
}

export interface EmailImportResponse {
  accountId: string;
  oldState: string | null;
  newState: string;
  created?: Record<string, EmailCreated> | null;
  /** A duplicate the server refuses is alreadyExists, with the Email's existingId. */
  notCreated?: Record<string, JmapSetError> | null;
}

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

/** RFC 8621 7: an SMTP address with its MAIL FROM or RCPT TO parameters. */
export interface EmailSubmissionAddress {
  email: string;
  parameters?: Record<string, string | null> | null;
}

export interface EmailSubmissionEnvelope {
  mailFrom: EmailSubmissionAddress;
  rcptTo: EmailSubmissionAddress[];
}

/** RFC 8621 7: how delivery to one recipient went. */
export interface EmailDeliveryStatus {
  smtpReply: string;
  delivered: "queued" | "yes" | "no" | "unknown";
  displayed: "unknown" | "yes";
}

export interface EmailSubmission {
  id: string;
  identityId: string;
  emailId: string;
  threadId?: string;
  envelope?: EmailSubmissionEnvelope | null;
  sendAt?: string;
  undoStatus?: "pending" | "final" | "canceled";
  deliveryStatus?: Record<string, EmailDeliveryStatus> | null;
  dsnBlobIds?: string[];
  mdnBlobIds?: string[];
}

export type EmailSubmissionProperty = keyof EmailSubmission;

export interface EmailSubmissionGetRequest extends JmapGetArgs<EmailSubmissionProperty> {}

export type EmailSubmissionGetResponse = JmapGetResponse<EmailSubmission>;

export interface EmailSubmissionChangesRequest extends JmapChangesArgs {}

export interface EmailSubmissionChangesResponse extends JmapChangesResponse {}

/** RFC 8621 7.3. */
export interface EmailSubmissionFilter {
  identityIds?: string[];
  emailIds?: string[];
  threadIds?: string[];
  undoStatus?: NonNullable<EmailSubmission["undoStatus"]>;
  /** sendAt before this UTCDate. */
  before?: string;
  /** sendAt on or after this UTCDate. */
  after?: string;
}

/** RFC 8621 7.3 lists "sentAt", which an EmailSubmission doesn't have; sendAt is meant, and a server may take either. */
export type EmailSubmissionSortProperty = "emailId" | "threadId" | "sendAt" | "sentAt";

export interface EmailSubmissionSort extends JmapComparator<EmailSubmissionSortProperty> {}

export interface EmailSubmissionQueryRequest extends JmapQueryArgs<EmailSubmissionFilter, EmailSubmissionSort> {}

export type EmailSubmissionQueryResponse = JmapQueryResponse;

export interface EmailSubmissionQueryChangesRequest
  extends JmapQueryChangesArgs<EmailSubmissionFilter, EmailSubmissionSort> {}

export interface EmailSubmissionQueryChangesResponse extends JmapQueryChangesResponse {}

export interface EmailSubmissionCreate {
  identityId: string;
  emailId: string;
  /** Without one, the server makes it from the message's headers. */
  envelope?: EmailSubmissionEnvelope | null;
}

/** RFC 8621 7: a pending submission can only be canceled. */
export interface EmailSubmissionUpdate {
  undoStatus: "canceled";
}

export interface EmailSubmissionSetRequest extends JmapSetArgs<EmailSubmissionCreate, EmailSubmissionUpdate> {
  /**
   * RFC 8621 7.5: Email/set patches applied if the keyed submission succeeds. Keys are
   * EmailSubmission ids or "#" + a creation id from `create`.
   */
  onSuccessUpdateEmail?: Record<string, EmailUpdate> | null;
  /** EmailSubmission ids or "#" + a creation id, whose Email is destroyed on success. */
  onSuccessDestroyEmail?: string[] | null;
}

export interface Thread {
  id: string;
  emailIds: string[];
}

export type ThreadProperty = "id" | "emailIds";

export interface ThreadGetRequest extends JmapGetArgs<ThreadProperty> {}

export type ThreadGetResponse = JmapGetResponse<Thread>;

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

export type IdentityGetResponse = JmapGetResponse<Identity>;

export interface IdentityChangesRequest extends JmapChangesArgs {}

export interface IdentityChangesResponse extends JmapChangesResponse {}

export type IdentityMutable = {
  name?: string;
  replyTo?: JmapEmailAddress[] | null;
  bcc?: JmapEmailAddress[] | null;
  textSignature?: string;
  htmlSignature?: string;
};

/** RFC 8621 6: an identity's address is set when it is made, and fixed after. */
export interface IdentityCreate extends IdentityMutable {
  email: string;
}

export type IdentityUpdate = JmapPatchObject<IdentityMutable>;

export interface IdentitySetRequest extends JmapSetArgs<IdentityCreate, IdentityUpdate> {}

export interface EmailGetRequest extends JmapGetArgs<EmailProperty> {
  "#ids"?: JmapResultReference<"Email/query" | "Thread/get">;
  fetchTextBodyValues?: boolean;
  fetchHTMLBodyValues?: boolean;
  fetchAllBodyValues?: boolean;
  maxBodyValueBytes?: number;
  /** The properties of each body part, in place of the server's default. */
  bodyProperties?: readonly string[];
}

export type EmailGetResponse = JmapGetResponse<JmapEmail>;
