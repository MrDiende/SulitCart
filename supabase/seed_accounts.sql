-- Run this AFTER creating the two users in Supabase Dashboard > Authentication > Users.
-- Auth users and their password hashes must be created by Supabase Auth, not by inserting
-- rows directly into auth.users from SQL.

-- Promote the pre-created admin account. The profile trigger creates its profile on signup.
update public.profiles
set role = 'admin', active = true, updated_at = now()
where lower(email) = lower('adminsulitcart@gmail.com');

-- Ensure the requested customer remains a customer (profile is created by the auth trigger).
update public.profiles
set role = 'customer', active = true, updated_at = now()
where lower(email) = lower('renzoosmena@gmail.com');

-- Verify both profiles exist and the roles are correct.
select email, role, active
from public.profiles
where lower(email) in (lower('adminsulitcart@gmail.com'), lower('renzoosmena@gmail.com'));
