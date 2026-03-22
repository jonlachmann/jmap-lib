export const JMAP_CORE_CAPABILITY = "urn:ietf:params:jmap:core";
export const JMAP_MAIL_CAPABILITY = "urn:ietf:params:jmap:mail";
export const JMAP_SUBMISSION_CAPABILITY = "urn:ietf:params:jmap:submission";
export const JMAP_VACATION_RESPONSE_CAPABILITY = "urn:ietf:params:jmap:vacationresponse";
export const JMAP_CONTACTS_CAPABILITY = "urn:ietf:params:jmap:contacts";
export const JMAP_CALENDARS_CAPABILITY = "urn:ietf:params:jmap:calendars";
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

export const CORE_CALENDARS_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_CALENDARS_CAPABILITY,
] as const;

export const CORE_SIEVE_CAPABILITIES = [
  JMAP_CORE_CAPABILITY,
  JMAP_SIEVE_CAPABILITY,
] as const;
