import "server-only";
import { revalidatePath } from "next/cache";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type ActionState = { ok: true } | { ok: false; error: string } | null;

type Db = SupabaseClient<Database>;

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function friendlyError(error: PostgrestError) {
  switch (error.code) {
    case "P0001":
      return error.message;
    case "42501":
      return "You are not allowed to do this.";
    case "23P01":
      return "That time overlaps with another lesson.";
    case "23505":
      return "That already exists.";
    case "23514":
      return "Some of the values are not valid. Please check the form.";
    default:
      console.error(error);
      return GENERIC_ERROR;
  }
}

/** Validates form input, runs one database function as the signed-in user and reports the result. */
export async function rpcAction<S extends z.ZodType>(
  formData: FormData,
  schema: S,
  call: (db: Db, input: z.infer<S>) => PromiseLike<{ error: PostgrestError | null }>,
): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const db = await createClient();
  const { error } = await call(db, parsed.data);
  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/", "layout");
  return { ok: true };
}
