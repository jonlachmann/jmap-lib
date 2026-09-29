export * from "./core/capabilities";
export { JmapBatch, JmapClient, JmapHttpError } from "./core/client";
export { CoreEcho } from "./core/core-methods";
export type { CoreEchoRequest, CoreEchoResponse } from "./core/core-methods";
export { AccountId, CallId, MailboxId } from "./core/ids";
export type { JmapChangesArgs, JmapChangesResponse } from "./core/changes";
export type { JmapGetArgs } from "./core/get";
export type { JmapMethod } from "./core/method";
export type {
  JmapNestedPatchPath,
  JmapPatchObject,
  JmapPatchPath,
  JmapPatchValueAtPath,
} from "./core/patch";
export type {
  FilterOperatorCondition,
  JmapComparator,
  JmapFilterCondition,
  JmapFilterOperator,
  JmapFilterOperatorName,
  JmapQueryAddedItem,
  JmapQueryArgs,
  JmapQueryChangesArgs,
  JmapQueryChangesResponse,
} from "./core/query";
export { JmapProtocolError, JmapResponse } from "./core/response";
export type { JmapMethodError, JmapSetArgs, JmapSetResponse } from "./core/set";
export { getSetError } from "./core/set";
export {
  createBasicAuthorizationHeader,
  discoverJmapSession,
  resolvePrimaryAccountId,
} from "./core/session";
export type { JmapSession, JmapSessionAccount } from "./core/session";
export { connectEventSource } from "./core/event-source";
export type { StateChange, TypeState, JmapEventSourceOptions } from "./core/event-source";
export { connectEventStream, SseParser } from "./core/event-stream";
export type { JmapEventStream, JmapEventStreamOptions, ConnectionState } from "./core/event-stream";
export {
  EmailChanges,
  EmailGet,
  EmailQuery,
  EmailQueryChanges,
  EmailSet,
  EmailSubmissionSet,
  IdentityChanges,
  IdentityGet,
  IdentitySet,
  MailboxChanges,
  MailboxGet,
  MailboxQuery,
  MailboxQueryChanges,
  MailboxSet,
  ThreadChanges,
  ThreadGet,
} from "./mail/methods";
export { JmapIdentities } from "./mail/jmap-identities";
export { JmapMail } from "./mail/jmap-mail";
export type * from "./mail/types";
export { QuotaGet } from "./quota/methods";
export { JmapQuota } from "./quota/jmap-quota";
export type * from "./quota/types";
export { VacationResponseGet, VacationResponseSet } from "./vacation/methods";
export { JmapVacation } from "./vacation/jmap-vacation";
export type * from "./vacation/types";
export {
  AddressBookGet,
  ContactCardGet,
  ContactCardQuery,
  ContactCardQueryChanges,
  ContactCardSet,
} from "./contacts/methods";
export { JmapContacts } from "./contacts/jmap-contacts";
export type * from "./contacts/types";
export {
  CalendarEventGet,
  CalendarEventParse,
  CalendarEventQuery,
  CalendarEventQueryChanges,
  CalendarEventSet,
  CalendarGet,
  CalendarSet,
} from "./calendars/methods";
export { DEFAULT_CALENDAR_EVENT_PROPERTIES, JmapCalendars } from "./calendars/jmap-calendars";
export type * from "./calendars/types";
export { SieveScriptGet, SieveScriptSet, SieveScriptValidate } from "./sieve/methods";
export { JmapSieve } from "./sieve/jmap-sieve";
export type * from "./sieve/types";
export {
  TaskListGet,
  TaskListChanges,
  TaskListSet,
  TaskGet,
  TaskChanges,
  TaskSet,
  TaskCopy,
  TaskQuery,
  TaskQueryChanges,
  TaskNotificationGet,
  TaskNotificationChanges,
  TaskNotificationSet,
  TaskNotificationQuery,
  TaskNotificationQueryChanges,
} from "./tasks/methods";
export { DEFAULT_TASK_PROPERTIES, JmapTasks } from "./tasks/jmap-tasks";
export type * from "./tasks/types";
