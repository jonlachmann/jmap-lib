import test from "node:test";
import assert from "node:assert/strict";

import { EmailGet, EmailQuery, JmapMail, MailboxId } from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
} from "./helpers/config.js";
import { createMailIntegrationContext } from "./helpers/mail.js";
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
