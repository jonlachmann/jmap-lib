import {
  CORE_MAIL_SUBMISSION_CAPABILITIES,
} from "../core/capabilities";
import { JmapClient } from "../core/client";
import { getSetError } from "../core/set";
import { AccountId } from "../core/ids";
import { IdentityGet, IdentitySet } from "./methods";
import type { Identity, IdentityGetRequest, IdentityGetResponse, IdentitySetRequest } from "./types";

export class JmapIdentities {
  constructor(private readonly client: JmapClient) {}

  async list(accountId: AccountId): Promise<Identity[]> {
    const response = await this.client.invoke<IdentityGetRequest, IdentityGetResponse>(IdentityGet.all(accountId), {
      capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES,
    });
    return response.list;
  }

  async create(accountId: AccountId, clientId: string, identity: Partial<Identity>): Promise<string> {
    const response = await this.client.invoke<IdentitySetRequest, import("../core/set").JmapSetResponse>(
      new IdentitySet({
        accountId: accountId.value,
        create: { [clientId]: identity },
      }),
      { capabilities: CORE_MAIL_SUBMISSION_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create identity");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("Identity/create did not return an id");
    }

    return createdId;
  }

  async update(accountId: AccountId, identityId: string, updates: Partial<Identity>): Promise<void> {
    const response = await this.client.invoke<IdentitySetRequest, import("../core/set").JmapSetResponse>(
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
  }

  async destroy(accountId: AccountId, identityId: string): Promise<void> {
    const response = await this.client.invoke<IdentitySetRequest, import("../core/set").JmapSetResponse>(
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
  }
}
