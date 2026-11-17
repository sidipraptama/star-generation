begin;
select plan(24);

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

-- Fixtures: Alya is enrolled, last month has two 90 minute lessons and one cancelled lesson.
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

insert into public.lesson_rates (lesson_id, tutor_rate)
select id, 100000 from public.lessons;

-- Writing entries
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select public.save_logbook_entry('10000000-0000-4000-8000-000000000001', 'Greetings', 'Role-play', 'Good progress', 'Practise at home') as first_entry \gset
select is((select status::text from public.logbooks), 'draft', 'the first entry opens a draft logbook for that month');
select throws_ok(
  $$select public.save_logbook_entry('10000000-0000-4000-8000-000000000004', 'Future', 'x', 'x', 'x')$$,
  'P0001', 'You can write the entry once the lesson has ended', 'an entry needs a lesson that has ended');
select throws_ok(
  $$select public.save_logbook_entry('10000000-0000-4000-8000-000000000003', 'Cancelled', 'x', 'x', 'x')$$,
  'P0001', 'A cancelled lesson does not need a logbook entry', 'a cancelled lesson cannot have an entry');
select is(
  (select public.save_logbook_entry('10000000-0000-4000-8000-000000000001', 'Greetings v2', 'Role-play', 'Good progress', 'Practise at home')),
  :'first_entry'::uuid, 'saving again updates the same entry (one entry per lesson)');

select pg_temp.act_as('b0000000-0000-4000-8000-000000000002');
select throws_ok(
  $$select public.save_logbook_entry('10000000-0000-4000-8000-000000000002', 'Food', 'x', 'x', 'x')$$,
  'P0001', 'Lesson not found', 'another tutor cannot write entries for this class');

-- Submitting
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.submit_logbook((select id from public.logbooks))$$,
  'P0001', 'Add an entry for every lesson first (1 missing)', 'a logbook needs an entry for every lesson that took place');
select lives_ok(
  $$select public.save_logbook_entry('10000000-0000-4000-8000-000000000002', 'Food', 'Menu reading', 'Confident', 'Learn vocabulary')$$,
  'the missing entry can be added');
select lives_ok($$select public.submit_logbook((select id from public.logbooks))$$, 'a complete logbook can be submitted');
select throws_ok(
  $$select public.save_logbook_entry('10000000-0000-4000-8000-000000000002', 'Food v2', 'x', 'x', 'x')$$,
  'P0001', 'This logbook is locked and can no longer be changed', 'a submitted logbook cannot be edited');

select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.logbooks), 0::bigint, 'students cannot see a logbook that is not approved yet');
select is((select count(*) from public.logbook_entries), 0::bigint, 'nor its entries');

-- Review
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.approve_logbook((select id from public.logbooks))$$,
  '42501', null, 'a tutor cannot approve a logbook');

select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.request_logbook_changes((select id from public.logbooks), '  ')$$,
  'P0001', 'Please explain what needs to change', 'sending a logbook back needs a note');
select lives_ok(
  $$select public.request_logbook_changes((select id from public.logbooks), 'Please add more detail to the first entry')$$,
  'an admin can send a submitted logbook back');
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select lives_ok(
  $$select public.save_logbook_entry('10000000-0000-4000-8000-000000000001', 'Greetings', 'Role-play and games', 'Good progress', 'Practise at home')$$,
  'the tutor can edit after changes were requested');
select lives_ok($$select public.submit_logbook((select id from public.logbooks))$$, 'and submit again');

-- Earnings preview and approval
select throws_ok(
  $$select * from public.preview_logbook_earnings((select id from public.logbooks))$$,
  '42501', null, 'a tutor cannot preview earnings through the admin function');
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select is(
  (select sum(amount) from public.preview_logbook_earnings((select id from public.logbooks))),
  300000::bigint, 'the preview adds tutor rate x hours for each lesson');
select lives_ok($$select public.approve_logbook((select id from public.logbooks))$$, 'an admin can approve a submitted logbook');
select throws_ok(
  $$select public.approve_logbook((select id from public.logbooks))$$,
  'P0001', 'This logbook is already approved', 'approving again is refused');
select is((select sum(amount) from public.earnings), 300000::bigint, 'and earnings were only added once');

reset role;
select throws_ok(
  $$insert into public.earnings (lesson_id, logbook_id, tutor_id, class_id, class_name, lesson_start, minutes, tutor_rate, amount)
    select lesson_id, logbook_id, tutor_id, class_id, class_name, lesson_start, minutes, tutor_rate, amount from public.earnings limit 1$$,
  '23505', null, 'the database allows one earning per lesson');
select is(private.lesson_earning(100000, 50), 83333, 'a 50 minute lesson at Rp100,000 per hour rounds to Rp83,333');

-- Approved logbooks are read-only and visible to the paid student
select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.logbook_entries), 2::bigint, 'the student sees the entries once approved');

select * from finish();
rollback;
