-- Mood search stage 2: menus and reviews become searchable.
--
-- Each menu item and each review gets one "chunk" row in search_chunks: a
-- short text plus its gte-small embedding. Triggers keep the text in sync and
-- null the embedding whenever the text changes; the embed-chunks Edge
-- Function (run every minute by pg_cron below) fills the nulls back in.
-- match_restaurants() then ranks each restaurant by its best match across
-- its vibe_description and its chunks, and returns the closest chunks as
-- evidence for the generated answer.
--
-- Meant to be applied once, like the other migrations.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------

create table search_chunks (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  -- Exactly one source per chunk; deleting the source deletes the chunk.
  menu_item_id uuid unique references menu_items (id) on delete cascade,
  review_id uuid unique references reviews (id) on delete cascade,
  content text not null,
  -- Null = waiting for embed-chunks.
  embedding vector(384),
  updated_at timestamp with time zone not null default now(),
  check (num_nonnulls(menu_item_id, review_id) = 1)
);

create index search_chunks_restaurant_id_idx on search_chunks (restaurant_id);
create index search_chunks_pending_idx on search_chunks (id) where embedding is null;

-- Readable exactly when its source row is: the subqueries run under the
-- caller's RLS on menu_items/reviews, so hidden items, drafts and unapproved
-- owners' listings stay out of search without restating those rules here.
-- No insert/update/delete policies: only the triggers below (security
-- definer) and embed-chunks (service role) write, so nobody can plant an
-- embedding that ranks first for every search.
alter table search_chunks enable row level security;

create policy "search_chunks_select_visible"
  on search_chunks for select
  using (
    exists (select 1 from menu_items m where m.id = search_chunks.menu_item_id)
    or exists (select 1 from reviews v where v.id = search_chunks.review_id)
  );

grant select on table search_chunks to anon, authenticated;
grant all on table search_chunks to service_role;

-- ---------------------------------------------------------------------
-- 2. Chunk text + sync triggers
-- ---------------------------------------------------------------------

create or replace function menu_item_chunk_text(m menu_items)
returns text
language sql
immutable
as $$
  select concat_ws(' ',
    'Menu item: ' || m.item_name
      || coalesce(' (' || nullif(trim(m.category), '') || ')', '') || '.',
    nullif(trim(m.description), ''),
    'Price: LKR ' || m.price::text || '.'
  );
$$;

-- Rating + text only: who wrote it never goes into search or to Gemini.
-- Null when there's no text (a bare star rating says nothing searchable).
create or replace function review_chunk_text(r reviews)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(r.review_text), '') is null then null
    else 'Customer review'
      || coalesce(' (' || r.rating::text || '/5)', '')
      || ': ' || trim(r.review_text)
  end;
$$;

-- Upsert keeps the old embedding only if the text didn't change.
create or replace function sync_menu_item_chunk()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.restaurant_id is null then
    delete from search_chunks where menu_item_id = new.id;
  else
    insert into search_chunks (restaurant_id, menu_item_id, content)
    values (new.restaurant_id, new.id, menu_item_chunk_text(new))
    on conflict (menu_item_id) do update
      set restaurant_id = excluded.restaurant_id,
          content = excluded.content,
          embedding = case
            when search_chunks.content = excluded.content
              then search_chunks.embedding
          end,
          updated_at = now();
  end if;
  return null;
end;
$$;

create or replace function sync_review_chunk()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.restaurant_id is null or review_chunk_text(new) is null then
    delete from search_chunks where review_id = new.id;
  else
    insert into search_chunks (restaurant_id, review_id, content)
    values (new.restaurant_id, new.id, review_chunk_text(new))
    on conflict (review_id) do update
      set restaurant_id = excluded.restaurant_id,
          content = excluded.content,
          embedding = case
            when search_chunks.content = excluded.content
              then search_chunks.embedding
          end,
          updated_at = now();
  end if;
  return null;
end;
$$;

create trigger menu_items_sync_chunk
  after insert or update on menu_items
  for each row execute function sync_menu_item_chunk();

create trigger reviews_sync_chunk
  after insert or update on reviews
  for each row execute function sync_review_chunk();

-- Backfill: chunks for everything that already exists (embedded by the
-- first cron runs after this migration).
insert into search_chunks (restaurant_id, menu_item_id, content)
select m.restaurant_id, m.id, menu_item_chunk_text(m)
from menu_items m
where m.restaurant_id is not null;

insert into search_chunks (restaurant_id, review_id, content)
select r.restaurant_id, r.id, review_chunk_text(r)
from reviews r
where r.restaurant_id is not null and review_chunk_text(r) is not null;

-- ---------------------------------------------------------------------
-- 3. Search: best of vibe + chunks, with evidence
-- ---------------------------------------------------------------------

-- Return type changes (new evidence column), so drop and recreate.
-- Still SECURITY INVOKER: RLS on restaurants and search_chunks applies.
drop function match_restaurants(vector, int);

create function match_restaurants(
  query_embedding vector(384),
  match_count int default 8
)
returns table (
  id uuid,
  name text,
  area text,
  cuisine_type text[],
  price_range text,
  vibe_description text,
  cover_photo_url text,
  similarity float,
  evidence text[]
)
language sql
stable
as $$
  with chunk_hits as (
    select
      c.restaurant_id,
      c.content,
      1 - (c.embedding <=> query_embedding) as sim,
      row_number() over (
        partition by c.restaurant_id
        order by c.embedding <=> query_embedding
      ) as rn
    from search_chunks c
    where c.embedding is not null
  ),
  best_chunks as (
    select
      restaurant_id,
      max(sim) as sim,
      array_agg(content order by sim desc) filter (where rn <= 2) as evidence
    from chunk_hits
    group by restaurant_id
  )
  select
    r.id,
    r.name,
    r.area,
    r.cuisine_type,
    r.price_range,
    r.vibe_description,
    r.cover_photo_url,
    -- greatest() skips nulls: a restaurant with no vibe embedding can still
    -- match on its menu or reviews, and vice versa.
    greatest(1 - (r.vibe_embedding <=> query_embedding), b.sim) as similarity,
    coalesce(b.evidence, '{}') as evidence
  from restaurants r
  left join best_chunks b on b.restaurant_id = r.id
  where r.vibe_embedding is not null or b.restaurant_id is not null
  order by similarity desc
  limit match_count;
$$;

grant execute on function match_restaurants(vector, int) to anon, authenticated;

-- shortcut: sequential scan over every chunk, fine for hundreds of chunks;
-- add an hnsw index on search_chunks.embedding once explain analyze shows
-- this scan as the slow part.

-- ---------------------------------------------------------------------
-- 4. Embedding queue: pg_cron wakes embed-chunks when work is waiting
-- ---------------------------------------------------------------------

-- Needs two Vault secrets, created once by hand (see docs/mood-search.md):
-- project_url and service_role_key. Until they exist, or while nothing is
-- pending, the job does nothing.
select cron.schedule(
  'embed-search-chunks',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/embed-chunks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from public.search_chunks where embedding is null)
    and exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'service_role_key');
  $$
);
