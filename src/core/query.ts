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
  conditions: readonly FilterOperatorCondition<Condition>[];
}

export type FilterOperatorCondition<Condition> =
  | JmapFilterCondition<Condition>
  | JmapFilterOperator<Condition>;

export interface JmapQueryArgs<Filter, Sort> {
  accountId: string;
  filter?: FilterOperatorCondition<Filter> | null;
  sort?: readonly Sort[] | null;
  position?: number;
  anchor?: string | null;
  anchorOffset?: number;
  limit?: number | null;
  calculateTotal?: boolean;
}

export interface JmapQueryChangesArgs<Filter, Sort> {
  accountId: string;
  filter?: FilterOperatorCondition<Filter> | null;
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
  added?: readonly JmapQueryAddedItem[] | null;
}
