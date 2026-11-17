import { AccountId } from "../core/ids.js";
import { MailboxId } from "./ids.js";
import { JmapClient } from "../core/client.js";
import { CORE_MAIL_SUBMISSION_CAPABILITIES } from "../core/capabilities.js";
import type { JmapFilter } from "../core/query.js";
import { CREATION_ID, createdOne, assertSetOk, setInChunks, type JmapCreated, type JmapSetResponse } from "../core/set.js";
import {
  EmailChanges,
  EmailCopy,
  EmailGet,
  EmailImport,
  EmailSubmissionChanges,
  EmailSubmissionGet,
  EmailSubmissionQuery,
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
} from "./methods.js";
import type {
  EmailCopyObject,
  EmailCopyRequest,
  EmailCopyResponse,
  EmailImportObject,
  EmailImportRequest,
  EmailImportResponse,
  EmailSubmission,
  EmailSubmissionChangesRequest,
  EmailSubmissionChangesResponse,
  EmailSubmissionFilter,
  EmailSubmissionGetRequest,
  EmailSubmissionGetResponse,
  EmailSubmissionSort,
  EmailChangesRequest,
  EmailChangesResponse,
  EmailGetResponse,
  EmailGetRequest,
  EmailSetRequest,
  EmailSubmissionSetRequest,
  EmailProperty,
  MailboxChangesRequest,
  MailboxQueryChangesRequest,
  MailboxQueryChangesResponse,
  MailboxChangesResponse,
  MailboxProperty,
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
  ThreadChangesResponse,
  ThreadGetRequest,
  ThreadGetResponse,
  MailboxGetRequest,
  MailboxGetResponse,
} from "./types.js";

const DEFAULT_EMAIL_SORT: readonly EmailQuerySort[] = [{ property: "receivedAt", isAscending: false }];

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
  collapseThreads?: boolean;
};

type ListPageResult = {
  query: EmailQueryResponse;
  emails: JmapEmail[];
  emailState?: string;
  hasMore: boolean;
};

type QueryPageOptions = {
  accountId: AccountId;
  filter?: JmapFilter<EmailQueryFilter>;
  limit?: number;
  position?: number;
  properties?: readonly EmailProperty[];
  collapseThreads?: boolean;
};

export class JmapMail {
  constructor(private readonly client: JmapClient) {}

  async getMailboxes(accountId: AccountId) {
    return this.client.invoke<MailboxGetRequest, MailboxGetResponse>(MailboxGet.all(accountId));
  }

  async getMailboxesByIds(
    accountId: AccountId,
    ids: readonly string[],
    properties?: readonly MailboxProperty[],
  ) {
    return this.client.invoke<MailboxGetRequest, MailboxGetResponse>(
      MailboxGet.byIds(accountId, ids, properties),
    );
  }

  async getMailboxChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<MailboxChangesResponse> {
    return this.client.invoke<MailboxChangesRequest, MailboxChangesResponse>(
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
      filter?: JmapFilter<MailboxQueryFilter>;
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
      filter?: JmapFilter<MailboxQueryFilter>;
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

  async createMailbox(accountId: AccountId, mailbox: MailboxSetEntry): Promise<JmapCreated> {
    const response = await this.client.invoke<MailboxSetRequest, JmapSetResponse>(
      new MailboxSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: mailbox },
      }),
    );

