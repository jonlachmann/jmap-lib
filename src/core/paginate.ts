import type { JmapClient } from "./client.js";
import type { JmapGetResponse } from "./get.js";
import type { CallId } from "./ids.js";
import type { JmapMethod } from "./method.js";
import type { JmapQueryResponse } from "./query.js";

const DEFAULT_PAGE_SIZE = 256;

/**
 * Read every object a query finds, a page per request of a query and a /get of its ids.
 *
 * Pages advance by the ids the query gave, so ids the /get didn't find shift nothing, and a server that returns fewer
 * than asked for, saying so with limit (RFC 8620 5.5), is asked again from where it stopped.
 *
 * @param client The client to send each page with, whose session caps a page at maxObjectsInGet.
 * @param capabilities The capabilities each request names; the client's own when undefined.
 * @param query The query for the page starting at position, of at most limit ids.
 * @param get The /get of the ids the query call with queryCallId found.
 */
export async function paginate<T>(
  client: JmapClient,
  capabilities: readonly string[] | undefined,
  query: (position: number, limit: number) => JmapMethod<unknown, JmapQueryResponse>,
  get: (queryCallId: CallId) => JmapMethod<unknown, JmapGetResponse<T>>,
): Promise<T[]> {
  const limit = Math.min(DEFAULT_PAGE_SIZE, client.limits?.maxObjectsInGet ?? DEFAULT_PAGE_SIZE);
  const all: T[] = [];
  let position = 0;

  for (;;) {
    const batch = client.batch({ capabilities });
    const queryMethod = query(position, limit);
    const queryCallId = batch.call(queryMethod);
    const getMethod = get(queryCallId);
    const getCallId = batch.call(getMethod);
    const response = await batch.send();

    const page = response.get<JmapQueryResponse>(queryCallId, queryMethod.methodName);
    all.push(...response.get<JmapGetResponse<T>>(getCallId, getMethod.methodName).list);

    position += page.ids.length;
    // A server that gave fewer than asked for says so with limit; fewer than that is the last page
    if (page.ids.length < (page.limit ?? limit) || position >= (page.total ?? Infinity)) return all;
  }
}
