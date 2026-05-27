import type { JmapMethod } from "../core/method";
import { AccountId, CallId } from "../core/ids";
import type { JmapSetResponse } from "../core/set";
import type {
  TaskListGetRequest,
  TaskListGetResponse,
  TaskListChangesRequest,
  TaskListChangesResponse,
  TaskListSetRequest,
  TaskGetRequest,
  TaskGetResponse,
  TaskChangesRequest,
  TaskChangesResponse,
  TaskSetRequest,
  TaskCopyRequest,
  TaskCopyResponse,
  TaskQueryRequest,
  TaskQueryResponse,
  TaskQueryChangesRequest,
  TaskQueryChangesResponse,
  TaskProperty,
  TaskNotificationGetRequest,
  TaskNotificationGetResponse,
  TaskNotificationChangesRequest,
  TaskNotificationChangesResponse,
  TaskNotificationSetRequest,
  TaskNotificationQueryRequest,
  TaskNotificationQueryResponse,
  TaskNotificationQueryChangesRequest,
  TaskNotificationQueryChangesResponse,
} from "./types";

// --- TaskList methods ---

export class TaskListGet implements JmapMethod<TaskListGetRequest, TaskListGetResponse> {
  readonly methodName = "TaskList/get";
  readonly arguments: TaskListGetRequest;

  constructor(args: TaskListGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): TaskListGet {
    return new TaskListGet({ accountId: accountId.value });
  }
}

export class TaskListChanges implements JmapMethod<TaskListChangesRequest, TaskListChangesResponse> {
  readonly methodName = "TaskList/changes";
  readonly arguments: TaskListChangesRequest;

  constructor(args: TaskListChangesRequest) {
    this.arguments = args;
  }
}

export class TaskListSet implements JmapMethod<TaskListSetRequest, JmapSetResponse> {
  readonly methodName = "TaskList/set";
  readonly arguments: TaskListSetRequest;

  constructor(args: TaskListSetRequest) {
    this.arguments = args;
  }
}

// --- Task methods ---

export class TaskGet implements JmapMethod<TaskGetRequest, TaskGetResponse> {
  readonly methodName = "Task/get";
  readonly arguments: TaskGetRequest;

  constructor(args: TaskGetRequest) {
    this.arguments = args;
  }

  static byIds(
    accountId: AccountId,
    ids: readonly string[],
    properties?: readonly TaskProperty[],
  ): TaskGet {
    return new TaskGet({ accountId: accountId.value, ids, properties });
  }

  static byQueryResult(
    accountId: AccountId,
    queryCallId: CallId,
    properties?: readonly TaskProperty[],
  ): TaskGet {
    return new TaskGet({
      accountId: accountId.value,
      "#ids": {
        resultOf: queryCallId.value,
        name: "Task/query",
        path: "/ids",
      },
      properties,
    });
  }
}

export class TaskChanges implements JmapMethod<TaskChangesRequest, TaskChangesResponse> {
  readonly methodName = "Task/changes";
  readonly arguments: TaskChangesRequest;

  constructor(args: TaskChangesRequest) {
    this.arguments = args;
  }
}

export class TaskSet implements JmapMethod<TaskSetRequest, JmapSetResponse> {
  readonly methodName = "Task/set";
  readonly arguments: TaskSetRequest;

  constructor(args: TaskSetRequest) {
    this.arguments = args;
  }
}

export class TaskCopy implements JmapMethod<TaskCopyRequest, TaskCopyResponse> {
  readonly methodName = "Task/copy";
  readonly arguments: TaskCopyRequest;

  constructor(args: TaskCopyRequest) {
    this.arguments = args;
  }
}

export class TaskQuery implements JmapMethod<TaskQueryRequest, TaskQueryResponse> {
  readonly methodName = "Task/query";
  readonly arguments: TaskQueryRequest;

  constructor(args: TaskQueryRequest) {
    this.arguments = args;
  }
}

export class TaskQueryChanges
  implements JmapMethod<TaskQueryChangesRequest, TaskQueryChangesResponse>
{
  readonly methodName = "Task/queryChanges";
  readonly arguments: TaskQueryChangesRequest;

  constructor(args: TaskQueryChangesRequest) {
    this.arguments = args;
  }
}

// --- TaskNotification methods ---

export class TaskNotificationGet
  implements JmapMethod<TaskNotificationGetRequest, TaskNotificationGetResponse>
{
  readonly methodName = "TaskNotification/get";
  readonly arguments: TaskNotificationGetRequest;

  constructor(args: TaskNotificationGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): TaskNotificationGet {
    return new TaskNotificationGet({ accountId: accountId.value });
  }
}

export class TaskNotificationChanges
  implements JmapMethod<TaskNotificationChangesRequest, TaskNotificationChangesResponse>
{
  readonly methodName = "TaskNotification/changes";
  readonly arguments: TaskNotificationChangesRequest;

  constructor(args: TaskNotificationChangesRequest) {
    this.arguments = args;
  }
}

export class TaskNotificationSet
  implements JmapMethod<TaskNotificationSetRequest, JmapSetResponse>
{
  readonly methodName = "TaskNotification/set";
  readonly arguments: TaskNotificationSetRequest;

  constructor(args: TaskNotificationSetRequest) {
    this.arguments = args;
  }
}

export class TaskNotificationQuery
  implements JmapMethod<TaskNotificationQueryRequest, TaskNotificationQueryResponse>
{
  readonly methodName = "TaskNotification/query";
  readonly arguments: TaskNotificationQueryRequest;

  constructor(args: TaskNotificationQueryRequest) {
    this.arguments = args;
  }
}

export class TaskNotificationQueryChanges
  implements JmapMethod<TaskNotificationQueryChangesRequest, TaskNotificationQueryChangesResponse>
{
  readonly methodName = "TaskNotification/queryChanges";
  readonly arguments: TaskNotificationQueryChangesRequest;

  constructor(args: TaskNotificationQueryChangesRequest) {
    this.arguments = args;
  }
}
