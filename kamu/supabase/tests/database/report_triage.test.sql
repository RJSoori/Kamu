-- pgTAP tests for migrations/20261104120000_report_triage.sql: only admins
-- can read or write triage suggestions.
--
--   npx supabase start
--   npx supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

create schema tests;

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

-- Fixtures (as postgres): C = customer who reports, D = admin.
insert into auth.users (id, email, aud, role) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@example.test', 'authenticated', 'authenticated'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@example.test', 'authenticated', 'authenticated');
insert into admin_users (id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd');
insert into restaurants (id, name, area, is_published) values
  ('00000000-0000-0000-0000-0000000000f0', 'Reported Cafe', 'Colombo 03', true);
insert into content_reports (id, reporter_id, restaurant_id, reason) values
  ('00000000-0000-0000-0000-0000000000e1', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   '00000000-0000-0000-0000-0000000000f0', 'spam');

-- The reporter can't plant a suggestion on their own report.
select tests.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
select throws_ok(
  $$ insert into report_triage (report_id, suggestion)
     values ('00000000-0000-0000-0000-0000000000e1', '{"action":"suspend_owner"}') $$,
  '42501',
  null,
  'a customer cannot write a triage suggestion'
);

-- An admin can write and read one.
select tests.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
select lives_ok(
  $$ insert into report_triage (report_id, suggestion)
     values ('00000000-0000-0000-0000-0000000000e1', '{"action":"dismiss"}') $$,
  'an admin can save a triage suggestion'
);
select is(
  (select suggestion->>'action' from report_triage),
  'dismiss',
  'an admin can read it back'
);
select is(
  (select created_by from report_triage),
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'created_by is stamped with the admin'
);

-- The customer can't see it.
select tests.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
select is_empty(
  $$ select * from report_triage $$,
  'a customer cannot read triage suggestions'
);

select * from finish();
rollback;
