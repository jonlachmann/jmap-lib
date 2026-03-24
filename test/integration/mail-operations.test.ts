import test from "node:test";
import assert from "node:assert/strict";

import {
  JMAP_SUBMISSION_CAPABILITY,
  JmapIdentities,
  type JmapMailbox,
  JmapMail,
  MailboxId,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";
import { createIntegrationId } from "./helpers/ids.js";
import { findMailboxByRole } from "./helpers/mailboxes.js";
import { uploadIntegrationBlob } from "./helpers/upload.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: mail query and get methods can fetch created drafts", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mail = new JmapMail(context.client);
  const mailboxes = (await mail.getMailboxes(context.accountId)).list;
  const drafts = requireMailbox(mailboxes, "drafts");
  const subject = `Draft ${createIntegrationId("query")}`;
  const draftId = await createDraft(
    mail,
    context.accountId,
    drafts.id,
    subject,
    await resolveDraftAddress(context),
  );

  try {
    const email = await mail.getEmail(context.accountId, draftId, [
      "id",
      "threadId",
      "mailboxIds",
      "receivedAt",
      "subject",
      "preview",
    ]);
    assert.ok(email, "expected draft to be fetchable");
    assert.equal(email.subject, subject);

    const queryPage = await mail.queryPage({
      accountId: context.accountId,
      filter: { inMailbox: drafts.id, text: subject },
      limit: 10,
      properties: ["id", "threadId", "mailboxIds", "receivedAt", "subject"],
    });
    assert.ok(queryPage.query.ids.includes(draftId), "expected query to include created draft");
    assert.ok(queryPage.emails.some((entry) => entry.id === draftId));
    assert.equal(typeof queryPage.hasMore, "boolean");

    const searchResult = await mail.search({
      accountId: context.accountId,
      mailboxId: MailboxId.of(drafts.id),
      text: subject,
      limit: 10,
      properties: ["id", "subject", "threadId", "mailboxIds"],
    });
    assert.ok(searchResult.query.ids.includes(draftId), "expected search to include created draft");

    const thread = await mail.getThread(context.accountId, email.threadId);
    assert.ok(thread, "expected thread to be fetchable");
    assert.ok(thread.emailIds.includes(draftId));

    const threadEmails = await mail.getThreadEmails(context.accountId, email.threadId, [
      "id",
      "threadId",
      "mailboxIds",
      "receivedAt",
      "subject",
    ]);
    assert.ok(threadEmails.some((entry) => entry.id === draftId));

    const mailboxQuery = await mail.queryMailboxEmailIds(context.accountId, MailboxId.of(drafts.id), {
      limit: 100,
      position: 0,
    });
    assert.ok(mailboxQuery.ids.includes(draftId));
  } finally {
    await safeDestroy(mail, context.accountId, draftId);
  }
});

test("integration: mail keyword and tag update methods work on drafts", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mail = new JmapMail(context.client);
  const mailboxes = (await mail.getMailboxes(context.accountId)).list;
  const drafts = requireMailbox(mailboxes, "drafts");
  const tag = createIntegrationId("tag");
  const draftId = await createDraft(
    mail,
    context.accountId,
    drafts.id,
    `Keywords ${tag}`,
    await resolveDraftAddress(context),
  );

  try {
    await mail.updateKeywords(context.accountId, draftId, {
      "$draft": true,
      [`$color:${tag}`]: true,
    });
    await mail.markAsRead(context.accountId, draftId, true);
    await mail.toggleStar(context.accountId, draftId, true);

    const updated = await mail.getEmail(context.accountId, draftId, [
      "id",
      "keywords",
      "mailboxIds",
      "subject",
    ]);
    assert.ok(updated, "expected updated draft to be fetchable");
    assert.equal(updated.keywords?.["$draft"], true);
    assert.equal(updated.keywords?.[`$color:${tag}`], true);
    assert.equal(updated.keywords?.["$seen"], true);
    assert.equal(updated.keywords?.["$flagged"], true);

    const counts = await mail.queryTagCounts(context.accountId, [tag]);
    assert.equal(typeof counts[tag], "number");
    assert.ok(counts[tag] >= 1, "expected at least one email with the integration tag");

    await mail.markAsRead(context.accountId, draftId, false);
    const unread = await mail.getEmail(context.accountId, draftId, ["id", "keywords"]);
    assert.ok(unread, "expected unread draft to be fetchable");
    assert.equal(unread.keywords?.["$seen"], false);
  } finally {
    await safeDestroy(mail, context.accountId, draftId);
  }
});

