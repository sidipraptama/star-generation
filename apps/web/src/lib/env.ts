import { z } from "zod";

// Public demo key of the docker-compose stack (see docker-compose.yml); not a secret.
const localDefaults = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN0YXItZ2VuZXJhdGlvbi1sb2NhbCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.ARuedOE0-kuhEE-fkxnolshtptNvWgKybrAJ06hU_48",
};

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Read lazily so `next build` does not need runtime configuration. */
export function getEnv(): Env {
  if (cached) return cached;

  const fallback: Partial<Env> = process.env.NODE_ENV === "production" ? {} : localDefaults;
  cached = schema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL ?? fallback.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? fallback.SUPABASE_ANON_KEY,
  });
  return cached;
}
