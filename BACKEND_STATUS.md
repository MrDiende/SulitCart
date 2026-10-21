# Backend integration status

This package removes mock data modules and mock password/session helpers, configures the Supabase browser client, includes Supabase SQL schemas with RLS, and persists admin catalog, inventory, orders, shipping, customer/staff status, and audit operations.

It is a backend-integration foundation, not a claim that every screen has completed database persistence. Review `SUPABASE_SETUP.md` for the exact remaining migration boundary before using it for live sales.

## Still required before production

- Move product images from data URLs to Supabase Storage.
- Deploy the `create-staff` and `manage-staff` Edge Functions for staff provisioning and identity edits.
- Add tests for RLS and customer/staff/admin role boundaries.

## Recent update
- Customer Profile includes a Supabase Auth password-change form.
- Added `supabase/admin_operations.sql` for atomic order/stock operations and database grants; run it after `supabase/schema.sql`.
- Admin CRUD writes now persist to Supabase, and audit events are stored in `audit_logs`.
- Added `supabase/seed_accounts.sql` to assign the requested admin/customer roles after creating the Auth users in the Supabase dashboard.
- Email confirmation must be disabled in Supabase Dashboard Auth settings; it cannot be reliably configured from this client project schema.
