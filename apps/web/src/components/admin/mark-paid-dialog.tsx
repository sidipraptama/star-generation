import { Check } from "lucide-react";
import Image from "next/image";
import { markInvoicePaid } from "@/app/admin/actions";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field, Input } from "@/components/ui/field";
import { formatRupiah } from "@/lib/format";

type MarkPaidDialogProps = {
  invoiceId: string;
  studentName: string;
  amount: number;
  /** The proof the student uploaded, if any. It is optional and never required to approve. */
  proofSrc?: string;
};

export function MarkPaidDialog({ invoiceId, studentName, amount, proofSrc }: MarkPaidDialogProps) {
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
      {proofSrc && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Proof from the student</p>
          <a
            href={proofSrc}
            target="_blank"
            rel="noreferrer"
            className="rounded-card border-cloud bg-cloud/30 relative block h-48 overflow-hidden border"
          >
            <Image
              src={proofSrc}
              alt="Proof of payment uploaded by the student"
              fill
              unoptimized
              sizes="512px"
              className="object-contain"
            />
          </a>
          <p className="text-muted text-xs">Select the image to open it full size in a new tab.</p>
        </div>
      )}
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
