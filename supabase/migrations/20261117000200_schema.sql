create type public.enrollment_status as enum ('pending_payment', 'active', 'cancelled');
create type public.invoice_status as enum ('unpaid', 'paid', 'void');
create type public.lesson_status as enum ('scheduled', 'cancelled');
create type public.logbook_status as enum ('draft', 'changes_requested', 'submitted', 'approved');

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  tutor_id uuid not null references public.profiles (id),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

-- Rates live in their own tables so row-level security can hide each one from the right role.
create table public.class_student_rates (
  class_id uuid primary key references public.classes (id) on delete cascade,
  student_rate integer not null check (student_rate between 1 and 10000000)
);

create table public.class_tutor_rates (
  class_id uuid primary key references public.classes (id) on delete cascade,
  tutor_rate integer not null check (tutor_rate between 1 and 10000000)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id),
  student_id uuid not null references public.profiles (id),
  status public.enrollment_status not null default 'pending_payment',
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint enrollments_active_has_activation check (status <> 'active' or activated_at is not null)
);

create unique index enrollments_one_open_per_student
  on public.enrollments (class_id, student_id)
  where status <> 'cancelled';

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id),
  hours integer not null check (hours between 1 and 200),
  student_rate integer not null check (student_rate between 1 and 10000000),
  amount integer generated always as (hours * student_rate) stored not null,
  status public.invoice_status not null default 'unpaid',
  payment_reference text,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by uuid references public.profiles (id),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id),
  void_reason text,
  constraint invoices_paid_has_payment check (status <> 'paid' or (paid_at is not null and paid_by is not null)),
  constraint invoices_void_has_void check (status <> 'void' or voided_at is not null),
  constraint invoices_unpaid_has_no_payment check (status <> 'unpaid' or paid_at is null)
);

create unique index invoices_one_unpaid_per_enrollment
  on public.invoices (enrollment_id)
  where status = 'unpaid';

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id),
  tutor_id uuid not null references public.profiles (id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.lesson_status not null default 'scheduled',
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  constraint lessons_end_after_start check (end_at > start_at),
  constraint lessons_max_duration check (end_at <= start_at + interval '8 hours'),
  constraint lessons_whole_minutes check (extract(second from start_at) = 0 and extract(second from end_at) = 0),
  constraint lessons_cancelled_has_timestamp check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint lessons_tutor_no_overlap
    exclude using gist (tutor_id with =, tstzrange(start_at, end_at) with &&)
    where (status = 'scheduled')
);

create index lessons_class_start on public.lessons (class_id, start_at);

create table public.lesson_rates (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  tutor_rate integer not null check (tutor_rate between 1 and 10000000)
);

create table public.logbooks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id),
  month date not null check (extract(day from month) = 1),
  status public.logbook_status not null default 'draft',
  review_note text,
  submitted_at timestamptz,
  submitted_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint logbooks_one_per_class_month unique (class_id, month),
  constraint logbooks_changes_have_note check (status <> 'changes_requested' or review_note is not null),
  constraint logbooks_approved_has_reviewer check (status <> 'approved' or (reviewed_at is not null and reviewed_by is not null))
);

create table public.logbook_entries (
  id uuid primary key default gen_random_uuid(),
  logbook_id uuid not null references public.logbooks (id) on delete cascade,
  lesson_id uuid not null unique references public.lessons (id),
  topic text not null check (length(trim(topic)) > 0),
  activities text not null check (length(trim(activities)) > 0),
  observation text not null check (length(trim(observation)) > 0),
  recommendation text not null check (length(trim(recommendation)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index logbook_entries_logbook on public.logbook_entries (logbook_id);

-- Earnings are an immutable statement line per approved lesson, so they carry their own snapshot.
create table public.earnings (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id),
  logbook_id uuid not null references public.logbooks (id),
  tutor_id uuid not null references public.profiles (id),
  class_id uuid not null references public.classes (id),
  class_name text not null,
  lesson_start timestamptz not null,
  minutes integer not null check (minutes > 0),
  tutor_rate integer not null check (tutor_rate > 0),
  amount integer not null check (amount >= 0),
  approved_at timestamptz not null default now()
);

create index earnings_tutor on public.earnings (tutor_id, lesson_start desc);

create function private.guard_logbook_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_logbook public.logbooks;
  v_lesson public.lessons;
begin
  select * into v_logbook
  from public.logbooks
  where id = case when tg_op = 'DELETE' then old.logbook_id else new.logbook_id end;

  if v_logbook.status not in ('draft', 'changes_requested') then
    raise exception 'This logbook is locked and can no longer be changed';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  select * into v_lesson from public.lessons where id = new.lesson_id;

  if v_lesson.class_id <> v_logbook.class_id
     or private.wib_month(v_lesson.start_at) <> v_logbook.month then
    raise exception 'This lesson does not belong to this logbook';
  end if;
  if v_lesson.status <> 'scheduled' then
    raise exception 'A cancelled lesson cannot have a logbook entry';
  end if;
  if v_lesson.end_at > now() then
    raise exception 'A logbook entry can only be added after the lesson has ended';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger logbook_entries_guard
  before insert or update or delete on public.logbook_entries
  for each row execute function private.guard_logbook_entry();

-- Hour ledger: purchases minus delivered lessons. Nothing is stored (see ADR 0003).
create function private.hour_ledger_lines(p_enrollment_id uuid)
returns table (
  occurred_at timestamptz,
  kind text,
  minutes integer,
  lesson_id uuid,
  invoice_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.paid_at, 'purchase', i.hours * 60, null::uuid, i.id
  from public.invoices i
  where i.enrollment_id = p_enrollment_id and i.status = 'paid'
  union all
  select l.end_at, 'lesson', -private.lesson_minutes(l.start_at, l.end_at), l.id, null::uuid
  from public.enrollments e
  join public.lessons l on l.class_id = e.class_id
  where e.id = p_enrollment_id
    and e.status = 'active'
    and l.status = 'scheduled'
    and l.end_at <= now()
    and l.start_at >= e.activated_at;
$$;

create function private.enrollment_balance(p_enrollment_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(minutes), 0)::integer from private.hour_ledger_lines(p_enrollment_id);
$$;

create view public.hour_ledger with (security_invoker = true) as
select e.id as enrollment_id, e.class_id, l.occurred_at, l.kind, l.minutes, l.lesson_id, l.invoice_id
from public.enrollments e
cross join lateral private.hour_ledger_lines(e.id) l;

create view public.enrollment_balances with (security_invoker = true) as
select e.id as enrollment_id, private.enrollment_balance(e.id) as balance_minutes
from public.enrollments e;

-- Storefront for students: runs with owner rights on purpose, but only exposes safe columns
-- and returns nothing to tutors, who must not see student rates.
create view public.class_catalog as
select
  c.id,
  c.name,
  c.description,
  p.full_name as tutor_name,
  c.capacity,
  count(e.id) filter (where e.status <> 'cancelled')::integer as seats_taken,
  r.student_rate
from public.classes c
join public.profiles p on p.id = c.tutor_id
join public.class_student_rates r on r.class_id = c.id
left join public.enrollments e on e.class_id = c.id
where private.user_role() in ('admin', 'student')
group by c.id, p.full_name, r.student_rate;
