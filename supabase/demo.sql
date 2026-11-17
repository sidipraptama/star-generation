-- Optional demo history on top of seed.sql (load with `pnpm db:demo`).
-- Alya and Dimas are enrolled and paid, last month's logbook is approved, and the most recent
-- lessons are waiting for logbook entries. Dates are relative to today, in WIB.

do $$
declare
  v_class constant uuid := 'd0000000-0000-4000-8000-000000000001';
  v_tutor constant uuid := 'b0000000-0000-4000-8000-000000000001';
  v_admin constant uuid := 'a0000000-0000-4000-8000-000000000001';
  v_students constant uuid[] := array[
    'c0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002'
  ]::uuid[];
  v_today timestamp := date_trunc('day', now() at time zone 'Asia/Jakarta');
  v_prev_month timestamp := date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month';
  v_next_month timestamp := date_trunc('month', now() at time zone 'Asia/Jakarta') + interval '1 month';
  v_student uuid;
  v_enrollment uuid;
  v_lesson uuid;
  v_logbook uuid;
  v_day integer;
  v_topics text[] := array['Introductions and small talk', 'Ordering food and drinks', 'Describing daily routines', 'Giving directions'];
  v_i integer := 0;
begin
  foreach v_student in array v_students loop
    insert into public.enrollments (class_id, student_id, status, activated_at)
    values (v_class, v_student, 'active', (v_prev_month + interval '1 day 9 hours') at time zone 'Asia/Jakarta')
    returning id into v_enrollment;

    insert into public.invoices (enrollment_id, hours, student_rate, status, issued_at, paid_at, paid_by, payment_reference)
    values (
      v_enrollment, 12, 150000, 'paid',
      (v_prev_month + interval '1 day 8 hours') at time zone 'Asia/Jakarta',
      (v_prev_month + interval '1 day 9 hours') at time zone 'Asia/Jakarta',
      v_admin, 'BCA transfer'
    );
  end loop;

  insert into public.logbooks (class_id, month) values (v_class, v_prev_month::date) returning id into v_logbook;

  foreach v_day in array array[4, 11, 18, 25] loop
    v_i := v_i + 1;

    insert into public.lessons (class_id, tutor_id, start_at, end_at)
    values (
      v_class, v_tutor,
      (v_prev_month + ((v_day - 1) * interval '1 day') + interval '16 hours') at time zone 'Asia/Jakarta',
      (v_prev_month + ((v_day - 1) * interval '1 day') + interval '17 hours 30 minutes') at time zone 'Asia/Jakarta'
    )
    returning id into v_lesson;

    insert into public.lesson_rates (lesson_id, tutor_rate) values (v_lesson, 100000);

    insert into public.logbook_entries (logbook_id, lesson_id, topic, activities, observation, recommendation)
    values (
      v_logbook, v_lesson, v_topics[v_i],
      'Role-play in pairs, vocabulary drills and a short group discussion.',
      'Both students took part actively and are gaining confidence speaking.',
      'Practise the new vocabulary at home and prepare two questions for the next session.'
    );
  end loop;

  update public.logbooks
  set status = 'approved',
      submitted_at = (v_prev_month + interval '1 month' + interval '1 day') at time zone 'Asia/Jakarta',
      submitted_by = v_tutor,
      reviewed_at = (v_prev_month + interval '1 month' + interval '2 days') at time zone 'Asia/Jakarta',
      reviewed_by = v_admin
  where id = v_logbook;

  insert into public.earnings (lesson_id, logbook_id, tutor_id, class_id, class_name, lesson_start, minutes, tutor_rate, amount, approved_at)
  select e.lesson_id, v_logbook, e.tutor_id, e.class_id, e.class_name, e.lesson_start, e.minutes, e.tutor_rate, e.amount,
         (v_prev_month + interval '1 month' + interval '2 days') at time zone 'Asia/Jakarta'
  from private.logbook_earning_lines(v_logbook) e;

  if extract(day from v_today) >= 4 then
    foreach v_day in array array[1, 3] loop
      insert into public.lessons (class_id, tutor_id, start_at, end_at)
      values (
        v_class, v_tutor,
        (v_today - (v_day * interval '1 day') + interval '16 hours') at time zone 'Asia/Jakarta',
        (v_today - (v_day * interval '1 day') + interval '17 hours 30 minutes') at time zone 'Asia/Jakarta'
      )
      returning id into v_lesson;

      insert into public.lesson_rates (lesson_id, tutor_rate) values (v_lesson, 100000);
    end loop;
  end if;

  foreach v_day in array array[6, 13] loop
    insert into public.lessons (class_id, tutor_id, start_at, end_at)
    values (
      v_class, v_tutor,
      (v_next_month + ((v_day - 1) * interval '1 day') + interval '16 hours') at time zone 'Asia/Jakarta',
      (v_next_month + ((v_day - 1) * interval '1 day') + interval '17 hours 30 minutes') at time zone 'Asia/Jakarta'
    )
    returning id into v_lesson;

    insert into public.lesson_rates (lesson_id, tutor_rate) values (v_lesson, 100000);
  end loop;
end;
$$;
