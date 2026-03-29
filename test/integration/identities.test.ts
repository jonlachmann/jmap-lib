import test from "node:test";
import assert from "node:assert/strict";

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
