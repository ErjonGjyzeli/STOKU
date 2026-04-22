-- Add email column to staff_profiles (denormalized copy of auth.users.email for easier queries).
alter table staff_profiles add column email text;

-- Backfill from auth.users for any existing rows.
update staff_profiles sp
set email = u.email
from auth.users u
where sp.id = u.id and sp.email is null;

create unique index staff_profiles_email_unique on staff_profiles (lower(email)) where email is not null;
