import type { CallId } from "./ids.js";

/** An argument taken from the result of an earlier call in the same request (RFC 8620 3.7). */
export interface JmapResultReference<Name extends string = string> {
  resultOf: string;
  name: Name;
  path: string;
}

/** Refer to the value at path in the result of the call with callId, which must be the method name. */
export function resultOf<Name extends string>(callId: CallId, name: Name, path: string): JmapResultReference<Name> {
  return { resultOf: callId.value, name, path };
}
