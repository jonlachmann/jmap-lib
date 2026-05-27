import assert from "node:assert/strict";
import type { TestContext } from "node:test";

import { JMAP_TASKS_CAPABILITY, JmapTasks, type TaskList } from "jmap-lib";
import { loadSingleUserIntegrationConfig } from "./config.js";
import { createIntegrationClientContext, type IntegrationClientContext } from "./client.js";
import { hasServerCapability } from "./capabilities.js";

export interface TasksIntegrationContext {
  context: IntegrationClientContext;
  tasksClient: JmapTasks;
  taskLists: TaskList[];
  taskList: TaskList;
}

export async function createTasksIntegrationContext(
  t: TestContext,
): Promise<TasksIntegrationContext | undefined> {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  if (!hasServerCapability(context.session, JMAP_TASKS_CAPABILITY)) {
    t.skip(`server does not advertise ${JMAP_TASKS_CAPABILITY}`);
    return undefined;
  }

  const tasksClient = new JmapTasks(context.client);
  const taskLists = await tasksClient.listTaskLists(context.accountId);
  assert.ok(taskLists.length > 0, "expected at least one task list");

  return {
    context,
    tasksClient,
    taskLists,
    taskList: taskLists[0],
  };
}
