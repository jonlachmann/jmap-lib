import test from "node:test";
import assert from "node:assert/strict";

import { EmailSet, type EmailSetRequest, type EmailUpdate } from "jmap-lib";

test("EmailSetRequest supports full keywords updates", () => {
  const request: EmailSetRequest = {
    accountId: "acc",
    update: {
      "email-1": {
        keywords: {
          "$seen": true,
          "$flagged": true,
        },
      },
    },
  };

  assert.equal(request.update?.["email-1"]?.keywords?.["$seen"], true);
  assert.equal(request.update?.["email-1"]?.keywords?.["$flagged"], true);
});

test("EmailSetRequest supports slash-path keyword patches", () => {
  const update: EmailUpdate = {
    "keywords/$seen": null,
    "keywords/$flagged": true,
  };

  const method = new EmailSet({
    accountId: "acc",
    update: {
      "email-1": update,
    },
  });

  assert.equal(method.arguments.update?.["email-1"]?.["keywords/$seen"], null);
  assert.equal(method.arguments.update?.["email-1"]?.["keywords/$flagged"], true);
});

test("EmailSetRequest supports slash-path mailbox patches", () => {
  const method = new EmailSet({
    accountId: "acc",
    update: {
      "email-1": {
        "mailboxIds/inbox": true,
        "mailboxIds/archive": null,
      },
    },
  });

  assert.equal(method.arguments.update?.["email-1"]?.["mailboxIds/inbox"], true);
  assert.equal(method.arguments.update?.["email-1"]?.["mailboxIds/archive"], null);
});
