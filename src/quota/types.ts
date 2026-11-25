import type { JmapGetResponse } from "../core/get.js";
import type { JmapGetArgs } from "../core/get.js";

/** RFC 9425 3.1: whom a quota applies to. */
export type QuotaScope = "account" | "domain" | "global";

/** RFC 9425 3.2: what a quota counts, objects or octets. */
export type QuotaResourceType = "count" | "octets";

/** RFC 9425 4.1. */
export interface Quota {
  id: string;
  resourceType: QuotaResourceType;
  used: number;
  /** Objects in scope can't be created or updated once it is reached. */
  hardLimit: number;
  scope: QuotaScope;
  name: string;
  /** The data types it counts ("Email", "Calendar"), only those whose capabilities the request uses. */
  types: string[];
  warnLimit?: number | null;
  /** What it still allows is the server's choice, such as receiving mail but not sending it. */
  softLimit?: number | null;
  description?: string | null;
}

export type QuotaProperty = keyof Quota;

export interface QuotaGetRequest extends JmapGetArgs<QuotaProperty> {}

export type QuotaGetResponse = JmapGetResponse<Quota>;
