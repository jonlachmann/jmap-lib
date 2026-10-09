import type { JmapGetArgs } from "../core/get";
import type { JmapPatchObject } from "../core/patch";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query";
import type { JmapSetArgs } from "../core/set";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes";

// --- TaskRights ---

export interface TaskRights {
  mayReadItems: boolean;
  mayWriteAll: boolean;
  mayWriteOwn: boolean;
  mayUpdatePrivate: boolean;
  mayRSVP: boolean;
  mayAdmin: boolean;
  mayDelete: boolean;
}

// --- TaskList ---

export interface TaskList {
  id: string;
  role?: "inbox" | "trash" | null;
  name: string;
  description?: string | null;
  color?: string | null;
  keywordColors?: Record<string, string> | null;
  categoryColors?: Record<string, string> | null;
  sortOrder?: number;
  isSubscribed?: boolean;
  timeZone?: string | null;
  workflowStatuses?: string[];
  shareWith?: Record<string, TaskRights> | null;
  myRights?: TaskRights;
  defaultAlertsWithTime?: Record<string, unknown> | null;
  defaultAlertsWithoutTime?: Record<string, unknown> | null;
}

export type TaskListProperty =
  | "id"
  | "role"
  | "name"
  | "description"
  | "color"
  | "keywordColors"
  | "categoryColors"
  | "sortOrder"
  | "isSubscribed"
  | "timeZone"
  | "workflowStatuses"
  | "shareWith"
  | "myRights"
  | "defaultAlertsWithTime"
  | "defaultAlertsWithoutTime";

export interface TaskListMutable {
  name?: string;
  description?: string | null;
  color?: string | null;
  keywordColors?: Record<string, string> | null;
  categoryColors?: Record<string, string> | null;
  sortOrder?: number;
  isSubscribed?: boolean;
  timeZone?: string | null;
  workflowStatuses?: string[];
  shareWith?: Record<string, TaskRights> | null;
  defaultAlertsWithTime?: Record<string, unknown> | null;
  defaultAlertsWithoutTime?: Record<string, unknown> | null;
}

export interface TaskListCreate extends TaskListMutable {}

export type TaskListUpdate = JmapPatchObject<TaskListMutable>;

export interface TaskListGetRequest extends JmapGetArgs<TaskListProperty> {}

export interface TaskListGetResponse {
  accountId: string;
  state: string;
  list: TaskList[];
}

export interface TaskListChangesRequest extends JmapChangesArgs {}

export interface TaskListChangesResponse extends JmapChangesResponse {}

export interface TaskListSetRequest extends JmapSetArgs<TaskListCreate, TaskListUpdate> {
  onDestroyRemoveTasks?: boolean;
}

// --- Person (used in checklists, comments, notifications) ---

export interface Person {
  "@type": "Person";
  name?: string;
  uri?: string;
  principalId?: string;
}

// --- Checklist ---

export interface CheckItem {
  "@type": "CheckItem";
  title: string;
  sortOrder?: number;
  updated?: string;
  isComplete: boolean;
  assignee?: Person;
}

export interface Checklist {
  "@type": "Checklist";
  title?: string;
  checkItems?: CheckItem[];
}

// --- Comment ---

export interface Comment {
  "@type": "Comment";
  message: string;
  created?: string;
  updated?: string;
  author?: Person;
}

// --- Relation ---

export type RelationType =
  | "first"
  | "next"
  | "child"
  | "parent"
  | "depends-on"
  | "clone"
  | "duplicate"
  | "cause";

export interface Relation {
  "@type"?: "Relation";
  relation?: Partial<Record<RelationType, boolean>>;
}

// --- Task ---

