import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";

import {
  CORE_MAIL_SUBMISSION_CAPABILITIES,
  IdentityGet,
  JmapSetRefusedError,
  type AccountId,
  type IdentityCreate,
  type IdentityGetRequest,
  type IdentityGetResponse,
  type JmapIdentities,
} from "jmap-lib";
import { getSingleUserIntegrationSkipReason } from "./helpers/config.js";
import { createIdentitiesIntegrationContext } from "./helpers/identities.js";
import { createIntegrationId } from "./helpers/ids.js";

const skip = getSingleUserIntegrationSkipReason();

function isForbidden(error: unknown): boolean {
  return error instanceof JmapSetRefusedError && error.setError.type === "forbidden";
}

/** Creates an identity, or skips the test when the server refuses creation as forbidden (RFC 8621 6.3). */
async function createIdentityOrSkip(
  t: TestContext,
  identitiesClient: JmapIdentities,
  accountId: AccountId,
  identity: IdentityCreate,
): Promise<string | undefined> {
  try {
    return (await identitiesClient.create(accountId, identity)).id;
  } catch (error) {
    if (!isForbidden(error)) throw error;
    t.skip("the server refuses identity creation as forbidden");
    return undefined;
  }
}

test("integration: lists identities when submission is supported", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const identities = await identitiesClient.list(context.accountId);
  assert.ok(Array.isArray(identities));
  assert.ok(identities.length > 0, "expected at least one identity");
});

test("integration: reports no identity changes when the identity state is unchanged", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const response = await context.client.invoke<IdentityGetRequest, IdentityGetResponse>(
    IdentityGet.all(context.accountId),
    { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
  );

  assert.ok(response.state, "expected identity state");

  const changes = await identitiesClient.changes(context.accountId, response.state);
  assert.deepEqual(changes.created, []);
  assert.deepEqual(changes.updated, []);
  assert.deepEqual(changes.destroyed, []);
  assert.equal(changes.hasMoreChanges, false);
});

test("integration: creates an identity when submission is supported", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const existing = await identitiesClient.list(context.accountId);

  const clientId = createIntegrationId("create-identity");
  const createdIdentityId = await createIdentityOrSkip(t, identitiesClient, context.accountId, {
    name: `Integration ${clientId}`,
    email: existing[0].email,
    textSignature: `Created by ${clientId}`,
  });
  if (!createdIdentityId) return;

  try {
    assert.equal(typeof createdIdentityId, "string");
    assert.ok(createdIdentityId.length > 0);
  } finally {
    await identitiesClient.destroy(context.accountId, createdIdentityId);
  }
});

test("integration: updates an existing identity, or is refused as forbidden (RFC 8621 6.3)", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const [original] = await identitiesClient.list(context.accountId);

  const clientId = createIntegrationId("update-identity");
  const updatedName = `Updated ${clientId}`;
  const updatedSignature = `Updated signature ${clientId}`;
  try {
    await identitiesClient.update(context.accountId, original.id, {
      name: updatedName,
      textSignature: updatedSignature,
    });
  } catch (error) {
    if (!isForbidden(error)) throw error;
    t.skip("the server refuses identity changes as forbidden");
    return;
  }

  try {
    const identities = await identitiesClient.list(context.accountId);
    const updated = identities.find((identity) => identity.id === original.id);
    assert.ok(updated, "expected updated identity to be listed");
    assert.equal(updated.name, updatedName);
    assert.equal(updated.textSignature, updatedSignature);
  } finally {
    await identitiesClient.update(context.accountId, original.id, {
      name: original.name,
      textSignature: original.textSignature ?? "",
    });
  }
});

test("integration: destroys an identity when submission is supported", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const existing = await identitiesClient.list(context.accountId);

  const clientId = createIntegrationId("destroy-identity");
  const createdIdentityId = await createIdentityOrSkip(t, identitiesClient, context.accountId, {
    name: `Destroy ${clientId}`,
    email: existing[0].email,
  });
  if (!createdIdentityId) return;

  await identitiesClient.destroy(context.accountId, createdIdentityId);

  const identities = await identitiesClient.list(context.accountId);
  assert.equal(
    identities.some((identity) => identity.id === createdIdentityId),
    false,
  );
});

test("integration: reports identity changes after creating an identity", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const existing = await identitiesClient.list(context.accountId);
  const baseline = await context.client.invoke<IdentityGetRequest, IdentityGetResponse>(
    IdentityGet.all(context.accountId),
    { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
  );

  assert.ok(baseline.state, "expected identity state");

  const clientId = createIntegrationId("identity-changes");
  const createdIdentityId = await createIdentityOrSkip(t, identitiesClient, context.accountId, {
    name: `Integration ${clientId}`,
    email: existing[0].email,
  });
  if (!createdIdentityId) return;

  try {
    const changes = await identitiesClient.changes(context.accountId, baseline.state);
    assert.ok(changes.created.includes(createdIdentityId) || changes.updated.includes(createdIdentityId));
  } finally {
    await identitiesClient.destroy(context.accountId, createdIdentityId);
  }
});
