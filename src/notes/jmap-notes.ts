import { CORE_NOTES_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { AccountId } from "../core/ids";
import type { JmapChangesResponse } from "../core/changes";
import type { FilterOperatorCondition } from "../core/query";
import type { JmapSetResponse } from "../core/set";
import { getSetError } from "../core/set";
import {
  NoteBookChanges,
  NoteBookGet,
  NoteBookSet,
  NoteChanges,
  NoteCopy,
  NoteGet,
  NoteQuery,
  NoteQueryChanges,
  NoteSet,
} from "./methods";
import type {
  Note,
  NoteBook,
  NoteBookChangesRequest,
  NoteBookCreate,
  NoteBookGetRequest,
  NoteBookGetResponse,
  NoteBookSetRequest,
  NoteBookUpdate,
  NoteChangesRequest,
  NoteCopyRequest,
  NoteCopyResponse,
  NoteCreate,
  NoteFilter,
  NoteGetRequest,
  NoteGetResponse,
  NoteProperty,
  NoteQueryChangesRequest,
  NoteQueryChangesResponse,
  NoteQueryRequest,
  NoteQueryResponse,
  NoteQuerySort,
  NoteSetRequest,
  NoteUpdate,
} from "./types";

export const DEFAULT_NOTE_PROPERTIES = [
  "id",
  "noteBookId",
  "uid",
  "createdBy",
  "title",
  "description",
  "descriptionContentType",
  "color",
  "keywords",
  "created",
  "updated",
] as const satisfies readonly NoteProperty[];

export class JmapNotes {
  constructor(private readonly client: JmapClient) {}

  // --- NoteBook operations ---

  async listNoteBooks(accountId: AccountId): Promise<NoteBook[]> {
    const response = await this.client.invoke<NoteBookGetRequest, NoteBookGetResponse>(
      NoteBookGet.all(accountId),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );
    return response.list;
  }

  async getNoteBooks(accountId: AccountId): Promise<NoteBookGetResponse> {
    return this.client.invoke<NoteBookGetRequest, NoteBookGetResponse>(
      NoteBookGet.all(accountId),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );
  }

  async getNoteBookChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<JmapChangesResponse> {
    return this.client.invoke<NoteBookChangesRequest, JmapChangesResponse>(
      new NoteBookChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );
  }

  async createNoteBook(
    accountId: AccountId,
    clientId: string,
    noteBook: NoteBookCreate,
  ): Promise<string> {
    const response = await this.client.invoke<NoteBookSetRequest, JmapSetResponse>(
      new NoteBookSet({
        accountId: accountId.value,
        create: { [clientId]: noteBook },
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create notebook");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("NoteBook/set did not return an id");
    }

    return createdId;
  }

  async updateNoteBook(
    accountId: AccountId,
    noteBookId: string,
    updates: NoteBookUpdate,
  ): Promise<void> {
    const response = await this.client.invoke<NoteBookSetRequest, JmapSetResponse>(
      new NoteBookSet({
        accountId: accountId.value,
        update: { [noteBookId]: updates },
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", noteBookId);
    if (error) {
      throw new Error(error.description || "Failed to update notebook");
    }
  }

  async destroyNoteBook(
    accountId: AccountId,
    noteBookId: string,
    onDestroyRemoveNotes?: boolean,
  ): Promise<void> {
    const response = await this.client.invoke<NoteBookSetRequest, JmapSetResponse>(
      new NoteBookSet({
        accountId: accountId.value,
        destroy: [noteBookId],
        onDestroyRemoveNotes,
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", noteBookId);
    if (error) {
      throw new Error(error.description || "Failed to delete notebook");
    }
  }

  // --- Note operations ---

  async listNotes(
    accountId: AccountId,
    noteBookId?: string,
    properties: readonly NoteProperty[] = DEFAULT_NOTE_PROPERTIES,
  ): Promise<Note[]> {
    const PAGE_SIZE = 256;
    const allNotes: Note[] = [];
    let position = 0;

    for (;;) {
      const batch = this.client.batch({ capabilities: CORE_NOTES_CAPABILITIES });
      const queryCallId = batch.call(new NoteQuery({
        accountId: accountId.value,
        filter: noteBookId ? { inNoteBook: noteBookId } : undefined,
        limit: PAGE_SIZE,
        position,
        calculateTotal: true,
      }));
      const getCallId = batch.call(NoteGet.byQueryResult(accountId, queryCallId, properties));
      const response = await batch.send();

      const queryResult = response.get<NoteQueryResponse>(queryCallId, "Note/query");
      const notes = response.get<NoteGetResponse>(getCallId, "Note/get").list;
      allNotes.push(...notes);

      const total = queryResult.total ?? notes.length;
      position += notes.length;
      if (position >= total || notes.length < PAGE_SIZE) break;
    }

    return allNotes;
  }

  async queryNotes(
    accountId: AccountId,
    filter: FilterOperatorCondition<NoteFilter>,
    options?: {
      sort?: readonly NoteQuerySort[];
      limit?: number;
      properties?: readonly NoteProperty[];
    },
  ): Promise<Note[]> {
    const batch = this.client.batch({ capabilities: CORE_NOTES_CAPABILITIES });
    const queryCallId = batch.call(new NoteQuery({
      accountId: accountId.value,
      filter,
      sort: options?.sort,
      limit: options?.limit ?? 100,
    } satisfies NoteQueryRequest));
    const getCallId = batch.call(
      NoteGet.byQueryResult(accountId, queryCallId, options?.properties ?? DEFAULT_NOTE_PROPERTIES),
    );
    const response = await batch.send();
    return response.get<NoteGetResponse>(getCallId, "Note/get").list;
  }

  async queryNoteChanges(
    accountId: AccountId,
    options: {
      filter?: FilterOperatorCondition<NoteFilter>;
      sort?: readonly NoteQuerySort[];
      sinceQueryState: string;
      maxChanges?: number;
      upToId?: string;
      calculateTotal?: boolean;
    },
  ): Promise<NoteQueryChangesResponse> {
    return this.client.invoke<NoteQueryChangesRequest, NoteQueryChangesResponse>(
      new NoteQueryChanges({
        accountId: accountId.value,
        filter: options.filter,
        sort: options.sort,
        sinceQueryState: options.sinceQueryState,
        maxChanges: options.maxChanges,
        upToId: options.upToId,
        calculateTotal: options.calculateTotal,
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );
  }

  async getNote(
    accountId: AccountId,
    noteId: string,
    properties: readonly NoteProperty[] = DEFAULT_NOTE_PROPERTIES,
  ): Promise<Note | undefined> {
    const response = await this.client.invoke<NoteGetRequest, NoteGetResponse>(
      NoteGet.byIds(accountId, [noteId], properties),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );
    return response.list[0];
  }

  /** Notes by id with the state they are at; no ids gives the state alone. */
  async getNotes(
    accountId: AccountId,
    ids: readonly string[],
    properties: readonly NoteProperty[] = DEFAULT_NOTE_PROPERTIES,
  ): Promise<NoteGetResponse> {
    return this.client.invoke<NoteGetRequest, NoteGetResponse>(
      NoteGet.byIds(accountId, ids, properties),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );
  }

  async getNoteChanges(
    accountId: AccountId,
    sinceState: string,
    options?: { maxChanges?: number },
  ): Promise<JmapChangesResponse> {
    return this.client.invoke<NoteChangesRequest, JmapChangesResponse>(
      new NoteChanges({
        accountId: accountId.value,
        sinceState,
        maxChanges: options?.maxChanges,
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );
  }

  async createNote(
    accountId: AccountId,
    clientId: string,
    note: NoteCreate,
  ): Promise<string> {
    const response = await this.client.invoke<NoteSetRequest, JmapSetResponse>(
      new NoteSet({
        accountId: accountId.value,
        create: { [clientId]: note },
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    const error = getSetError(response, "notCreated", clientId);
    if (error) {
      throw new Error(error.description || "Failed to create note");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("Note/set did not return an id");
    }

    return createdId;
  }

  async updateNote(
    accountId: AccountId,
    noteId: string,
    updates: NoteUpdate,
  ): Promise<void> {
    const response = await this.client.invoke<NoteSetRequest, JmapSetResponse>(
      new NoteSet({
        accountId: accountId.value,
        update: { [noteId]: updates },
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", noteId);
    if (error) {
      throw new Error(error.description || "Failed to update note");
    }
  }

  async setFlagged(accountId: AccountId, noteId: string, flagged: boolean): Promise<void> {
    await this.updateNote(accountId, noteId, { "keywords/$flagged": flagged ? true : null });
  }

  async moveNote(accountId: AccountId, noteId: string, noteBookId: string): Promise<void> {
    await this.updateNote(accountId, noteId, { noteBookId });
  }

  async destroyNote(accountId: AccountId, noteId: string): Promise<void> {
    const response = await this.client.invoke<NoteSetRequest, JmapSetResponse>(
      new NoteSet({
        accountId: accountId.value,
        destroy: [noteId],
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    const error = getSetError(response, "notDestroyed", noteId);
    if (error) {
      throw new Error(error.description || "Failed to delete note");
    }
  }

  async copyNote(
    accountId: AccountId,
    fromAccountId: AccountId,
    clientId: string,
    note: NoteCreate & { id: string },
    options?: {
      onSuccessDestroyOriginal?: boolean;
    },
  ): Promise<string> {
    const response = await this.client.invoke<NoteCopyRequest, NoteCopyResponse>(
      new NoteCopy({
        fromAccountId: fromAccountId.value,
        accountId: accountId.value,
        create: { [clientId]: note },
        onSuccessDestroyOriginal: options?.onSuccessDestroyOriginal,
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    const notCreated = response.notCreated?.[clientId];
    if (notCreated) {
      throw new Error(notCreated.description || "Failed to copy note");
    }

    const createdId = response.created?.[clientId]?.id;
    if (!createdId) {
      throw new Error("Note/copy did not return an id");
    }

    return createdId;
  }
}
