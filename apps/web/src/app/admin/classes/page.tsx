import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { createClass } from "@/app/admin/actions";
import { filterLabels, idParam } from "@/app/admin/filters";
import { searchTutors } from "@/app/admin/options";
import { ClassFormFields } from "@/components/admin/class-form-fields";
import { Panel } from "@/components/admin/section";
import { ListToolbar } from "@/components/list/list-toolbar";
import { NoResults } from "@/components/list/no-results";
import { Pagination } from "@/components/list/pagination";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { DialogForm } from "@/components/ui/dialog-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatRupiah } from "@/lib/format";
import { listHref, orIlike, pageBounds, param, parsePage, parseSearch } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Classes" };

const BASE_PATH = "/admin/classes";

const seatOptions = [
  { value: "open", label: "Has free seats" },
  { value: "full", label: "Full" },
];

type Props = {
  searchParams: Promise<{ q?: string; tutor?: string; seats?: string; page?: string }>;
};

export default async function ClassesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const q = parseSearch(raw.q);
  const page = parsePage(raw.page);
  const tutor = idParam(raw.tutor);
  const seats = seatOptions.find((option) => option.value === param(raw.seats))?.value;
  const params = { q, tutor, seats };
  const filtered = Boolean(q || tutor || seats);

  const db = await createClient();
  const { from, to } = pageBounds(page);
  let query = db
    .from("class_list")
    .select("*", { count: "exact" })
    .order("name")
    .order("id")
    .range(from, to);
  if (q) query = query.or(orIlike(["name", "tutor_name"], q));
  if (tutor) query = query.eq("tutor_id", tutor);
  if (seats === "open") query = query.gt("seats_left", 0);
  if (seats === "full") query = query.eq("seats_left", 0);

  const [result, labels] = await Promise.all([query, filterLabels({ tutor })]);
  const { data, count } = result;
  const total = count ?? 0;
  stayInRange(page, result, (target) => listHref(BASE_PATH, params, target));
  const classes = data ?? [];

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

  const nothingYet = total === 0 && !filtered;

  return (
    <>
      <PageHeader
        title="Classes"
        description="Every group class, its tutor, seats and hourly rates."
        actions={nothingYet ? undefined : newClass}
      />

      {nothingYet ? (
        <Panel>
          <EmptyState
            icon={BookOpen}
            title="No classes yet"
            description="Create your first class to start enrolling students."
            action={newClass}
          />
        </Panel>
      ) : (
        <>
          <ListToolbar
            action={BASE_PATH}
            query={q ?? ""}
            placeholder="Search by class or tutor"
            filtered={filtered}
            clearHref={BASE_PATH}
          >
            <Combobox
              name="tutor"
              loadOptions={searchTutors}
              defaultValue={tutor ?? ""}
              defaultLabel={labels.tutor}
              emptyLabel="All tutors"
              searchPlaceholder="Search tutors…"
              submitOnSelect
              className="w-full sm:w-52"
            />
            <Combobox
              name="seats"
              options={seatOptions}
              defaultValue={seats ?? ""}
              emptyLabel="Any seats"
              searchPlaceholder="Search…"
              submitOnSelect
              className="w-full sm:w-44"
            />
          </ListToolbar>

          {total === 0 ? (
            <Panel>
              <NoResults clearHref={BASE_PATH} />
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
                {classes.map((item) => {
                  const taken = item.seats_taken ?? 0;
                  return (
                    <tr key={item.id}>
                      <Td>
                        <Link
                          href={`${BASE_PATH}/${item.id}`}
                          className="font-semibold hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.description && (
                          <p className="text-muted max-w-xs truncate text-xs">{item.description}</p>
                        )}
                      </Td>
                      <Td>{item.tutor_name}</Td>
                      <Td>
                        <span className="mr-2">
                          {taken} / {item.capacity}
                        </span>
                        {item.seats_left === 0 && <Badge tone="warning">Full</Badge>}
                      </Td>
                      <Td>{formatRupiah(item.student_rate ?? 0)} / hour</Td>
                      <Td>{formatRupiah(item.tutor_rate ?? 0)} / hour</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          <Pagination
            basePath={BASE_PATH}
            params={params}
            page={page}
            total={total}
            noun={total === 1 ? "class" : "classes"}
          />
        </>
      )}
    </>
  );
}
