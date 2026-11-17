/** Why the server refused to create, update or destroy one object (RFC 8620 5.3). */
export interface JmapSetError {
  type: string;
  description?: string | null;
  /** The properties at fault, for invalidProperties. */
  properties?: string[];
  [key: string]: unknown;
}

/** A /set or /copy the server refused for one object, with the SetError it gave. */
export class JmapSetRefusedError extends Error {
  readonly setError: JmapSetError;
  readonly id: string;
  readonly operation: "create" | "update" | "destroy";

  constructor(setError: JmapSetError, id: string, operation: "create" | "update" | "destroy", what: string) {
    super(setError.description || `Failed to ${operation} ${what}: ${setError.type}`);
    this.name = "JmapSetRefusedError";
    this.setError = setError;
    this.id = id;
    this.operation = operation;
  }
}

export interface JmapSetArgs<TCreate, TUpdate> {
  accountId: string;
  ifInState?: string | null;
  create?: Record<string, TCreate>;
  update?: Record<string, TUpdate>;
  destroy?: readonly string[];
}

export interface JmapSetResponse<Created extends { id: string } = { id: string }> {
  accountId: string;
  oldState: string | null;
  newState: string;
  created?: Record<string, Created> | null;
  notCreated?: Record<string, JmapSetError> | null;
  /** Per id, null, or the properties the server changed beyond the patch (RFC 8620 5.3). */
  updated?: Record<string, Record<string, unknown> | null> | null;
  notUpdated?: Record<string, JmapSetError> | null;
  destroyed?: string[] | null;
  notDestroyed?: Record<string, JmapSetError> | null;
}

export function getSetError(
  response: Pick<JmapSetResponse, "notCreated" | "notUpdated" | "notDestroyed">,
  operation: "notCreated" | "notUpdated" | "notDestroyed",
  id: string,
): JmapSetError | undefined {
  return response[operation]?.[id];
}

/**
 * Throw the first refusal in a /set or /copy response.
 *
 * @param response The /set or /copy response.
 * @param what The objects' kind, for the error's message when the server gave no description ("task", "mailbox").
 * @throws JmapSetRefusedError
 */
export function assertSetOk(
  response: Partial<Pick<JmapSetResponse, "notCreated" | "notUpdated" | "notDestroyed">>,
  what: string,
): void {
  const refusals = [
    ["create", response.notCreated],
    ["update", response.notUpdated],
    ["destroy", response.notDestroyed],
  ] as const;
  for (const [operation, errors] of refusals) {
    const [id, setError] = Object.entries(errors ?? {})[0] ?? [];
    if (id !== undefined && setError) throw new JmapSetRefusedError(setError, id, operation, what);
  }
}

/**
 * Send a /set per maxObjectsInSet of the items (all at once without the session), in turn. The answer has the first
 * request's oldState, the last one's newState, and every one's results. Each request stands alone: one refused leaves
 * those before it done.
 */
export async function setInChunks<Item>(
  client: { limits?: { maxObjectsInSet: number } },
  items: readonly Item[],
  send: (chunk: Item[]) => Promise<JmapSetResponse>,
): Promise<JmapSetResponse> {
  const size = client.limits?.maxObjectsInSet || items.length || 1;
  const responses: JmapSetResponse[] = [];
  for (let start = 0; start < Math.max(items.length, 1); start += size) {
    responses.push(await send(items.slice(start, start + size)));
  }
  return {
    ...responses[responses.length - 1],
    oldState: responses[0].oldState,
    updated: responses.some((response) => response.updated)
      ? Object.assign({}, ...responses.map((response) => response.updated ?? {}))
      : undefined,
    destroyed: responses.some((response) => response.destroyed)
      ? responses.flatMap((response) => response.destroyed ?? [])
      : undefined,
  };
}

/** The creation id a method that creates one object sends it under (RFC 8620 5.3); the object is known by no other. */
export const CREATION_ID = "new";

/** An object a /set or /copy created: its id, and the server's whole answer, for its new state. */
export interface JmapCreated<Response = JmapSetResponse> {
  id: string;
  response: Response;
}

/**
 * Read the one object a /set or /copy created under CREATION_ID.
 *
 * @param response The /set or /copy response.
 * @param what The object's kind, for the error ("task", "address book").
 * @throws JmapSetRefusedError for the server's refusal, or an error when it gave the object no id.
 */
export function createdOne<Response extends {
  created?: Record<string, { id?: string }> | null;
  notCreated?: Record<string, JmapSetError> | null;
}>(response: Response, what: string): JmapCreated<Response> {
  assertSetOk(response, what);
  const id = response.created?.[CREATION_ID]?.id;
  if (!id) {
    throw new Error(`The server created the ${what} without an id`);
  }
  return { id, response };
}
