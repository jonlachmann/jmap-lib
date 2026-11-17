import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountId,
  CORE_TASKS_CAPABILITIES,
  JMAP_TASKS_CAPABILITY,
  JMAP_TASKS_RECURRENCES_CAPABILITY,
  JMAP_TASKS_ASSIGNEES_CAPABILITY,
  JMAP_TASKS_ALERTS_CAPABILITY,
  JMAP_TASKS_MULTILINGUAL_CAPABILITY,
  JMAP_TASKS_CUSTOMTIMEZONES_CAPABILITY,
  JmapClient,
  JmapTasks,
  TaskGet,
  TaskListGet,
  TaskListSet,
  TaskSet,
  TaskCopy,
  TaskQuery,
  TaskQueryChanges,
  TaskChanges,
  TaskListChanges,
  TaskNotificationGet,
  TaskNotificationSet,
  TaskNotificationQuery,
  TaskNotificationChanges,
  TaskNotificationQueryChanges,
  DEFAULT_TASK_PROPERTIES,
} from "jmap-lib";

// --- Capability constants ---

test("JMAP_TASKS_CAPABILITY has correct URI", () => {
  assert.equal(JMAP_TASKS_CAPABILITY, "urn:ietf:params:jmap:tasks");
});

test("extension capability URIs are correct", () => {
  assert.equal(JMAP_TASKS_RECURRENCES_CAPABILITY, "urn:ietf:params:jmap:tasks:recurrences");
  assert.equal(JMAP_TASKS_ASSIGNEES_CAPABILITY, "urn:ietf:params:jmap:tasks:assignees");
  assert.equal(JMAP_TASKS_ALERTS_CAPABILITY, "urn:ietf:params:jmap:tasks:alerts");
  assert.equal(JMAP_TASKS_MULTILINGUAL_CAPABILITY, "urn:ietf:params:jmap:tasks:multilingual");
  assert.equal(JMAP_TASKS_CUSTOMTIMEZONES_CAPABILITY, "urn:ietf:params:jmap:tasks:customtimezones");
});

test("CORE_TASKS_CAPABILITIES includes core and tasks", () => {
  assert.deepEqual([...CORE_TASKS_CAPABILITIES], ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:tasks"]);
});

// --- Method classes ---

test("TaskListGet.all creates a get-all request", () => {
  const method = TaskListGet.all(AccountId.of("acc"));
  assert.equal(method.methodName, "TaskList/get");
  assert.deepEqual(method.arguments, { accountId: "acc" });
});

test("TaskListChanges has correct method name", () => {
  const method = new TaskListChanges({ accountId: "acc", sinceState: "s1" });
  assert.equal(method.methodName, "TaskList/changes");
  assert.deepEqual(method.arguments, { accountId: "acc", sinceState: "s1" });
});

test("TaskListSet supports onDestroyRemoveTasks", () => {
  const method = new TaskListSet({
    accountId: "acc",
    destroy: ["tl-1"],
    onDestroyRemoveTasks: true,
  });
  assert.equal(method.methodName, "TaskList/set");
  assert.equal(method.arguments.onDestroyRemoveTasks, true);
});

test("TaskGet.byIds creates a get-by-ids request", () => {
  const method = TaskGet.byIds(AccountId.of("acc"), ["t1", "t2"], ["id", "title"]);
  assert.equal(method.methodName, "Task/get");
  assert.deepEqual(method.arguments, {
    accountId: "acc",
    ids: ["t1", "t2"],
    properties: ["id", "title"],
  });
});

test("TaskGet.byQueryResult encapsulates query result references", () => {
  const method = TaskGet.byQueryResult(AccountId.of("acc"), { value: "q1" } as never, ["id", "title"]);
  assert.deepEqual(method.arguments, {
    accountId: "acc",
    "#ids": {
      resultOf: "q1",
      name: "Task/query",
      path: "/ids",
    },
    properties: ["id", "title"],
  });
});

test("TaskChanges has correct method name", () => {
  const method = new TaskChanges({ accountId: "acc", sinceState: "s1" });
  assert.equal(method.methodName, "Task/changes");
});

test("TaskSet has correct method name", () => {
  const method = new TaskSet({
    accountId: "acc",
    create: { task: { taskListId: "tl-1", title: "Do it" } },
  });
  assert.equal(method.methodName, "Task/set");
  assert.deepEqual(method.arguments.create?.task, { taskListId: "tl-1", title: "Do it" });
});

test("TaskCopy preserves copy arguments", () => {
  const method = new TaskCopy({
    fromAccountId: "from-acc",
    accountId: "to-acc",
    create: { copy1: { id: "t-1", taskListId: "tl-1", title: "Copied" } },
    onSuccessDestroyOriginal: true,
  });
  assert.equal(method.methodName, "Task/copy");
  assert.equal(method.arguments.fromAccountId, "from-acc");
  assert.equal(method.arguments.onSuccessDestroyOriginal, true);
});

test("TaskQuery has correct method name", () => {
  const method = new TaskQuery({ accountId: "acc", filter: { inTaskList: "tl-1" } });
  assert.equal(method.methodName, "Task/query");
});

test("TaskQueryChanges has correct method name", () => {
  const method = new TaskQueryChanges({ accountId: "acc", sinceQueryState: "qs1" });
  assert.equal(method.methodName, "Task/queryChanges");
});

test("TaskNotificationGet.all creates a get-all request", () => {
  const method = TaskNotificationGet.all(AccountId.of("acc"));
  assert.equal(method.methodName, "TaskNotification/get");
  assert.deepEqual(method.arguments, { accountId: "acc" });
});

test("TaskNotificationChanges has correct method name", () => {
  const method = new TaskNotificationChanges({ accountId: "acc", sinceState: "s1" });
  assert.equal(method.methodName, "TaskNotification/changes");
});

test("TaskNotificationSet has correct method name", () => {
  const method = new TaskNotificationSet({ accountId: "acc", destroy: ["n1"] });
  assert.equal(method.methodName, "TaskNotification/set");
});

test("TaskNotificationQuery has correct method name", () => {
  const method = new TaskNotificationQuery({ accountId: "acc", filter: { type: "created" } });
  assert.equal(method.methodName, "TaskNotification/query");
});

test("TaskNotificationQueryChanges has correct method name", () => {
  const method = new TaskNotificationQueryChanges({ accountId: "acc", sinceQueryState: "qs1" });
  assert.equal(method.methodName, "TaskNotification/queryChanges");
});

// --- JmapTasks convenience client ---

function createMockClient(methodResponses: unknown[][]) {
  return new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core", JMAP_TASKS_CAPABILITY],
    fetch: async () => {
      return new Response(
        JSON.stringify({ methodResponses: methodResponses.map((r, i) => [...r, String(i)]) }),
        { status: 200 },
      );
    },
  });
}

