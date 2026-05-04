-- Account type (cash vs credit card) and optional installment metadata on transactions.
-- Run in Supabase SQL Editor after backing up.

-- 1) accounts.account_type
alter table public.accounts
  add column if not exists account_type text not null default 'cash';

alter table public.accounts
  drop constraint if exists accounts_account_type_check;

alter table public.accounts
  add constraint accounts_account_type_check
  check (account_type in ('cash', 'credit_card'));

-- 2) transactions: installment grouping (all four null = normal transaction)
alter table public.transactions
  add column if not exists installment_group_id uuid;

alter table public.transactions
  add column if not exists installment_index int;

alter table public.transactions
  add column if not exists installment_count int;

alter table public.transactions
  add column if not exists installment_extra_cost numeric(12, 2);

alter table public.transactions
  drop constraint if exists transactions_installment_consistency;

alter table public.transactions
  add constraint transactions_installment_consistency check (
    (
      installment_group_id is null
      and installment_index is null
      and installment_count is null
      and installment_extra_cost is null
    )
    or (
      installment_group_id is not null
      and installment_count is not null
      and installment_count >= 1
      and installment_index is not null
      and installment_index >= 1
      and installment_index <= installment_count
      and installment_extra_cost is not null
      and installment_extra_cost >= 0
    )
  );

create index if not exists transactions_installment_group_id_idx
  on public.transactions (user_id, installment_group_id)
  where installment_group_id is not null;
