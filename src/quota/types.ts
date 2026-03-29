import type { JmapGetArgs } from "../core/get";

export interface JmapQuota {
  resourceType?: string;
  scope?: string;
  used?: number;
  hardLimit?: number;
  limit?: number;
}

export type QuotaProperty = "resourceType" | "scope" | "used" | "hardLimit" | "limit";

export interface QuotaGetRequest extends JmapGetArgs<QuotaProperty> {}

export interface QuotaGetResponse {
  accountId: string;
  state?: string;
  list: JmapQuota[];
}
