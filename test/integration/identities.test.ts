import test from "node:test";
import assert from "node:assert/strict";

import {
  CORE_MAIL_SUBMISSION_CAPABILITIES,
  IdentityGet,
  type IdentityGetRequest,
  type IdentityGetResponse,
} from "jmap-lib";
import { getSingleUserIntegrationSkipReason } from "./helpers/config.js";
import { createIdentitiesIntegrationContext } from "./helpers/identities.js";
import { createIntegrationId } from "./helpers/ids.js";

const skip = getSingleUserIntegrationSkipReason();

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
  const createdIdentityId = await identitiesClient.create(context.accountId, clientId, {
    name: `Integration ${clientId}`,
    email: existing[0].email,
    textSignature: `Created by ${clientId}`,
  });

  try {
    assert.equal(typeof createdIdentityId, "string");
    assert.ok(createdIdentityId.length > 0);
  } finally {
    await identitiesClient.destroy(context.accountId, createdIdentityId);
  }
});

test("integration: updates an identity when submission is supported", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const existing = await identitiesClient.list(context.accountId);

  const clientId = createIntegrationId("update-identity");
  const createdIdentityId = await identitiesClient.create(context.accountId, clientId, {
    name: `Original ${clientId}`,
    email: existing[0].email,
    textSignature: "Original signature",
  });

  try {
    const updatedName = `Updated ${clientId}`;
    const updatedSignature = `Updated signature ${clientId}`;
    await identitiesClient.update(context.accountId, createdIdentityId, {
      name: updatedName,
      textSignature: updatedSignature,
    });

    const identities = await identitiesClient.list(context.accountId);
    const updated = identities.find((identity) => identity.id === createdIdentityId);
    assert.ok(updated, "expected updated identity to be listed");
    assert.equal(updated.name, updatedName);
    assert.equal(updated.textSignature, updatedSignature);
  } finally {
    await identitiesClient.destroy(context.accountId, createdIdentityId);
  }
});

test("integration: destroys an identity when submission is supported", { skip }, async (t) => {
  const setup = await createIdentitiesIntegrationContext(t);
  if (!setup) return;
  const { context, identitiesClient } = setup;
  const existing = await identitiesClient.list(context.accountId);

  const clientId = createIntegrationId("destroy-identity");
  const createdIdentityId = await identitiesClient.create(context.accountId, clientId, {
    name: `Destroy ${clientId}`,
    email: existing[0].email,
  });

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
  const createdIdentityId = await identitiesClient.create(context.accountId, clientId, {
    name: `Integration ${clientId}`,
    email: existing[0].email,
  });

  try {
    const changes = await identitiesClient.changes(context.accountId, baseline.state);
    assert.ok(changes.created.includes(createdIdentityId) || changes.updated.includes(createdIdentityId));
  } finally {
    await identitiesClient.destroy(context.accountId, createdIdentityId);
  }
});
