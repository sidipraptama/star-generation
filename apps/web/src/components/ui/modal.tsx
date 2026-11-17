"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onClose={onClose}
      className="rounded-card border-cloud bg-surface text-navy backdrop:bg-navy/40 m-auto w-[calc(100%-2rem)] max-w-lg border p-0 shadow-xl"
    >
      <div className="border-cloud flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description && <p className="text-muted mt-0.5 text-sm">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="rounded-card text-muted hover:bg-navy/5 hover:text-navy p-1"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {children}
    </dialog>
  );
}
