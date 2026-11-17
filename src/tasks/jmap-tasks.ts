import { paginate } from "../core/paginate.js";
import {
  CORE_TASKS_CAPABILITIES,
  JMAP_TASKS_ALERTS_CAPABILITY,
  JMAP_TASKS_ASSIGNEES_CAPABILITY,
  JMAP_TASKS_CUSTOMTIMEZONES_CAPABILITY,
  JMAP_TASKS_MULTILINGUAL_CAPABILITY,
  JMAP_TASKS_RECURRENCES_CAPABILITY,
} from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { AccountId } from "../core/ids.js";
import { inAny, type JmapFilter } from "../core/query.js";
import type { JmapCreated, JmapSetResponse } from "../core/set.js";
import { CREATION_ID, createdOne, assertSetOk } from "../core/set.js";
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
} from "./methods.js";
import type {
  Task,
  TaskChangesRequest,
  TaskChangesResponse,
  TaskCreate,
  TaskCopyRequest,
  TaskCopyResponse,
  TaskFilter,
  TaskGetRequest,
  TaskGetResponse,
  TaskListChangesRequest,
  TaskListChangesResponse,
  TaskListCreate,
  TaskListGetRequest,
  TaskListGetResponse,
  TaskListSetRequest,
  TaskListUpdate,
  TaskProperty,
  TaskQueryChangesRequest,
  TaskQueryChangesResponse,
  TaskQueryRequest,
  TaskQuerySort,
  TaskSetRequest,
  TaskUpdate,
  TaskNotification,
  TaskNotificationFilter,
  TaskNotificationGetRequest,
  TaskNotificationGetResponse,
  TaskNotificationQueryRequest,
  TaskNotificationQuerySort,
  TaskNotificationSetRequest,
} from "./types.js";

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
  "estimatedDuration",
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

/** The task properties each extension adds, from RFC 8984's property groups the draft names. */
const EXTENSION_PROPERTIES: Record<string, readonly TaskProperty[]> = {
  [JMAP_TASKS_RECURRENCES_CAPABILITY]: [
    "baseTaskId", "recurrenceId", "recurrenceIdTimeZone", "recurrenceRules", "excludedRecurrenceRules", "recurrenceOverrides", "excluded",
  ],
  [JMAP_TASKS_ASSIGNEES_CAPABILITY]: [
    "isOrigin", "participants", "replyTo", "sentBy", "requestStatus", "mayInviteSelf", "mayInviteOthers", "hideAttendees",
  ],
  [JMAP_TASKS_ALERTS_CAPABILITY]: ["useDefaultAlerts", "alerts"],
  [JMAP_TASKS_MULTILINGUAL_CAPABILITY]: ["localizations"],
  [JMAP_TASKS_CUSTOMTIMEZONES_CAPABILITY]: ["timeZones"],
};

export class JmapTasks {
  constructor(private readonly client: JmapClient) {}

  /**
   * The capabilities a request names: the core ones, and the extensions the account has (draft-ietf-jmap-tasks 1.6),
   * the same ones defaultProperties asks for properties of.
   */
  capabilities(accountId: AccountId): string[] {
    const extensions = Object.keys(EXTENSION_PROPERTIES)
      .filter((capability) => this.client.accountHasCapability(accountId.value, capability));
    return [...CORE_TASKS_CAPABILITIES, ...extensions];
  }

  /**
   * The properties a task is fetched with: the core ones, and those of each extension the account has
   * (draft-ietf-jmap-tasks 4.4–4.8), so a task fetched, changed and saved keeps them.
   */
  defaultProperties(accountId: AccountId): TaskProperty[] {
    return [
      ...DEFAULT_TASK_PROPERTIES,
      ...Object.entries(EXTENSION_PROPERTIES)
        .filter(([capability]) => this.client.accountHasCapability(accountId.value, capability))
        .flatMap(([, properties]) => properties),
    ];
  }

  // --- TaskList operations ---

  async getTaskLists(accountId: AccountId): Promise<TaskListGetResponse> {
    return this.client.invoke<TaskListGetRequest, TaskListGetResponse>(
      TaskListGet.all(accountId),
      { capabilities: this.capabilities(accountId) },
    );
  }

  async getTaskListChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<TaskListChangesResponse> {
    return this.client.invoke<TaskListChangesRequest, TaskListChangesResponse>(
      new TaskListChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
      { capabilities: this.capabilities(accountId) },
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
      { capabilities: this.capabilities(accountId) },
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
      { capabilities: this.capabilities(accountId) },
    );

    assertSetOk(response, "task list");

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
      { capabilities: this.capabilities(accountId) },
    );

    assertSetOk(response, "task list");

