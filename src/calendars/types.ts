import type { JmapGetResponse } from "../core/get.js";
import type { JmapQueryResponse } from "../core/query.js";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes.js";
import type { JmapGetArgs } from "../core/get.js";
import type { JmapPatchObject } from "../core/patch.js";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query.js";
import type { JmapSetArgs } from "../core/set.js";
import type {
  Alert,
  Link,
  LocalDateTime,
  Location,
  Participant,
  RecurrenceOverride,
  RecurrenceRule,
  VirtualLocation,
} from "../jscalendar/types.js";

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

/** Every right CalendarRights holds, for code that reads or sets them by name. */
export const CALENDAR_RIGHTS = [
  "mayReadFreeBusy",
  "mayReadItems",
  "mayWriteAll",
  "mayWriteOwn",
  "mayUpdatePrivate",
  "mayRSVP",
  "mayShare",
  "mayDelete",
] as const satisfies readonly (keyof CalendarRights)[];

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
  calendarIds: Record<string, true>;
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
  keywords?: Record<string, true> | null;
  locations?: Record<string, Location> | null;
  virtualLocations?: Record<string, VirtualLocation> | null;
  links?: Record<string, Link> | null;
  participants?: Record<string, Participant> | null;
  organizerCalendarAddress?: string | null;
  alerts?: Record<string, Alert> | null;
  /** JSCalendar-bis 3.3.3: the one rule, in place of RFC 8984's recurrenceRules. */
  recurrenceRule?: RecurrenceRule | null;
  recurrenceOverrides?: Record<LocalDateTime, CalendarEventOverride> | null;
  recurrenceId?: string | null;
  recurrenceIdTimeZone?: string | null;
  /** On an instance listed with expandRecurrences: the id of the recurring event it is one of. */
  baseEventId?: string | null;
  isOrigin?: boolean;
}

/** draft-ietf-jmap-calendars 5.8. */
export interface CalendarEventFilter {
  inCalendar?: string;
  after?: string;
  before?: string;
  text?: string;
  title?: string;
  description?: string;
  location?: string;
  owner?: string;
  participant?: string;
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
  | "recurrenceRule"
  | "recurrenceOverrides"
  | "recurrenceId"
  | "recurrenceIdTimeZone"
  | "baseEventId"
  | "isOrigin"
  // RFC 8984 3.3: a vendor's property, named for its domain ("example.com:property")
  | `${string}:${string}`;

export interface CalendarGetRequest extends JmapGetArgs<CalendarProperty> {}

export type CalendarGetResponse = JmapGetResponse<Calendar>;

export type CalendarMutable = {
  name?: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
  isSubscribed?: boolean;
  isVisible?: boolean;
  includeInAvailability?: "all" | "attending" | "none";
  timeZone?: string | null;
  shareWith?: Record<string, Partial<CalendarRights>> | null;
};

export interface CalendarCreate extends CalendarMutable {}

export type CalendarUpdate = JmapPatchObject<CalendarMutable>;

export interface CalendarSetRequest extends JmapSetArgs<CalendarCreate, CalendarUpdate> {
  /** The calendar to make the default once the rest succeeds; "#" and a creation id for one made here. */
  onSuccessSetIsDefault?: string | null;
  /** Destroy a calendar's events with it; otherwise a calendar holding any is refused (calendarHasEvent). */
  onDestroyRemoveEvents?: boolean;
}

export interface CalendarEventQueryRequest
  extends JmapQueryArgs<CalendarEventFilter, CalendarEventQuerySort> {
  /** Each instance of a recurring event as an id of its own; the filter needs after and before. */
  expandRecurrences?: boolean;
  /** The zone after and before, and floating events' starts, are read in; Etc/UTC when not given. */
  timeZone?: string;
}

export type CalendarEventQueryResponse = JmapQueryResponse;

export interface CalendarEventQueryChangesRequest
  extends JmapQueryChangesArgs<CalendarEventFilter, CalendarEventQuerySort> {}

export interface CalendarEventQueryChangesResponse extends JmapQueryChangesResponse {}

/** draft-ietf-jmap-calendars-34 5.7. */
export interface CalendarEventGetRequest extends JmapGetArgs<CalendarEventProperty> {
  /** Only recurrence overrides whose recurrence id, in UTC, is before this UTCDateTime. */
  recurrenceOverridesBefore?: string | null;
  /** Only recurrence overrides whose recurrence id, in UTC, is on or after this UTCDateTime. */
  recurrenceOverridesAfter?: string | null;
  /** Only owner participants and the user's own in participants. */
  reduceParticipants?: boolean;
  /** The zone floating events are read in for utcStart, utcEnd and the recurrenceOverrides bounds; Etc/UTC when not given. */
  timeZone?: string;
}

export interface CalendarChangesRequest extends JmapChangesArgs {}

export interface CalendarChangesResponse extends JmapChangesResponse {}

export interface CalendarEventChangesRequest extends JmapChangesArgs {}

export interface CalendarEventChangesResponse extends JmapChangesResponse {}

export type CalendarEventGetResponse = JmapGetResponse<CalendarEvent>;

export type CalendarEventMutable = {
  calendarIds?: Record<string, true>;
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
  keywords?: Record<string, true> | null;
  locations?: Record<string, Location> | null;
  virtualLocations?: Record<string, VirtualLocation> | null;
  links?: Record<string, Link> | null;
  participants?: Record<string, Participant> | null;
  organizerCalendarAddress?: string | null;
  alerts?: Record<string, Alert> | null;
  /** JSCalendar-bis 3.3.3: the one rule, in place of RFC 8984's recurrenceRules. */
  recurrenceRule?: RecurrenceRule | null;
  recurrenceOverrides?: Record<LocalDateTime, CalendarEventOverride> | null;
  recurrenceId?: string | null;
  /** RFC 8984 3.3: a vendor's property, its name with the vendor's domain before a colon. */
  [vendor: `${string}:${string}`]: unknown;
};

/** JSCalendar-bis 3.3.4: what one occurrence of an event changes; the properties left out are the series'. */
export type CalendarEventOverride = RecurrenceOverride<
  Omit<
    CalendarEventMutable,
    "calendarIds" | "uid" | "privacy" | "organizerCalendarAddress" | "recurrenceRule" | "recurrenceOverrides" | "recurrenceId"
  >
>;

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

export type ParticipantIdentityGetResponse = JmapGetResponse<ParticipantIdentity>;

export interface ParticipantIdentityChangesRequest extends JmapChangesArgs {}

export interface ParticipantIdentityChangesResponse extends JmapChangesResponse {}

/** isDefault is the server's, set by onSuccessSetIsDefault. */
export type ParticipantIdentityMutable = {
  name?: string | null;
  calendarAddress?: string;
};

/** The server may refuse an address the user may not claim, such as another's mailto: (forbidden). */
export interface ParticipantIdentityCreate extends ParticipantIdentityMutable {
  calendarAddress: string;
}

export type ParticipantIdentityUpdate = JmapPatchObject<ParticipantIdentityMutable>;

/** draft-ietf-jmap-calendars-34 3.3. */
export interface ParticipantIdentitySetRequest extends JmapSetArgs<ParticipantIdentityCreate, ParticipantIdentityUpdate> {
  /** The identity to make the default once the rest succeeds; "#" and a creation id for one made here. A server not
   *  allowing it keeps the default it has, with no error. */
  onSuccessSetIsDefault?: string | null;
}
