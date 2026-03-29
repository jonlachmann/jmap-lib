import type { JmapGetArgs } from "../core/get";
import type { JmapComparator, JmapQueryArgs } from "../core/query";
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
  | "isOrigin";

export interface CalendarGetRequest extends JmapGetArgs<CalendarProperty> {}

export interface CalendarGetResponse {
  accountId: string;
  state?: string;
  list: Calendar[];
}

export interface CalendarSetRequest extends JmapSetArgs<Partial<Calendar>, Partial<Calendar>> {}

export interface CalendarEventQueryRequest
  extends JmapQueryArgs<CalendarEventFilter, CalendarEventQuerySort> {}

export interface CalendarEventQueryResponse {
  accountId: string;
  queryState?: string;
  ids: string[];
  position: number;
  total?: number;
}

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

export interface CalendarEventSetRequest extends JmapSetArgs<Partial<CalendarEvent>, Partial<CalendarEvent>> {
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
