-- One review per customer per restaurant, enforced by the database.
--
-- Until now this was only an app-level rule (upsertMyReview checks for an
-- existing review, then inserts), so two tabs, a double submit or a direct
-- API call could create a second review. The restaurant page then broke for
-- that customer (getMyReviewForRestaurant uses maybeSingle(), which errors on
-- two rows), and a script could stuff the star rating.
--
-- Also stops reviews of restaurants the customer can't see (drafts, hidden
-- listings, unapproved owners): the insert policy only checked who was
-- writing, not what they were reviewing.
--
-- Meant to be applied once, like the other migrations.

-- 1. Keep only the newest review per (customer, restaurant).
delete from reviews r
using reviews newer
where r.customer_id = newer.customer_id
  and r.restaurant_id = newer.restaurant_id
  -- created_at is nullable on this table; treat null as oldest.
  and (coalesce(newer.created_at, '-infinity'), newer.id)
    > (coalesce(r.created_at, '-infinity'), r.id);

-- 2. Enforce it from now on.
create unique index reviews_one_per_customer_idx
  on reviews (customer_id, restaurant_id);

-- 3. Only review restaurants that are actually public.
drop policy "reviews_insert_self" on reviews;
create policy "reviews_insert_self"
  on reviews for insert
  to authenticated
  with check (customer_id = auth.uid() and is_restaurant_public(restaurant_id));
