import { CallId } from "./ids";

export type RawMethodResponse = [string, unknown, string];
export type RawJmapResponse = {
  methodResponses?: RawMethodResponse[];
};

export class JmapProtocolError extends Error {
  readonly methodName: string;
  readonly details: unknown;
  readonly callId?: string;

  constructor(message: string, options: { methodName: string; details: unknown; callId?: string }) {
    super(message);
    this.name = "JmapProtocolError";
    this.methodName = options.methodName;
    this.details = options.details;
    this.callId = options.callId;
  }
}

export class JmapResponse {
  private readonly methodResponses: RawMethodResponse[];

  constructor(raw: RawJmapResponse) {
    this.methodResponses = raw.methodResponses ?? [];
  }

  get<T>(callId: CallId, methodName: string): T {
    const match = this.methodResponses.find(
      ([name, _arguments, rawCallId]) => rawCallId === callId.value,
    );

    if (!match) {
      throw new Error(`Missing JMAP response for callId "${callId.value}"`);
    }

    return this.unwrap<T>(match, methodName);
  }

  first<T>(methodName: string): T {
    const match = this.methodResponses.find(([name]) => name === methodName || name === `${methodName}/error`);

    if (!match) {
      throw new Error(`Missing JMAP response for method "${methodName}"`);
    }

    return this.unwrap<T>(match, methodName);
  }

  allRaw(): RawMethodResponse[] {
    return [...this.methodResponses];
  }

  private unwrap<T>(response: RawMethodResponse, expectedMethodName: string): T {
    const [methodName, payload, callId] = response;

    if (methodName === `${expectedMethodName}/error`) {
      throw new JmapProtocolError(`JMAP method error for ${expectedMethodName}`, {
        methodName,
        details: payload,
        callId,
      });
    }

    if (methodName !== expectedMethodName) {
      throw new Error(`Expected JMAP method "${expectedMethodName}" but received "${methodName}"`);
    }

    return payload as T;
  }
}
