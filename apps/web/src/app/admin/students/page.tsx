import type { Metadata } from "next";
import { Users } from "lucide-react";
import { filterLabels, idParam } from "@/app/admin/filters";
import { searchClasses } from "@/app/admin/options";
import { EnrollmentHours } from "@/components/admin/enrollment-hours";
import { Panel } from "@/components/admin/section";
import { ListToolbar } from "@/components/list/list-toolbar";
import { NoResults } from "@/components/list/no-results";
import { Pagination } from "@/components/list/pagination";
import { StatusBadge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { listHref, orIlike, pageBounds, param, parsePage, parseSearch } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Students" };

const BASE_PATH = "/admin/students";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "pending_payment", label: "Waiting for payment" },
  { value: "none", label: "Not enrolled" },
];

type Props = {
  searchParams: Promise<{ q?: string; status?: string; class?: string; page?: string }>;
};

export default async function StudentsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const q = parseSearch(raw.q);
  const page = parsePage(raw.page);
  const status = statusOptions.find((option) => option.value === param(raw.status))?.value;
  const classId = idParam(raw.class);
  const params = { q, status, class: classId };
  const filtered = Boolean(q || status || classId);

  const db = await createClient();
  const { from, to } = pageBounds(page);
  let query = db
    .from("student_enrollment_list")
    .select("*", { count: "exact" })
    .order("full_name")
    .order("class_name")
    .order("enrollment_id")
    .range(from, to);
  if (q) query = query.or(orIlike(["full_name", "email", "class_name"], q));
  if (status === "none") query = query.is("enrollment_id", null);
  else if (status === "active" || status === "pending_payment") {
    query = query.eq("enrollment_status", status);
  }
  if (classId) query = query.eq("class_id", classId);

  const [result, labels] = await Promise.all([query, filterLabels({ class: classId })]);
  const { data, count } = result;
  const total = count ?? 0;
  stayInRange(page, result, (target) => listHref(BASE_PATH, params, target));
  const rows = data ?? [];

  const enrollmentIds = rows.flatMap((row) => (row.enrollment_id ? [row.enrollment_id] : []));
  const [balances, invoices] = enrollmentIds.length
    ? await Promise.all([
        db
          .from("enrollment_balances")
          .select("enrollment_id, balance_minutes")
          .in("enrollment_id", enrollmentIds),
        db
          .from("invoices")
          .select("enrollment_id, hours, status")
          .in("enrollment_id", enrollmentIds),
      ])
    : [{ data: [] }, { data: [] }];
  const balanceOf = new Map(
    balances.data?.map((row) => [row.enrollment_id, row.balance_minutes ?? 0]),
  );
  const invoicesOf = Map.groupBy(invoices.data ?? [], (invoice) => invoice.enrollment_id);

  return (
    <>
      <PageHeader
        title="Students"
        description="Who is enrolled where, and how many hours each student has left."
      />

      {total === 0 && !filtered ? (
        <Panel>
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Student accounts appear here once they have been created."
          />
        </Panel>
      ) : (
        <>
          <ListToolbar
            action={BASE_PATH}
            query={q ?? ""}
            placeholder="Search by name, email or class"
            filtered={filtered}
            clearHref={BASE_PATH}
          >
            <Combobox
              name="status"
              options={statusOptions}
              defaultValue={status ?? ""}
              emptyLabel="Any status"
              searchPlaceholder="Search…"
              submitOnSelect
              className="w-full sm:w-48"
            />
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
          </ListToolbar>

          {total === 0 ? (
            <Panel>
              <NoResults clearHref={BASE_PATH} />
            </Panel>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Class</Th>
                  <Th>Status</Th>
                  <Th>Hours left</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.enrollment_id ?? row.student_id}>
                    <Td>
                      <p className="font-semibold">{row.full_name}</p>
                      <p className="text-muted text-xs">{row.email}</p>
                    </Td>
                    {row.enrollment_id && row.enrollment_status ? (
                      <>
                        <Td>{row.class_name}</Td>
                        <Td>
                          <StatusBadge kind="enrollment" status={row.enrollment_status} />
                        </Td>
                        <Td>
                          <EnrollmentHours
                            status={row.enrollment_status}
                            balanceMinutes={balanceOf.get(row.enrollment_id) ?? 0}
                            invoices={invoicesOf.get(row.enrollment_id) ?? []}
                          />
                        </Td>
                      </>
                    ) : (
                      <>
                        <Td className="text-muted">Not enrolled in any class yet</Td>
                        <Td />
                        <Td />
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination
            basePath={BASE_PATH}
            params={params}
            page={page}
            total={total}
            noun={total === 1 ? "result" : "results"}
          />
        </>
      )}
    </>
  );
}
