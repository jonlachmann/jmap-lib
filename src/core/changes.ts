export interface JmapChangesArgs {
  accountId: string;
  sinceState: string;
  maxChanges?: number | null;
}

export interface JmapChangesResponse {
  accountId: string;
  oldState: string;
  newState: string;
  hasMoreChanges: boolean;
  created: string[];
  updated: string[];
  destroyed: string[];
}
