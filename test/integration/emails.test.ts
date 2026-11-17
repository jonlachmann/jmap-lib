import test from "node:test";
import assert from "node:assert/strict";

import {
  EmailGet,
  EmailQuery,
  MailboxId,
  ThreadGet,
  type EmailGetResponse,
  type EmailQueryRequest,
  type EmailQueryResponse,
  type ThreadGetResponse,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
} from "./helpers/config.js";
import { createMailIntegrationContext, requireMailboxByRole, resolveDraftAddress } from "./helpers/mail.js";
import { createIntegrationId } from "./helpers/ids.js";
import { findInboxMailbox } from "./helpers/mailboxes.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: lists a page of emails from a mailbox", { skip }, async () => {
  const { context, mail, mailboxes } = await createMailIntegrationContext();
  const mailbox = findInboxMailbox(mailboxes) ?? mailboxes[0];
  const result = await mail.listPage({
    accountId: context.accountId,
    mailboxId: mailbox ? MailboxId.of(mailbox.id) : undefined,
    limit: 10,
    properties: ["id", "threadId", "mailboxIds", "receivedAt", "subject", "from", "preview"],
  });

  assert.ok(mailbox, "expected at least one mailbox to query");
  assert.ok(Array.isArray(result.query.ids), "expected query ids");
  assert.ok(result.emails.length <= 10, "expected email page within requested limit");
  assert.equal(typeof result.hasMore, "boolean");

  for (const email of result.emails) {
    assert.equal(typeof email.id, "string");
    assert.equal(typeof email.threadId, "string");
    assert.equal(typeof email.mailboxIds, "object");
  }
});

test("integration: queries emails with an operator filter", { skip }, async () => {
  const { context, mailboxes } = await createMailIntegrationContext();
  const mailbox = findInboxMailbox(mailboxes) ?? mailboxes[0];

  assert.ok(mailbox, "expected at least one mailbox to query");

  const batch = context.client.batch();
  const queryCallId = batch.call(new EmailQuery({
    accountId: context.accountId.value,
    filter: {
      operator: "AND",
      conditions: [
        { inMailbox: mailbox.id },
      ],
    },
    sort: [{ property: "receivedAt", isAscending: false }],
    limit: 10,
    calculateTotal: true,
  }));
  const getCallId = batch.call(
    EmailGet.byQueryResult(context.accountId, queryCallId, [
      "id",
      "threadId",
      "mailboxIds",
      "receivedAt",
      "subject",
    ]),
  );

  const response = await batch.send();
  const query = response.get<{ ids: string[]; total?: number }>(queryCallId, "Email/query");
  const emails = response.get<{ list: Array<{ id: string; mailboxIds: Record<string, boolean> }> }>(getCallId, "Email/get").list;

  assert.ok(Array.isArray(query.ids));
  assert.ok(emails.length <= 10);
  for (const email of emails) {
    assert.equal(typeof email.id, "string");
    assert.equal(typeof email.mailboxIds, "object");
  }
});

test("integration: queries seeded drafts and reports query changes deterministically", { skip }, async () => {
  const { context, mail, mailboxes } = await createMailIntegrationContext();
  const drafts = requireMailboxByRole(mailboxes, "drafts");
  const marker = createIntegrationId("query-emails");

  const initialQuery = await context.client.invoke<EmailQueryRequest, EmailQueryResponse>(new EmailQuery({
    accountId: context.accountId.value,
    filter: {
      operator: "AND",
      conditions: [
        { inMailbox: drafts.id },
        { text: marker },
      ],
    },
    sort: [{ property: "receivedAt", isAscending: false }],
    limit: 10,
    calculateTotal: true,
  }));

  assert.deepEqual(initialQuery.ids, []);
  assert.ok(initialQuery.queryState, "expected initial email query state");

  const draftAddress = await resolveDraftAddress(context);
  const firstDraftId = (await mail.createDraft({
    accountId: context.accountId,
    draftsMailboxId: MailboxId.of(drafts.id),
    from: [{ email: draftAddress }],
    to: [{ email: draftAddress }],
    subject: `${marker}-alpha`,
    body: `Body ${marker}-alpha`,
  })).id;
  const secondDraftId = (await mail.createDraft({
    accountId: context.accountId,
    draftsMailboxId: MailboxId.of(drafts.id),
    from: [{ email: draftAddress }],
    to: [{ email: draftAddress }],
    subject: `${marker}-beta`,
    body: `Body ${marker}-beta`,
  })).id;

  try {
    const query = await context.client.invoke<EmailQueryRequest, EmailQueryResponse>(new EmailQuery({
      accountId: context.accountId.value,
      filter: {
        operator: "AND",
        conditions: [
          { inMailbox: drafts.id },
          { text: marker },
        ],
      },
      sort: [{ property: "receivedAt", isAscending: false }],
      limit: 10,
      calculateTotal: true,
    }));
    const changes = await mail.queryChanges(context.accountId, {
      filter: {
        operator: "AND",
        conditions: [
          { inMailbox: drafts.id },
          { text: marker },
        ],
      },
      sort: [{ property: "receivedAt", isAscending: false }],
      sinceQueryState: initialQuery.queryState!,
      calculateTotal: true,
    });

    assert.ok(query.ids.includes(firstDraftId), "expected first seeded draft in query results");
    assert.ok(query.ids.includes(secondDraftId), "expected second seeded draft in query results");
    assert.deepEqual(changes.removed, []);
    assert.ok(changes.added?.some((entry) => entry.id === firstDraftId));
    assert.ok(changes.added?.some((entry) => entry.id === secondDraftId));
    assert.equal(changes.total, query.ids.length);
  } finally {
    await mail.destroy(context.accountId, firstDraftId);
    await mail.destroy(context.accountId, secondDraftId);
  }
});

