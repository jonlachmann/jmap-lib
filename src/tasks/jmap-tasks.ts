import { CORE_TASKS_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import type { JmapChangesResponse } from "../core/changes";
import type { FilterOperatorCondition } from "../core/query";
import type { JmapSetResponse } from "../core/set";
import { getSetError } from "../core/set";
import {
  TaskGet,
  TaskListChanges,
  TaskListGet,
  TaskListSet,
  TaskChanges,
  TaskCopy,
  TaskQuery,
  TaskQueryChanges,
  TaskSet,
  TaskNotificationGet,
  TaskNotificationSet,
  TaskNotificationQuery,
} from "./methods";
import type {
  Task,
  TaskChangesRequest,
  TaskCreate,
  TaskCopyRequest,
  TaskCopyResponse,
  TaskFilter,
  TaskGetRequest,
  TaskGetResponse,
  TaskList,
  TaskListChangesRequest,
  TaskListCreate,
  TaskListGetRequest,
  TaskListGetResponse,
  TaskListSetRequest,
  TaskListUpdate,
  TaskProperty,
  TaskQueryChangesRequest,
  TaskQueryChangesResponse,
  TaskQueryRequest,
  TaskQueryResponse,
  TaskQuerySort,
  TaskSetRequest,
  TaskUpdate,
  TaskNotification,
  TaskNotificationFilter,
  TaskNotificationGetRequest,
  TaskNotificationGetResponse,
  TaskNotificationQueryRequest,
  TaskNotificationQueryResponse,
  TaskNotificationQuerySort,
  TaskNotificationSetRequest,
} from "./types";

export const DEFAULT_TASK_PROPERTIES = [
  "id",
  "taskListIds",
  "isDraft",
  "uid",
  "@type",
  "created",
  "updated",
  "title",
  "description",
  "descriptionContentType",
  "start",
  "due",
  "duration",
  "timeZone",
  "showWithoutTime",
  "progress",
  "progressUpdated",
  "percentComplete",
  "estimatedWork",
  "impact",
  "workflowStatus",
  "sortOrder",
  "priority",
  "privacy",
  "replyTo",
  "color",
  "keywords",
  "categories",
  "locations",
  "virtualLocations",
  "links",
  "relatedTo",
  "checklists",
  "comments",
] as const satisfies readonly TaskProperty[];

export class JmapTasks {
  constructor(private readonly client: JmapClient) {}

  // --- TaskList operations ---

  async listTaskLists(accountId: AccountId): Promise<TaskList[]> {
    const response = await this.client.invoke<TaskListGetRequest, TaskListGetResponse>(
      TaskListGet.all(accountId),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );
    return response.list;
  }

  async getTaskListChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<JmapChangesResponse> {
    return this.client.invoke<TaskListChangesRequest, JmapChangesResponse>(
      new TaskListChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );
  }

  async createTaskList(
    accountId: AccountId,
    clientId: string,
    taskList: TaskListCreate,
  ): Promise<string> {
    const response = await this.client.invoke<TaskListSetRequest, JmapSetResponse>(
      new TaskListSet({
        accountId: accountId.value,
        create: { [clientId]: taskList },
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create task list");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("TaskList/set did not return an id");
    }

    return createdId;
  }

  async updateTaskList(
    accountId: AccountId,
    taskListId: string,
    updates: TaskListUpdate,
  ): Promise<void> {
    const response = await this.client.invoke<TaskListSetRequest, JmapSetResponse>(
      new TaskListSet({
        accountId: accountId.value,
        update: { [taskListId]: updates },
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", taskListId);
    if (error) {
      throw new Error(error.description || "Failed to update task list");
    }
  }

  async destroyTaskList(
    accountId: AccountId,
    taskListId: string,
    onDestroyRemoveTasks?: boolean,
  ): Promise<void> {
    const response = await this.client.invoke<TaskListSetRequest, JmapSetResponse>(
      new TaskListSet({
        accountId: accountId.value,
        destroy: [taskListId],
        onDestroyRemoveTasks,
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", taskListId);
    if (error) {
      throw new Error(error.description || "Failed to delete task list");
    }
  }

  // --- Task operations ---

  async listTasks(
    accountId: AccountId,
    taskListIds?: readonly string[],
    properties: readonly TaskProperty[] = DEFAULT_TASK_PROPERTIES,
  ): Promise<Task[]> {
    const PAGE_SIZE = 256;
    const allTasks: Task[] = [];
    let position = 0;

    for (;;) {
      const batch = this.client.batch({ capabilities: CORE_TASKS_CAPABILITIES });
      const queryCallId = batch.call(new TaskQuery({
        accountId: accountId.value,
        filter: taskListIds?.length ? { inTaskLists: [...taskListIds] } : undefined,
        limit: PAGE_SIZE,
        position,
        calculateTotal: true,
      }));
      const getCallId = batch.call(TaskGet.byQueryResult(accountId, queryCallId, properties));
      const response = await batch.send();

      const queryResult = response.get<TaskQueryResponse>(queryCallId, "Task/query");
      const tasks = response.get<TaskGetResponse>(getCallId, "Task/get").list;
      allTasks.push(...tasks);

      const total = queryResult.total ?? tasks.length;
      position += tasks.length;
      if (position >= total || tasks.length < PAGE_SIZE) break;
    }

    return allTasks;
  }

  async queryTasks(
    accountId: AccountId,
    filter: FilterOperatorCondition<TaskFilter>,
    options?: {
      sort?: readonly TaskQuerySort[];
      limit?: number;
      properties?: readonly TaskProperty[];
    },
  ): Promise<Task[]> {
    const batch = this.client.batch({ capabilities: CORE_TASKS_CAPABILITIES });
    const queryCallId = batch.call(new TaskQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort,
      limit: options?.limit ?? 100,
    } satisfies TaskQueryRequest));
    const getCallId = batch.call(
      TaskGet.byQueryResult(accountId, queryCallId, options?.properties ?? DEFAULT_TASK_PROPERTIES),
    );
    const response = await batch.send();
    return response.get<TaskGetResponse>(getCallId, "Task/get").list;
  }

  async queryTaskChanges(
    accountId: AccountId,
    options: {
      filter?: FilterOperatorCondition<TaskFilter>;
      sort?: readonly TaskQuerySort[];
      sinceQueryState: string;
      maxChanges?: number;
      upToId?: string;
      calculateTotal?: boolean;
    },
  ): Promise<TaskQueryChangesResponse> {
    return this.client.invoke<TaskQueryChangesRequest, TaskQueryChangesResponse>(
      new TaskQueryChanges({
        accountId: accountId.value,
        filter: options.filter,
        sort: options.sort,
        sinceQueryState: options.sinceQueryState,
        maxChanges: options.maxChanges,
        upToId: options.upToId,
        calculateTotal: options.calculateTotal,
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );
  }

  async getTask(
    accountId: AccountId,
    taskId: string,
    properties: readonly TaskProperty[] = DEFAULT_TASK_PROPERTIES,
  ): Promise<Task | undefined> {
    const response = await this.client.invoke<TaskGetRequest, TaskGetResponse>(
      TaskGet.byIds(accountId, [taskId], properties),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );
    return response.list[0];
  }

  async getTaskChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<JmapChangesResponse> {
    return this.client.invoke<TaskChangesRequest, JmapChangesResponse>(
      new TaskChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );
  }

  async createTask(
    accountId: AccountId,
    clientId: string,
    task: TaskCreate,
  ): Promise<string> {
    const response = await this.client.invoke<TaskSetRequest, JmapSetResponse>(
      new TaskSet({
        accountId: accountId.value,
        create: { [clientId]: task },
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create task");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("Task/set did not return an id");
    }

    return createdId;
  }

  async updateTask(
    accountId: AccountId,
    taskId: string,
    updates: TaskUpdate,
  ): Promise<void> {
    const response = await this.client.invoke<TaskSetRequest, JmapSetResponse>(
      new TaskSet({
        accountId: accountId.value,
        update: { [taskId]: updates },
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", taskId);
    if (error) {
      throw new Error(error.description || "Failed to update task");
    }
  }

  async destroyTask(accountId: AccountId, taskId: string): Promise<void> {
    const response = await this.client.invoke<TaskSetRequest, JmapSetResponse>(
      new TaskSet({
        accountId: accountId.value,
        destroy: [taskId],
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", taskId);
    if (error) {
      throw new Error(error.description || "Failed to delete task");
    }
  }

  async copyTask(
    accountId: AccountId,
    fromAccountId: AccountId,
    clientId: string,
    task: TaskCreate,
    options?: {
      onSuccessDestroyOriginal?: boolean;
    },
  ): Promise<string> {
    const response = await this.client.invoke<TaskCopyRequest, TaskCopyResponse>(
      new TaskCopy({
        fromAccountId: fromAccountId.value,
        accountId: accountId.value,
        create: { [clientId]: task },
        onSuccessDestroyOriginal: options?.onSuccessDestroyOriginal,
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );

    const notCreated = response.notCreated?.[clientId];
    if (notCreated) {
      throw new Error(notCreated.description || "Failed to copy task");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("Task/copy did not return an id");
    }

    return createdId;
  }

  // --- TaskNotification operations ---

  async listNotifications(accountId: AccountId): Promise<TaskNotification[]> {
    const response = await this.client.invoke<
      TaskNotificationGetRequest,
      TaskNotificationGetResponse
    >(TaskNotificationGet.all(accountId), { capabilities: CORE_TASKS_CAPABILITIES });
    return response.list;
  }

  async queryNotifications(
    accountId: AccountId,
    filter: FilterOperatorCondition<TaskNotificationFilter>,
    options?: {
      sort?: readonly TaskNotificationQuerySort[];
      limit?: number;
    },
  ): Promise<TaskNotificationQueryResponse> {
    return this.client.invoke<TaskNotificationQueryRequest, TaskNotificationQueryResponse>(
      new TaskNotificationQuery({
        accountId: accountId.value,
        filter,
        sort: options?.sort,
        limit: options?.limit,
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );
  }

  async destroyNotification(accountId: AccountId, notificationId: string): Promise<void> {
    const response = await this.client.invoke<TaskNotificationSetRequest, JmapSetResponse>(
      new TaskNotificationSet({
        accountId: accountId.value,
        destroy: [notificationId],
      }),
      { capabilities: CORE_TASKS_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", notificationId);
    if (error) {
      throw new Error(error.description || "Failed to destroy task notification");
    }
  }
}
