import type { JmapGetResponse } from "../core/get.js";
import type { JmapQueryResponse } from "../core/query.js";
import type { CalendarEvent } from "../calendars/types.js";
import type { JmapGetArgs } from "../core/get.js";
import type { JmapComparator, JmapFilter, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query.js";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes.js";
import type { JmapPatchObject } from "../core/patch.js";
import type { JmapSetArgs } from "../core/set.js";

/** RFC 9670 2: a person, a group of them, a room, a resource, or another entity data can be shared with. */
export interface Principal {
  id: string;
  type: "individual" | "group" | "resource" | "location" | "other";
  name: string;
  description?: string | null;
  email?: string | null;
  timeZone?: string | null;
  /** Each capability's details for the principal, such as whether the user may share with it. */
  capabilities?: Record<string, PrincipalCapability | undefined>;
  /** The accounts holding the principal's data that the user reaches; null when none. */
  accounts?: Record<string, unknown> | null;
}

/** The Calendars and Tasks principal capabilities' common part, and the Calendars one's mayGetAvailability. */
export interface PrincipalCapability {
  accountId?: string | null;
  mayShareWith?: boolean;
  /** Calendars only: whether the user may ask when the principal is busy (draft-ietf-jmap-calendars 2.1). */
  mayGetAvailability?: boolean;
  /** Calendars: the address to invite the principal at (draft-ietf-jmap-calendars 2.1). */
  calendarAddress?: string;
  /** Tasks: where to send it assignments, by method (draft-ietf-jmap-tasks). */
  sendTo?: Record<string, string>;
}

export type PrincipalProperty =
  | "id"
  | "type"
  | "name"
  | "description"
  | "email"
  | "timeZone"
  | "capabilities"
  | "accounts";

/** RFC 9670 2.4.1. */
export interface PrincipalFilterCondition {
  accountIds?: string[];
  email?: string;
  name?: string;
  text?: string;
  type?: Principal["type"];
  timeZone?: string;
}

export type PrincipalFilter = JmapFilter<PrincipalFilterCondition>;

export interface PrincipalGetRequest extends JmapGetArgs<PrincipalProperty> {}

export type PrincipalGetResponse = JmapGetResponse<Principal>;

export interface PrincipalQueryRequest extends JmapQueryArgs<PrincipalFilterCondition, never> {}

export type PrincipalQueryResponse = JmapQueryResponse;

/** A server backed by a directory may always answer cannotCalculateChanges (RFC 9670 2.2, 2.5). */
export interface PrincipalChangesRequest extends JmapChangesArgs {}

export interface PrincipalChangesResponse extends JmapChangesResponse {}

export interface PrincipalQueryChangesRequest extends JmapQueryChangesArgs<PrincipalFilterCondition, never> {}

export interface PrincipalQueryChangesResponse extends JmapQueryChangesResponse {}

/** The properties a client may set (RFC 9670 2); capabilities and accounts are the server's. */
export type PrincipalMutable = {
  type?: Principal["type"];
  name?: string;
  description?: string | null;
  email?: string | null;
  timeZone?: string | null;
};

export interface PrincipalCreate extends PrincipalMutable {
  type: Principal["type"];
  name: string;
}

export type PrincipalUpdate = JmapPatchObject<PrincipalMutable>;

/** RFC 9670 2.3: a server refuses what it doesn't allow (forbidden); one that allows changes should let the user change
 *  the name, description and timeZone of their own principal (the account's currentUserPrincipalId). */
export interface PrincipalSetRequest extends JmapSetArgs<PrincipalCreate, PrincipalUpdate> {}

/** Who changed a share (RFC 9670 3). */
export interface ShareNotificationEntity {
  name: string;
  email: string | null;
  principalId: string | null;
}

/** RFC 9670 3: the user's rights to a shared object changed. The server makes these; the user can only dismiss them. */
export interface ShareNotification {
  id: string;
  created: string;
  changedBy: ShareNotificationEntity;
  /** The object's data type, as the IANA "JMAP Data Types" registry names it ("Calendar", "Mailbox"). */
  objectType: string;
  objectAccountId: string;
  objectId: string;
  /** The object's myRights before the change. */
  oldRights: Record<string, boolean> | null;
  /** The object's myRights after the change. */
  newRights: Record<string, boolean> | null;
  /** The object's name when the notification was made, so a user who lost access knows what it was. */
  name: string;
}

export type ShareNotificationProperty = keyof ShareNotification;

/** RFC 9670 3.4.1. */
export interface ShareNotificationFilterCondition {
  /** Created on or after this UTCDate. */
  after?: string | null;
  /** Created before this UTCDate. */
  before?: string | null;
  objectType?: string;
  objectAccountId?: string;
}

export type ShareNotificationFilter = JmapFilter<ShareNotificationFilterCondition>;

/** RFC 9670 3.4.2: created is the sort every server has. */
export interface ShareNotificationSort extends JmapComparator<"created" | (string & {})> {}

export interface ShareNotificationGetRequest extends JmapGetArgs<ShareNotificationProperty> {}

export type ShareNotificationGetResponse = JmapGetResponse<ShareNotification>;

export interface ShareNotificationChangesRequest extends JmapChangesArgs {}

export interface ShareNotificationChangesResponse extends JmapChangesResponse {}

/** RFC 9670 3.3: destroy only, which dismisses; a create or update is refused (forbidden). */
export interface ShareNotificationSetRequest extends JmapSetArgs<never, never> {}

export interface ShareNotificationQueryRequest
  extends JmapQueryArgs<ShareNotificationFilterCondition, ShareNotificationSort> {}

export type ShareNotificationQueryResponse = JmapQueryResponse;

export interface ShareNotificationQueryChangesRequest
  extends JmapQueryChangesArgs<ShareNotificationFilterCondition, ShareNotificationSort> {}

export interface ShareNotificationQueryChangesResponse extends JmapQueryChangesResponse {}

/** draft-ietf-jmap-calendars 2.2. */
export interface PrincipalGetAvailabilityRequest {
  accountId: string;
  id: string;
  utcStart: string;
  utcEnd: string;
  showDetails?: boolean;
  eventProperties?: string[] | null;
}

/** A time the principal is busy, with the event when the user may see it (draft-ietf-jmap-calendars 2.2). */
export interface BusyPeriod {
  utcStart: string;
  utcEnd: string;
  busyStatus?: "confirmed" | "tentative" | "unavailable";
  event?: CalendarEvent | null;
  accountId?: string | null;
}

export interface PrincipalGetAvailabilityResponse {
  list: BusyPeriod[];
}