test("JmapTasks.getTaskLists uses tasks capabilities", async () => {
  let using: string[] | undefined;
  const tasks = new JmapTasks(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      using = JSON.parse(String(init?.body)).using;
      return new Response(
        JSON.stringify({
          methodResponses: [["TaskList/get", { accountId: "acc", list: [{ id: "tl1", name: "My Tasks" }] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const result = (await tasks.getTaskLists(AccountId.of("acc"))).list;

  assert.equal(result[0].id, "tl1");
  assert.equal(result[0].name, "My Tasks");
  assert.deepEqual(using, [...CORE_TASKS_CAPABILITIES]);
});

test("JmapTasks.createTaskList returns created id", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["TaskList/set", { accountId: "acc", created: { new: { id: "tl-new" } } }],
  ]));

  const id = (await tasks.createTaskList(AccountId.of("acc"), { name: "Work" })).id;
  assert.equal(id, "tl-new");
});

test("JmapTasks.createTaskList throws on error", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["TaskList/set", { accountId: "acc", notCreated: { new: { description: "forbidden" } } }],
  ]));

  await assert.rejects(
    () => tasks.createTaskList(AccountId.of("acc"), { name: "Work" }),
    /forbidden/,
  );
});

test("JmapTasks.updateTaskList succeeds", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["TaskList/set", { accountId: "acc", updated: { "tl-1": null } }],
  ]));

  await tasks.updateTaskList(AccountId.of("acc"), "tl-1", { name: "Renamed" });
});

test("JmapTasks.updateTaskList throws on error", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["TaskList/set", { accountId: "acc", notUpdated: { "tl-1": { description: "nope" } } }],
  ]));

  await assert.rejects(
    () => tasks.updateTaskList(AccountId.of("acc"), "tl-1", { name: "x" }),
    /nope/,
  );
});

