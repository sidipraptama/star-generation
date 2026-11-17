"use client";

import { ImagePlus } from "lucide-react";
import { uploadPaymentProof } from "@/app/student/actions";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { checkProofFile, PROOF_ACCEPT } from "@/lib/proof";

type ProofUploadDialogProps = {
  invoiceId: string;
  replacing: boolean;
};

export function ProofUploadDialog({ invoiceId, replacing }: ProofUploadDialogProps) {
  const inputId = `proof-${invoiceId}`;

  return (
    <DialogForm
      action={uploadPaymentProof}
      triggerLabel={replacing ? "Replace proof" : "Add proof of payment"}
      triggerIcon={<ImagePlus className="size-4" aria-hidden />}
      triggerSize="sm"
      title="Add proof of payment"
      description="A photo or screenshot of your transfer. This is optional."
      submitLabel="Upload"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Field label="Photo or screenshot" htmlFor={inputId}>
        <FileInput
          id={inputId}
          name="proof"
          accept={PROOF_ACCEPT}
          prompt="Choose an image"
          hint="JPG, PNG or WebP, up to 5 MB"
          required
          validate={checkProofFile}
        />
      </Field>
      <p className="text-muted text-xs">
        You do not need a proof to get your class: our admin team confirms payment either way. A
        proof just helps them find your transfer faster.
      </p>
    </DialogForm>
  );
}
