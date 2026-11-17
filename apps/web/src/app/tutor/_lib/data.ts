import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

export function rows<T>(result: { data: T[] | null; error: PostgrestError | null }): T[] {
  if (result.error) throw result.error;
  return result.data ?? [];
}

export function row<T>(result: { data: T | null; error: PostgrestError | null }): T | null {
  if (result.error) throw result.error;
  return result.data;
}

export function isUuid(value: string) {
  return z.uuid().safeParse(value).success;
}

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
