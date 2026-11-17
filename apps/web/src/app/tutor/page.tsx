import type { Metadata } from "next";
import Link from "next/link";
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
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { getProfile } from "@/lib/auth";
import { formatLessonWhen, formatMonth, formatRupiah } from "@/lib/format";
import { isPast } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { plural, rows } from "./_lib/data";
import { monthSlug, summarizeMonths } from "./_lib/logbook";

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

export default async function TutorOverviewPage() {
  const db = await createClient();
  const [profile, classesRes, lessonsRes, entriesRes, logbooksRes, earningsRes] = await Promise.all(
    [
      getProfile(),
      db.from("classes").select("id, name"),
      db.from("lessons").select("id, class_id, start_at, end_at, status").order("start_at"),
      db.from("logbook_entries").select("lesson_id"),
      db.from("logbooks").select("id, class_id, month, status, review_note"),
      db.from("earnings").select("amount"),
    ],
  );

  const classes = rows(classesRes);
  const lessons = rows(lessonsRes);
  const entries = rows(entriesRes);
  const logbooks = rows(logbooksRes);
  const earnings = rows(earningsRes);

  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  const months = summarizeMonths(lessons, entries, logbooks);
  const upcoming = lessons.filter((l) => l.status === "scheduled" && !isPast(l.end_at));
  const entriesToWrite = months.reduce((sum, m) => sum + m.progress.missing, 0);
  const totalEarned = earnings.reduce((sum, e) => sum + e.amount, 0);

  const needChanges = months.filter((m) => m.logbook?.status === "changes_requested");
  const toWrite = months.filter((m) => m.progress.missing > 0);
  const readyToSubmit = months.filter(
    (m) =>
      m.progress.ready &&
      (m.logbook?.status === "draft" || m.logbook?.status === "changes_requested"),
  );
  const hasTodo = needChanges.length + toWrite.length + readyToSubmit.length > 0;

  const logbookHref = (classId: string, month: string) =>
    `/tutor/classes/${classId}/logbook/${monthSlug(month)}`;
  const label = (classId: string, month: string) =>
    `${classNames.get(classId) ?? "Class"} · ${formatMonth(month)}`;

  const firstName = profile?.full_name.split(" ")[0];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Hi{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="text-muted mt-1 text-sm">Here is what is going on in your classes.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={BookOpen} label="My classes" value={classes.length} />
        <Stat
          icon={CalendarClock}
          label="Lessons coming up"
          value={upcoming.length}
          hint={
            upcoming[0]
              ? `Next: ${formatLessonWhen(upcoming[0].start_at, upcoming[0].end_at)}`
              : undefined
          }
        />
        <Stat icon={NotebookPen} label="Entries to write" value={entriesToWrite} />
        <Stat icon={Wallet} label="Approved earnings" value={formatRupiah(totalEarned)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="To do">
          {hasTodo ? (
            <ul className="divide-cloud divide-y">
              {needChanges.map((m) => (
                <Todo
                  key={`changes-${m.classId}-${m.month}`}
                  icon={CircleX}
                  tone="danger"
                  title={`Changes requested: ${label(m.classId, m.month)}`}
                  description={m.logbook?.review_note ?? "The admin sent this logbook back to you."}
                  href={logbookHref(m.classId, m.month)}
                  cta="Fix logbook"
                />
              ))}
              {toWrite.map((m) => (
                <Todo
                  key={`write-${m.classId}-${m.month}`}
                  icon={NotebookPen}
                  tone="warning"
                  title={label(m.classId, m.month)}
                  description={`${plural(m.progress.missing, "lesson")} still need${m.progress.missing === 1 ? "s" : ""} a logbook entry.`}
                  href={logbookHref(m.classId, m.month)}
                  cta="Write entries"
                />
              ))}
              {readyToSubmit.map((m) => (
                <Todo
                  key={`submit-${m.classId}-${m.month}`}
                  icon={Send}
                  tone="success"
                  title={label(m.classId, m.month)}
                  description="All entries are written. You can submit this logbook for approval."
                  href={logbookHref(m.classId, m.month)}
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

        <Card title="Coming up">
          {upcoming.length > 0 ? (
            <ul className="divide-cloud divide-y">
              {upcoming.slice(0, 5).map((lesson) => (
                <li key={lesson.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/tutor/classes/${lesson.class_id}`}
                    className="block hover:underline"
                  >
                    <p className="font-semibold">{classNames.get(lesson.class_id)}</p>
                    <p className="text-muted text-sm">
                      {formatLessonWhen(lesson.start_at, lesson.end_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="No lessons scheduled"
              description="Open one of your classes to add the next lesson."
              action={<ButtonLink href="/tutor/classes">Go to my classes</ButtonLink>}
            />
          )}
        </Card>
      </div>
    </>
  );
}
