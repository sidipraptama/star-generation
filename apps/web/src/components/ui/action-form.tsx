"use client";

import { useActionState, useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import type { ActionState } from "@/lib/action";

type ActionFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  onSuccess?: () => void;
  className?: string;
  children: React.ReactNode;
};

export function ActionForm({ action, onSuccess, className, children }: ActionFormProps) {
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className={className}>
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      {children}
    </form>
  );
}
