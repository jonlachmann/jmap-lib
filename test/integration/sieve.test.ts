import test from "node:test";
import assert from "node:assert/strict";

import {
  JMAP_SIEVE_CAPABILITY,
  JmapSieve,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
  loadSingleUserIntegrationConfig,
} from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";
import { createIntegrationId } from "./helpers/ids.js";
import { uploadIntegrationBlob } from "./helpers/upload.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: can list sieve scripts when sieve is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SIEVE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SIEVE_CAPABILITY}`);
    return;
  }

  const scripts = await new JmapSieve(context.client).list(context.accountId);
  assert.ok(Array.isArray(scripts));
});

test("integration: can validate a sieve script when sieve is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SIEVE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SIEVE_CAPABILITY}`);
    return;
  }

  const blobId = await uploadIntegrationBlob(context, {
    contentType: "application/sieve",
    body: validSieveScript("integration-valid"),
  });

  const result = await new JmapSieve(context.client).validate(context.accountId, blobId);
  assert.equal(result.isValid, true);
});

test("integration: can create, update, activate, deactivate, and destroy a sieve script when sieve is supported", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_SIEVE_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_SIEVE_CAPABILITY}`);
    return;
  }

  const sieve = new JmapSieve(context.client);
  const clientId = createIntegrationId("sieve");
  const initialBlobId = await uploadIntegrationBlob(context, {
    contentType: "application/sieve",
    body: validSieveScript(clientId),
  });
  const updatedBlobId = await uploadIntegrationBlob(context, {
    contentType: "application/sieve",
    body: validSieveScript(`${clientId}-updated`),
  });

  const scriptId = await sieve.create(context.accountId, clientId, {
    name: `Integration ${clientId}`,
    blobId: initialBlobId,
  });

  try {
    let scripts = await sieve.list(context.accountId);
    let script = scripts.find((entry) => entry.id === scriptId);
    assert.ok(script, "expected created sieve script to be listed");
    assert.equal(script.name, `Integration ${clientId}`);

    await sieve.update(context.accountId, scriptId, updatedBlobId);
    scripts = await sieve.list(context.accountId);
    script = scripts.find((entry) => entry.id === scriptId);
    assert.ok(script, "expected updated sieve script to remain listed");
    assert.equal(script.blobId, updatedBlobId);

    await sieve.activate(context.accountId, scriptId);
    scripts = await sieve.list(context.accountId);
    script = scripts.find((entry) => entry.id === scriptId);
    assert.ok(script, "expected activated sieve script to be listed");
    assert.equal(script.isActive, true);

    await sieve.deactivate(context.accountId);
    scripts = await sieve.list(context.accountId);
    script = scripts.find((entry) => entry.id === scriptId);
    assert.ok(script, "expected deactivated sieve script to remain listed");
    assert.equal(script.isActive, false);
  } finally {
    await sieve.destroy(context.accountId, scriptId);
  }

  const scripts = await sieve.list(context.accountId);
  assert.equal(
    scripts.some((entry) => entry.id === scriptId),
    false,
  );
});

function validSieveScript(marker: string): string {
  return [
    'require ["fileinto"];',
    `# ${marker}`,
    'if header :contains "subject" "never-match" {',
    '  fileinto "INBOX";',
    "}",
  ].join("\n");
}
