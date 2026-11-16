import type { JmapMethod } from "./method";
import type { JmapMethodError } from "./set";

/** Octets for a blob made in a request (RFC 9404 4.1): text, base64, or a range of a blob the server has. */
export type BlobDataSource =
  | { "data:asText": string }
  | { "data:asBase64": string }
  | { blobId: string; offset?: number | null; length?: number | null };

export interface BlobUploadObject {
  data: BlobDataSource[];
  type?: string | null;
}

export interface BlobUploadRequest {
  accountId: string;
  create: Record<string, BlobUploadObject>;
}

export interface BlobUploadCreated {
  id: string;
  type: string | null;
  size: number;
}

export interface BlobUploadResponse {
  accountId: string;
  created?: Record<string, BlobUploadCreated> | null;
  notCreated?: Record<string, JmapMethodError> | null;
}

/** Makes blobs in a request (RFC 9404 4.1); a later call in it names one as "#creationId". */
export class BlobUpload implements JmapMethod<BlobUploadRequest, BlobUploadResponse> {
  readonly methodName = "Blob/upload";
  readonly arguments: BlobUploadRequest;

  constructor(args: BlobUploadRequest) {
    this.arguments = args;
  }
}
