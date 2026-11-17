import type { Metadata } from "next";
import { BookOpen, CalendarClock, Users, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatLessonWhen, formatRupiah } from "@/lib/format";
import { isPast } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { plural, rows } from "../_lib/data";

export const metadata: Metadata = { title: "My classes" };

export default async function TutorClassesPage() {
  const db = await createClient();
  const [classesRes, ratesRes, enrollmentsRes, lessonsRes] = await Promise.all([
    db.from("classes").select("id, name, description, capacity").order("name"),
    db.from("class_tutor_rates").select("class_id, tutor_rate"),
    db.from("enrollments").select("class_id"),
    db
      .from("lessons")
      .select("class_id, start_at, end_at")
      .eq("status", "scheduled")
      .order("start_at"),
  ]);

  const classes = rows(classesRes);
  const rates = new Map(rows(ratesRes).map((r) => [r.class_id, r.tutor_rate]));
  const enrollments = rows(enrollmentsRes);
  const lessons = rows(lessonsRes).filter((l) => !isPast(l.end_at));

  return (
    <>
      <PageHeader title="My classes" description="The classes you teach." />

      {classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No classes assigned yet"
            description="When an admin assigns you to a class, it will show up here."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((c) => {
            const students = enrollments.filter((e) => e.class_id === c.id).length;
            const next = lessons.find((l) => l.class_id === c.id);
            const rate = rates.get(c.id);

            return (
              <Card key={c.id} title={c.name} description={c.description ?? undefined}>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Users className="text-muted size-4" aria-hidden />
                    {plural(students, "student")} of {c.capacity} seats
                  </li>
                  {rate !== undefined && (
                    <li className="flex items-center gap-2">
                      <Wallet className="text-muted size-4" aria-hidden />
                      You earn {formatRupiah(rate)} per hour
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <CalendarClock className="text-muted size-4" aria-hidden />
                    {next
                      ? `Next lesson: ${formatLessonWhen(next.start_at, next.end_at)}`
                      : "No lesson scheduled yet"}
                  </li>
                </ul>
                <ButtonLink href={`/tutor/classes/${c.id}`} className="mt-5 w-full">
                  Open class
                </ButtonLink>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
