begin;
select plan(17);

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

-- A Monday two weeks ahead (WIB), so every date used below is in the future.
select (date_trunc('week', now() at time zone 'Asia/Jakarta') + interval '14 days')::date as monday \gset

select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');

select is(
  public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', :'monday'::date, :'monday'::date + 13, array[1, 3], '16:00', '17:30'),
  4, 'Monday and Wednesday for two weeks creates four lessons');
select is((select count(distinct series_id) from public.lessons where series_id is not null), 1::bigint, 'the lessons share one series');
select is((select count(*) from public.lesson_rates), 4::bigint, 'every lesson snapshots the tutor rate');
select is(
  (select min(start_at) from public.lessons),
  (:'monday'::date + time '16:00') at time zone 'Asia/Jakarta',
  'times are entered in WIB');

-- All or nothing
select public.schedule_lesson(
  'd0000000-0000-4000-8000-000000000001',
  ((:'monday'::date + 8) + time '16:30') at time zone 'Asia/Jakarta',
  ((:'monday'::date + 8) + time '17:00') at time zone 'Asia/Jakarta') as clash \gset
select throws_ok(
  format($$select public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', %L, %L, array[2], '16:00', '17:30')$$, :'monday'::date, :'monday'::date + 13),
  'P0001',
  format('You already have a lesson that overlaps on %s', to_char(:'monday'::date + 8, 'FMDD Mon YYYY')),
  'a clash names the date and rejects the whole series');
select is((select count(*) from public.lessons), 5::bigint, 'a rejected series creates nothing');

-- Validation
select throws_ok(
  format($$select public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', %L, %L, array[]::integer[], '16:00', '17:30')$$, :'monday'::date, :'monday'::date + 7),
  'P0001', 'Choose at least one day of the week', 'at least one weekday is required');
select throws_ok(
  format($$select public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', %L, %L, array[1], '16:00', '17:30')$$, :'monday'::date, :'monday'::date + 200),
  'P0001', 'A series can cover at most 6 months', 'a series is limited to six months');
select throws_ok(
  format($$select public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', %L, %L, array[2], '16:00', '17:30')$$, :'monday'::date, :'monday'::date),
  'P0001', 'No lessons fall on the chosen days between those dates', 'the dates must contain a chosen weekday');
select throws_like(
  format($$select public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', %L, %L, array[1, 2, 3, 4, 5, 6, 7], '16:00', '17:30')$$, (now() at time zone 'Asia/Jakarta')::date - 1, (now() at time zone 'Asia/Jakarta')::date + 2),
  '%: Lessons must be scheduled in the future', 'a past lesson in the series is refused with its date');
select throws_like(
  format($$select public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', %L, %L, array[4], '17:30', '16:00')$$, :'monday'::date, :'monday'::date + 7),
  '%: The lesson must end after it starts', 'the usual lesson rules apply to every lesson');

select pg_temp.act_as('b0000000-0000-4000-8000-000000000002');
select throws_ok(
  format($$select public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', %L, %L, array[4], '16:00', '17:30')$$, :'monday'::date, :'monday'::date + 7),
  'P0001', 'You can only schedule lessons for your own classes', 'only the class tutor can create a series');

select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select throws_ok(
  format($$select public.schedule_lessons_weekly('d0000000-0000-4000-8000-000000000001', %L, %L, array[4], '16:00', '17:30')$$, :'monday'::date, :'monday'::date + 7),
  '42501', null, 'a student cannot create a series');

-- Cancelling a series
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select id as second_lesson from public.lessons where series_id is not null order by start_at offset 1 limit 1 \gset
select is(public.cancel_lesson_series(:'second_lesson'::uuid, 'Class ended'), 3, 'cancelling from the second lesson cancels it and the next two');
select is(
  (select count(*) from public.lessons where series_id is not null and status = 'scheduled'),
  1::bigint, 'earlier lessons of the series stay scheduled');
select throws_ok(
  format($$select public.cancel_lesson_series(%L)$$, :'second_lesson'::uuid),
  'P0001', 'There are no upcoming lessons left to cancel in this series', 'a finished cancellation cannot be repeated');
select throws_ok(
  format($$select public.cancel_lesson_series(%L)$$, :'clash'::uuid),
  'P0001', 'This lesson is not part of a series', 'a single lesson has no series to cancel');

select * from finish();
rollback;
