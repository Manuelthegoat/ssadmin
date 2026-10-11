import { supabase } from "./supabase";

// swap two neighbours, then renumber so the order is always 0,1,2...
// returns an error message, or null if it worked
export async function reorder(
  table: string,
  rows: { id: string; sort_order: number }[],
  index: number,
  direction: -1 | 1,
): Promise<string | null> {
  const target = index + direction;
  if (target < 0 || target >= rows.length) return null;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  const results = await Promise.all(
    next.map((r, i) =>
      r.sort_order === i
        ? Promise.resolve({ error: null })
        : supabase.from(table).update({ sort_order: i }).eq("id", r.id),
    ),
  );
  return results.find((r) => r.error)?.error?.message ?? null;
}