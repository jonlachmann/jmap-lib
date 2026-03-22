import { CallId } from "./ids";
import type { JmapMethod } from "./method";
import { JmapProtocolError, JmapResponse, type RawMethodResponse, type RawJmapResponse } from "./response";

type FetchLike = typeof fetch;
type RawMethodCall = [string, unknown, string];
type JmapMethodResponse<M extends JmapMethod<unknown, unknown>> =
  M extends JmapMethod<unknown, infer Response> ? Response : never;

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
  capabilities: string[];
  fetch?: FetchLike;
};

export class JmapBatch {
  private readonly calls: RawMethodCall[] = [];
  private nextCallId = 0;

  constructor(private readonly sendRequest: (calls: RawMethodCall[]) => Promise<JmapResponse>) {}

  call<Request, Response>(method: JmapMethod<Request, Response>, callId?: CallId): CallId {
    const resolvedCallId = callId ?? CallId.of(String(this.nextCallId++));
    this.calls.push([method.methodName, method.arguments, resolvedCallId.value]);
    return resolvedCallId;
  }

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

  batch(): JmapBatch {
    return new JmapBatch((calls) => this.send(calls));
  }

  async invoke<M extends JmapMethod<unknown, unknown>>(method: M): Promise<JmapMethodResponse<M>> {
    const batch = this.batch();
    const callId = batch.call(method);
    const response = await batch.send();
    return response.get<JmapMethodResponse<M>>(callId, method.methodName);
  }

  private async send(methodCalls: RawMethodCall[]): Promise<JmapResponse> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: this.authorizationHeader,
      },
      body: JSON.stringify({
        using: this.capabilities,
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
