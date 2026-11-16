import type { CalendarEvent } from "../calendars/types";
import type { JmapGetArgs } from "../core/get";
import type { FilterOperatorCondition, JmapQueryArgs } from "../core/query";

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

export type PrincipalFilter = FilterOperatorCondition<PrincipalFilterCondition>;

export interface PrincipalGetRequest extends JmapGetArgs<PrincipalProperty> {}

export interface PrincipalGetResponse {
  accountId: string;
  state: string;
  list: Principal[];
  notFound: string[];
}

export interface PrincipalQueryRequest extends JmapQueryArgs<PrincipalFilterCondition, never> {}

export interface PrincipalQueryResponse {
  accountId: string;
  queryState: string;
  ids: string[];
  position: number;
  total?: number;
}

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
