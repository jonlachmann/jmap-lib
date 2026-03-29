import type { TestContext } from "node:test";

import { JMAP_SIEVE_CAPABILITY, JmapSieve } from "jmap-lib";
import { loadSingleUserIntegrationConfig } from "./config.js";
import { createIntegrationClientContext, type IntegrationClientContext } from "./client.js";
import { hasServerCapability } from "./capabilities.js";

export interface SieveIntegrationContext {
  context: IntegrationClientContext;
  sieve: JmapSieve;
}

export async function createSieveIntegrationContext(
  t: TestContext,
): Promise<SieveIntegrationContext | undefined> {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SIEVE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SIEVE_CAPABILITY}`);
    return undefined;
  }

  return {
    context,
    sieve: new JmapSieve(context.client),
  };
}
