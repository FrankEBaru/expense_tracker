-- Validate stored custom colors as 6-digit hex values.

update public.accounts
set color = null
where color is not null and color !~ '^#[0-9a-fA-F]{6}$';

update public.categories
set color = null
where color is not null and color !~ '^#[0-9a-fA-F]{6}$';

alter table public.accounts
  drop constraint if exists accounts_color_hex_check;

alter table public.accounts
  add constraint accounts_color_hex_check
  check (color is null or color ~ '^#[0-9a-fA-F]{6}$');

alter table public.categories
  drop constraint if exists categories_color_hex_check;

alter table public.categories
  add constraint categories_color_hex_check
  check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
