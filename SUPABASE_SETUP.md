# SulitCart — Supabase backend setup

## 1. Configure the frontend

The root `.env` file is configured with the supplied Supabase project URL and publishable key. Keep `.env` out of source control. The publishable key may be used in browser code; never expose a `service_role` or secret key in a `VITE_` variable.

```bash
npm install
npm run dev
```

Restart Vite after changing environment variables.

## 2. Create the database

1. Open the Supabase dashboard for this project.
2. Open **SQL Editor** and run all of `supabase/schema.sql`.
3. Run `supabase/admin_operations.sql` in the SQL Editor. It adds the atomic inventory/order functions, payment method field, grants, and audit policies required by database-backed admin operations.
4. In **Authentication → Providers → Email**, configure email confirmation as desired.
5. Register a normal customer account. The database trigger creates a customer profile.
6. Provision the first admin only through a trusted admin process after the user exists. Do not allow public sign-up to choose an admin/staff role.

### Fix profile permission errors for all sign-in roles

If sign-in or staff provisioning reports `permission denied for table profiles`, run `supabase/fix_profile_permissions.sql` in the Supabase Dashboard **SQL Editor**. It grants authenticated users the table privileges required for RLS to evaluate profile access, and grants `service_role` the profile access used by the trusted staff Edge Functions. The RLS policies still restrict authenticated customers to their own profile and allow staff/admin access according to role. Then sign out and sign back in. These grants are also included in `supabase/schema.sql` and `supabase/admin_operations.sql` for new installations.

## Current integration boundary

- Supabase JS client is configured from environment variables.
- Customer sign-in, sign-up, session restore, sign-out, and profile updates use Supabase Auth and `profiles`.
- Admins create staff Auth users through the `create-staff` Edge Function. It verifies the caller's active admin profile before creating credentials and assigning the staff role.
- On startup, the storefront reads categories, products, and shipping rates from Supabase; no demo catalog is seeded.
- The SQL schema includes profiles, categories, products, shipping rates, orders, order items, inventory transactions, audit logs, indexes, and baseline RLS policies.
- Admin product/category/shipping CRUD, inventory adjustments, customer/staff status, online orders, walk-in sales, and audit entries now persist to Supabase. Stock-affecting order and inventory changes use database functions so related writes happen together.
- **This is not yet a complete production migration.** Product images are currently stored as image data URLs rather than Supabase Storage objects, and additional RLS/integration tests are still required before live use. Staff Auth account creation and identity edits use trusted server-side functions; never place an elevated key in the browser.

## Important security notes

- Never grant admin/staff roles from public signup metadata.
- Do not use a service-role key in the frontend.
- Test RLS with customer, staff, and admin accounts before deploying.
- Treat stock and order updates as database transactions/RPCs to prevent overselling and inconsistent inventory.

## 3. Disable email confirmation and create the requested accounts

Supabase Auth users cannot safely be created by `schema.sql` alone. Create them through Supabase Auth so Supabase generates password hashes and maintains auth metadata.

1. In Supabase Dashboard, open **Authentication → Providers → Email** and turn off **Confirm email** (label may vary by dashboard version), then save.
2. Open **Authentication → Users → Add user** and create these accounts, marking them confirmed if the dashboard presents that option:
   - Admin: `adminsulitcart@gmail.com` — password supplied by the project owner. Use **Auto Confirm User** if available.
   - Customer: `renzoosmena@gmail.com` — password supplied by the project owner. Use **Auto Confirm User** if available.
3. After both users exist, run `supabase/seed_accounts.sql` in SQL Editor. This promotes only the admin profile and keeps the other profile as a customer.
4. Verify the query returns both accounts with the expected roles. Do not permit public registration to set privileged roles.

The requested passwords are not stored in SQL files or frontend code. If these are real credentials, change them after first sign-in and do not commit them to source control.

## 4. Customer password changes

The customer Profile page now includes a **Change password** section. It uses `supabase.auth.updateUser({ password })`, checks for at least eight characters, confirms both entries match, and displays Supabase errors or success feedback. A signed-in customer can use it without an email confirmation flow when the project's Auth settings are configured as above.

## 5. Enable admin staff-account creation

Deploy the `create-staff` Edge Function from the `sc_work` project directory after configuring the Supabase CLI:

```bash
supabase functions deploy create-staff
supabase functions deploy manage-staff
```

Both hosted functions read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from their server environment. Never add the service-role key to `.env`, frontend code, or a `VITE_` variable. The functions validate the signed-in caller against the active admin profile; one provisions a confirmed Auth user and the other updates staff Auth and profile data. Run `schema.sql` and `admin_operations.sql` first.
