import { paginate } from "../core/paginate.js";
import { CORE_CALENDARS_CAPABILITIES, CORE_CALENDARS_PARSE_CAPABILITIES } from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { AccountId } from "../core/ids.js";
import { inAny, type JmapFilter } from "../core/query.js";
import { CREATION_ID, createdOne, assertSetOk, type JmapCreated, type JmapSetResponse } from "../core/set.js";
import {
  CalendarChanges,
  CalendarEventChanges,
  CalendarEventGet,
  CalendarEventParse,
  CalendarEventQuery,
  CalendarEventQueryChanges,
  CalendarEventSet,
  CalendarGet,
  ParticipantIdentityChanges,
  ParticipantIdentityGet,
  ParticipantIdentitySet,
  CalendarSet,
} from "./methods.js";
import type {
  CalendarCreate,
  CalendarEventCreate,
  CalendarEventUpdate,
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
  CalendarEventQuerySort,
  CalendarEventSetRequest,
  CalendarGetRequest,
  CalendarGetResponse,
  ParticipantIdentity,
  ParticipantIdentityChangesRequest,
  ParticipantIdentityChangesResponse,
  ParticipantIdentityCreate,
  ParticipantIdentityGetRequest,
  ParticipantIdentityGetResponse,
  ParticipantIdentitySetRequest,
  ParticipantIdentityUpdate,
  CalendarSetRequest,
  CalendarUpdate,
} from "./types.js";

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
  "recurrenceRule",
  "recurrenceOverrides",
  "recurrenceId",
  "isOrigin",
] as const satisfies readonly CalendarEventProperty[];

export class JmapCalendars {
  constructor(private readonly client: JmapClient) {}

  /** The addresses the user acts as in the account (draft-ietf-jmap-calendars 3): the owner's for one who acts for them. */
  async listParticipantIdentities(accountId: AccountId): Promise<ParticipantIdentity[]> {
    const response = await this.client.invoke<ParticipantIdentityGetRequest, ParticipantIdentityGetResponse>(
      ParticipantIdentityGet.all(accountId),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );
    return response.list;
  }

  async getParticipantIdentityChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<ParticipantIdentityChangesResponse> {
    return this.client.invoke<ParticipantIdentityChangesRequest, ParticipantIdentityChangesResponse>(
      new ParticipantIdentityChanges({ accountId: accountId.value, sinceState, maxChanges: options?.maxChanges }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );
  }

  /** @param options.isDefault Make it the default once made, if the server allows. */
  async createParticipantIdentity(
    accountId: AccountId,
    identity: ParticipantIdentityCreate,
    options?: { isDefault?: boolean },
  ): Promise<JmapCreated> {
    const response = await this.setParticipantIdentities({
      accountId: accountId.value,
      create: { [CREATION_ID]: identity },
      onSuccessSetIsDefault: options?.isDefault ? `#${CREATION_ID}` : undefined,
    });

    return createdOne(response, "participant identity");
  }

  async updateParticipantIdentity(
    accountId: AccountId,
    identityId: string,
    updates: ParticipantIdentityUpdate,
  ): Promise<JmapSetResponse> {
    return this.setParticipantIdentities({ accountId: accountId.value, update: { [identityId]: updates } });
  }

  async destroyParticipantIdentity(accountId: AccountId, identityId: string): Promise<JmapSetResponse> {
    return this.setParticipantIdentities({ accountId: accountId.value, destroy: [identityId] });
  }

  /** Make the identity the default; a server not allowing it keeps the default it has, with no error. */
  async setDefaultParticipantIdentity(accountId: AccountId, identityId: string): Promise<JmapSetResponse> {
    return this.setParticipantIdentities({ accountId: accountId.value, onSuccessSetIsDefault: identityId });
  }

  private async setParticipantIdentities(args: ParticipantIdentitySetRequest): Promise<JmapSetResponse> {
    const response = await this.client.invoke<ParticipantIdentitySetRequest, JmapSetResponse>(
      new ParticipantIdentitySet(args),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );
    assertSetOk(response, "participant identity");
    return response;
  }

  /** The calendars with the state they are at, to sync changes from. */
  async getCalendars(accountId: AccountId): Promise<CalendarGetResponse> {
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

  async create(accountId: AccountId, calendar: CalendarCreate): Promise<JmapCreated> {
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

    assertSetOk(response, "calendar");

    return response;
  }

  /**
   * Destroy a calendar.
   *
   * @param accountId The account the calendar is in.
   * @param calendarId The calendar to destroy.
   * @param removeEvents Destroy its events with it; without, a calendar holding any is refused.
   */
  async destroy(accountId: AccountId, calendarId: string, removeEvents = false): Promise<JmapSetResponse> {
    const response = await this.client.invoke<CalendarSetRequest, JmapSetResponse>(
      new CalendarSet({
        accountId: accountId.value,
        destroy: [calendarId],
        onDestroyRemoveEvents: removeEvents,
      }),
      { capabilities: CORE_CALENDARS_CAPABILITIES },
    );

    assertSetOk(response, "calendar");

    return response;
  }

  async listEvents(
    accountId: AccountId,
    calendarIds?: readonly string[],
    properties: readonly CalendarEventProperty[] = DEFAULT_CALENDAR_EVENT_PROPERTIES,
  ): Promise<CalendarEvent[]> {
    // inAny gives no filter for no ids, which would list every one
    if (calendarIds?.length === 0) return [];
    return paginate<CalendarEvent>(
      this.client,
      CORE_CALENDARS_CAPABILITIES,
      (position, limit) => new CalendarEventQuery({
        accountId: accountId.value,
        filter: inAny("inCalendar", calendarIds),
        position,
        limit,
      }),
      (queryCallId) => CalendarEventGet.byQueryResult(accountId, queryCallId, properties),
    );
  }

  /** The instances in [after, before) of every event, recurring ones expanded, by start. */
  async listEventInstances(
    accountId: AccountId,
    after: string,
    before: string,
    properties: readonly CalendarEventProperty[] = DEFAULT_CALENDAR_EVENT_PROPERTIES,
  ): Promise<CalendarEvent[]> {
    return paginate<CalendarEvent>(
      this.client,
      CORE_CALENDARS_CAPABILITIES,
      (position, limit) => new CalendarEventQuery({
        accountId: accountId.value,
        filter: { after, before },
        expandRecurrences: true,
        sort: [{ property: "start" }],
        position,
        limit,
      }),
      (queryCallId) => CalendarEventGet.byQueryResult(accountId, queryCallId, [...properties, "baseEventId"]),
    );
  }

  async queryEvents(
    accountId: AccountId,
    filter: JmapFilter<CalendarEventFilter>,
    options?: {
      sort?: readonly { property: string; isAscending: boolean }[];
      limit?: number;
      /** The zone the filter's after and before are read in. */
      timeZone?: string;
      properties?: readonly CalendarEventProperty[];
    },
  ): Promise<CalendarEvent[]> {
    const batch = this.client.batch({ capabilities: CORE_CALENDARS_CAPABILITIES });
    const queryCallId = batch.call(new CalendarEventQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort,
      limit: options?.limit ?? 100,
      timeZone: options?.timeZone,
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
      filter?: JmapFilter<CalendarEventFilter>;
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
    event: CalendarEventCreate,
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
    updates: CalendarEventUpdate,
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

    assertSetOk(response, "calendar event");

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

    assertSetOk(response, "calendar event");

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
