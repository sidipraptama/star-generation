import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CircleCheck, Clock, Search, User, Users } from "lucide-react";
import { ListToolbar } from "@/components/list/list-toolbar";
import { NoResults } from "@/components/list/no-results";
import { Pagination } from "@/components/list/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DialogForm } from "@/components/ui/dialog-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { HoursPicker } from "@/components/student/hours-picker";
import { formatRupiah } from "@/lib/format";
import { CARDS_PER_PAGE, listHref, param, parsePage, parseSearch } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { enroll } from "../actions";
import { getCatalogPage, getMyEnrollments, type CatalogClass, type OpenEnrollment } from "../data";

export const metadata: Metadata = { title: "Find a class" };

function EnrollAction({
  catalogClass,
  enrollment,
}: {
  catalogClass: CatalogClass;
  enrollment: OpenEnrollment | undefined;
}) {
  if (enrollment?.status === "active") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="success" icon={CircleCheck}>
          Enrolled
        </Badge>
        <Link
          href={`/student/classes/${catalogClass.id}`}
          className="text-sm font-semibold underline"
        >
          Open class
        </Link>
      </div>
    );
  }

  if (enrollment?.status === "pending_payment") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="warning" icon={Clock}>
          Waiting for payment
        </Badge>
        <Link href="/student/invoices" className="text-sm font-semibold underline">
          View invoice
        </Link>
      </div>
    );
  }

  if (catalogClass.seatsTaken >= catalogClass.capacity) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Class is full
      </Button>
    );
  }

  return (
    <DialogForm
      action={enroll}
      triggerLabel="Enroll"
      triggerVariant="primary"
      triggerSize="md"
      title={`Enroll in ${catalogClass.name}`}
      description="Choose how many lesson hours you want to buy. We will create an invoice for you."
      submitLabel="Enroll and create invoice"
    >
      <input type="hidden" name="classId" value={catalogClass.id} />
      <HoursPicker rate={catalogClass.studentRate} />
      <p className="text-muted text-sm">
        Your seat is reserved right away. The class opens once our admin team confirms your payment.
      </p>
    </DialogForm>
  );
}

const BASE_PATH = "/student/browse";

const seatOptions = [{ value: "open", label: "Has free seats" }];

type Props = { searchParams: Promise<{ q?: string; seats?: string; page?: string }> };

export default async function BrowsePage({ searchParams }: Props) {
  const raw = await searchParams;
  const q = parseSearch(raw.q);
  const page = parsePage(raw.page);
  const seats = seatOptions.find((option) => option.value === param(raw.seats))?.value;
  const params = { q, seats };
  const filtered = Boolean(q || seats);

  const [{ classes: catalog, total, pastEnd }, enrollments] = await Promise.all([
    getCatalogPage({ q, openOnly: seats === "open", page }),
    getMyEnrollments(),
  ]);
  stayInRange(
    page,
    { count: total, error: pastEnd ? {} : null },
    (target) => listHref(BASE_PATH, params, target),
    CARDS_PER_PAGE,
  );
  const enrollmentByClass = new Map(
    enrollments.map((enrollment) => [enrollment.classId, enrollment]),
  );

  return (
    <>
      <PageHeader
        title="Find a class"
        description="Pick a small group class and choose how many hours you want to learn."
      />

      {(total > 0 || filtered) && (
        <ListToolbar
          action={BASE_PATH}
          query={q ?? ""}
          placeholder="Search by class, tutor or topic"
          filtered={filtered}
          clearHref={BASE_PATH}
        >
          <Combobox
            name="seats"
            options={seatOptions}
            defaultValue={seats ?? ""}
            emptyLabel="Any seats"
            searchPlaceholder="Search…"
            submitOnSelect
            className="w-full sm:w-48"
          />
        </ListToolbar>
      )}

      {total === 0 ? (
        <Card>
          {filtered ? (
            <NoResults clearHref={BASE_PATH} />
          ) : (
            <EmptyState
              icon={Search}
              title="No classes are open yet"
              description="Please check back soon. New classes are added regularly."
            />
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {catalog.map((catalogClass) => {
            const seatsLeft = Math.max(0, catalogClass.capacity - catalogClass.seatsTaken);

            return (
              <Card key={catalogClass.id}>
                <div className="flex h-full flex-col gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                      <BookOpen className="text-muted size-5 shrink-0" aria-hidden />
                      {catalogClass.name}
                    </h2>
                    {catalogClass.description && (
                      <p className="text-muted mt-1 text-sm">{catalogClass.description}</p>
                    )}
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="text-muted size-4" aria-hidden />
                      <dt className="sr-only">Tutor</dt>
                      <dd>Taught by {catalogClass.tutorName}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="text-muted size-4" aria-hidden />
                      <dt className="sr-only">Seats</dt>
                      <dd>
                        {seatsLeft === 0
                          ? "No seats left"
                          : `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left of ${catalogClass.capacity}`}
                      </dd>
                    </div>
                  </dl>

                  <p>
                    <span className="text-2xl font-bold">
                      {formatRupiah(catalogClass.studentRate)}
                    </span>{" "}
                    <span className="text-muted text-sm">per hour</span>
                  </p>

                  <div className="mt-auto">
                    <EnrollAction
                      catalogClass={catalogClass}
                      enrollment={enrollmentByClass.get(catalogClass.id)}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
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
