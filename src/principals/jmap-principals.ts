import { CORE_PRINCIPALS_AVAILABILITY_CAPABILITIES, CORE_PRINCIPALS_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import { PrincipalGet, PrincipalGetAvailability, PrincipalQuery } from "./methods";
import type {
  BusyPeriod,
  Principal,
  PrincipalFilter,
  PrincipalGetAvailabilityRequest,
  PrincipalGetAvailabilityResponse,
  PrincipalGetRequest,
  PrincipalGetResponse,
  PrincipalQueryRequest,
  PrincipalQueryResponse,
} from "./types";

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
}
