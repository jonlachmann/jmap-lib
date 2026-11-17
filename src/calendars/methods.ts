import { resultOf } from "../core/reference.js";
import type { JmapMethod } from "../core/method.js";
import { AccountId, CallId } from "../core/ids.js";
import type {
  CalendarChangesRequest,
  CalendarChangesResponse,
  CalendarEventChangesRequest,
  CalendarEventChangesResponse,
  CalendarEventGetRequest,
  CalendarEventGetResponse,
  CalendarEventParseRequest,
  CalendarEventParseResponse,
  CalendarEventQueryRequest,
  CalendarEventQueryChangesRequest,
  CalendarEventQueryChangesResponse,
  CalendarEventQueryResponse,
  CalendarEventSetRequest,
  CalendarGetRequest,
  CalendarGetResponse,
  CalendarSetRequest,
  CalendarEventProperty,
  ParticipantIdentityChangesRequest,
  ParticipantIdentityChangesResponse,
  ParticipantIdentityGetRequest,
  ParticipantIdentityGetResponse,
  ParticipantIdentitySetRequest,
} from "./types.js";
import type { JmapSetResponse } from "../core/set.js";

export class CalendarGet implements JmapMethod<CalendarGetRequest, CalendarGetResponse> {
  readonly methodName = "Calendar/get";
  readonly arguments: CalendarGetRequest;

  constructor(args: CalendarGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): CalendarGet {
    return new CalendarGet({ accountId: accountId.value });
  }
}

export class CalendarChanges implements JmapMethod<CalendarChangesRequest, CalendarChangesResponse> {
  readonly methodName = "Calendar/changes";
  readonly arguments: CalendarChangesRequest;

  constructor(args: CalendarChangesRequest) {
    this.arguments = args;
  }
}

export class CalendarEventChanges implements JmapMethod<CalendarEventChangesRequest, CalendarEventChangesResponse> {
  readonly methodName = "CalendarEvent/changes";
  readonly arguments: CalendarEventChangesRequest;

  constructor(args: CalendarEventChangesRequest) {
    this.arguments = args;
  }
}

export class CalendarSet
  implements JmapMethod<CalendarSetRequest, JmapSetResponse>
{
  readonly methodName = "Calendar/set";
  readonly arguments: CalendarSetRequest;

  constructor(args: CalendarSetRequest) {
    this.arguments = args;
  }
}

export class CalendarEventQuery
  implements JmapMethod<CalendarEventQueryRequest, CalendarEventQueryResponse>
{
  readonly methodName = "CalendarEvent/query";
  readonly arguments: CalendarEventQueryRequest;

  constructor(args: CalendarEventQueryRequest) {
    this.arguments = args;
  }
}

export class CalendarEventQueryChanges
  implements JmapMethod<CalendarEventQueryChangesRequest, CalendarEventQueryChangesResponse>
{
  readonly methodName = "CalendarEvent/queryChanges";
  readonly arguments: CalendarEventQueryChangesRequest;

  constructor(args: CalendarEventQueryChangesRequest) {
    this.arguments = args;
  }
}

export class CalendarEventGet
  implements JmapMethod<CalendarEventGetRequest, CalendarEventGetResponse>
{
  readonly methodName = "CalendarEvent/get";
  readonly arguments: CalendarEventGetRequest;

  constructor(args: CalendarEventGetRequest) {
    this.arguments = args;
  }

  static byIds(
    accountId: AccountId,
    ids: readonly string[],
    properties?: readonly CalendarEventProperty[],
  ): CalendarEventGet {
    return new CalendarEventGet({ accountId: accountId.value, ids, properties });
  }

  static byQueryResult(
    accountId: AccountId,
    queryCallId: CallId,
    properties?: readonly CalendarEventProperty[],
  ): CalendarEventGet {
    return new CalendarEventGet({
      accountId: accountId.value,
      "#ids": resultOf(queryCallId, "CalendarEvent/query", "/ids"),
      properties,
    });
  }
}

export class CalendarEventSet
  implements JmapMethod<CalendarEventSetRequest, JmapSetResponse>
{
  readonly methodName = "CalendarEvent/set";
  readonly arguments: CalendarEventSetRequest;

  constructor(args: CalendarEventSetRequest) {
    this.arguments = args;
  }
}

export class CalendarEventParse
  implements JmapMethod<CalendarEventParseRequest, CalendarEventParseResponse>
{
  readonly methodName = "CalendarEvent/parse";
  readonly arguments: CalendarEventParseRequest;

  constructor(args: CalendarEventParseRequest) {
    this.arguments = args;
  }
}

export class ParticipantIdentityGet implements JmapMethod<ParticipantIdentityGetRequest, ParticipantIdentityGetResponse> {
  readonly methodName = "ParticipantIdentity/get";
  readonly arguments: ParticipantIdentityGetRequest;

  constructor(args: ParticipantIdentityGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): ParticipantIdentityGet {
    return new ParticipantIdentityGet({ accountId: accountId.value, ids: null });
  }
}

export class ParticipantIdentityChanges
  implements JmapMethod<ParticipantIdentityChangesRequest, ParticipantIdentityChangesResponse>
{
  readonly methodName = "ParticipantIdentity/changes";
  readonly arguments: ParticipantIdentityChangesRequest;

  constructor(args: ParticipantIdentityChangesRequest) {
    this.arguments = args;
  }
}

export class ParticipantIdentitySet implements JmapMethod<ParticipantIdentitySetRequest, JmapSetResponse> {
  readonly methodName = "ParticipantIdentity/set";
  readonly arguments: ParticipantIdentitySetRequest;

  constructor(args: ParticipantIdentitySetRequest) {
    this.arguments = args;
  }
}