test("integration: batch mark as read updates multiple drafts", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mail = new JmapMail(context.client);
  const mailboxes = (await mail.getMailboxes(context.accountId)).list;
  const drafts = requireMailbox(mailboxes, "drafts");
  const draftAddress = await resolveDraftAddress(context);
  const firstDraftId = await createDraft(mail, context.accountId, drafts.id, `Batch 1 ${Date.now()}`, draftAddress);
  const secondDraftId = await createDraft(mail, context.accountId, drafts.id, `Batch 2 ${Date.now()}`, draftAddress);

  try {
    await mail.batchMarkAsRead(context.accountId, [firstDraftId, secondDraftId], true);

    const first = await mail.getEmail(context.accountId, firstDraftId, ["id", "keywords"]);
    const second = await mail.getEmail(context.accountId, secondDraftId, ["id", "keywords"]);
    assert.equal(first?.keywords?.["$seen"], true);
    assert.equal(second?.keywords?.["$seen"], true);
  } finally {
    await safeDestroy(mail, context.accountId, firstDraftId);
    await safeDestroy(mail, context.accountId, secondDraftId);
  }
});

test("integration: move and moveMany can move drafts to another mailbox", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mail = new JmapMail(context.client);
  const mailboxes = (await mail.getMailboxes(context.accountId)).list;
  const drafts = requireMailbox(mailboxes, "drafts");
  const target = requireMoveTargetMailbox(mailboxes, drafts.id);
  const draftAddress = await resolveDraftAddress(context);
  const firstDraftId = await createDraft(mail, context.accountId, drafts.id, `Move 1 ${Date.now()}`, draftAddress);
  const secondDraftId = await createDraft(mail, context.accountId, drafts.id, `Move 2 ${Date.now()}`, draftAddress);
  const thirdDraftId = await createDraft(mail, context.accountId, drafts.id, `Move 3 ${Date.now()}`, draftAddress);

  try {
    await mail.move(context.accountId, firstDraftId, MailboxId.of(target.id));
    await mail.moveMany(context.accountId, [secondDraftId, thirdDraftId], MailboxId.of(target.id));

    const first = await mail.getEmail(context.accountId, firstDraftId, ["id", "mailboxIds"]);
    const second = await mail.getEmail(context.accountId, secondDraftId, ["id", "mailboxIds"]);
    const third = await mail.getEmail(context.accountId, thirdDraftId, ["id", "mailboxIds"]);
    assert.equal(first?.mailboxIds[target.id], true);
    assert.equal(second?.mailboxIds[target.id], true);
    assert.equal(third?.mailboxIds[target.id], true);
  } finally {
    await safeDestroy(mail, context.accountId, firstDraftId);
    await safeDestroy(mail, context.accountId, secondDraftId);
    await safeDestroy(mail, context.accountId, thirdDraftId);
  }
});

test("integration: destroy and destroyMany can remove drafts", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mail = new JmapMail(context.client);
  const mailboxes = (await mail.getMailboxes(context.accountId)).list;
  const drafts = requireMailbox(mailboxes, "drafts");
  const draftAddress = await resolveDraftAddress(context);
  const firstDraftId = await createDraft(mail, context.accountId, drafts.id, `Destroy 1 ${Date.now()}`, draftAddress);
  const secondDraftId = await createDraft(mail, context.accountId, drafts.id, `Destroy 2 ${Date.now()}`, draftAddress);
  const thirdDraftId = await createDraft(mail, context.accountId, drafts.id, `Destroy 3 ${Date.now()}`, draftAddress);

  await mail.destroy(context.accountId, firstDraftId);
  await mail.destroyMany(context.accountId, [secondDraftId, thirdDraftId]);

  assert.equal(await mail.getEmail(context.accountId, firstDraftId, ["id"]), undefined);
  assert.equal(await mail.getEmail(context.accountId, secondDraftId, ["id"]), undefined);
  assert.equal(await mail.getEmail(context.accountId, thirdDraftId, ["id"]), undefined);
});

