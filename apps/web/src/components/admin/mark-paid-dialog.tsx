import { Check } from "lucide-react";
import { markInvoicePaid } from "@/app/admin/actions";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field, Input } from "@/components/ui/field";
import { formatRupiah } from "@/lib/format";

type MarkPaidDialogProps = {
  invoiceId: string;
  studentName: string;
  amount: number;
};

export function MarkPaidDialog({ invoiceId, studentName, amount }: MarkPaidDialogProps) {
  const referenceId = `reference-${invoiceId}`;

  return (
    <DialogForm
      action={markInvoicePaid}
      triggerLabel="Mark as paid"
      triggerIcon={<Check className="size-4" aria-hidden />}
      triggerVariant="primary"
      triggerSize="sm"
      title="Mark this invoice as paid?"
      description={`${studentName} · ${formatRupiah(amount)}`}
      submitLabel="Yes, it is paid"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <p className="text-sm">
        Only confirm once you have received the money. The student gets access to the class right
        away.
      </p>
      <Field
        label="Payment reference (optional)"
        htmlFor={referenceId}
        hint="For example the bank transfer note or a receipt number."
      >
        <Input id={referenceId} name="reference" maxLength={100} />
      </Field>
    </DialogForm>
  );
}
