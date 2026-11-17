import test from "node:test";
import assert from "node:assert/strict";

import { MailboxGet, type MailboxGetRequest, type MailboxGetResponse } from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { createMailIntegrationContext } from "./helpers/mail.js";
import { createIntegrationId } from "./helpers/ids.js";
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

test("integration: reports no mailbox changes when the mailbox state is unchanged", { skip }, async () => {
  const { context, mail } = await createMailIntegrationContext();
  const response = await context.client.invoke<MailboxGetRequest, MailboxGetResponse>(
    MailboxGet.all(context.accountId),
  );

  assert.ok(response.state, "expected mailbox state");

  const changes = await mail.getMailboxChanges(context.accountId, response.state);

  assert.equal(changes.accountId, context.accountId.value);
  assert.deepEqual(changes.created, []);
  assert.deepEqual(changes.updated, []);
  assert.deepEqual(changes.destroyed, []);
  assert.equal(changes.hasMoreChanges, false);
});

test("integration: queries seeded mailboxes and reports mailbox query changes deterministically", { skip }, async () => {
  const { context, mail } = await createMailIntegrationContext();
  const marker = createIntegrationId("query-mailboxes");

  const initialQuery = await mail.queryMailboxes(context.accountId, {
    filter: { name: marker },
    sort: [{ property: "name", isAscending: true }],
    sortAsTree: true,
    calculateTotal: true,
  });

  assert.ok(initialQuery.queryState, "expected initial mailbox query state");
  const initialIds = new Set(initialQuery.ids);

  const firstMailboxId = (await mail.createMailbox(context.accountId, {
    name: `${marker}-alpha`,
  })).id;
  const secondMailboxId = (await mail.createMailbox(context.accountId, {
    name: `${marker}-beta`,
  })).id;

  try {
    const query = await mail.queryMailboxes(context.accountId, {
      filter: { name: marker },
      sort: [{ property: "name", isAscending: true }],
      sortAsTree: true,
      calculateTotal: true,
    });
    const changes = await mail.queryMailboxChanges(context.accountId, {
      filter: { name: marker },
      sort: [{ property: "name", isAscending: true }],
      sinceQueryState: initialQuery.queryState,
      calculateTotal: true,
    });
    const newIds = query.ids.filter((id) => !initialIds.has(id));

    assert.ok(query.ids.includes(firstMailboxId));
    assert.ok(query.ids.includes(secondMailboxId));
    assert.ok(newIds.includes(firstMailboxId));
    assert.ok(newIds.includes(secondMailboxId));
    assert.deepEqual(changes.removed, []);
    assert.ok(changes.added?.some((entry) => entry.id === firstMailboxId));
    assert.ok(changes.added?.some((entry) => entry.id === secondMailboxId));
    if (changes.total !== undefined && initialQuery.total !== undefined) {
      assert.equal(changes.total, initialQuery.total + newIds.length);
    }
  } finally {
    await mail.destroyMailbox(context.accountId, firstMailboxId);
    await mail.destroyMailbox(context.accountId, secondMailboxId);
  }
});

test("integration: reports mailbox changes after creating a mailbox", { skip }, async () => {
  const { context, mail } = await createMailIntegrationContext();
  const baseline = await context.client.invoke<MailboxGetRequest, MailboxGetResponse>(
    MailboxGet.all(context.accountId),
  );

  assert.ok(baseline.state, "expected mailbox state");

  const mailboxId = (await mail.createMailbox(context.accountId, {
    name: createIntegrationId("Mailbox Changes"),
  })).id;

  try {
    const changes = await mail.getMailboxChanges(context.accountId, baseline.state);
    assert.ok(changes.created.includes(mailboxId) || changes.updated.includes(mailboxId));
  } finally {
    await mail.destroyMailbox(context.accountId, mailboxId);
  }
});

test("integration: updates a created mailbox", { skip }, async () => {
  const { context, mail } = await createMailIntegrationContext();
  const createdName = createIntegrationId("mailbox-update-created");
  const updatedName = createIntegrationId("mailbox-update-updated");
  const mailboxId = (await mail.createMailbox(context.accountId, {
    name: createdName,
  })).id;

  try {
    await mail.updateMailbox(context.accountId, mailboxId, {
      name: updatedName,
      isSubscribed: true,
    });

    const mailboxes = await fetchMailboxes(context.client, context.accountId);
    const updated = mailboxes.list.find((mailbox) => mailbox.id === mailboxId);
    assert.ok(updated, "expected updated mailbox to be listed");
    assert.equal(updated.name, updatedName);
    assert.equal(updated.isSubscribed, true);
  } finally {
    await mail.destroyMailbox(context.accountId, mailboxId);
  }
});
