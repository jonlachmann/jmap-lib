import type { JmapResultReference } from "./reference.js";

export interface JmapGetArgs<Property extends string = never> {
  accountId: string;
  ids?: readonly string[] | null;
  /** The ids from an earlier call's result, in place of ids. */
  "#ids"?: JmapResultReference;
  properties?: readonly Property[] | null;
}

/** RFC 8620 5.1. */
export interface JmapGetResponse<T> {
  accountId: string;
  state: string;
  list: T[];
  notFound: string[];
}

/**
 * Read objects by id with a /get per maxObjectsInGet of the ids (all at once without the session), sent together.
 * @returns Every chunk's objects, in the order of the chunks.
 */
export async function getInChunks<T>(
  client: { limits?: { maxObjectsInGet: number } },
  ids: readonly string[],
  get: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  const size = client.limits?.maxObjectsInGet || ids.length || 1;
  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += size) {
    chunks.push(ids.slice(start, start + size));
  }
  return (await Promise.all(chunks.map((chunk) => get(chunk)))).flat();
}
