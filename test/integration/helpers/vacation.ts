import type { TestContext } from "node:test";

import { JMAP_VACATION_RESPONSE_CAPABILITY, JmapVacation } from "jmap-lib";
import { loadSingleUserIntegrationConfig } from "./config.js";
import { createIntegrationClientContext, type IntegrationClientContext } from "./client.js";
import { hasServerCapability } from "./capabilities.js";

export interface VacationIntegrationContext {
  context: IntegrationClientContext;
  vacationClient: JmapVacation;
}

export async function createVacationIntegrationContext(
  t: TestContext,
): Promise<VacationIntegrationContext | undefined> {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_VACATION_RESPONSE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_VACATION_RESPONSE_CAPABILITY}`);
    return undefined;
  }

  return {
    context,
    vacationClient: new JmapVacation(context.client),
  };
}
