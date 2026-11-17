import type { Metadata } from "next";
import { CalendarDays, Clock, GraduationCap, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HoursMeter } from "@/components/ui/hours-meter";
import { PageHeader } from "@/components/ui/page-header";
import { formatLessonWhen, formatRupiah } from "@/lib/format";
import { getMyEnrollments, getNextLessons } from "../data";

export const metadata: Metadata = { title: "My classes" };

export default async function MyClassesPage() {
  const enrollments = await getMyEnrollments();
  const active = enrollments.filter((enrollment) => enrollment.status === "active");
  const pending = enrollments.filter((enrollment) => enrollment.status === "pending_payment");
  const nextLessons = await getNextLessons(active.map((enrollment) => enrollment.classId));

  return (
    <>
      <PageHeader
        title="My classes"
        description="Your lessons, hours left and progress notes in one place."
        actions={
          enrollments.length > 0 && (
            <ButtonLink href="/student/browse" variant="secondary">
              Find another class
            </ButtonLink>
          )
        }
      />

      {enrollments.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="You are not in a class yet"
            description="Find a class, choose how many hours you want, and your lessons will appear here once your payment is confirmed."
            action={<ButtonLink href="/student/browse">Find a class</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section aria-label="Active classes" className="grid gap-4 md:grid-cols-2">
              {active.map((enrollment) => {
                const next = nextLessons.get(enrollment.classId);
                const outOfHours = enrollment.leftMinutes <= 0;

                return (
                  <Card key={enrollment.id} className="flex flex-col">
                    <div className="flex h-full flex-col gap-4">
                      <div>
                        <h2 className="text-lg font-bold">{enrollment.className}</h2>
                        <p className="text-muted mt-1 flex items-center gap-2 text-sm">
                          <User className="size-4" aria-hidden />
                          with {enrollment.tutorName}
                        </p>
                      </div>

                      <HoursMeter
                        leftMinutes={enrollment.leftMinutes}
                        purchasedMinutes={enrollment.purchasedMinutes}
                      />

                      <p className="flex items-start gap-2 text-sm">
                        <CalendarDays className="text-muted mt-0.5 size-4 shrink-0" aria-hidden />
                        {next ? (
                          <span>
                            <span className="font-semibold">Next lesson:</span>{" "}
                            {formatLessonWhen(next.start_at, next.end_at)}
                          </span>
                        ) : outOfHours ? (
                          <span className="text-danger-ink">
                            Add more hours to see your upcoming lessons.
                          </span>
                        ) : (
                          <span className="text-muted">No upcoming lessons yet.</span>
                        )}
                      </p>

                      <ButtonLink
                        href={`/student/classes/${enrollment.classId}`}
                        className="mt-auto w-full"
                      >
                        Open class
                      </ButtonLink>
                    </div>
                  </Card>
                );
              })}
            </section>
          )}

          {pending.length > 0 && (
            <section aria-label="Waiting for payment" className="space-y-3">
              <h2 className="text-lg font-bold">Waiting for payment</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pending.map((enrollment) => (
                  <Card key={enrollment.id}>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-bold">{enrollment.className}</h3>
                        <Badge tone="warning" icon={Clock}>
                          Waiting for payment
                        </Badge>
                      </div>
                      {enrollment.unpaidInvoice && (
                        <p className="text-sm">
                          Invoice for {enrollment.unpaidInvoice.hours} hours:{" "}
                          <span className="font-semibold">
                            {formatRupiah(enrollment.unpaidInvoice.amount)}
                          </span>
                        </p>
                      )}
                      <p className="text-muted text-sm">
                        Your seat is reserved. The class opens as soon as our admin team confirms
                        your payment.
                      </p>
                      <ButtonLink href="/student/invoices" variant="secondary" size="sm">
                        View invoice
                      </ButtonLink>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
