"use client";

import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/ui/action-form";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";

type RouteDialogProps = {
  title: string;
  description?: string;
  /** The page URL without the parameter that opened the dialog. */
  closeHref: string;
  children: React.ReactNode;
};

/** A dialog whose open state lives in the URL, so a calendar chip or slot can link straight to it. */
export function RouteDialog({ title, description, closeHref, children }: RouteDialogProps) {
  const router = useRouter();

  return (
    <Modal
      open
      onClose={() => router.replace(closeHref, { scroll: false })}
      title={title}
      description={description}
    >
      {children}
    </Modal>
  );
}

type RouteDialogFormProps = RouteDialogProps & {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  submitVariant?: ButtonVariant;
};

export function RouteDialogForm({
  action,
  submitLabel,
  submitVariant = "primary",
  closeHref,
  children,
  ...dialog
}: RouteDialogFormProps) {
  const router = useRouter();
  const close = () => router.replace(closeHref, { scroll: false });

  return (
    <RouteDialog closeHref={closeHref} {...dialog}>
      <ActionForm action={action} onSuccess={close} className="space-y-4 p-5">
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
        </div>
      </ActionForm>
    </RouteDialog>
  );
}

type RouteActionFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  closeHref: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * A form with its own buttons inside a RouteDialog. The dialog closes from the action itself,
 * because a successful action often removes the form from the re-rendered page.
 */
export function RouteActionForm({ action, closeHref, className, children }: RouteActionFormProps) {
  const router = useRouter();

  async function closeAfter(previous: ActionState, formData: FormData) {
    const result = await action(previous, formData);
    if (result?.ok) router.replace(closeHref, { scroll: false });
    return result;
  }

  return (
    <ActionForm action={closeAfter} className={className}>
      {children}
    </ActionForm>
  );
}
