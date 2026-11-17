import { History, Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate, formatDuration } from "@/lib/format";

export type LedgerLine = {
  key: string;
  kind: "purchase" | "lesson";
  minutes: number;
  occurredAt: string;
};

export function HoursHistory({
  lines,
  pagination,
}: {
  lines: LedgerLine[];
  pagination?: React.ReactNode;
}) {
  return (
    <Card
      title="Hours history"
      description="Every hour you bought and every lesson that used hours."
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nothing here yet"
          description="Your purchases and used lessons will be listed here."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>What happened</Th>
              <Th className="text-right">Hours</Th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const added = line.minutes > 0;
              const Icon = added ? Plus : Minus;
              return (
                <tr key={line.key}>
                  <Td className="whitespace-nowrap">{formatDate(line.occurredAt)}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="text-muted size-4" aria-hidden />
                      {line.kind === "purchase" ? "Package purchased" : "Lesson"}
                    </span>
                  </Td>
                  <Td
                    className={clsx(
                      "text-right font-semibold whitespace-nowrap",
                      added && "text-success-ink",
                    )}
                  >
                    {added ? "+" : "−"}
                    {formatDuration(Math.abs(line.minutes))}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {pagination}
    </Card>
  );
}
