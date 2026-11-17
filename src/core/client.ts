import { CallId } from "./ids.js";
import type { JmapMethod } from "./method.js";
import { JmapProtocolError, JmapResponse, type RawJmapResponse } from "./response.js";
import { JMAP_CORE_CAPABILITY } from "./capabilities.js";
import type { AccountId } from "./ids.js";
import { expandUriTemplate, type JmapCoreCapability, type JmapSession } from "./session.js";

type FetchLike = typeof fetch;
export type RawMethodCall = [string, unknown, string];
type JmapRequestOptions = {
  capabilities?: readonly string[];
};

/** The request-level errors of RFC 8620 3.6.1. */
export type JmapRequestErrorType =
  | "urn:ietf:params:jmap:error:unknownCapability"
  | "urn:ietf:params:jmap:error:notJSON"
  | "urn:ietf:params:jmap:error:notRequest"
  | "urn:ietf:params:jmap:error:limit"
  | (string & {});

/** A problem details object (RFC 7807), which a JMAP server answers a refused request with (RFC 8620 3.6.1). */
export interface JmapProblem {
  type: JmapRequestErrorType;
  status?: number;
  title?: string;
  detail?: string;
  /** For a limit error: the session limit the request went over, such as "maxCallsInRequest". */
  limit?: string;
  [key: string]: unknown;
}

export class JmapHttpError extends Error {
  readonly status: number;
  readonly body: string;
  /** The server's problem details, when it gave them. */
  readonly problem?: JmapProblem;
  /** The URL that answered, when it isn't the API's. */
  readonly url?: string;

  constructor(status: number, body: string, url?: string) {
    const problem = parseProblem(body);
    super(problem?.detail ?? problem?.title ?? `JMAP HTTP error ${status}`);
    this.name = "JmapHttpError";
    this.status = status;
    this.body = body;
    this.problem = problem;
    this.url = url;
  }
}

function parseProblem(body: string): JmapProblem | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    const type = (parsed as { type?: unknown } | null)?.type;
    return typeof type === "string" ? parsed as JmapProblem : undefined;
  } catch {
    return undefined;
  }
}

/** What the upload endpoint answers (RFC 8620 6.1). */
export interface JmapUploadResponse {
  accountId: string;
  blobId: string;
  type: string;
  size: number;
}

/** Data larger than the session's maxSizeUpload, refused before it was sent (RFC 8620 2). */
export class JmapUploadTooLargeError extends Error {
  readonly size: number;
  readonly maxSizeUpload: number;

  constructor(size: number, maxSizeUpload: number) {
    super(`The server takes uploads of at most ${maxSizeUpload} octets; this one is ${size}`);
    this.name = "JmapUploadTooLargeError";
    this.size = size;
    this.maxSizeUpload = maxSizeUpload;
  }
}

/** The request got no response: the network is down, or the server can't be reached. */
export class JmapNetworkError extends Error {
  constructor(cause: unknown) {
    super("JMAP request failed to reach the server", { cause });
    this.name = "JmapNetworkError";
  }
}

/**
 * Sees every request's method calls with the response the server gave them, before the caller does, which waits for
 * it: so an application can keep its caches up with what each request did, a write's answer included (RFC 8620 5.3).
 */
export type JmapResponseObserver = (methodCalls: readonly RawMethodCall[], response: RawJmapResponse) => void | Promise<void>;

/**
 * The Authorization header's value ("Bearer …", "Basic …"), or a function giving it before each request, as for a
 * token that expires. A function's null means signed out, and the request is not sent.
 */
export type JmapAuthorization = string | (() => string | null | Promise<string | null>);

/** The Authorization header's value for this request. */
export async function resolveAuthorization(authorization: JmapAuthorization): Promise<string> {
  const value = typeof authorization === "string" ? authorization : await authorization();
  if (!value) throw new Error("No authorization for the JMAP request: signed out");
  return value;
}

type JmapClientOptions = {
  endpoint: string;
  authorization: JmapAuthorization;
  capabilities: readonly string[];
  /** The session, for its limits (RFC 8620 2) and each account's capabilities. */
  session?: JmapSession;
  fetch?: FetchLike;
  onResponse?: JmapResponseObserver;
  /** Hears what onResponse threw, which doesn't keep the response from the caller. Default: console.error. */
  onObserverError?: (error: unknown) => void;
};

export class JmapBatch {
  private readonly calls: RawMethodCall[] = [];
  private nextCallId = 0;
  private sent = false;

