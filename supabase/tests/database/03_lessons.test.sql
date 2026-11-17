begin;
select plan(19);

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

-- Scheduling rules
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', now() + interval '2 days', now() + interval '2 days 90 minutes') as first_lesson \gset
select is(
  (select tutor_rate from public.lesson_rates where lesson_id = :'first_lesson'),
  100000, 'the tutor rate is snapshotted onto the lesson');

select throws_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', now() + interval '3 days', now() + interval '3 days')$$,
  'P0001', 'The lesson must end after it starts', 'a lesson must end after it starts');
select throws_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', now() + interval '3 days', now() + interval '3 days 9 hours')$$,
  'P0001', 'A lesson cannot be longer than 8 hours', 'a lesson has a maximum length');
select throws_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', now() - interval '1 hour', now() + interval '1 hour')$$,
  'P0001', 'Lessons must be scheduled in the future', 'a lesson cannot start in the past');
select throws_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', now() + interval '2 days 30 minutes', now() + interval '2 days 2 hours')$$,
  'P0001', 'You already have a lesson that overlaps with this time', 'a tutor cannot have overlapping lessons');
select lives_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', date_trunc('minute', now() + interval '2 days 90 minutes'), date_trunc('minute', now() + interval '2 days 150 minutes'))$$,
  'back-to-back lessons are allowed');

select pg_temp.act_as('b0000000-0000-4000-8000-000000000002');
select throws_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', now() + interval '5 days', now() + interval '5 days 1 hour')$$,
  'P0001', 'You can only schedule lessons for your own classes', 'a tutor can only schedule for their own classes');

select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', now() + interval '5 days', now() + interval '5 days 1 hour')$$,
  '42501', null, 'a student cannot schedule lessons');

reset role;
select throws_ok(
  $$insert into public.lessons (class_id, tutor_id, start_at, end_at) values
      ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', date_trunc('minute', now()) + interval '2 days 10 minutes', date_trunc('minute', now()) + interval '2 days 20 minutes')$$,
  '23P01', null, 'the database itself rejects overlapping lessons');

-- Cancelling
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select lives_ok(format($$select public.cancel_lesson(%L, 'Tutor is sick')$$, :'first_lesson'), 'a tutor can cancel an upcoming lesson');
select throws_ok(
  format($$select public.cancel_lesson(%L)$$, :'first_lesson'),
  'P0001', 'This lesson is already cancelled', 'a lesson cannot be cancelled twice');
select lives_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', now() + interval '2 days', now() + interval '2 days 60 minutes')$$,
  'a cancelled lesson frees the time slot');

reset role;
insert into public.lessons (id, class_id, tutor_id, start_at, end_at) values
  ('10000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   date_trunc('minute', now()) - interval '3 hours', date_trunc('minute', now()) - interval '1 hour');

select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.cancel_lesson('10000000-0000-4000-8000-000000000009')$$,
  'P0001', 'This lesson has already ended. Ask an admin if it did not take place', 'a tutor cannot cancel a lesson that already ended');
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select lives_ok($$select public.cancel_lesson('10000000-0000-4000-8000-000000000009', 'Did not take place')$$, 'an admin can cancel a lesson that did not take place');

-- A submitted month is closed for new lessons
reset role;
insert into public.logbooks (class_id, month, status, submitted_at, submitted_by)
values ('d0000000-0000-4000-8000-000000000001', private.wib_month(now() + interval '60 days'), 'submitted', now(), 'b0000000-0000-4000-8000-000000000001');
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.schedule_lesson('d0000000-0000-4000-8000-000000000001', date_trunc('minute', now() + interval '60 days'), date_trunc('minute', now() + interval '60 days 1 hour'))$$,
  'P0001', 'The logbook for that month has already been submitted', 'no lessons can be added to a month whose logbook was submitted');

-- Changing the tutor of a class
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select lives_ok(
  $$select public.update_class('d0000000-0000-4000-8000-000000000001', 'English Conversation - Group A', null, 'b0000000-0000-4000-8000-000000000002', 2, 150000, 100000)$$,
  'an admin can assign another tutor');
select is(
  (select count(*) from public.lessons where class_id = 'd0000000-0000-4000-8000-000000000001' and status = 'scheduled' and start_at > now() and tutor_id = 'b0000000-0000-4000-8000-000000000002'),
  (select count(*) from public.lessons where class_id = 'd0000000-0000-4000-8000-000000000001' and status = 'scheduled' and start_at > now()),
  'upcoming lessons move to the new tutor');
select is(
  (select count(*) from public.lessons where id = '10000000-0000-4000-8000-000000000009' and tutor_id = 'b0000000-0000-4000-8000-000000000001'),
  1::bigint, 'past lessons stay with the previous tutor');

reset role;
insert into public.classes (id, name, tutor_id, capacity) values
  ('d0000000-0000-4000-8000-000000000002', 'Math', 'b0000000-0000-4000-8000-000000000001', 2);
insert into public.class_student_rates (class_id, student_rate) values ('d0000000-0000-4000-8000-000000000002', 100000);
insert into public.class_tutor_rates (class_id, tutor_rate) values ('d0000000-0000-4000-8000-000000000002', 80000);
insert into public.lessons (class_id, tutor_id, start_at, end_at)
select 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', start_at, end_at
from public.lessons
where class_id = 'd0000000-0000-4000-8000-000000000001' and status = 'scheduled' and start_at > now()
limit 1;
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.update_class('d0000000-0000-4000-8000-000000000002', 'Math', null, 'b0000000-0000-4000-8000-000000000002', 2, 100000, 80000)$$,
  'P0001', 'The new tutor already has a lesson at the same time as an upcoming lesson of this class', 'a tutor change is refused when it creates a schedule conflict');

select * from finish();
rollback;
