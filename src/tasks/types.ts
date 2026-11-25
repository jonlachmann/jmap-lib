import type { JmapCopyArgs, JmapCopyResponse } from "../core/copy.js";
import type { JmapGetResponse } from "../core/get.js";
import type { JmapQueryResponse } from "../core/query.js";
import type { JmapGetArgs } from "../core/get.js";
import type { JmapPatchObject } from "../core/patch.js";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query.js";
import type { JmapSetArgs } from "../core/set.js";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes.js";
import type {
  Alert,
  RecurrenceOverride,
  RecurrenceRule,
  Relation,
  TaskLink,
  TaskLocation,
  TaskParticipant,
  VirtualLocation,
} from "../jscalendar/types.js";

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

/** Every right TaskRights holds, for code that reads or sets them by name. */
export const TASK_RIGHTS = [
  "mayReadItems",
  "mayWriteAll",
  "mayWriteOwn",
  "mayUpdatePrivate",
  "mayRSVP",
  "mayAdmin",
  "mayDelete",
] as const satisfies readonly (keyof TaskRights)[];

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
  defaultAlertsWithTime?: Record<string, Alert> | null;
  defaultAlertsWithoutTime?: Record<string, Alert> | null;
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

export type TaskListMutable = {
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
  defaultAlertsWithTime?: Record<string, Alert> | null;
  defaultAlertsWithoutTime?: Record<string, Alert> | null;
};

export interface TaskListCreate extends TaskListMutable {
  name: string;
}

export type TaskListUpdate = JmapPatchObject<TaskListMutable>;

export interface TaskListGetRequest extends JmapGetArgs<TaskListProperty> {}

export type TaskListGetResponse = JmapGetResponse<TaskList>;

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

// --- Task ---

/** RFC 8984 5.2.5, and values registered since. */
export type TaskProgress = "needs-action" | "in-process" | "completed" | "failed" | "cancelled" | (string & {});

export interface Task {
  id: string;
  taskListId: string;
  isDraft?: boolean;
  uid?: string;
  "@type"?: "Task";
  /** RFC 8984 4.1.7, 4.1.4, 4.2.6, 4.4.5, 4.6.1, 4.7.2: as on an event. */
  sequence?: number;
  prodId?: string;
  locale?: string;
  sentBy?: string | null;
  requestStatus?: string;
  localizations?: Record<string, Record<string, unknown>> | null;
  timeZones?: Record<string, unknown> | null;
  created?: string;
  updated?: string;
  title?: string;
  description?: string;
  descriptionContentType?: string;
  start?: string | null;
  due?: string | null;
  /** RFC 8984 5.2.3: how long the task is expected to take. */
  estimatedDuration?: string | null;
  timeZone?: string | null;
  showWithoutTime?: boolean;
  progress?: TaskProgress | null;
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
  keywords?: Record<string, true> | null;
  categories?: Record<string, true> | null;
  locations?: Record<string, TaskLocation> | null;
  virtualLocations?: Record<string, VirtualLocation> | null;
  links?: Record<string, TaskLink> | null;
  relatedTo?: Record<string, Relation> | null;
  checklists?: Record<string, Checklist> | null;
  comments?: Record<string, Comment> | null;
  utcStart?: string;
  utcDue?: string;
  // Recurrences extension
  baseTaskId?: string | null;
  recurrenceRules?: RecurrenceRule[] | null;
  excludedRecurrenceRules?: RecurrenceRule[] | null;
  recurrenceOverrides?: Record<string, TaskOverride> | null;
  recurrenceId?: string | null;
  recurrenceIdTimeZone?: string | null;
  excluded?: boolean;
  // Assignees extension
  isOrigin?: boolean;
  participants?: Record<string, TaskParticipant> | null;
  mayInviteSelf?: boolean;
  mayInviteOthers?: boolean;
  hideAttendees?: boolean;
  // Alerts extension
  useDefaultAlerts?: boolean;
  alerts?: Record<string, Alert> | null;
  freeBusyStatus?: "free" | "busy";
}

export type TaskProperty =
  | "id"
  | "taskListId"
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
  | "estimatedDuration"
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
  | "freeBusyStatus"
  | "sequence"
  | "prodId"
  | "locale"
  | "sentBy"
  | "requestStatus"
  | "localizations"
  | "timeZones"
  | "recurrenceIdTimeZone"
  | "excluded";

