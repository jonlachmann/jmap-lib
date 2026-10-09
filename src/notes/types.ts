import type { JmapGetArgs } from "../core/get";
import type { JmapPatchObject } from "../core/patch";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query";
import type { JmapMethodError, JmapSetArgs } from "../core/set";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes";

// Types follow rfcs/draft-jmap-notes-00.txt.

// --- Capability ---

export interface NotesAccountCapability {
  maxNotesPerNoteBook: number | null;
  maxNoteBooks: number | null;
  maxSizeDescription: number | null;
  mayCreateNoteBook: boolean;
}

// --- NoteBookRights ---

export interface NoteBookRights {
  mayReadItems: boolean;
  mayWriteAll: boolean;
  mayWriteOwn: boolean;
  mayUpdatePrivate: boolean;
  mayAdmin: boolean;
  mayDelete: boolean;
}

// --- NoteBook ---

export interface NoteBook {
  id: string;
  role?: "inbox" | "trash" | null;
  name: string;
  sortOrder?: number;
  totalNotes?: number;
  isSubscribed?: boolean;
  shareWith?: Record<string, NoteBookRights> | null;
  myRights?: NoteBookRights;
}

export type NoteBookProperty =
  | "id"
  | "role"
  | "name"
  | "sortOrder"
  | "totalNotes"
  | "isSubscribed"
  | "shareWith"
  | "myRights";

export interface NoteBookMutable {
  name?: string;
  sortOrder?: number;
  isSubscribed?: boolean;
  shareWith?: Record<string, NoteBookRights> | null;
}

export interface NoteBookCreate extends NoteBookMutable {
  name: string;
}

export type NoteBookUpdate = JmapPatchObject<NoteBookMutable>;

export interface NoteBookGetRequest extends JmapGetArgs<NoteBookProperty> {}

export interface NoteBookGetResponse {
  accountId: string;
  state: string;
  list: NoteBook[];
  notFound?: string[];
}

export interface NoteBookChangesRequest extends JmapChangesArgs {}

export interface NoteBookChangesResponse extends JmapChangesResponse {}

export interface NoteBookSetRequest extends JmapSetArgs<NoteBookCreate, NoteBookUpdate> {
  onDestroyRemoveNotes?: boolean;
}

// --- Note ---

export type NoteContentType = "text/plain" | "text/html";

export interface Note {
  id: string;
  noteBookId: string;
  uid?: string;
  createdBy?: string | null;
  title?: string;
  description?: string;
  descriptionContentType?: NoteContentType;
  /** CSS3 color name (no hex). Per-user. */
  color?: string | null;
  /** Per-user; "$flagged" marks the note as flagged. */
  keywords?: Record<string, boolean>;
  created?: string;
  updated?: string;
}

export type NoteProperty =
  | "id"
  | "noteBookId"
  | "uid"
  | "createdBy"
  | "title"
  | "description"
  | "descriptionContentType"
  | "color"
  | "keywords"
  | "created"
  | "updated";

export interface NoteMutable {
  noteBookId?: string;
  title?: string;
  description?: string;
  descriptionContentType?: NoteContentType;
  color?: string | null;
  keywords?: Record<string, boolean>;
}

export interface NoteCreate extends NoteMutable {
  noteBookId: string;
  uid?: string;
}

export type NoteUpdate = JmapPatchObject<NoteMutable>;

export interface NoteGetRequest extends JmapGetArgs<NoteProperty> {
  "#ids"?: {
    resultOf: string;
    name: "Note/query";
    path: "/ids";
  };
}

export interface NoteGetResponse {
  accountId: string;
  state: string;
  list: Note[];
  notFound?: string[];
}

export interface NoteChangesRequest extends JmapChangesArgs {}

export interface NoteChangesResponse extends JmapChangesResponse {}

export interface NoteSetRequest extends JmapSetArgs<NoteCreate, NoteUpdate> {}

export interface NoteCopyRequest {
  fromAccountId: string;
  ifFromInState?: string | null;
  accountId: string;
  ifInState?: string | null;
  create: Record<string, NoteCreate & { id: string }>;
  onSuccessDestroyOriginal?: boolean;
  destroyFromIfInState?: string | null;
}

export interface NoteCopyResponse {
  fromAccountId: string;
  accountId: string;
  oldState?: string;
  newState?: string;
  created?: Record<string, Note>;
  notCreated?: Record<string, JmapMethodError>;
}

// --- Note query ---

export interface NoteFilter {
  inNoteBook?: string;
  text?: string;
  title?: string;
  hasKeyword?: string;
  notKeyword?: string;
  after?: string;
  before?: string;
}

export type NoteQuerySortProperty = "title" | "updated" | "created" | "hasKeyword";

export interface NoteQuerySort extends JmapComparator<NoteQuerySortProperty> {
  /** Required when property is "hasKeyword". */
  keyword?: string;
}

export interface NoteQueryRequest extends JmapQueryArgs<NoteFilter, NoteQuerySort> {}

export interface NoteQueryResponse {
  accountId: string;
  queryState?: string;
  canCalculateChanges?: boolean;
  ids: string[];
  position: number;
  total?: number;
}

export interface NoteQueryChangesRequest extends JmapQueryChangesArgs<NoteFilter, NoteQuerySort> {}

export interface NoteQueryChangesResponse extends JmapQueryChangesResponse {}
