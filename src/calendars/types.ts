import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes";
import type { JmapGetArgs } from "../core/get";
import type { JmapPatchObject } from "../core/patch";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query";
import type { JmapSetArgs } from "../core/set";

/** draft-ietf-jmap-calendars 4: what a user may do with a calendar. */
export interface CalendarRights {
  mayReadFreeBusy: boolean;
  mayReadItems: boolean;
  mayWriteAll: boolean;
  mayWriteOwn: boolean;
  mayUpdatePrivate: boolean;
  mayRSVP: boolean;
  mayShare: boolean;
  mayDelete: boolean;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
  isSubscribed?: boolean;
  isVisible?: boolean;
  isDefault?: boolean;
  /** Which of its events count toward its owner's availability (draft-ietf-jmap-calendars 4). */
  includeInAvailability?: "all" | "attending" | "none";
  timeZone?: string | null;
  /** RFC 9670 4: the principals it is shared with and their rights; null when with no one. */
  shareWith?: Record<string, Partial<CalendarRights>> | null;
  myRights?: CalendarRights;
}

export type CalendarProperty =
  | "id"
  | "name"
  | "description"
  | "color"
  | "sortOrder"
  | "isSubscribed"
  | "isVisible"
  | "isDefault"
  | "includeInAvailability"
  | "timeZone"
  | "shareWith"
  | "myRights";

export interface CalendarEvent {
  id: string;
  calendarIds: Record<string, boolean>;
  uid: string;
  /** RFC 8984 4.1.7: raised by one with every change, except one to participants only. */
  sequence?: number;
  title?: string;
  description?: string;
  descriptionContentType?: string;
  start: string;
  duration?: string;
  timeZone?: string | null;
  showWithoutTime?: boolean;
  status?: "tentative" | "confirmed" | "cancelled";
  freeBusyStatus?: "free" | "busy";
  privacy?: "public" | "private" | "secret";
  priority?: number;
  color?: string | null;
  keywords?: Record<string, boolean> | null;
  locations?: Record<string, unknown> | null;
  virtualLocations?: Record<string, unknown> | null;
  links?: Record<string, unknown> | null;
  participants?: Record<string, unknown> | null;
  organizerCalendarAddress?: string | null;
  alerts?: Record<string, unknown> | null;
  recurrenceRules?: unknown[] | null;
  excludedRecurrenceRules?: unknown[] | null;
  recurrenceOverrides?: Record<string, unknown> | null;
  recurrenceId?: string | null;
  recurrenceIdTimeZone?: string | null;
  /** On an instance listed with expandRecurrences: the id of the recurring event it is one of. */
  baseEventId?: string | null;
  isOrigin?: boolean;
}

export interface CalendarEventFilter {
  inCalendars?: string[];
  after?: string;
  before?: string;
  text?: string;
  title?: string;
  description?: string;
  location?: string;
  owner?: string;
  attendee?: string;
  participationStatus?: string;
  uid?: string;
}

export type CalendarEventQuerySortProperty = string & {};

export interface CalendarEventQuerySort extends JmapComparator<CalendarEventQuerySortProperty> {}

export type CalendarEventProperty =
  | "id"
  | "uid"
  | "sequence"
  | "calendarIds"
  | "title"
  | "description"
  | "descriptionContentType"
  | "start"
  | "duration"
  | "timeZone"
  | "showWithoutTime"
  | "status"
  | "freeBusyStatus"
  | "privacy"
  | "priority"
  | "color"
  | "keywords"
  | "locations"
  | "virtualLocations"
  | "links"
  | "participants"
  | "organizerCalendarAddress"
  | "alerts"
  | "recurrenceRules"
  | "excludedRecurrenceRules"
  | "recurrenceOverrides"
  | "recurrenceId"
  | "recurrenceIdTimeZone"
  | "baseEventId"
  | "isOrigin"
  // RFC 8984 3.3: a vendor's property, named for its domain ("example.com:property")
  | `${string}:${string}`;

export interface CalendarGetRequest extends JmapGetArgs<CalendarProperty> {}

export interface CalendarGetResponse {
  accountId: string;
  state: string;
  list: Calendar[];
}

