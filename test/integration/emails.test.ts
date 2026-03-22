import test from "node:test";
import assert from "node:assert/strict";

import { JmapMail, MailboxId } from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { fetchMailboxes, findInboxMailbox } from "./helpers/mailboxes.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: can list a page of emails from a mailbox", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mailboxes = await fetchMailboxes(context.client, context.accountId);
  const mailbox = findInboxMailbox(mailboxes.list) ?? mailboxes.list[0];
  const mail = new JmapMail(context.client);
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
