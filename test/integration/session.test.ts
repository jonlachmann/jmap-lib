import test from "node:test";
import assert from "node:assert/strict";

import { resolvePrimaryAccountId } from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { discoverIntegrationSession } from "./helpers/session.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: fetches the JMAP session document via .well-known/jmap", { skip }, async () => {
  const config = loadSingleUserIntegrationConfig();
  const discovered = await discoverIntegrationSession(config);

  assert.match(discovered.apiUrl, /^https?:\/\//);
  assert.ok(discovered.capabilities.length > 0, "expected session capabilities");
  assert.ok(discovered.session.capabilities, "expected capabilities object");
  assert.ok(discovered.authorizationHeader.startsWith("Basic "), "expected Basic auth header");
});

test("integration: resolves a primary or fallback account id from session data", { skip }, async () => {
  const config = loadSingleUserIntegrationConfig();
  const discovered = await discoverIntegrationSession(config);
  const accountId = config.accountId ?? resolvePrimaryAccountId(discovered.session);

  assert.ok(accountId, "expected a configured or discoverable account id");
});
