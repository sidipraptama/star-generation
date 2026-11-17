import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["app_role"];

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
};

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", auth.user.id)
    .single();

  return data;
});

export function homePathFor(role: Role) {
  return `/${role}`;
}

export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(homePathFor(profile.role));
  return profile;
}
