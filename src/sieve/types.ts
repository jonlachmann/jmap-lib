export interface SieveScript {
  id: string;
  name: string;
  blobId: string;
  isActive: boolean;
}

export interface SieveScriptGetRequest {
  accountId: string;
}

export interface SieveScriptGetResponse {
  accountId: string;
  state?: string;
  list: SieveScript[];
}

export interface SieveScriptSetRequest {
  accountId: string;
  create?: Record<string, { name: string; blobId: string }>;
  update?: Record<string, { blobId: string }>;
  destroy?: readonly string[];
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