    return createdOne(response, "mailbox");
  }

  async updateMailbox(accountId: AccountId, mailboxId: string, updates: MailboxSetEntry): Promise<JmapSetResponse> {
    const response = await this.client.invoke<MailboxSetRequest, JmapSetResponse>(
      new MailboxSet({
        accountId: accountId.value,
        update: { [mailboxId]: updates },
      }),
    );

    assertSetOk(response, "mailbox");

    return response;
  }

  async destroyMailbox(
    accountId: AccountId,
    mailboxId: string,
    options?: { onDestroyRemoveEmails?: boolean },
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<MailboxSetRequest, JmapSetResponse>(
      new MailboxSet({
        accountId: accountId.value,
        destroy: [mailboxId],
        onDestroyRemoveEmails: options?.onDestroyRemoveEmails,
      }),
    );

    assertSetOk(response, "mailbox");

    return response;
  }

  async listPage(options: ListPageOptions): Promise<ListPageResult> {
    return this.queryPage({
      accountId: options.accountId,
      filter: options.mailboxId ? { inMailbox: options.mailboxId.value } : undefined,
      limit: options.limit,
      position: options.position,
      properties: options.properties,
      collapseThreads: options.collapseThreads,
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
        sort: DEFAULT_EMAIL_SORT,
        limit,
        position,
        calculateTotal: true,
        ...(options.collapseThreads ? { collapseThreads: true } : {}),
      }),
    );

    const getCallId = batch.call(
      EmailGet.byQueryResult(options.accountId, queryCallId, options.properties),
    );

    const response = await batch.send();
    const query = response.get<EmailQueryResponse>(queryCallId, "Email/query");
    const emailGetResponse = response.get<EmailGetResponse>(getCallId, "Email/get");
    const emails = emailGetResponse.list;
    const emailState = emailGetResponse.state;
    // By the query's ids: an email gone between the query and the get leaves the list short
    const hasMore = query.total !== undefined
      ? query.position + query.ids.length < query.total
      : query.ids.length === (query.limit ?? limit);

    return { query, emails, emailState, hasMore };
  }

  async queryChanges(
    accountId: AccountId,
    options: {
      filter?: JmapFilter<EmailQueryFilter>;
      sort?: readonly EmailQuerySort[];
      sinceQueryState: string;
      maxChanges?: number;
      upToId?: string;
      calculateTotal?: boolean;
      collapseThreads?: boolean;
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
        ...(options.collapseThreads ? { collapseThreads: true } : {}),
      }),
    );
  }

  async getEmailChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<EmailChangesResponse> {
    return this.client.invoke<EmailChangesRequest, EmailChangesResponse>(
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
      collapseThreads: options.collapseThreads,
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
  ): Promise<ThreadChangesResponse> {
    return this.client.invoke<ThreadChangesRequest, ThreadChangesResponse>(
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
    const batch = this.client.batch();
    const threadCallId = batch.call(ThreadGet.byIds(accountId, [threadId]));
    const getCallId = batch.call(EmailGet.byThreads(accountId, threadCallId, properties));
    const response = await batch.send();
    return [...response.get<EmailGetResponse>(getCallId, "Email/get").list].sort((left, right) => {
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
      sort: DEFAULT_EMAIL_SORT,
      calculateTotal: true,
      limit: options?.limit ?? 500,
      position: options?.position ?? 0,
    }));

    return {
      ids: response.ids,
      total: response.total,
    };
  }

  async updateKeywords(accountId: AccountId, emailId: string, keywords: Record<string, true>): Promise<JmapSetResponse> {
    const response = await this.client.invoke<EmailSetRequest, JmapSetResponse>(
      new EmailSet({
        accountId: accountId.value,
        update: { [emailId]: { keywords } },
      }),
    );

    assertSetOk(response, "email");

    return response;
  }

  async markAsRead(accountId: AccountId, emailId: string, read = true): Promise<JmapSetResponse> {
    return this.patchEmails(accountId, { [emailId]: { "keywords/$seen": read ? true : null } });
  }

  async batchMarkAsRead(accountId: AccountId, emailIds: readonly string[], read = true): Promise<JmapSetResponse> {
    const updates: Record<string, EmailUpdate> = {};
    const value = read ? true : null;
    for (const emailId of emailIds) {
      updates[emailId] = { "keywords/$seen": value };
    }

    return this.patchEmails(accountId, updates);
  }

  async toggleStar(accountId: AccountId, emailId: string, starred: boolean): Promise<JmapSetResponse> {
    return this.patchEmails(accountId, { [emailId]: { "keywords/$flagged": starred ? true : null } });
  }

  async move(accountId: AccountId, emailId: string, mailboxId: MailboxId): Promise<JmapSetResponse> {
    return this.patchEmails(accountId, { [emailId]: { mailboxIds: { [mailboxId.value]: true } } });
  }

  async moveMany(accountId: AccountId, emailIds: readonly string[], mailboxId: MailboxId): Promise<JmapSetResponse> {
    const updates: Record<string, EmailUpdate> = {};
    for (const emailId of emailIds) {
      updates[emailId] = { mailboxIds: { [mailboxId.value]: true } };
    }

    return this.patchEmails(accountId, updates);
  }

  async destroy(accountId: AccountId, emailId: string): Promise<JmapSetResponse> {
    return this.destroyMany(accountId, [emailId]);
  }

  /** Destroy the emails, in as many requests as the session's maxObjectsInSet needs; each request stands alone. */
  async destroyMany(accountId: AccountId, emailIds: readonly string[]): Promise<JmapSetResponse> {
    return setInChunks(this.client, emailIds, async (chunk) => {
      const response = await this.client.invoke<EmailSetRequest, JmapSetResponse>(
        new EmailSet({ accountId: accountId.value, destroy: chunk }),
      );
      assertSetOk(response, "email");
      return response;
    });
  }

  async createDraft(options: {
    accountId: AccountId;
    draftsMailboxId: MailboxId;
    from: JmapEmailAddress[];
    to: JmapEmailAddress[];
    subject: string;
    body: string;
    cc?: JmapEmailAddress[];
    bcc?: JmapEmailAddress[];
    attachments?: Array<{ blobId: string; type: string; name: string }>;
  }): Promise<JmapCreated> {
    const response = await this.client.invoke<EmailSetRequest, JmapSetResponse>(
      new EmailSet({
        accountId: options.accountId.value,
        create: {
          [CREATION_ID]: {
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

    return createdOne(response, "draft");
  }

  async submit(
    accountId: AccountId,
    identityId: string,
    emailId: string,
    onSuccess?: EmailUpdate,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<EmailSubmissionSetRequest, JmapSetResponse>(
      new EmailSubmissionSet({
        accountId: accountId.value,
        create: {
          submission: {
            emailId,
            identityId,
          },
        },
        ...(onSuccess ? { onSuccessUpdateEmail: { "#submission": onSuccess } } : {}),
      }),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );

    assertSetOk(response, "email submission");

    return response;
  }

  /**
   * Copy an email from another account (RFC 8621 4.7), into the mailboxes given; only its mailboxes, keywords and
   * receivedAt can differ from the original's.
   *
   * @param options.onSuccessDestroyOriginal Destroy the original once copied, which moves the email.
   */
  async copyEmail(
    accountId: AccountId,
    fromAccountId: AccountId,
    emailId: string,
    email: EmailCopyObject,
    options?: { onSuccessDestroyOriginal?: boolean },
  ): Promise<JmapCreated<EmailCopyResponse>> {
    const response = await this.client.invoke<EmailCopyRequest, EmailCopyResponse>(
      new EmailCopy({
        fromAccountId: fromAccountId.value,
        accountId: accountId.value,
        create: { [CREATION_ID]: { ...email, id: emailId } },
        onSuccessDestroyOriginal: options?.onSuccessDestroyOriginal,
      }),
    );

    return createdOne(response, "email");
  }

  /** Make an email of a message uploaded as a blob (RFC 8621 4.8). A server refusing a duplicate names the email it
   *  has as the error's existingId. */
  async importEmail(accountId: AccountId, email: EmailImportObject): Promise<JmapCreated<EmailImportResponse>> {
    const response = await this.client.invoke<EmailImportRequest, EmailImportResponse>(
      new EmailImport({ accountId: accountId.value, emails: { [CREATION_ID]: email } }),
    );

    return createdOne(response, "email");
  }

  /** The submissions by id, with their undoStatus and delivery status (RFC 8621 7.1). */
  async getSubmissions(accountId: AccountId, ids: readonly string[]): Promise<EmailSubmissionGetResponse> {
    return this.client.invoke<EmailSubmissionGetRequest, EmailSubmissionGetResponse>(
      EmailSubmissionGet.byIds(accountId, ids),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );
  }

  /** The submissions the filter matches, in one request (RFC 8621 7.3), such as those still pending. */
  async listSubmissions(
    accountId: AccountId,
    filter?: JmapFilter<EmailSubmissionFilter>,
    options?: { sort?: readonly EmailSubmissionSort[]; limit?: number },
  ): Promise<EmailSubmission[]> {
    const batch = this.client.batch({ capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES });
    const queryCallId = batch.call(new EmailSubmissionQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort,
      limit: options?.limit,
    }));
    const getCallId = batch.call(EmailSubmissionGet.byQueryResult(accountId, queryCallId));
    const response = await batch.send();
    return response.get<EmailSubmissionGetResponse>(getCallId, "EmailSubmission/get").list;
  }

  async getSubmissionChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<EmailSubmissionChangesResponse> {
    return this.client.invoke<EmailSubmissionChangesRequest, EmailSubmissionChangesResponse>(
      new EmailSubmissionChanges({ accountId: accountId.value, sinceState, maxChanges: options?.maxChanges }),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );
  }

  /** Cancel a submission not yet sent (RFC 8621 7.5); one already final is refused (cannotUnsend). */
  async cancelSubmission(accountId: AccountId, submissionId: string): Promise<JmapSetResponse> {
    return this.setSubmission(accountId, { update: { [submissionId]: { undoStatus: "canceled" } } });
  }

  /** Destroy a submission's record (RFC 8621 7.5); it doesn't cancel the delivery. */
  async destroySubmission(accountId: AccountId, submissionId: string): Promise<JmapSetResponse> {
    return this.setSubmission(accountId, { destroy: [submissionId] });
  }

  private async setSubmission(
    accountId: AccountId,
    changes: Pick<EmailSubmissionSetRequest, "update" | "destroy">,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<EmailSubmissionSetRequest, JmapSetResponse>(
      new EmailSubmissionSet({ accountId: accountId.value, ...changes }),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );

    assertSetOk(response, "email submission");

    return response;
  }

  /** Patch the emails, in as many requests as the session's maxObjectsInSet needs; each request stands alone. */
  private async patchEmails(
    accountId: AccountId,
    updates: Record<string, EmailUpdate>,
  ): Promise<JmapSetResponse> {
    return setInChunks(this.client, Object.entries(updates), async (chunk) => {
      const response = await this.client.invoke<EmailSetRequest, JmapSetResponse>(
        new EmailSet({ accountId: accountId.value, update: Object.fromEntries(chunk) }),
      );
      assertSetOk(response, "email");
      return response;
    });
  }
}
