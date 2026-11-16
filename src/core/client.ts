import { CallId } from "./ids";
import type { JmapMethod } from "./method";
import { JmapProtocolError, JmapResponse, type RawJmapResponse } from "./response";

type FetchLike = typeof fetch;
export type RawMethodCall = [string, unknown, string];
type JmapRequestOptions = {
  capabilities?: readonly string[];
};

export class JmapHttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`JMAP HTTP error ${status}`);
    this.name = "JmapHttpError";
    this.status = status;
    this.body = body;
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

type JmapClientOptions = {
  endpoint: string;
  accessToken?: string;
  authorizationHeader?: string;
  capabilities: readonly string[];
  fetch?: FetchLike;
  onResponse?: JmapResponseObserver;
};

export class JmapBatch {
  private readonly calls: RawMethodCall[] = [];
  private nextCallId = 0;

  constructor(private readonly sendRequest: (calls: RawMethodCall[]) => Promise<JmapResponse>) {}

  /**
   * Adds a typed JMAP method call to this batch.
   *
   * @param method The method object to enqueue.
   * @param callId An optional explicit call id. When omitted, one is generated automatically.
   * @returns The call id that will identify this method in the batch response.
   */
  call<Request, Response>(method: JmapMethod<Request, Response>, callId?: CallId): CallId {
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
    return this.sendRequest([...this.calls]);
  }
}

export class JmapClient {
  private readonly endpoint: string;
  private readonly authorizationHeader: string;
  private readonly capabilities: string[];
  private readonly fetchImpl: FetchLike;
  private readonly onResponse?: JmapResponseObserver;

  constructor(options: JmapClientOptions) {
    this.endpoint = options.endpoint;
    this.onResponse = options.onResponse;
    this.capabilities = [...options.capabilities];
    this.fetchImpl = options.fetch ?? fetch.bind(globalThis);
    this.authorizationHeader = options.authorizationHeader ?? (
      options.accessToken ? `Bearer ${options.accessToken}` : ""
    );

    if (!this.authorizationHeader) {
      throw new Error("JmapClient requires either accessToken or authorizationHeader");
    }
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
    return new JmapBatch((calls) => this.send(calls, options));
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
    let response: globalThis.Response;
    let rawBody: string;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: this.authorizationHeader,
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
    await this.onResponse?.(methodCalls, parsed);
    return parsed;
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
