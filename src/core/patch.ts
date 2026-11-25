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

type JmapPatchValueWithin<T> =
  T extends readonly unknown[]
    ? never
    : T extends object
      ? { [Key in StringKeyOf<T>]: NonNullable<T[Key]> | JmapPatchValueWithin<NonNullable<T[Key]>> }[StringKeyOf<T>]
      : never;

// A path to a map's entry ("participants/${string}") matches every longer path through it too, so a key such as
// "participants/a/participationStatus" is checked against the entry's type; the entry also takes any value within it.
type JmapPatchEntryValue<T, Path extends string> =
  Path extends `${infer Head}/${infer Tail}`
    ? Head extends keyof T
      ? NonNullable<T[Head]> extends readonly unknown[]
        ? never
        : NonNullable<T[Head]> extends object
          ? JmapPatchEntryValue<NonNullable<T[Head]>, Tail>
          : never
      : never
    : Path extends keyof T
      ? string extends keyof T
        ? NonNullable<T[Path]> | JmapPatchValueWithin<NonNullable<T[Path]>>
        : NonNullable<T[Path]>
      : never;

export type JmapPatchObject<T extends object> =
  Partial<T> & {
    [Path in JmapNestedPatchPath<T>]?: JmapPatchEntryValue<T, Path> | null;
  };

/** Escape a key for a patch path, as JSON Pointer does (RFC 6901 3): a keyword or id may hold "~" or "/". */
export function patchPathKey(key: string): string {
  return key.replaceAll("~", "~0").replaceAll("/", "~1");
}

/**
 * Apply a PatchObject (RFC 8620 5.3) to a copy of the object: each key a path into it, its parts escaped as JSON
 * Pointer's, null taking away what it names. A path through a missing object creates it.
 */
export function applyPatch<T>(object: T, patch: Readonly<Record<string, unknown>>): T {
  const copy = structuredClone(object) as Record<string, unknown>;
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split("/").map((key) => key.replaceAll("~1", "/").replaceAll("~0", "~"));
    let target = copy;
    for (const key of keys.slice(0, -1)) {
      target = (target[key] ??= {}) as Record<string, unknown>;
    }
    const last = keys[keys.length - 1];
    if (value === null) {
      delete target[last];
    } else {
      target[last] = value;
    }
  }
  return copy as T;
}
