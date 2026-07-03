/**
 * Utilities for scanning a long list (filter out invalid entries, drop
 * duplicates) and sorting the result. `scanAndSort` is the simple
 * synchronous version; `scanAndSortAsync` processes the list in chunks and
 * yields to the event loop between chunks, so very large lists don't freeze
 * the UI or block the server.
 */

export interface ScanOptions<T> {
  /** Keep only items that pass this test. Defaults to dropping null/undefined. */
  isValid?: (item: T) => boolean;
  /** Items with the same key are considered duplicates; the first one wins. */
  dedupeBy?: (item: T) => unknown;
  /** Sort comparator. Defaults to ascending by `<`/`>` (numbers, strings, dates). */
  compare?: (a: T, b: T) => number;
  /** Sort direction, applied on top of `compare`. */
  direction?: "asc" | "desc";
}

export interface ScanResult<T> {
  /** The scanned, deduplicated, sorted list. */
  items: T[];
  /** How many items were in the input. */
  scanned: number;
  /** How many items failed the validity check. */
  invalid: number;
  /** How many duplicates were dropped. */
  duplicates: number;
}

function defaultCompare<T>(a: T, b: T): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function buildComparator<T>(options: ScanOptions<T>): (a: T, b: T) => number {
  const compare = options.compare ?? defaultCompare;
  return options.direction === "desc" ? (a, b) => compare(b, a) : compare;
}

/**
 * Scan a list in a single pass — dropping invalid entries and duplicates —
 * then sort it. The input array is not modified.
 *
 *   scanAndSort([3, null, 1, 3, 2])
 *   // => { items: [1, 2, 3], scanned: 5, invalid: 1, duplicates: 1 }
 *
 *   scanAndSort(users, {
 *     dedupeBy: (u) => u.email,
 *     compare: (a, b) => a.name.localeCompare(b.name),
 *   })
 */
export function scanAndSort<T>(
  list: readonly T[],
  options: ScanOptions<T> = {},
): ScanResult<T> {
  const isValid = options.isValid ?? ((item: T) => item != null);
  const seen = options.dedupeBy ? new Set<unknown>() : null;

  const items: T[] = [];
  let invalid = 0;
  let duplicates = 0;

  for (const item of list) {
    if (!isValid(item)) {
      invalid++;
      continue;
    }
    if (seen && options.dedupeBy) {
      const key = options.dedupeBy(item);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
    }
    items.push(item);
  }

  items.sort(buildComparator(options));

  return { items, scanned: list.length, invalid, duplicates };
}

/**
 * Same as `scanAndSort`, but scans the list in chunks and yields to the
 * event loop between chunks. Use this for lists large enough that a
 * synchronous pass would block rendering (roughly 100k+ items).
 */
export async function scanAndSortAsync<T>(
  list: readonly T[],
  options: ScanOptions<T> & { chunkSize?: number } = {},
): Promise<ScanResult<T>> {
  const isValid = options.isValid ?? ((item: T) => item != null);
  const seen = options.dedupeBy ? new Set<unknown>() : null;
  const chunkSize = options.chunkSize ?? 10_000;

  const items: T[] = [];
  let invalid = 0;
  let duplicates = 0;

  for (let start = 0; start < list.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, list.length);
    for (let i = start; i < end; i++) {
      const item = list[i];
      if (!isValid(item)) {
        invalid++;
        continue;
      }
      if (seen && options.dedupeBy) {
        const key = options.dedupeBy(item);
        if (seen.has(key)) {
          duplicates++;
          continue;
        }
        seen.add(key);
      }
      items.push(item);
    }
    if (end < list.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  items.sort(buildComparator(options));

  return { items, scanned: list.length, invalid, duplicates };
}
