type StringKeyOf<T> = Extract<keyof T, string>;

export type JmapPatchPath<T> =
  T extends readonly unknown[]
    ? never
    : T extends object
      ? {
          [Key in StringKeyOf<T>]:
            | `${Key}`
            | (
                JmapPatchPath<NonNullable<T[Key]>> extends never
                  ? never
                  : `${Key}/${JmapPatchPath<NonNullable<T[Key]>>}`
              );
        }[StringKeyOf<T>]
      : never;

export type JmapNestedPatchPath<T> =
  T extends object
    ? {
        [Key in StringKeyOf<T>]:
          JmapPatchPath<NonNullable<T[Key]>> extends never
            ? never
            : `${Key}/${JmapPatchPath<NonNullable<T[Key]>>}`;
      }[StringKeyOf<T>]
    : never;

export type JmapPatchValueAtPath<T, Path extends string> =
  Path extends `${infer Head}/${infer Tail}`
    ? Head extends keyof T
      ? NonNullable<T[Head]> extends readonly unknown[]
        ? never
        : NonNullable<T[Head]> extends object
          ? JmapPatchValueAtPath<NonNullable<T[Head]>, Tail>
          : never
      : never
    : Path extends keyof T
      ? NonNullable<T[Path]>
      : never;

export type JmapPatchObject<T extends object> =
  Partial<T> & {
    [Path in JmapNestedPatchPath<T>]?: JmapPatchValueAtPath<T, Path> | null;
  };
