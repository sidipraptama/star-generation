import { ChevronDown, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LogbookEntries, type LogbookEntryView } from "@/components/logbook/logbook-entries";
import { formatMonth } from "@/lib/format";

export type ApprovedLogbook = {
  id: string;
  month: string;
  entries: LogbookEntryView[];
};

export function ClassLogbooks({ logbooks }: { logbooks: ApprovedLogbook[] }) {
  return (
    <Card
      title="Progress notes"
      description="Your tutor writes a logbook every month. Our team checks it before it appears here."
    >
      {logbooks.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No approved logbooks yet"
          description="Your first progress notes will appear here once our team has approved them."
        />
      ) : (
        <div className="space-y-3">
          {logbooks.map((logbook, index) => (
            <details
              key={logbook.id}
              open={index === 0}
              className="group rounded-card border-cloud bg-surface border"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold">
                <span>
                  {formatMonth(logbook.month)}
                  <span className="text-muted ml-2 text-xs font-normal">
                    {logbook.entries.length} {logbook.entries.length === 1 ? "lesson" : "lessons"}
                  </span>
                </span>
                <ChevronDown
                  className="text-muted size-5 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="px-5 pb-5">
                <LogbookEntries entries={logbook.entries} />
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
