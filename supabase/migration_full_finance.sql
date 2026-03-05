-- Full finance app: accounts, categories, transactions
-- Run in Supabase SQL Editor after backing up. Creates new tables, migrates expenses, drops expenses.

-- 1. accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  initial_balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);
alter table public.accounts enable row level security;

drop policy if exists "Users can CRUD own accounts" on public.accounts;
create policy "Users can CRUD own accounts"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, type, name)
);

create index if not exists categories_user_id_type_idx on public.categories (user_id, type);
alter table public.categories enable row level security;

drop policy if exists "Users can CRUD own categories" on public.categories;
create policy "Users can CRUD own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. transactions (expense/income: account_id + category_id; transfer: from_account_id + to_account_id)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer')),
  account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  from_account_id uuid references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  description text,
  created_at timestamptz not null default now(),
  constraint transfer_has_from_to check (
    (type = 'transfer' and from_account_id is not null and to_account_id is not null and account_id is null and category_id is null)
    or
    (type in ('expense', 'income') and account_id is not null and category_id is not null and from_account_id is null and to_account_id is null)
  )
);

create index if not exists transactions_user_id_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_account_id_idx on public.transactions (account_id);
create index if not exists transactions_from_account_id_idx on public.transactions (from_account_id);
create index if not exists transactions_to_account_id_idx on public.transactions (to_account_id);

alter table public.transactions enable row level security;

drop policy if exists "Users can CRUD own transactions" on public.transactions;
create policy "Users can CRUD own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4–8. Migrate from old expenses table (skip if expenses does not exist, e.g. fresh install)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'expenses') then
    insert into public.accounts (user_id, name, initial_balance)
    select distinct user_id, 'Default', 0 from public.expenses;

    insert into public.categories (user_id, type, name, sort_order)
    select u.user_id, 'expense', cat.name, cat.ord
    from (select distinct user_id from public.expenses) u
    cross join (values ('Food', 1), ('Transport', 2), ('Bills', 3), ('Shopping', 4), ('Other', 5)) as cat(name, ord);

    insert into public.categories (user_id, type, name, sort_order)
    select u.user_id, 'income', cat.name, cat.ord
    from (select distinct user_id from public.expenses) u
    cross join (values ('Salary', 1), ('Freelance', 2), ('Other', 3)) as cat(name, ord);

    insert into public.transactions (user_id, type, account_id, category_id, amount, date, description, created_at)
    select e.user_id, 'expense', a.id, c.id, e.amount, e.date, e.description, e.created_at
    from public.expenses e
    join public.accounts a on a.user_id = e.user_id and a.name = 'Default'
    join public.categories c on c.user_id = e.user_id and c.type = 'expense' and c.name = e.category;

    drop table public.expenses;
  end if;
end $$;
