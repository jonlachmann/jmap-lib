import type { JmapMethod } from "../core/method";
import { AccountId, CallId } from "../core/ids";
import type { JmapSetResponse } from "../core/set";
import type {
  NoteBookGetRequest,
  NoteBookGetResponse,
  NoteBookChangesRequest,
  NoteBookChangesResponse,
  NoteBookSetRequest,
  NoteGetRequest,
  NoteGetResponse,
  NoteChangesRequest,
  NoteChangesResponse,
  NoteSetRequest,
  NoteCopyRequest,
  NoteCopyResponse,
  NoteQueryRequest,
  NoteQueryResponse,
  NoteQueryChangesRequest,
  NoteQueryChangesResponse,
  NoteProperty,
} from "./types";

// --- NoteBook methods ---

export class NoteBookGet implements JmapMethod<NoteBookGetRequest, NoteBookGetResponse> {
  readonly methodName = "NoteBook/get";
  readonly arguments: NoteBookGetRequest;

  constructor(args: NoteBookGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): NoteBookGet {
    return new NoteBookGet({ accountId: accountId.value });
  }
}

export class NoteBookChanges implements JmapMethod<NoteBookChangesRequest, NoteBookChangesResponse> {
  readonly methodName = "NoteBook/changes";
  readonly arguments: NoteBookChangesRequest;

  constructor(args: NoteBookChangesRequest) {
    this.arguments = args;
  }
}

export class NoteBookSet implements JmapMethod<NoteBookSetRequest, JmapSetResponse> {
  readonly methodName = "NoteBook/set";
  readonly arguments: NoteBookSetRequest;

  constructor(args: NoteBookSetRequest) {
    this.arguments = args;
  }
}

// --- Note methods ---

export class NoteGet implements JmapMethod<NoteGetRequest, NoteGetResponse> {
  readonly methodName = "Note/get";
  readonly arguments: NoteGetRequest;

  constructor(args: NoteGetRequest) {
    this.arguments = args;
  }

  static byIds(
    accountId: AccountId,
    ids: readonly string[],
    properties?: readonly NoteProperty[],
  ): NoteGet {
    return new NoteGet({ accountId: accountId.value, ids, properties });
  }

  static byQueryResult(
    accountId: AccountId,
    queryCallId: CallId,
    properties?: readonly NoteProperty[],
  ): NoteGet {
    return new NoteGet({
      accountId: accountId.value,
      "#ids": {
        resultOf: queryCallId.value,
        name: "Note/query",
        path: "/ids",
      },
      properties,
    });
  }
}

export class NoteChanges implements JmapMethod<NoteChangesRequest, NoteChangesResponse> {
  readonly methodName = "Note/changes";
  readonly arguments: NoteChangesRequest;

  constructor(args: NoteChangesRequest) {
    this.arguments = args;
  }
}

export class NoteSet implements JmapMethod<NoteSetRequest, JmapSetResponse> {
  readonly methodName = "Note/set";
  readonly arguments: NoteSetRequest;

  constructor(args: NoteSetRequest) {
    this.arguments = args;
  }
}

export class NoteCopy implements JmapMethod<NoteCopyRequest, NoteCopyResponse> {
  readonly methodName = "Note/copy";
  readonly arguments: NoteCopyRequest;

  constructor(args: NoteCopyRequest) {
    this.arguments = args;
  }
}

export class NoteQuery implements JmapMethod<NoteQueryRequest, NoteQueryResponse> {
  readonly methodName = "Note/query";
  readonly arguments: NoteQueryRequest;

  constructor(args: NoteQueryRequest) {
    this.arguments = args;
  }
}

export class NoteQueryChanges
  implements JmapMethod<NoteQueryChangesRequest, NoteQueryChangesResponse>
{
  readonly methodName = "Note/queryChanges";
  readonly arguments: NoteQueryChangesRequest;

  constructor(args: NoteQueryChangesRequest) {
    this.arguments = args;
  }
}
