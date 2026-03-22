import test from "node:test";
import assert from "node:assert/strict";

import { AccountId, CallId, MailboxId } from "jmap-lib";

test("identifier value objects expose their wrapped value", () => {
  const accountId = AccountId.of("acc-1");
  const mailboxId = MailboxId.of("mbox-1");
  const callId = CallId.of("call-1");

  assert.equal(accountId.value, "acc-1");
  assert.equal(mailboxId.value, "mbox-1");
  assert.equal(callId.value, "call-1");
});