test("JmapTasks.destroyTaskList with onDestroyRemoveTasks", async () => {
  let sentArgs: unknown;
  const tasks = new JmapTasks(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      sentArgs = body.methodCalls[0][1];
      return new Response(
        JSON.stringify({
          methodResponses: [["TaskList/set", { accountId: "acc", destroyed: ["tl-1"] }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  await tasks.destroyTaskList(AccountId.of("acc"), "tl-1", true);
  assert.equal((sentArgs as { onDestroyRemoveTasks: boolean }).onDestroyRemoveTasks, true);
});

test("JmapTasks.listTasks batches query+get", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/query", { accountId: "acc", ids: ["t1"] }],
    ["Task/get", { accountId: "acc", list: [{ id: "t1", taskListId: "tl-1", title: "Buy milk" }] }],
  ]));

  const result = await tasks.listTasks(AccountId.of("acc"), ["tl-1"]);
  assert.equal(result[0].title, "Buy milk");
});

test("JmapTasks.queryTasks uses filter and sort", async () => {
  let sentArgs: Record<string, unknown> | undefined;
  const tasks = new JmapTasks(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      sentArgs = body.methodCalls[0][1] as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          methodResponses: [
            ["Task/query", { accountId: "acc", ids: ["t1"] }, "0"],
            ["Task/get", { accountId: "acc", list: [{ id: "t1", taskListId: "tl-1", title: "Test" }] }, "1"],
          ],
        }),
        { status: 200 },
      );
    },
  }));

  await tasks.queryTasks(AccountId.of("acc"), { text: "search" }, {
    sort: [{ property: "title", isAscending: true }],
    limit: 50,
  });

  assert.ok(sentArgs);
  assert.deepEqual(sentArgs.filter, { text: "search" });
  assert.deepEqual(sentArgs.sort, [{ property: "title", isAscending: true }]);
  assert.equal(sentArgs.limit, 50);
});

test("JmapTasks.getTask returns single task", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/get", { accountId: "acc", list: [{ id: "t1", taskListId: "tl-1", title: "Hello" }] }],
  ]));

  const task = await tasks.getTask(AccountId.of("acc"), "t1");
  assert.equal(task?.title, "Hello");
});

test("JmapTasks.getTask returns undefined for not found", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/get", { accountId: "acc", list: [], notFound: ["t1"] }],
  ]));

  const task = await tasks.getTask(AccountId.of("acc"), "t1");
  assert.equal(task, undefined);
});

test("JmapTasks.createTask returns created id", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/set", { accountId: "acc", created: { new: { id: "t-new" } } }],
  ]));

  const id = (await tasks.createTask(AccountId.of("acc"), {
    taskListId: "tl-1",
    title: "New task",
  })).id;
  assert.equal(id, "t-new");
});

test("JmapTasks.createTask throws on error", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/set", { accountId: "acc", notCreated: { new: { description: "invalid" } } }],
  ]));

  await assert.rejects(
    () => tasks.createTask(AccountId.of("acc"), { taskListId: "tl-1", title: "x" }),
    /invalid/,
  );
});

test("JmapTasks.updateTask succeeds", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/set", { accountId: "acc", updated: { "t-1": null } }],
  ]));

  await tasks.updateTask(AccountId.of("acc"), "t-1", { title: "Updated" });
});

test("JmapTasks.updateTask throws on error", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/set", { accountId: "acc", notUpdated: { "t-1": { description: "denied" } } }],
  ]));

  await assert.rejects(
    () => tasks.updateTask(AccountId.of("acc"), "t-1", { title: "x" }),
    /denied/,
  );
});

test("JmapTasks.destroyTask succeeds", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/set", { accountId: "acc", destroyed: ["t-1"] }],
  ]));

  await tasks.destroyTask(AccountId.of("acc"), "t-1");
});

test("JmapTasks.destroyTask throws on error", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/set", { accountId: "acc", notDestroyed: { "t-1": { description: "not found" } } }],
  ]));

  await assert.rejects(
    () => tasks.destroyTask(AccountId.of("acc"), "t-1"),
    /not found/,
  );
});

test("JmapTasks.copyTask returns created id", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/copy", { fromAccountId: "from", accountId: "to", created: { new: { id: "t-copied" } } }],
  ]));

  const { id } = await tasks.copyTask(
    AccountId.of("to"),
    AccountId.of("from"),
    { id: "t-1", taskListId: "tl-1", title: "Copied" },
  );
  assert.equal(id, "t-copied");
});

test("JmapTasks.copyTask throws on error", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/copy", { fromAccountId: "from", accountId: "to", notCreated: { new: { description: "quota" } } }],
  ]));

  await assert.rejects(
    () => tasks.copyTask(AccountId.of("to"), AccountId.of("from"), { id: "t-1", taskListId: "tl-1" }),
    /quota/,
  );
});

