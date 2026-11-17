create function private.is_class_tutor(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes where id = p_class_id and tutor_id = (select auth.uid())
  );
$$;

create function private.is_class_student(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = p_class_id and student_id = (select auth.uid()) and status = 'active'
  );
$$;

create function private.student_has_hours(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and private.enrollment_balance(e.id) > 0
  );
$$;

create function private.owns_enrollment(p_enrollment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments where id = p_enrollment_id and student_id = (select auth.uid())
  );
$$;

create function private.tutor_teaches_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = p_student_id and e.status = 'active' and c.tutor_id = (select auth.uid())
  );
$$;

create function private.is_lesson_tutor(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons where id = p_lesson_id and tutor_id = (select auth.uid())
  );
$$;

create function private.is_logbook_tutor(p_logbook_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.logbooks b
    join public.classes c on c.id = b.class_id
    where b.id = p_logbook_id and c.tutor_id = (select auth.uid())
  );
$$;

create function private.is_approved_logbook_student(p_logbook_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.logbooks b
    join public.enrollments e on e.class_id = b.class_id
    where b.id = p_logbook_id
      and b.status = 'approved'
      and e.student_id = (select auth.uid())
      and e.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_student_rates enable row level security;
alter table public.class_tutor_rates enable row level security;
alter table public.enrollments enable row level security;
alter table public.invoices enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_rates enable row level security;
alter table public.logbooks enable row level security;
alter table public.logbook_entries enable row level security;
alter table public.earnings enable row level security;

create policy profiles_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_admin on public.profiles for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy profiles_tutors_are_public on public.profiles for select to authenticated
  using (role = 'tutor');
create policy profiles_tutor_sees_own_students on public.profiles for select to authenticated
  using (role = 'student' and private.tutor_teaches_student(id));

create policy classes_admin on public.classes for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy classes_tutor on public.classes for select to authenticated
  using (tutor_id = (select auth.uid()));
create policy classes_paid_student on public.classes for select to authenticated
  using (private.is_class_student(id));

create policy class_student_rates_admin on public.class_student_rates for select to authenticated
  using ((select private.user_role()) = 'admin');

create policy class_tutor_rates_admin on public.class_tutor_rates for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy class_tutor_rates_tutor on public.class_tutor_rates for select to authenticated
  using (private.is_class_tutor(class_id));

create policy enrollments_admin on public.enrollments for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy enrollments_student on public.enrollments for select to authenticated
  using (student_id = (select auth.uid()));
create policy enrollments_tutor on public.enrollments for select to authenticated
  using (status = 'active' and private.is_class_tutor(class_id));

create policy invoices_admin on public.invoices for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy invoices_student on public.invoices for select to authenticated
  using (private.owns_enrollment(enrollment_id));

create policy lessons_admin on public.lessons for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy lessons_tutor on public.lessons for select to authenticated
  using (private.is_class_tutor(class_id));
create policy lessons_paid_student on public.lessons for select to authenticated
  using (private.is_class_student(class_id) and (end_at <= now() or private.student_has_hours(class_id)));

create policy lesson_rates_admin on public.lesson_rates for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy lesson_rates_tutor on public.lesson_rates for select to authenticated
  using (private.is_lesson_tutor(lesson_id));

create policy logbooks_admin on public.logbooks for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy logbooks_tutor on public.logbooks for select to authenticated
  using (private.is_class_tutor(class_id));
create policy logbooks_approved_for_student on public.logbooks for select to authenticated
  using (status = 'approved' and private.is_class_student(class_id));

create policy logbook_entries_admin on public.logbook_entries for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy logbook_entries_tutor on public.logbook_entries for select to authenticated
  using (private.is_logbook_tutor(logbook_id));
create policy logbook_entries_approved_for_student on public.logbook_entries for select to authenticated
  using (private.is_approved_logbook_student(logbook_id));

create policy earnings_admin on public.earnings for select to authenticated
  using ((select private.user_role()) = 'admin');
create policy earnings_own on public.earnings for select to authenticated
  using (tutor_id = (select auth.uid()));

grant select on
  public.profiles,
  public.classes,
  public.class_student_rates,
  public.class_tutor_rates,
  public.enrollments,
  public.invoices,
  public.lessons,
  public.lesson_rates,
  public.logbooks,
  public.logbook_entries,
  public.earnings,
  public.hour_ledger,
  public.enrollment_balances,
  public.class_catalog
to authenticated;
