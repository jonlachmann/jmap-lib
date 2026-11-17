# jmap-lib

Framework-agnostic TypeScript primitives and convenience clients for working with JMAP.

The library is designed to keep raw JMAP mechanics out of application code. Consumers should not need to:
- build raw JMAP method tuples
- index into `methodResponses`
- hand-construct `#ids` result references

It currently covers:
- core request/response primitives, blob upload and download (RFC 8620 6) and Blob/get and Blob/upload (RFC 9404)
- mail, with Email/copy and Email/import
- identities and email submissions
- quota
- vacation response
- contacts (RFC 9553, RFC 9610)
- calendars (draft-ietf-jmap-calendars-34, whose events are JSCalendar-bis, draft-ietf-calext-jscalendarbis-22: an organizer is `organizerCalendarAddress`, not RFC 8984's `replyTo`)
- tasks (draft-ietf-jmap-tasks-06) and notes (a private spec, `urn:x-jmap-lib:notes`)
- sieve (RFC 9661)
- principals and share notifications (RFC 9670)

Only JMAP's RFCs and drafts are implemented, and the notes spec. A server's own extensions (methods, capabilities, vendor properties) are for the application to add, with `client.invoke` or `batch` and a method object `{ methodName, arguments }`.

## Goals

- strong typing without a heavy runtime layer
- framework-agnostic design
- compact, composable API surface
- JMAP-native data returned to callers
- unit tests, and integration tests against a real JMAP server

## Requirements

- Node 20+
- TypeScript 5+

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Test

Run everything:

```bash
npm test
```

Run unit tests:

```bash
npm run test:unit
```

Run integration tests:

```bash
npm run test:integration
```

The tests run from the TypeScript sources with `tsx`, after `tsc` checks the types; integration test files run one at
a time, as they share one account. `npm run build` compiles `src/` alone into `dist/`, which runs in plain Node as well
as through a bundler; `npm run test:dist` builds it and imports it in Node.

## Integration Test Setup

Integration tests use:
- `.well-known/jmap` session discovery
- HTTP Basic Auth

Create a local integration env file:

```bash
cp .env.integration.example .env.integration
```

Then fill in:

```env
JMAP_BASE_URL=https://your-server.example
JMAP_USERNAME=your-username
JMAP_PASSWORD=your-password
# optional
# JMAP_ACCOUNT_ID=your-account-id
```

If the required variables are missing, integration tests skip cleanly. Additional two-user env vars are scaffolded in [`.env.integration.example`](.env.integration.example).

## API Overview

Exports are defined in [`src/index.ts`](src/index.ts).

Core:
- `JmapClient`
- `JmapBatch`
- `JmapResponse`
- `JmapHttpError`
- `JmapProtocolError`
- `CoreEcho`
- `AccountId`
- `MailboxId`
- `CallId`
- capability constants such as `JMAP_MAIL_CAPABILITY`
- `discoverJmapSession`
- `resolvePrimaryAccountId`
- `resultOf`, a result reference to an earlier call in the same request
- `paginate`, every page of a query with its objects, at most `maxObjectsInGet` a page
- `assertSetOk`, which throws `JmapSetRefusedError` with the `SetError` of a refused /set or /copy
- `connectEventStream`, server push (RFC 8620 7.3), reporting its connection state: `live`, `reconnecting`,
  `unreachable` (still retrying), `unauthorized` (signed out, or refused with 401 or 403; it stops) and `closed`

Mail:
- low-level methods:
  `MailboxGet`, `EmailQuery`, `EmailGet`, `EmailSet`, `EmailCopy`, `EmailImport`, `EmailSubmissionGet`, `EmailSubmissionQuery`,
  `EmailSubmissionSet`, `ThreadGet`, `IdentityGet`, `IdentitySet`
- convenience clients:
  `JmapMail`, `JmapIdentities`

Other domains:
- `JmapQuota`
- `JmapVacation`
- `JmapContacts`
- `JmapCalendars`
- `JmapTasks`
- `JmapNotes`
- `JmapSieve`
- `JmapPrincipals`

Blobs: `client.upload` and `client.download` use the session's upload and download URLs, so the client needs the
`session` option; an upload over the session's `maxSizeUpload` is refused before it is sent.

## Not implemented

- Email/parse and SearchSnippet/get (RFC 8621)
- Blob/lookup (RFC 9404)
- CalendarEventNotification (draft-ietf-jmap-calendars)

SieveScript (RFC 9661) and TaskNotification (draft-ietf-jmap-tasks) are implemented, but not every server offers them.

## Example

```ts
import {
  AccountId,
  CORE_MAIL_CAPABILITIES,
  JmapClient,
  JmapMail,
  MailboxGet,
} from "jmap-lib";

const client = new JmapClient({
  endpoint: "https://example.test/jmap/api",
  authorization: "Bearer token", // or a function giving it before each request
  capabilities: CORE_MAIL_CAPABILITIES,
});

const accountId = AccountId.of("account-1");

const mailboxes = await client.invoke(MailboxGet.all(accountId));

const mail = new JmapMail(client);
const page = await mail.listPage({
  accountId,
  limit: 10,
  properties: ["id", "threadId", "mailboxIds", "receivedAt", "subject"],
});
```

## Integration Coverage

The integration suite currently exercises:
- session bootstrap through `.well-known/jmap`
- mailbox fetch and email listing
- contacts address books, listing, search, create, get, update, destroy
- calendars list, event list/query, create, get, update, destroy
- capability-aware coverage for identities, vacation response, and sieve
- blob upload, download and Blob/get; Email/import and Email/copy; email submissions
- principal changes and updates, share notifications, participant identities

Supported-but-broken server behavior should fail tests. Unsupported capabilities are skipped based on the discovered session document.

## Project Structure

- [`src/core`](src/core) contains core protocol primitives and session helpers.
- [`src/mail`](src/mail) contains mail and identity types, methods, and convenience clients.
- [`src/quota`](src/quota), [`src/vacation`](src/vacation), [`src/contacts`](src/contacts), [`src/calendars`](src/calendars), [`src/tasks`](src/tasks), [`src/notes`](src/notes), [`src/sieve`](src/sieve), and [`src/principals`](src/principals) contain additional JMAP domains.
- [`src/jscalendar`](src/jscalendar) contains the JSCalendar objects calendars and tasks share: participants, alerts, recurrence rules, locations, links and relations.
- [`test`](test) contains unit tests and integration tests.

## Notes

- The library intentionally avoids framework-specific code.
- `fetch` is injectable in `JmapClient` for testability.
- Mapping JMAP-native data into UI or domain models is left to the consuming application.
- Browser-specific helpers, such as saving a download to disk, are left to the application.
