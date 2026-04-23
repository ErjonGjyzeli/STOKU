-- Fix infinite recursion in `staff_profiles` RLS select policy.
--
-- The previous `staff_read` policy evaluated
--   exists (select 1 from staff_profiles sp where sp.id = auth.uid() and sp.is_active)
-- which itself queries `staff_profiles` and therefore re-applies the same
-- policy: Postgres aborted with `42P17 infinite recursion detected in policy`.
-- Downstream, any server query against `staff_profiles` (login session lookup,
-- dashboard layout, admin settings pages) returned zero rows silently,
-- producing a "no session" state and the /login <-> / redirect loop in prod.
--
-- Fix: rewrite the policy to a non-recursive shape. A user may read their own
-- profile row; admins may read any row via the already-SECURITY-DEFINER
-- helper `is_admin()` which bypasses RLS on its inner lookup.

drop policy if exists "staff_read" on staff_profiles;

create policy "staff_read" on staff_profiles for select using (
  id = auth.uid() or is_admin()
);
