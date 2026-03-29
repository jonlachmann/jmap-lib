import test from "node:test";
import assert from "node:assert/strict";

import { JmapQuota } from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: fetches quota information", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const quota = await new JmapQuota(context.client).get(context.accountId);

  assert.ok(Array.isArray(quota.list));
  for (const item of quota.list) {
    if (item.used !== undefined) {
      assert.equal(typeof item.used, "number");
    }
    if (item.limit !== undefined) {
      assert.equal(typeof item.limit, "number");
    }
    if (item.hardLimit !== undefined) {
      assert.equal(typeof item.hardLimit, "number");
    }
  }
});
