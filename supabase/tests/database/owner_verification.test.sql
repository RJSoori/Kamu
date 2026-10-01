-- pgTAP tests for migrations/20261001120000_owner_verification_and_reports.sql
-- (owner verification, content takedown, customer reports, owner photo
-- uploads).
--
-- Run against a local stack:
--   npx supabase start
--   npx supabase test db
--
-- Everything runs in one transaction and is rolled back at the end, so it
-- leaves no data behind.
--
-- Cast of characters (fixed UUIDs so the SQL strings below stay readable):
--   A  aaaaaaaa-...  restaurant owner, gets approved
--   B  bbbbbbbb-...  restaurant owner, stays pending
--   C  cccccccc-...  plain customer (not an owner)
--   D  dddddddd-...  admin
--   R0 ...f0  admin-added restaurant (no owner)
--   R1 ...a1  owner A's restaurant;  M1 ...a2 / M2 ...a3 its menu items
--   R2 ...b1  owner B's (pending) restaurant

begin;

create extension if not exists pgtap with schema extensions;

select plan(56);

-- ---------------------------------------------------------------------
-- Helpers: act as a given user / as anon (rolled back with everything else)
-- ---------------------------------------------------------------------

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', uid,
      'role', 'authenticated',
      'email', uid::text || '@example.test'
    )::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create function tests.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa@example.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb@example.test', 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc@example.test', 'authenticated', 'authenticated'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd@example.test', 'authenticated', 'authenticated');

