import type { JmapGetResponse } from "../core/get.js";
import type { JmapGetArgs } from "../core/get.js";

export interface JmapQuota {
  resourceType?: string;
  scope?: string;
  used?: number;
  hardLimit?: number;
  limit?: number;
}

export type QuotaProperty = "resourceType" | "scope" | "used" | "hardLimit" | "limit";

export interface QuotaGetRequest extends JmapGetArgs<QuotaProperty> {}

export type QuotaGetResponse = JmapGetResponse<JmapQuota>;
