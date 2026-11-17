import { Ban } from "lucide-react";
import { voidInvoice } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field, Textarea } from "@/components/ui/field";
import { formatRupiah } from "@/lib/format";

type CancelInvoiceDialogProps = {
  invoiceId: string;
  studentName: string;
  amount: number;
  paid: boolean;
  /** Set when the invoice can no longer be cancelled: the button is disabled and says why. */
  blockedReason?: string;
};

export function CancelInvoiceDialog({
  invoiceId,
  studentName,
  amount,
  paid,
  blockedReason,
}: CancelInvoiceDialogProps) {
  const reasonId = `void-reason-${invoiceId}`;

  if (blockedReason) {
    const noteId = `cancel-blocked-${invoiceId}`;
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="ghost" size="sm" disabled title={blockedReason} aria-describedby={noteId}>
          <Ban className="size-4" aria-hidden />
          Cancel invoice
        </Button>
        <p id={noteId} className="text-muted max-w-52 text-right text-xs whitespace-normal">
          {blockedReason}
        </p>
      </div>
    );
  }

  return (
    <DialogForm
      action={voidInvoice}
      triggerLabel="Cancel invoice"
      triggerIcon={<Ban className="size-4" aria-hidden />}
      triggerVariant="ghost"
      triggerSize="sm"
      title="Cancel this invoice?"
      description={`${studentName} · ${formatRupiah(amount)}`}
      submitLabel="Yes, cancel invoice"
      submitVariant="danger"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <p className="text-sm">
        {paid
          ? "This undoes the payment and removes the hours from the student. It is only possible while none of the invoice's hours have been used."
          : "The student will no longer be asked to pay this invoice."}
      </p>
      <Field label={paid ? "Reason" : "Reason (optional)"} htmlFor={reasonId}>
        <Textarea id={reasonId} name="reason" maxLength={500} required={paid} />
      </Field>
    </DialogForm>
  );
}
