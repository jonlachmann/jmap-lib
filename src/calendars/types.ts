import type { JmapGetArgs } from "../core/get";
import type { JmapPatchObject } from "../core/patch";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query";
import type { JmapSetArgs } from "../core/set";

export interface Calendar {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
  isSubscribed?: boolean;
  isVisible?: boolean;
  isDefault?: boolean;
  timeZone?: string | null;
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
  | "timeZone";

export interface CalendarEvent {
  id: string;
  calendarIds: Record<string, boolean>;
  uid: string;
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
  | "isOrigin";

export interface CalendarGetRequest extends JmapGetArgs<CalendarProperty> {}

export interface CalendarGetResponse {
  accountId: string;
  state?: string;
  list: Calendar[];
}

export interface CalendarMutable {
  name?: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
  isSubscribed?: boolean;
  isVisible?: boolean;
  isDefault?: boolean;
  timeZone?: string | null;
}

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

export interface CalendarEventGetResponse {
  accountId: string;
  state?: string;
  list: CalendarEvent[];
  notFound?: string[];
}

export interface CalendarEventMutable {
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
}

export interface CalendarEventCreate extends CalendarEventMutable {}

export type CalendarEventUpdate = JmapPatchObject<CalendarEventMutable>;

export interface CalendarEventSetRequest extends JmapSetArgs<CalendarEventCreate, CalendarEventUpdate> {
  sendSchedulingMessages?: boolean;
}

export interface CalendarEventParseRequest {
  accountId: string;
  blobIds: readonly string[];
}

export interface CalendarEventParseResponse {
  accountId: string;
  parsed?: Record<string, Partial<CalendarEvent> | Partial<CalendarEvent>[]>;
  notParsable?: string[];
  notFound?: string[];
}
