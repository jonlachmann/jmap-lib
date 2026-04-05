import test from "node:test";
import assert from "node:assert/strict";

import type {
  EmailMutable,
  EmailUpdate,
  JmapNestedPatchPath,
  JmapPatchObject,
  JmapPatchValueAtPath,
} from "jmap-lib";

test("JmapNestedPatchPath generates nested patch keys from a known shape", () => {
  const keywordPath: JmapNestedPatchPath<EmailMutable> = "keywords/$seen";
  const mailboxPath: JmapNestedPatchPath<EmailMutable> = "mailboxIds/archive";
  const addressPath: JmapNestedPatchPath<EmailMutable> = "from/0/email";

  assert.equal(keywordPath, "keywords/$seen");
  assert.equal(mailboxPath, "mailboxIds/archive");
  assert.equal(addressPath, "from/0/email");
});

test("JmapPatchValueAtPath resolves the value type at a nested patch key", () => {
  const keywordValue: JmapPatchValueAtPath<EmailMutable, "keywords/$seen"> = true;
  const addressValue: JmapPatchValueAtPath<EmailMutable, "from/0/email"> = "user@example.test";

  assert.equal(keywordValue, true);
  assert.equal(addressValue, "user@example.test");
});

test("JmapPatchObject supports both whole-property updates and nested patch paths", () => {
  const patch: JmapPatchObject<EmailMutable> = {
    keywords: {
      "$seen": true,
      "$flagged": true,
    },
    "keywords/$seen": null,
    "mailboxIds/archive": true,
    "from/0/email": "updated@example.test",
  };

  assert.equal(patch.keywords?.["$flagged"], true);
  assert.equal(patch["keywords/$seen"], null);
  assert.equal(patch["mailboxIds/archive"], true);
  assert.equal(patch["from/0/email"], "updated@example.test");
});

test("EmailUpdate is a JMAP patch object over the email mutable shape", () => {
  const update: EmailUpdate = {
    subject: "Updated",
    "keywords/$flagged": true,
    "mailboxIds/inbox": true,
  };

  assert.equal(update.subject, "Updated");
  assert.equal(update["keywords/$flagged"], true);
  assert.equal(update["mailboxIds/inbox"], true);
});
