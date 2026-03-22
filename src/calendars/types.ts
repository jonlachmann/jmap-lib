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

export interface CalendarGetRequest {
  accountId: string;
}

export interface CalendarGetResponse {
  accountId: string;
  state?: string;
  list: Calendar[];
}

export interface CalendarSetRequest {
  accountId: string;
  create?: Record<string, Partial<Calendar>>;
  update?: Record<string, Partial<Calendar>>;
  destroy?: readonly string[];
}

export interface CalendarEventQueryRequest {
  accountId: string;
  filter?: CalendarEventFilter;
  sort?: readonly { property: string; isAscending: boolean }[];
  limit?: number;
}

export interface CalendarEventQueryResponse {
  accountId: string;
  queryState?: string;
  ids: string[];
  position: number;
  total?: number;
}

export interface CalendarEventGetRequest {
  accountId: string;
  ids?: readonly string[];
  "#ids"?: {
    resultOf: string;
    name: "CalendarEvent/query";
    path: "/ids";
  };
  properties?: readonly CalendarEventProperty[];
}

export interface CalendarEventGetResponse {
  accountId: string;
  state?: string;
  list: CalendarEvent[];
  notFound?: string[];
}

export interface CalendarEventSetRequest {
  accountId: string;
  create?: Record<string, Partial<CalendarEvent>>;
  update?: Record<string, Partial<CalendarEvent>>;
  destroy?: readonly string[];
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
