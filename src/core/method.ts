export interface JmapMethod<Request, Response> {
  readonly methodName: string;
  readonly arguments: Request;
}
