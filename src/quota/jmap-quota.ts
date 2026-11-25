import { JMAP_QUOTA_CAPABILITY } from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { AccountId } from "../core/ids.js";
import { QuotaGet } from "./methods.js";
import type { QuotaGetRequest, QuotaGetResponse } from "./types.js";

export class JmapQuota {
  constructor(private readonly client: JmapClient) {}

  /** Read the account's quotas. The request names the client's capabilities beside quota, as a quota's types list only
   *  the data types whose capabilities the request uses (RFC 9425 4.1). */
  async get(accountId: AccountId): Promise<QuotaGetResponse> {
    const capabilities = new Set([...this.client.getCapabilities(), JMAP_QUOTA_CAPABILITY]);
    return this.client.invoke<QuotaGetRequest, QuotaGetResponse>(QuotaGet.forAccount(accountId), {
      capabilities: [...capabilities],
    });
  }
}
