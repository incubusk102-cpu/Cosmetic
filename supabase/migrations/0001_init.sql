-- Cosmetic Allergy Tracker — initial schema
-- Six tables, full RLS, indexes for the hot paths.

-- ───────────────────────────────────────────────────────────────
-- profiles — one row per auth user
-- ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  plan text not null default 'free' check (plan in ('free','plus')),
  pdf_exports_used_this_month integer not null default 0,
  region text default 'EU'
);

-- ───────────────────────────────────────────────────────────────
-- user_allergens — the user's personal allergen list (the moat)
-- ───────────────────────────────────────────────────────────────
create table if not exists public.user_allergens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  allergen_key text,
  custom_label text,
  severity smallint not null default 2 check (severity between 1 and 3),
  created_at timestamptz not null default now(),
  constraint user_allergens_key_or_custom check (
    allergen_key is not null or custom_label is not null
  )
);

create unique index if not exists user_allergens_user_key_custom_uidx
  on public.user_allergens (user_id, coalesce(allergen_key, ''), coalesce(custom_label, ''));

-- ───────────────────────────────────────────────────────────────
-- products — every product the user has scanned (and optionally saved)
-- ───────────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barcode text,
  brand text,
  name text,
  source text not null check (source in ('barcode','ocr','manual')),
  ingredients_raw text,
  scanned_at timestamptz not null default now(),
  is_saved boolean not null default false,
  last_verdict text check (last_verdict in ('safe','caution','avoid'))
);

create index if not exists products_user_scanned_at_idx
  on public.products (user_id, scanned_at desc);

create index if not exists products_user_barcode_idx
  on public.products (user_id, barcode)
  where barcode is not null;

-- ───────────────────────────────────────────────────────────────
-- reactions — what happened when the user used a product
-- ───────────────────────────────────────────────────────────────
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  severity smallint not null check (severity between 0 and 4),
  body_area text,
  symptoms text[],
  notes text,
  photo_path text,
  occurred_at timestamptz not null default now()
);

create index if not exists reactions_user_occurred_at_idx
  on public.reactions (user_id, occurred_at desc);

-- ───────────────────────────────────────────────────────────────
-- product_cache — shared cache of barcode lookups (no per-user data)
-- ───────────────────────────────────────────────────────────────
create table if not exists public.product_cache (
  barcode text primary key,
  brand text,
  name text,
  ingredients_raw text,
  fetched_at timestamptz not null default now(),
  source text not null default 'openbeautyfacts'
);

-- ───────────────────────────────────────────────────────────────
-- scan_events — short-retention event log for debugging the matching path
-- ───────────────────────────────────────────────────────────────
create table if not exists public.scan_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'barcode_hit','barcode_miss','ocr_used','manual_used','match_run'
  )),
  meta jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- Row-level security
-- ───────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.user_allergens enable row level security;
alter table public.products       enable row level security;
alter table public.reactions      enable row level security;
alter table public.scan_events    enable row level security;
alter table public.product_cache  enable row level security;

drop policy if exists "own profile"     on public.profiles;
drop policy if exists "own allergens"   on public.user_allergens;
drop policy if exists "own products"    on public.products;
drop policy if exists "own reactions"   on public.reactions;
drop policy if exists "own scan events" on public.scan_events;
drop policy if exists "read cache"      on public.product_cache;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own allergens" on public.user_allergens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own products" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own reactions" on public.reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own scan events" on public.scan_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- product_cache is readable by any authenticated user; writes are
-- service-role only (no insert/update/delete policy).
create policy "read cache" on public.product_cache
  for select to authenticated using (true);

-- ───────────────────────────────────────────────────────────────
-- Auto-create a profile row on user signup
-- ───────────────────────────────────────────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
