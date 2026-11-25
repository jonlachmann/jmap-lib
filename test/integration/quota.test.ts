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
    assert.equal(typeof item.id, "string");
    assert.ok(["count", "octets"].includes(item.resourceType));
    assert.ok(["account", "domain", "global"].includes(item.scope));
    assert.equal(typeof item.used, "number");
    assert.equal(typeof item.hardLimit, "number");
    assert.equal(typeof item.name, "string");
    assert.ok(Array.isArray(item.types));
  }
});
