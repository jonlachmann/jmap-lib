import assert from "node:assert/strict";
import type { TestContext } from "node:test";

import { JMAP_SUBMISSION_CAPABILITY, JmapIdentities } from "jmap-lib";
import { loadSingleUserIntegrationConfig } from "./config.js";
import { createIntegrationClientContext, type IntegrationClientContext } from "./client.js";
import { hasServerCapability } from "./capabilities.js";

export interface IdentitiesIntegrationContext {
  context: IntegrationClientContext;
  identitiesClient: JmapIdentities;
}

export async function createIdentitiesIntegrationContext(
  t: TestContext,
): Promise<IdentitiesIntegrationContext | undefined> {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SUBMISSION_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SUBMISSION_CAPABILITY}`);
    return undefined;
  }

  const identitiesClient = new JmapIdentities(context.client);
  const identities = await identitiesClient.list(context.accountId);
  assert.ok(identities.length > 0, "expected at least one identity");

  return {
    context,
    identitiesClient,
  };
}
