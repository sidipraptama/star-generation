-- Optional proof of payment: a photo or screenshot of the transfer, kept in a private storage
-- bucket. It never blocks anything: an admin can approve an invoice with or without one.

alter table public.invoices
  add column proof_path text,
  add column proof_uploaded_at timestamptz,
  add constraint invoices_proof_is_complete check ((proof_path is null) = (proof_uploaded_at is null));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Files live at <student id>/<invoice id>/<file>. A student may only add files for their own
-- invoice that is still waiting for payment. Admins can read every proof.
create function private.is_my_unpaid_invoice(p_invoice_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.invoices i
    where i.id::text = p_invoice_id
      and i.status = 'unpaid'
      and private.owns_enrollment(i.enrollment_id)
  );
$$;

create policy payment_proofs_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (select private.user_role()) = 'student'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_my_unpaid_invoice((storage.foldername(name))[2])
  );

create policy payment_proofs_read_own on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy payment_proofs_read_admin on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and (select private.user_role()) = 'admin');

create policy payment_proofs_delete_own on storage.objects for delete to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_my_unpaid_invoice((storage.foldername(name))[2])
  );

-- Links an uploaded file to the invoice and returns the file it replaces, so the caller can delete it.
create function public.attach_payment_proof(p_invoice_id uuid, p_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices;
  v_previous text;
begin
  perform private.require_role('student');

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found or not private.owns_enrollment(v_invoice.enrollment_id) then
    raise exception 'Invoice not found';
  end if;
  if v_invoice.status <> 'unpaid' then
    raise exception 'A proof can only be added while the invoice is waiting for payment';
  end if;
  if p_path is null or p_path not like (select auth.uid())::text || '/' || p_invoice_id::text || '/%' then
    raise exception 'That file does not belong to this invoice';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = p_path) then
    raise exception 'The file was not uploaded. Please try again';
  end if;

  v_previous := v_invoice.proof_path;

  update public.invoices
  set proof_path = p_path, proof_uploaded_at = now()
  where id = p_invoice_id;

  return case when v_previous is distinct from p_path then v_previous end;
end;
$$;

-- Who approved a payment. Students cannot read admin profiles, so this exposes only the name, to
-- the admins and to the student who owns the invoice.
create view public.invoice_approvals as
select i.id as invoice_id, p.full_name as approved_by
from public.invoices i
join public.profiles p on p.id = i.paid_by
where private.user_role() = 'admin' or private.owns_enrollment(i.enrollment_id);

grant select on public.invoice_approvals to authenticated;
revoke all on function public.attach_payment_proof(uuid, text) from public;
grant execute on function public.attach_payment_proof(uuid, text) to authenticated;
