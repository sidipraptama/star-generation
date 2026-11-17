"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";

type DialogFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  title: string;
  description?: string;
  submitLabel: string;
  submitVariant?: ButtonVariant;
  children?: React.ReactNode;
};

export function DialogForm({
  action,
  triggerLabel,
  triggerIcon,
  triggerVariant = "secondary",
  triggerSize,
  title,
  description,
  submitLabel,
  submitVariant = "primary",
  children,
}: DialogFormProps) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  function openDialog() {
    setOpenCount((count) => count + 1);
    setOpen(true);
  }

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} onClick={openDialog}>
        {triggerIcon}
        {triggerLabel}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <ActionForm
          key={openCount}
          action={action}
          onSuccess={() => setOpen(false)}
          className="space-y-4 p-5"
        >
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}