test("JmapTasks.getTaskListChanges delegates correctly", async () => {
  let sentArgs: unknown;
  const tasks = new JmapTasks(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      sentArgs = body.methodCalls[0][1];
      return new Response(
        JSON.stringify({
          methodResponses: [["TaskList/changes", {
            accountId: "acc", oldState: "s1", newState: "s2",
            hasMoreChanges: false, created: ["tl-new"], updated: [], destroyed: [],
          }, "0"]],
        }),
        { status: 200 },
      );
    },
  }));

  const result = await tasks.getTaskListChanges(AccountId.of("acc"), "s1", { maxChanges: 10 });
  assert.equal(result.newState, "s2");
  assert.deepEqual(result.created, ["tl-new"]);
  assert.deepEqual(sentArgs, { accountId: "acc", sinceState: "s1", maxChanges: 10 });
});

test("JmapTasks.getTaskChanges delegates correctly", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/changes", {
      accountId: "acc", oldState: "s1", newState: "s2",
      hasMoreChanges: false, created: [], updated: ["t-1"], destroyed: [],
    }],
  ]));

  const result = await tasks.getTaskChanges(AccountId.of("acc"), "s1");
  assert.equal(result.newState, "s2");
  assert.deepEqual(result.updated, ["t-1"]);
});

test("JmapTasks.queryTaskChanges delegates correctly", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["Task/queryChanges", {
      accountId: "acc", oldQueryState: "qs1", newQueryState: "qs2",
      removed: ["t-old"], added: [{ id: "t-new", index: 0 }],
    }],
  ]));

  const result = await tasks.queryTaskChanges(AccountId.of("acc"), {
    sinceQueryState: "qs1",
    filter: { inTaskList: "tl-1" },
  });
  assert.equal(result.newQueryState, "qs2");
  assert.deepEqual(result.removed, ["t-old"]);
});

test("JmapTasks.listNotifications returns notifications", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["TaskNotification/get", {
      accountId: "acc",
      list: [{ id: "n1", created: "2024-01-01T00:00:00Z", type: "created", taskId: "t-1" }],
    }],
  ]));

  const result = await tasks.listNotifications(AccountId.of("acc"));
  assert.equal(result[0].id, "n1");
  assert.equal(result[0].type, "created");
});

test("JmapTasks.queryNotifications passes filter and returns the notifications", async () => {
  let sentArgs: unknown;
  const tasks = new JmapTasks(new JmapClient({
    endpoint: "https://example.test/jmap",
    authorization: "Bearer secret",
    capabilities: ["urn:ietf:params:jmap:core"],
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      sentArgs = body.methodCalls[0][1];
      return new Response(
        JSON.stringify({
          methodResponses: [
            ["TaskNotification/query", { accountId: "acc", queryState: "qs1", ids: ["n1"], position: 0, total: 1 }, "0"],
            ["TaskNotification/get", {
              accountId: "acc",
              list: [{ id: "n1", created: "2024-01-01T00:00:00Z", type: "updated", taskId: "t-1" }],
            }, "1"],
          ],
        }),
        { status: 200 },
      );
    },
  }));

  const result = await tasks.queryNotifications(AccountId.of("acc"), { type: "updated" });
  assert.deepEqual(result.map((notification) => notification.id), ["n1"]);
  assert.equal((sentArgs as { filter: { type: string } }).filter.type, "updated");
});

test("JmapTasks.destroyNotification succeeds", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["TaskNotification/set", { accountId: "acc", destroyed: ["n1"] }],
  ]));

  await tasks.destroyNotification(AccountId.of("acc"), "n1");
});

test("JmapTasks.destroyNotification throws on error", async () => {
  const tasks = new JmapTasks(createMockClient([
    ["TaskNotification/set", { accountId: "acc", notDestroyed: { n1: { description: "forbidden" } } }],
  ]));

  await assert.rejects(
    () => tasks.destroyNotification(AccountId.of("acc"), "n1"),
    /forbidden/,
  );
});

test("DEFAULT_TASK_PROPERTIES contains core properties", () => {
  assert.ok(DEFAULT_TASK_PROPERTIES.includes("id"));
  assert.ok(DEFAULT_TASK_PROPERTIES.includes("taskListId"));
  assert.ok(DEFAULT_TASK_PROPERTIES.includes("title"));
  assert.ok(DEFAULT_TASK_PROPERTIES.includes("progress"));
  assert.ok(DEFAULT_TASK_PROPERTIES.includes("estimatedWork"));
  assert.ok(DEFAULT_TASK_PROPERTIES.includes("workflowStatus"));
  assert.ok(DEFAULT_TASK_PROPERTIES.includes("checklists"));
  assert.ok(DEFAULT_TASK_PROPERTIES.includes("comments"));
});
