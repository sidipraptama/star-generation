import type { Metadata } from "next";
import {
  BookOpen,
  CalendarClock,
  CircleCheck,
  CircleX,
  NotebookPen,
  Send,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { WeekStrip } from "@/components/calendar/week-strip";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { getProfile } from "@/lib/auth";
import { formatLessonWhen, formatMonth, formatRupiah } from "@/lib/format";
import { buildHref, visibleRange } from "@/lib/calendar";
import { todayInWib } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { plural, row, rows } from "./_lib/data";
import { monthSlug } from "./_lib/logbook";
import { getScheduleChips, scheduleLegend } from "./schedule/data";

export const metadata: Metadata = { title: "Overview" };

type TodoProps = {
  icon: LucideIcon;
  tone: "danger" | "warning" | "success";
  title: string;
  description: string;
  href: string;
  cta: string;
};

const todoTones = {
  danger: "bg-danger/12 text-danger-ink",
  warning: "bg-gold/25 text-gold-ink",
  success: "bg-success/12 text-success-ink",
} as const;

function Todo({ icon: Icon, tone, title, description, href, cta }: TodoProps) {
  return (
    <li className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${todoTones[tone]}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-muted text-sm">{description}</p>
      </div>
      <ButtonLink href={href} variant="secondary" size="sm">
        {cta}
      </ButtonLink>
    </li>
  );
}

/** Months that need the tutor: changes asked for, entries missing, or a draft ready to submit. */
const TODO_FILTER = [
  "logbook_status.eq.changes_requested",
  "entries_missing.gt.0",
  "and(lessons_unfinished.eq.0,lessons_total.gt.0,logbook_status.eq.draft)",
].join(",");
const TODO_LIMIT = 30;

export default async function TutorOverviewPage() {
  const db = await createClient();
  const today = todayInWib();
  const [profile, statsRes, todoRes, weekChips] = await Promise.all([
    getProfile(),
    db.from("tutor_stats").select("*").single(),
    db
      .from("logbook_progress")
      .select("*")
      .or(TODO_FILTER)
      .order("month", { ascending: false })
      .limit(TODO_LIMIT),
    getScheduleChips(db, visibleRange("week", today)),
  ]);

  const stats = row(statsRes);
  const todo = rows(todoRes);

  const needChanges = todo.filter((m) => m.logbook_status === "changes_requested");
  const toWrite = todo.filter((m) => (m.entries_missing ?? 0) > 0);
  const readyToSubmit = todo.filter(
    (m) =>
      (m.lessons_total ?? 0) > 0 &&
      m.lessons_unfinished === 0 &&
      m.entries_missing === 0 &&
      (m.logbook_status === "draft" || m.logbook_status === "changes_requested"),
  );
  const hasTodo = needChanges.length + toWrite.length + readyToSubmit.length > 0;

  const logbookHref = (classId: string, month: string) =>
    `/tutor/classes/${classId}/logbook/${monthSlug(month)}`;
  const label = (className: string | null, month: string) =>
    `${className ?? "Class"} · ${formatMonth(month)}`;

  const firstName = profile?.full_name.split(" ")[0];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Hi{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="text-muted mt-1 text-sm">Here is what is going on in your classes.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={BookOpen} label="My classes" value={stats?.classes ?? 0} />
        <Stat
          icon={CalendarClock}
          label="Lessons coming up"
          value={stats?.upcoming_lessons ?? 0}
          hint={
            stats?.next_lesson_start && stats.next_lesson_end
              ? `Next: ${formatLessonWhen(stats.next_lesson_start, stats.next_lesson_end)}`
              : undefined
          }
        />
        <Stat icon={NotebookPen} label="Entries to write" value={stats?.entries_to_write ?? 0} />
        <Stat
          icon={Wallet}
          label="Approved earnings"
          value={formatRupiah(stats?.total_earned ?? 0)}
        />
      </div>

      <div className="space-y-6">
        <Card title="To do">
          {hasTodo ? (
            <ul className="divide-cloud divide-y">
              {needChanges.map((m) => (
                <Todo
                  key={`changes-${m.class_id}-${m.month}`}
                  icon={CircleX}
                  tone="danger"
                  title={`Changes requested: ${label(m.class_name, m.month!)}`}
                  description={m.review_note ?? "The admin sent this logbook back to you."}
                  href={logbookHref(m.class_id!, m.month!)}
                  cta="Fix logbook"
                />
              ))}
              {toWrite.map((m) => (
                <Todo
                  key={`write-${m.class_id}-${m.month}`}
                  icon={NotebookPen}
                  tone="warning"
                  title={label(m.class_name, m.month!)}
                  description={`${plural(m.entries_missing ?? 0, "lesson")} still need${m.entries_missing === 1 ? "s" : ""} a logbook entry.`}
                  href={logbookHref(m.class_id!, m.month!)}
                  cta="Write entries"
                />
              ))}
              {readyToSubmit.map((m) => (
                <Todo
                  key={`submit-${m.class_id}-${m.month}`}
                  icon={Send}
                  tone="success"
                  title={label(m.class_name, m.month!)}
                  description="All entries are written. You can submit this logbook for approval."
                  href={logbookHref(m.class_id!, m.month!)}
                  cta="Review and submit"
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CircleCheck}
              title="You are all caught up"
              description="Nothing needs your attention right now."
            />
          )}
        </Card>

        <WeekStrip
          today={today}
          chips={weekChips}
          legend={scheduleLegend}
          scheduleHref="/tutor/schedule"
          chipHref={(id) => buildHref("/tutor/schedule", { view: "week", date: today, lesson: id })}
        />
      </div>
    </>
  );
}
