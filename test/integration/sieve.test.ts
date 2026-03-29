import test from "node:test";
import assert from "node:assert/strict";

import { getSingleUserIntegrationSkipReason } from "./helpers/config.js";
import { createIntegrationId } from "./helpers/ids.js";
import { createSieveIntegrationContext } from "./helpers/sieve.js";
import { uploadIntegrationBlob } from "./helpers/upload.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: lists sieve scripts when sieve is supported", { skip }, async (t) => {
  const setup = await createSieveIntegrationContext(t);
  if (!setup) return;
  const { context, sieve } = setup;
  const scripts = await sieve.list(context.accountId);
  assert.ok(Array.isArray(scripts));
});

test("integration: validates a sieve script when sieve is supported", { skip }, async (t) => {
  const setup = await createSieveIntegrationContext(t);
  if (!setup) return;
  const { context, sieve } = setup;

  const blobId = await uploadIntegrationBlob(context, {
    contentType: "application/sieve",
    body: validSieveScript("integration-valid"),
  });

  const result = await sieve.validate(context.accountId, blobId);
  assert.equal(result.isValid, true);
});

test("integration: creates, updates, activates, deactivates, and destroys a sieve script when sieve is supported", { skip }, async (t) => {
  const setup = await createSieveIntegrationContext(t);
  if (!setup) return;
  const { context, sieve } = setup;
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
