-- AI helpers in the owner app (docs/menu-import.md, docs/listing-coach.md):
-- a per-owner daily usage count, and the Listing Coach agent's saved
-- conversations.
--
-- Both tables are written only by Edge Functions with the service role.
-- Owners can read their own rows (to see what the coach did) but not write
-- them: they can't reset their usage count, and they can't fake tool
-- results inside a paused coach conversation.

create table owner_ai_usage (
  id bigint generated always as identity primary key,
  owner_id uuid not null references restaurant_owners (id) on delete cascade,
  feature text not null
    constraint owner_ai_usage_feature_check
    check (feature in ('menu_import', 'listing_check', 'listing_suggest', 'listing_coach')),
  created_at timestamp with time zone not null default now()
);

create index owner_ai_usage_owner_created_idx on owner_ai_usage (owner_id, created_at desc);

alter table owner_ai_usage enable row level security;

create policy "owner_ai_usage_select_own"
  on owner_ai_usage for select
  using (owner_id = auth.uid());

grant select on table owner_ai_usage to authenticated;
grant all on table owner_ai_usage to service_role;

create table coach_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references restaurant_owners (id) on delete cascade,
  -- Null while the restaurant is still being created (not saved yet).
  restaurant_id uuid references restaurants (id) on delete cascade,
  -- The Gemini conversation so far, and the facts the tools read from.
  state jsonb not null,
  -- The trace: one entry per tool call, for "why did it do that?".
  steps jsonb not null default '[]',
  status text not null default 'running'
    constraint coach_sessions_status_check
    check (status in ('running', 'waiting_for_owner', 'done', 'failed')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index coach_sessions_owner_idx on coach_sessions (owner_id, created_at desc);

alter table coach_sessions enable row level security;

create policy "coach_sessions_select_own"
  on coach_sessions for select
  using (owner_id = auth.uid());

grant select on table coach_sessions to authenticated;
grant all on table coach_sessions to service_role;