export interface Task {
  id: string;
  taskListIds: Record<string, boolean>;
  isDraft?: boolean;
  uid?: string;
  "@type"?: "jstask";
  created?: string;
  updated?: string;
  title?: string;
  description?: string;
  descriptionContentType?: string;
  start?: string | null;
  due?: string | null;
  duration?: string | null;
  timeZone?: string | null;
  showWithoutTime?: boolean;
  progress?: "needs-action" | "in-process" | "completed" | "failed" | "cancelled" | null;
  progressUpdated?: string | null;
  percentComplete?: number | null;
  estimatedWork?: number | null;
  impact?: string | null;
  workflowStatus?: string | null;
  sortOrder?: number;
  priority?: number;
  privacy?: "public" | "private" | "secret";
  replyTo?: Record<string, string> | null;
  color?: string | null;
  keywords?: Record<string, boolean> | null;
  categories?: Record<string, boolean> | null;
  locations?: Record<string, unknown> | null;
  virtualLocations?: Record<string, unknown> | null;
  links?: Record<string, unknown> | null;
  relatedTo?: Record<string, Relation> | null;
  checklists?: Record<string, Checklist> | null;
  comments?: Record<string, Comment> | null;
  utcStart?: string;
  utcDue?: string;
  // Recurrences extension
  baseTaskId?: string | null;
  recurrenceRules?: unknown[] | null;
  excludedRecurrenceRules?: unknown[] | null;
  recurrenceOverrides?: Record<string, unknown> | null;
  recurrenceId?: string | null;
  // Assignees extension
  isOrigin?: boolean;
  participants?: Record<string, unknown> | null;
  mayInviteSelf?: boolean;
  mayInviteOthers?: boolean;
  hideAttendees?: boolean;
  // Alerts extension
  useDefaultAlerts?: boolean;
  alerts?: Record<string, unknown> | null;
  freeBusyStatus?: "free" | "busy";
}

export type TaskProperty =
  | "id"
  | "taskListIds"
  | "isDraft"
  | "uid"
  | "@type"
  | "created"
  | "updated"
  | "title"
  | "description"
  | "descriptionContentType"
  | "start"
  | "due"
  | "duration"
  | "timeZone"
  | "showWithoutTime"
  | "progress"
  | "progressUpdated"
  | "percentComplete"
  | "estimatedWork"
  | "impact"
  | "workflowStatus"
  | "sortOrder"
  | "priority"
  | "privacy"
  | "replyTo"
  | "color"
  | "keywords"
  | "categories"
  | "locations"
  | "virtualLocations"
  | "links"
  | "relatedTo"
  | "checklists"
  | "comments"
  | "utcStart"
  | "utcDue"
  | "baseTaskId"
  | "recurrenceRules"
  | "excludedRecurrenceRules"
  | "recurrenceOverrides"
  | "recurrenceId"
  | "isOrigin"
  | "participants"
  | "mayInviteSelf"
  | "mayInviteOthers"
  | "hideAttendees"
  | "useDefaultAlerts"
  | "alerts"
  | "freeBusyStatus";

export interface TaskMutable {
  taskListIds?: Record<string, boolean>;
  isDraft?: boolean;
  uid?: string;
  title?: string;
  description?: string;
  descriptionContentType?: string;
  start?: string | null;
  due?: string | null;
  duration?: string | null;
  timeZone?: string | null;
  showWithoutTime?: boolean;
  progress?: "needs-action" | "in-process" | "completed" | "failed" | "cancelled" | null;
  progressUpdated?: string | null;
  percentComplete?: number | null;
  estimatedWork?: number | null;
  impact?: string | null;
  workflowStatus?: string | null;
  sortOrder?: number;
  priority?: number;
  privacy?: "public" | "private" | "secret";
  replyTo?: Record<string, string> | null;
  color?: string | null;
  keywords?: Record<string, boolean> | null;
  categories?: Record<string, boolean> | null;
  locations?: Record<string, unknown> | null;
  virtualLocations?: Record<string, unknown> | null;
  links?: Record<string, unknown> | null;
  relatedTo?: Record<string, Relation> | null;
  checklists?: Record<string, Checklist> | null;
  comments?: Record<string, Comment> | null;
  // Recurrences extension
  recurrenceRules?: unknown[] | null;
  excludedRecurrenceRules?: unknown[] | null;
  recurrenceOverrides?: Record<string, unknown> | null;
  // Assignees extension
  participants?: Record<string, unknown> | null;
  mayInviteSelf?: boolean;
  mayInviteOthers?: boolean;
  hideAttendees?: boolean;
  // Alerts extension
  useDefaultAlerts?: boolean;
  alerts?: Record<string, unknown> | null;
  freeBusyStatus?: "free" | "busy";
}

