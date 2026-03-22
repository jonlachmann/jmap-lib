export interface JmapMethodError {
  type?: string;
  description?: string;
  [key: string]: unknown;
}

export interface JmapSetResponse<Created extends { id: string } = { id: string }> {
  accountId: string;
  oldState?: string;
  newState?: string;
  created?: Record<string, Created>;
  notCreated?: Record<string, JmapMethodError>;
  updated?: Record<string, null>;
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
