import { CORE_CALENDARS_CAPABILITIES, CORE_CALENDARS_PARSE_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import type { FilterOperatorCondition } from "../core/query";
import { CREATION_ID, createdOne, getSetError, type JmapCreated, type JmapSetResponse } from "../core/set";
import {
  CalendarChanges,
  CalendarEventChanges,
  CalendarEventGet,
  CalendarEventParse,
  CalendarEventQuery,
  CalendarEventQueryChanges,
  CalendarEventSet,
  CalendarGet,
  ParticipantIdentityGet,
  CalendarSet,
} from "./methods";
import type {
  Calendar,
  CalendarChangesRequest,
  CalendarChangesResponse,
  CalendarEvent,
  CalendarEventChangesRequest,
  CalendarEventChangesResponse,
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
  ParticipantIdentity,
  ParticipantIdentityGetRequest,
  ParticipantIdentityGetResponse,
  CalendarSetRequest,
  CalendarUpdate,
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
  "priority",
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

  /** The addresses the user acts as in the account (draft-ietf-jmap-calendars 3): the owner's for one who acts for them. */
  async listParticipantIdentities(accountId: AccountId): Promise<ParticipantIdentity[]> {
    const response = await this.client.invoke<ParticipantIdentityGetRequest, ParticipantIdentityGetResponse>(
      ParticipantIdentityGet.all(accountId),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );
    return response.list;
  }

  /** The calendars with the state they are at, to sync changes from. */
  async getAll(accountId: AccountId): Promise<CalendarGetResponse> {
    return this.client.invoke<CalendarGetRequest, CalendarGetResponse>(CalendarGet.all(accountId), {
      capabilities: CORE_CALENDARS_CAPABILITIES,
    });
  }

  async getChanges(accountId: AccountId, sinceState: string, options?: { maxChanges?: number }): Promise<CalendarChangesResponse> {
    return this.client.invoke<CalendarChangesRequest, CalendarChangesResponse>(
      new CalendarChanges({ accountId: accountId.value, sinceState, maxChanges: options?.maxChanges }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );
  }

  async getEventChanges(accountId: AccountId, sinceState: string, options?: { maxChanges?: number }): Promise<CalendarEventChangesResponse> {
    return this.client.invoke<CalendarEventChangesRequest, CalendarEventChangesResponse>(
      new CalendarEventChanges({ accountId: accountId.value, sinceState, maxChanges: options?.maxChanges }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );
  }

  /** Events by id with the state they are at; no ids gives the state alone. */
  async getEvents(
    accountId: AccountId,
    ids: readonly string[],
    properties: readonly CalendarEventProperty[] = DEFAULT_CALENDAR_EVENT_PROPERTIES,
  ): Promise<CalendarEventGetResponse> {
    return this.client.invoke<CalendarEventGetRequest, CalendarEventGetResponse>(CalendarEventGet.byIds(accountId, ids, properties), {
      capabilities: CORE_CALENDARS_CAPABILITIES,
    });
  }

  async create(accountId: AccountId, calendar: Partial<Calendar>): Promise<JmapCreated> {
    const response = await this.client.invoke<CalendarSetRequest, JmapSetResponse>(
      new CalendarSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: calendar },
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    return createdOne(response, "calendar");
  }

  async update(accountId: AccountId, calendarId: string, updates: CalendarUpdate): Promise<JmapSetResponse> {
    const response = await this.client.invoke<CalendarSetRequest, JmapSetResponse>(
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

    return response;
  }

  async destroy(accountId: AccountId, calendarId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<CalendarSetRequest, JmapSetResponse>(
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

    return response;
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
    event: Partial<CalendarEvent>,
    sendSchedulingMessages?: boolean,
  ): Promise<JmapCreated> {
    const response = await this.client.invoke<CalendarEventSetRequest, JmapSetResponse>(
      new CalendarEventSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: event },
        sendSchedulingMessages,
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    return createdOne(response, "calendar event");
  }

  async updateEvent(
    accountId: AccountId,
    eventId: string,
    updates: Partial<CalendarEvent>,
    sendSchedulingMessages?: boolean,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<CalendarEventSetRequest, JmapSetResponse>(
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

    return response;
  }

  async destroyEvent(accountId: AccountId, eventId: string, sendSchedulingMessages?: boolean): Promise<JmapSetResponse> {
    const response = await this.client.invoke<CalendarEventSetRequest, JmapSetResponse>(
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

    return response;
  }

  async parse(
    accountId: AccountId,
    blobId: string,
    properties?: readonly CalendarEventProperty[],
  ): Promise<Partial<CalendarEvent>[]> {
    const response = await this.client.invoke<CalendarEventParseRequest, CalendarEventParseResponse>(
      new CalendarEventParse({
        accountId: accountId.value,
        blobIds: [blobId],
        properties,
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
