import { CORE_CALENDARS_CAPABILITIES, CORE_CALENDARS_PARSE_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import type { FilterOperatorCondition } from "../core/query";
import { getSetError } from "../core/set";
import {
  CalendarEventGet,
  CalendarEventParse,
  CalendarEventQuery,
  CalendarEventQueryChanges,
  CalendarEventSet,
  CalendarGet,
  CalendarSet,
} from "./methods";
import type {
  Calendar,
  CalendarEvent,
  CalendarEventFilter,
  CalendarEventGetRequest,
  CalendarEventGetResponse,
  CalendarEventParseRequest,
  CalendarEventParseResponse,
  CalendarEventProperty,
  CalendarEventQueryChangesRequest,
  CalendarEventQueryChangesResponse,
  CalendarEventQueryRequest,
  CalendarEventQueryResponse,
  CalendarEventQuerySort,
  CalendarEventSetRequest,
  CalendarGetRequest,
  CalendarGetResponse,
  CalendarSetRequest,
} from "./types";

export const DEFAULT_CALENDAR_EVENT_PROPERTIES = [
  "id",
  "uid",
  "calendarIds",
  "title",
  "description",
  "descriptionContentType",
  "start",
  "duration",
  "timeZone",
  "showWithoutTime",
  "status",
  "freeBusyStatus",
  "privacy",
  "color",
  "keywords",
  "locations",
  "virtualLocations",
  "links",
  "participants",
  "organizerCalendarAddress",
  "alerts",
  "recurrenceRules",
  "excludedRecurrenceRules",
  "recurrenceOverrides",
  "recurrenceId",
  "isOrigin",
] as const satisfies readonly CalendarEventProperty[];

export class JmapCalendars {
  constructor(private readonly client: JmapClient) {}

  async list(accountId: AccountId): Promise<Calendar[]> {
    const response = await this.client.invoke<CalendarGetRequest, CalendarGetResponse>(CalendarGet.all(accountId), {
      capabilities: CORE_CALENDARS_CAPABILITIES,
    });
    return response.list;
  }

  async create(accountId: AccountId, clientId: string, calendar: Partial<Calendar>): Promise<string> {
    const response = await this.client.invoke<CalendarSetRequest, import("../core/set").JmapSetResponse>(
      new CalendarSet({
        accountId: accountId.value,
        create: { [clientId]: calendar },
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create calendar");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("Calendar/set did not return an id");
    }

    return createdId;
  }

  async update(accountId: AccountId, calendarId: string, updates: Partial<Calendar>): Promise<void> {
    const response = await this.client.invoke<CalendarSetRequest, import("../core/set").JmapSetResponse>(
      new CalendarSet({
        accountId: accountId.value,
        update: { [calendarId]: updates },
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", calendarId);
    if (error) {
      throw new Error(error.description || "Failed to update calendar");
    }
  }

  async destroy(accountId: AccountId, calendarId: string): Promise<void> {
    const response = await this.client.invoke<CalendarSetRequest, import("../core/set").JmapSetResponse>(
      new CalendarSet({
        accountId: accountId.value,
        destroy: [calendarId],
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", calendarId);
    if (error) {
      throw new Error(error.description || "Failed to delete calendar");
    }
  }

  async listEvents(
    accountId: AccountId,
    calendarIds?: readonly string[],
    properties: readonly CalendarEventProperty[] = DEFAULT_CALENDAR_EVENT_PROPERTIES,
  ): Promise<CalendarEvent[]> {
    const PAGE_SIZE = 256;
    const allEvents: CalendarEvent[] = [];
    let position = 0;

    for (;;) {
      const batch = this.client.batch({ capabilities: CORE_CALENDARS_CAPABILITIES });
      const queryCallId = batch.call(new CalendarEventQuery({
        accountId: accountId.value,
        filter: calendarIds?.length ? { inCalendars: [...calendarIds] } : undefined,
        limit: PAGE_SIZE,
        position,
        calculateTotal: true,
      }));
      const getCallId = batch.call(CalendarEventGet.byQueryResult(accountId, queryCallId, properties));
      const response = await batch.send();

      const queryResult = response.get<CalendarEventQueryResponse>(queryCallId, "CalendarEvent/query");
      const events = response.get<CalendarEventGetResponse>(getCallId, "CalendarEvent/get").list;
      allEvents.push(...events);

      const total = queryResult.total ?? events.length;
      position += events.length;
      if (position >= total || events.length < PAGE_SIZE) break;
    }

    return allEvents;
  }

  /** The instances in [after, before) of every event, recurring ones expanded, by start. */
  async listEventInstances(
    accountId: AccountId,
    after: string,
    before: string,
    properties: readonly CalendarEventProperty[] = DEFAULT_CALENDAR_EVENT_PROPERTIES,
  ): Promise<CalendarEvent[]> {
    const PAGE_SIZE = 256;
    const instances: CalendarEvent[] = [];
    let position = 0;

    for (;;) {
      const batch = this.client.batch({ capabilities: CORE_CALENDARS_CAPABILITIES });
      const queryCallId = batch.call(new CalendarEventQuery({
        accountId: accountId.value,
        filter: { after, before },
        expandRecurrences: true,
        limit: PAGE_SIZE,
        position,
        calculateTotal: true,
      }));
      const getCallId = batch.call(CalendarEventGet.byQueryResult(accountId, queryCallId, [...properties, "baseEventId"]));
      const response = await batch.send();

      const queryResult = response.get<CalendarEventQueryResponse>(queryCallId, "CalendarEvent/query");
      const events = response.get<CalendarEventGetResponse>(getCallId, "CalendarEvent/get").list;
      instances.push(...events);

      const total = queryResult.total ?? events.length;
      position += events.length;
      if (position >= total || events.length < PAGE_SIZE) break;
    }

    return instances;
  }

  async queryEvents(
    accountId: AccountId,
    filter: FilterOperatorCondition<CalendarEventFilter>,
    options?: {
      sort?: readonly { property: string; isAscending: boolean }[];
      limit?: number;
      properties?: readonly CalendarEventProperty[];
    },
  ): Promise<CalendarEvent[]> {
    const batch = this.client.batch({ capabilities: CORE_CALENDARS_CAPABILITIES });
    const queryCallId = batch.call(new CalendarEventQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort,
      limit: options?.limit ?? 100,
    } satisfies CalendarEventQueryRequest));
    const getCallId = batch.call(
      CalendarEventGet.byQueryResult(accountId, queryCallId, options?.properties ?? DEFAULT_CALENDAR_EVENT_PROPERTIES),
    );
    const response = await batch.send();
    return response.get<CalendarEventGetResponse>(getCallId, "CalendarEvent/get").list;
  }

  async queryEventChanges(
    accountId: AccountId,
    options: {
      filter?: FilterOperatorCondition<CalendarEventFilter>;
      sort?: readonly CalendarEventQuerySort[];
      sinceQueryState: string;
      maxChanges?: number;
      upToId?: string;
      calculateTotal?: boolean;
    },
  ): Promise<CalendarEventQueryChangesResponse> {
    return this.client.invoke<CalendarEventQueryChangesRequest, CalendarEventQueryChangesResponse>(
      new CalendarEventQueryChanges({
        accountId: accountId.value,
        filter: options.filter,
        sort: options.sort,
        sinceQueryState: options.sinceQueryState,
        maxChanges: options.maxChanges,
        upToId: options.upToId,
        calculateTotal: options.calculateTotal,
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );
  }

  async getEvent(
    accountId: AccountId,
    eventId: string,
    properties: readonly CalendarEventProperty[] = DEFAULT_CALENDAR_EVENT_PROPERTIES,
  ): Promise<CalendarEvent | undefined> {
    const response = await this.client.invoke<CalendarEventGetRequest, CalendarEventGetResponse>(CalendarEventGet.byIds(accountId, [eventId], properties), {
      capabilities: CORE_CALENDARS_CAPABILITIES,
    });
    return response.list[0];
  }

  async createEvent(
    accountId: AccountId,
    clientId: string,
    event: Partial<CalendarEvent>,
    sendSchedulingMessages?: boolean,
  ): Promise<string> {
    const response = await this.client.invoke<CalendarEventSetRequest, import("../core/set").JmapSetResponse>(
      new CalendarEventSet({
        accountId: accountId.value,
        create: { [clientId]: event },
        sendSchedulingMessages,
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create calendar event");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("CalendarEvent/set did not return an id");
    }

    return createdId;
  }

  async updateEvent(
    accountId: AccountId,
    eventId: string,
    updates: Partial<CalendarEvent>,
    sendSchedulingMessages?: boolean,
  ): Promise<void> {
    const response = await this.client.invoke<CalendarEventSetRequest, import("../core/set").JmapSetResponse>(
      new CalendarEventSet({
        accountId: accountId.value,
        update: { [eventId]: updates },
        sendSchedulingMessages,
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", eventId);
    if (error) {
      throw new Error(error.description || "Failed to update calendar event");
    }
  }

  async destroyEvent(accountId: AccountId, eventId: string, sendSchedulingMessages?: boolean): Promise<void> {
    const response = await this.client.invoke<CalendarEventSetRequest, import("../core/set").JmapSetResponse>(
      new CalendarEventSet({
        accountId: accountId.value,
        destroy: [eventId],
        sendSchedulingMessages,
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", eventId);
    if (error) {
      throw new Error(error.description || "Failed to delete calendar event");
    }
  }

  async parse(accountId: AccountId, blobId: string): Promise<Partial<CalendarEvent>[]> {
    const response = await this.client.invoke<CalendarEventParseRequest, CalendarEventParseResponse>(
      new CalendarEventParse({
        accountId: accountId.value,
        blobIds: [blobId],
      }),
      { capabilities: CORE_CALENDARS_PARSE_CAPABILITIES },
    );

    if (response.notParsable?.includes(blobId)) {
      throw new Error("CalendarEvent/parse reported notParsable");
    }

    if (response.notFound?.includes(blobId)) {
      throw new Error("CalendarEvent/parse reported notFound");
    }

    const parsed = response.parsed?.[blobId];
    if (!parsed) {
      return [];
    }

    return Array.isArray(parsed) ? parsed : [parsed];
  }
}
