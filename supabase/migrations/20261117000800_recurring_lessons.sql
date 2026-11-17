alter table public.lessons add column series_id uuid;

create index lessons_series on public.lessons (series_id) where series_id is not null;

-- Shared by single and recurring scheduling so both follow exactly the same rules.
create function private.add_lesson(
  p_class_id uuid,
  p_tutor_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_series_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := date_trunc('minute', p_start_at);
  v_end timestamptz := date_trunc('minute', p_end_at);
  v_lesson_id uuid;
begin
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

  insert into public.lessons (class_id, tutor_id, start_at, end_at, series_id)
  values (p_class_id, p_tutor_id, v_start, v_end, p_series_id)
  returning id into v_lesson_id;

  insert into public.lesson_rates (lesson_id, tutor_rate)
  select v_lesson_id, tutor_rate from public.class_tutor_rates where class_id = p_class_id;

  return v_lesson_id;
end;
$$;

create or replace function public.schedule_lesson(p_class_id uuid, p_start_at timestamptz, p_end_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_role('tutor');

  if not private.is_class_tutor(p_class_id) then
    raise exception 'You can only schedule lessons for your own classes';
  end if;

  return private.add_lesson(p_class_id, (select auth.uid()), p_start_at, p_end_at);
exception
  when exclusion_violation then
    raise exception 'You already have a lesson that overlaps with this time';
end;
$$;

-- Weekly repeat on chosen weekdays (ISO: 1 = Monday ... 7 = Sunday), all or nothing: one clash
-- or one broken rule rejects the whole series and says which date caused it.
create function public.schedule_lessons_weekly(
  p_class_id uuid,
  p_first_date date,
  p_until_date date,
  p_weekdays integer[],
  p_start_time time,
  p_end_time time
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series_id uuid := gen_random_uuid();
  v_day date;
  v_count integer := 0;
begin
  perform private.require_role('tutor');

  if not private.is_class_tutor(p_class_id) then
    raise exception 'You can only schedule lessons for your own classes';
  end if;
  if coalesce(cardinality(p_weekdays), 0) = 0
     or exists (select 1 from unnest(p_weekdays) as d where d not between 1 and 7) then
    raise exception 'Choose at least one day of the week';
  end if;
  if p_until_date < p_first_date then
    raise exception 'The last date must not be before the first date';
  end if;
  if p_until_date > p_first_date + 183 then
    raise exception 'A series can cover at most 6 months';
  end if;

  for v_day in
    select d::date
    from generate_series(p_first_date::timestamp, p_until_date::timestamp, interval '1 day') as d
    where extract(isodow from d)::integer = any (p_weekdays)
  loop
    v_count := v_count + 1;
    if v_count > 60 then
      raise exception 'A series can have at most 60 lessons';
    end if;

    begin
      perform private.add_lesson(
        p_class_id,
        (select auth.uid()),
        (v_day + p_start_time) at time zone 'Asia/Jakarta',
        (v_day + p_end_time) at time zone 'Asia/Jakarta',
        v_series_id
      );
    exception
      when exclusion_violation then
        raise exception 'You already have a lesson that overlaps on %', to_char(v_day, 'FMDD Mon YYYY');
      when raise_exception then
        raise exception '%: %', to_char(v_day, 'FMDD Mon YYYY'), sqlerrm;
    end;
  end loop;

  if v_count = 0 then
    raise exception 'No lessons fall on the chosen days between those dates';
  end if;

  return v_count;
end;
$$;

-- Cancels this lesson and every later upcoming lesson of its series that has no logbook entry.
create function public.cancel_lesson_series(p_lesson_id uuid, p_reason text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := private.user_role();
  v_lesson public.lessons;
  v_count integer;
begin
  perform private.require_role('admin', 'tutor');

  select * into v_lesson from public.lessons where id = p_lesson_id;
  if not found or (v_role = 'tutor' and not private.is_class_tutor(v_lesson.class_id)) then
    raise exception 'Lesson not found';
  end if;
  if v_lesson.series_id is null then
    raise exception 'This lesson is not part of a series';
  end if;

  with targets as (
    select l.id
    from public.lessons l
    where l.series_id = v_lesson.series_id
      and l.status = 'scheduled'
      and l.start_at >= v_lesson.start_at
      and l.end_at > now()
      and not exists (select 1 from public.logbook_entries e where e.lesson_id = l.id)
    for update
  )
  update public.lessons l
  set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(trim(p_reason), '')
  from targets t
  where l.id = t.id;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'There are no upcoming lessons left to cancel in this series';
  end if;

  return v_count;
end;
$$;

revoke all on function public.schedule_lessons_weekly(uuid, date, date, integer[], time, time) from public;
revoke all on function public.cancel_lesson_series(uuid, text) from public;
grant execute on function public.schedule_lessons_weekly(uuid, date, date, integer[], time, time) to authenticated;
grant execute on function public.cancel_lesson_series(uuid, text) to authenticated;
