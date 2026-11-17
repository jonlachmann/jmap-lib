export interface JmapComparator<Property extends string = string> {
  property: Property;
  isAscending?: boolean;
  collation?: string;
}

export interface JmapQueryAddedItem {
  id: string;
  index: number;
}

export type JmapFilterOperatorName = "AND" | "OR" | "NOT";

export type JmapFilterCondition<Condition> = Condition & {
  operator?: never;
  conditions?: never;
};

export interface JmapFilterOperator<Condition> {
  operator: JmapFilterOperatorName;
  conditions: readonly JmapFilter<Condition>[];
}

export type JmapFilter<Condition> =
  | JmapFilterCondition<Condition>
  | JmapFilterOperator<Condition>;

/** A filter matching any of the ids by the condition that names one (inCalendar, inTaskList), or none for no ids. */
export function inAny<Name extends string>(
  condition: Name,
  ids: readonly string[] | undefined,
): JmapFilter<Record<Name, string>> | undefined {
  if (!ids?.length) return undefined;
  const conditions = ids.map((id) => ({ [condition]: id }) as JmapFilterCondition<Record<Name, string>>);
  return conditions.length === 1 ? conditions[0] : { operator: "OR", conditions };
}

export interface JmapQueryArgs<Filter, Sort> {
  accountId: string;
  filter?: JmapFilter<Filter> | null;
  sort?: readonly Sort[] | null;
  position?: number;
  anchor?: string | null;
  anchorOffset?: number;
  limit?: number | null;
  calculateTotal?: boolean;
}

/** RFC 8620 5.5. */
export interface JmapQueryResponse {
  accountId: string;
  queryState: string;
  canCalculateChanges: boolean;
  position: number;
  ids: string[];
  total?: number;
  /** Present when the server returned fewer ids than asked for. */
  limit?: number;
}

export interface JmapQueryChangesArgs<Filter, Sort> {
  accountId: string;
  filter?: JmapFilter<Filter> | null;
  sort?: readonly Sort[] | null;
  sinceQueryState: string;
  maxChanges?: number | null;
  upToId?: string | null;
  calculateTotal?: boolean;
}

export interface JmapQueryChangesResponse {
  accountId: string;
  oldQueryState: string;
  newQueryState: string;
  total?: number;
  removed: string[];
  added: readonly JmapQueryAddedItem[];
}
