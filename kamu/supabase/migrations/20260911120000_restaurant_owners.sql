-- Restaurant Owner Portal: self-serve owner accounts + listing ownership.
--
-- Adds a `restaurant_owners` table (one row per registered owner, id =
-- auth.users.id, same shape/pattern as `customers`) and an `owner_id`
-- column on `restaurants` so an owner can self-create and manage their own
-- listing(s) directly through ../../kamu_restaurants (a separate app,
-- sharing this Supabase project).
--
-- This is a deliberate reversal of PROJECT.md section 3 ("Listings are
-- admin-added, not owner self-signup") and section 12, made at the user's
-- explicit request on 2026-09-11 -- see PROJECT.md's own annotation.
-- Everything from the foundations migration (admin_users, is_admin(),
-- existing RLS) is unchanged; this only adds new policies alongside it.
-- Meant to be applied once via `supabase db push` (or pasted into the SQL
-- editor) -- like foundations.sql, not written to be safely re-run.

-- ---------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------

create table if not exists restaurant_owners (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamp with time zone not null default now()
);

-- Nullable + ON DELETE SET NULL, not CASCADE: deleting an owner account
-- should not take their restaurant (and any customer reviews/bucket_list
-- entries attached to it) down with it. An orphaned listing just reverts to
-- admin-managed, same as any admin-added row.
alter table restaurants
  add column if not exists owner_id uuid references restaurant_owners (id) on delete set null;

create index if not exists restaurants_owner_id_idx on restaurants (owner_id);

-- ---------------------------------------------------------------------
-- 2. Row Level Security: restaurant_owners
-- ---------------------------------------------------------------------

alter table restaurant_owners enable row level security;

create policy "restaurant_owners_select_own_or_admin"
  on restaurant_owners for select
  using (id = auth.uid() or is_admin());

create policy "restaurant_owners_insert_self"
  on restaurant_owners for insert
  with check (id = auth.uid());

create policy "restaurant_owners_update_own_or_admin"
  on restaurant_owners for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

create policy "restaurant_owners_delete_admin"
  on restaurant_owners for delete
  using (is_admin());

-- ---------------------------------------------------------------------
-- 3. Row Level Security: ownership extension on restaurants + menu_items
-- ---------------------------------------------------------------------

-- restaurants already has published-or-admin SELECT, admin-only
-- INSERT/UPDATE/DELETE (foundations.sql). Policies for the same command are
-- OR'd together, so these only ever widen access, never narrow the
-- existing admin/public behavior. No is_published check here deliberately:
-- the chosen owner-signup model is "no admin gate", so an owner can publish
-- their own listing immediately on insert/update, same as they'd set any
-- other column on their own row.
create policy "restaurants_select_own_owner"
  on restaurants for select
  using (owner_id = auth.uid());

create policy "restaurants_insert_owner"
  on restaurants for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "restaurants_update_own_owner"
  on restaurants for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Deliberately no restaurants_delete_owner policy: an owner deleting their
-- own row would cascade into customer-generated data (reviews,
-- bucket_lists) tied to it. Owners can unpublish via the update policy
-- above; only admins can hard-delete (existing restaurants_delete_admin).

-- menu_items: same ownership extension, scoped through the parent
-- restaurant's owner_id.
create policy "menu_items_select_own_owner"
  on menu_items for select
  using (
    exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "menu_items_insert_owner"
  on menu_items for insert
  to authenticated
  with check (
    exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "menu_items_update_own_owner"
  on menu_items for update
  using (
    exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "menu_items_delete_own_owner"
  on menu_items for delete
  using (
    exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  );
