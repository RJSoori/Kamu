-- Removes everything demo_data.sql added. Menu items, reviews and search
-- chunks go with their restaurant (on delete cascade).
delete from restaurants where id::text like 'd3000000-%';
