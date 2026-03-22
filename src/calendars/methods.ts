import type { JmapMethod } from "../core/method";
import { AccountId, CallId } from "../core/ids";
import type {
  CalendarEventGetRequest,
  CalendarEventGetResponse,
  CalendarEventParseRequest,
  CalendarEventParseResponse,
  CalendarEventQueryRequest,
  CalendarEventQueryResponse,
  CalendarEventSetRequest,
  CalendarGetRequest,
  CalendarGetResponse,
  CalendarSetRequest,
  CalendarEventProperty,
} from "./types";

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

export class CalendarSet
  implements JmapMethod<CalendarSetRequest, import("../core/set").JmapSetResponse>
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
      "#ids": {
        resultOf: queryCallId.value,
        name: "CalendarEvent/query",
        path: "/ids",
      },
      properties,
    });
  }
}

export class CalendarEventSet
  implements JmapMethod<CalendarEventSetRequest, import("../core/set").JmapSetResponse>
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