export type TaskMutable = {
  taskListId?: string;
  isDraft?: boolean;
  uid?: string;
  title?: string;
  description?: string;
  descriptionContentType?: string;
  start?: string | null;
  due?: string | null;
  /** RFC 8984 5.2.3: how long the task is expected to take. */
  estimatedDuration?: string | null;
  timeZone?: string | null;
  showWithoutTime?: boolean;
  progress?: TaskProgress | null;
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
  keywords?: Record<string, true> | null;
  categories?: Record<string, true> | null;
  locations?: Record<string, TaskLocation> | null;
  virtualLocations?: Record<string, VirtualLocation> | null;
  links?: Record<string, TaskLink> | null;
  relatedTo?: Record<string, Relation> | null;
  checklists?: Record<string, Checklist> | null;
  comments?: Record<string, Comment> | null;
  // Recurrences extension
  recurrenceRules?: RecurrenceRule[] | null;
  excludedRecurrenceRules?: RecurrenceRule[] | null;
  recurrenceOverrides?: Record<string, TaskOverride> | null;
  // Assignees extension
  participants?: Record<string, TaskParticipant> | null;
  mayInviteSelf?: boolean;
  mayInviteOthers?: boolean;
  hideAttendees?: boolean;
  // Alerts extension
  useDefaultAlerts?: boolean;
  alerts?: Record<string, Alert> | null;
  freeBusyStatus?: "free" | "busy";
};

/** RFC 8984 4.3.5: what one occurrence of a task changes; the properties left out are the series'. */
export type TaskOverride = RecurrenceOverride<
  Omit<
    TaskMutable,
    | "taskListId"
    | "uid"
    | "privacy"
    | "relatedTo"
    | "replyTo"
    | "recurrenceRules"
    | "excludedRecurrenceRules"
    | "recurrenceOverrides"
  >
>;

export interface TaskCreate extends TaskMutable {}

export type TaskUpdate = JmapPatchObject<TaskMutable>;

// --- Task method request/response types ---

/** CalendarEvent/get's arguments (draft-ietf-jmap-tasks 4.9). */
export interface TaskGetRequest extends JmapGetArgs<TaskProperty> {
  /** The zone floating tasks are read in for utcStart and utcDue. */
  timeZone?: string;
}

export type TaskGetResponse = JmapGetResponse<Task>;

export interface TaskChangesRequest extends JmapChangesArgs {}

export interface TaskChangesResponse extends JmapChangesResponse {}

export interface TaskSetRequest extends JmapSetArgs<TaskCreate, TaskUpdate> {}

export interface TaskCopyRequest extends JmapCopyArgs<TaskCreate> {}

export type TaskCopyResponse = JmapCopyResponse<Task>;

// --- Task query ---

/** The draft leaves Task/query's filter to be written; these follow CalendarEvent/query's. */
export interface TaskFilter {
  inTaskList?: string;
  after?: string;
  before?: string;
  text?: string;
  title?: string;
  description?: string;
  isComplete?: boolean;
  progress?: TaskProgress;
  uid?: string;
}

export type TaskQuerySortProperty = string & {};

export interface TaskQuerySort extends JmapComparator<TaskQuerySortProperty> {}

/** CalendarEvent/query's arguments (draft-ietf-jmap-tasks 4.13). */
export interface TaskQueryRequest extends JmapQueryArgs<TaskFilter, TaskQuerySort> {
  /** Each instance of a recurring task as an id of its own, over at most the account's maxExpandedQueryDuration. */
  expandRecurrences?: boolean;
  /** The zone after and before are read in; Etc/UTC when not given. */
  timeZone?: string;
}

export type TaskQueryResponse = JmapQueryResponse;

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

export type TaskNotificationGetResponse = JmapGetResponse<TaskNotification>;

export interface TaskNotificationChangesRequest extends JmapChangesArgs {}

export interface TaskNotificationChangesResponse extends JmapChangesResponse {}

export interface TaskNotificationSetRequest extends JmapSetArgs<never, never> {}

export interface TaskNotificationQueryRequest
  extends JmapQueryArgs<TaskNotificationFilter, TaskNotificationQuerySort> {}

export type TaskNotificationQueryResponse = JmapQueryResponse;

export interface TaskNotificationQueryChangesRequest
  extends JmapQueryChangesArgs<TaskNotificationFilter, TaskNotificationQuerySort> {}

export interface TaskNotificationQueryChangesResponse extends JmapQueryChangesResponse {}
