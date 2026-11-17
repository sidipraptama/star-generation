import "server-only";
import { z } from "zod";
import { param } from "@/lib/list";
import { createClient } from "@/lib/supabase/server";

/** A filter that holds an id: anything that is not a valid id is ignored. */
export function idParam(value: string | string[] | undefined) {
  const text = param(value);
  return text && z.uuid().safeParse(text).success ? text : undefined;
}

/** The names shown on the tutor and class filters, which may not be in their first page of options. */
export async function filterLabels(filters: { tutor?: string; class?: string }) {
  const db = await createClient();
  const [tutor, selectedClass] = await Promise.all([
    filters.tutor
      ? db.from("profiles").select("full_name").eq("id", filters.tutor).maybeSingle()
      : null,
    filters.class ? db.from("classes").select("name").eq("id", filters.class).maybeSingle() : null,
  ]);
  return { tutor: tutor?.data?.full_name, class: selectedClass?.data?.name };
}
