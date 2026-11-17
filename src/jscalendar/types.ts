import type { TaskProgress } from "../tasks/types.js";

// The JSCalendar objects an event or a task holds. Events follow draft-ietf-calext-jscalendarbis; tasks follow RFC 8984,
// as draft-ietf-jmap-tasks does, and where the two differ a task has its own form (TaskParticipant, TaskLocation,
// TaskLink).

/** JSCalendar-bis 1.5.5: a date-time without a zone, as "2026-03-02T09:00:00". */
export type LocalDateTime = string;

/** JSCalendar-bis 1.5.4: a date-time in UTC, as "2026-03-02T08:00:00Z". */
export type UTCDateTime = string;

/** JSCalendar-bis 1.5.10, and the relations draft-ietf-jmap-tasks and the registry add. */
export type RelationType =
  | "first"
  | "next"
  | "child"
  | "parent"
  | "depends-on"
  | "clone"
  | "duplicate"
  | "cause"
  | (string & {});

export interface Relation {
  "@type"?: "Relation";
  /** Empty for a parent, unless the property holding it says otherwise. */
  relation?: Partial<Record<RelationType, true>>;
}

/** JSCalendar-bis 1.5.11: what a link to an image is for. */
export type LinkDisplay = "badge" | "graphic" | "fullsize" | "thumbnail" | (string & {});

/** JSCalendar-bis 1.5.11. */
export interface Link {
  "@type"?: "Link";
  /** Mandatory, unless blobId names a blob of the account in its place (draft-ietf-jmap-calendars 5.3). */
  href?: string;
  blobId?: string;
  contentType?: string;
  size?: number;
  /** An RFC 8288 link relation; "enclosure", an attachment, when not given. */
  rel?: string;
  display?: Partial<Record<LinkDisplay, true>>;
  title?: string;
}

/** RFC 8984 1.4.11: a task's link, with cid, and one purpose as display. */
export interface TaskLink extends Omit<Link, "display"> {
  cid?: string;
  display?: LinkDisplay;
}

/** JSCalendar-bis 3.2.5. */
export interface Location {
  "@type"?: "Location";
  name?: string;
  /** RFC 8984 4.2.5; bis drops it. */
  description?: string;
  locationTypes?: Record<string, true>;
  /** A "geo:" URI. */
  coordinates?: string;
  links?: Record<string, Link>;
}

/** RFC 8984 4.2.5: a task's location, which may say it is where the task starts or ends, and in which zone. */
export interface TaskLocation extends Omit<Location, "links"> {
  relativeTo?: "start" | "end" | (string & {});
  timeZone?: string;
  links?: Record<string, TaskLink>;
}

export type VirtualLocationFeature =
  | "audio"
  | "chat"
  | "feed"
  | "moderator"
  | "phone"
  | "screen"
  | "video"
  | (string & {});

/** JSCalendar-bis 3.2.7. */
export interface VirtualLocation {
  "@type"?: "VirtualLocation";
  name?: string;
  /** RFC 8984 4.2.6; bis drops it. */
  description?: string;
  uri: string;
  features?: Partial<Record<VirtualLocationFeature, true>>;
}

export type DayOfWeek = "mo" | "tu" | "we" | "th" | "fr" | "sa" | "su";

/** JSCalendar-bis 3.3.3, RFC 8984 4.3.3: a day of the week, or its nth (from the end when negative) in the period. */
export interface NDay {
  "@type"?: "NDay";
  day: DayOfWeek;
  nthOfPeriod?: number;
}

/** JSCalendar-bis 3.3.3, RFC 8984 4.3.3: iCalendar's RRULE. */
export interface RecurrenceRule {
  "@type"?: "RecurrenceRule";
  frequency: "yearly" | "monthly" | "weekly" | "daily" | "hourly" | "minutely" | "secondly";
  interval?: number;
  rscale?: string;
  skip?: "omit" | "backward" | "forward";
  firstDayOfWeek?: DayOfWeek;
  byDay?: NDay[];
  byMonthDay?: number[];
  /** "1" for the first month, with an "L" after a leap month. */
  byMonth?: string[];
  byYearDay?: number[];
  byWeekNo?: number[];
  byHour?: number[];
  byMinute?: number[];
  bySecond?: number[];
  bySetPosition?: number[];
  /** Not with until. */
  count?: number;
  /** In the object's time zone; not with count. */
  until?: LocalDateTime;
}

