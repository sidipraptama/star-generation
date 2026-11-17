create function public.schedule_lesson(p_class_id uuid, p_start_at timestamptz, p_end_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tutor uuid := (select auth.uid());
  v_start timestamptz := date_trunc('minute', p_start_at);
  v_end timestamptz := date_trunc('minute', p_end_at);
  v_lesson_id uuid;
begin
  perform private.require_role('tutor');

  if not private.is_class_tutor(p_class_id) then
    raise exception 'You can only schedule lessons for your own classes';
  end if;
  if v_end <= v_start then
    raise exception 'The lesson must end after it starts';
  end if;
  if v_end > v_start + interval '8 hours' then
    raise exception 'A lesson cannot be longer than 8 hours';
  end if;
  if v_start <= now() then
    raise exception 'Lessons must be scheduled in the future';
  end if;
  if exists (
    select 1 from public.logbooks
    where class_id = p_class_id
      and month = private.wib_month(v_start)
      and status in ('submitted', 'approved')
  ) then
    raise exception 'The logbook for that month has already been submitted';
  end if;

  insert into public.lessons (class_id, tutor_id, start_at, end_at)
  values (p_class_id, v_tutor, v_start, v_end)
  returning id into v_lesson_id;

  insert into public.lesson_rates (lesson_id, tutor_rate)
  select v_lesson_id, tutor_rate from public.class_tutor_rates where class_id = p_class_id;

  return v_lesson_id;
exception
  when exclusion_violation then
    raise exception 'You already have a lesson that overlaps with this time';
end;
$$;

-- Tutors can cancel before a lesson ends; admins can also cancel one that did not take place,
-- as long as no logbook entry was written for it.
create function public.cancel_lesson(p_lesson_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := private.user_role();
  v_lesson public.lessons;
begin
  perform private.require_role('admin', 'tutor');

  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found or (v_role = 'tutor' and not private.is_class_tutor(v_lesson.class_id)) then
    raise exception 'Lesson not found';
  end if;
  if v_lesson.status = 'cancelled' then
    raise exception 'This lesson is already cancelled';
  end if;
  if v_role = 'tutor' and v_lesson.end_at <= now() then
    raise exception 'This lesson has already ended. Ask an admin if it did not take place';
  end if;
  if exists (select 1 from public.logbook_entries where lesson_id = p_lesson_id) then
    raise exception 'This lesson already has a logbook entry';
  end if;

  update public.lessons
  set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(trim(p_reason), '')
  where id = p_lesson_id;
end;
$$;

revoke all on function public.schedule_lesson(uuid, timestamptz, timestamptz) from public;
revoke all on function public.cancel_lesson(uuid, text) from public;
grant execute on function public.schedule_lesson(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.cancel_lesson(uuid, text) to authenticated;