insert into admin_users (id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd');
insert into customers (id, email) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc@example.test');

insert into restaurants (id, name, area, is_published) values
  ('00000000-0000-0000-0000-0000000000f0', 'Admin Added Cafe', 'Colombo 03', true);

-- ---------------------------------------------------------------------
-- 1. Registration can't self-approve
-- ---------------------------------------------------------------------

select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select lives_ok(
  $$ insert into restaurant_owners (id, email, display_name, status, status_note)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'spoofed@evil.test', 'Owner A', 'approved', 'self-approved') $$,
  'an owner can self-register'
);
select is(
  (select status from restaurant_owners where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'pending',
  'self-registration is forced to pending, whatever the client sends'
);
select is(
  (select status_note from restaurant_owners where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  null,
  'self-registration cannot pre-fill the admin note'
);
select is(
  (select email from restaurant_owners where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa@example.test',
  'owner email comes from the session, not the client'
);

update restaurant_owners set status = 'approved' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is(
  (select status from restaurant_owners where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'pending',
  'an owner cannot approve themselves'
);

update restaurant_owners set phone = '+94 77 123 4567' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is(
  (select phone from restaurant_owners where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '+94 77 123 4567',
  'an owner can still edit their own contact details'
);

select tests.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
insert into restaurant_owners (id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- ---------------------------------------------------------------------
-- 2. Pending owners can build drafts, nothing is public yet
-- ---------------------------------------------------------------------

select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select lives_ok(
  $$ insert into restaurants (id, name, area, owner_id, is_published, vibe_embedding, hidden_by_admin)
     values ('00000000-0000-0000-0000-0000000000a1', 'Owner A Cafe', 'Nugegoda',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true,
             array_fill(0.5::real, array[384])::vector, true) $$,
  'a pending owner can create a listing'
);
select is(
  (select vibe_embedding is null from restaurants where id = '00000000-0000-0000-0000-0000000000a1'),
  true,
  'an owner-supplied vibe_embedding is discarded on insert'
);
select is(
  (select hidden_by_admin from restaurants where id = '00000000-0000-0000-0000-0000000000a1'),
  false,
  'an owner cannot pre-set hidden_by_admin'
);
select lives_ok(
  $$ insert into menu_items (id, restaurant_id, item_name, price, category) values
       ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'Kottu', 1200, 'Mains'),
       ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'Faluda', 600, 'Beverages') $$,
  'a pending owner can add menu items'
);

select tests.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
insert into restaurants (id, name, area, owner_id, is_published)
values ('00000000-0000-0000-0000-0000000000b1', 'Owner B Bistro', 'Kotte', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select tests.act_as_anon();

select is_empty(
  $$ select id from restaurants where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'a pending owner''s published listing is not public'
);
select is_empty(
  $$ select id from menu_items where restaurant_id = '00000000-0000-0000-0000-0000000000a1' $$,
  '...and neither are its menu items'
);
select results_eq(
  $$ select name from restaurants where id = '00000000-0000-0000-0000-0000000000f0' $$,
  $$ values ('Admin Added Cafe'::text) $$,
  'admin-added restaurants (no owner) are public exactly as before'
);

-- ---------------------------------------------------------------------
-- 3. Admin approval
-- ---------------------------------------------------------------------

select tests.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');

update restaurant_owners
set status = 'approved', status_note = 'Verified by phone'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select status from restaurant_owners where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'approved',
  'an admin can approve an owner'
);
select is(
  (select status_changed_by from restaurant_owners where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'approval records which admin did it'
);
select isnt(
  (select status_changed_at from restaurant_owners where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  null,
  'approval is timestamped'
);

select tests.act_as_anon();

select results_eq(
  $$ select name from restaurants where id = '00000000-0000-0000-0000-0000000000a1' $$,
  $$ values ('Owner A Cafe'::text) $$,
  'the listing goes public as soon as its owner is approved'
);
select results_eq(
  $$ select item_name from menu_items where restaurant_id = '00000000-0000-0000-0000-0000000000a1' order by item_name $$,
  $$ values ('Faluda'::text), ('Kottu'::text) $$,
  '...along with its menu items'
);
select is_empty(
  $$ select id from restaurants where id = '00000000-0000-0000-0000-0000000000b1' $$,
  'another owner who is still pending stays hidden'
);

-- ---------------------------------------------------------------------
-- 4. Owners edit freely, except the admin-only columns
-- ---------------------------------------------------------------------

select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

update restaurants
set name = 'Owner A Cafe & Bakery', vibe_embedding = array_fill(0.5::real, array[384])::vector
where id = '00000000-0000-0000-0000-0000000000a1';

select is(
  (select name from restaurants where id = '00000000-0000-0000-0000-0000000000a1'),
  'Owner A Cafe & Bakery',
  'an approved owner can edit their listing'
);
select is(
  (select vibe_embedding is null from restaurants where id = '00000000-0000-0000-0000-0000000000a1'),
  true,
  'an owner cannot write vibe_embedding directly'
);

-- ---------------------------------------------------------------------
-- 5. Other owners and customers can't touch it
-- ---------------------------------------------------------------------

select tests.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

update restaurants set name = 'Hijacked' where id = '00000000-0000-0000-0000-0000000000a1';
select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select is(
  (select name from restaurants where id = '00000000-0000-0000-0000-0000000000a1'),
  'Owner A Cafe & Bakery',
  'another owner cannot edit the listing'
);

select tests.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select throws_ok(
  $$ insert into menu_items (restaurant_id, item_name)
     values ('00000000-0000-0000-0000-0000000000a1', 'Sneaky item') $$,
  '42501', null,
  'another owner cannot add menu items to it'
);
select throws_ok(
  $$ insert into restaurants (name, area, owner_id)
     values ('Fake', 'Colombo 03', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '42501', null,
  'an owner cannot create a listing in someone else''s name'
);

select tests.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
select throws_ok(
  $$ insert into restaurants (name, area, owner_id)
     values ('Customer Cafe', 'Colombo 03', 'cccccccc-cccc-cccc-cccc-cccccccccccc') $$,
  '42501', null,
  'an account that never registered as an owner cannot create listings'
);
select lives_ok(
  $$ insert into reviews (restaurant_id, customer_id, rating, review_text)
     values ('00000000-0000-0000-0000-0000000000a1', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, 'Great kottu') $$,
  'a customer can review an approved owner''s restaurant'
);

-- ---------------------------------------------------------------------
-- 6. Admin takedowns stick
-- ---------------------------------------------------------------------

select tests.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
update menu_items
set hidden_by_admin = true, moderation_note = 'Photo is not of this dish'
where id = '00000000-0000-0000-0000-0000000000a2';

select tests.act_as_anon();
select is_empty(
  $$ select id from menu_items where id = '00000000-0000-0000-0000-0000000000a2' $$,
  'a menu item hidden by an admin is not public'
);

select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select results_eq(
  $$ select hidden_by_admin, moderation_note from menu_items where id = '00000000-0000-0000-0000-0000000000a2' $$,
  $$ values (true, 'Photo is not of this dish'::text) $$,
  'the owner still sees their hidden item, with the reason'
);
update menu_items set hidden_by_admin = false where id = '00000000-0000-0000-0000-0000000000a2';
select is(
  (select hidden_by_admin from menu_items where id = '00000000-0000-0000-0000-0000000000a2'),
  true,
  'an owner cannot un-hide an item an admin hid'
);

select tests.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
update restaurants
set hidden_by_admin = true, moderation_note = 'Reported as impersonation'
where id = '00000000-0000-0000-0000-0000000000a1';

select tests.act_as_anon();
select is_empty(
  $$ select id from restaurants where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'a restaurant hidden by an admin is not public'
);
select is_empty(
  $$ select id from reviews where restaurant_id = '00000000-0000-0000-0000-0000000000a1' $$,
  '...and neither are its reviews'
);

select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
update restaurants set hidden_by_admin = false, is_published = true where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select hidden_by_admin from restaurants where id = '00000000-0000-0000-0000-0000000000a1'),
  true,
  'an owner cannot undo a takedown by re-publishing'
);

select tests.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
update restaurants set hidden_by_admin = false, moderation_note = null where id = '00000000-0000-0000-0000-0000000000a1';

-- ---------------------------------------------------------------------
-- 7. Suspension hides everything and makes the owner read-only
-- ---------------------------------------------------------------------

select tests.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
update restaurant_owners
set status = 'suspended', status_note = 'Repeated fake listings'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select tests.act_as_anon();
select is_empty(
  $$ select id from restaurants where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'a suspended owner''s listings disappear from public view'
);
select is_empty(
  $$ select id from menu_items where restaurant_id = '00000000-0000-0000-0000-0000000000a1' $$,
  '...along with their menu items'
);

select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
update restaurants set name = 'Still here' where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select name from restaurants where id = '00000000-0000-0000-0000-0000000000a1'),
  'Owner A Cafe & Bakery',
  'a suspended owner cannot edit (but can still see) their listing'
);
select throws_ok(
  $$ insert into restaurants (name, area, owner_id)
     values ('New one', 'Nugegoda', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '42501', null,
  'a suspended owner cannot create listings'
);
select ok(
  not can_edit_restaurant('00000000-0000-0000-0000-0000000000a1'),
  'can_edit_restaurant: false for a suspended owner'
);

-- Back to approved for the remaining sections.
select tests.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
update restaurant_owners set status = 'approved', status_note = null where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ---------------------------------------------------------------------
-- 8. can_edit_restaurant (used by the embed-restaurant Edge Function)
-- ---------------------------------------------------------------------

select ok(
  can_edit_restaurant('00000000-0000-0000-0000-0000000000a1'),
  'can_edit_restaurant: true for an admin'
);
select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select ok(
  can_edit_restaurant('00000000-0000-0000-0000-0000000000a1'),
  'can_edit_restaurant: true for the active owner'
);
select tests.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select ok(
  not can_edit_restaurant('00000000-0000-0000-0000-0000000000a1'),
  'can_edit_restaurant: false for another owner'
);

-- ---------------------------------------------------------------------
-- 9. Customer reports
-- ---------------------------------------------------------------------

select tests.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');

select lives_ok(
  $$ insert into content_reports (restaurant_id, reason, details)
     values ('00000000-0000-0000-0000-0000000000a1', 'inaccurate', 'Menu prices are out of date') $$,
  'a customer can report a public restaurant'
);
select is(
  (select reporter_id from content_reports where restaurant_id = '00000000-0000-0000-0000-0000000000a1'),
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'reporter_id defaults to the signed-in user'
);
select throws_ok(
  $$ insert into content_reports (restaurant_id, reason)
     values ('00000000-0000-0000-0000-0000000000a1', 'spam') $$,
  '23505', null,
  'only one open report per customer per target'
);
select lives_ok(
  $$ insert into content_reports (restaurant_id, menu_item_id, reason)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a3', 'offensive') $$,
  'a customer can report a menu item'
);
select throws_ok(
  $$ insert into content_reports (restaurant_id, reason, status)
     values ('00000000-0000-0000-0000-0000000000f0', 'other', 'resolved') $$,
  '42501', null,
  'a report cannot be created already resolved'
);
select throws_ok(
  $$ insert into content_reports (reporter_id, restaurant_id, reason)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-0000000000f0', 'spam') $$,
  '42501', null,
  'a report cannot be filed in someone else''s name'
);
select throws_ok(
  $$ insert into content_reports (restaurant_id, reason)
     values ('00000000-0000-0000-0000-0000000000b1', 'spam') $$,
  '42501', null,
  'content the reporter cannot see cannot be reported'
);

update content_reports set status = 'dismissed';
select is(
  (select count(*)::int from content_reports where status = 'open'),
  2,
  'a reporter cannot change the status of their reports'
);

select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select is_empty(
  $$ select id from content_reports $$,
  'owners cannot see reports about their content (or who filed them)'
);

select tests.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
select is(
  (select count(*)::int from content_reports),
  2,
  'admins see every report'
);

update content_reports
set status = 'resolved', admin_notes = 'Owner updated prices'
where restaurant_id = '00000000-0000-0000-0000-0000000000a1' and menu_item_id is null;

select results_eq(
  $$ select resolved_at is not null, resolved_by from content_reports where status = 'resolved' $$,
  $$ values (true, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid) $$,
  'resolving a report stamps resolved_at and resolved_by'
);

select tests.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
select lives_ok(
  $$ insert into content_reports (restaurant_id, reason)
     values ('00000000-0000-0000-0000-0000000000a1', 'closed') $$,
  'the same target can be reported again once the earlier report is resolved'
);

-- ---------------------------------------------------------------------
-- 10. Owner photo uploads (storage.objects policies)
-- ---------------------------------------------------------------------

select tests.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('restaurant-photos', 'owners/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/00000000-0000-0000-0000-0000000000a1/cover.jpg') $$,
  'an active owner can upload into their own folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('restaurant-photos', 'owners/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/x.jpg') $$,
  '42501', null,
  'an owner cannot upload into another owner''s folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('restaurant-photos', 'seed/x.jpg') $$,
  '42501', null,
  'an owner cannot upload outside the owners/ folder'
);

select tests.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('restaurant-photos', 'owners/cccccccc-cccc-cccc-cccc-cccccccccccc/x.jpg') $$,
  '42501', null,
  'an account that is not an owner cannot upload'
);

reset role;
select * from finish();
rollback;
