import type { JmapSetError } from "./set.js";

/** RFC 8620 5.4: each object to create names the id of the one it copies. */
export interface JmapCopyArgs<TCreate> {
  fromAccountId: string;
  ifFromInState?: string | null;
  accountId: string;
  ifInState?: string | null;
  create: Record<string, TCreate & { id: string }>;
  onSuccessDestroyOriginal?: boolean;
  destroyFromIfInState?: string | null;
}

export interface JmapCopyResponse<Created extends { id: string } = { id: string }> {
  fromAccountId: string;
  accountId: string;
  oldState: string | null;
  newState: string;
  created?: Record<string, Created> | null;
  notCreated?: Record<string, JmapSetError> | null;
}
