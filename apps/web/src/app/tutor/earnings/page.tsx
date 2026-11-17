import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ListToolbar } from "@/components/list/list-toolbar";
import { NoResults } from "@/components/list/no-results";
import { Pagination } from "@/components/list/pagination";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate, formatDuration, formatMonth, formatRupiah } from "@/lib/format";
import { listHref, pageBounds, param, parsePage, parseSearch } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { escapeLike } from "@/lib/options";
import { wibMonthOf } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { plural, rows } from "../_lib/data";
import { monthRange } from "../_lib/logbook";

export const metadata: Metadata = { title: "Earnings" };

const BASE_PATH = "/tutor/earnings";

type Props = { searchParams: Promise<{ q?: string; month?: string; page?: string }> };

export default async function TutorEarningsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const q = parseSearch(raw.q);
  const page = parsePage(raw.page);

  const db = await createClient();
  const monthRows = rows(
    await db
      .from("earning_months")
      .select("month, lessons, total")
      .order("month", { ascending: false }),
  );
  const monthOptions = monthRows.flatMap((m) =>
    m.month
      ? [
          {
            value: m.month,
            label: formatMonth(m.month),
            hint: `${plural(m.lessons ?? 0, "lesson")} · ${formatRupiah(m.total ?? 0)}`,
          },
        ]
      : [],
  );
  const month = monthOptions.find((option) => option.value === param(raw.month))?.value;
  const params = { q, month };
  const filtered = Boolean(q || month);

  const totalEarned = monthRows.reduce((sum, m) => sum + (m.total ?? 0), 0);
  const totalLessons = monthRows.reduce((sum, m) => sum + (m.lessons ?? 0), 0);
  const totalByMonth = new Map(monthRows.map((m) => [m.month, m.total ?? 0]));

  const { from, to } = pageBounds(page);
  let query = db
    .from("earnings")
    .select("id, class_name, lesson_start, minutes, tutor_rate, amount", { count: "exact" })
    .order("lesson_start", { ascending: false })
    .order("id")
    .range(from, to);
  if (q) query = query.ilike("class_name", `%${escapeLike(q)}%`);
  if (month) {
    const range = monthRange(month);
    query = query.gte("lesson_start", range.from).lt("lesson_start", range.to);
  }

  const result = await query;
  const total = result.count ?? 0;
  stayInRange(page, result, (target) => listHref(BASE_PATH, params, target));
  const earnings = rows(result);

  const byMonth = new Map<string, typeof earnings>();
  for (const earning of earnings) {
    const key = wibMonthOf(earning.lesson_start);
    byMonth.set(key, [...(byMonth.get(key) ?? []), earning]);
  }

  return (
    <>
      <PageHeader
        title="Earnings"
        description="You earn your hourly rate for every lesson in an approved logbook, however many students attend."
      />

      {totalLessons === 0 ? (
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
            value={formatRupiah(totalEarned)}
            hint={`From ${plural(totalLessons, "lesson")}`}
          />

          <div>
            <ListToolbar
              action={BASE_PATH}
              query={q ?? ""}
              placeholder="Search by class"
              filtered={filtered}
              clearHref={BASE_PATH}
            >
              <Combobox
                name="month"
                options={monthOptions}
                defaultValue={month ?? ""}
                emptyLabel="All months"
                searchPlaceholder="Search months…"
                submitOnSelect
                className="w-full sm:w-56"
              />
            </ListToolbar>

            {total === 0 ? (
              <Card>
                <NoResults clearHref={BASE_PATH} />
              </Card>
            ) : (
              <div className="space-y-6">
                {[...byMonth.entries()].map(([key, items]) => (
                  <Card
                    key={key}
                    title={formatMonth(key)}
                    action={
                      !q && (
                        <p className="text-sm">
                          <span className="text-muted">Month total </span>
                          <span className="font-bold">
                            {formatRupiah(totalByMonth.get(key) ?? 0)}
                          </span>
                        </p>
                      )
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
            <Pagination
              basePath={BASE_PATH}
              params={params}
              page={page}
              total={total}
              noun={total === 1 ? "lesson" : "lessons"}
            />
          </div>
        </div>
      )}
    </>
  );
}
