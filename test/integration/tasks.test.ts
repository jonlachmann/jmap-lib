import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_TASK_PROPERTIES,
  TaskGet,
  TaskQuery,
  type TaskQueryRequest,
  type TaskQueryResponse,
} from "jmap-lib";
import {
  getSingleUserIntegrationSkipReason,
} from "./helpers/config.js";
import { createTasksIntegrationContext } from "./helpers/tasks.js";
import { createIntegrationId } from "./helpers/ids.js";

const skip = getSingleUserIntegrationSkipReason();

// --- TaskList integration tests ---

test("integration: lists task lists when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { taskLists } = setup;

  assert.ok(Array.isArray(taskLists));
  for (const taskList of taskLists) {
    assert.equal(typeof taskList.id, "string");
    assert.equal(typeof taskList.name, "string");
  }
});

test("integration: creates a task list when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient } = setup;
  const clientId = createIntegrationId("create-tasklist");
  const taskListId = (await tasksClient.createTaskList(context.accountId, {
    name: `Integration ${clientId}`,
    color: "#336699",
  })).id;

  try {
    assert.equal(typeof taskListId, "string");
    assert.ok(taskListId.length > 0, "expected created task list id");
  } finally {
    await tasksClient.destroyTaskList(context.accountId, taskListId, true);
  }
});

test("integration: updates a task list when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient } = setup;
  const clientId = createIntegrationId("update-tasklist");
  const taskListId = (await tasksClient.createTaskList(context.accountId, {
    name: `Original ${clientId}`,
    color: "#336699",
  })).id;

  try {
    const updatedName = `Updated ${clientId}`;
    await tasksClient.updateTaskList(context.accountId, taskListId, {
      name: updatedName,
      color: "#663399",
    });

    const taskLists = await tasksClient.listTaskLists(context.accountId);
    const updated = taskLists.find((tl) => tl.id === taskListId);
    assert.ok(updated, "expected updated task list to be listed");
    assert.equal(updated.name, updatedName);
    assert.equal(updated.color, "#663399");
  } finally {
    await tasksClient.destroyTaskList(context.accountId, taskListId, true);
  }
});

test("integration: destroys a task list when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient } = setup;
  const clientId = createIntegrationId("destroy-tasklist");
  const taskListId = (await tasksClient.createTaskList(context.accountId, {
    name: `Destroy ${clientId}`,
    color: "#336699",
  })).id;

  await tasksClient.destroyTaskList(context.accountId, taskListId, true);

  const taskLists = await tasksClient.listTaskLists(context.accountId);
  assert.equal(
    taskLists.some((tl) => tl.id === taskListId),
    false,
  );
});

// --- Task integration tests ---

test("integration: lists tasks when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient, taskList } = setup;
  const tasks = await tasksClient.listTasks(
    context.accountId,
    [taskList.id],
    DEFAULT_TASK_PROPERTIES,
  );

  assert.ok(Array.isArray(tasks));
  for (const task of tasks.slice(0, 10)) {
    assert.equal(typeof task.id, "string");
    assert.equal(typeof task.taskListId, "string");
  }
});

test("integration: creates a task when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient, taskList } = setup;

  const taskClientId = createClientId("create-task");
  const taskId = (await tasksClient.createTask(
    context.accountId,
    buildTaskPayload(taskList.id, "Create task"),
  )).id;

  try {
    assert.equal(typeof taskId, "string");
    assert.ok(taskId.length > 0, "expected created task id");
  } finally {
    await tasksClient.destroyTask(context.accountId, taskId);
  }
});

test("integration: gets a created task when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient, taskList } = setup;

  const taskClientId = createClientId("get-task");
  const taskId = (await tasksClient.createTask(
    context.accountId,
    buildTaskPayload(taskList.id, "Get task"),
  )).id;

  try {
    const task = await tasksClient.getTask(
      context.accountId,
      taskId,
      DEFAULT_TASK_PROPERTIES,
    );

    assert.ok(task, "expected created task to be fetchable");
    assert.equal(task?.id, taskId);
    assert.equal(task?.taskListId, taskList.id);
  } finally {
    await tasksClient.destroyTask(context.accountId, taskId);
  }
});

test("integration: updates a task when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient, taskList } = setup;

  const updatedTitle = `Updated task ${Date.now()}`;
  const taskClientId = createClientId("update-task");
  const taskId = (await tasksClient.createTask(
    context.accountId,
    buildTaskPayload(taskList.id, "Original task"),
  )).id;

  try {
    await tasksClient.updateTask(context.accountId, taskId, {
      title: updatedTitle,
      description: "Updated by integration test",
    });

    const task = await tasksClient.getTask(
      context.accountId,
      taskId,
      DEFAULT_TASK_PROPERTIES,
    );

    assert.ok(task, "expected updated task to be fetchable");
    assert.equal(task?.title, updatedTitle);
  } finally {
    await tasksClient.destroyTask(context.accountId, taskId);
  }
});

test("integration: destroys a task when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient, taskList } = setup;

  const taskClientId = createClientId("destroy-task");
  const taskId = (await tasksClient.createTask(
    context.accountId,
    buildTaskPayload(taskList.id, "Destroy task"),
  )).id;

  await tasksClient.destroyTask(context.accountId, taskId);

  const task = await tasksClient.getTask(
    context.accountId,
    taskId,
    DEFAULT_TASK_PROPERTIES,
  );

  assert.equal(task, undefined);
});

