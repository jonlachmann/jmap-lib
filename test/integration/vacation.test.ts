import test from "node:test";
import assert from "node:assert/strict";

import { type VacationResponse } from "jmap-lib";
import { getSingleUserIntegrationSkipReason } from "./helpers/config.js";
import { createIntegrationId } from "./helpers/ids.js";
import { createVacationIntegrationContext } from "./helpers/vacation.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: fetches the vacation response when vacation is supported", { skip }, async (t) => {
  const setup = await createVacationIntegrationContext(t);
  if (!setup) return;
  const { context, vacationClient } = setup;
  const vacation = await vacationClient.get(context.accountId);
  assert.ok(vacation === undefined || vacation.id === "singleton");
});

test("integration: updates the vacation response when vacation is supported", { skip }, async (t) => {
  const setup = await createVacationIntegrationContext(t);
  if (!setup) return;
  const { context, vacationClient } = setup;
  const original = await vacationClient.get(context.accountId);
  const marker = createIntegrationId("vacation");
  const updatedState: Partial<VacationResponse> = {
    isEnabled: false,
    subject: `Integration ${marker}`,
    textBody: `Integration body ${marker}`,
    htmlBody: null,
  };

  await vacationClient.update(context.accountId, updatedState);

  try {
    const fetched = await vacationClient.get(context.accountId);
    assert.ok(fetched, "expected singleton vacation response to be fetchable");
    assert.equal(fetched.subject, updatedState.subject);
    assert.equal(fetched.textBody, updatedState.textBody);
    assert.equal(fetched.isEnabled, false);
  } finally {
    if (original) {
      await vacationClient.update(context.accountId, {
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
