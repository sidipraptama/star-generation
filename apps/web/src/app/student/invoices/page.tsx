import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { pickTab, StatusTabs, type StatusTab } from "@/components/admin/status-tabs";
import { Pagination } from "@/components/list/pagination";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialogForm } from "@/components/ui/dialog-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/ui/image-preview";
import { ProofUploadDialog } from "@/components/student/proof-upload-dialog";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { listHref, pageBounds, parsePage } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { proofUrl } from "@/lib/proof";
import { createClient } from "@/lib/supabase/server";
import { cancelInvoice } from "../actions";
import { getEnrollmentClassNames, must } from "../data";

export const metadata: Metadata = { title: "Invoices" };

const BASE_PATH = "/student/invoices";
const INVOICES_PER_PAGE = 10;

const tabs: StatusTab[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Waiting for payment" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Cancelled" },
];

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function StudentInvoicesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const active = pickTab(tabs, raw.status, "all");
  const tab = active === "all" ? undefined : active;
  const page = parsePage(raw.page);
  const params = { status: tab };

  const db = await createClient();
  const { from, to } = pageBounds(page, INVOICES_PER_PAGE);
  let query = db
    .from("invoices")
    .select(
      "id, enrollment_id, hours, student_rate, amount, status, issued_at, paid_at, payment_reference, void_reason, proof_uploaded_at",
      { count: "exact" },
    )
    .order("issued_at", { ascending: false })
    .order("id")
    .range(from, to);
  if (tab) query = query.eq("status", tab as "unpaid" | "paid" | "void");

  const [invoiceResult, waiting] = await Promise.all([
    query,
    db.from("invoices").select("id", { count: "exact", head: true }).eq("status", "unpaid"),
  ]);
  stayInRange(
    page,
    invoiceResult,
    (target) => listHref(BASE_PATH, params, target),
    INVOICES_PER_PAGE,
  );
  const invoices = must(invoiceResult);
  const total = invoiceResult.count ?? 0;

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const [classNames, approvalResult] = await Promise.all([
    getEnrollmentClassNames([...new Set(invoices.map((invoice) => invoice.enrollment_id))]),
    invoiceIds.length
      ? db.from("invoice_approvals").select("invoice_id, approved_by").in("invoice_id", invoiceIds)
      : { data: [] },
  ]);
  const approvedBy = new Map(
    (approvalResult.data ?? []).map((row) => [row.invoice_id, row.approved_by]),
  );
  const hasUnpaid = (waiting.count ?? 0) > 0;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="What you have bought and what is still waiting for payment."
      />

      {total === 0 && !tab ? (
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

          <StatusTabs basePath={BASE_PATH} tabs={tabs} active={active} defaultValue="all" />

          {invoices.length === 0 && (
            <Card>
              <EmptyState
                icon={Receipt}
                title="No invoices here"
                description="Try another tab to see more invoices."
              />
            </Card>
          )}

          <ul className="space-y-3">
            {invoices.map((invoice) => {
              const className = classNames.get(invoice.enrollment_id) ?? "Class";
              const amount = invoice.amount ?? invoice.hours * invoice.student_rate;
              const approver = approvedBy.get(invoice.id);
              return (
                <li key={invoice.id} className="rounded-card border-cloud border bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{className}</h2>
                      <p className="text-muted mt-0.5 text-sm">
                        {invoice.hours} hours × {formatRupiah(invoice.student_rate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatRupiah(amount)}</p>
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
                    {approver && (
                      <div>
                        <dt className="inline font-semibold">Approved by: </dt>
                        <dd className="inline">{approver}</dd>
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

                  {invoice.proof_uploaded_at && (
                    <div className="mt-4 flex items-center gap-3">
                      <ImagePreview
                        src={proofUrl(invoice.id, invoice.proof_uploaded_at)}
                        title="Proof of payment"
                        description={`${className} · ${formatRupiah(amount)}`}
                      />
                      <p className="text-muted text-xs">
                        Proof uploaded {formatDateTime(invoice.proof_uploaded_at)}
                      </p>
                    </div>
                  )}

                  {invoice.status === "unpaid" && !invoice.proof_uploaded_at && (
                    <p className="text-muted mt-4 text-sm">
                      Already paid? You can add a photo of your transfer. It is optional and helps
                      our team find your payment faster.
                    </p>
                  )}

                  {invoice.status === "unpaid" && (
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <ProofUploadDialog
                        invoiceId={invoice.id}
                        replacing={Boolean(invoice.proof_uploaded_at)}
                      />
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
              );
            })}
          </ul>

          <Pagination
            basePath={BASE_PATH}
            params={params}
            page={page}
            total={total}
            size={INVOICES_PER_PAGE}
            noun={total === 1 ? "invoice" : "invoices"}
          />
        </div>
      )}
    </>
  );
}
