import { CORE_SIEVE_CAPABILITIES } from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { AccountId } from "../core/ids.js";
import { CREATION_ID, createdOne, assertSetOk, type JmapCreated, type JmapSetResponse } from "../core/set.js";
import { SieveScriptGet, SieveScriptSet, SieveScriptValidate } from "./methods.js";
import type {
  SieveScript,
  SieveScriptCreate,
  SieveScriptGetRequest,
  SieveScriptGetResponse,
  SieveScriptSetRequest,
  SieveScriptValidateRequest,
  SieveScriptValidateResponse,
} from "./types.js";

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
    script: SieveScriptCreate,
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

    assertSetOk(response, "sieve script");

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

    assertSetOk(response, "sieve script");

    return response;
  }

  /** @throws When the server didn't activate it: an unknown id is ignored, not refused (RFC 9661 2.4). */
  async activate(accountId: AccountId, scriptId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<SieveScriptSetRequest, JmapSetResponse>(
      new SieveScriptSet({
        accountId: accountId.value,
        onSuccessActivateScript: scriptId,
      }),
      { capabilities: CORE_SIEVE_CAPABILITIES },
    );

    if (response.updated?.[scriptId]?.isActive !== true) {
      throw new Error(`The server didn't activate the sieve script ${scriptId}`);
    }

    return response;
  }

  async deactivate(accountId: AccountId): Promise<JmapSetResponse> {
    return this.client.invoke<SieveScriptSetRequest, JmapSetResponse>(
      new SieveScriptSet({
        accountId: accountId.value,
        onSuccessDeactivateScript: true,
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
