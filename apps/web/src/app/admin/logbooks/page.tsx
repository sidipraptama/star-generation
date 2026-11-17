import type { Metadata } from "next";
import { NotebookPen } from "lucide-react";
import { filterLabels, idParam } from "@/app/admin/filters";
import { searchTutors } from "@/app/admin/options";
import { Panel } from "@/components/admin/section";
import { pickTab, StatusTabs, type StatusTab } from "@/components/admin/status-tabs";
import { ListToolbar } from "@/components/list/list-toolbar";
import { NoResults } from "@/components/list/no-results";
import { Pagination } from "@/components/list/pagination";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatMonth } from "@/lib/format";
import {
  listHref,
  orIlike,
  pageBounds,
  param,
  parsePage,
  parseSearch,
  recentMonths,
} from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";
import { todayInWib } from "@/lib/time";

export const metadata: Metadata = { title: "Logbooks" };

const BASE_PATH = "/admin/logbooks";

const tabs: (StatusTab & { empty: string })[] = [
  {
    value: "submitted",
    label: "Waiting for review",
    empty: "Nothing is waiting for your review right now.",
  },
  {
    value: "changes_requested",
    label: "Needs changes",
    empty: "No logbooks have been sent back to tutors.",
  },
  { value: "approved", label: "Approved", empty: "No logbooks have been approved yet." },
  { value: "draft", label: "In progress", empty: "No tutor is working on a logbook right now." },
];

type LogbookStatus = "submitted" | "changes_requested" | "approved" | "draft";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    tutor?: string;
    month?: string;
    page?: string;
  }>;
};

export default async function LogbooksPage({ searchParams }: Props) {
  const raw = await searchParams;
  const active = pickTab(tabs, raw.status, "submitted") as LogbookStatus;
  const q = parseSearch(raw.q);
  const page = parsePage(raw.page);
  const tutor = idParam(raw.tutor);
  const months = recentMonths(todayInWib(), 24);
  const month = months.find((option) => option.value === param(raw.month))?.value;
  const tab = active === "submitted" ? undefined : active;
  const params = { status: tab, q, tutor, month };
  const filtered = Boolean(q || tutor || month);
  const clearHref = listHref(BASE_PATH, { status: tab });

  const db = await createClient();
  const { from, to } = pageBounds(page);
  let query = db
    .from("logbook_list")
    .select("*", { count: "exact" })
    .eq("status", active)
    .order("month", { ascending: false })
    .order("class_name")
    .order("id")
    .range(from, to);
  if (q) query = query.or(orIlike(["class_name", "tutor_name"], q));
  if (tutor) query = query.eq("tutor_id", tutor);
  if (month) query = query.eq("month", month);

  const [result, labels] = await Promise.all([query, filterLabels({ tutor })]);
  const { data, count } = result;
  const total = count ?? 0;
  stayInRange(page, result, (target) => listHref(BASE_PATH, params, target));
  const logbooks = data ?? [];

  return (
    <>
      <PageHeader
        title="Logbooks"
        description="Tutors write one logbook per class each month. Review it before students can see it."
      />

      <StatusTabs
        basePath={BASE_PATH}
        tabs={tabs}
        active={active}
        defaultValue="submitted"
        keep={{ q, tutor, month }}
      />

      <ListToolbar
        action={BASE_PATH}
        query={q ?? ""}
        placeholder="Search by class or tutor"
        keep={{ status: tab }}
        filtered={filtered}
        clearHref={clearHref}
      >
        <Combobox
          name="tutor"
          loadOptions={searchTutors}
          defaultValue={tutor ?? ""}
          defaultLabel={labels.tutor}
          emptyLabel="All tutors"
          searchPlaceholder="Search tutors…"
          submitOnSelect
          className="w-full sm:w-52"
        />
        <Combobox
          name="month"
          options={months}
          defaultValue={month ?? ""}
          emptyLabel="All months"
          searchPlaceholder="Search months…"
          submitOnSelect
          className="w-full sm:w-48"
        />
      </ListToolbar>

      {total === 0 ? (
        <Panel>
          {filtered ? (
            <NoResults clearHref={clearHref} />
          ) : (
            <EmptyState
              icon={NotebookPen}
              title="No logbooks here"
              description={tabs.find((tab) => tab.value === active)?.empty}
            />
          )}
        </Panel>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Class</Th>
              <Th>Month</Th>
              <Th>Tutor</Th>
              <Th>Lessons logged</Th>
              <Th>Status</Th>
              <Th sticky />
            </tr>
          </thead>
          <tbody>
            {logbooks.map((logbook) => (
              <tr key={logbook.id}>
                <Td className="font-semibold">{logbook.class_name}</Td>
                <Td>{logbook.month && formatMonth(logbook.month)}</Td>
                <Td>{logbook.tutor_name}</Td>
                <Td>{logbook.entries_count ?? 0}</Td>
                <Td>{logbook.status && <StatusBadge kind="logbook" status={logbook.status} />}</Td>
                <Td sticky className="text-right">
                  <ButtonLink
                    href={`${BASE_PATH}/${logbook.id}`}
                    variant={logbook.status === "submitted" ? "primary" : "secondary"}
                    size="sm"
                  >
                    {logbook.status === "submitted" ? "Review" : "Open"}
                  </ButtonLink>
                </Td>
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
        noun={total === 1 ? "logbook" : "logbooks"}
      />
    </>
  );
}
