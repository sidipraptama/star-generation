"use server";

import { createClient } from "@/lib/supabase/server";
import { escapeLike, PAGE_SIZE, parseOffset, toPage, type OptionPage } from "@/lib/options";

const searchTerm = (query: string) =>
  String(query ?? "")
    .trim()
    .slice(0, 100);

/** Loaders for the Combobox: one page per call, so long lists load as you scroll. */
export async function searchTutors(query: string, offset: number): Promise<OptionPage> {
  const start = parseOffset(offset);
  const db = await createClient();

  let request = db
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "tutor")
    .order("full_name")
    .range(start, start + PAGE_SIZE);

  const term = searchTerm(query);
  if (term) request = request.ilike("full_name", `%${escapeLike(term)}%`);

  const { data } = await request;
  return toPage(data ?? [], (tutor) => ({
    value: tutor.id,
    label: tutor.full_name,
    hint: tutor.email,
  }));
}

export async function searchClasses(query: string, offset: number): Promise<OptionPage> {
  const start = parseOffset(offset);
  const db = await createClient();

  let request = db
    .from("classes")
    .select("id, name")
    .order("name")
    .range(start, start + PAGE_SIZE);

  const term = searchTerm(query);
  if (term) request = request.ilike("name", `%${escapeLike(term)}%`);

  const { data } = await request;
  return toPage(data ?? [], (item) => ({ value: item.id, label: item.name }));
}
