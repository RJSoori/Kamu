-- Owner verification, content moderation and customer reports.
--
-- Moderation model (decided 2026-10-01, see PROJECT.md section 3):
--   * A restaurant owner account is verified by an admin ONCE, after it
--     registers (restaurant_owners.status: pending -> approved). While
--     pending, the owner can already build their listing, but nothing they
--     own is publicly visible. Once approved, they post freely -- no
--     per-listing or per-edit review.
--   * Customers can report restaurants and menu items (content_reports).
--     Reports are worked by admins in the admin portal, which can hide an
--     individual restaurant/menu item (hidden_by_admin) or suspend the
--     owner (status = 'suspended', which hides everything they own).
--
-- The admin portal itself is built separately (by a teammate); this
-- migration is only the database contract it plugs into. That contract is
-- documented in ../../docs/owner-verification-and-reports.md.
--
-- Builds on 20260911120000_restaurant_owners.sql. Meant to be applied once
-- via `supabase db push` (or pasted into the SQL editor) -- like the other
-- migrations, not written to be safely re-run.

-- ---------------------------------------------------------------------
-- 0. Explicit Data API grants
-- ---------------------------------------------------------------------

-- Supabase no longer auto-exposes newly created public-schema tables and
-- functions to the API roles (see the auto_expose_new_tables note in
-- ../config.toml), so every table the apps use needs an explicit GRANT. The
-- older tables got theirs implicitly from the legacy defaults on the hosted
-- project (re-granting there is a no-op), but a fresh database -- local dev,
-- or a new project -- has none, and restaurant_owners (09-11 migration)
-- never had any. RLS stays the actual access boundary; these grants only
-- make the tables reachable at all.
grant select on table restaurants, menu_items, reviews to anon;

grant select, insert, update, delete
  on table restaurants, menu_items, reviews, customers, bucket_lists,
           restaurant_owners
  to authenticated;

grant all
  on table restaurants, menu_items, reviews, customers, bucket_lists,
           restaurant_owners, admin_users
  to service_role;

-- admin_users stays invisible to anon/authenticated (no grants, no
-- policies) -- unchanged from foundations.sql.

-- ---------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------

-- Owner verification state. Any owner rows that already exist start as
-- 'pending' and need an admin to approve them, same as new registrations.
alter table restaurant_owners
  add column status text not null default 'pending'
    constraint restaurant_owners_status_check
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  add column phone text,
  -- Admin's message to the owner (e.g. why they were rejected/suspended);
  -- shown on the owner's dashboard.
  add column status_note text,
  add column status_changed_at timestamp with time zone,
  add column status_changed_by uuid references auth.users (id) on delete set null;

create index restaurant_owners_status_idx on restaurant_owners (status);

-- Per-item takedown for reported content. Only admins can set these (see
-- the guard triggers in section 4); the owner sees the flag + note on their
-- dashboard but can't clear it, so a takedown can't be undone by just
-- re-publishing.
alter table restaurants
  add column hidden_by_admin boolean not null default false,
  add column moderation_note text;

alter table menu_items
  add column hidden_by_admin boolean not null default false,
  add column moderation_note text;

-- ---------------------------------------------------------------------
-- 2. Helper functions
-- ---------------------------------------------------------------------

-- SECURITY DEFINER + pinned search_path, same hardening as is_admin(). They
-- need to bypass RLS because anon can't read restaurant_owners at all, yet
-- public visibility of a restaurant depends on its owner's status.

create or replace function is_approved_owner(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from restaurant_owners
    where id = uid and status = 'approved'
  );
$$;

-- "Active" = allowed to edit: pending owners can build drafts, approved
-- owners post freely, rejected/suspended owners are read-only.
create or replace function is_active_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from restaurant_owners
    where id = auth.uid() and status in ('pending', 'approved')
  );
$$;

-- The single definition of "customers can see this restaurant". Admin-added
-- rows (owner_id is null) behave exactly as before this migration.
create or replace function is_restaurant_public(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from restaurants r
    where r.id = rid
      and r.is_published
      and not r.hidden_by_admin
      and (r.owner_id is null or is_approved_owner(r.owner_id))
  );
$$;

