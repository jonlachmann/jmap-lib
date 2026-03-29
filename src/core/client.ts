import { CallId } from "./ids";
import type { JmapMethod } from "./method";
import { JmapProtocolError, JmapResponse, type RawMethodResponse, type RawJmapResponse } from "./response";

type FetchLike = typeof fetch;
type RawMethodCall = [string, unknown, string];
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

type JmapClientOptions = {
  endpoint: string;
  accessToken?: string;
  authorizationHeader?: string;
  capabilities: readonly string[];
  fetch?: FetchLike;
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

  constructor(options: JmapClientOptions) {
    this.endpoint = options.endpoint;
    this.capabilities = [...options.capabilities];
    this.fetchImpl = options.fetch ?? fetch;
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

  private async send(methodCalls: RawMethodCall[], options?: JmapRequestOptions): Promise<JmapResponse> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: this.authorizationHeader,
      },
      body: JSON.stringify({
        using: options?.capabilities ?? this.capabilities,
        methodCalls,
      }),
    });

    const rawBody = await response.text();

    if (!response.ok) {
      throw new JmapHttpError(response.status, rawBody);
    }

    let parsed: RawJmapResponse;
    try {
      parsed = JSON.parse(rawBody) as RawJmapResponse;
    } catch {
      throw new Error("Invalid JSON response from JMAP endpoint");
    }

    const jmapResponse = new JmapResponse(parsed);

    for (const [methodName, payload, callId] of jmapResponse.allRaw()) {
      if (methodName.endsWith("/error")) {
        throw new JmapProtocolError(`JMAP method error for ${methodName.slice(0, -6)}`, {
          methodName,
          details: payload,
          callId,
        });
      }
    }

    return jmapResponse;
  }
}
