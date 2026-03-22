import { AccountId, MailboxId } from "../core/ids";
import { JmapClient } from "../core/client";
import { EmailGet, EmailQuery, MailboxGet } from "./methods";
import type {
  EmailGetResponse,
  EmailProperty,
  EmailQueryResponse,
  JmapEmail,
  MailboxGetRequest,
  MailboxGetResponse,
} from "./types";

type GetAllMailboxesResult = {
  results: Array<{ accountId: AccountId; response: MailboxGetResponse }>;
  failures: Array<{ accountId: AccountId; error: unknown }>;
};

type ListPageOptions = {
  accountId: AccountId;
  mailboxId?: MailboxId;
  limit?: number;
  position?: number;
  properties?: readonly EmailProperty[];
};

type ListPageResult = {
  query: EmailQueryResponse;
  emails: JmapEmail[];
  hasMore: boolean;
};

export class JmapMail {
  constructor(private readonly client: JmapClient) {}

  async getAllMailboxes(options: { accountIds: AccountId[] }): Promise<GetAllMailboxesResult> {
    type MailboxSuccess = { accountId: AccountId; response: MailboxGetResponse };

    const settled = await Promise.allSettled(
      options.accountIds.map(async (accountId): Promise<MailboxSuccess> => {
        const method = MailboxGet.all(accountId);
        const response = await this.client.invoke<MailboxGetRequest, MailboxGetResponse>(method);
        return { accountId, response };
      }),
    );

    const results: GetAllMailboxesResult["results"] = [];
    const failures: GetAllMailboxesResult["failures"] = [];

    settled.forEach((result, index) => {
      const accountId = options.accountIds[index];
      if (result.status === "fulfilled") {
        results.push(result.value);
        return;
      }

      failures.push({
        accountId,
        error: result.reason,
      });
    });

    return { results, failures };
  }

  async listPage(options: ListPageOptions): Promise<ListPageResult> {
    const limit = options.limit ?? 50;
    const position = options.position ?? 0;
    const batch = this.client.batch();

    const queryCallId = batch.call(
      EmailQuery.page({
        accountId: options.accountId,
        mailboxId: options.mailboxId,
        limit,
        position,
      }),
    );

    const getCallId = batch.call(
      EmailGet.byQueryResult(options.accountId, queryCallId, options.properties),
    );

    const response = await batch.send();
    const query = response.get<EmailQueryResponse>(queryCallId, "Email/query");
    const emails = response.get<EmailGetResponse>(getCallId, "Email/get").list;
    const total = query.total ?? 0;
    const hasMore = total > 0 ? position + emails.length < total : emails.length === limit;

    return { query, emails, hasMore };
  }
}
