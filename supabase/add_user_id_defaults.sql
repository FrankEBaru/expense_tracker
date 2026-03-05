-- Ensure user_id is assigned by the database from JWT claims.
-- This allows client inserts without sending user_id.

alter table public.accounts
  alter column user_id set default auth.uid();

alter table public.categories
  alter column user_id set default auth.uid();

alter table public.transactions
  alter column user_id set default auth.uid();

alter table public.budgets
  alter column user_id set default auth.uid();