export interface TaskCreate extends TaskMutable {}

export type TaskUpdate = JmapPatchObject<TaskMutable>;

// --- Task method request/response types ---

export interface TaskGetRequest extends JmapGetArgs<TaskProperty> {
  "#ids"?: {
    resultOf: string;
    name: "Task/query";
    path: "/ids";
  };
}

export interface TaskGetResponse {
  accountId: string;
  state: string;
  list: Task[];
  notFound?: string[];
}

export interface TaskChangesRequest extends JmapChangesArgs {}

export interface TaskChangesResponse extends JmapChangesResponse {}

export interface TaskSetRequest extends JmapSetArgs<TaskCreate, TaskUpdate> {}

export interface TaskCopyRequest {
  fromAccountId: string;
  ifFromInState?: string | null;
  accountId: string;
  ifInState?: string | null;
  create: Record<string, TaskCreate>;
  onSuccessDestroyOriginal?: boolean;
  destroyFromIfInState?: string | null;
}

export interface TaskCopyResponse {
  fromAccountId: string;
  accountId: string;
  oldState?: string;
  newState?: string;
  created?: Record<string, Task>;
  notCreated?: Record<string, import("../core/set").JmapMethodError>;
}

// --- Task query ---

export interface TaskFilter {
  inTaskLists?: string[];
  after?: string;
  before?: string;
  text?: string;
  title?: string;
  description?: string;
  workflowStatus?: string;
  progress?: string;
  uid?: string;
}

export type TaskQuerySortProperty = string & {};

export interface TaskQuerySort extends JmapComparator<TaskQuerySortProperty> {}

export interface TaskQueryRequest extends JmapQueryArgs<TaskFilter, TaskQuerySort> {}

export interface TaskQueryResponse {
  accountId: string;
  queryState?: string;
  ids: string[];
  position: number;
  total?: number;
}

export interface TaskQueryChangesRequest extends JmapQueryChangesArgs<TaskFilter, TaskQuerySort> {}

export interface TaskQueryChangesResponse extends JmapQueryChangesResponse {}

// --- TaskNotification ---

export interface TaskNotification {
  id: string;
  created: string;
  changedBy?: Person;
  comment?: string | null;
  type: "created" | "updated" | "destroyed";
  taskId: string;
  isDraft?: boolean;
  task?: Partial<Task>;
  taskPatch?: Record<string, unknown>;
}

export type TaskNotificationProperty =
  | "id"
  | "created"
  | "changedBy"
  | "comment"
  | "type"
  | "taskId"
  | "isDraft"
  | "task"
  | "taskPatch";

export interface TaskNotificationFilter {
  after?: string | null;
  before?: string | null;
  type?: string;
  taskIds?: string[] | null;
}

export type TaskNotificationQuerySortProperty = "created";

export interface TaskNotificationQuerySort extends JmapComparator<TaskNotificationQuerySortProperty> {}

export interface TaskNotificationGetRequest extends JmapGetArgs<TaskNotificationProperty> {}

export interface TaskNotificationGetResponse {
  accountId: string;
  state: string;
  list: TaskNotification[];
  notFound?: string[];
}

export interface TaskNotificationChangesRequest extends JmapChangesArgs {}

export interface TaskNotificationChangesResponse extends JmapChangesResponse {}

export interface TaskNotificationSetRequest extends JmapSetArgs<never, never> {}

export interface TaskNotificationQueryRequest
  extends JmapQueryArgs<TaskNotificationFilter, TaskNotificationQuerySort> {}

export interface TaskNotificationQueryResponse {
  accountId: string;
  queryState?: string;
  ids: string[];
  position: number;
  total?: number;
}

export interface TaskNotificationQueryChangesRequest
  extends JmapQueryChangesArgs<TaskNotificationFilter, TaskNotificationQuerySort> {}

export interface TaskNotificationQueryChangesResponse extends JmapQueryChangesResponse {}
