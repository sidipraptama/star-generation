import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { CancelInvoiceDialog } from "@/components/admin/cancel-invoice-dialog";
import { MarkPaidDialog } from "@/components/admin/mark-paid-dialog";
import { Panel } from "@/components/admin/section";
import { pickTab, StatusTabs, type StatusTab } from "@/components/admin/status-tabs";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invoices" };

const tabs: StatusTab[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Waiting for payment" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Cancelled" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const active = pickTab(tabs, (await searchParams).status, "all");
  const db = await createClient();

  let query = db
    .from("invoices")
    .select(
      "id, hours, student_rate, status, payment_reference, void_reason, issued_at, paid_at, voided_at, enrollments(profiles(full_name), classes(name))",
    )
    .order("issued_at", { ascending: false });

  if (active !== "all") query = query.eq("status", active as "unpaid" | "paid" | "void");

  const { data } = await query;
  const invoices = data ?? [];

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Confirm payments when the money arrives. Students unlock their class once an invoice is paid."
      />

      <StatusTabs basePath="/admin/invoices" tabs={tabs} active={active} defaultValue="all" />

      {invoices.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Receipt}
            title="No invoices here"
            description={
              active === "all"
                ? "Invoices are created automatically when a student enrolls."
                : "Try another tab to see more invoices."
            }
          />
        </Panel>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Class</Th>
              <Th>Hours</Th>
              <Th>Rate</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Dates</Th>
              <Th sticky />
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const amount = invoice.hours * invoice.student_rate;
              const studentName = invoice.enrollments.profiles.full_name;
              return (
                <tr key={invoice.id}>
                  <Td className="font-semibold">{studentName}</Td>
                  <Td>{invoice.enrollments.classes.name}</Td>
                  <Td>{invoice.hours}h</Td>
                  <Td className="whitespace-nowrap">{formatRupiah(invoice.student_rate)} / hour</Td>
                  <Td className="font-semibold whitespace-nowrap">{formatRupiah(amount)}</Td>
                  <Td>
                    <StatusBadge kind="invoice" status={invoice.status} />
                  </Td>
                  <Td className="text-muted text-xs whitespace-nowrap">
                    <p>Issued {formatDate(invoice.issued_at)}</p>
                    {invoice.paid_at && <p>Paid {formatDate(invoice.paid_at)}</p>}
                    {invoice.payment_reference && <p>Ref: {invoice.payment_reference}</p>}
                    {invoice.voided_at && <p>Cancelled {formatDate(invoice.voided_at)}</p>}
                    {invoice.void_reason && (
                      <p className="max-w-48 whitespace-normal">{invoice.void_reason}</p>
                    )}
                  </Td>
                  <Td sticky>
                    <div className="flex items-center justify-end gap-1">
                      {invoice.status === "unpaid" && (
                        <MarkPaidDialog
                          invoiceId={invoice.id}
                          studentName={studentName}
                          amount={amount}
                        />
                      )}
                      {invoice.status !== "void" && (
                        <CancelInvoiceDialog
                          invoiceId={invoice.id}
                          studentName={studentName}
                          amount={amount}
                          paid={invoice.status === "paid"}
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
