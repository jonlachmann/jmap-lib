import test from "node:test";
import assert from "node:assert/strict";

import { BlobGet, JMAP_BLOB_CAPABILITY, JmapUploadTooLargeError, type BlobGetRequest, type BlobGetResponse } from "jmap-lib";
import { getSingleUserIntegrationSkipReason, loadSingleUserIntegrationConfig } from "./helpers/config.js";
import { createIntegrationClientContext } from "./helpers/client.js";
import { hasServerCapability } from "./helpers/capabilities.js";
import { createIntegrationId } from "./helpers/ids.js";

const skip = getSingleUserIntegrationSkipReason();

test("integration: uploads a blob and downloads the same octets (RFC 8620 6.1, 6.2)", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const text = `Blob ${createIntegrationId("upload")}`;
  const uploaded = await context.client.upload(context.accountId, new TextEncoder().encode(text), "text/plain");

  assert.equal(uploaded.accountId, context.accountId.value);
  assert.equal(typeof uploaded.blobId, "string");
  assert.equal(uploaded.size, new TextEncoder().encode(text).byteLength);

  const downloaded = await context.client.download(context.accountId, uploaded.blobId, "blob.txt", "text/plain");
  assert.equal(await downloaded.text(), text);
  assert.ok(context.client.downloadUrl(context.accountId, uploaded.blobId, "blob.txt", "text/plain").includes(encodeURIComponent(uploaded.blobId)));
});

test("integration: refuses an upload over maxSizeUpload before sending it", { skip }, async () => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const maxSizeUpload = context.client.limits?.maxSizeUpload;
  assert.ok(maxSizeUpload, "expected the session's maxSizeUpload");
  await assert.rejects(
    () => context.client.upload(context.accountId, new Uint8Array(maxSizeUpload + 1), "application/octet-stream"),
    JmapUploadTooLargeError,
  );
});

test("integration: reads a blob's text, size and a range with Blob/get (RFC 9404 4.2)", { skip }, async (t) => {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_BLOB_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_BLOB_CAPABILITY}`);
    return;
  }
  const text = "The quick brown fox jumped over the lazy dog.";
  const { blobId } = await context.client.upload(context.accountId, new TextEncoder().encode(text), "text/plain");

  const whole = await context.client.invoke<BlobGetRequest, BlobGetResponse>(new BlobGet({
    accountId: context.accountId.value,
    ids: [blobId, "not-a-blob"],
    properties: ["data:asText", "size"],
  }));
  assert.equal(whole.list[0]["data:asText"], text);
  assert.equal(whole.list[0].size, 45);
  assert.deepEqual(whole.notFound, ["not-a-blob"]);

  const range = await context.client.invoke<BlobGetRequest, BlobGetResponse>(new BlobGet({
    accountId: context.accountId.value,
    ids: [blobId],
    properties: ["data:asText", "digest:sha", "size"],
    offset: 4,
    length: 9,
  }));
  assert.equal(range.list[0]["data:asText"], "quick bro");
  assert.equal(range.list[0]["digest:sha"], "QiRAPtfyX8K6tm1iOAtZ87Xj3Ww=");
  assert.equal(range.list[0].size, 45);
});
