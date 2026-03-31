import { AccountId, CallId } from "../core/ids";
import type { JmapMethod } from "../core/method";
import { MailboxId } from "../core/ids";
import type {
  EmailGetRequest,
  EmailGetResponse,
  EmailSetRequest,
  EmailSubmissionSetRequest,
  EmailProperty,
  EmailQueryFilter,
  EmailQueryChangesRequest,
  EmailQueryChangesResponse,
  EmailQueryRequest,
  EmailQueryResponse,
  IdentityGetRequest,
  IdentityGetResponse,
  IdentitySetRequest,
  MailboxProperty,
  MailboxGetRequest,
  MailboxGetResponse,
  ThreadGetRequest,
  ThreadGetResponse,
} from "./types";

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
}

export class EmailQuery implements JmapMethod<EmailQueryRequest, EmailQueryResponse> {
  readonly methodName = "Email/query";
  readonly arguments: EmailQueryRequest;

  constructor(args: EmailQueryRequest) {
    this.arguments = args;
  }

  static page(options: {
    accountId: AccountId;
    mailboxId?: MailboxId;
    limit?: number;
    position?: number;
  }): EmailQuery {
    const filter: EmailQueryFilter | undefined = options.mailboxId
      ? { inMailbox: options.mailboxId.value }
      : undefined;

    return new EmailQuery({
      accountId: options.accountId.value,
      filter,
      sort: [{ property: "receivedAt", isAscending: false }],
      limit: options.limit,
      position: options.position,
      calculateTotal: true,
    });
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
      "#ids": {
        resultOf: queryCallId.value,
        name: "Email/query",
        path: "/ids",
      },
      properties,
    });
  }
}

export class EmailSet implements JmapMethod<EmailSetRequest, import("../core/set").JmapSetResponse> {
  readonly methodName = "Email/set";
  readonly arguments: EmailSetRequest;

  constructor(args: EmailSetRequest) {
    this.arguments = args;
  }
}

export class EmailSubmissionSet
  implements JmapMethod<EmailSubmissionSetRequest, import("../core/set").JmapSetResponse>
{
  readonly methodName = "EmailSubmission/set";
  readonly arguments: EmailSubmissionSetRequest;

  constructor(args: EmailSubmissionSetRequest) {
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
  implements JmapMethod<IdentitySetRequest, import("../core/set").JmapSetResponse>
{
  readonly methodName = "Identity/set";
  readonly arguments: IdentitySetRequest;

  constructor(args: IdentitySetRequest) {
    this.arguments = args;
  }
}
