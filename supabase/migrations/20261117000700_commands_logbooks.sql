create function private.logbook_earning_lines(p_logbook_id uuid)
returns table (
  lesson_id uuid,
  tutor_id uuid,
  class_id uuid,
  class_name text,
  lesson_start timestamptz,
  minutes integer,
  tutor_rate integer,
  amount integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    l.tutor_id,
    l.class_id,
    c.name,
    l.start_at,
    m.minutes,
    r.tutor_rate,
    private.lesson_earning(r.tutor_rate, m.minutes)
  from public.logbook_entries e
  join public.lessons l on l.id = e.lesson_id
  join public.classes c on c.id = l.class_id
  join public.lesson_rates r on r.lesson_id = l.id
  cross join lateral (select private.lesson_minutes(l.start_at, l.end_at) as minutes) m
  where e.logbook_id = p_logbook_id
  order by l.start_at;
$$;

create function public.save_logbook_entry(
  p_lesson_id uuid,
  p_topic text,
  p_activities text,
  p_observation text,
  p_recommendation text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson public.lessons;
  v_logbook public.logbooks;
  v_entry_id uuid;
begin
  perform private.require_role('tutor');

  select * into v_lesson from public.lessons where id = p_lesson_id;
  if not found or not private.is_class_tutor(v_lesson.class_id) then
    raise exception 'Lesson not found';
  end if;
  if v_lesson.status = 'cancelled' then
    raise exception 'A cancelled lesson does not need a logbook entry';
  end if;
  if v_lesson.end_at > now() then
    raise exception 'You can write the entry once the lesson has ended';
  end if;

  insert into public.logbooks (class_id, month)
  values (v_lesson.class_id, private.wib_month(v_lesson.start_at))
  on conflict (class_id, month) do nothing;

  select * into v_logbook
  from public.logbooks
  where class_id = v_lesson.class_id and month = private.wib_month(v_lesson.start_at)
  for update;

  insert into public.logbook_entries (logbook_id, lesson_id, topic, activities, observation, recommendation)
  values (v_logbook.id, p_lesson_id, trim(p_topic), trim(p_activities), trim(p_observation), trim(p_recommendation))
  on conflict (lesson_id) do update
  set topic = excluded.topic,
      activities = excluded.activities,
      observation = excluded.observation,
      recommendation = excluded.recommendation
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

create function public.submit_logbook(p_logbook_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_logbook public.logbooks;
  v_unfinished integer;
  v_missing integer;
begin
  perform private.require_role('tutor');

  select * into v_logbook from public.logbooks where id = p_logbook_id for update;
  if not found or not private.is_class_tutor(v_logbook.class_id) then
    raise exception 'Logbook not found';
  end if;
  if v_logbook.status not in ('draft', 'changes_requested') then
    raise exception 'This logbook has already been submitted';
  end if;

  select
    count(*) filter (where l.end_at > now()),
    count(*) filter (where l.end_at <= now() and e.id is null)
  into v_unfinished, v_missing
  from public.lessons l
  left join public.logbook_entries e on e.lesson_id = l.id
  where l.class_id = v_logbook.class_id
    and l.status = 'scheduled'
    and private.wib_month(l.start_at) = v_logbook.month;

  if v_unfinished > 0 then
    raise exception 'Some lessons this month have not finished yet';
  end if;
  if v_missing > 0 then
    raise exception 'Add an entry for every lesson first (% missing)', v_missing;
  end if;

  update public.logbooks
  set status = 'submitted',
      submitted_at = now(),
      submitted_by = (select auth.uid()),
      review_note = null
  where id = p_logbook_id;
end;
$$;

create function public.request_logbook_changes(p_logbook_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_logbook public.logbooks;
begin
  perform private.require_role('admin');

  if nullif(trim(p_note), '') is null then
    raise exception 'Please explain what needs to change';
  end if;

  select * into v_logbook from public.logbooks where id = p_logbook_id for update;
  if not found then
    raise exception 'Logbook not found';
  end if;
  if v_logbook.status <> 'submitted' then
    raise exception 'Only a submitted logbook can be sent back';
  end if;

  update public.logbooks
  set status = 'changes_requested',
      review_note = trim(p_note),
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = p_logbook_id;
end;
$$;

create function public.preview_logbook_earnings(p_logbook_id uuid)
returns table (
  lesson_id uuid,
  lesson_start timestamptz,
  minutes integer,
  tutor_rate integer,
  amount integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_role('admin');

  return query
  select e.lesson_id, e.lesson_start, e.minutes, e.tutor_rate, e.amount
  from private.logbook_earning_lines(p_logbook_id) e;
end;
$$;

-- Earnings are written only here, once per lesson: the status guard stops a second approval and
-- earnings.lesson_id is unique as a backstop.
create function public.approve_logbook(p_logbook_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_logbook public.logbooks;
begin
  perform private.require_role('admin');

  select * into v_logbook from public.logbooks where id = p_logbook_id for update;
  if not found then
    raise exception 'Logbook not found';
  end if;
  if v_logbook.status = 'approved' then
    raise exception 'This logbook is already approved';
  end if;
  if v_logbook.status <> 'submitted' then
    raise exception 'Only a submitted logbook can be approved';
  end if;

  insert into public.earnings (
    lesson_id, logbook_id, tutor_id, class_id, class_name, lesson_start, minutes, tutor_rate, amount
  )
  select e.lesson_id, p_logbook_id, e.tutor_id, e.class_id, e.class_name, e.lesson_start,
         e.minutes, e.tutor_rate, e.amount
  from private.logbook_earning_lines(p_logbook_id) e;

  update public.logbooks
  set status = 'approved', reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = p_logbook_id;
end;
$$;

revoke all on function public.save_logbook_entry(uuid, text, text, text, text) from public;
revoke all on function public.submit_logbook(uuid) from public;
revoke all on function public.request_logbook_changes(uuid, text) from public;
revoke all on function public.preview_logbook_earnings(uuid) from public;
revoke all on function public.approve_logbook(uuid) from public;
grant execute on function public.save_logbook_entry(uuid, text, text, text, text) to authenticated;
grant execute on function public.submit_logbook(uuid) to authenticated;
grant execute on function public.request_logbook_changes(uuid, text) to authenticated;
grant execute on function public.preview_logbook_earnings(uuid) to authenticated;
grant execute on function public.approve_logbook(uuid) to authenticated;
