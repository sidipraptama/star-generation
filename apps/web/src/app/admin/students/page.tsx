import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EnrollmentHours } from "@/components/admin/enrollment-hours";
import { Panel } from "@/components/admin/section";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  const db = await createClient();

  const [students, balances] = await Promise.all([
    db
      .from("profiles")
      .select(
        "id, full_name, email, enrollments(id, status, classes(name), invoices(hours, status))",
      )
      .eq("role", "student")
      .order("full_name"),
    db.from("enrollment_balances").select("enrollment_id, balance_minutes"),
  ]);

  const balanceOf = new Map(
    balances.data?.map((row) => [row.enrollment_id, row.balance_minutes ?? 0]),
  );

  type Student = NonNullable<typeof students.data>[number];
  type Row = { student: Student; enrollment: Student["enrollments"][number] | null };

  const rows = (students.data ?? []).flatMap((student): Row[] => {
    const enrollments = student.enrollments.filter(
      (enrollment) => enrollment.status !== "cancelled",
    );
    return enrollments.length > 0
      ? enrollments.map((enrollment) => ({ student, enrollment }))
      : [{ student, enrollment: null }];
  });

  return (
    <>
      <PageHeader
        title="Students"
        description="Who is enrolled where, and how many hours each student has left."
      />

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Student accounts appear here once they have been created."
          />
        </Panel>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Class</Th>
              <Th>Status</Th>
              <Th>Hours left</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, enrollment }) => (
              <tr key={enrollment?.id ?? student.id}>
                <Td>
                  <p className="font-semibold">{student.full_name}</p>
                  <p className="text-muted text-xs">{student.email}</p>
                </Td>
                {enrollment ? (
                  <>
                    <Td>{enrollment.classes.name}</Td>
                    <Td>
                      <StatusBadge kind="enrollment" status={enrollment.status} />
                    </Td>
                    <Td>
                      <EnrollmentHours
                        status={enrollment.status}
                        balanceMinutes={balanceOf.get(enrollment.id) ?? 0}
                        invoices={enrollment.invoices}
                      />
                    </Td>
                  </>
                ) : (
                  <>
                    <Td className="text-muted">Not enrolled in any class yet</Td>
                    <Td />
                    <Td />
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
