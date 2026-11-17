# 0002. Visibility with Row Level Security

Status: accepted

## Context

Four visibility rules need to hold at the API level: students only see classes they paid for, logbooks stay hidden until approved, tutors only see their own classes, and tutors never see student rates (earnings are visible only to admin and that tutor).

RLS filters rows, not columns, and the `authenticated` database role is shared by all three app roles.

## Decision

- The role lives in `profiles.role`, set by the seed. It is never read from user-editable JWT metadata.
- Policies call small `private` helper functions (`security definer`, fixed `search_path`) such as `is_class_tutor(class_id)`. This avoids recursive policies between `classes`, `enrollments` and `lessons`.
- Anything that one role may see and another may not is split into its own table, so a row policy is enough:
  - `class_student_rates`: admin only (students see the current rate through the catalog view).
  - `class_tutor_rates`, `lesson_rates`, `earnings`: admin and the owning tutor.
  - `invoices`: admin and the owning student.
- `class_catalog` is the storefront: a definer view that exposes only name, tutor, capacity, seats taken and student rate, and returns nothing to tutors.

## Consequences

- No column-level grants or per-role views to keep in sync.
- Creating a class touches three tables, wrapped by `create_class`.
- Policies are covered by pgTAP tests that impersonate each seeded user.
