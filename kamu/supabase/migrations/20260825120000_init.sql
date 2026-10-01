-- Retroactive baseline migration: captures the schema as it existed before
-- Phase 0.5 (Production Foundations). Mirrors the original
-- src/lib/supabase/schema.sql, which this migration set now supersedes as
-- the source of truth for the database schema.

create extension if not exists pgcrypto;

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  address text,
  latitude numeric,
  longitude numeric,
  cuisine_type text[],
  price_range text,
  vibe_description text,
  opening_hours jsonb,
  cover_photo_url text,
  created_at timestamp with time zone default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  item_name text not null,
  description text,
  price numeric,
  photo_url text,
  category text,
  created_at timestamp with time zone default now()
);

create table if not exists customers (
  id uuid primary key,
  display_name text,
  email text,
  created_at timestamp with time zone default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  review_text text,
  created_at timestamp with time zone default now()
);

create table if not exists bucket_lists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  saved_at timestamp with time zone default now()
);
