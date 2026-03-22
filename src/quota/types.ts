export interface JmapQuota {
  resourceType?: string;
  scope?: string;
  used?: number;
  hardLimit?: number;
  limit?: number;
}

export interface QuotaGetRequest {
  accountId: string;
}

export interface QuotaGetResponse {
  accountId: string;
  state?: string;
  list: JmapQuota[];
}
