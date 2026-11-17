create function public.enroll(p_class_id uuid, p_hours integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid := (select auth.uid());
  v_class public.classes;
  v_seats integer;
  v_rate integer;
  v_enrollment_id uuid;
  v_invoice_id uuid;
begin
  perform private.require_role('student');

  select * into v_class from public.classes where id = p_class_id for update;
  if not found then
    raise exception 'Class not found';
  end if;

  if exists (
    select 1 from public.enrollments
    where class_id = p_class_id and student_id = v_student and status <> 'cancelled'
  ) then
    raise exception 'You are already enrolled in this class';
  end if;

  select count(*) into v_seats
  from public.enrollments
  where class_id = p_class_id and status <> 'cancelled';

  if v_seats >= v_class.capacity then
    raise exception 'This class is full';
  end if;

  select student_rate into v_rate from public.class_student_rates where class_id = p_class_id;

  insert into public.enrollments (class_id, student_id)
  values (p_class_id, v_student)
  returning id into v_enrollment_id;

  insert into public.invoices (enrollment_id, hours, student_rate)
  values (v_enrollment_id, p_hours, v_rate)
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

create function public.request_topup(p_enrollment_id uuid, p_hours integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments;
  v_rate integer;
  v_invoice_id uuid;
begin
  perform private.require_role('student');

  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id and student_id = (select auth.uid())
  for update;

  if not found or v_enrollment.status <> 'active' then
    raise exception 'You can only add hours to a class you have paid for';
  end if;

  if exists (
    select 1 from public.invoices where enrollment_id = p_enrollment_id and status = 'unpaid'
  ) then
    raise exception 'You already have an unpaid invoice for this class';
  end if;

  select student_rate into v_rate
  from public.class_student_rates
  where class_id = v_enrollment.class_id;

  insert into public.invoices (enrollment_id, hours, student_rate)
  values (p_enrollment_id, p_hours, v_rate)
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

-- Payment is simulated: the admin confirms it, as they do today for bank transfers.
create function public.mark_invoice_paid(p_invoice_id uuid, p_reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices;
begin
  perform private.require_role('admin');

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found';
  end if;
  if v_invoice.status = 'paid' then
    raise exception 'This invoice is already paid';
  end if;
  if v_invoice.status = 'void' then
    raise exception 'This invoice was cancelled and cannot be paid';
  end if;

  update public.invoices
  set status = 'paid',
      paid_at = now(),
      paid_by = (select auth.uid()),
      payment_reference = nullif(trim(p_reference), '')
  where id = p_invoice_id;

  update public.enrollments
  set status = 'active', activated_at = now()
  where id = v_invoice.enrollment_id and status = 'pending_payment';
end;
$$;

-- Students may cancel their own unpaid invoice. Only an admin can undo a payment, and only
-- while none of the invoice's hours have been used.
create function public.void_invoice(p_invoice_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := private.user_role();
  v_invoice public.invoices;
  v_student_id uuid;
  v_reason text := nullif(trim(p_reason), '');
begin
  perform private.require_role('admin', 'student');

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found';
  end if;

  select student_id into v_student_id from public.enrollments where id = v_invoice.enrollment_id;
  if v_role = 'student' and v_student_id <> (select auth.uid()) then
    raise exception 'Invoice not found';
  end if;
  if v_invoice.status = 'void' then
    raise exception 'This invoice is already cancelled';
  end if;

  if v_invoice.status = 'paid' then
    if v_role <> 'admin' then
      raise exception 'Only an admin can cancel a paid invoice';
    end if;
    if v_reason is null then
      raise exception 'Please give a reason for cancelling a paid invoice';
    end if;
    if private.enrollment_balance(v_invoice.enrollment_id) - v_invoice.hours * 60 < 0 then
      raise exception 'This invoice cannot be cancelled because its hours have already been used';
    end if;
  end if;

  update public.invoices
  set status = 'void',
      voided_at = now(),
      voided_by = (select auth.uid()),
      void_reason = coalesce(v_reason, 'Cancelled before payment')
  where id = p_invoice_id;

  if not exists (
    select 1 from public.invoices
    where enrollment_id = v_invoice.enrollment_id and status = 'paid'
  ) then
    update public.enrollments
    set status = 'cancelled'
    where id = v_invoice.enrollment_id and status <> 'cancelled';
  end if;
end;
$$;

revoke all on function public.enroll(uuid, integer) from public;
revoke all on function public.request_topup(uuid, integer) from public;
revoke all on function public.mark_invoice_paid(uuid, text) from public;
revoke all on function public.void_invoice(uuid, text) from public;
grant execute on function public.enroll(uuid, integer) to authenticated;
grant execute on function public.request_topup(uuid, integer) to authenticated;
grant execute on function public.mark_invoice_paid(uuid, text) to authenticated;
grant execute on function public.void_invoice(uuid, text) to authenticated;
