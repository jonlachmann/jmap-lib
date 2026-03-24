import test from "node:test";
import assert from "node:assert/strict";

import {
  JMAP_SUBMISSION_CAPABILITY,
  JmapIdentities,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";
import { createIntegrationId } from "./helpers/ids.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: can list identities when submission is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return;
  }

  const identities = await new JmapIdentities(context.client).list(context.accountId);
  assert.ok(Array.isArray(identities));
  assert.ok(identities.length > 0, "expected at least one identity");
});

test("integration: can create an identity when submission is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return;
  }

  const identitiesClient = new JmapIdentities(context.client);
  const existing = await identitiesClient.list(context.accountId);
  assert.ok(existing.length > 0, "expected at least one existing identity");

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

test("integration: can update an identity when submission is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return;
  }

  const identitiesClient = new JmapIdentities(context.client);
  const existing = await identitiesClient.list(context.accountId);
  assert.ok(existing.length > 0, "expected at least one existing identity");

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

test("integration: can destroy an identity when submission is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return;
  }

  const identitiesClient = new JmapIdentities(context.client);
  const existing = await identitiesClient.list(context.accountId);
  assert.ok(existing.length > 0, "expected at least one existing identity");

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
