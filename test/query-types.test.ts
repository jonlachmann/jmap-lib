import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  ContactCardQuery,
  EmailQuery,
  type FilterOperatorCondition,
  type JmapQueryArgs,
  type JmapComparator,
} from "jmap-lib";

test("JmapQueryArgs models the shared RFC query arguments", () => {
  type Filter = { text?: string };
  type Sort = JmapComparator<"name">;

  const args: JmapQueryArgs<Filter, Sort> = {
    accountId: "acc",
    filter: { text: "alice" },
    sort: [{ property: "name", isAscending: true, collation: "i;unicode-casemap" }],
    position: -5,
    anchor: "contact-1",
    anchorOffset: 2,
    limit: 10,
    calculateTotal: true,
  };

  assert.equal(args.accountId, "acc");
  assert.equal(args.position, -5);
  assert.equal(args.anchor, "contact-1");
  assert.equal(args.anchorOffset, 2);
  assert.equal(args.sort?.[0].collation, "i;unicode-casemap");
});

test("FilterOperatorCondition models nested RFC query filters", () => {
  type Condition = { inMailbox?: string; text?: string };

  const filter: FilterOperatorCondition<Condition> = {
    operator: "AND",
    conditions: [
      { inMailbox: "inbox" },
      {
        operator: "OR",
        conditions: [
          { text: "invoice" },
          { text: "receipt" },
        ],
      },
    ],
  };

  assert.equal(filter.operator, "AND");
  assert.equal(filter.conditions[1].operator, "OR");
});

test("EmailQuery accepts shared query arguments in addition to mail-specific filter and sort", () => {
  const method = new EmailQuery({
    accountId: AccountId.of("acc").value,
    filter: {
      operator: "AND",
      conditions: [
        { inMailbox: "inbox" },
        { text: "hello" },
      ],
    },
    sort: [{ property: "receivedAt", isAscending: false }],
    anchor: "email-10",
    anchorOffset: -2,
    limit: 20,
    calculateTotal: true,
  });

  assert.equal(method.arguments.anchor, "email-10");
  assert.equal(method.arguments.anchorOffset, -2);
  assert.equal(method.arguments.sort?.[0].property, "receivedAt");
  assert.equal(method.arguments.filter?.operator, "AND");
});

test("ContactCardQuery accepts shared query arguments for custom contact flows", () => {
  const method = new ContactCardQuery({
    accountId: AccountId.of("acc").value,
    filter: { text: "alice" },
    sort: [{ property: "name", isAscending: true }],
    position: 10,
    limit: 5,
  });

  assert.equal(method.arguments.position, 10);
  assert.equal(method.arguments.limit, 5);
  assert.equal(method.arguments.sort?.[0].property, "name");
});