test("integration: queries tasks when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient } = setup;
  const tasks = await tasksClient.queryTasks(
    context.accountId,
    {},
    { limit: 10, properties: DEFAULT_TASK_PROPERTIES },
  );

  assert.ok(Array.isArray(tasks));
  assert.ok(tasks.length <= 10);
});

test("integration: queries tasks with an operator filter when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, taskList } = setup;

  const batch = context.client.batch();
  const queryCallId = batch.call(new TaskQuery({
    accountId: context.accountId.value,
    filter: {
      operator: "AND",
      conditions: [
        { inTaskLists: [taskList.id] },
      ],
    },
    limit: 10,
  }));
  const getCallId = batch.call(
    TaskGet.byQueryResult(context.accountId, queryCallId, DEFAULT_TASK_PROPERTIES),
  );

  const response = await batch.send();
  const query = response.get<{ ids: string[] }>(queryCallId, "Task/query");
  const tasks = response.get<{ list: Array<{ id: string; taskListId: string }> }>(
    getCallId,
    "Task/get",
  ).list;

  assert.ok(Array.isArray(query.ids));
  assert.ok(tasks.length <= 10);
  for (const task of tasks) {
    assert.equal(typeof task.id, "string");
    assert.equal(typeof task.taskListId, "string");
  }
});

test("integration: queries seeded tasks and reports query changes deterministically", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient, taskList } = setup;
  const marker = createIntegrationId("query-tasks");

  const initialQuery = await context.client.invoke<TaskQueryRequest, TaskQueryResponse>(new TaskQuery({
    accountId: context.accountId.value,
    filter: {
      operator: "AND",
      conditions: [
        { inTaskLists: [taskList.id] },
        { title: marker },
      ],
    },
    limit: 10,
    calculateTotal: true,
  }));

  assert.deepEqual(initialQuery.ids, []);
  assert.ok(initialQuery.queryState, "expected initial task query state");

  const firstTaskId = (await tasksClient.createTask(
    context.accountId,
    buildTaskPayload(taskList.id, `${marker}-alpha`),
  )).id;
  const secondTaskId = (await tasksClient.createTask(
    context.accountId,
    buildTaskPayload(taskList.id, `${marker}-beta`),
  )).id;

  try {
    const batch = context.client.batch();
    const queryCallId = batch.call(new TaskQuery({
      accountId: context.accountId.value,
      filter: {
        operator: "AND",
        conditions: [
          { inTaskLists: [taskList.id] },
          { title: marker },
        ],
      },
      limit: 10,
    }));
    const getCallId = batch.call(
      TaskGet.byQueryResult(context.accountId, queryCallId, DEFAULT_TASK_PROPERTIES),
    );

    const response = await batch.send();
    const query = response.get<{ ids: string[] }>(queryCallId, "Task/query");
    const tasks = response.get<{ list: Array<{ id: string }> }>(getCallId, "Task/get").list;
    const changes = await tasksClient.queryTaskChanges(context.accountId, {
      filter: {
        operator: "AND",
        conditions: [
          { inTaskLists: [taskList.id] },
          { title: marker },
        ],
      },
      sinceQueryState: initialQuery.queryState!,
      calculateTotal: true,
    });

    assert.ok(query.ids.includes(firstTaskId), "expected first seeded task in query results");
    assert.ok(query.ids.includes(secondTaskId), "expected second seeded task in query results");
    assert.ok(tasks.some((task) => task.id === firstTaskId));
    assert.ok(tasks.some((task) => task.id === secondTaskId));
    assert.deepEqual(changes.removed, []);
    assert.ok(changes.added?.some((entry) => entry.id === firstTaskId));
    assert.ok(changes.added?.some((entry) => entry.id === secondTaskId));
    assert.equal(changes.total, query.ids.length);
  } finally {
    await tasksClient.destroyTask(context.accountId, firstTaskId);
    await tasksClient.destroyTask(context.accountId, secondTaskId);
  }
});

test("integration: tracks task list changes when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient } = setup;
  const clientId = createIntegrationId("changes-tasklist");
  const taskListId = (await tasksClient.createTaskList(context.accountId, {
    name: `Changes ${clientId}`,
  })).id;

  try {
    const changes = await tasksClient.getTaskListChanges(context.accountId, "0");
    assert.equal(typeof changes.newState, "string");
    assert.ok(changes.newState.length > 0);
  } finally {
    await tasksClient.destroyTaskList(context.accountId, taskListId, true);
  }
});

test("integration: tracks task changes when tasks is supported", { skip }, async (t) => {
  const setup = await createTasksIntegrationContext(t);
  if (!setup) return;
  const { context, tasksClient, taskList } = setup;

  const taskClientId = createClientId("changes-task");
  const taskId = (await tasksClient.createTask(
    context.accountId,
    buildTaskPayload(taskList.id, "Changes task"),
  )).id;

  try {
    const changes = await tasksClient.getTaskChanges(context.accountId, "0");
    assert.equal(typeof changes.newState, "string");
    assert.ok(changes.newState.length > 0);
  } finally {
    await tasksClient.destroyTask(context.accountId, taskId);
  }
});

function createClientId(prefix: string): string {
  return createIntegrationId(prefix);
}

function buildTaskPayload(taskListId: string, title: string) {
  return {
    taskListId,
    title,
    description: "Created by integration test",
  };
}