-- Used by the embed-restaurant Edge Function to authorize a caller before
-- it writes vibe_embedding with the service-role client.
create or replace function can_edit_restaurant(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select is_admin()
    or (
      is_active_owner()
      and exists (
        select 1 from restaurants
        where id = rid and owner_id = auth.uid()
      )
    );
$$;

grant execute on function
  is_approved_owner(uuid),
  is_active_owner(),
  is_restaurant_public(uuid),
  can_edit_restaurant(uuid)
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Row Level Security changes
-- ---------------------------------------------------------------------

-- Public visibility now also requires "not hidden by an admin" and, for
-- owner-managed rows, "owner is approved". Policy names are unchanged.
-- match_restaurants() (mood search) is SECURITY INVOKER, so it inherits
-- this automatically.
drop policy "restaurants_select_published_or_admin" on restaurants;
create policy "restaurants_select_published_or_admin"
  on restaurants for select
  using (
    is_admin()
    or (
      is_published
      and not hidden_by_admin
      and (owner_id is null or is_approved_owner(owner_id))
    )
  );

drop policy "menu_items_select_published_or_admin" on menu_items;
create policy "menu_items_select_published_or_admin"
  on menu_items for select
  using (
    is_admin()
    or (not hidden_by_admin and is_restaurant_public(restaurant_id))
  );

drop policy "reviews_select_published_or_admin" on reviews;
create policy "reviews_select_published_or_admin"
  on reviews for select
  using (is_admin() or is_restaurant_public(restaurant_id));

-- Owner writes additionally require an active (pending/approved) owner
-- account. The owner SELECT policies stay as they are, so a suspended owner
-- can still see their own listing (and the moderation note on it).
drop policy "restaurants_insert_owner" on restaurants;
create policy "restaurants_insert_owner"
  on restaurants for insert
  to authenticated
  with check (owner_id = auth.uid() and is_active_owner());

drop policy "restaurants_update_own_owner" on restaurants;
create policy "restaurants_update_own_owner"
  on restaurants for update
  using (owner_id = auth.uid() and is_active_owner())
  with check (owner_id = auth.uid() and is_active_owner());

drop policy "menu_items_insert_owner" on menu_items;
create policy "menu_items_insert_owner"
  on menu_items for insert
  to authenticated
  with check (
    is_active_owner()
    and exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  );

drop policy "menu_items_update_own_owner" on menu_items;
create policy "menu_items_update_own_owner"
  on menu_items for update
  using (
    is_active_owner()
    and exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  )
  with check (
    is_active_owner()
    and exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  );

drop policy "menu_items_delete_own_owner" on menu_items;
create policy "menu_items_delete_own_owner"
  on menu_items for delete
  using (
    is_active_owner()
    and exists (
      select 1 from restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 4. Guard triggers: columns only admins may change
-- ---------------------------------------------------------------------

-- RLS decides which ROWS a caller may write, not which COLUMNS, and the
-- owner policies above let an owner update their own rows. These triggers
-- pin the admin-only columns for ordinary API callers.
--
-- "Ordinary API caller" = the request runs as anon/authenticated and isn't
-- an admin. service_role (Edge Functions, backfills) and direct SQL
-- (postgres, migrations) are left alone. The check has to live inline in
-- each (SECURITY INVOKER) trigger function: current_user inside a SECURITY
-- DEFINER helper would always be the function owner.

create or replace function restaurant_owners_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') and not is_admin() then
    if tg_op = 'INSERT' then
      -- Self-registration always starts unverified, whatever the client
      -- sent, and records the email the session actually belongs to.
      new.status := 'pending';
      new.status_note := null;
      new.status_changed_at := null;
      new.status_changed_by := null;
      new.email := coalesce(auth.jwt() ->> 'email', new.email);
    else
      new.status := old.status;
      new.status_note := old.status_note;
      new.status_changed_at := old.status_changed_at;
      new.status_changed_by := old.status_changed_by;
      new.email := old.email;
      new.created_at := old.created_at;
    end if;
  elsif (tg_op = 'INSERT' and new.status <> 'pending')
     or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    -- An admin (or SQL) changed the verification state: stamp it so the
    -- admin portal has an audit trail without having to remember to.
    new.status_changed_at := now();
    new.status_changed_by := coalesce(auth.uid(), new.status_changed_by);
  end if;

  return new;
end;
$$;

create trigger restaurant_owners_guard
  before insert or update on restaurant_owners
  for each row execute function restaurant_owners_guard();

create or replace function restaurants_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') and not is_admin() then
    if tg_op = 'INSERT' then
      -- vibe_embedding is only ever written by the embed-restaurant Edge
      -- Function (service role). Letting owners write it directly would let
      -- them hand-pick a vector that ranks first for every mood search.
      new.vibe_embedding := null;
      new.hidden_by_admin := false;
      new.moderation_note := null;
    else
      new.vibe_embedding := old.vibe_embedding;
      new.hidden_by_admin := old.hidden_by_admin;
      new.moderation_note := old.moderation_note;
      new.created_at := old.created_at;
    end if;
  end if;

  return new;
end;
$$;

create trigger restaurants_guard
  before insert or update on restaurants
  for each row execute function restaurants_guard();

create or replace function menu_items_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') and not is_admin() then
    if tg_op = 'INSERT' then
      new.hidden_by_admin := false;
      new.moderation_note := null;
    else
      new.hidden_by_admin := old.hidden_by_admin;
      new.moderation_note := old.moderation_note;
      new.created_at := old.created_at;
    end if;
  end if;

  return new;
end;
$$;

create trigger menu_items_guard
  before insert or update on menu_items
  for each row execute function menu_items_guard();

-- ---------------------------------------------------------------------
-- 5. Customer reports
-- ---------------------------------------------------------------------

create table content_reports (
  id uuid primary key default gen_random_uuid(),
  -- Nullable + SET NULL so deleting a customer account doesn't erase the
  -- moderation history of the content they reported.
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  -- Null = the report is about the restaurant listing itself.
  menu_item_id uuid references menu_items (id) on delete cascade,
  reason text not null
    constraint content_reports_reason_check
    check (reason in ('inaccurate', 'offensive', 'spam', 'impersonation', 'closed', 'other')),
  details text
    constraint content_reports_details_length check (char_length(details) <= 2000),
  status text not null default 'open'
    constraint content_reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes text,
  resolved_at timestamp with time zone,
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamp with time zone not null default now()
);

create index content_reports_status_created_at_idx on content_reports (status, created_at desc);
create index content_reports_restaurant_id_idx on content_reports (restaurant_id);
create index content_reports_menu_item_id_idx on content_reports (menu_item_id);

-- One unresolved report per customer per target, so one person can't flood
-- the admin queue about the same thing. They can report it again once an
-- admin has resolved or dismissed the earlier one.
create unique index content_reports_one_open_per_target_idx
  on content_reports (
    reporter_id,
    restaurant_id,
    coalesce(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status in ('open', 'reviewing');

-- Stamps resolved_at/resolved_by when an admin closes a report.
create or replace function content_reports_stamp_resolution()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status in ('resolved', 'dismissed')
     and old.status not in ('resolved', 'dismissed') then
    new.resolved_at := coalesce(new.resolved_at, now());
    new.resolved_by := coalesce(new.resolved_by, auth.uid());
  end if;

  return new;
end;
$$;

create trigger content_reports_stamp_resolution
  before update on content_reports
  for each row execute function content_reports_stamp_resolution();

alter table content_reports enable row level security;

-- Any signed-in user can report content they can actually see (the
-- restaurants/menu_items subqueries run under the reporter's own RLS). A new
-- report always starts open with no admin fields filled in.
create policy "content_reports_insert_self"
  on content_reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'open'
    and admin_notes is null
    and resolved_at is null
    and resolved_by is null
    and exists (
      select 1 from restaurants r
      where r.id = content_reports.restaurant_id
    )
    and (
      menu_item_id is null
      or exists (
        select 1 from menu_items m
        where m.id = content_reports.menu_item_id
          and m.restaurant_id = content_reports.restaurant_id
      )
    )
  );

-- Reporters see their own reports; owners deliberately can't see reports
-- about their content (that would expose who reported them).
create policy "content_reports_select_own_or_admin"
  on content_reports for select
  using (reporter_id = auth.uid() or is_admin());

create policy "content_reports_update_admin"
  on content_reports for update
  using (is_admin())
  with check (is_admin());

create policy "content_reports_delete_admin"
  on content_reports for delete
  using (is_admin());

grant select, insert, update, delete on table content_reports to authenticated;
grant all on table content_reports to service_role;

-- ---------------------------------------------------------------------
-- 6. Storage: owner photo uploads
-- ---------------------------------------------------------------------

-- Owners upload into their own folder, owners/<their uid>/..., of the
-- existing public restaurant-photos bucket. Public read and the admin
-- policies from foundations.sql are unchanged.
create policy "restaurant_photos_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'restaurant-photos'
    and (storage.foldername(name))[1] = 'owners'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_active_owner()
  );

create policy "restaurant_photos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and (storage.foldername(name))[1] = 'owners'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_active_owner()
  )
  with check (
    bucket_id = 'restaurant-photos'
    and (storage.foldername(name))[1] = 'owners'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_active_owner()
  );

create policy "restaurant_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and (storage.foldername(name))[1] = 'owners'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_active_owner()
  );

-- Server-side upload limits (the owner portal also checks these client-side,
-- but that's only a convenience). Photos are shown on mobile data in Sri
-- Lanka (PROJECT.md section 10), so 5 MB is already generous.
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'restaurant-photos';
