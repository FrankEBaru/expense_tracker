-- Add optional color (hex) per account for UI
alter table public.accounts add column if not exists color text;
