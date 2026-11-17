begin;
select plan(30);

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

select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select public.enroll('d0000000-0000-4000-8000-000000000001', 12) as alya_invoice \gset
select pg_temp.act_as('c0000000-0000-4000-8000-000000000002');
select public.enroll('d0000000-0000-4000-8000-000000000001', 6) as dimas_invoice \gset

select format('c0000000-0000-4000-8000-000000000001/%s/receipt.png', :'alya_invoice') as alya_path \gset
select format('c0000000-0000-4000-8000-000000000001/%s/receipt-2.png', :'alya_invoice') as alya_path_2 \gset
select format('c0000000-0000-4000-8000-000000000002/%s/receipt.png', :'dimas_invoice') as dimas_path \gset
select format('c0000000-0000-4000-8000-000000000001/%s/receipt.png', :'dimas_invoice') as mixed_path \gset

-- Uploading
select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, :'alya_path'),
  'a student can upload a proof for their own unpaid invoice');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, :'dimas_path'),
  '42501', null, 'a student cannot upload into another student''s folder');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, :'mixed_path'),
  '42501', null, 'a student cannot upload for an invoice that is not theirs');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('payment-proofs', 'c0000000-0000-4000-8000-000000000001/not-an-invoice/x.png')$$,
  '42501', null, 'the folder must be an invoice');

select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, 'b0000000-0000-4000-8000-000000000001/' || :'alya_invoice' || '/x.png'),
  '42501', null, 'a tutor cannot upload a proof');
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, 'a0000000-0000-4000-8000-000000000001/' || :'alya_invoice' || '/x.png'),
  '42501', null, 'an admin cannot upload a proof either');

-- Linking the file to the invoice
select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select is(public.attach_payment_proof(:'alya_invoice', :'alya_path'), null, 'attaching a first proof replaces nothing');
select is((select proof_path from public.invoices where id = :'alya_invoice'), :'alya_path', 'the invoice remembers the file');
select ok((select proof_uploaded_at is not null from public.invoices where id = :'alya_invoice'), 'and when it was uploaded');
select throws_ok(
  format($$select public.attach_payment_proof(%L, %L)$$, :'alya_invoice', :'dimas_path'),
  'P0001', 'That file does not belong to this invoice', 'a file from another folder cannot be attached');
select throws_ok(
  format($$select public.attach_payment_proof(%L, %L)$$, :'alya_invoice', replace(:'alya_path', 'receipt.png', 'missing.png')),
  'P0001', 'The file was not uploaded. Please try again', 'a file that was never uploaded cannot be attached');
select throws_ok(
  format($$select public.attach_payment_proof(%L, %L)$$, :'dimas_invoice', :'dimas_path'),
  'P0001', 'Invoice not found', 'a student cannot attach a proof to someone else''s invoice');

insert into storage.objects (bucket_id, name) values ('payment-proofs', :'alya_path_2');
select is(public.attach_payment_proof(:'alya_invoice', :'alya_path_2'), :'alya_path', 'replacing a proof returns the old file so it can be deleted');
select is((select proof_path from public.invoices where id = :'alya_invoice'), :'alya_path_2', 'the invoice points at the new file');

-- Who can see the files
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs' and name like '%/' || :'alya_invoice' || '/%'), 2::bigint, 'the owner sees their own files');
select pg_temp.act_as('c0000000-0000-4000-8000-000000000002');
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs' and name like '%/' || :'alya_invoice' || '/%'), 0::bigint, 'another student sees none of them');
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs' and name like '%/' || :'alya_invoice' || '/%'), 0::bigint, 'a tutor sees none of them');
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs' and name like '%/' || :'alya_invoice' || '/%'), 2::bigint, 'an admin sees all of them');
select throws_ok(
  format($$select public.attach_payment_proof(%L, %L)$$, :'alya_invoice', :'alya_path'),
  '42501', null, 'an admin cannot attach a proof');

select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select lives_ok(
  format($$delete from storage.objects where bucket_id = 'payment-proofs' and name = %L$$, :'alya_path'),
  'a student can delete the file they replaced');
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs' and name like '%/' || :'alya_invoice' || '/%'), 1::bigint, 'and only the new file is left');

-- The proof is optional: an admin approves an invoice that has none
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');
select lives_ok(format($$select public.mark_invoice_paid(%L)$$, :'dimas_invoice'), 'an invoice without a proof can be approved');
select is((select status::text from public.invoices where id = :'dimas_invoice'), 'paid', 'and it becomes paid');

-- Approved by
select is((select approved_by from public.invoice_approvals where invoice_id = :'dimas_invoice'), 'Rina Admin', 'an admin sees who approved the payment');
select pg_temp.act_as('c0000000-0000-4000-8000-000000000002');
select is((select approved_by from public.invoice_approvals where invoice_id = :'dimas_invoice'), 'Rina Admin', 'the student sees who approved their payment');
select pg_temp.act_as('c0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.invoice_approvals), 0::bigint, 'another student sees no approvals that are not theirs');
select pg_temp.act_as('b0000000-0000-4000-8000-000000000001');
select is((select count(*) from public.invoice_approvals), 0::bigint, 'a tutor sees no approvals');

-- Once paid, proofs are closed
select pg_temp.act_as('c0000000-0000-4000-8000-000000000002');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, :'dimas_path'),
  '42501', null, 'no upload once the invoice is paid');
select throws_ok(
  format($$select public.attach_payment_proof(%L, %L)$$, :'dimas_invoice', :'dimas_path'),
  'P0001', 'A proof can only be added while the invoice is waiting for payment', 'no proof can be attached once the invoice is paid');

reset role;
select throws_ok(
  format($$update public.invoices set proof_path = 'x' where id = %L$$, :'dimas_invoice'),
  '23514', null, 'a proof path always comes with its upload time');

select * from finish();
rollback;
