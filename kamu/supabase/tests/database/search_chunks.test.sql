-- pgTAP tests for migrations/20261025120000_search_chunks.sql.
--
-- Run against a local stack:
--   npx supabase start
--   npx supabase test db
--
-- One transaction, rolled back at the end.

begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

-- Fixtures (as postgres): a public restaurant with a visible and a hidden
-- menu item, and a review.
insert into auth.users (id, email, aud, role) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@example.test', 'authenticated', 'authenticated');
insert into customers (id, email) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@example.test');
insert into restaurants (id, name, area, is_published) values
  ('00000000-0000-0000-0000-0000000000e0', 'Chunk cafe', 'Kotte', true);
insert into menu_items (id, restaurant_id, item_name, description, price, category) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e0',
   'Vegan rice and curry', 'Red rice, dhal, jackfruit', 850, 'Mains');
insert into menu_items (id, restaurant_id, item_name, price, hidden_by_admin) values
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e0',
   'Hidden dish', 500, true);
insert into reviews (id, restaurant_id, customer_id, rating, review_text) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e0',
   'dddddddd-dddd-dddd-dddd-dddddddddddd', 5, '  Best kottu around  ');

select is(
  (select content from search_chunks where menu_item_id = '00000000-0000-0000-0000-0000000000e1'),
  'Menu item: Vegan rice and curry (Mains). Red rice, dhal, jackfruit Price: LKR 850.',
  'a new menu item gets a chunk'
);

select is(
  (select content from search_chunks where review_id = '00000000-0000-0000-0000-0000000000e3'),
  'Customer review (5/5): Best kottu around',
  'a review chunk has the rating and text, nothing about the author'
);

-- Pretend embed-chunks ran.
update search_chunks set embedding = array_fill(0.1, array[384])::vector;

update menu_items set price = 850 where id = '00000000-0000-0000-0000-0000000000e1';
select isnt(
  (select embedding from search_chunks where menu_item_id = '00000000-0000-0000-0000-0000000000e1'),
  null,
  'an update that leaves the text unchanged keeps the embedding'
);

update menu_items set price = 900 where id = '00000000-0000-0000-0000-0000000000e1';
select is(
  (select embedding from search_chunks where menu_item_id = '00000000-0000-0000-0000-0000000000e1'),
  null,
  'changing the text queues the chunk for re-embedding'
);

update reviews set review_text = '' where id = '00000000-0000-0000-0000-0000000000e3';
select is(
  (select count(*)::int from search_chunks where review_id = '00000000-0000-0000-0000-0000000000e3'),
  0,
  'a review with no text has no chunk'
);

-- Visibility as a logged-out visitor.
set local role anon;

select is(
  (select count(*)::int from search_chunks where restaurant_id = '00000000-0000-0000-0000-0000000000e0'),
  1,
  'anon sees the visible menu item chunk but not the hidden one'
);

select throws_ok(
  $$ update search_chunks set embedding = null $$,
  '42501',
  null,
  'anon cannot write chunks'
);

reset role;

select * from finish();
rollback;
