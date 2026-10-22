-- pgTAP tests for migrations/20261022120000_one_review_per_customer.sql.
--
-- Run against a local stack:
--   npx supabase start
--   npx supabase test db
--
-- One transaction, rolled back at the end.

begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Fixtures (as postgres): one customer, one public and one draft restaurant.
insert into auth.users (id, email, aud, role) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@example.test', 'authenticated', 'authenticated');
insert into customers (id, email) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@example.test');
insert into restaurants (id, name, area, is_published) values
  ('00000000-0000-0000-0000-0000000000f0', 'Public cafe', 'Nugegoda', true),
  ('00000000-0000-0000-0000-0000000000f1', 'Draft cafe', 'Nugegoda', false);

select tests.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');

select lives_ok(
  $$ insert into reviews (restaurant_id, customer_id, rating, review_text)
     values ('00000000-0000-0000-0000-0000000000f0', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, 'Lovely') $$,
  'a customer can review a public restaurant'
);

select throws_ok(
  $$ insert into reviews (restaurant_id, customer_id, rating, review_text)
     values ('00000000-0000-0000-0000-0000000000f0', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 'Again') $$,
  '23505',
  null,
  'a second review of the same restaurant is refused'
);

select throws_ok(
  $$ insert into reviews (restaurant_id, customer_id, rating, review_text)
     values ('00000000-0000-0000-0000-0000000000f1', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, 'Sneaky') $$,
  '42501',
  null,
  'a draft restaurant cannot be reviewed'
);

reset role;
select is(
  (select count(*)::int from reviews where customer_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1,
  'only the first review was stored'
);

select * from finish();
rollback;
