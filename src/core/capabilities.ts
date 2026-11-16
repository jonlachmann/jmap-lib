export const JMAP_CORE_CAPABILITY = "urn:ietf:params:jmap:core";
export const JMAP_MAIL_CAPABILITY = "urn:ietf:params:jmap:mail";
export const JMAP_SUBMISSION_CAPABILITY = "urn:ietf:params:jmap:submission";
export const JMAP_VACATION_RESPONSE_CAPABILITY = "urn:ietf:params:jmap:vacationresponse";
export const JMAP_CONTACTS_CAPABILITY = "urn:ietf:params:jmap:contacts";
/** ContactCard/parse, as Stalwart names it. */
export const JMAP_CONTACTS_PARSE_CAPABILITY = "urn:ietf:params:jmap:contacts:parse";
/** RFC 9404: blobs made in a request. */
export const JMAP_BLOB_CAPABILITY = "urn:ietf:params:jmap:blob";
export const JMAP_CALENDARS_CAPABILITY = "urn:ietf:params:jmap:calendars";
export const JMAP_CALENDARS_PARSE_CAPABILITY = "urn:ietf:params:jmap:calendars:parse";
export const JMAP_SIEVE_CAPABILITY = "urn:ietf:params:jmap:sieve";

export const CORE_MAIL_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_MAIL_CAPABILITY,
] as const;

export const CORE_MAIL_SUBMISSION_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_MAIL_CAPABILITY,
  JMAP_SUBMISSION_CAPABILITY,
] as const;

export const CORE_MAIL_VACATION_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_MAIL_CAPABILITY,
  JMAP_VACATION_RESPONSE_CAPABILITY,
] as const;

export const CORE_CONTACTS_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_CONTACTS_CAPABILITY,
] as const;

/** Capabilities for uploading vCards as blobs and parsing them in one request. */
export const CORE_CONTACTS_PARSE_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_BLOB_CAPABILITY,
  JMAP_CONTACTS_CAPABILITY,
  JMAP_CONTACTS_PARSE_CAPABILITY,
] as const;

export const CORE_CALENDARS_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_CALENDARS_CAPABILITY,
] as const;

export const CORE_CALENDARS_PARSE_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_CALENDARS_CAPABILITY,
  JMAP_CALENDARS_PARSE_CAPABILITY,
] as const;

export const CORE_SIEVE_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_SIEVE_CAPABILITY,
] as const;

export const JMAP_TASKS_CAPABILITY = "urn:ietf:params:jmap:tasks";
export const JMAP_TASKS_RECURRENCES_CAPABILITY = "urn:ietf:params:jmap:tasks:recurrences";
export const JMAP_TASKS_ASSIGNEES_CAPABILITY = "urn:ietf:params:jmap:tasks:assignees";
export const JMAP_TASKS_ALERTS_CAPABILITY = "urn:ietf:params:jmap:tasks:alerts";
export const JMAP_TASKS_MULTILINGUAL_CAPABILITY = "urn:ietf:params:jmap:tasks:multilingual";
export const JMAP_TASKS_CUSTOMTIMEZONES_CAPABILITY = "urn:ietf:params:jmap:tasks:customtimezones";

export const CORE_TASKS_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_TASKS_CAPABILITY,
] as const;

// Private capability from rfcs/draft-jmap-notes-00.txt (not IETF-registered).
export const JMAP_NOTES_CAPABILITY = "urn:x-jmap-lib:notes";

export const CORE_NOTES_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_NOTES_CAPABILITY,
] as const;

/** RFC 9670: Principals and ShareNotifications. */
export const JMAP_PRINCIPALS_CAPABILITY = "urn:ietf:params:jmap:principals";

export const CORE_PRINCIPALS_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_PRINCIPALS_CAPABILITY,
] as const;

/** draft-ietf-jmap-calendars 1.5.2: Principal/getAvailability. */
export const JMAP_PRINCIPALS_AVAILABILITY_CAPABILITY = "urn:ietf:params:jmap:principals:availability";

export const CORE_PRINCIPALS_AVAILABILITY_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_PRINCIPALS_CAPABILITY,
  JMAP_PRINCIPALS_AVAILABILITY_CAPABILITY,
] as const;
