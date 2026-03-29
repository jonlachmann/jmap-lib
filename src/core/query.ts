export interface JmapComparator<Property extends string = string> {
  property: Property;
  isAscending?: boolean;
  collation?: string;
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
