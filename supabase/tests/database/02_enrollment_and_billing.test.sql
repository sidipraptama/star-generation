begin;
select plan(25);

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

-- Enrollment and capacity
select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select public.enroll('d0000000-0000-4000-8000-000000000001', 12) as alya_invoice \gset
select is((select amount from public.invoices where id = :'alya_invoice'), 1800000, 'invoice amount is hours x the class student rate');
select is((select status::text from public.enrollments), 'pending_payment', 'enrollment waits for payment');
select throws_ok(
  $$select public.enroll('d0000000-0000-4000-8000-000000000001', 6)$$,
  'P0001', 'You are already enrolled in this class', 'a student cannot enroll twice');

select pg_temp.act_as('c0000000-0000-4000-8000-000000000002');
select public.enroll('d0000000-0000-4000-8000-000000000001', 6) as dimas_invoice \gset
select pg_temp.act_as('c0000000-0000-4000-8000-000000000003');
select throws_ok(
  $$select public.enroll('d0000000-0000-4000-8000-000000000001', 6)$$,
  'P0001', 'This class is full', 'a full class refuses new students');

select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.enroll('d0000000-0000-4000-8000-000000000001', 6)$$,
  '42501', 'You are not allowed to do this', 'only students can enroll');
select throws_ok(
  $$select public.update_class('d0000000-0000-4000-8000-000000000001', 'English Conversation - Group A', null, 'b0000000-0000-4000-8000-000000000001', 1, 150000, 100000)$$,
  'P0001', 'Capacity cannot be lower than the 2 students already enrolled', 'capacity cannot drop below the enrolled students');

-- Marking invoices as paid
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select throws_ok(
  format($$select public.mark_invoice_paid(%L)$$, :'alya_invoice'),
  '42501', null, 'a tutor cannot mark an invoice as paid');
select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select throws_ok(
  format($$select public.mark_invoice_paid(%L)$$, :'alya_invoice'),
  '42501', null, 'a student cannot mark their own invoice as paid');

select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select lives_ok(format($$select public.mark_invoice_paid(%L, 'BCA transfer')$$, :'alya_invoice'), 'an admin can mark an invoice as paid');
select is((select status::text from public.enrollments where student_id = 'c0000000-0000-4000-8000-000000000001'), 'active', 'paying activates the enrollment');
select throws_ok(
  format($$select public.mark_invoice_paid(%L)$$, :'alya_invoice'),
  'P0001', 'This invoice is already paid', 'an invoice cannot be paid twice');

-- Rate snapshots
select lives_ok(
  $$select public.update_class('d0000000-0000-4000-8000-000000000001', 'English Conversation - Group A', null, 'b0000000-0000-4000-8000-000000000001', 2, 200000, 100000)$$,
  'an admin can change the student rate');
select is((select amount from public.invoices where id = :'alya_invoice'), 1800000, 'a rate change does not touch an existing invoice');

select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select public.request_topup((select id from public.enrollments), 6) as topup_invoice \gset
select is((select amount from public.invoices where id = :'topup_invoice'), 1200000, 'a new invoice uses the new rate');
select throws_ok(
  $$select public.request_topup((select id from public.enrollments), 6)$$,
  'P0001', 'You already have an unpaid invoice for this class', 'only one unpaid invoice per enrollment');

-- Cancelling invoices
select throws_ok(
  format($$select public.void_invoice(%L)$$, :'dimas_invoice'),
  'P0001', 'Invoice not found', 'a student cannot cancel someone else''s invoice');
select throws_ok(
  format($$select public.void_invoice(%L)$$, :'alya_invoice'),
  'P0001', 'Only an admin can cancel a paid invoice', 'a student cannot undo a payment');
select lives_ok(format($$select public.void_invoice(%L)$$, :'topup_invoice'), 'a student can cancel their own unpaid invoice');
select is((select status::text from public.enrollments), 'active', 'cancelling a top-up keeps the class');

select pg_temp.act_as('c0000000-0000-4000-8000-000000000002');
select lives_ok(format($$select public.void_invoice(%L)$$, :'dimas_invoice'), 'cancelling the only unpaid invoice works');
select is((select status::text from public.enrollments), 'cancelled', 'and releases the seat');

-- Hours already used protect a payment
reset role;
update public.enrollments set activated_at = now() - interval '10 days'
where student_id = 'c0000000-0000-4000-8000-000000000001';
insert into public.lessons (class_id, tutor_id, start_at, end_at, status, cancelled_at) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', date_trunc('minute', now()) - interval '3 hours', date_trunc('minute', now()) - interval '1 hour 30 minutes', 'scheduled', null),
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', date_trunc('minute', now()) - interval '5 hours', date_trunc('minute', now()) - interval '4 hours', 'cancelled', now() - interval '6 hours'),
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', date_trunc('minute', now()) - interval '20 days', date_trunc('minute', now()) - interval '20 days' + interval '1 hour', 'scheduled', null);

select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select is(
  (select balance_minutes from public.enrollment_balances
   where enrollment_id = (select id from public.enrollments where student_id = 'c0000000-0000-4000-8000-000000000001')),
  720 - 90,
  'the balance is purchased minutes minus lessons delivered since activation, ignoring cancelled ones');
select throws_ok(
  format($$select public.void_invoice(%L)$$, :'alya_invoice'),
  'P0001', 'Please give a reason for cancelling a paid invoice', 'undoing a payment needs a reason');
select throws_ok(
  format($$select public.void_invoice(%L, 'Mistake')$$, :'alya_invoice'),
  'P0001', 'This invoice cannot be cancelled because its hours have already been used', 'a payment cannot be undone once its hours were used');

select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.hour_ledger), 2::bigint, 'the ledger shows one purchase and one delivered lesson');

select * from finish();
rollback;
