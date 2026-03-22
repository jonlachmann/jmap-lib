# jmap-lib

Minimal, framework-agnostic TypeScript primitives for working with JMAP.

The library encapsulates:
- JMAP method tuple creation
- `methodResponses` lookup
- `#ids` result references for common mail flows

It currently includes:
- a low-level typed JMAP client
- typed mail methods for `Mailbox/get`, `Email/query`, and `Email/get`
- a small convenience layer for mailbox listing and paged email listing
- unit tests plus a real-server integration harness

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

Run unit tests plus integration tests:

```bash
npm test
```

Run only unit tests:

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

The `tsx` scripts are useful for IDE runs, especially WebStorm, where direct Node execution of `.ts` tests can hit ESM/type-stripping issues.

## Integration Test Setup

Integration tests use:
- `.well-known/jmap` session discovery
- HTTP Basic Auth

Copy the example env file:

```bash
cp .env.integration.example .env.integration
```

Then set:

```env
JMAP_BASE_URL=https://your-server.example
JMAP_USERNAME=your-username
JMAP_PASSWORD=your-password
# optional
# JMAP_ACCOUNT_ID=your-account-id
```

Integration tests skip cleanly when the required variables are missing.

Future two-user env vars are scaffolded in [`.env.integration.example`](.env.integration.example).

## Public API

Exports are defined in [`src/index.ts`](src/index.ts).

Core:
- `JmapClient`
- `JmapBatch`
- `JmapResponse`
- `AccountId`
- `MailboxId`
- `CallId`
- `discoverJmapSession`
- `resolvePrimaryAccountId`

Mail:
- `MailboxGet`
- `EmailQuery`
- `EmailGet`
- `JmapMail`

## Example

```ts
import { AccountId, JmapClient, JmapMail, MailboxGet } from "jmap-lib";

const client = new JmapClient({
  endpoint: "https://example.test/jmap/api",
  accessToken: "token",
  capabilities: [
    "urn:ietf:params:jmap:core",
    "urn:ietf:params:jmap:mail",
  ],
});

const accountId = AccountId.of("account-1");
const mailboxes = await client.invoke(MailboxGet.all(accountId));

const mail = new JmapMail(client);
const page = await mail.listPage({ accountId, limit: 10 });
```

## Project Structure

- [`src/core`](src/core) contains protocol primitives and session helpers.
- [`src/mail`](src/mail) contains mail types, methods, and convenience operations.
- [`test`](test) contains unit tests and integration helpers/tests.

## Notes

- The library is intentionally compact and avoids framework-specific code.
- Fetch is injected into `JmapClient` for testability.
- Mapping JMAP data into UI/domain models is left to the consuming application.
