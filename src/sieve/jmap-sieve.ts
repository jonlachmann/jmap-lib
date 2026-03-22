import { CORE_SIEVE_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import { getSetError } from "../core/set";
import { SieveScriptGet, SieveScriptSet, SieveScriptValidate } from "./methods";
import type {
  SieveScript,
  SieveScriptGetRequest,
  SieveScriptGetResponse,
  SieveScriptSetRequest,
  SieveScriptValidateRequest,
  SieveScriptValidateResponse,
} from "./types";

export class JmapSieve {
  constructor(private readonly client: JmapClient) {}

  async list(accountId: AccountId): Promise<SieveScript[]> {
    const response = await this.client.invoke<SieveScriptGetRequest, SieveScriptGetResponse>(SieveScriptGet.all(accountId), {
      capabilities: CORE_SIEVE_CAPABILITIES,
    });
    return response.list;
  }

  async create(
    accountId: AccountId,
    clientId: string,
    script: { name: string; blobId: string },
    activate = false,
  ): Promise<string> {
    const response = await this.client.invoke<SieveScriptSetRequest, import("../core/set").JmapSetResponse>(
      new SieveScriptSet({
        accountId: accountId.value,
        create: { [clientId]: script },
        onSuccessActivateScript: activate ? `#${clientId}` : undefined,
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create sieve script");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("SieveScript/set did not return an id");
    }

    return createdId;
  }

  async update(accountId: AccountId, scriptId: string, blobId: string, activate = false): Promise<void> {
    const response = await this.client.invoke<SieveScriptSetRequest, import("../core/set").JmapSetResponse>(
      new SieveScriptSet({
        accountId: accountId.value,
        update: { [scriptId]: { blobId } },
        onSuccessActivateScript: activate ? scriptId : undefined,
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", scriptId);
    if (error) {
      throw new Error(error.description || "Failed to update sieve script");
    }
  }

  async destroy(accountId: AccountId, scriptId: string): Promise<void> {
    const response = await this.client.invoke<SieveScriptSetRequest, import("../core/set").JmapSetResponse>(
      new SieveScriptSet({
        accountId: accountId.value,
        destroy: [scriptId],
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", scriptId);
    if (error) {
      throw new Error(error.description || "Failed to delete sieve script");
    }
  }

  async activate(accountId: AccountId, scriptId: string): Promise<void> {
    await this.client.invoke(
      new SieveScriptSet({
        accountId: accountId.value,
        onSuccessActivateScript: scriptId,
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );
  }

  async deactivate(accountId: AccountId): Promise<void> {
    await this.client.invoke(
      new SieveScriptSet({
        accountId: accountId.value,
        onSuccessActivateScript: null,
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );
  }

  async validate(accountId: AccountId, blobId: string): Promise<{ isValid: boolean; errors?: string[] }> {
    const response = await this.client.invoke<SieveScriptValidateRequest, SieveScriptValidateResponse>(
      new SieveScriptValidate({
        accountId: accountId.value,
        blobId,
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );

    if (response.error) {
      return {
        isValid: false,
        errors: [response.error.description || response.error.type || "Validation failed"],
      };
    }

    return { isValid: true };
  }
}
