begin;
select plan(28);

create function pg_temp.act_as(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

set local session_replication_role = replica;
delete from public.earnings;
delete from public.logbook_entries;
delete from public.logbooks;
delete from public.lesson_rates;
delete from public.lessons;
delete from public.invoices;
delete from public.enrollments;
set local session_replication_role = origin;

-- Fixtures: Alya is enrolled and paid. Last month has two ended lessons and a cancelled one; one
-- lesson is upcoming. Two earnings from an approved logbook of the month before.
insert into public.enrollments (id, class_id, student_id, status, activated_at) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'active', now() - interval '120 days');
insert into public.invoices (enrollment_id, hours, student_rate, status, paid_at, paid_by) values
  ('e0000000-0000-4000-8000-000000000001', 12, 150000, 'paid', now() - interval '120 days', 'a0000000-0000-4000-8000-000000000001');

insert into public.lessons (id, class_id, tutor_id, start_at, end_at, status, cancelled_at) values
  ('10000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') + interval '4 days 16 hours') at time zone 'Asia/Jakarta',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') + interval '4 days 17 hours 30 minutes') at time zone 'Asia/Jakarta', 'scheduled', null),
  ('10000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') + interval '11 days 16 hours') at time zone 'Asia/Jakarta',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') + interval '11 days 17 hours 30 minutes') at time zone 'Asia/Jakarta', 'scheduled', null),
  ('10000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') + interval '18 days 16 hours') at time zone 'Asia/Jakarta',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') + interval '18 days 17 hours') at time zone 'Asia/Jakarta', 'cancelled', now() - interval '30 days'),
  ('10000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   date_trunc('minute', now()) + interval '3 days', date_trunc('minute', now()) + interval '3 days 90 minutes', 'scheduled', null);
insert into public.lesson_rates (lesson_id, tutor_rate) select id, 100000 from public.lessons;

insert into public.logbooks (id, class_id, month, status, reviewed_at, reviewed_by) values
  ('20000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   (date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '2 months')::date, 'approved', now(), 'a0000000-0000-4000-8000-000000000001');
insert into public.earnings (lesson_id, logbook_id, tutor_id, class_id, class_name, lesson_start, minutes, tutor_rate, amount)
select id, '20000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
       'English Conversation - Group A', start_at - interval '1 month', 90, 100000, 150000
from public.lessons where id in ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');

-- Classes
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select is((select seats_taken from public.class_list), 1, 'class list counts taken seats');
select is((select seats_left from public.class_list), 1, 'and seats left');
select is((select student_rate from public.class_list), 150000, 'an admin sees the student rate');
select ok((select next_lesson_start is not null from public.class_list), 'and the next lesson');
select is((select seats_left from public.class_catalog), 1, 'the student catalogue shows seats left');

select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select is((select tutor_rate from public.class_list), 100000, 'a tutor sees their own rate in the class list');
select is((select student_rate from public.class_list), null, 'but not the student rate');
select pg_temp.act_as('b0000000-0000-4000-8000-000000000002');
select is((select count(*) from public.class_list), 0::bigint, 'a tutor does not see another tutor''s classes');

-- Invoices, students, logbooks
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select is((select student_name from public.invoice_list), 'Alya Putri', 'invoice list shows the student');
select is((select approved_by from public.invoice_list), 'Rina Admin', 'and who approved it');
select is((select count(*) from public.student_enrollment_list), 3::bigint, 'student list has a row for each student here, enrolled or not');
select is((select count(*) from public.student_enrollment_list where enrollment_id is null), 2::bigint, 'two of them have no enrollment');
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.invoice_list), 0::bigint, 'a tutor sees no invoices through the list');

-- Logbook progress
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select is((select lessons_total from public.logbook_progress where month = (date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month')::date), 2,
  'cancelled lessons do not count toward the logbook');
select is((select entries_missing from public.logbook_progress where month = (date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month')::date), 2,
  'ended lessons without an entry are missing');
select is((select lessons_unfinished from public.logbook_progress where month = (date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month')::date), 0,
  'none of last month''s lessons is still to come');

select public.save_logbook_entry('10000000-0000-4000-8000-000000000001', 'Topic', 'Activities', 'Observation', 'Recommendation');
select is((select entries_written from public.logbook_progress where month = (date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month')::date), 1,
  'writing an entry moves one lesson from missing to written');
select is((select entries_missing from public.logbook_progress where month = (date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month')::date), 1, 'and leaves one missing');

-- Earnings and the overview numbers
select is((select sum(total) from public.earning_months), 300000::numeric, 'earnings add up per month');
select is((select total_earned from public.tutor_stats), 300000::bigint, 'tutor overview totals the earnings');
select is((select entries_to_write from public.tutor_stats), 1, 'and the entries still to write');

select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select is((select unpaid_invoices from public.admin_stats), 0, 'admin overview counts unpaid invoices');
select is((select active_students from public.admin_stats), 1, 'and active students');


-- Cancelling an invoice: the list says up front whether it is possible
reset role;
insert into public.enrollments (id, class_id, student_id, status, activated_at) values
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'active', now());
insert into public.invoices (id, enrollment_id, hours, student_rate, status, paid_at, paid_by) values
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 6, 150000, 'paid', now(), 'a0000000-0000-4000-8000-000000000001');
insert into public.invoices (id, enrollment_id, hours, student_rate) values
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 3, 150000);

select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select is((select can_cancel from public.invoice_list where student_name = 'Alya Putri'), false,
  'a paid invoice whose hours were used cannot be cancelled');
select is((select balance_minutes from public.invoice_list where student_name = 'Alya Putri'), 540,
  'and the list says how many minutes are left');
select is((select can_cancel from public.invoice_list where id = 'f0000000-0000-4000-8000-000000000002'), true,
  'a paid invoice with all its hours left can be cancelled');
select is((select can_cancel from public.invoice_list where id = 'f0000000-0000-4000-8000-000000000003'), true,
  'an unpaid invoice can always be cancelled');

reset role;
set local role anon;
select throws_ok($$select * from public.class_list$$, '42501', null, 'anonymous visitors cannot read the lists');

select * from finish();
rollback;
