import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  EmailGet,
  MailboxGet,
  type JmapGetArgs,
} from "jmap-lib";

test("JmapGetArgs models the shared RFC get arguments", () => {
  const args: JmapGetArgs<"id" | "name"> = {
    accountId: "acc",
    ids: ["a", "b"],
    properties: ["id", "name"],
  };

  assert.equal(args.accountId, "acc");
  assert.deepEqual(args.ids, ["a", "b"]);
  assert.deepEqual(args.properties, ["id", "name"]);
});

test("MailboxGet accepts the standard shared get arguments", () => {
  const method = new MailboxGet({
    accountId: AccountId.of("acc").value,
    ids: ["inbox"],
    properties: ["id", "name", "role"],
  });

  assert.deepEqual(method.arguments, {
    accountId: "acc",
    ids: ["inbox"],
    properties: ["id", "name", "role"],
  });
});

test("EmailGet combines shared get arguments with result references", () => {
  const method = EmailGet.byIds(AccountId.of("acc"), ["email-1"], ["id", "threadId"]);

  assert.deepEqual(method.arguments, {
    accountId: "acc",
    ids: ["email-1"],
    properties: ["id", "threadId"],
  });
});
