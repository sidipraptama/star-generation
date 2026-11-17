-- Flat, read-only views for the list screens, so searching, filtering and paging happen in the
-- database instead of in the app. All of them run with the caller's rights (security_invoker),
-- so row level security decides what each role can see exactly as it does for the tables.

create extension if not exists pg_trgm with schema extensions;

-- Substring search (ilike '%text%') on names and emails
create index profiles_full_name_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index profiles_email_trgm on public.profiles using gin (email extensions.gin_trgm_ops);
create index classes_name_trgm on public.classes using gin (name extensions.gin_trgm_ops);

-- Foreign keys and the default orderings of the lists
create index enrollments_class on public.enrollments (class_id);
create index enrollments_student on public.enrollments (student_id);
create index invoices_enrollment on public.invoices (enrollment_id);
create index invoices_status_issued on public.invoices (status, issued_at desc);
create index logbooks_month on public.logbooks (month desc);
create index lessons_start on public.lessons (start_at);

-- Classes with their tutor, rates, taken seats and next lesson. Admins see both rates; a tutor sees
-- only their own tutor rate, because the student rate table is hidden from them.
create view public.class_list with (security_invoker = true) as
select
  c.id,
  c.name,
  c.description,
  c.capacity,
  c.tutor_id,
  t.full_name as tutor_name,
  sr.student_rate,
  tr.tutor_rate,
  s.seats_taken,
  greatest(0, c.capacity - s.seats_taken) as seats_left,
  n.start_at as next_lesson_start,
  n.end_at as next_lesson_end
from public.classes c
join public.profiles t on t.id = c.tutor_id
left join public.class_student_rates sr on sr.class_id = c.id
left join public.class_tutor_rates tr on tr.class_id = c.id
cross join lateral (
  select count(*)::integer as seats_taken
  from public.enrollments e
  where e.class_id = c.id and e.status <> 'cancelled'
) s
left join lateral (
  select l.start_at, l.end_at
  from public.lessons l
  where l.class_id = c.id and l.status = 'scheduled' and l.end_at > now()
  order by l.start_at
  limit 1
) n on true;

-- Invoices with the student, class and approver, for the admin list.
create view public.invoice_list with (security_invoker = true) as
select
  i.id,
  i.status,
  i.hours,
  i.student_rate,
  i.amount,
  i.payment_reference,
  i.issued_at,
  i.paid_at,
  i.voided_at,
  i.void_reason,
  i.proof_uploaded_at,
  e.id as enrollment_id,
  e.student_id,
  s.full_name as student_name,
  s.email as student_email,
  e.class_id,
  c.name as class_name,
  a.full_name as approved_by
from public.invoices i
join public.enrollments e on e.id = i.enrollment_id
join public.profiles s on s.id = e.student_id
join public.classes c on c.id = e.class_id
left join public.profiles a on a.id = i.paid_by;

create view public.logbook_list with (security_invoker = true) as
select
  l.id,
  l.class_id,
  c.name as class_name,
  c.tutor_id,
  t.full_name as tutor_name,
  l.month,
  l.status,
  l.submitted_at,
  (select count(*) from public.logbook_entries e where e.logbook_id = l.id)::integer as entries_count
from public.logbooks l
join public.classes c on c.id = l.class_id
join public.profiles t on t.id = c.tutor_id;

-- One row per student and open enrollment, or a single row for a student with none.
create view public.student_enrollment_list with (security_invoker = true) as
select
  p.id as student_id,
  p.full_name,
  p.email,
  e.id as enrollment_id,
  e.status as enrollment_status,
  e.class_id,
  c.name as class_name
from public.profiles p
left join public.enrollments e on e.student_id = p.id and e.status <> 'cancelled'
left join public.classes c on c.id = e.class_id
where p.role = 'student';

-- Logbook progress per class and WIB month. The same rules as submit_logbook(): only scheduled
-- lessons count, a lesson is unfinished until it ends, and it is missing an entry once it has ended.
create view public.logbook_progress with (security_invoker = true) as
select
  l.class_id,
  c.name as class_name,
  private.wib_month(l.start_at) as month,
  count(*) filter (where l.status = 'scheduled')::integer as lessons_total,
  count(*) filter (where l.status = 'scheduled' and l.end_at > now())::integer as lessons_unfinished,
  count(*) filter (where l.status = 'scheduled' and en.lesson_id is not null)::integer as entries_written,
  count(*) filter (where l.status = 'scheduled' and l.end_at <= now() and en.lesson_id is null)::integer as entries_missing,
  lb.id as logbook_id,
  lb.status as logbook_status,
  lb.review_note
from public.lessons l
join public.classes c on c.id = l.class_id
left join public.logbook_entries en on en.lesson_id = l.id
left join public.logbooks lb on lb.class_id = l.class_id and lb.month = private.wib_month(l.start_at)
group by l.class_id, c.name, private.wib_month(l.start_at), lb.id, lb.status, lb.review_note;

-- A tutor's earnings per month: the filter options and the totals.
create view public.earning_months with (security_invoker = true) as
select
  tutor_id,
  private.wib_month(lesson_start) as month,
  count(*)::integer as lessons,
  sum(amount)::bigint as total
from public.earnings
group by tutor_id, private.wib_month(lesson_start);

-- The numbers on the overview pages, counted in the database. Each role only counts what its
-- own policies let it see.
create view public.admin_stats with (security_invoker = true) as
select
  (select count(*) from public.invoices where status = 'unpaid')::integer as unpaid_invoices,
  (select count(*) from public.logbooks where status = 'submitted')::integer as logbooks_to_review,
  (select count(distinct student_id) from public.enrollments where status = 'active')::integer as active_students,
  (select count(*) from public.classes)::integer as classes;

create view public.tutor_stats with (security_invoker = true) as
select
  (select count(*) from public.classes)::integer as classes,
  (select count(*) from public.lessons where status = 'scheduled' and end_at > now())::integer as upcoming_lessons,
  n.start_at as next_lesson_start,
  n.end_at as next_lesson_end,
  (select coalesce(sum(entries_missing), 0) from public.logbook_progress)::integer as entries_to_write,
  (select coalesce(sum(amount), 0) from public.earnings)::bigint as total_earned
from (select 1) as one
left join lateral (
  select l.start_at, l.end_at
  from public.lessons l
  where l.status = 'scheduled' and l.end_at > now()
  order by l.start_at
  limit 1
) n on true;

-- Students see seats left too, so the catalogue can be filtered to classes with room.
create or replace view public.class_catalog as
select
  c.id,
  c.name,
  c.description,
  p.full_name as tutor_name,
  c.capacity,
  count(e.id) filter (where e.status <> 'cancelled')::integer as seats_taken,
  r.student_rate,
  greatest(0, c.capacity - count(e.id) filter (where e.status <> 'cancelled'))::integer as seats_left
from public.classes c
join public.profiles p on p.id = c.tutor_id
join public.class_student_rates r on r.class_id = c.id
left join public.enrollments e on e.class_id = c.id
where private.user_role() in ('admin', 'student')
group by c.id, p.full_name, r.student_rate;

grant select on
  public.class_list,
  public.invoice_list,
  public.logbook_list,
  public.student_enrollment_list,
  public.logbook_progress,
  public.earning_months,
  public.admin_stats,
  public.tutor_stats
to authenticated;
