import type { JmapMethod } from "../core/method.js";
import { AccountId, CallId } from "../core/ids.js";
import { resultOf } from "../core/reference.js";
import type { JmapSetResponse } from "../core/set.js";
import type {
  PrincipalChangesRequest,
  PrincipalChangesResponse,
  PrincipalQueryChangesRequest,
  PrincipalQueryChangesResponse,
  PrincipalSetRequest,
  ShareNotificationChangesRequest,
  ShareNotificationChangesResponse,
  ShareNotificationGetRequest,
  ShareNotificationGetResponse,
  ShareNotificationQueryChangesRequest,
  ShareNotificationQueryChangesResponse,
  ShareNotificationQueryRequest,
  ShareNotificationQueryResponse,
  ShareNotificationSetRequest,
  PrincipalGetAvailabilityRequest,
  PrincipalGetAvailabilityResponse,
  PrincipalGetRequest,
  PrincipalGetResponse,
  PrincipalQueryRequest,
  PrincipalQueryResponse,
} from "./types.js";

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

export class PrincipalChanges implements JmapMethod<PrincipalChangesRequest, PrincipalChangesResponse> {
  readonly methodName = "Principal/changes";
  readonly arguments: PrincipalChangesRequest;

  constructor(args: PrincipalChangesRequest) {
    this.arguments = args;
  }
}

export class PrincipalQueryChanges implements JmapMethod<PrincipalQueryChangesRequest, PrincipalQueryChangesResponse> {
  readonly methodName = "Principal/queryChanges";
  readonly arguments: PrincipalQueryChangesRequest;

  constructor(args: PrincipalQueryChangesRequest) {
    this.arguments = args;
  }
}

export class PrincipalSet implements JmapMethod<PrincipalSetRequest, JmapSetResponse> {
  readonly methodName = "Principal/set";
  readonly arguments: PrincipalSetRequest;

  constructor(args: PrincipalSetRequest) {
    this.arguments = args;
  }
}

export class ShareNotificationGet implements JmapMethod<ShareNotificationGetRequest, ShareNotificationGetResponse> {
  readonly methodName = "ShareNotification/get";
  readonly arguments: ShareNotificationGetRequest;

  constructor(args: ShareNotificationGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): ShareNotificationGet {
    return new ShareNotificationGet({ accountId: accountId.value, ids: null });
  }

  static byQueryResult(accountId: AccountId, queryCallId: CallId): ShareNotificationGet {
    return new ShareNotificationGet({
      accountId: accountId.value,
      "#ids": resultOf(queryCallId, "ShareNotification/query", "/ids"),
    });
  }
}

export class ShareNotificationChanges
  implements JmapMethod<ShareNotificationChangesRequest, ShareNotificationChangesResponse>
{
  readonly methodName = "ShareNotification/changes";
  readonly arguments: ShareNotificationChangesRequest;

  constructor(args: ShareNotificationChangesRequest) {
    this.arguments = args;
  }
}

export class ShareNotificationSet implements JmapMethod<ShareNotificationSetRequest, JmapSetResponse> {
  readonly methodName = "ShareNotification/set";
  readonly arguments: ShareNotificationSetRequest;

  constructor(args: ShareNotificationSetRequest) {
    this.arguments = args;
  }
}

export class ShareNotificationQuery implements JmapMethod<ShareNotificationQueryRequest, ShareNotificationQueryResponse> {
  readonly methodName = "ShareNotification/query";
  readonly arguments: ShareNotificationQueryRequest;

  constructor(args: ShareNotificationQueryRequest) {
    this.arguments = args;
  }
}

export class ShareNotificationQueryChanges
  implements JmapMethod<ShareNotificationQueryChangesRequest, ShareNotificationQueryChangesResponse>
{
  readonly methodName = "ShareNotification/queryChanges";
  readonly arguments: ShareNotificationQueryChangesRequest;

  constructor(args: ShareNotificationQueryChangesRequest) {
    this.arguments = args;
  }
}
