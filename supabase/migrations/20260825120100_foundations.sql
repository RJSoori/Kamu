-- Phase 0.5: Production Foundations
-- Adds: pgvector column for mood-matching (Phase 4 will populate/index it),
-- an is_published draft/publish flag, missing indexes, the admin_users
-- access-control model, RLS on every table, and a public restaurant-photos
-- storage bucket. Meant to be applied once via `supabase db push` (or
-- pasted into the SQL editor) -- it is not written to be safely re-run.

-- ---------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------

create extension if not exists vector;

alter table restaurants
  add column if not exists vibe_embedding vector(384);

-- Draft/publish workflow: the admin panel is now the primary way
-- restaurant data gets entered (Phase 1), so new rows should not be
-- publicly visible until an admin marks them ready.
alter table restaurants
  add column if not exists is_published boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. Indexes (Postgres does not auto-index foreign key columns)
-- ---------------------------------------------------------------------

create index if not exists restaurants_area_idx on restaurants (area);
create index if not exists restaurants_cuisine_type_idx on restaurants using gin (cuisine_type);
create index if not exists restaurants_is_published_idx on restaurants (is_published);
create index if not exists menu_items_restaurant_id_idx on menu_items (restaurant_id);
create index if not exists reviews_restaurant_id_idx on reviews (restaurant_id);
create index if not exists reviews_customer_id_idx on reviews (customer_id);
create index if not exists bucket_lists_customer_id_idx on bucket_lists (customer_id);
create index if not exists bucket_lists_restaurant_id_idx on bucket_lists (restaurant_id);

-- Prevent saving the same restaurant to a bucket list twice.
alter table bucket_lists
  add constraint bucket_lists_customer_restaurant_unique unique (customer_id, restaurant_id);

-- ---------------------------------------------------------------------
-- 3. Admin access-control model
-- ---------------------------------------------------------------------

create table if not exists admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamp with time zone not null default now()
);

-- SECURITY DEFINER: runs as the function owner (not the calling role), so
-- it can read admin_users even though that table exposes zero policies to
-- anon/authenticated below. search_path is pinned to block search-path
-- hijacking, the standard hardening for SECURITY DEFINER functions.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

grant execute on function is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------

alter table restaurants enable row level security;
alter table menu_items enable row level security;
alter table customers enable row level security;
alter table reviews enable row level security;
alter table bucket_lists enable row level security;
alter table admin_users enable row level security;

-- restaurants: published rows are public; admins see + manage everything.
create policy "restaurants_select_published_or_admin"
  on restaurants for select
  using (is_published = true or is_admin());

create policy "restaurants_insert_admin"
  on restaurants for insert
  with check (is_admin());

create policy "restaurants_update_admin"
  on restaurants for update
  using (is_admin())
  with check (is_admin());

create policy "restaurants_delete_admin"
  on restaurants for delete
  using (is_admin());

-- menu_items: visibility follows the parent restaurant's is_published flag.
create policy "menu_items_select_published_or_admin"
  on menu_items for select
  using (
    is_admin()
    or exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.is_published = true
    )
  );

create policy "menu_items_insert_admin"
  on menu_items for insert
  with check (is_admin());

create policy "menu_items_update_admin"
  on menu_items for update
  using (is_admin())
  with check (is_admin());

create policy "menu_items_delete_admin"
  on menu_items for delete
  using (is_admin());

-- customers: dormant until Phase 3 wires up customer signup/login, but
-- defined now while RLS is being locked in for every table.
create policy "customers_select_own_or_admin"
  on customers for select
  using (id = auth.uid() or is_admin());

create policy "customers_insert_self"
  on customers for insert
  with check (id = auth.uid());

create policy "customers_update_own_or_admin"
  on customers for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

create policy "customers_delete_admin"
  on customers for delete
  using (is_admin());

-- reviews: public read (scoped to published restaurants), self-write,
-- admin moderation.
create policy "reviews_select_published_or_admin"
  on reviews for select
  using (
    is_admin()
    or exists (
      select 1 from restaurants r
      where r.id = reviews.restaurant_id and r.is_published = true
    )
  );

create policy "reviews_insert_self"
  on reviews for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy "reviews_update_own_or_admin"
  on reviews for update
  using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());

create policy "reviews_delete_own_or_admin"
  on reviews for delete
  using (customer_id = auth.uid() or is_admin());

-- bucket_lists: fully private to the owning customer (no UPDATE policy --
-- rows are only ever added or removed, never edited).
create policy "bucket_lists_select_own_or_admin"
  on bucket_lists for select
  using (customer_id = auth.uid() or is_admin());

create policy "bucket_lists_insert_self"
  on bucket_lists for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy "bucket_lists_delete_own"
  on bucket_lists for delete
  using (customer_id = auth.uid());

-- admin_users: intentionally zero policies for anon/authenticated -- the
-- table is fully invisible via the API. All access goes through is_admin()
-- (SECURITY DEFINER, bypasses RLS internally) or the service-role client.

-- ---------------------------------------------------------------------
-- 5. Storage: restaurant photos
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('restaurant-photos', 'restaurant-photos', true)
on conflict (id) do nothing;

create policy "restaurant_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'restaurant-photos');

create policy "restaurant_photos_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'restaurant-photos' and is_admin());

create policy "restaurant_photos_admin_update"
  on storage.objects for update
  using (bucket_id = 'restaurant-photos' and is_admin())
  with check (bucket_id = 'restaurant-photos' and is_admin());

create policy "restaurant_photos_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'restaurant-photos' and is_admin());
