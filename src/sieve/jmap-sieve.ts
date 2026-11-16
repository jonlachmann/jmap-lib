import { CORE_SIEVE_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import { CREATION_ID, createdOne, getSetError, type JmapCreated, type JmapSetResponse } from "../core/set";
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
    script: { name: string; blobId: string },
    activate = false,
  ): Promise<JmapCreated> {
    const response = await this.client.invoke<SieveScriptSetRequest, JmapSetResponse>(
      new SieveScriptSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: script },
        onSuccessActivateScript: activate ? `#${CREATION_ID}` : undefined,
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );

    return createdOne(response, "sieve script");
  }

  async update(accountId: AccountId, scriptId: string, blobId: string, activate = false): Promise<JmapSetResponse> {
    const response = await this.client.invoke<SieveScriptSetRequest, JmapSetResponse>(
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

    return response;
  }

  async destroy(accountId: AccountId, scriptId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<SieveScriptSetRequest, JmapSetResponse>(
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

    return response;
  }

  async activate(accountId: AccountId, scriptId: string): Promise<JmapSetResponse> {
    return this.client.invoke<SieveScriptSetRequest, JmapSetResponse>(
      new SieveScriptSet({
        accountId: accountId.value,
        onSuccessActivateScript: scriptId,
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );
  }

  async deactivate(accountId: AccountId): Promise<JmapSetResponse> {
    return this.client.invoke<SieveScriptSetRequest, JmapSetResponse>(
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
