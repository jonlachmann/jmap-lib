import { JmapClient } from "../core/client.js";
import { AccountId } from "../core/ids.js";
import { QuotaGet } from "./methods.js";
import type { QuotaGetRequest, QuotaGetResponse } from "./types.js";

export class JmapQuota {
  constructor(private readonly client: JmapClient) {}

  async get(accountId: AccountId): Promise<QuotaGetResponse> {
    return this.client.invoke<QuotaGetRequest, QuotaGetResponse>(QuotaGet.forAccount(accountId));
  }
}
