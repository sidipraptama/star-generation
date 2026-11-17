import { redirect } from "next/navigation";
import { getProfile, homePathFor } from "@/lib/auth";

export default async function Home() {
  const profile = await getProfile();
  redirect(profile ? homePathFor(profile.role) : "/login");
}
