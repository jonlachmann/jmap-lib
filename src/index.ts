export * from "./core/capabilities.js";
export { JmapBatch, JmapClient, JmapHttpError, JmapNetworkError, JmapUploadTooLargeError, resolveAuthorization } from "./core/client.js";
export type { JmapAuthorization, JmapProblem, JmapRequestErrorType, JmapResponseObserver, JmapUploadResponse, RawMethodCall } from "./core/client.js";
export { CoreEcho } from "./core/core-methods.js";
export { BlobGet, BlobUpload } from "./core/blob.js";
export type {
  BlobDataSource,
  BlobGetRequest,
  BlobGetResponse,
  BlobObject,
  BlobProperty,
  BlobUploadObject,
  BlobUploadRequest,
  BlobUploadResponse,
  BlobUploadCreated,
} from "./core/blob.js";
export type { CoreEchoRequest, CoreEchoResponse } from "./core/core-methods.js";
export { AccountId, CallId } from "./core/ids.js";
export type { JmapChangesArgs, JmapChangesResponse } from "./core/changes.js";
export type { JmapGetArgs, JmapGetResponse } from "./core/get.js";
export type { JmapCopyArgs, JmapCopyResponse } from "./core/copy.js";
export { resultOf } from "./core/reference.js";
export type { JmapResultReference } from "./core/reference.js";
export { paginate } from "./core/paginate.js";
export { inAny } from "./core/query.js";
export type { JmapMethod } from "./core/method.js";
export type {
  JmapNestedPatchPath,
  JmapPatchObject,
  JmapPatchPath,
  JmapPatchValueAtPath,
} from "./core/patch.js";
export type {
  JmapFilter,
  JmapComparator,
  JmapFilterCondition,
  JmapFilterOperator,
  JmapFilterOperatorName,
  JmapQueryAddedItem,
  JmapQueryArgs,
  JmapQueryChangesArgs,
  JmapQueryChangesResponse,
  JmapQueryResponse,
} from "./core/query.js";
export { JmapProtocolError, JmapResponse, type JmapMethodErrorType, type RawJmapResponse } from "./core/response.js";
export type { JmapCreated, JmapSetArgs, JmapSetError, JmapSetResponse } from "./core/set.js";
export { assertSetOk, CREATION_ID, createdOne, getSetError, JmapSetRefusedError } from "./core/set.js";
export {
  createBasicAuthorizationHeader,
  discoverJmapSession,
  expandUriTemplate,
  resolvePrimaryAccountId,
} from "./core/session.js";
export type { JmapCoreCapability, JmapSession, JmapSessionAccount } from "./core/session.js";
export { connectEventStream, SseParser } from "./core/event-stream.js";
export type { ConnectionState, JmapEventStream, JmapEventStreamOptions, StateChange, TypeState } from "./core/event-stream.js";
export {
  EmailChanges,
  EmailCopy,
  EmailGet,
  EmailImport,
  EmailQuery,
  EmailQueryChanges,
  EmailSet,
  EmailSubmissionChanges,
  EmailSubmissionGet,
  EmailSubmissionQuery,
  EmailSubmissionQueryChanges,
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
} from "./mail/methods.js";
export { MailboxId } from "./mail/ids.js";
export { JmapIdentities } from "./mail/jmap-identities.js";
export { JmapMail } from "./mail/jmap-mail.js";
export type * from "./mail/types.js";
export { QuotaGet } from "./quota/methods.js";
export { JmapQuota } from "./quota/jmap-quota.js";
export type * from "./quota/types.js";
export { VacationResponseGet, VacationResponseSet } from "./vacation/methods.js";
export { JmapVacation } from "./vacation/jmap-vacation.js";
export type * from "./vacation/types.js";
export {
  AddressBookChanges,
  AddressBookGet,
  AddressBookSet,
  ContactCardChanges,
  ContactCardGet,
  ContactCardQuery,
  ContactCardQueryChanges,
  ContactCardSet,
} from "./contacts/methods.js";
export { JmapContacts } from "./contacts/jmap-contacts.js";
export type * from "./contacts/types.js";
export {
  CalendarChanges,
  CalendarEventChanges,
  CalendarEventGet,
  CalendarEventParse,
  CalendarEventQuery,
  CalendarEventQueryChanges,
  CalendarEventSet,
  CalendarGet,
  CalendarSet,
  ParticipantIdentityChanges,
  ParticipantIdentityGet,
  ParticipantIdentitySet,
} from "./calendars/methods.js";
export { DEFAULT_CALENDAR_EVENT_PROPERTIES, JmapCalendars } from "./calendars/jmap-calendars.js";
export type * from "./jscalendar/types.js";
export type * from "./calendars/types.js";
export { SieveScriptGet, SieveScriptSet, SieveScriptValidate } from "./sieve/methods.js";
export { JmapSieve } from "./sieve/jmap-sieve.js";
export type * from "./sieve/types.js";
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
} from "./tasks/methods.js";
export { DEFAULT_TASK_PROPERTIES, JmapTasks } from "./tasks/jmap-tasks.js";
export type * from "./tasks/types.js";
export {
  NoteBookGet,
  NoteBookChanges,
  NoteBookSet,
  NoteGet,
  NoteChanges,
  NoteSet,
  NoteCopy,
  NoteQuery,
  NoteQueryChanges,
} from "./notes/methods.js";
export { DEFAULT_NOTE_PROPERTIES, JmapNotes } from "./notes/jmap-notes.js";
export type * from "./notes/types.js";
export {
  PrincipalChanges,
  PrincipalGet,
  PrincipalGetAvailability,
  PrincipalQuery,
  PrincipalQueryChanges,
  PrincipalSet,
  ShareNotificationChanges,
  ShareNotificationGet,
  ShareNotificationQuery,
  ShareNotificationQueryChanges,
  ShareNotificationSet,
} from "./principals/methods.js";
export { JmapPrincipals } from "./principals/jmap-principals.js";
export type * from "./principals/types.js";
