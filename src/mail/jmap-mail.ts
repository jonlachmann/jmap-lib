import { AccountId, MailboxId } from "../core/ids";
import { JmapClient } from "../core/client";
import type { JmapChangesResponse } from "../core/changes";
import type { FilterOperatorCondition } from "../core/query";
import { getSetError } from "../core/set";
import {
  EmailChanges,
  EmailGet,
  EmailQuery,
  EmailQueryChanges,
  EmailSet,
  EmailSubmissionSet,
  MailboxChanges,
  MailboxGet,
  MailboxQuery,
  MailboxQueryChanges,
  MailboxSet,
  ThreadChanges,
  ThreadGet,
} from "./methods";
import type {
  EmailChangesRequest,
  EmailGetResponse,
  EmailGetRequest,
  EmailSetRequest,
  EmailSubmissionSetRequest,
  EmailProperty,
  MailboxChangesRequest,
  MailboxQueryChangesRequest,
  MailboxQueryChangesResponse,
  MailboxQueryFilter,
  MailboxQueryRequest,
  MailboxQueryResponse,
  MailboxQuerySort,
  MailboxSetEntry,
  MailboxSetRequest,
  EmailQueryChangesRequest,
  EmailQueryChangesResponse,
  EmailQueryRequest,
  EmailQueryResponse,
  EmailUpdate,
  JmapEmail,
  JmapEmailAddress,
  EmailQueryFilter,
  EmailQuerySort,
  Thread,
  ThreadChangesRequest,
  ThreadGetRequest,
  ThreadGetResponse,
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

type QueryPageOptions = {
  accountId: AccountId;
  filter?: FilterOperatorCondition<EmailQueryFilter>;
  limit?: number;
  position?: number;
  properties?: readonly EmailProperty[];
};

export class JmapMail {
  constructor(private readonly client: JmapClient) {}

  async getMailboxes(accountId: AccountId) {
    return this.client.invoke<MailboxGetRequest, MailboxGetResponse>(MailboxGet.all(accountId));
  }

  async getMailboxChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<JmapChangesResponse> {
    return this.client.invoke<MailboxChangesRequest, JmapChangesResponse>(
      new MailboxChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
    );
  }

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

  async queryMailboxes(
    accountId: AccountId,
    options?: {
      filter?: FilterOperatorCondition<MailboxQueryFilter>;
      sort?: readonly MailboxQuerySort[];
      position?: number;
      anchor?: string;
      anchorOffset?: number;
      limit?: number;
      calculateTotal?: boolean;
      sortAsTree?: boolean;
      filterAsTree?: boolean;
    },
  ): Promise<MailboxQueryResponse> {
    return this.client.invoke<MailboxQueryRequest, MailboxQueryResponse>(
      new MailboxQuery({
        accountId: accountId.value,
        filter: options?.filter,
        sort: options?.sort,
        position: options?.position,
        anchor: options?.anchor,
        anchorOffset: options?.anchorOffset,
        limit: options?.limit,
        calculateTotal: options?.calculateTotal,
        sortAsTree: options?.sortAsTree,
        filterAsTree: options?.filterAsTree,
      }),
    );
  }

  async queryMailboxChanges(
    accountId: AccountId,
    options: {
      filter?: FilterOperatorCondition<MailboxQueryFilter>;
      sort?: readonly MailboxQuerySort[];
      sinceQueryState: string;
      maxChanges?: number;
      upToId?: string;
      calculateTotal?: boolean;
    },
  ): Promise<MailboxQueryChangesResponse> {
    return this.client.invoke<MailboxQueryChangesRequest, MailboxQueryChangesResponse>(
      new MailboxQueryChanges({
        accountId: accountId.value,
        filter: options.filter,
        sort: options.sort,
        sinceQueryState: options.sinceQueryState,
        maxChanges: options.maxChanges,
        upToId: options.upToId,
        calculateTotal: options.calculateTotal,
      }),
    );
  }

  async createMailbox(accountId: AccountId, clientId: string, mailbox: MailboxSetEntry): Promise<string> {
    const response = await this.client.invoke<MailboxSetRequest, import("../core/set").JmapSetResponse>(
      new MailboxSet({
        accountId: accountId.value,
        create: { [clientId]: mailbox },
      }),
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create mailbox");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("Mailbox/set create did not return an id");
    }

    return createdId;
  }

  async updateMailbox(accountId: AccountId, mailboxId: string, updates: MailboxSetEntry): Promise<void> {
    const response = await this.client.invoke<MailboxSetRequest, import("../core/set").JmapSetResponse>(
      new MailboxSet({
        accountId: accountId.value,
        update: { [mailboxId]: updates },
      }),
    );

    const error = getSetError(response, "notUpdated", mailboxId);
    if (error) {
      throw new Error(error.description || "Failed to update mailbox");
    }
  }

  async destroyMailbox(
    accountId: AccountId,
    mailboxId: string,
    options?: { onDestroyRemoveEmails?: boolean },
  ): Promise<void> {
    const response = await this.client.invoke<MailboxSetRequest, import("../core/set").JmapSetResponse>(
      new MailboxSet({
        accountId: accountId.value,
        destroy: [mailboxId],
        onDestroyRemoveEmails: options?.onDestroyRemoveEmails,
      }),
    );

    const error = getSetError(response, "notDestroyed", mailboxId);
    if (error) {
      throw new Error(error.description || "Failed to destroy mailbox");
    }
  }

  async listPage(options: ListPageOptions): Promise<ListPageResult> {
    return this.queryPage({
      accountId: options.accountId,
      filter: options.mailboxId ? { inMailbox: options.mailboxId.value } : undefined,
      limit: options.limit,
      position: options.position,
      properties: options.properties,
    });
  }

  async queryPage(options: QueryPageOptions): Promise<ListPageResult> {
    const limit = options.limit ?? 50;
    const position = options.position ?? 0;
    const batch = this.client.batch();

    const queryCallId = batch.call(
      new EmailQuery({
        accountId: options.accountId.value,
        filter: options.filter,
        sort: [{ property: "receivedAt", isAscending: false }],
        limit,
        position,
        calculateTotal: true,
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

  async queryChanges(
    accountId: AccountId,
    options: {
      filter?: FilterOperatorCondition<EmailQueryFilter>;
      sort?: readonly EmailQuerySort[];
      sinceQueryState: string;
      maxChanges?: number;
      upToId?: string;
      calculateTotal?: boolean;
    },
  ): Promise<EmailQueryChangesResponse> {
    return this.client.invoke<EmailQueryChangesRequest, EmailQueryChangesResponse>(
      new EmailQueryChanges({
        accountId: accountId.value,
        filter: options.filter,
        sort: options.sort,
        sinceQueryState: options.sinceQueryState,
        maxChanges: options.maxChanges,
        upToId: options.upToId,
        calculateTotal: options.calculateTotal,
      }),
    );
  }

  async getEmailChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<JmapChangesResponse> {
    return this.client.invoke<EmailChangesRequest, JmapChangesResponse>(
      new EmailChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
    );
  }

  async search(options: Omit<QueryPageOptions, "filter"> & { text: string; mailboxId?: MailboxId }): Promise<ListPageResult> {
    const filter: EmailQueryFilter = { text: options.text };
    if (options.mailboxId) {
      filter.inMailbox = options.mailboxId.value;
    }

    return this.queryPage({
      accountId: options.accountId,
      filter,
      limit: options.limit,
      position: options.position,
      properties: options.properties,
    });
  }

  async getEmail(
    accountId: AccountId,
    emailId: string,
    properties?: readonly EmailProperty[],
  ): Promise<JmapEmail | undefined> {
    const response = await this.client.invoke<EmailGetRequest, EmailGetResponse>(
      EmailGet.byIds(accountId, [emailId], properties),
    );
    return response.list[0];
  }

  async getThread(accountId: AccountId, threadId: string): Promise<Thread | undefined> {
    const response = await this.client.invoke<ThreadGetRequest, ThreadGetResponse>(
      ThreadGet.byIds(accountId, [threadId]),
    );
    return response.list[0];
  }

  async getThreadChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<JmapChangesResponse> {
    return this.client.invoke<ThreadChangesRequest, JmapChangesResponse>(
      new ThreadChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
    );
  }

  async getThreadEmails(
    accountId: AccountId,
    threadId: string,
    properties?: readonly EmailProperty[],
  ): Promise<JmapEmail[]> {
    const thread = await this.getThread(accountId, threadId);
    if (!thread?.emailIds.length) {
      return [];
    }

    const response = await this.client.invoke<EmailGetRequest, EmailGetResponse>(
      EmailGet.byIds(accountId, thread.emailIds, properties),
    );
    return [...response.list].sort((left, right) => {
      const leftTime = new Date(left.receivedAt ?? 0).getTime();
      const rightTime = new Date(right.receivedAt ?? 0).getTime();
      return rightTime - leftTime;
    });
  }

  async queryMailboxEmailIds(
    accountId: AccountId,
    mailboxId: MailboxId,
    options?: { limit?: number; position?: number },
  ): Promise<{ ids: string[]; total?: number }> {
    const response = await this.client.invoke<EmailQueryRequest, EmailQueryResponse>(new EmailQuery({
      accountId: accountId.value,
      filter: { inMailbox: mailboxId.value },
      sort: [{ property: "receivedAt", isAscending: false }],
      calculateTotal: true,
      limit: options?.limit ?? 500,
      position: options?.position ?? 0,
    }));

    return {
      ids: response.ids,
      total: response.total,
    };
  }

  async updateKeywords(accountId: AccountId, emailId: string, keywords: Record<string, boolean>): Promise<void> {
    const response = await this.client.invoke<EmailSetRequest, import("../core/set").JmapSetResponse>(
      new EmailSet({
        accountId: accountId.value,
        update: { [emailId]: { keywords } },
      }),
    );

    const error = getSetError(response, "notUpdated", emailId);
    if (error) {
      throw new Error(error.description || "Failed to update email keywords");
    }
  }

  async markAsRead(accountId: AccountId, emailId: string, read = true): Promise<void> {
    await this.patchEmails(accountId, { [emailId]: { "keywords/$seen": read } });
  }

  async batchMarkAsRead(accountId: AccountId, emailIds: readonly string[], read = true): Promise<void> {
    const updates: Record<string, EmailUpdate> = {};
    for (const emailId of emailIds) {
      updates[emailId] = { "keywords/$seen": read };
    }

    await this.patchEmails(accountId, updates);
  }

  async toggleStar(accountId: AccountId, emailId: string, starred: boolean): Promise<void> {
    await this.patchEmails(accountId, { [emailId]: { "keywords/$flagged": starred } });
  }

  async move(accountId: AccountId, emailId: string, mailboxId: MailboxId): Promise<void> {
    await this.patchEmails(accountId, { [emailId]: { mailboxIds: { [mailboxId.value]: true } } });
  }

  async moveMany(accountId: AccountId, emailIds: readonly string[], mailboxId: MailboxId): Promise<void> {
    const updates: Record<string, EmailUpdate> = {};
    for (const emailId of emailIds) {
      updates[emailId] = { mailboxIds: { [mailboxId.value]: true } };
    }

    await this.patchEmails(accountId, updates);
  }

  async destroy(accountId: AccountId, emailId: string): Promise<void> {
    await this.destroyMany(accountId, [emailId]);
  }

  async destroyMany(accountId: AccountId, emailIds: readonly string[]): Promise<void> {
    const response = await this.client.invoke<EmailSetRequest, import("../core/set").JmapSetResponse>(
      new EmailSet({
        accountId: accountId.value,
        destroy: emailIds,
      }),
    );

    for (const emailId of emailIds) {
      const error = getSetError(response, "notDestroyed", emailId);
      if (error) {
        throw new Error(error.description || `Failed to delete email ${emailId}`);
      }
    }
  }

  async queryTagCounts(accountId: AccountId, tags: readonly string[]): Promise<Record<string, number>> {
    const batch = this.client.batch();
    const callIds = tags.map((tag) =>
      batch.call(new EmailQuery({
        accountId: accountId.value,
        filter: { hasKeyword: `$color:${tag}` },
        calculateTotal: true,
        limit: 0,
      })),
    );

    const response = await batch.send();
    return Object.fromEntries(
      tags.map((tag, index) => {
        const query = response.get<EmailQueryResponse>(callIds[index], "Email/query");
        return [tag, query.total ?? 0];
      }),
    );
  }

  async createDraft(options: {
    accountId: AccountId;
    clientId: string;
    draftsMailboxId: MailboxId;
    from: JmapEmailAddress[];
    to: JmapEmailAddress[];
    subject: string;
    body: string;
    cc?: JmapEmailAddress[];
    bcc?: JmapEmailAddress[];
    attachments?: Array<{ blobId: string; type: string; name: string }>;
  }): Promise<string> {
    const response = await this.client.invoke<EmailSetRequest, import("../core/set").JmapSetResponse>(
      new EmailSet({
        accountId: options.accountId.value,
        create: {
          [options.clientId]: {
            from: options.from,
            to: options.to,
            cc: options.cc,
            bcc: options.bcc,
            subject: options.subject,
            keywords: { "$draft": true },
            mailboxIds: { [options.draftsMailboxId.value]: true },
            bodyValues: { "1": { value: options.body } },
            textBody: [{ partId: "1" }],
            attachments: options.attachments?.map((attachment) => ({
              blobId: attachment.blobId,
              type: attachment.type,
              name: attachment.name,
              disposition: "attachment",
            })),
          },
        },
      }),
    );

    const error = getSetError(response, "notCreated", options.clientId);
    if (error) {
      throw new Error(error.description || "Failed to create draft");
    }

    const createdId = response.created?.[options.clientId]?.id;
    if (!createdId) {
      throw new Error("Email/set did not return a draft id");
    }

    return createdId;
  }

  async submit(accountId: AccountId, identityId: string, emailId: string): Promise<void> {
    const response = await this.client.invoke<EmailSubmissionSetRequest, import("../core/set").JmapSetResponse>(
      new EmailSubmissionSet({
        accountId: accountId.value,
        create: {
          submission: {
            emailId,
            identityId,
          },
        },
      }),
      { capabilities: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail", "urn:ietf:params:jmap:submission"] },
    );

    const error = getSetError(response, "notCreated", "submission");
    if (error) {
      throw new Error(error.description || "Failed to submit email");
    }
  }

  private async patchEmails(
    accountId: AccountId,
    updates: Record<string, EmailUpdate>,
  ): Promise<void> {
    const response = await this.client.invoke<EmailSetRequest, import("../core/set").JmapSetResponse>(
      new EmailSet({
        accountId: accountId.value,
        update: updates,
      }),
    );

    for (const emailId of Object.keys(updates)) {
      const error = getSetError(response, "notUpdated", emailId);
      if (error) {
        throw new Error(error.description || `Failed to update email ${emailId}`);
      }
    }
  }
}
