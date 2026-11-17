import { z } from "zod";

// Supabase CLI prints these fixed values for every local stack; they are not secrets.
const localDefaults = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
};

const fallback: Partial<typeof localDefaults> =
  process.env.NODE_ENV === "production" ? {} : localDefaults;

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = schema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL ?? fallback.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? fallback.SUPABASE_ANON_KEY,
});
