-- Required seed: 1 admin, 2 tutors, 3 students and 1 class with capacity 2.
-- Every account uses the password Password123!

do $$
declare
  p record;
begin
  for p in
    select * from (values
      ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@stargeneration.test',         'Rina Admin',     'admin'),
      ('b0000000-0000-4000-8000-000000000001'::uuid, 'tutor.budi@stargeneration.test',    'Budi Santoso',   'tutor'),
      ('b0000000-0000-4000-8000-000000000002'::uuid, 'tutor.sari@stargeneration.test',    'Sari Wulandari', 'tutor'),
      ('c0000000-0000-4000-8000-000000000001'::uuid, 'student.alya@stargeneration.test',  'Alya Putri',     'student'),
      ('c0000000-0000-4000-8000-000000000002'::uuid, 'student.dimas@stargeneration.test', 'Dimas Pratama',  'student'),
      ('c0000000-0000-4000-8000-000000000003'::uuid, 'student.citra@stargeneration.test', 'Citra Lestari',  'student')
    ) as t (id, email, full_name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    )
    values (
      '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email,
      extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), p.id::text, p.id,
      jsonb_build_object('sub', p.id::text, 'email', p.email, 'email_verified', true),
      'email', now(), now(), now()
    );

    insert into public.profiles (id, full_name, email, role)
    values (p.id, p.full_name, p.email, p.role::public.app_role);
  end loop;
end;
$$;

insert into public.classes (id, name, description, tutor_id, capacity)
values (
  'd0000000-0000-4000-8000-000000000001',
  'English Conversation - Group A',
  'Weekly speaking practice for small groups.',
  'b0000000-0000-4000-8000-000000000001',
  2
);

insert into public.class_student_rates (class_id, student_rate)
values ('d0000000-0000-4000-8000-000000000001', 150000);

insert into public.class_tutor_rates (class_id, tutor_rate)
values ('d0000000-0000-4000-8000-000000000001', 100000);
