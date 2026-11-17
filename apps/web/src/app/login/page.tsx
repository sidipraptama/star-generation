import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { getProfile, homePathFor } from "@/lib/auth";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const profile = await getProfile();
  if (profile) redirect(homePathFor(profile.role));

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="bg-gold text-navy mb-3 grid size-14 place-items-center rounded-full">
            <Star className="size-7" fill="currentColor" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">Star Generation</h1>
          <p className="text-muted mt-1 text-sm">Sign in to manage your classes and lessons.</p>
        </div>

        <ActionForm
          action={signIn}
          className="rounded-card border-cloud space-y-4 border bg-white p-6"
        >
          <Field label="Email" htmlFor="email">
            <Input name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </ActionForm>

        <p className="text-muted mt-4 text-center text-xs">
          Accounts are created by the Star Generation team. Forgot your login? Contact an admin.
        </p>
      </div>
    </main>
  );
}
