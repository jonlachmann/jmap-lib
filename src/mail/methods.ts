import { resultOf } from "../core/reference.js";
import { AccountId, CallId } from "../core/ids.js";
import type { JmapMethod } from "../core/method.js";
import type { JmapSetResponse } from "../core/set.js";
import type {
  EmailCopyRequest,
  EmailCopyResponse,
  EmailImportRequest,
  EmailImportResponse,
  EmailSubmissionChangesRequest,
  EmailSubmissionChangesResponse,
  EmailSubmissionGetRequest,
  EmailSubmissionGetResponse,
  EmailSubmissionQueryChangesRequest,
  EmailSubmissionQueryChangesResponse,
  EmailSubmissionQueryRequest,
  EmailSubmissionQueryResponse,
  EmailChangesRequest,
  EmailChangesResponse,
  EmailGetRequest,
  EmailGetResponse,
  EmailSetRequest,
  EmailSubmissionSetRequest,
  IdentityChangesRequest,
  IdentityChangesResponse,
  EmailProperty,
  EmailQueryChangesRequest,
  EmailQueryChangesResponse,
  EmailQueryRequest,
  EmailQueryResponse,
  IdentityGetRequest,
  IdentityGetResponse,
  IdentitySetRequest,
  MailboxChangesRequest,
  MailboxChangesResponse,
  MailboxQueryChangesRequest,
  MailboxQueryChangesResponse,
  MailboxQueryRequest,
  MailboxQueryResponse,
  MailboxSetRequest,
  MailboxProperty,
  MailboxGetRequest,
  MailboxGetResponse,
  ThreadChangesRequest,
  ThreadChangesResponse,
  ThreadGetRequest,
  ThreadGetResponse,
} from "./types.js";

export class MailboxGet implements JmapMethod<MailboxGetRequest, MailboxGetResponse> {
  readonly methodName = "Mailbox/get";
  readonly arguments: MailboxGetRequest;

  constructor(args: MailboxGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId, properties?: readonly MailboxProperty[]): MailboxGet {
    return new MailboxGet({
      accountId: accountId.value,
      properties,
    });
  }

  static byIds(
    accountId: AccountId,
    ids: readonly string[],
    properties?: readonly MailboxProperty[],
  ): MailboxGet {
    return new MailboxGet({
      accountId: accountId.value,
      ids: [...ids],
      properties,
    });
  }
}

export class MailboxChanges implements JmapMethod<MailboxChangesRequest, MailboxChangesResponse> {
  readonly methodName = "Mailbox/changes";
  readonly arguments: MailboxChangesRequest;

  constructor(args: MailboxChangesRequest) {
    this.arguments = args;
  }
}

export class MailboxQuery implements JmapMethod<MailboxQueryRequest, MailboxQueryResponse> {
  readonly methodName = "Mailbox/query";
  readonly arguments: MailboxQueryRequest;

  constructor(args: MailboxQueryRequest) {
    this.arguments = args;
  }
}

export class MailboxQueryChanges
  implements JmapMethod<MailboxQueryChangesRequest, MailboxQueryChangesResponse>
{
  readonly methodName = "Mailbox/queryChanges";
  readonly arguments: MailboxQueryChangesRequest;

  constructor(args: MailboxQueryChangesRequest) {
    this.arguments = args;
  }
}

export class MailboxSet implements JmapMethod<MailboxSetRequest, JmapSetResponse> {
  readonly methodName = "Mailbox/set";
  readonly arguments: MailboxSetRequest;

  constructor(args: MailboxSetRequest) {
    this.arguments = args;
  }
}

export class EmailQuery implements JmapMethod<EmailQueryRequest, EmailQueryResponse> {
  readonly methodName = "Email/query";
  readonly arguments: EmailQueryRequest;

  constructor(args: EmailQueryRequest) {
    this.arguments = args;
  }
}

export class EmailQueryChanges
  implements JmapMethod<EmailQueryChangesRequest, EmailQueryChangesResponse>
{
  readonly methodName = "Email/queryChanges";
  readonly arguments: EmailQueryChangesRequest;

  constructor(args: EmailQueryChangesRequest) {
    this.arguments = args;
  }
}

export class EmailChanges implements JmapMethod<EmailChangesRequest, EmailChangesResponse> {
  readonly methodName = "Email/changes";
  readonly arguments: EmailChangesRequest;

  constructor(args: EmailChangesRequest) {
    this.arguments = args;
  }
}

export class EmailGet implements JmapMethod<EmailGetRequest, EmailGetResponse> {
  readonly methodName = "Email/get";
  readonly arguments: EmailGetRequest;

  constructor(args: EmailGetRequest) {
    this.arguments = args;
  }

  static byIds(accountId: AccountId, ids: readonly string[], properties?: readonly EmailProperty[]): EmailGet {
    return new EmailGet({
      accountId: accountId.value,
      ids,
      properties,
    });
  }

  static byQueryResult(
    accountId: AccountId,
    queryCallId: CallId,
    properties?: readonly EmailProperty[],
  ): EmailGet {
    return new EmailGet({
      accountId: accountId.value,
      "#ids": resultOf(queryCallId, "Email/query", "/ids"),
      properties,
    });
  }

