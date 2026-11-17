import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Ban, CircleCheck, Circle, Clock } from "lucide-react";
import { BackLink } from "@/components/tutor/back-link";
import { EntryDialog, SubmitLogbookDialog } from "@/components/tutor/logbook-dialogs";
import { LogbookEntries } from "@/components/logbook/logbook-entries";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime, formatLessonWhen, formatMonth } from "@/lib/format";
import { isPast } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { isUuid, plural, row, rows } from "../../../../_lib/data";
import { isEditable, logbookProgress, monthFromSlug, monthRange } from "../../../../_lib/logbook";

export const metadata: Metadata = { title: "Logbook" };

type Props = { params: Promise<{ id: string; month: string }> };

function ChecklistItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  const Icon = done ? CircleCheck : Circle;
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className={done ? "text-success-ink size-4" : "text-muted size-4"} aria-hidden />
      {children}
    </li>
  );
}

export default async function TutorLogbookMonthPage({ params }: Props) {
  const { id, month: slug } = await params;
  const month = monthFromSlug(slug);
  if (!isUuid(id) || !month) notFound();

  const db = await createClient();
  const { from, to } = monthRange(month);
  const [classRes, lessonsRes, logbookRes] = await Promise.all([
    db.from("classes").select("id, name").eq("id", id).maybeSingle(),
    db
      .from("lessons")
      .select("id, class_id, start_at, end_at, status")
      .eq("class_id", id)
      .gte("start_at", from)
      .lt("start_at", to)
      .order("start_at"),
    db
      .from("logbooks")
      .select("id, class_id, month, status, review_note, submitted_at, reviewed_at")
      .eq("class_id", id)
      .eq("month", month)
      .maybeSingle(),
  ]);

  const cls = row(classRes);
  const lessons = rows(lessonsRes);
  const logbook = row(logbookRes);
  if (!cls || lessons.length === 0) notFound();

  const entries = logbook
    ? rows(
        await db
          .from("logbook_entries")
          .select("id, lesson_id, topic, activities, observation, recommendation")
          .eq("logbook_id", logbook.id),
      )
    : [];

  const entryByLesson = new Map(entries.map((e) => [e.lesson_id, e]));
  const progress = logbookProgress(lessons, new Set(entryByLesson.keys()));
  const editable = isEditable(logbook?.status);
  const monthLabel = formatMonth(month);

  const lockedEntries = entries.flatMap((entry) => {
    const lesson = lessons.find((l) => l.id === entry.lesson_id);
    return lesson ? [{ ...entry, lesson }] : [];
  });

  return (
    <>
      <BackLink href={`/tutor/classes/${cls.id}`}>{cls.name}</BackLink>
      <PageHeader
        title={`Logbook · ${monthLabel}`}
        description={cls.name}
        actions={
          logbook ? (
            <StatusBadge kind="logbook" status={logbook.status} />
          ) : (
            <Badge>Not started</Badge>
          )
        }
      />

      <div className="space-y-6">
        {logbook?.status === "changes_requested" && (
          <Alert tone="danger">
            <p className="font-semibold">Your admin asked for changes</p>
            <p>{logbook.review_note}</p>
          </Alert>
        )}
        {logbook?.status === "submitted" && (
          <Alert tone="info">
            Submitted{logbook.submitted_at ? ` on ${formatDateTime(logbook.submitted_at)}` : ""}. It
            is waiting for an admin to review it, so it cannot be edited right now. If changes are
            needed, the admin will send it back to you.
          </Alert>
        )}
        {logbook?.status === "approved" && (
          <Alert tone="success">
            Approved{logbook.reviewed_at ? ` on ${formatDateTime(logbook.reviewed_at)}` : ""}. This
            logbook is final and can no longer be changed.
          </Alert>
        )}

        {editable ? (
          <>
            <Card title="Lessons" description="Write one entry for every lesson once it has ended.">
              <ul className="divide-cloud divide-y">
                {lessons.map((lesson) => {
                  const entry = entryByLesson.get(lesson.id);
                  const when = formatLessonWhen(lesson.start_at, lesson.end_at);
                  const ended = isPast(lesson.end_at);

                  return (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p
                          className={
                            lesson.status === "cancelled"
                              ? "text-muted line-through"
                              : "font-semibold"
                          }
                        >
                          {when}
                        </p>
                        {entry && <p className="text-muted text-sm">Topic: {entry.topic}</p>}
                      </div>

                      {lesson.status === "cancelled" ? (
                        <span className="text-muted flex items-center gap-1.5 text-sm">
                          <Ban className="size-4" aria-hidden />
                          Cancelled, no entry needed
                        </span>
                      ) : !ended ? (
                        <span className="text-muted flex items-center gap-1.5 text-sm">
                          <Clock className="size-4" aria-hidden />
                          Not finished yet
                        </span>
                      ) : (
                        <div className="flex items-center gap-3">
                          {entry && (
                            <Badge tone="success" icon={CircleCheck}>
                              Entry written
                            </Badge>
                          )}
                          <EntryDialog lessonId={lesson.id} when={when} entry={entry} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card title="Submit for approval">
              <ul className="mb-4 space-y-2">
                <ChecklistItem done={progress.unfinished === 0}>
                  {progress.unfinished === 0
                    ? "All lessons this month have finished"
                    : `${plural(progress.unfinished, "lesson")} ${progress.unfinished === 1 ? "has" : "have"} not finished yet`}
                </ChecklistItem>
                <ChecklistItem done={progress.missing === 0 && progress.logged > 0}>
                  {progress.missing === 0 && progress.logged > 0
                    ? "Every lesson has a logbook entry"
                    : `${plural(progress.missing, "lesson")} still need${progress.missing === 1 ? "s" : ""} a logbook entry`}
                </ChecklistItem>
              </ul>
              {logbook && progress.ready ? (
                <SubmitLogbookDialog logbookId={logbook.id} month={monthLabel} />
              ) : (
                <>
                  <Button disabled>Submit for approval</Button>
                  <p className="text-muted mt-2 text-xs">
                    You can submit once every lesson this month has ended and has an entry.
                  </p>
                </>
              )}
            </Card>
          </>
        ) : (
          <LogbookEntries entries={lockedEntries} />
        )}
      </div>
    </>
  );
}
