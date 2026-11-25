# jmap-lib

Framework-agnostic TypeScript library for [JMAP](https://jmap.io), with typed protocol methods and convenience clients.

It keeps raw JMAP mechanics out of application code: you don't build method tuples, index into `methodResponses` or
write `#ids` result references by hand. Results come back as JMAP-native data, and mapping them into UI or domain
models is left to the application.

## Install

```bash
npm install jmap-lib
```

The package is ESM only, runs in Node 20+, browsers and bundlers, and ships its own types (TypeScript 5+).

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
  authorization: "Bearer token", // or a function that returns it before each request
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

To use the server's limits, account capabilities and blob URLs, discover the session first and pass it to the client:

```ts
const session = await discoverJmapSession({ baseUrl: "https://example.test", authorization });
const client = new JmapClient({ endpoint: session.apiUrl, authorization, capabilities, session });
const accountId = AccountId.of(resolvePrimaryAccountId(session)!);
```

## Coverage

| Area | Spec |
| --- | --- |
| Core, blob upload and download | RFC 8620 |
| Blob/get, Blob/upload | RFC 9404 |
| Mail, identities, submissions, vacation response | RFC 8621 |
| Quota | RFC 9425 |
| Contacts | RFC 9553, RFC 9610 |
| Calendars | draft-ietf-jmap-calendars-34, with events in JSCalendar-bis (draft-ietf-calext-jscalendarbis-22) |
| Tasks | draft-ietf-jmap-tasks-06 |
| Sieve | RFC 9661 |
| Principals and share notifications | RFC 9670 |
| Notes | [JMAP for Notes](https://openmailserver.org/jmap/notes) (draft-jmap-notes-00) |

Calendar events follow JSCalendar-bis, so an organizer is `organizerCalendarAddress`, not RFC 8984's `replyTo`.

Not implemented: Email/parse (RFC 8621), Blob/lookup (RFC 9404), Quota/changes, Quota/query and Quota/queryChanges
(RFC 9425) and CalendarEventNotification (draft-ietf-jmap-calendars). SieveScript and TaskNotification are implemented, but not every server offers them.

Notes is OpenMailServer's own extension, with the capability `https://openmailserver.org/jmap/notes`. Apart from it,
the library only implements JMAP RFCs and drafts. For a server's own extensions (methods,
capabilities, vendor properties), pass a method object `{ methodName, arguments }` to `client.invoke` or `batch`.

## API overview

All exports are in [`src/index.ts`](src/index.ts).

### Core

- `JmapClient` and `JmapBatch` send requests, and return a `JmapResponse`. `fetch` is injectable.
- Errors: `JmapHttpError` (with RFC 8620 3.6.1 problem details), `JmapNetworkError`, `JmapProtocolError`,
  `JmapUploadTooLargeError`, and `JmapSetRefusedError`, which `assertSetOk` throws with the `SetError` of a refused
  /set or /copy.
- Sessions: `discoverJmapSession`, `resolvePrimaryAccountId`, `sharedAccounts` (accounts shared with the user that
  have a capability), `createBasicAuthorizationHeader` and `expandUriTemplate`.
- Ids and capabilities: `AccountId`, `MailboxId`, `CallId`, and capability constants such as `JMAP_MAIL_CAPABILITY`.
- Requests: `resultOf` (a result reference to an earlier call in the same request), `paginate` (every page of a
  query with its objects), and `getInChunks` and `setInChunks` (a /get or /set split by the session's
  `maxObjectsInGet` or `maxObjectsInSet`).
- Patches: `applyPatch` applies a PatchObject to a copy of an object, and `patchPathKey` escapes a key for a patch path.
- Rights names as lists: `MAILBOX_RIGHTS`, `CALENDAR_RIGHTS`, `ADDRESS_BOOK_RIGHTS`, `TASK_RIGHTS`, `NOTE_BOOK_RIGHTS`.
- Push: `connectEventStream` (RFC 8620 7.3) reports its connection state as `live`, `reconnecting`, `unreachable`
  (still retrying), `unauthorized` (signed out, or refused with 401 or 403, after which it stops) or `closed`.
- Blobs: `client.upload`, `client.download` and `client.downloadUrl` need the client's `session` option. Uploads over
  the session's `maxSizeUpload` are refused before they're sent.

### Domains

Each domain has low-level method classes (such as `MailboxGet`, `EmailQuery` and `EmailSet`, plus their /changes and
/queryChanges) and a convenience client:

`JmapMail`, `JmapIdentities`, `JmapQuota`, `JmapVacation`, `JmapContacts`, `JmapCalendars`, `JmapTasks`, `JmapNotes`,
`JmapSieve`, `JmapPrincipals`.

The JSCalendar objects that calendars and tasks share (participants, alerts, recurrence rules, locations, links and
relations) are typed in [`src/jscalendar`](src/jscalendar).

## Development

```bash
npm install
npm run build             # compiles src/ into dist/
npm test                  # typecheck, unit and integration tests
npm run test:unit
npm run test:integration
npm run test:dist         # builds dist/ and imports it in plain Node
```

Tests run from the TypeScript sources with `tsx`. Integration test files run one at a time, because they share one
account.

### Integration tests

Integration tests discover the session through `.well-known/jmap` and sign in with HTTP Basic Auth. Create an env file:

```bash
cp .env.integration.example .env.integration
```

and fill it in:

```env
JMAP_BASE_URL=https://your-server.example
JMAP_USERNAME=your-username
JMAP_PASSWORD=your-password
# optional
# JMAP_ACCOUNT_ID=your-account-id
```

Without these variables, integration tests are skipped. Capabilities the server doesn't advertise are skipped too,
and a supported capability that misbehaves fails its test. The suite covers session discovery, mailboxes and email,
identities, submissions, Email/import and Email/copy, vacation response, quota, sieve, contacts, calendars and
participant identities, tasks, blobs, and principals and share notifications.

## License

MIT