test("integration: createDraft supports attachments", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mail = new JmapMail(context.client);
  const mailboxes = (await mail.getMailboxes(context.accountId)).list;
  const drafts = requireMailbox(mailboxes, "drafts");
  const draftAddress = await resolveDraftAddress(context);
  const blobId = await uploadIntegrationBlob(context, {
    contentType: "text/plain",
    body: "attachment body",
  });
  const draftId = await mail.createDraft({
    accountId: context.accountId,
    clientId: createIntegrationId("draft-attachment"),
    draftsMailboxId: MailboxId.of(drafts.id),
    from: [{ email: draftAddress }],
    to: [{ email: draftAddress }],
    subject: `Attachment ${Date.now()}`,
    body: "Attachment integration test",
    attachments: [{ blobId, type: "text/plain", name: "integration.txt" }],
  });

  try {
    const email = await mail.getEmail(context.accountId, draftId, [
      "id",
      "hasAttachment",
      "subject",
      "mailboxIds",
    ]);
    assert.ok(email, "expected attached draft to be fetchable");
    assert.equal(email.hasAttachment, true);
  } finally {
    await safeDestroy(mail, context.accountId, draftId);
  }
});

test("integration: can submit a created draft when submission is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return;
  }

  const identitiesClient = new JmapIdentities(context.client);
  const identities = await identitiesClient.list(context.accountId);
  assert.ok(identities.length > 0, "expected at least one identity");

  const mail = new JmapMail(context.client);
  const mailboxes = (await mail.getMailboxes(context.accountId)).list;
  const drafts = requireMailbox(mailboxes, "drafts");
  const draftId = await mail.createDraft({
    accountId: context.accountId,
    clientId: createIntegrationId("submit"),
    draftsMailboxId: MailboxId.of(drafts.id),
    from: [{ email: identities[0].email, name: identities[0].name }],
    to: [{ email: identities[0].email, name: identities[0].name }],
    subject: `Submit ${Date.now()}`,
    body: "Submission integration test",
  });

  await mail.submit(context.accountId, identities[0].id, draftId);
});

test("integration: can get all mailboxes across accounts", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mail = new JmapMail(context.client);
  const result = await mail.getAllMailboxes({ accountIds: [context.accountId] });

  assert.equal(result.failures.length, 0);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].accountId.value, context.accountId.value);
  assert.ok(Array.isArray(result.results[0].response.list));
});

async function createDraft(
  mail: JmapMail,
  accountId: import("jmap-lib").AccountId,
  draftsMailboxId: string,
  subject: string,
  fallbackEmail: string,
): Promise<string> {
  return mail.createDraft({
    accountId,
    clientId: createIntegrationId("draft"),
    draftsMailboxId: MailboxId.of(draftsMailboxId),
    from: [{ email: fallbackEmail }],
    to: [{ email: fallbackEmail }],
    subject,
    body: `Body for ${subject}`,
  });
}

function requireMailbox(
  mailboxes: JmapMailbox[],
  role: string,
): JmapMailbox {
  const mailbox = findMailboxByRole(mailboxes, role);
  assert.ok(mailbox, `expected a ${role} mailbox`);
  return mailbox;
}

function requireMoveTargetMailbox(
  mailboxes: JmapMailbox[],
  sourceMailboxId: string,
): JmapMailbox {
  const preferredRoles = ["trash", "archive", "inbox", "sent"];
  for (const role of preferredRoles) {
    const mailbox = findMailboxByRole(mailboxes, role);
    if (mailbox && mailbox.id !== sourceMailboxId) {
      return mailbox;
    }
  }

  const fallback = mailboxes.find((mailbox) => mailbox.id !== sourceMailboxId);
  assert.ok(fallback, "expected a second mailbox for move tests");
  return fallback;
}

async function resolveDraftAddress(
  context: Awaited<ReturnType<typeof createIntegrationClientContext>>,
): Promise<string> {
  if (hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    const identities = await new JmapIdentities(context.client).list(context.accountId);
    if (identities[0]?.email) {
      return identities[0].email;
    }
  }

  return context.session.username ?? context.user.username;
}

async function safeDestroy(
  mail: JmapMail,
  accountId: import("jmap-lib").AccountId,
  emailId: string,
): Promise<void> {
  const email = await mail.getEmail(accountId, emailId, ["id"]);
  if (!email) {
    return;
  }

  await mail.destroy(accountId, emailId);
}
