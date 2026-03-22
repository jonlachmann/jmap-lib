import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import { QuotaGet } from "./methods";
import type { QuotaGetRequest, QuotaGetResponse } from "./types";

export class JmapQuota {
  constructor(private readonly client: JmapClient) {}

  async get(accountId: AccountId): Promise<QuotaGetResponse> {
    return this.client.invoke<QuotaGetRequest, QuotaGetResponse>(QuotaGet.forAccount(accountId));
  }
}
