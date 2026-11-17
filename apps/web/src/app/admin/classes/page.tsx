import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { createClass } from "@/app/admin/actions";
import { ClassFormFields } from "@/components/admin/class-form-fields";
import { Panel } from "@/components/admin/section";
import { Badge } from "@/components/ui/badge";
import { DialogForm } from "@/components/ui/dialog-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
  const db = await createClient();

  const [classes, catalog] = await Promise.all([
    db
      .from("classes")
      .select(
        "id, name, description, capacity, profiles!classes_tutor_id_fkey(full_name), class_student_rates(student_rate), class_tutor_rates(tutor_rate)",
      )
      .order("name"),
    db.from("class_catalog").select("id, seats_taken"),
  ]);

  const seatsTaken = new Map(catalog.data?.map((row) => [row.id, row.seats_taken ?? 0]));

  const newClass = (
    <DialogForm
      action={createClass}
      triggerLabel="New class"
      triggerIcon={<Plus className="size-4" aria-hidden />}
      triggerVariant="primary"
      title="New class"
      description="Set the tutor, the number of seats and the hourly rates."
      submitLabel="Create class"
    >
      <ClassFormFields idPrefix="new-class" />
    </DialogForm>
  );

  return (
    <>
      <PageHeader
        title="Classes"
        description="Every group class, its tutor, seats and hourly rates."
        actions={classes.data?.length ? newClass : undefined}
      />

      {!classes.data?.length ? (
        <Panel>
          <EmptyState
            icon={BookOpen}
            title="No classes yet"
            description="Create your first class to start enrolling students."
            action={newClass}
          />
        </Panel>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Class</Th>
              <Th>Tutor</Th>
              <Th>Seats</Th>
              <Th>Student rate</Th>
              <Th>Tutor rate</Th>
            </tr>
          </thead>
          <tbody>
            {classes.data.map((item) => {
              const taken = seatsTaken.get(item.id) ?? 0;
              return (
                <tr key={item.id}>
                  <Td>
                    <Link
                      href={`/admin/classes/${item.id}`}
                      className="font-semibold hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.description && (
                      <p className="text-muted max-w-xs truncate text-xs">{item.description}</p>
                    )}
                  </Td>
                  <Td>{item.profiles.full_name}</Td>
                  <Td>
                    <span className="mr-2">
                      {taken} / {item.capacity}
                    </span>
                    {taken >= item.capacity && <Badge tone="warning">Full</Badge>}
                  </Td>
                  <Td>{formatRupiah(item.class_student_rates?.student_rate ?? 0)} / hour</Td>
                  <Td>{formatRupiah(item.class_tutor_rates?.tutor_rate ?? 0)} / hour</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
