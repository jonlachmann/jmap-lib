import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  JMAP_MAIL_CAPABILITY,
  JMAP_SUBMISSION_CAPABILITY,
  JmapProtocolError,
  JmapSetRefusedError,
} from "jmap-lib";
import { getSingleUserIntegrationSkipReason } from "./helpers/config.js";
import { hasServerCapability } from "./helpers/capabilities.js";
import { createIntegrationId } from "./helpers/ids.js";
import { createMailIntegrationContext, requireMailboxByRole } from "./helpers/mail.js";
import { fetchMailboxes } from "./helpers/mailboxes.js";

const skip = getSingleUserIntegrationSkipReason();

function message(subject: string): Uint8Array {
  return new TextEncoder().encode([
    "From: Integration <integration@example.com>",
    "To: Integration <integration@example.com>",
    `Subject: ${subject}`,
    `Message-ID: <${createIntegrationId("msg")}@example.com>`,
    "Date: Mon, 2 Nov 2026 10:00:00 +0000",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Imported by the integration tests.",
    "",
  ].join("\r\n"));
}

test("integration: imports an uploaded message as an email (RFC 8621 4.8)", { skip }, async () => {
  const { context, mail, mailboxes } = await createMailIntegrationContext();
  const drafts = requireMailboxByRole(mailboxes, "drafts");
  const subject = `Import ${createIntegrationId("import")}`;
  const { blobId } = await context.client.upload(context.accountId, message(subject), "message/rfc822");

  const imported = await mail.importEmail(context.accountId, {
    blobId,
    mailboxIds: { [drafts.id]: true },
    keywords: { $seen: true },
    receivedAt: "2026-11-02T10:00:00Z",
  });

  try {
    const created = imported.response.created?.new;
    assert.ok(created, "expected the created email");
    assert.equal(typeof created.threadId, "string");
    assert.equal(typeof created.size, "number");

    const email = await mail.getEmail(context.accountId, imported.id, ["subject", "mailboxIds", "keywords", "receivedAt"]);
    assert.equal(email?.subject, subject);
    assert.deepEqual(email?.mailboxIds, { [drafts.id]: true });
    assert.equal(email?.keywords?.$seen, true);
  } finally {
    await mail.destroy(context.accountId, imported.id);
  }
});

test("integration: copies an email to another account (RFC 8621 4.7)", { skip }, async (t) => {
  const { context, mail, mailboxes } = await createMailIntegrationContext();
  const otherId = Object.entries(context.session.accounts)
    .find(([id, account]) => id !== context.accountId.value && !account.isReadOnly && JMAP_MAIL_CAPABILITY in account.accountCapabilities)?.[0];
  if (!otherId) {
    t.skip("no other writable mail account to copy to");
    return;
  }
  const other = AccountId.of(otherId);
  const target = (await fetchMailboxes(context.client, other)).list.find((mailbox) => mailbox.myRights?.mayAddItems !== false);
  if (!target) {
    t.skip("the other account has no mailbox to copy into");
    return;
  }

  const drafts = requireMailboxByRole(mailboxes, "drafts");
  const { blobId } = await context.client.upload(context.accountId, message(`Copy ${createIntegrationId("copy")}`), "message/rfc822");
  const original = await mail.importEmail(context.accountId, { blobId, mailboxIds: { [drafts.id]: true } });

  try {
    const copied = await mail.copyEmail(other, context.accountId, original.id, { mailboxIds: { [target.id]: true } });
    assert.equal(copied.response.fromAccountId, context.accountId.value);
    await mail.destroy(other, copied.id);
  } catch (error) {
    if (error instanceof JmapProtocolError && error.type === "fromAccountNotFound") {
      t.skip("the server copies no email between accounts");
      return;
    }
    throw error;
  } finally {
    await mail.destroy(context.accountId, original.id);
  }
});

test("integration: lists submissions and their changes (RFC 8621 7.1-7.3)", { skip }, async (t) => {
  const { context, mail } = await createMailIntegrationContext();
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return;
  }

  const pending = await mail.listSubmissions(context.accountId, { undoStatus: "pending" }, { sort: [{ property: "sendAt", isAscending: false }] });
  assert.ok(Array.isArray(pending));

  const { state, notFound } = await mail.getSubmissions(context.accountId, ["no-such-submission"]);
  assert.deepEqual(notFound, ["no-such-submission"]);
  const changes = await mail.getSubmissionChanges(context.accountId, state);
  assert.equal(changes.oldState, state);
});

test("integration: destroying an unknown submission is refused as notFound (RFC 8621 7.5)", { skip }, async (t) => {
  const { context, mail } = await createMailIntegrationContext();
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return;
  }

  await assert.rejects(() => mail.destroySubmission(context.accountId, "no-such-submission"), (error: unknown) =>
    error instanceof JmapSetRefusedError && error.setError.type === "notFound");
});