/** JSCalendar-bis 3.3.4, RFC 8984 4.3.5: what one occurrence changes, a PatchObject of whole properties and paths into
 *  them; { excluded: true } alone leaves the occurrence out. */
export type RecurrenceOverride<T> = Partial<T> & { excluded?: true } & Record<string, unknown>;

export type ParticipantKind = "individual" | "group" | "location" | "resource" | (string & {});

export type ParticipantRole = "owner" | "optional" | "informational" | "chair" | "required" | (string & {});

export type ParticipationStatus = "needs-action" | "accepted" | "declined" | "tentative" | "delegated" | (string & {});

interface ParticipantCommon {
  "@type"?: "Participant";
  name?: string;
  email?: string;
  description?: string;
  kind?: ParticipantKind;
  participationStatus?: ParticipationStatus;
  expectReply?: boolean;
  /** The address the participant's last answer came from, when not their own. */
  sentBy?: string;
  delegatedTo?: Record<string, true>;
  delegatedFrom?: Record<string, true>;
  memberOf?: Record<string, true>;
  /** RFC 8984 4.4.6; reserved by bis (A.2.2.2) for a later scheduling extension. */
  participationComment?: string;
  scheduleAgent?: "server" | "client" | "none" | (string & {});
  scheduleStatus?: string[];
  /** draft-ietf-jmap-calendars 5.2: the sequence and time of the last iTIP answer taken for the participant. */
  scheduleSequence?: number;
  scheduleUpdated?: UTCDateTime;
}

/** JSCalendar-bis 3.4.6: an event's participant, known by calendarAddress; delegatedTo, delegatedFrom and memberOf are
 *  keyed by calendar address. */
export interface Participant extends ParticipantCommon {
  calendarAddress?: string;
  descriptionContentType?: string;
  roles?: Partial<Record<ParticipantRole, true>>;
  links?: Record<string, Link>;
}

/** RFC 8984 4.4.6: a task's participant (the assignees extension), known by sendTo; delegatedTo, delegatedFrom and
 *  memberOf are keyed by participant id. */
export interface TaskParticipant extends ParticipantCommon {
  /** How to reach the participant by each method, as { imip: "mailto:…" }. */
  sendTo?: Record<string, string>;
  roles: Partial<Record<ParticipantRole | "attendee", true>>;
  locationId?: string;
  language?: string;
  scheduleForceSend?: boolean;
  invitedBy?: string;
  links?: Record<string, TaskLink>;
  progress?: TaskProgress;
  progressUpdated?: UTCDateTime;
  percentComplete?: number;
}

/** JSCalendar-bis 3.5.1: a time relative to the start or the end (an event's end, a task's due). The type may be left
 *  out, as an offset is a trigger's default type. */
export interface OffsetTrigger {
  "@type"?: "OffsetTrigger";
  /** A signed duration, negative before the time. */
  offset: string;
  relativeTo?: "start" | "end";
}

export interface AbsoluteTrigger {
  "@type": "AbsoluteTrigger";
  when: UTCDateTime;
}

/** A trigger of a type not known, which must be kept as it is. */
export interface UnknownTrigger {
  "@type": string;
  [property: string]: unknown;
}

export type AlertAction = "display" | "email" | (string & {});

/** JSCalendar-bis 3.5.1, RFC 8984 4.5.2. */
export interface Alert {
  "@type"?: "Alert";
  trigger: OffsetTrigger | AbsoluteTrigger | UnknownTrigger;
  acknowledged?: UTCDateTime;
  /** Other alerts of the object, by key; a "snooze" relation names the alert this one snoozes. */
  relatedTo?: Record<string, Relation>;
  action?: AlertAction;
}
