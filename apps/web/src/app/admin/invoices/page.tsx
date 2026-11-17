import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { filterLabels, idParam } from "@/app/admin/filters";
import { searchClasses } from "@/app/admin/options";
import { CancelInvoiceDialog } from "@/components/admin/cancel-invoice-dialog";
import { MarkPaidDialog } from "@/components/admin/mark-paid-dialog";
import { Panel } from "@/components/admin/section";
import { pickTab, StatusTabs, type StatusTab } from "@/components/admin/status-tabs";
import { ListToolbar } from "@/components/list/list-toolbar";
import { NoResults } from "@/components/list/no-results";
import { Pagination } from "@/components/list/pagination";
import { StatusBadge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { ImagePreview } from "@/components/ui/image-preview";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate, formatRupiah } from "@/lib/format";
import { cancelBlockedReason } from "@/lib/invoices";
import { listHref, orIlike, pageBounds, param, parsePage, parseSearch } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { proofUrl } from "@/lib/proof";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invoices" };

const BASE_PATH = "/admin/invoices";

const tabs: StatusTab[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Waiting for payment" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Cancelled" },
];

const proofOptions = [
  { value: "with", label: "With proof" },
  { value: "without", label: "Without proof" },
];

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    class?: string;
    proof?: string;
    page?: string;
  }>;
};

export default async function InvoicesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const active = pickTab(tabs, raw.status, "all");
  const q = parseSearch(raw.q);
  const page = parsePage(raw.page);
  const classId = idParam(raw.class);
  const proof = proofOptions.find((option) => option.value === param(raw.proof))?.value;
  const tab = active === "all" ? undefined : active;
  const params = { status: tab, q, class: classId, proof };
  const filtered = Boolean(q || classId || proof);

  const db = await createClient();
  const { from, to } = pageBounds(page);
  let query = db
    .from("invoice_list")
    .select("*", { count: "exact" })
    .order("issued_at", { ascending: false })
    .order("id")
    .range(from, to);
  if (tab) query = query.eq("status", tab as "unpaid" | "paid" | "void");
  if (q)
    query = query.or(
      orIlike(["student_name", "student_email", "class_name", "payment_reference"], q),
    );
  if (classId) query = query.eq("class_id", classId);
  if (proof === "with") query = query.not("proof_uploaded_at", "is", null);
  if (proof === "without") query = query.is("proof_uploaded_at", null);

  const [result, labels] = await Promise.all([query, filterLabels({ class: classId })]);
  const { data, count } = result;
  const total = count ?? 0;
  stayInRange(page, result, (target) => listHref(BASE_PATH, params, target));
  const invoices = data ?? [];

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Confirm payments when the money arrives. Students unlock their class once an invoice is paid."
      />

      <StatusTabs
        basePath={BASE_PATH}
        tabs={tabs}
        active={active}
        defaultValue="all"
        keep={{ q, class: classId, proof }}
      />

      <ListToolbar
        action={BASE_PATH}
        query={q ?? ""}
        placeholder="Search by student, class or reference"
        keep={{ status: tab }}
        filtered={filtered}
        clearHref={listHref(BASE_PATH, { status: tab })}
      >
        <Combobox
          name="class"
          loadOptions={searchClasses}
          defaultValue={classId ?? ""}
          defaultLabel={labels.class}
          emptyLabel="All classes"
          searchPlaceholder="Search classes…"
          submitOnSelect
          className="w-full sm:w-52"
        />
        <Combobox
          name="proof"
          options={proofOptions}
          defaultValue={proof ?? ""}
          emptyLabel="Any proof"
          searchPlaceholder="Search…"
          submitOnSelect
          className="w-full sm:w-44"
        />
      </ListToolbar>

      {total === 0 ? (
        <Panel>
          {filtered ? (
            <NoResults clearHref={listHref(BASE_PATH, { status: tab })} />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No invoices here"
              description={
                active === "all"
                  ? "Invoices are created automatically when a student enrolls."
                  : "Try another tab to see more invoices."
              }
            />
          )}
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
              <Th>Proof</Th>
              <Th>Dates</Th>
              <Th sticky />
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const id = invoice.id!;
              const amount = invoice.amount ?? 0;
              const studentName = invoice.student_name ?? "Student";
              const proofSrc = invoice.proof_uploaded_at
                ? proofUrl(id, invoice.proof_uploaded_at)
                : undefined;
              return (
                <tr key={id}>
                  <Td>
                    <p className="font-semibold">{studentName}</p>
                    <p className="text-muted text-xs">{invoice.student_email}</p>
                  </Td>
                  <Td className="min-w-44">{invoice.class_name}</Td>
                  <Td>{invoice.hours}h</Td>
                  <Td className="whitespace-nowrap">
                    {formatRupiah(invoice.student_rate ?? 0)} / hour
                  </Td>
                  <Td className="font-semibold whitespace-nowrap">{formatRupiah(amount)}</Td>
                  <Td>
                    {invoice.status && <StatusBadge kind="invoice" status={invoice.status} />}
                  </Td>
                  <Td>
                    {proofSrc ? (
                      <ImagePreview
                        src={proofSrc}
                        title="Proof of payment"
                        description={`${studentName} · ${formatRupiah(amount)}`}
                      />
                    ) : (
                      <span className="text-muted text-xs">None</span>
                    )}
                  </Td>
                  <Td className="text-muted text-xs whitespace-nowrap">
                    {invoice.issued_at && <p>Issued {formatDate(invoice.issued_at)}</p>}
                    {invoice.paid_at && <p>Paid {formatDate(invoice.paid_at)}</p>}
                    {invoice.approved_by && <p>Approved by {invoice.approved_by}</p>}
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
                          invoiceId={id}
                          studentName={studentName}
                          amount={amount}
                          proofSrc={proofSrc}
                        />
                      )}
                      {invoice.status !== "void" && (
                        <CancelInvoiceDialog
                          invoiceId={id}
                          studentName={studentName}
                          amount={amount}
                          paid={invoice.status === "paid"}
                          blockedReason={cancelBlockedReason({
                            status: invoice.status,
                            canCancel: invoice.can_cancel,
                            balanceMinutes: invoice.balance_minutes,
                            hours: invoice.hours,
                          })}
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
      <Pagination
        basePath={BASE_PATH}
        params={params}
        page={page}
        total={total}
        noun={total === 1 ? "invoice" : "invoices"}
      />
    </>
  );
}
