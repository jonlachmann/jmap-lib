# jmap-lib

Framework-agnostic TypeScript primitives and convenience clients for working with JMAP.

The library is designed to keep raw JMAP mechanics out of application code. Consumers should not need to:
- build raw JMAP method tuples
- index into `methodResponses`
- hand-construct `#ids` result references

It currently covers:
- core request/response primitives
- mail
- identities and submission-related methods
- quota
- vacation response
- contacts
- calendars
- sieve
- unit tests and real-server integration tests

## Goals

- strong typing without a heavy runtime layer
- framework-agnostic design
- compact, composable API surface
- JMAP-native data returned to callers
- real integration coverage against a JMAP server

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

Run integration tests against compiled output:

```bash
npm run test:integration
```

Run tests directly from TypeScript with `tsx`:

```bash
npm run test:tsx
npm run test:integration:tsx
```

The `tsx` scripts are useful for IDE runs, especially WebStorm.

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

Mail:
- low-level methods:
  `MailboxGet`, `EmailQuery`, `EmailGet`, `EmailSet`, `EmailSubmissionSet`, `ThreadGet`, `IdentityGet`, `IdentitySet`
- convenience clients:
  `JmapMail`, `JmapIdentities`

Other domains:
- `JmapQuota`
- `JmapVacation`
- `JmapContacts`
- `JmapCalendars`
- `JmapSieve`

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
  accessToken: "token",
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

Supported-but-broken server behavior should fail tests. Unsupported capabilities are skipped based on the discovered session document.

## Project Structure

- [`src/core`](src/core) contains core protocol primitives and session helpers.
- [`src/mail`](src/mail) contains mail and identity types, methods, and convenience clients.
- [`src/quota`](src/quota), [`src/vacation`](src/vacation), [`src/contacts`](src/contacts), [`src/calendars`](src/calendars), and [`src/sieve`](src/sieve) contain additional JMAP domains.
- [`test`](test) contains unit tests and integration tests.

## Notes

- The library intentionally avoids framework-specific code.
- `fetch` is injectable in `JmapClient` for testability.
- Mapping JMAP-native data into UI or domain models is left to the consuming application.
- Blob upload/download and browser-specific helpers are intentionally not part of the current surface.
