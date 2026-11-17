import type { JmapMethod } from "../core/method.js";
import { AccountId } from "../core/ids.js";
import type { QuotaGetRequest, QuotaGetResponse } from "./types.js";

export class QuotaGet implements JmapMethod<QuotaGetRequest, QuotaGetResponse> {
  readonly methodName = "Quota/get";
  readonly arguments: QuotaGetRequest;

  constructor(args: QuotaGetRequest) {
    this.arguments = args;
  }

  static forAccount(accountId: AccountId): QuotaGet {
    return new QuotaGet({ accountId: accountId.value });
  }
}
