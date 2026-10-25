-- Adds matched_on_evidence to match_restaurants: true when a menu item or
-- review chunk is what ranked the restaurant (its best chunk scored at least
-- as well as its vibe description). /search shows the "closest menu/review
-- match" line only then; for a vibe-only match the closest chunk can be
-- unrelated ("Good food" under "quiet place to read"). evidence itself is
-- unchanged and still goes to Gemini as context.
--
-- Meant to be applied once, like the other migrations.

-- Return type changes, so drop and recreate. Body otherwise identical to
-- 20261025120000_search_chunks.sql.
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
  evidence text[],
  matched_on_evidence boolean
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
  ),
  scored as (
    select
      r.*,
      1 - (r.vibe_embedding <=> query_embedding) as vibe_sim,
      b.sim as chunk_sim,
      b.evidence as chunk_evidence
    from restaurants r
    left join best_chunks b on b.restaurant_id = r.id
    where r.vibe_embedding is not null or b.restaurant_id is not null
  )
  select
    s.id,
    s.name,
    s.area,
    s.cuisine_type,
    s.price_range,
    s.vibe_description,
    s.cover_photo_url,
    -- greatest() skips nulls: a restaurant with no vibe embedding can still
    -- match on its menu or reviews, and vice versa.
    greatest(s.vibe_sim, s.chunk_sim) as similarity,
    coalesce(s.chunk_evidence, '{}') as evidence,
    coalesce(s.chunk_sim >= s.vibe_sim or s.vibe_sim is null, false)
      as matched_on_evidence
  from scored s
  order by similarity desc
  limit match_count;
$$;

grant execute on function match_restaurants(vector, int) to anon, authenticated;
