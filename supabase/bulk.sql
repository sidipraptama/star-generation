-- Optional: a lot of synthetic data, to see the lists with search, filters and paging at scale.
-- 120 students (they cannot log in), 60 classes, about 4,800 enrollments with an invoice each,
-- 75 lessons, approved logbooks with earnings, and logbooks in every status.
-- Load it on top of the seed (and the demo history if you like): pnpm db:bulk
\set ON_ERROR_STOP on

-- A valid version 4 shaped uuid derived from a name, so that the same name always gives the same id.
create function pg_temp.uid(text) returns uuid language sql immutable as $$
  select (substr(md5($1), 1, 12) || '4' || substr(md5($1), 14, 3) || '8' || substr(md5($1), 18, 15))::uuid
$$;

-- 120 students that cannot log in, 60 classes (30 per tutor)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
select '00000000-0000-0000-0000-000000000000', pg_temp.uid('bulk-student-' || n), 'authenticated', 'authenticated',
  'bulk.student.' || lpad(n::text, 3, '0') || '@stargeneration.test', 'x', now(), '{}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
from generate_series(1, 120) n;

insert into public.profiles (id, full_name, email, role)
select pg_temp.uid('bulk-student-' || n), 'Bulk Student ' || lpad(n::text, 3, '0'),
  'bulk.student.' || lpad(n::text, 3, '0') || '@stargeneration.test', 'student'
from generate_series(1, 120) n;

insert into public.classes (id, name, description, tutor_id, capacity)
select pg_temp.uid('bulk-class-' || c), 'Bulk Class ' || lpad(c::text, 3, '0'),
  'Practice group number ' || c,
  case when c % 2 = 1 then 'b0000000-0000-4000-8000-000000000001'::uuid else 'b0000000-0000-4000-8000-000000000002'::uuid end,
  case when c = 60 then 2 else 150 end
from generate_series(1, 60) c;
insert into public.class_student_rates select pg_temp.uid('bulk-class-' || c), 150000 from generate_series(1, 60) c;
insert into public.class_tutor_rates select pg_temp.uid('bulk-class-' || c), 100000 from generate_series(1, 60) c;

-- 4,800 enrollments with one invoice each: paid, waiting for payment, or cancelled
insert into public.enrollments (id, class_id, student_id, status, activated_at)
select pg_temp.uid('bulk-enrollment-' || n || '-' || c), pg_temp.uid('bulk-class-' || c), pg_temp.uid('bulk-student-' || n),
  case (n + c) % 3 when 1 then 'pending_payment' when 2 then 'cancelled' else 'active' end::public.enrollment_status,
  case (n + c) % 3 when 1 then null when 2 then null else now() - interval '60 days' end
from generate_series(1, 120) n, generate_series(1, 40) c;

insert into public.invoices (enrollment_id, hours, student_rate, status, issued_at, paid_at, paid_by, voided_at, voided_by, void_reason)
select pg_temp.uid('bulk-enrollment-' || n || '-' || c), 1 + n % 12, 150000,
  case (n + c) % 3 when 1 then 'unpaid' when 2 then 'void' else 'paid' end::public.invoice_status,
  now() - make_interval(mins => n * 40 + c),
  case (n + c) % 3 when 0 then now() - make_interval(mins => n * 40 + c - 5) end,
  case (n + c) % 3 when 0 then 'a0000000-0000-4000-8000-000000000001'::uuid end,
  case (n + c) % 3 when 2 then now() - make_interval(mins => n * 40 + c - 5) end,
  case (n + c) % 3 when 2 then 'a0000000-0000-4000-8000-000000000001'::uuid end,
  case (n + c) % 3 when 2 then 'Student changed their mind' end
from generate_series(1, 120) n, generate_series(1, 40) c;

-- Alya has many old cancelled invoices
insert into public.invoices (enrollment_id, hours, student_rate, status, issued_at, voided_at, voided_by, void_reason)
select e.id, 1 + g % 5, 150000, 'void', now() - make_interval(days => 30 + g), now() - make_interval(days => 29 + g),
  'c0000000-0000-4000-8000-000000000001', 'Test cancelled invoice ' || g
from public.enrollments e, generate_series(1, 25) g
where e.student_id = 'c0000000-0000-4000-8000-000000000001' and e.status = 'active' limit 25;

-- Bulk Class 001 (Budi): 40 past and 35 upcoming lessons at 06:00 WIB
insert into public.lessons (id, class_id, tutor_id, start_at, end_at, status)
select pg_temp.uid('bulk-lesson-' || n), pg_temp.uid('bulk-class-1'), 'b0000000-0000-4000-8000-000000000001',
  ((date_trunc('day', now() at time zone 'Asia/Jakarta') + make_interval(days => (n - 40) * 2) + interval '6 hours') at time zone 'Asia/Jakarta'),
  ((date_trunc('day', now() at time zone 'Asia/Jakarta') + make_interval(days => (n - 40) * 2) + interval '7 hours') at time zone 'Asia/Jakarta'),
  'scheduled'
from generate_series(1, 75) n;
insert into public.lesson_rates select id, 100000 from public.lessons where id in (select pg_temp.uid('bulk-lesson-' || n) from generate_series(1, 75) n);

-- Approved logbooks and earnings for the past months of Bulk Class 001
insert into public.logbooks (id, class_id, month, status, reviewed_at, reviewed_by)
select pg_temp.uid('bulk-logbook-1-' || m), pg_temp.uid('bulk-class-1'), m, 'approved', now(), 'a0000000-0000-4000-8000-000000000001'
from (select distinct private.wib_month(start_at) as m from public.lessons
      where class_id = pg_temp.uid('bulk-class-1') and end_at < now()) months
where m < private.wib_month(now());
insert into public.earnings (lesson_id, logbook_id, tutor_id, class_id, class_name, lesson_start, minutes, tutor_rate, amount)
select l.id, lb.id, l.tutor_id, l.class_id, 'Bulk Class 001', l.start_at, 60, 100000, 100000
from public.lessons l
join public.logbooks lb on lb.class_id = l.class_id and lb.month = private.wib_month(l.start_at)
where l.class_id = pg_temp.uid('bulk-class-1') and lb.status = 'approved' and l.end_at < now();

-- Logbooks in every status for classes 2 to 40, for the last two months
insert into public.logbooks (class_id, month, status, review_note, submitted_at, reviewed_at, reviewed_by)
select pg_temp.uid('bulk-class-' || c), (private.wib_month(now()) - make_interval(months => m))::date,
  case (c + m) % 4 when 0 then 'draft' when 1 then 'submitted' when 2 then 'changes_requested' else 'approved' end::public.logbook_status,
  case (c + m) % 4 when 2 then 'Please add more detail' end,
  case when (c + m) % 4 <> 0 then now() end,
  case when (c + m) % 4 = 3 then now() end,
  case when (c + m) % 4 = 3 then 'a0000000-0000-4000-8000-000000000001'::uuid end
from generate_series(2, 40) c, generate_series(1, 2) m;

select 'classes', count(*) from public.classes
union all select 'invoices', count(*) from public.invoices
union all select 'enrollments', count(*) from public.enrollments
union all select 'logbooks', count(*) from public.logbooks;
