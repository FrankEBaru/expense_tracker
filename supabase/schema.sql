-- Expense Tracker: expenses table and RLS
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  category text not null check (category in ('Food', 'Transport', 'Bills', 'Shopping', 'Other')),
  description text,
  date date not null,
  created_at timestamptz not null default now()
);

-- Index for fast lookups by user and date
create index if not exists expenses_user_id_date_idx on public.expenses (user_id, date desc);

alter table public.expenses enable row level security;

-- Users can only access their own rows
create policy "Users can CRUD own expenses"
  on public.expenses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
