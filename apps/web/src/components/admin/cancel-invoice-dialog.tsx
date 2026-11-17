import { Ban } from "lucide-react";
import { voidInvoice } from "@/app/admin/actions";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field, Textarea } from "@/components/ui/field";
import { formatRupiah } from "@/lib/format";

type CancelInvoiceDialogProps = {
  invoiceId: string;
  studentName: string;
  amount: number;
  paid: boolean;
};

export function CancelInvoiceDialog({
  invoiceId,
  studentName,
  amount,
  paid,
}: CancelInvoiceDialogProps) {
  const reasonId = `void-reason-${invoiceId}`;

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
