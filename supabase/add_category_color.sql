-- Add optional color (hex) per category for charts and UI
alter table public.categories add column if not exists color text;
