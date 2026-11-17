-- Whether an invoice can still be cancelled, with the numbers behind it, so the admin list can
-- disable the button and explain why instead of failing after the click. These are the same
-- rules as void_invoice(): a paid invoice can only be cancelled while the student still has at
-- least its hours left.
create or replace view public.invoice_list with (security_invoker = true) as
select
  i.id,
  i.status,
  i.hours,
  i.student_rate,
  i.amount,
  i.payment_reference,
  i.issued_at,
  i.paid_at,
  i.voided_at,
  i.void_reason,
  i.proof_uploaded_at,
  e.id as enrollment_id,
  e.student_id,
  s.full_name as student_name,
  s.email as student_email,
  e.class_id,
  c.name as class_name,
  a.full_name as approved_by,
  case
    when i.status = 'unpaid' then true
    when i.status = 'paid' then private.enrollment_balance(i.enrollment_id) >= i.hours * 60
    else false
  end as can_cancel,
  case when i.status = 'paid' then private.enrollment_balance(i.enrollment_id) end as balance_minutes
from public.invoices i
join public.enrollments e on e.id = i.enrollment_id
join public.profiles s on s.id = e.student_id
join public.classes c on c.id = e.class_id
left join public.profiles a on a.id = i.paid_by;
