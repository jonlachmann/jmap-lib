import type { JmapGetArgs } from "../core/get";
import type { JmapSetArgs } from "../core/set";

export interface SieveScript {
  id: string;
  name: string;
  blobId: string;
  isActive: boolean;
}

export type SieveScriptProperty = "id" | "name" | "blobId" | "isActive";

export interface SieveScriptGetRequest extends JmapGetArgs<SieveScriptProperty> {}

export interface SieveScriptGetResponse {
  accountId: string;
  state?: string;
  list: SieveScript[];
}

export interface SieveScriptSetRequest extends JmapSetArgs<
  { name: string; blobId: string },
  { blobId: string }
> {
  onSuccessActivateScript?: string | null;
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
