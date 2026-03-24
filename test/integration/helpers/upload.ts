import type { IntegrationClientContext } from "./client.js";

export async function uploadIntegrationBlob(
  context: IntegrationClientContext,
  options: {
    accountId?: string;
    contentType: string;
    body: string;
  },
): Promise<string> {
  const uploadUrlTemplate = context.session.uploadUrl;
  if (!uploadUrlTemplate) {
    throw new Error("JMAP session does not expose uploadUrl");
  }

  const accountId = options.accountId ?? context.accountId.value;
  const uploadUrl = uploadUrlTemplate.replace("{accountId}", encodeURIComponent(accountId));
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: context.authorizationHeader,
      "content-type": options.contentType,
    },
    body: options.body,
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(`Blob upload failed: HTTP ${response.status} ${rawBody}`);
  }

  const result = JSON.parse(rawBody) as Record<string, unknown>;
  const directBlobId = typeof result.blobId === "string" ? result.blobId : undefined;
  if (directBlobId) {
    return directBlobId;
  }

  const nested = result[accountId];
  if (nested && typeof nested === "object" && "blobId" in nested && typeof nested.blobId === "string") {
    return nested.blobId;
  }

  throw new Error("Blob upload response did not include a blobId");
}
