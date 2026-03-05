-- Budgets: period-based spending limits with optional cumulative carry-over.
-- Run in Supabase SQL Editor after migration_full_finance.sql.

-- budgets: one row per budget
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  period_type text not null check (period_type in ('weekly', 'biweekly', 'monthly')),
  amount numeric(12, 2) not null check (amount >= 0),
  cumulative boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- budget_categories: many-to-many (budget ↔ expense categories)
create table if not exists public.budget_categories (
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (budget_id, category_id)
);

create index if not exists budgets_user_id_idx on public.budgets (user_id);
alter table public.budgets enable row level security;

drop policy if exists "Users can CRUD own budgets" on public.budgets;
create policy "Users can CRUD own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.budget_categories enable row level security;
drop policy if exists "Users can manage budget_categories for own budgets" on public.budget_categories;
create policy "Users can manage budget_categories for own budgets"
  on public.budget_categories for all
  using (exists (select 1 from public.budgets b where b.id = budget_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.budgets b where b.id = budget_id and b.user_id = auth.uid()));
