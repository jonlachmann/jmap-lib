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

  assert.equal(keywordPath, "keywords/$seen");
  assert.equal(mailboxPath, "mailboxIds/archive");
});

test("JmapPatchValueAtPath resolves the value type at a nested patch key", () => {
  const keywordValue: JmapPatchValueAtPath<EmailMutable, "keywords/$seen"> = true;
  const mailboxValue: JmapPatchValueAtPath<EmailMutable, "mailboxIds/archive"> = true;

  assert.equal(keywordValue, true);
  assert.equal(mailboxValue, true);
});

test("JmapPatchObject supports both whole-property updates and nested patch paths", () => {
  const patch: JmapPatchObject<EmailMutable> = {
    keywords: {
      "$seen": true,
      "$flagged": true,
    },
    "keywords/$seen": null,
    "mailboxIds/archive": true,
  };

  assert.equal(patch.keywords?.["$flagged"], true);
  assert.equal(patch["keywords/$seen"], null);
  assert.equal(patch["mailboxIds/archive"], true);
});

test("EmailUpdate patches only mailboxes and keywords (RFC 8621 4.6)", () => {
  const update: EmailUpdate = {
    "keywords/$flagged": true,
    "mailboxIds/inbox": true,
  };
  // @ts-expect-error An Email's other properties are fixed once it is made
  const immutable: EmailUpdate = { subject: "Updated" };

  assert.ok(immutable);
  assert.equal(update["keywords/$flagged"], true);
  assert.equal(update["mailboxIds/inbox"], true);
});