  /**
   * @param sendRequest Sends the batch's calls as one request.
   * @param maxCalls The session's maxCallsInRequest.
   */
  constructor(
    private readonly sendRequest: (calls: RawMethodCall[]) => Promise<JmapResponse>,
    private readonly maxCalls = Infinity,
  ) {}

  /**
   * Adds a typed JMAP method call to this batch.
   *
   * @param method The method object to enqueue.
   * @param callId An optional explicit call id. When omitted, one is generated automatically.
   * @returns The call id that will identify this method in the batch response.
   */
  call<Request, Response>(method: JmapMethod<Request, Response>, callId?: CallId): CallId {
    if (this.sent) throw new Error("This JMAP batch was sent; make a new one");
    if (this.calls.length >= this.maxCalls) throw new Error(`The server takes at most ${this.maxCalls} calls in a request`);
    const resolvedCallId = callId ?? CallId.of(String(this.nextCallId++));
    this.calls.push([method.methodName, method.arguments, resolvedCallId.value]);
    return resolvedCallId;
  }

  /**
   * Sends the accumulated method calls as a single JMAP request.
   *
   * @returns A wrapped JMAP response that can be queried by call id or method name.
   */
  async send(): Promise<JmapResponse> {
    if (this.sent) throw new Error("This JMAP batch was sent already");
    this.sent = true;
    return this.sendRequest([...this.calls]);
  }
}

export class JmapClient {
  private readonly endpoint: string;
  private readonly authorization: JmapAuthorization;
  private readonly capabilities: string[];
  /** The session as last read; set it again when the session changes, as when accounts are shared with the user. */
  session?: JmapSession;
  private readonly fetchImpl: FetchLike;
  private readonly onResponse?: JmapResponseObserver;
  private readonly onObserverError: (error: unknown) => void;

  constructor(options: JmapClientOptions) {
    this.endpoint = options.endpoint;
    this.onResponse = options.onResponse;
    this.onObserverError = options.onObserverError ?? ((error) => console.error("JMAP response observer failed", error));
    this.capabilities = [...options.capabilities];
    this.fetchImpl = options.fetch ?? fetch.bind(globalThis);
    this.authorization = options.authorization;
    this.session = options.session;
  }

  /** The session's limits (RFC 8620 2), when the client has the session. */
  get limits(): JmapCoreCapability | undefined {
    return this.session?.capabilities[JMAP_CORE_CAPABILITY];
  }

  /**
   * Whether the account has the capability (RFC 8620 2: accountCapabilities), as for an extension offered for some
   * accounts only. Without the session, or for an account it doesn't list, the client's own capabilities answer.
   */
  accountHasCapability(accountId: string, capability: string): boolean {
    const accountCapabilities = this.session?.accounts?.[accountId]?.accountCapabilities;
    return accountCapabilities ? capability in accountCapabilities : this.capabilities.includes(capability);
  }

  /**
   * Returns the default capabilities that this client will send with requests.
   *
   * @returns A copy of the configured capability list.
   */
  getCapabilities(): readonly string[] {
    return [...this.capabilities];
  }

  /**
   * Checks whether the client is configured to send a given capability.
   *
   * @param capability The capability URI to check.
   * @returns `true` when the capability is present in the client's default capability list.
   */
  hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Creates a new batch for composing one or more typed JMAP method calls.
   *
   * @param options Optional request-level overrides, such as a custom capability list.
   * @returns A batch that can collect method calls and send them together.
   */
  batch(options?: JmapRequestOptions): JmapBatch {
    return new JmapBatch((calls) => this.send(calls, options), this.limits?.maxCallsInRequest);
  }

  /**
   * Sends a single typed JMAP method and returns its typed response payload.
   *
   * This is a convenience wrapper around creating a batch, adding one call, sending it,
   * and extracting the response for that call id.
   *
   * @param method The typed JMAP method to invoke.
   * @param options Optional request-level overrides, such as a custom capability list.
   * @returns The typed response payload for the invoked method.
   */
  async invoke<Request, Response>(
    method: JmapMethod<Request, Response>,
    options?: JmapRequestOptions,
  ): Promise<Response> {
    const batch = this.batch(options);
    const callId = batch.call(method);
    const response = await batch.send();
    return response.get<Response>(callId, method.methodName);
  }

