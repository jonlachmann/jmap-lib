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
