"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);

  function open() {
    setOpenCount((count) => count + 1);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} onClick={open}>
        {triggerIcon}
        {triggerLabel}
      </Button>
      <dialog
        ref={dialogRef}
        aria-label={title}
        className="rounded-card border-cloud bg-surface text-navy backdrop:bg-navy/40 m-auto w-[calc(100%-2rem)] max-w-lg border p-0 shadow-xl"
      >
        <div className="border-cloud flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {description && <p className="text-muted mt-0.5 text-sm">{description}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-card text-muted hover:bg-navy/5 hover:text-navy p-1"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <ActionForm key={openCount} action={action} onSuccess={close} className="space-y-4 p-5">
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
          </div>
        </ActionForm>
      </dialog>
    </>
  );
}
