import test from "node:test";
import assert from "node:assert/strict";

import {
  EmailChanges,
  IdentityChanges,
  MailboxChanges,
  ThreadChanges,
  type JmapChangesArgs,
} from "jmap-lib";

test("JmapChangesArgs models the shared RFC changes arguments", () => {
  const args: JmapChangesArgs = {
    accountId: "acc",
    sinceState: "s1",
    maxChanges: 20,
  };

  assert.equal(args.accountId, "acc");
  assert.equal(args.sinceState, "s1");
  assert.equal(args.maxChanges, 20);
});

test("MailboxChanges preserves shared changes arguments", () => {
  const method = new MailboxChanges({
    accountId: "acc",
    sinceState: "mailboxes-1",
    maxChanges: 10,
  });

  assert.equal(method.methodName, "Mailbox/changes");
  assert.equal(method.arguments.sinceState, "mailboxes-1");
});

test("EmailChanges preserves shared changes arguments", () => {
  const method = new EmailChanges({
    accountId: "acc",
    sinceState: "emails-1",
  });

  assert.equal(method.methodName, "Email/changes");
  assert.equal(method.arguments.sinceState, "emails-1");
});

test("ThreadChanges preserves shared changes arguments", () => {
  const method = new ThreadChanges({
    accountId: "acc",
    sinceState: "threads-1",
  });

  assert.equal(method.methodName, "Thread/changes");
  assert.equal(method.arguments.sinceState, "threads-1");
});

test("IdentityChanges preserves shared changes arguments", () => {
  const method = new IdentityChanges({
    accountId: "acc",
    sinceState: "identities-1",
  });

  assert.equal(method.methodName, "Identity/changes");
  assert.equal(method.arguments.sinceState, "identities-1");
});
