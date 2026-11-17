import { CORE_PRINCIPALS_AVAILABILITY_CAPABILITIES, CORE_PRINCIPALS_CAPABILITIES } from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { AccountId } from "../core/ids.js";
import type { JmapFilter } from "../core/query.js";
import { assertSetOk, type JmapSetResponse } from "../core/set.js";
import {
  PrincipalChanges,
  PrincipalGet,
  PrincipalGetAvailability,
  PrincipalQuery,
  PrincipalQueryChanges,
  PrincipalSet,
  ShareNotificationChanges,
  ShareNotificationGet,
  ShareNotificationQuery,
  ShareNotificationSet,
} from "./methods.js";
import type {
  PrincipalChangesRequest,
  PrincipalChangesResponse,
  PrincipalQueryChangesRequest,
  PrincipalQueryChangesResponse,
  PrincipalSetRequest,
  PrincipalUpdate,
  ShareNotification,
  ShareNotificationChangesRequest,
  ShareNotificationChangesResponse,
  ShareNotificationFilterCondition,
  ShareNotificationGetRequest,
  ShareNotificationGetResponse,
  ShareNotificationSetRequest,
  ShareNotificationSort,
  BusyPeriod,
  Principal,
  PrincipalFilter,
  PrincipalGetAvailabilityRequest,
  PrincipalGetAvailabilityResponse,
  PrincipalGetRequest,
  PrincipalGetResponse,
  PrincipalQueryRequest,
  PrincipalQueryResponse,
} from "./types.js";

/** RFC 9670 principals: whom data can be shared with. */
export class JmapPrincipals {
  constructor(private readonly client: JmapClient) {}

  /** Every principal the account holds. */
  async list(accountId: AccountId): Promise<Principal[]> {
    const response = await this.client.invoke<PrincipalGetRequest, PrincipalGetResponse>(PrincipalGet.all(accountId), {
      capabilities: CORE_PRINCIPALS_CAPABILITIES,
    });
    return response.list;
  }

  /** When the principal is busy from utcStart until utcEnd, as far as the user may see it; with showDetails, the events
   *  the user may read, with the eventProperties asked for. */
  async getAvailability(
    accountId: AccountId,
    principalId: string,
    utcStart: string,
    utcEnd: string,
    options?: { showDetails?: boolean; eventProperties?: string[] },
  ): Promise<BusyPeriod[]> {
    const response = await this.client.invoke<PrincipalGetAvailabilityRequest, PrincipalGetAvailabilityResponse>(
      new PrincipalGetAvailability({ accountId: accountId.value, id: principalId, utcStart, utcEnd, ...options }),
      { capabilities: CORE_PRINCIPALS_AVAILABILITY_CAPABILITIES },
    );
    return response.list;
  }

  /** The ids of the principals the filter matches. */
  async query(accountId: AccountId, filter?: PrincipalFilter, options?: { limit?: number }): Promise<PrincipalQueryResponse> {
    return this.client.invoke<PrincipalQueryRequest, PrincipalQueryResponse>(
      new PrincipalQuery({ accountId: accountId.value, filter, limit: options?.limit }),
      { capabilities: CORE_PRINCIPALS_CAPABILITIES },
    );
  }

  /** What changed in the principals since the state; a server backed by a directory may refuse (cannotCalculateChanges). */
  async getChanges(accountId: AccountId, sinceState: string, options?: { maxChanges?: number }): Promise<PrincipalChangesResponse> {
    return this.client.invoke<PrincipalChangesRequest, PrincipalChangesResponse>(
      new PrincipalChanges({ accountId: accountId.value, sinceState, maxChanges: options?.maxChanges }),
      { capabilities: CORE_PRINCIPALS_CAPABILITIES },
    );
  }

  /** How a query's ids changed since its queryState (RFC 9670 2.5). */
  async queryChanges(
    accountId: AccountId,
    sinceQueryState: string,
    filter?: PrincipalFilter,
    options?: { maxChanges?: number; upToId?: string; calculateTotal?: boolean },
  ): Promise<PrincipalQueryChangesResponse> {
    return this.client.invoke<PrincipalQueryChangesRequest, PrincipalQueryChangesResponse>(
      new PrincipalQueryChanges({ accountId: accountId.value, sinceQueryState, filter, ...options }),
      { capabilities: CORE_PRINCIPALS_CAPABILITIES },
    );
  }

  /** Change a principal (RFC 9670 2.3), as the user's own name, description or timeZone; what the server doesn't allow
   *  it refuses (forbidden). */
  async update(accountId: AccountId, principalId: string, patch: PrincipalUpdate): Promise<JmapSetResponse> {
    const response = await this.client.invoke<PrincipalSetRequest, JmapSetResponse>(
      new PrincipalSet({ accountId: accountId.value, update: { [principalId]: patch } }),
      { capabilities: CORE_PRINCIPALS_CAPABILITIES },
    );

    assertSetOk(response, "principal");

    return response;
  }

  /** The share notifications the filter matches, newest first, in one request (RFC 9670 3). */
  async listShareNotifications(
    accountId: AccountId,
    filter?: JmapFilter<ShareNotificationFilterCondition>,
    options?: { sort?: readonly ShareNotificationSort[]; limit?: number },
  ): Promise<ShareNotification[]> {
    const batch = this.client.batch({ capabilities: CORE_PRINCIPALS_CAPABILITIES });
    const queryCallId = batch.call(new ShareNotificationQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort ?? [{ property: "created", isAscending: false }],
      limit: options?.limit,
    }));
    const getCallId = batch.call(ShareNotificationGet.byQueryResult(accountId, queryCallId));
    const response = await batch.send();
    return response.get<ShareNotificationGetResponse>(getCallId, "ShareNotification/get").list;
  }

  /** The share notifications with the state they are at, to sync changes from. */
  async getAllShareNotifications(accountId: AccountId): Promise<ShareNotificationGetResponse> {
    return this.client.invoke<ShareNotificationGetRequest, ShareNotificationGetResponse>(
      ShareNotificationGet.all(accountId),
      { capabilities: CORE_PRINCIPALS_CAPABILITIES },
    );
  }

  async getShareNotificationChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<ShareNotificationChangesResponse> {
    return this.client.invoke<ShareNotificationChangesRequest, ShareNotificationChangesResponse>(
      new ShareNotificationChanges({ accountId: accountId.value, sinceState, maxChanges: options?.maxChanges }),
      { capabilities: CORE_PRINCIPALS_CAPABILITIES },
    );
  }

  /** Dismiss share notifications, which destroys them (RFC 9670 3). */
  async dismissShareNotifications(accountId: AccountId, notificationIds: readonly string[]): Promise<JmapSetResponse> {
    const response = await this.client.invoke<ShareNotificationSetRequest, JmapSetResponse>(
      new ShareNotificationSet({ accountId: accountId.value, destroy: notificationIds }),
      { capabilities: CORE_PRINCIPALS_CAPABILITIES },
    );

    assertSetOk(response, "share notification");

    return response;
  }
}
