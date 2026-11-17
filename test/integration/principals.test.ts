import test from "node:test";
import assert from "node:assert/strict";
import type { TestContext } from "node:test";

import {
  AccountId,
  JMAP_PRINCIPALS_CAPABILITY,
  JmapPrincipals,
  JmapProtocolError,
  JmapSetRefusedError,
  resolvePrimaryAccountId,
} from "jmap-lib";
import { getSingleUserIntegrationSkipReason, loadSingleUserIntegrationConfig } from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";

const skip = getSingleUserIntegrationSkipReason();

async function createPrincipalsContext(t: TestContext) {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const accountId = resolvePrimaryAccountId(context.session, JMAP_PRINCIPALS_CAPABILITY);
  if (!hasServerCapability(context.session, JMAP_PRINCIPALS_CAPABILITY) || !accountId) {
    t.skip(`server does not advertise ${JMAP_PRINCIPALS_CAPABILITY}`);
    return undefined;
  }
  const capability = context.session.accounts[accountId].accountCapabilities[JMAP_PRINCIPALS_CAPABILITY] as
    { currentUserPrincipalId?: string | null } | undefined;
  return { principals: new JmapPrincipals(context.client), accountId: AccountId.of(accountId), currentUserPrincipalId: capability?.currentUserPrincipalId };
}

function isCannotCalculateChanges(error: unknown): boolean {
  return error instanceof JmapProtocolError && error.type === "cannotCalculateChanges";
}

test("integration: reads principal changes, or is told they can't be calculated (RFC 9670 2.2, 2.5)", { skip }, async (t) => {
  const setup = await createPrincipalsContext(t);
  if (!setup) return;
  const { principals, accountId } = setup;

  const query = await principals.query(accountId);
  try {
    const changes = await principals.queryChanges(accountId, query.queryState);
    assert.ok(Array.isArray(changes.added));
  } catch (error) {
    assert.ok(isCannotCalculateChanges(error), String(error));
  }
});

test("integration: changing the user's own principal is done or refused as forbidden (RFC 9670 2.3)", { skip }, async (t) => {
  const setup = await createPrincipalsContext(t);
  if (!setup) return;
  const { principals, accountId, currentUserPrincipalId } = setup;
  if (!currentUserPrincipalId) {
    t.skip("the account names no principal for the user");
    return;
  }

  const [own] = (await principals.list(accountId)).filter((principal) => principal.id === currentUserPrincipalId);
  assert.ok(own, "expected the user's own principal");
  try {
    await principals.update(accountId, own.id, { description: own.description ?? null });
  } catch (error) {
    assert.ok(error instanceof JmapSetRefusedError && error.setError.type === "forbidden", String(error));
  }
});

test("integration: lists share notifications and follows their changes (RFC 9670 3)", { skip }, async (t) => {
  const setup = await createPrincipalsContext(t);
  if (!setup) return;
  const { principals, accountId } = setup;

  const listed = await principals.listShareNotifications(accountId, undefined, { limit: 10 });
  assert.ok(Array.isArray(listed));
  for (const notification of listed) {
    assert.equal(typeof notification.objectType, "string");
    assert.equal(typeof notification.changedBy.name, "string");
  }

  const all = await principals.getAllShareNotifications(accountId);
  const changes = await principals.getShareNotificationChanges(accountId, all.state);
  assert.equal(changes.oldState, all.state);
});

test("integration: dismissing an unknown share notification is refused as notFound (RFC 9670 3.3)", { skip }, async (t) => {
  const setup = await createPrincipalsContext(t);
  if (!setup) return;
  const { principals, accountId } = setup;

  await assert.rejects(() => principals.dismissShareNotifications(accountId, ["no-such-notification"]), (error: unknown) =>
    error instanceof JmapSetRefusedError && error.setError.type === "notFound");
});
