import type { JmapMethod } from "../core/method";
import { AccountId } from "../core/ids";
import type {
  PrincipalGetAvailabilityRequest,
  PrincipalGetAvailabilityResponse,
  PrincipalGetRequest,
  PrincipalGetResponse,
  PrincipalQueryRequest,
  PrincipalQueryResponse,
} from "./types";

export class PrincipalGet implements JmapMethod<PrincipalGetRequest, PrincipalGetResponse> {
  readonly methodName = "Principal/get";
  readonly arguments: PrincipalGetRequest;

  constructor(args: PrincipalGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): PrincipalGet {
    return new PrincipalGet({ accountId: accountId.value, ids: null });
  }
}

export class PrincipalQuery implements JmapMethod<PrincipalQueryRequest, PrincipalQueryResponse> {
  readonly methodName = "Principal/query";
  readonly arguments: PrincipalQueryRequest;

  constructor(args: PrincipalQueryRequest) {
    this.arguments = args;
  }
}

export class PrincipalGetAvailability implements JmapMethod<PrincipalGetAvailabilityRequest, PrincipalGetAvailabilityResponse> {
  readonly methodName = "Principal/getAvailability";
  readonly arguments: PrincipalGetAvailabilityRequest;

  constructor(args: PrincipalGetAvailabilityRequest) {
    this.arguments = args;
  }
}
