create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated;

-- Clients may only read tables; every write goes through the functions in later migrations.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private grant execute on functions to authenticated;

create type public.app_role as enum ('admin', 'tutor', 'student');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null unique,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create function private.user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function private.require_role(variadic allowed public.app_role[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := private.user_role();
begin
  if v_role is null or not (v_role = any (allowed)) then
    raise exception 'You are not allowed to do this' using errcode = '42501';
  end if;
end;
$$;

create function private.assert_tutor(p_profile_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = p_profile_id and role = 'tutor') then
    raise exception 'Choose a tutor for this class';
  end if;
end;
$$;

create function private.wib_month(p_instant timestamptz)
returns date
language sql
immutable
parallel safe
set search_path = ''
as $$
  select date_trunc('month', p_instant at time zone 'Asia/Jakarta')::date;
$$;

create function private.lesson_minutes(p_start timestamptz, p_end timestamptz)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select (extract(epoch from (p_end - p_start)) / 60)::integer;
$$;

create function private.lesson_earning(p_rate integer, p_minutes integer)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select round(p_rate::numeric * p_minutes / 60)::integer;
$$;
