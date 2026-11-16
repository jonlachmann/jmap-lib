export interface JmapMethodError {
  type?: string;
  description?: string;
  [key: string]: unknown;
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
  oldState?: string;
  newState?: string;
  created?: Record<string, Created>;
  notCreated?: Record<string, JmapMethodError>;
  /** Per id, null, or the properties the server changed beyond the patch (RFC 8620 5.3). */
  updated?: Record<string, Record<string, unknown> | null>;
  notUpdated?: Record<string, JmapMethodError>;
  destroyed?: string[];
  notDestroyed?: Record<string, JmapMethodError>;
}

export function getSetError(
  response: JmapSetResponse,
  operation: "notCreated" | "notUpdated" | "notDestroyed",
  id: string,
): JmapMethodError | undefined {
  return response[operation]?.[id];
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
 * @param what The object's kind, for the error ("task", "address book").
 * @throws The server's refusal (notCreated), or an error when it gave the object no id.
 */
export function createdOne<Response extends {
  created?: Record<string, { id?: string }> | null;
  notCreated?: Record<string, JmapMethodError> | null;
}>(response: Response, what: string): JmapCreated<Response> {
  const error = response.notCreated?.[CREATION_ID];
  if (error) {
    throw new Error(error.description || `Failed to create ${what}`);
  }
  const id = response.created?.[CREATION_ID]?.id;
  if (!id) {
    throw new Error(`The server created the ${what} without an id`);
  }
  return { id, response };
}
