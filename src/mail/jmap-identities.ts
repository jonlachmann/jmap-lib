import {
  CORE_MAIL_SUBMISSION_CAPABILITIES,
} from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { CREATION_ID, createdOne, assertSetOk, type JmapCreated, type JmapSetResponse } from "../core/set.js";
import { AccountId } from "../core/ids.js";
import { IdentityChanges, IdentityGet, IdentitySet } from "./methods.js";
import type {
  Identity,
  IdentityCreate,
  IdentityUpdate,
  IdentityChangesRequest,
  IdentityChangesResponse,
  IdentityGetRequest,
  IdentityGetResponse,
  IdentitySetRequest,
} from "./types.js";

export class JmapIdentities {
  constructor(private readonly client: JmapClient) {}

  async list(accountId: AccountId): Promise<Identity[]> {
    const response = await this.client.invoke<IdentityGetRequest, IdentityGetResponse>(IdentityGet.all(accountId), {
      capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES,
    });
    return response.list;
  }

  async changes(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<IdentityChangesResponse> {
    return this.client.invoke<IdentityChangesRequest, IdentityChangesResponse>(
      new IdentityChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );
  }

  async create(accountId: AccountId, identity: IdentityCreate): Promise<JmapCreated> {
    const response = await this.client.invoke<IdentitySetRequest, JmapSetResponse>(
      new IdentitySet({
        accountId: accountId.value,
        create: { [CREATION_ID]: identity },
      }),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );

    return createdOne(response, "identity");
  }

  async update(accountId: AccountId, identityId: string, updates: IdentityUpdate): Promise<JmapSetResponse> {
    const response = await this.client.invoke<IdentitySetRequest, JmapSetResponse>(
      new IdentitySet({
        accountId: accountId.value,
        update: { [identityId]: updates },
      }),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );

    assertSetOk(response, "identity");

    return response;
  }

  async destroy(accountId: AccountId, identityId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<IdentitySetRequest, JmapSetResponse>(
      new IdentitySet({
        accountId: accountId.value,
        destroy: [identityId],
      }),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );

    assertSetOk(response, "identity");

    return response;
  }
}
