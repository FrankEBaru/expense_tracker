-- Add hide_balance to accounts for privacy toggle on dashboard
-- Run in Supabase SQL Editor.

alter table public.accounts
  add column if not exists hide_balance boolean not null default false;