  /**
   * The emails of the threads a Thread/get earlier in the same request found (RFC 8620 3.7), so a conversation's
   * messages come in one request.
   */
  static byThreads(
    accountId: AccountId,
    threadCallId: CallId,
    properties?: readonly EmailProperty[],
    options?: Pick<EmailGetRequest, "fetchAllBodyValues" | "fetchTextBodyValues" | "fetchHTMLBodyValues" | "maxBodyValueBytes">,
  ): EmailGet {
    return new EmailGet({
      accountId: accountId.value,
      "#ids": resultOf(threadCallId, "Thread/get", "/list/*/emailIds"),
      properties,
      ...options,
    });
  }
}

export class EmailSet implements JmapMethod<EmailSetRequest, JmapSetResponse> {
  readonly methodName = "Email/set";
  readonly arguments: EmailSetRequest;

  constructor(args: EmailSetRequest) {
    this.arguments = args;
  }
}

export class EmailSubmissionSet
  implements JmapMethod<EmailSubmissionSetRequest, JmapSetResponse>
{
  readonly methodName = "EmailSubmission/set";
  readonly arguments: EmailSubmissionSetRequest;

  constructor(args: EmailSubmissionSetRequest) {
    this.arguments = args;
  }
}

/** Copies emails from another account (RFC 8621 4.7). */
export class EmailCopy implements JmapMethod<EmailCopyRequest, EmailCopyResponse> {
  readonly methodName = "Email/copy";
  readonly arguments: EmailCopyRequest;

  constructor(args: EmailCopyRequest) {
    this.arguments = args;
  }
}

/** Makes emails of uploaded messages (RFC 8621 4.8). */
export class EmailImport implements JmapMethod<EmailImportRequest, EmailImportResponse> {
  readonly methodName = "Email/import";
  readonly arguments: EmailImportRequest;

  constructor(args: EmailImportRequest) {
    this.arguments = args;
  }
}

export class EmailSubmissionGet implements JmapMethod<EmailSubmissionGetRequest, EmailSubmissionGetResponse> {
  readonly methodName = "EmailSubmission/get";
  readonly arguments: EmailSubmissionGetRequest;

  constructor(args: EmailSubmissionGetRequest) {
    this.arguments = args;
  }

  static byIds(accountId: AccountId, ids: readonly string[]): EmailSubmissionGet {
    return new EmailSubmissionGet({ accountId: accountId.value, ids });
  }

  static byQueryResult(accountId: AccountId, queryCallId: CallId): EmailSubmissionGet {
    return new EmailSubmissionGet({
      accountId: accountId.value,
      "#ids": resultOf(queryCallId, "EmailSubmission/query", "/ids"),
    });
  }
}

export class EmailSubmissionChanges
  implements JmapMethod<EmailSubmissionChangesRequest, EmailSubmissionChangesResponse>
{
  readonly methodName = "EmailSubmission/changes";
  readonly arguments: EmailSubmissionChangesRequest;

  constructor(args: EmailSubmissionChangesRequest) {
    this.arguments = args;
  }
}

export class EmailSubmissionQuery implements JmapMethod<EmailSubmissionQueryRequest, EmailSubmissionQueryResponse> {
  readonly methodName = "EmailSubmission/query";
  readonly arguments: EmailSubmissionQueryRequest;

  constructor(args: EmailSubmissionQueryRequest) {
    this.arguments = args;
  }
}

export class EmailSubmissionQueryChanges
  implements JmapMethod<EmailSubmissionQueryChangesRequest, EmailSubmissionQueryChangesResponse>
{
  readonly methodName = "EmailSubmission/queryChanges";
  readonly arguments: EmailSubmissionQueryChangesRequest;

  constructor(args: EmailSubmissionQueryChangesRequest) {
    this.arguments = args;
  }
}

export class ThreadGet implements JmapMethod<ThreadGetRequest, ThreadGetResponse> {
  readonly methodName = "Thread/get";
  readonly arguments: ThreadGetRequest;

  constructor(args: ThreadGetRequest) {
    this.arguments = args;
  }

  static byIds(accountId: AccountId, ids: readonly string[]): ThreadGet {
    return new ThreadGet({
      accountId: accountId.value,
      ids,
    });
  }
}

export class ThreadChanges implements JmapMethod<ThreadChangesRequest, ThreadChangesResponse> {
  readonly methodName = "Thread/changes";
  readonly arguments: ThreadChangesRequest;

  constructor(args: ThreadChangesRequest) {
    this.arguments = args;
  }
}

export class IdentityGet implements JmapMethod<IdentityGetRequest, IdentityGetResponse> {
  readonly methodName = "Identity/get";
  readonly arguments: IdentityGetRequest;

  constructor(args: IdentityGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): IdentityGet {
    return new IdentityGet({
      accountId: accountId.value,
    });
  }
}

export class IdentitySet
  implements JmapMethod<IdentitySetRequest, JmapSetResponse>
{
  readonly methodName = "Identity/set";
  readonly arguments: IdentitySetRequest;

  constructor(args: IdentitySetRequest) {
    this.arguments = args;
  }
}

export class IdentityChanges
  implements JmapMethod<IdentityChangesRequest, IdentityChangesResponse>
{
  readonly methodName = "Identity/changes";
  readonly arguments: IdentityChangesRequest;

  constructor(args: IdentityChangesRequest) {
    this.arguments = args;
  }
}
