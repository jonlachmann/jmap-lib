import { AccountId, CallId } from "../core/ids";
import type { JmapMethod } from "../core/method";
import { MailboxId } from "../core/ids";
import type {
  EmailGetRequest,
  EmailGetResponse,
  EmailProperty,
  EmailQueryFilter,
  EmailQueryRequest,
  EmailQueryResponse,
  MailboxProperty,
  MailboxGetRequest,
  MailboxGetResponse,
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
