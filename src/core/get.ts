export interface JmapGetArgs<Property extends string = never> {
  accountId: string;
  ids?: readonly string[] | null;
  properties?: readonly Property[] | null;
}
