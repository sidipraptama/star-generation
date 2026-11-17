create function public.create_class(
  p_name text,
  p_description text,
  p_tutor_id uuid,
  p_capacity integer,
  p_student_rate integer,
  p_tutor_rate integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
begin
  perform private.require_role('admin');
  perform private.assert_tutor(p_tutor_id);

  insert into public.classes (name, description, tutor_id, capacity)
  values (trim(p_name), nullif(trim(p_description), ''), p_tutor_id, p_capacity)
  returning id into v_class_id;

  insert into public.class_student_rates (class_id, student_rate) values (v_class_id, p_student_rate);
  insert into public.class_tutor_rates (class_id, tutor_rate) values (v_class_id, p_tutor_rate);

  return v_class_id;
end;
$$;

-- Rates only affect future invoices and lessons (both snapshot the rate). Capacity cannot drop
-- below the seats already taken. A new tutor takes over upcoming lessons only.
create function public.update_class(
  p_class_id uuid,
  p_name text,
  p_description text,
  p_tutor_id uuid,
  p_capacity integer,
  p_student_rate integer,
  p_tutor_rate integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes;
  v_seats integer;
begin
  perform private.require_role('admin');
  perform private.assert_tutor(p_tutor_id);

  select * into v_class from public.classes where id = p_class_id for update;
  if not found then
    raise exception 'Class not found';
  end if;

  select count(*) into v_seats
  from public.enrollments
  where class_id = p_class_id and status <> 'cancelled';

  if p_capacity < v_seats then
    raise exception 'Capacity cannot be lower than the % students already enrolled', v_seats;
  end if;

  update public.classes
  set name = trim(p_name),
      description = nullif(trim(p_description), ''),
      tutor_id = p_tutor_id,
      capacity = p_capacity
  where id = p_class_id;

  update public.class_student_rates set student_rate = p_student_rate where class_id = p_class_id;
  update public.class_tutor_rates set tutor_rate = p_tutor_rate where class_id = p_class_id;

  if p_tutor_id <> v_class.tutor_id then
    update public.lessons
    set tutor_id = p_tutor_id
    where class_id = p_class_id and status = 'scheduled' and start_at > now();
  end if;
exception
  when exclusion_violation then
    raise exception 'The new tutor already has a lesson at the same time as an upcoming lesson of this class';
end;
$$;

revoke all on function public.create_class(text, text, uuid, integer, integer, integer) from public;
revoke all on function public.update_class(uuid, text, text, uuid, integer, integer, integer) from public;
grant execute on function public.create_class(text, text, uuid, integer, integer, integer) to authenticated;
grant execute on function public.update_class(uuid, text, text, uuid, integer, integer, integer) to authenticated;
