import type { Metadata } from "next";
import { BookOpen, CalendarClock, Users, Wallet } from "lucide-react";
import { ListToolbar } from "@/components/list/list-toolbar";
import { NoResults } from "@/components/list/no-results";
import { Pagination } from "@/components/list/pagination";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatLessonWhen, formatRupiah } from "@/lib/format";
import { CARDS_PER_PAGE, listHref, orIlike, pageBounds, parsePage, parseSearch } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";
import { plural, rows } from "../_lib/data";

export const metadata: Metadata = { title: "My classes" };

const BASE_PATH = "/tutor/classes";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function TutorClassesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const q = parseSearch(raw.q);
  const page = parsePage(raw.page);
  const params = { q };

  const db = await createClient();
  const { from, to } = pageBounds(page, CARDS_PER_PAGE);
  let query = db
    .from("class_list")
    .select("*", { count: "exact" })
    .order("name")
    .order("id")
    .range(from, to);
  if (q) query = query.or(orIlike(["name", "description"], q));

  const result = await query;
  const total = result.count ?? 0;
  stayInRange(page, result, (target) => listHref(BASE_PATH, params, target), CARDS_PER_PAGE);
  const classes = rows(result);

  return (
    <>
      <PageHeader title="My classes" description="The classes you teach." />

      {(total > 0 || q) && (
        <ListToolbar
          action={BASE_PATH}
          query={q ?? ""}
          placeholder="Search your classes"
          filtered={Boolean(q)}
          clearHref={BASE_PATH}
        />
      )}

      {total === 0 ? (
        <Card>
          {q ? (
            <NoResults clearHref={BASE_PATH} />
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No classes assigned yet"
              description="When an admin assigns you to a class, it will show up here."
            />
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((c) => (
            <Card key={c.id} title={c.name ?? "Class"} description={c.description ?? undefined}>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Users className="text-muted size-4" aria-hidden />
                  {plural(c.seats_taken ?? 0, "student")} of {c.capacity} seats
                </li>
                {c.tutor_rate !== null && (
                  <li className="flex items-center gap-2">
                    <Wallet className="text-muted size-4" aria-hidden />
                    You earn {formatRupiah(c.tutor_rate)} per hour
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CalendarClock className="text-muted size-4" aria-hidden />
                  {c.next_lesson_start && c.next_lesson_end
                    ? `Next lesson: ${formatLessonWhen(c.next_lesson_start, c.next_lesson_end)}`
                    : "No lesson scheduled yet"}
                </li>
              </ul>
              <ButtonLink href={`${BASE_PATH}/${c.id}`} className="mt-5 w-full">
                Open class
              </ButtonLink>
            </Card>
          ))}
        </div>
      )}
      <Pagination
        basePath={BASE_PATH}
        params={params}
        page={page}
        total={total}
        size={CARDS_PER_PAGE}
        noun={total === 1 ? "class" : "classes"}
      />
    </>
  );
}
