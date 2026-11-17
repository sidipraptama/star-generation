"use client";

import { useActionState, useEffect, useRef } from "react";
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
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (state?.ok) onSuccessRef.current?.();
  }, [state]);

  return (
    <form action={formAction} className={className}>
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      {children}
    </form>
  );
}
