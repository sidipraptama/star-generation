import type { Metadata } from "next";
import { NotebookPen } from "lucide-react";
import { Panel } from "@/components/admin/section";
import { pickTab, StatusTabs, type StatusTab } from "@/components/admin/status-tabs";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Logbooks" };

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

export default async function LogbooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const active = pickTab(tabs, (await searchParams).status, "submitted") as LogbookStatus;
  const db = await createClient();

  const { data } = await db
    .from("logbooks")
    .select(
      "id, month, status, classes(name, profiles!classes_tutor_id_fkey(full_name)), logbook_entries(count)",
    )
    .eq("status", active)
    .order("month", { ascending: false });

  const logbooks = data ?? [];

  return (
    <>
      <PageHeader
        title="Logbooks"
        description="Tutors write one logbook per class each month. Review it before students can see it."
      />

      <StatusTabs basePath="/admin/logbooks" tabs={tabs} active={active} defaultValue="submitted" />

      {logbooks.length === 0 ? (
        <Panel>
          <EmptyState
            icon={NotebookPen}
            title="No logbooks here"
            description={tabs.find((tab) => tab.value === active)?.empty}
          />
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
                <Td className="font-semibold">{logbook.classes.name}</Td>
                <Td>{formatMonth(logbook.month)}</Td>
                <Td>{logbook.classes.profiles.full_name}</Td>
                <Td>{logbook.logbook_entries[0]?.count ?? 0}</Td>
                <Td>
                  <StatusBadge kind="logbook" status={logbook.status} />
                </Td>
                <Td sticky className="text-right">
                  <ButtonLink
                    href={`/admin/logbooks/${logbook.id}`}
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
    </>
  );
}
