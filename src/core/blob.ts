import type { JmapMethod } from "./method.js";
import type { JmapSetError } from "./set.js";

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
  notCreated?: Record<string, JmapSetError> | null;
}

/** Makes blobs in a request (RFC 9404 4.1); a later call in it names one as "#creationId". */
export class BlobUpload implements JmapMethod<BlobUploadRequest, BlobUploadResponse> {
  readonly methodName = "Blob/upload";
  readonly arguments: BlobUploadRequest;

  constructor(args: BlobUploadRequest) {
    this.arguments = args;
  }
}

/** RFC 9404 4.2: "data" is the text when the octets are UTF-8, else base64; a digest names an algorithm the
 *  capability's supportedDigestAlgorithms lists, such as "digest:sha" or "digest:sha-256". */
export type BlobProperty = "data" | "data:asText" | "data:asBase64" | "size" | `digest:${string}`;

export interface BlobGetRequest {
  accountId: string;
  ids: readonly string[];
  /** Data and size when not given. */
  properties?: readonly BlobProperty[] | null;
  /** Start this many octets in. */
  offset?: number | null;
  /** At most this many octets; the rest of the blob when not given. */
  length?: number | null;
}

/** A blob's octets in the range asked for (RFC 9404 4.2). */
export interface BlobObject {
  id: string;
  /** Null when the octets aren't valid UTF-8 (isEncodingProblem). */
  "data:asText"?: string | null;
  "data:asBase64"?: string;
  /** The whole blob's size, whatever the range. */
  size?: number;
  isEncodingProblem?: boolean;
  /** The range reached past the blob's end. */
  isTruncated?: boolean;
  [digest: `digest:${string}`]: string;
}

/** RFC 9404 4.2; its example has no state, as a blob doesn't change. */
export interface BlobGetResponse {
  accountId: string;
  state?: string;
  list: BlobObject[];
  notFound: string[];
}

/** Reads blobs' data, size or digests (RFC 9404 4.2). */
export class BlobGet implements JmapMethod<BlobGetRequest, BlobGetResponse> {
  readonly methodName = "Blob/get";
  readonly arguments: BlobGetRequest;

  constructor(args: BlobGetRequest) {
    this.arguments = args;
  }
}