  /**
   * Sends method calls as given and returns the response as the server gave it, a method's error among the others:
   * for a caller that handles each call on its own, such as one sending changes kept while offline.
   *
   * @param options.createdIds Creation ids from requests before it, so a call can name what they created as "#id"
   * (RFC 8620 3.3); the response has them back, with this request's added.
   */
  async sendRaw(
    methodCalls: readonly RawMethodCall[],
    options?: JmapRequestOptions & { createdIds?: Record<string, string> },
  ): Promise<RawJmapResponse> {
    const authorization = await resolveAuthorization(this.authorization);
    let response: globalThis.Response;
    let rawBody: string;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization,
        },
        body: JSON.stringify({
          using: options?.capabilities ?? this.capabilities,
          methodCalls,
          createdIds: options?.createdIds,
        }),
      });
      rawBody = await response.text();
    } catch (error) {
      throw new JmapNetworkError(error);
    }

    if (!response.ok) {
      throw new JmapHttpError(response.status, rawBody);
    }

    let parsed: RawJmapResponse;
    try {
      parsed = JSON.parse(rawBody) as RawJmapResponse;
    } catch {
      throw new Error("Invalid JSON response from JMAP endpoint");
    }
    try {
      await this.onResponse?.(methodCalls, parsed);
    } catch (error) {
      this.onObserverError(error);
    }
    return parsed;
  }

  /**
   * Upload data as a blob to the account (RFC 8620 6.1), for an Email/import, an attachment or a photo to name.
   *
   * @param accountId The account the blob is for.
   * @param data The octets to upload.
   * @param type The media type, sent as the Content-Type.
   * @throws JmapUploadTooLargeError when the data is over the session's maxSizeUpload, without sending it.
   * @throws JmapHttpError when the server refuses the upload.
   */
  async upload(accountId: AccountId, data: Blob | Uint8Array | ArrayBuffer, type: string): Promise<JmapUploadResponse> {
    const session = this.requireSession();
    const size = data instanceof Blob ? data.size : data.byteLength;
    const maxSizeUpload = this.limits?.maxSizeUpload;
    if (maxSizeUpload && size > maxSizeUpload) throw new JmapUploadTooLargeError(size, maxSizeUpload);

    const url = expandUriTemplate(session.uploadUrl, { accountId: accountId.value });
    const body = data instanceof Blob ? data : new Blob([data as BlobPart]);
    const response = await this.fetchBinary(url, {
      method: "POST",
      headers: { "content-type": type, authorization: await resolveAuthorization(this.authorization) },
      body,
    });
    return await response.json() as JmapUploadResponse;
  }

  /** The URL a blob downloads from (RFC 8620 6.2); fetching it needs the Authorization header, as download sends. */
  downloadUrl(accountId: AccountId, blobId: string, name: string, type: string): string {
    return expandUriTemplate(this.requireSession().downloadUrl, { accountId: accountId.value, blobId, name, type });
  }

  /**
   * Download a blob's data (RFC 8620 6.2).
   *
   * @param accountId The account the blob is in.
   * @param blobId The blob to download.
   * @param name The file name the server gives in Content-Disposition.
   * @param type The media type the server answers with.
   * @throws JmapHttpError when the server refuses the download.
   */
  async download(accountId: AccountId, blobId: string, name: string, type: string): Promise<Blob> {
    const response = await this.fetchBinary(this.downloadUrl(accountId, blobId, name, type), {
      method: "GET",
      headers: { authorization: await resolveAuthorization(this.authorization) },
    });
    return await response.blob();
  }

  private requireSession(): JmapSession {
    if (!this.session) throw new Error("The JMAP client has no session, which holds the upload and download URLs");
    return this.session;
  }

  /** Fetch an upload or download URL; a refusal is a JmapHttpError with the server's problem details. */
  private async fetchBinary(url: string, init: RequestInit): Promise<globalThis.Response> {
    let response: globalThis.Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch (error) {
      throw new JmapNetworkError(error);
    }
    if (!response.ok) throw new JmapHttpError(response.status, await response.text(), url);
    return response;
  }

  private async send(methodCalls: RawMethodCall[], options?: JmapRequestOptions): Promise<JmapResponse> {
    const jmapResponse = new JmapResponse(await this.sendRaw(methodCalls, options));

    for (const [methodName, payload, callId] of jmapResponse.allRaw()) {
      if (methodName === "error") {
        throw new JmapProtocolError("JMAP method error", {
          methodName,
          details: payload,
          callId,
        });
      }
    }

    return jmapResponse;
  }
}