export type CalendarMutable = {
  name?: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
  isSubscribed?: boolean;
  isVisible?: boolean;
  isDefault?: boolean;
  includeInAvailability?: "all" | "attending" | "none";
  timeZone?: string | null;
  shareWith?: Record<string, Partial<CalendarRights>> | null;
};

export interface CalendarCreate extends CalendarMutable {}

export type CalendarUpdate = JmapPatchObject<CalendarMutable>;

export interface CalendarSetRequest extends JmapSetArgs<CalendarCreate, CalendarUpdate> {}

export interface CalendarEventQueryRequest
  extends JmapQueryArgs<CalendarEventFilter, CalendarEventQuerySort> {
  /** Each instance of a recurring event as an id of its own; the filter needs after and before. */
  expandRecurrences?: boolean;
}

export interface CalendarEventQueryResponse {
  accountId: string;
  queryState?: string;
  ids: string[];
  position: number;
  total?: number;
}

export interface CalendarEventQueryChangesRequest
  extends JmapQueryChangesArgs<CalendarEventFilter, CalendarEventQuerySort> {}

export interface CalendarEventQueryChangesResponse extends JmapQueryChangesResponse {}

export interface CalendarEventGetRequest extends JmapGetArgs<CalendarEventProperty> {
  "#ids"?: {
    resultOf: string;
    name: "CalendarEvent/query";
    path: "/ids";
  };
}

export interface CalendarChangesRequest extends JmapChangesArgs {}

export interface CalendarChangesResponse extends JmapChangesResponse {}

export interface CalendarEventChangesRequest extends JmapChangesArgs {}

export interface CalendarEventChangesResponse extends JmapChangesResponse {}

export interface CalendarEventGetResponse {
  accountId: string;
  state: string;
  list: CalendarEvent[];
  notFound?: string[];
}

export type CalendarEventMutable = {
  calendarIds?: Record<string, boolean>;
  uid?: string;
  title?: string;
  description?: string;
  descriptionContentType?: string;
  start?: string;
  duration?: string;
  timeZone?: string | null;
  showWithoutTime?: boolean;
  status?: "tentative" | "confirmed" | "cancelled";
  freeBusyStatus?: "free" | "busy";
  privacy?: "public" | "private" | "secret";
  priority?: number;
  color?: string | null;
  keywords?: Record<string, boolean> | null;
  locations?: Record<string, unknown> | null;
  virtualLocations?: Record<string, unknown> | null;
  links?: Record<string, unknown> | null;
  participants?: Record<string, unknown> | null;
  organizerCalendarAddress?: string | null;
  alerts?: Record<string, unknown> | null;
  recurrenceRules?: unknown[] | null;
  excludedRecurrenceRules?: unknown[] | null;
  recurrenceOverrides?: Record<string, unknown> | null;
  recurrenceId?: string | null;
  isOrigin?: boolean;
};

export interface CalendarEventCreate extends CalendarEventMutable {}

export type CalendarEventUpdate = JmapPatchObject<CalendarEventMutable>;

export interface CalendarEventSetRequest extends JmapSetArgs<CalendarEventCreate, CalendarEventUpdate> {
  sendSchedulingMessages?: boolean;
}

export interface CalendarEventParseRequest {
  accountId: string;
  blobIds: readonly string[];
  properties?: readonly CalendarEventProperty[];
}

export interface CalendarEventParseResponse {
  accountId: string;
  parsed?: Record<string, Partial<CalendarEvent> | Partial<CalendarEvent>[]>;
  notParsable?: string[];
  notFound?: string[];
}

/** draft-ietf-jmap-calendars 3: an address the user acts as in the account, as organizer or attendee: their own, or the
 *  account owner's for one who acts for them. */
export interface ParticipantIdentity {
  id: string;
  name?: string | null;
  calendarAddress: string;
  isDefault?: boolean;
}

export type ParticipantIdentityProperty = keyof ParticipantIdentity;

export interface ParticipantIdentityGetRequest extends JmapGetArgs<ParticipantIdentityProperty> {}

export interface ParticipantIdentityGetResponse {
  accountId: string;
  state: string;
  list: ParticipantIdentity[];
}