test("integration: reports email changes after creating a draft", { skip }, async () => {
  const { context, mail, mailboxes } = await createMailIntegrationContext();
  const drafts = requireMailboxByRole(mailboxes, "drafts");
  const draftAddress = await resolveDraftAddress(context);

  const firstDraftId = (await mail.createDraft({
    accountId: context.accountId,
    draftsMailboxId: MailboxId.of(drafts.id),
    from: [{ email: draftAddress }],
    to: [{ email: draftAddress }],
    subject: createIntegrationId("Email Changes Baseline"),
    body: "Baseline",
  })).id;

  try {
    const baseline = await context.client.invoke(EmailGet.byIds(context.accountId, [firstDraftId])) as EmailGetResponse;
    assert.ok(baseline.state, "expected email state");

    const secondDraftId = (await mail.createDraft({
      accountId: context.accountId,
      draftsMailboxId: MailboxId.of(drafts.id),
      from: [{ email: draftAddress }],
      to: [{ email: draftAddress }],
      subject: createIntegrationId("Email Changes Next"),
      body: "Next",
    })).id;

    try {
      const changes = await mail.getEmailChanges(context.accountId, baseline.state);
      assert.ok(changes.created.includes(secondDraftId) || changes.updated.includes(secondDraftId));
    } finally {
      await mail.destroy(context.accountId, secondDraftId);
    }
  } finally {
    await mail.destroy(context.accountId, firstDraftId);
  }
});

test("integration: reports thread changes after creating a draft in a new thread", { skip }, async () => {
  const { context, mail, mailboxes } = await createMailIntegrationContext();
  const drafts = requireMailboxByRole(mailboxes, "drafts");
  const draftAddress = await resolveDraftAddress(context);

  const firstDraftId = (await mail.createDraft({
    accountId: context.accountId,
    draftsMailboxId: MailboxId.of(drafts.id),
    from: [{ email: draftAddress }],
    to: [{ email: draftAddress }],
    subject: createIntegrationId("Thread Changes Baseline"),
    body: "Baseline",
  })).id;

  try {
    const firstEmail = await context.client.invoke(EmailGet.byIds(context.accountId, [firstDraftId])) as EmailGetResponse;
    const baselineThreadId = firstEmail.list[0]?.threadId;
    assert.ok(baselineThreadId, "expected thread id");

    const baselineThread = await context.client.invoke(ThreadGet.byIds(context.accountId, [baselineThreadId])) as ThreadGetResponse;
    assert.ok(baselineThread.state, "expected thread state");

    const secondDraftId = (await mail.createDraft({
      accountId: context.accountId,
      draftsMailboxId: MailboxId.of(drafts.id),
      from: [{ email: draftAddress }],
      to: [{ email: draftAddress }],
      subject: createIntegrationId("Thread Changes Next"),
      body: "Next",
    })).id;

    try {
      const secondEmail = await context.client.invoke(EmailGet.byIds(context.accountId, [secondDraftId])) as EmailGetResponse;
      const secondThreadId = secondEmail.list[0]?.threadId;
      assert.ok(secondThreadId, "expected second thread id");

      const changes = await mail.getThreadChanges(context.accountId, baselineThread.state);
      assert.ok(changes.created.includes(secondThreadId) || changes.updated.includes(secondThreadId));
    } finally {
      await mail.destroy(context.accountId, secondDraftId);
    }
  } finally {
    await mail.destroy(context.accountId, firstDraftId);
  }
});
