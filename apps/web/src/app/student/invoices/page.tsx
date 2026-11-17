import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialogForm } from "@/components/ui/dialog-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cancelInvoice } from "../actions";
import { getEnrollmentClassNames, must } from "../data";

export const metadata: Metadata = { title: "Invoices" };

export default async function StudentInvoicesPage() {
  const db = await createClient();
  const [invoiceResult, classNames] = await Promise.all([
    db
      .from("invoices")
      .select(
        "id, enrollment_id, hours, student_rate, amount, status, issued_at, paid_at, payment_reference, void_reason",
      )
      .order("issued_at", { ascending: false }),
    getEnrollmentClassNames(),
  ]);
  const invoices = must(invoiceResult);
  const hasUnpaid = invoices.some((invoice) => invoice.status === "unpaid");

  return (
    <>
      <PageHeader
        title="Invoices"
        description="What you have bought and what is still waiting for payment."
      />

      {invoices.length === 0 ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="When you enroll in a class, your invoice shows up here."
            action={<ButtonLink href="/student/browse">Find a class</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {hasUnpaid && (
            <Alert tone="info">
              <p className="font-semibold">Payment is confirmed by our admin team.</p>
              <p>
                Once your payment is confirmed, your class opens and your hours are added
                automatically. You do not need to do anything else.
              </p>
            </Alert>
          )}

          <ul className="space-y-3">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="rounded-card border-cloud border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">
                      {classNames.get(invoice.enrollment_id) ?? "Class"}
                    </h2>
                    <p className="text-muted mt-0.5 text-sm">
                      {invoice.hours} hours × {formatRupiah(invoice.student_rate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatRupiah(invoice.amount ?? invoice.hours * invoice.student_rate)}
                    </p>
                    <StatusBadge kind="invoice" status={invoice.status} />
                  </div>
                </div>

                <dl className="text-muted mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                  <div>
                    <dt className="inline font-semibold">Issued: </dt>
                    <dd className="inline">{formatDateTime(invoice.issued_at)}</dd>
                  </div>
                  {invoice.paid_at && (
                    <div>
                      <dt className="inline font-semibold">Paid: </dt>
                      <dd className="inline">{formatDateTime(invoice.paid_at)}</dd>
                    </div>
                  )}
                  {invoice.payment_reference && (
                    <div>
                      <dt className="inline font-semibold">Reference: </dt>
                      <dd className="inline">{invoice.payment_reference}</dd>
                    </div>
                  )}
                  {invoice.status === "void" && invoice.void_reason && (
                    <div>
                      <dt className="inline font-semibold">Reason: </dt>
                      <dd className="inline">{invoice.void_reason}</dd>
                    </div>
                  )}
                </dl>

                {invoice.status === "unpaid" && (
                  <div className="mt-4 flex justify-end">
                    <DialogForm
                      action={cancelInvoice}
                      triggerLabel="Cancel invoice"
                      triggerVariant="ghost"
                      triggerSize="sm"
                      title="Cancel this invoice?"
                      description="The invoice will be cancelled. If you have not paid for this class yet, your seat is released."
                      submitLabel="Yes, cancel invoice"
                      submitVariant="danger"
                    >
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <Field label="Reason (optional)" htmlFor="reason">
                        <Textarea name="reason" rows={2} placeholder="Tell us why, if you like" />
                      </Field>
                    </DialogForm>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
