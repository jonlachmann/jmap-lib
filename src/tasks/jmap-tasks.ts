import { CORE_TASKS_CAPABILITIES, JMAP_TASKS_ALERTS_CAPABILITY, JMAP_TASKS_RECURRENCES_CAPABILITY } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import type { JmapChangesResponse } from "../core/changes";
import type { FilterOperatorCondition } from "../core/query";
import type { JmapCreated, JmapSetResponse } from "../core/set";
import { CREATION_ID, createdOne, getSetError } from "../core/set";
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
  "taskListId",
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

  /** The capabilities a request names: the core ones, and the extensions the server has (draft-ietf-jmap-tasks 1.6). */
  capabilities(): string[] {
    const offered = this.client.getCapabilities();
    const extensions = [JMAP_TASKS_RECURRENCES_CAPABILITY, JMAP_TASKS_ALERTS_CAPABILITY].filter((uri) => offered.includes(uri));
    return [...CORE_TASKS_CAPABILITIES, ...extensions];
  }

  /** The properties a task is fetched with: the core ones, and those of the extensions the server has. */
  defaultProperties(): TaskProperty[] {
    const offered = this.client.getCapabilities();
    return [
      ...DEFAULT_TASK_PROPERTIES,
      ...(offered.includes(JMAP_TASKS_RECURRENCES_CAPABILITY) ? ["recurrenceRules" as const] : []),
      ...(offered.includes(JMAP_TASKS_ALERTS_CAPABILITY) ? ["alerts" as const] : []),
    ];
  }

  // --- TaskList operations ---

  async listTaskLists(accountId: AccountId): Promise<TaskList[]> {
    const response = await this.client.invoke<TaskListGetRequest, TaskListGetResponse>(
      TaskListGet.all(accountId),
      { capabilities: this.capabilities() },
    );
    return response.list;
  }

  async getTaskLists(accountId: AccountId): Promise<TaskListGetResponse> {
    return this.client.invoke<TaskListGetRequest, TaskListGetResponse>(
      TaskListGet.all(accountId),
      { capabilities: this.capabilities() },
    );
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
      { capabilities: this.capabilities() },
    );
  }

  async createTaskList(
    accountId: AccountId,
    taskList: TaskListCreate,
  ): Promise<JmapCreated> {
    const response = await this.client.invoke<TaskListSetRequest, JmapSetResponse>(
      new TaskListSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: taskList },
      }),
      { capabilities: this.capabilities() },
    );

    return createdOne(response, "task list");
  }

  async updateTaskList(
    accountId: AccountId,
    taskListId: string,
    updates: TaskListUpdate,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<TaskListSetRequest, JmapSetResponse>(
      new TaskListSet({
        accountId: accountId.value,
        update: { [taskListId]: updates },
      }),
      { capabilities: this.capabilities() },
    );

    const error = getSetError(response, "notUpdated", taskListId);
    if (error) {
      throw new Error(error.description || "Failed to update task list");
    }

    return response;
  }

  async destroyTaskList(
    accountId: AccountId,
    taskListId: string,
    onDestroyRemoveTasks?: boolean,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<TaskListSetRequest, JmapSetResponse>(
      new TaskListSet({
        accountId: accountId.value,
        destroy: [taskListId],
        onDestroyRemoveTasks,
      }),
      { capabilities: this.capabilities() },
    );

    const error = getSetError(response, "notDestroyed", taskListId);
    if (error) {
      throw new Error(error.description || "Failed to delete task list");
    }

    return response;
  }

  // --- Task operations ---

  async listTasks(
    accountId: AccountId,
    taskListIds?: readonly string[],
    properties: readonly TaskProperty[] = this.defaultProperties(),
  ): Promise<Task[]> {
    const PAGE_SIZE = 256;
    const allTasks: Task[] = [];
    let position = 0;

    for (;;) {
      const batch = this.client.batch({ capabilities: this.capabilities() });
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
    const batch = this.client.batch({ capabilities: this.capabilities() });
    const queryCallId = batch.call(new TaskQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort,
      limit: options?.limit ?? 100,
    } satisfies TaskQueryRequest));
    const getCallId = batch.call(
      TaskGet.byQueryResult(accountId, queryCallId, options?.properties ?? this.defaultProperties()),
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
      { capabilities: this.capabilities() },
    );
  }

  async getTask(
    accountId: AccountId,
    taskId: string,
    properties: readonly TaskProperty[] = this.defaultProperties(),
  ): Promise<Task | undefined> {
    const response = await this.client.invoke<TaskGetRequest, TaskGetResponse>(
      TaskGet.byIds(accountId, [taskId], properties),
      { capabilities: this.capabilities() },
    );
    return response.list[0];
  }

  /** Tasks by id with the state they are at; no ids gives the state alone. */
  async getTasks(
    accountId: AccountId,
    ids: readonly string[],
    properties: readonly TaskProperty[] = this.defaultProperties(),
  ): Promise<TaskGetResponse> {
    return this.client.invoke<TaskGetRequest, TaskGetResponse>(
      TaskGet.byIds(accountId, ids, properties),
      { capabilities: this.capabilities() },
    );
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
      { capabilities: this.capabilities() },
    );
  }

  async createTask(
    accountId: AccountId,
    task: TaskCreate,
  ): Promise<JmapCreated> {
    const response = await this.client.invoke<TaskSetRequest, JmapSetResponse>(
      new TaskSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: task },
      }),
      { capabilities: this.capabilities() },
    );

    return createdOne(response, "task");
  }

  async updateTask(
    accountId: AccountId,
    taskId: string,
    updates: TaskUpdate,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<TaskSetRequest, JmapSetResponse>(
      new TaskSet({
        accountId: accountId.value,
        update: { [taskId]: updates },
      }),
      { capabilities: this.capabilities() },
    );

    const error = getSetError(response, "notUpdated", taskId);
    if (error) {
      throw new Error(error.description || "Failed to update task");
    }

    return response;
  }

  async destroyTask(accountId: AccountId, taskId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<TaskSetRequest, JmapSetResponse>(
      new TaskSet({
        accountId: accountId.value,
        destroy: [taskId],
      }),
      { capabilities: this.capabilities() },
    );

    const error = getSetError(response, "notDestroyed", taskId);
    if (error) {
      throw new Error(error.description || "Failed to delete task");
    }

    return response;
  }

  async copyTask(
    accountId: AccountId,
    fromAccountId: AccountId,
    task: TaskCreate,
    options?: {
      onSuccessDestroyOriginal?: boolean;
    },
  ): Promise<JmapCreated<TaskCopyResponse>> {
    const response = await this.client.invoke<TaskCopyRequest, TaskCopyResponse>(
      new TaskCopy({
        fromAccountId: fromAccountId.value,
        accountId: accountId.value,
        create: { [CREATION_ID]: task },
        onSuccessDestroyOriginal: options?.onSuccessDestroyOriginal,
      }),
      { capabilities: this.capabilities() },
    );

    return createdOne(response, "task");
  }

  // --- TaskNotification operations ---

  async listNotifications(accountId: AccountId): Promise<TaskNotification[]> {
    const response = await this.client.invoke<
      TaskNotificationGetRequest,
      TaskNotificationGetResponse
    >(TaskNotificationGet.all(accountId), { capabilities: this.capabilities() });
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
      { capabilities: this.capabilities() },
    );
  }

  async destroyNotification(accountId: AccountId, notificationId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<TaskNotificationSetRequest, JmapSetResponse>(
      new TaskNotificationSet({
        accountId: accountId.value,
        destroy: [notificationId],
      }),
      { capabilities: this.capabilities() },
    );

    const error = getSetError(response, "notDestroyed", notificationId);
    if (error) {
      throw new Error(error.description || "Failed to destroy task notification");
    }

    return response;
  }
}
