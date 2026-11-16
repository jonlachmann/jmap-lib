import {
  CORE_MAIL_SUBMISSION_CAPABILITIES,
} from "../core/capabilities";
import { JmapClient } from "../core/client";
import type { JmapChangesResponse } from "../core/changes";
import { CREATION_ID, createdOne, getSetError, type JmapCreated, type JmapSetResponse } from "../core/set";
import { AccountId } from "../core/ids";
import { IdentityChanges, IdentityGet, IdentitySet } from "./methods";
import type {
  Identity,
  IdentityCreate,
  IdentityUpdate,
  IdentityChangesRequest,
  IdentityGetRequest,
  IdentityGetResponse,
  IdentitySetRequest,
} from "./types";

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
  ): Promise<JmapChangesResponse> {
    return this.client.invoke<IdentityChangesRequest, JmapChangesResponse>(
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

    const error = getSetError(response, "notUpdated", identityId);
    if (error) {
      throw new Error(error.description || "Failed to update identity");
    }

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

    const error = getSetError(response, "notDestroyed", identityId);
    if (error) {
      throw new Error(error.description || "Failed to delete identity");
    }

    return response;
  }
}
