import type { JmapMethod } from "./method.js";

export interface CoreEchoRequest {
  [key: string]: unknown;
}

export interface CoreEchoResponse {
  [key: string]: unknown;
}

export class CoreEcho implements JmapMethod<CoreEchoRequest, CoreEchoResponse> {
  readonly methodName = "Core/echo";
  readonly arguments: CoreEchoRequest;

  constructor(args: CoreEchoRequest) {
    this.arguments = args;
  }
}
