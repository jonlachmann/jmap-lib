import type { JmapGetResponse } from "../core/get.js";
import type { JmapGetArgs } from "../core/get.js";
import type { JmapPatchObject } from "../core/patch.js";
import type { JmapSetArgs } from "../core/set.js";

export interface SieveScript {
  id: string;
  name: string | null;
  blobId: string;
  isActive: boolean;
}

export type SieveScriptProperty = "id" | "name" | "blobId" | "isActive";

export interface SieveScriptGetRequest extends JmapGetArgs<SieveScriptProperty> {}

export type SieveScriptGetResponse = JmapGetResponse<SieveScript>;

export type SieveScriptMutable = {
  /** RFC 9661 2: the server names a script made without one. */
  name?: string | null;
  blobId?: string;
};

export interface SieveScriptCreate extends SieveScriptMutable {
  blobId: string;
}

export type SieveScriptUpdate = JmapPatchObject<SieveScriptMutable>;

export interface SieveScriptSetRequest extends JmapSetArgs<SieveScriptCreate, SieveScriptUpdate> {
  onSuccessActivateScript?: string | null;
  /** RFC 9661 2.2: deactivate the active script once the rest succeeds. */
  onSuccessDeactivateScript?: boolean;
}

export interface SieveScriptValidateRequest {
  accountId: string;
  blobId: string;
}

export interface SieveScriptValidateResponse {
  accountId?: string;
  error?: {
    description?: string;
    type?: string;
  };
}
