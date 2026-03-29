import test from "node:test";
import assert from "node:assert/strict";

import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { fetchMailboxes, findInboxMailbox } from "./helpers/mailboxes.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: fetches mailboxes using the discovered JMAP session", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const response = await fetchMailboxes(context.client, context.accountId);

  assert.equal(response.accountId, context.accountId.value);
  assert.ok(response.list.length > 0, "expected at least one mailbox");
});

test("integration: finds an inbox mailbox", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const response = await fetchMailboxes(context.client, context.accountId);
  const inbox = findInboxMailbox(response.list);

  assert.ok(inbox, "expected to find an inbox mailbox");
});
