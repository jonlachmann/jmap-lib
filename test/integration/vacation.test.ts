import test from "node:test";
import assert from "node:assert/strict";

import {
  JMAP_VACATION_RESPONSE_CAPABILITY,
  JmapVacation,
  type VacationResponse,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";
import { createIntegrationId } from "./helpers/ids.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: can fetch vacation response when vacation is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_VACATION_RESPONSE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_VACATION_RESPONSE_CAPABILITY}`);
    return;
  }

  const vacation = await new JmapVacation(context.client).get(context.accountId);
  assert.ok(vacation === undefined || vacation.id === "singleton");
});

test("integration: can update vacation response when vacation is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_VACATION_RESPONSE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_VACATION_RESPONSE_CAPABILITY}`);
    return;
  }

  const vacation = new JmapVacation(context.client);
  const original = await vacation.get(context.accountId);
  const marker = createIntegrationId("vacation");
  const updatedState: Partial<VacationResponse> = {
    isEnabled: false,
    subject: `Integration ${marker}`,
    textBody: `Integration body ${marker}`,
    htmlBody: null,
  };

  await vacation.update(context.accountId, updatedState);

  try {
    const fetched = await vacation.get(context.accountId);
    assert.ok(fetched, "expected singleton vacation response to be fetchable");
    assert.equal(fetched.subject, updatedState.subject);
    assert.equal(fetched.textBody, updatedState.textBody);
    assert.equal(fetched.isEnabled, false);
  } finally {
    if (original) {
      await vacation.update(context.accountId, {
        isEnabled: original.isEnabled,
        fromDate: original.fromDate,
        toDate: original.toDate,
        subject: original.subject,
        textBody: original.textBody,
        htmlBody: original.htmlBody,
      });
    }
  }
});
