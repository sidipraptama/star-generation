import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate, formatDuration, formatMonth, formatRupiah } from "@/lib/format";
import { wibMonthOf } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { plural, rows } from "../_lib/data";

export const metadata: Metadata = { title: "Earnings" };

export default async function TutorEarningsPage() {
  const db = await createClient();
  const earnings = rows(
    await db
      .from("earnings")
      .select("id, class_name, lesson_start, minutes, tutor_rate, amount")
      .order("lesson_start", { ascending: false }),
  );

  const byMonth = new Map<string, typeof earnings>();
  for (const earning of earnings) {
    const month = wibMonthOf(earning.lesson_start);
    byMonth.set(month, [...(byMonth.get(month) ?? []), earning]);
  }
  const total = earnings.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <PageHeader
        title="Earnings"
        description="You earn your hourly rate for every lesson in an approved logbook, however many students attend."
      />

      {earnings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="No earnings yet"
            description="Your earnings appear here after an admin approves a monthly logbook."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Stat
            icon={Wallet}
            label="Total approved earnings"
            value={formatRupiah(total)}
            hint={`From ${plural(earnings.length, "lesson")}`}
          />

          {[...byMonth.entries()].map(([month, items]) => (
            <Card
              key={month}
              title={formatMonth(month)}
              action={
                <p className="text-sm">
                  <span className="text-muted">Month total </span>
                  <span className="font-bold">
                    {formatRupiah(items.reduce((sum, e) => sum + e.amount, 0))}
                  </span>
                </p>
              }
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Class</Th>
                    <Th>Duration</Th>
                    <Th className="text-right">Rate per hour</Th>
                    <Th className="text-right">Earned</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id}>
                      <Td>{formatDate(e.lesson_start)}</Td>
                      <Td>{e.class_name}</Td>
                      <Td>{formatDuration(e.minutes)}</Td>
                      <Td className="text-right">{formatRupiah(e.tutor_rate)}</Td>
                      <Td className="text-right font-semibold">{formatRupiah(e.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
