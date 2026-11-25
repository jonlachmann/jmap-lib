import type { JmapCopyArgs, JmapCopyResponse } from "../core/copy.js";
import type { JmapGetResponse } from "../core/get.js";
import type { JmapQueryResponse } from "../core/query.js";
import type { JmapGetArgs } from "../core/get.js";
import type { JmapPatchObject } from "../core/patch.js";
import type { JmapComparator, JmapQueryArgs, JmapQueryChangesArgs, JmapQueryChangesResponse } from "../core/query.js";
import type { JmapSetArgs } from "../core/set.js";
import type { JmapChangesArgs, JmapChangesResponse } from "../core/changes.js";

// Types follow JMAP for Notes, draft-jmap-notes-00 (https://openmailserver.org/jmap/notes).

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

/** Every right NoteBookRights holds, for code that reads or sets them by name. */
export const NOTE_BOOK_RIGHTS = [
  "mayReadItems",
  "mayWriteAll",
  "mayWriteOwn",
  "mayUpdatePrivate",
  "mayAdmin",
  "mayDelete",
] as const satisfies readonly (keyof NoteBookRights)[];

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

export type NoteBookMutable = {
  name?: string;
  sortOrder?: number;
  isSubscribed?: boolean;
  shareWith?: Record<string, NoteBookRights> | null;
};

export interface NoteBookCreate extends NoteBookMutable {
  name: string;
}

export type NoteBookUpdate = JmapPatchObject<NoteBookMutable>;

export interface NoteBookGetRequest extends JmapGetArgs<NoteBookProperty> {}

export type NoteBookGetResponse = JmapGetResponse<NoteBook>;

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
  keywords?: Record<string, true>;
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

export type NoteMutable = {
  noteBookId?: string;
  title?: string;
  description?: string;
  descriptionContentType?: NoteContentType;
  color?: string | null;
  keywords?: Record<string, true>;
};

export interface NoteCreate extends NoteMutable {
  noteBookId: string;
  uid?: string;
}

export type NoteUpdate = JmapPatchObject<NoteMutable>;

export interface NoteGetRequest extends JmapGetArgs<NoteProperty> {}

export type NoteGetResponse = JmapGetResponse<Note>;

export interface NoteChangesRequest extends JmapChangesArgs {}

export interface NoteChangesResponse extends JmapChangesResponse {}

export interface NoteSetRequest extends JmapSetArgs<NoteCreate, NoteUpdate> {}

export interface NoteCopyRequest extends JmapCopyArgs<NoteCreate> {}

export type NoteCopyResponse = JmapCopyResponse<Note>;

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

export type NoteQuerySort =
  | JmapComparator<Exclude<NoteQuerySortProperty, "hasKeyword">>
  | (JmapComparator<"hasKeyword"> & { keyword: string });

export interface NoteQueryRequest extends JmapQueryArgs<NoteFilter, NoteQuerySort> {}

export type NoteQueryResponse = JmapQueryResponse;

export interface NoteQueryChangesRequest extends JmapQueryChangesArgs<NoteFilter, NoteQuerySort> {}

export interface NoteQueryChangesResponse extends JmapQueryChangesResponse {}
