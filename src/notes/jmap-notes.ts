import { paginate } from "../core/paginate.js";
import { CORE_NOTES_CAPABILITIES } from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { AccountId } from "../core/ids.js";
import type { JmapFilter } from "../core/query.js";
import type { JmapCreated, JmapSetResponse } from "../core/set.js";
import { CREATION_ID, createdOne, assertSetOk } from "../core/set.js";
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
} from "./methods.js";
import type {
  Note,
  NoteBookChangesRequest,
  NoteBookChangesResponse,
  NoteBookCreate,
  NoteBookGetRequest,
  NoteBookGetResponse,
  NoteBookSetRequest,
  NoteBookUpdate,
  NoteChangesRequest,
  NoteChangesResponse,
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
  NoteQuerySort,
  NoteSetRequest,
  NoteUpdate,
} from "./types.js";

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
  ): Promise<NoteBookChangesResponse> {
    return this.client.invoke<NoteBookChangesRequest, NoteBookChangesResponse>(
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
    noteBook: NoteBookCreate,
  ): Promise<JmapCreated> {
    const response = await this.client.invoke<NoteBookSetRequest, JmapSetResponse>(
      new NoteBookSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: noteBook },
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    return createdOne(response, "notebook");
  }

  async updateNoteBook(
    accountId: AccountId,
    noteBookId: string,
    updates: NoteBookUpdate,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<NoteBookSetRequest, JmapSetResponse>(
      new NoteBookSet({
        accountId: accountId.value,
        update: { [noteBookId]: updates },
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    assertSetOk(response, "notebook");

    return response;
  }

  async destroyNoteBook(
    accountId: AccountId,
    noteBookId: string,
    onDestroyRemoveNotes?: boolean,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<NoteBookSetRequest, JmapSetResponse>(
      new NoteBookSet({
        accountId: accountId.value,
        destroy: [noteBookId],
        onDestroyRemoveNotes,
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    assertSetOk(response, "notebook");

    return response;
  }

  // --- Note operations ---

  async listNotes(
    accountId: AccountId,
    noteBookId?: string,
    properties: readonly NoteProperty[] = DEFAULT_NOTE_PROPERTIES,
  ): Promise<Note[]> {
    return paginate<Note>(
      this.client,
      CORE_NOTES_CAPABILITIES,
      (position, limit) => new NoteQuery({
        accountId: accountId.value,
        filter: noteBookId ? { inNoteBook: noteBookId } : undefined,
        position,
        limit,
      }),
      (queryCallId) => NoteGet.byQueryResult(accountId, queryCallId, properties),
    );
  }

  async queryNotes(
    accountId: AccountId,
    filter: JmapFilter<NoteFilter>,
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
      filter?: JmapFilter<NoteFilter>;
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
  ): Promise<NoteChangesResponse> {
    return this.client.invoke<NoteChangesRequest, NoteChangesResponse>(
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
    note: NoteCreate,
  ): Promise<JmapCreated> {
    const response = await this.client.invoke<NoteSetRequest, JmapSetResponse>(
      new NoteSet({
        accountId: accountId.value,
        create: { [CREATION_ID]: note },
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    return createdOne(response, "note");
  }

  async updateNote(
    accountId: AccountId,
    noteId: string,
    updates: NoteUpdate,
  ): Promise<JmapSetResponse> {
    const response = await this.client.invoke<NoteSetRequest, JmapSetResponse>(
      new NoteSet({
        accountId: accountId.value,
        update: { [noteId]: updates },
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    assertSetOk(response, "note");

    return response;
  }

  async setFlagged(accountId: AccountId, noteId: string, flagged: boolean): Promise<void> {
    await this.updateNote(accountId, noteId, { "keywords/$flagged": flagged ? true : null });
  }

  async moveNote(accountId: AccountId, noteId: string, noteBookId: string): Promise<void> {
    await this.updateNote(accountId, noteId, { noteBookId });
  }

  async destroyNote(accountId: AccountId, noteId: string): Promise<JmapSetResponse> {
    const response = await this.client.invoke<NoteSetRequest, JmapSetResponse>(
      new NoteSet({
        accountId: accountId.value,
        destroy: [noteId],
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    assertSetOk(response, "note");

    return response;
  }

  async copyNote(
    accountId: AccountId,
    fromAccountId: AccountId,
    note: NoteCreate & { id: string },
    options?: {
      onSuccessDestroyOriginal?: boolean;
    },
  ): Promise<JmapCreated<NoteCopyResponse>> {
    const response = await this.client.invoke<NoteCopyRequest, NoteCopyResponse>(
      new NoteCopy({
        fromAccountId: fromAccountId.value,
        accountId: accountId.value,
        create: { [CREATION_ID]: note },
        onSuccessDestroyOriginal: options?.onSuccessDestroyOriginal,
      }),
      { capabilities: CORE_NOTES_CAPABILITIES },
    );

    return createdOne(response, "note");
  }
}
