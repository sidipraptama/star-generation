begin;
select plan(29);

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

-- Fixtures: Alya paid (12h), Dimas still waiting for payment, Citra not enrolled.
insert into public.enrollments (id, class_id, student_id, status, activated_at) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'active', now() - interval '120 days'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'pending_payment', null);

insert into public.invoices (id, enrollment_id, hours, student_rate, status, paid_at, paid_by) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 12, 150000, 'paid', now() - interval '120 days', 'a0000000-0000-4000-8000-000000000001');
insert into public.invoices (id, enrollment_id, hours, student_rate) values
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 12, 150000);

insert into public.lessons (id, class_id, tutor_id, start_at, end_at) values
  ('10000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '2 months') + interval '4 days 16 hours') at time zone 'Asia/Jakarta',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '2 months') + interval '4 days 17 hours 30 minutes') at time zone 'Asia/Jakarta'),
  ('10000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') + interval '4 days 16 hours') at time zone 'Asia/Jakarta',
   ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') + interval '4 days 17 hours 30 minutes') at time zone 'Asia/Jakarta'),
  ('10000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   date_trunc('minute', now()) + interval '1 day', date_trunc('minute', now()) + interval '1 day 90 minutes');

insert into public.lesson_rates (lesson_id, tutor_rate)
select id, 100000 from public.lessons;

insert into public.logbooks (id, class_id, month) values
  ('20000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', private.wib_month((select start_at from public.lessons where id = '10000000-0000-4000-8000-000000000001'))),
  ('20000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', private.wib_month((select start_at from public.lessons where id = '10000000-0000-4000-8000-000000000002')));

insert into public.logbook_entries (logbook_id, lesson_id, topic, activities, observation, recommendation) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Greetings', 'Role-play', 'Good progress', 'Practise at home'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Food', 'Menu reading', 'Confident', 'Learn vocabulary');

update public.logbooks
set status = 'approved', reviewed_at = now(), reviewed_by = 'a0000000-0000-4000-8000-000000000001'
where id = '20000000-0000-4000-8000-000000000001';

insert into public.earnings (lesson_id, logbook_id, tutor_id, class_id, class_name, lesson_start, minutes, tutor_rate, amount)
select l.id, '20000000-0000-4000-8000-000000000001', l.tutor_id, l.class_id, 'English Conversation - Group A', l.start_at, 90, 100000, 150000
from public.lessons l where l.id = '10000000-0000-4000-8000-000000000001';

-- Anonymous visitors and direct writes
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'anonymous visitors cannot read profiles');

select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$insert into public.classes (name, tutor_id, capacity) values ('Direct', 'b0000000-0000-4000-8000-000000000001', 1)$$,
  '42501', null, 'even an admin cannot write tables directly');

-- Student with a paid class
select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.classes), 1::bigint, 'a paid student sees the class');
select is((select count(*) from public.class_student_rates), 0::bigint, 'students cannot read the rate tables');
select is((select count(*) from public.invoices), 1::bigint, 'a student only sees their own invoices');
select is((select count(*) from public.logbooks), 1::bigint, 'students only see approved logbooks');
select is((select count(*) from public.logbook_entries), 1::bigint, 'and only the entries of approved logbooks');
select is((select count(*) from public.earnings), 0::bigint, 'students cannot see tutor earnings');
select is((select count(*) from public.lesson_rates), 0::bigint, 'students cannot see lesson rates');
select is((select count(*) from public.lessons), 3::bigint, 'a student with hours left sees past and upcoming lessons');

reset role;
update public.invoices set hours = 3 where id = 'f0000000-0000-4000-8000-000000000001';
select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.lessons), 2::bigint, 'with no hours left only past lessons stay visible');

-- Student who has not paid yet
select pg_temp.act_as('c0000000-0000-4000-8000-000000000002');
select is((select count(*) from public.classes), 0::bigint, 'an unpaid student does not see the class');
select is((select count(*) from public.lessons), 0::bigint, 'and no lessons');
select is((select count(*) from public.class_catalog), 1::bigint, 'but the class is listed in the catalog');
select is((select count(*) from public.invoices), 1::bigint, 'and they can see their own invoice');

-- Student who is not enrolled
select pg_temp.act_as('c0000000-0000-4000-8000-000000000003');
select is((select count(*) from public.classes), 0::bigint, 'a student without enrollment sees no classes');
select is((select count(*) from public.invoices), 0::bigint, 'and no invoices');

-- Assigned tutor
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.classes), 1::bigint, 'the assigned tutor sees the class');
select is((select count(*) from public.invoices), 0::bigint, 'tutors cannot see invoices');
select is((select count(*) from public.class_student_rates), 0::bigint, 'tutors cannot see student rates');
select is((select count(*) from public.class_catalog), 0::bigint, 'the catalog hides student rates from tutors');
select is((select count(*) from public.class_tutor_rates), 1::bigint, 'a tutor sees their own rate');
select is((select count(*) from public.logbooks), 2::bigint, 'a tutor sees logbooks in every status');
select is((select sum(amount) from public.earnings), 150000::bigint, 'a tutor sees their own earnings');
select is((select count(*) from public.profiles where role = 'student'), 1::bigint, 'a tutor only sees students with a paid enrollment in their class');

-- Another tutor
select pg_temp.act_as('b0000000-0000-4000-8000-000000000002');
select is((select count(*) from public.classes), 0::bigint, 'an unassigned tutor sees no classes');
select is((select count(*) from public.earnings), 0::bigint, 'and no earnings');

-- Admin
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.invoices), 2::bigint, 'an admin sees all invoices');
select is((select count(*) from public.class_student_rates), 1::bigint, 'and the student rates');

select * from finish();
rollback;
