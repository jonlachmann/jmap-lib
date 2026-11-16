import { CallId } from "./ids";

export type RawMethodResponse = [string, unknown, string];
export type RawJmapResponse = {
  methodResponses?: RawMethodResponse[];
  /** The request's creation ids, with those it created added (RFC 8620 3.4); only when the request gave some. */
  createdIds?: Record<string, string>;
  /** The session's state, which moves when the session does, as accounts shared with the user come and go (RFC 8620 3.4). */
  sessionState?: string;
};

/** The method-level errors of RFC 8620 (3.6.2 and section 5). */
export type JmapMethodErrorType =
  | "serverUnavailable"
  | "serverFail"
  | "serverPartialFail"
  | "unknownMethod"
  | "invalidArguments"
  | "invalidResultReference"
  | "forbidden"
  | "accountNotFound"
  | "accountNotSupportedByMethod"
  | "accountReadOnly"
  | "requestTooLarge"
  | "stateMismatch"
  | "cannotCalculateChanges"
  | "tooManyChanges"
  | "anchorNotFound"
  | "unsupportedSort"
  | "unsupportedFilter"
  | "fromAccountNotFound"
  | "fromAccountNotSupportedByMethod"
  | (string & {});

export class JmapProtocolError extends Error {
  readonly methodName: string;
  readonly details: unknown;
  readonly callId?: string;
  readonly type?: JmapMethodErrorType;

  constructor(message: string, options: { methodName: string; details: unknown; callId?: string }) {
    super(message);
    this.name = "JmapProtocolError";
    this.methodName = options.methodName;
    this.details = options.details;
    this.callId = options.callId;
    const type = (options.details as { type?: unknown } | null)?.type;
    this.type = typeof type === "string" ? type : undefined;
  }
}

export class JmapResponse {
  private readonly methodResponses: RawMethodResponse[];

  constructor(raw: RawJmapResponse) {
    this.methodResponses = raw.methodResponses ?? [];
  }

  get<T>(callId: CallId, methodName: string): T {
    const match = this.methodResponses.find(
      ([_name, _arguments, rawCallId]) => rawCallId === callId.value,
    );

    if (!match) {
      throw new Error(`Missing JMAP response for callId "${callId.value}"`);
    }

    return this.unwrap<T>(match, methodName);
  }

  first<T>(methodName: string): T {
    const match = this.methodResponses.find(([name]) => name === methodName || name === "error");

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

    if (methodName === "error") {
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
