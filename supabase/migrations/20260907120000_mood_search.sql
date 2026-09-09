-- Phase 4: mood search. Adds the similarity-search RPC that the
-- mood-search Edge Function calls; embeddings themselves are written by the
-- embed-restaurant Edge Function (supabase/functions/), not by SQL here.

-- Deliberately NOT `security definer`: runs as the calling role, so a plain
-- `select * from restaurants` from inside this function still goes through
-- restaurants_select_published_or_admin exactly as it would from any other
-- query. Anon/customer callers only ever get published rows back; an admin
-- session sees everything. Nothing extra to enforce here.
create or replace function match_restaurants(
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
  similarity float
)
language sql
stable
as $$
  select
    r.id,
    r.name,
    r.area,
    r.cuisine_type,
    r.price_range,
    r.vibe_description,
    r.cover_photo_url,
    1 - (r.vibe_embedding <=> query_embedding) as similarity
  from restaurants r
  where r.vibe_embedding is not null
  order by r.vibe_embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function match_restaurants(vector, int) to anon, authenticated;

-- No ivfflat/hnsw index yet -- at MVP scale (15-20 restaurants) a sequential
-- scan over vibe_embedding is faster than index build/maintenance overhead.
-- Revisit once the restaurant count is large enough for `explain analyze`
-- to actually show a sequential scan as the bottleneck.