    return response;
  }

  // --- Task operations ---

  async listTasks(
    accountId: AccountId,
    taskListIds?: readonly string[],
    properties: readonly TaskProperty[] = this.defaultProperties(accountId),
  ): Promise<Task[]> {
    // inAny gives no filter for no ids, which would list every one
    if (taskListIds?.length === 0) return [];
    return paginate<Task>(
      this.client,
      this.capabilities(accountId),
      (position, limit) => new TaskQuery({
        accountId: accountId.value,
        filter: inAny("inTaskList", taskListIds),
        position,
        limit,
      }),
      (queryCallId) => TaskGet.byQueryResult(accountId, queryCallId, properties),
    );
  }

  async queryTasks(
    accountId: AccountId,
    filter: JmapFilter<TaskFilter>,
    options?: {
      sort?: readonly TaskQuerySort[];
      limit?: number;
      /** The zone the filter's after and before are read in. */
      timeZone?: string;
      properties?: readonly TaskProperty[];
    },
  ): Promise<Task[]> {
    const batch = this.client.batch({ capabilities: this.capabilities(accountId) });
    const queryCallId = batch.call(new TaskQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort,
      limit: options?.limit ?? 100,
      timeZone: options?.timeZone,
    } satisfies TaskQueryRequest));
    const getCallId = batch.call(
      TaskGet.byQueryResult(accountId, queryCallId, options?.properties ?? this.defaultProperties(accountId)),
    );
    const response = await batch.send();
    return response.get<TaskGetResponse>(getCallId, "Task/get").list;
  }

  async queryTaskChanges(
    accountId: AccountId,
    options: {
      filter?: JmapFilter<TaskFilter>;
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
      { capabilities: this.capabilities(accountId) },
    );
  }

  async getTask(
    accountId: AccountId,
    taskId: string,
    properties: readonly TaskProperty[] = this.defaultProperties(accountId),
  ): Promise<Task | undefined> {
    const response = await this.client.invoke<TaskGetRequest, TaskGetResponse>(
      TaskGet.byIds(accountId, [taskId], properties),
      { capabilities: this.capabilities(accountId) },
    );
    return response.list[0];
  }

  /** Tasks by id with the state they are at; no ids gives the state alone. */
  async getTasks(
    accountId: AccountId,
    ids: readonly string[],
    properties: readonly TaskProperty[] = this.defaultProperties(accountId),
  ): Promise<TaskGetResponse> {
    return this.client.invoke<TaskGetRequest, TaskGetResponse>(
      TaskGet.byIds(accountId, ids, properties),
      { capabilities: this.capabilities(accountId) },
    );
  }

  async getTaskChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<TaskChangesResponse> {
    return this.client.invoke<TaskChangesRequest, TaskChangesResponse>(
      new TaskChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
      { capabilities: this.capabilities(accountId) },
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
      { capabilities: this.capabilities(accountId) },
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
      { capabilities: this.capabilities(accountId) },
    );

    assertSetOk(response, "task");

    return response;
  }

  async destroyTask(accountId: AccountId, taskId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<TaskSetRequest, JmapSetResponse>(
      new TaskSet({
        accountId: accountId.value,
        destroy: [taskId],
      }),
      { capabilities: this.capabilities(accountId) },
    );

    assertSetOk(response, "task");

    return response;
  }

  async copyTask(
    accountId: AccountId,
    fromAccountId: AccountId,
    task: TaskCreate & { id: string },
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
      { capabilities: this.capabilities(accountId) },
    );

    return createdOne(response, "task");
  }

  // --- TaskNotification operations ---

  async listNotifications(accountId: AccountId): Promise<TaskNotification[]> {
    const response = await this.client.invoke<
      TaskNotificationGetRequest,
      TaskNotificationGetResponse
    >(TaskNotificationGet.all(accountId), { capabilities: this.capabilities(accountId) });
    return response.list;
  }

  async queryNotifications(
    accountId: AccountId,
    filter: JmapFilter<TaskNotificationFilter>,
    options?: {
      sort?: readonly TaskNotificationQuerySort[];
      limit?: number;
    },
  ): Promise<TaskNotification[]> {
    const batch = this.client.batch({ capabilities: this.capabilities(accountId) });
    const queryCallId = batch.call(new TaskNotificationQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort,
      limit: options?.limit,
    } satisfies TaskNotificationQueryRequest));
    const getCallId = batch.call(TaskNotificationGet.byQueryResult(accountId, queryCallId));
    const response = await batch.send();
    return response.get<TaskNotificationGetResponse>(getCallId, "TaskNotification/get").list;
  }

  async destroyNotification(accountId: AccountId, notificationId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<TaskNotificationSetRequest, JmapSetResponse>(
      new TaskNotificationSet({
        accountId: accountId.value,
        destroy: [notificationId],
      }),
      { capabilities: this.capabilities(accountId) },
    );

    assertSetOk(response, "task notification");

    return response;
  }
}
