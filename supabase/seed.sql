-- Placeholder restaurant data for local development, standing in for real
-- Phase 1 cafe visits. Run in the Supabase SQL editor against a project
-- that already has 0001_init.sql (or the equivalent baseline + foundations
-- migrations) applied.
--
-- Idempotent: each block skips if a restaurant with that name already
-- exists, so re-running this file after adding real data alongside it
-- won't duplicate rows. Replace/remove these once real listings from
-- Phase 1 site visits are in.

do $$
declare
  r_id uuid;
begin

  if not exists (select 1 from restaurants where name = 'Ceylon Leaf Cafe') then
    insert into restaurants (
      name, area, address, latitude, longitude, cuisine_type, price_range,
      vibe_description, opening_hours, is_published
    ) values (
      'Ceylon Leaf Cafe', 'Colombo 03', '14 Horton Place, Colombo 03',
      6.9101, 79.8571, array['Cafe', 'Sri Lankan'], '$$',
      'Quiet garden cafe with soft lighting and deliberately slow wifi -- good for reading alone or working through the morning. Ceylon tea, short eats, popular with university students.',
      '{"mon":"7:30-19:00","tue":"7:30-19:00","wed":"7:30-19:00","thu":"7:30-19:00","fri":"7:30-19:00","sat":"8:00-20:00","sun":"8:00-18:00"}',
      true
    )
    returning id into r_id;

    insert into menu_items (restaurant_id, item_name, description, price, category) values
      (r_id, 'Ceylon Milk Tea', 'Strong black tea, condensed milk', 250, 'Beverages'),
      (r_id, 'Kottu Toastie', 'Grilled sandwich with egg and cheese', 650, 'Mains'),
      (r_id, 'Watalappan Slice', 'Coconut jaggery custard', 350, 'Desserts');
  end if;

  if not exists (select 1 from restaurants where name = 'Spice Trail Street Kitchen') then
    insert into restaurants (
      name, area, address, latitude, longitude, cuisine_type, price_range,
      vibe_description, opening_hours, is_published
    ) values (
      'Spice Trail Street Kitchen', 'Nugegoda', '212 High Level Road, Nugegoda',
      6.8721, 79.8890, array['Street Food', 'Sri Lankan'], '$',
      'Loud, fast, plastic chairs on the pavement -- come hungry for cheap spicy kottu and short eats, not for a quiet conversation. Busiest right after work hours.',
      '{"mon":"16:00-23:00","tue":"16:00-23:00","wed":"16:00-23:00","thu":"16:00-23:00","fri":"16:00-00:00","sat":"16:00-00:00","sun":"16:00-22:00"}',
      true
    )
    returning id into r_id;

    insert into menu_items (restaurant_id, item_name, description, price, category) values
      (r_id, 'Chicken Kottu', 'Chopped roti stir-fried with egg, chicken, spices', 550, 'Mains'),
      (r_id, 'Fish Cutlets (3pc)', 'Deep-fried spiced fish and potato', 200, 'Street Food'),
      (r_id, 'Ginger Beer', 'House-made, served cold', 150, 'Beverages');
  end if;

  if not exists (select 1 from restaurants where name = 'Lighthouse Trattoria') then
    insert into restaurants (
      name, area, address, latitude, longitude, cuisine_type, price_range,
      vibe_description, opening_hours, is_published
    ) values (
      'Lighthouse Trattoria', 'Mount Lavinia', '88 Beach Road, Mount Lavinia',
      6.8389, 79.8653, array['Italian', 'Seafood'], '$$$',
      'Candlelit tables steps from the sand -- built for a date or an anniversary, not a quick bite. Fresh seafood pasta, slow service on purpose, sunset views if you book early.',
      '{"mon":"18:00-23:00","tue":"18:00-23:00","wed":"18:00-23:00","thu":"18:00-23:00","fri":"18:00-23:30","sat":"18:00-23:30","sun":"12:00-15:00,18:00-23:00"}',
      true
    )
    returning id into r_id;

    insert into menu_items (restaurant_id, item_name, description, price, category) values
      (r_id, 'Prawn Linguine', 'Local prawns, white wine, chili, garlic', 2800, 'Mains'),
      (r_id, 'Burrata & Heirloom Tomato', 'Imported burrata, olive oil, basil', 1900, 'Mains'),
      (r_id, 'Tiramisu', 'House-made, espresso-soaked', 950, 'Desserts');
  end if;

  if not exists (select 1 from restaurants where name = 'Bakehouse on Kotte Road') then
    insert into restaurants (
      name, area, address, latitude, longitude, cuisine_type, price_range,
      vibe_description, opening_hours, is_published
    ) values (
      'Bakehouse on Kotte Road', 'Kotte', '45 Kotte Road, Kotte',
      6.8905, 79.9019, array['Bakery', 'Cafe'], '$$',
      'Bright, minimal, good natural light for photos -- sourdough and pastries baked fresh each morning, sells out of the popular items by early afternoon. Casual, no reservations.',
      '{"mon":"6:30-16:00","tue":"6:30-16:00","wed":"6:30-16:00","thu":"6:30-16:00","fri":"6:30-16:00","sat":"6:30-17:00","sun":"7:00-15:00"}',
      true
    )
    returning id into r_id;

    insert into menu_items (restaurant_id, item_name, description, price, category) values
      (r_id, 'Sourdough Loaf', 'Whole, 24-hour ferment', 900, 'Bakery'),
      (r_id, 'Cinnamon Roll', 'Baked fresh each morning', 400, 'Bakery'),
      (r_id, 'Flat White', 'Locally roasted beans', 500, 'Beverages');
  end if;

  if not exists (select 1 from restaurants where name = 'Rajagiriya Rice & Curry House') then
    insert into restaurants (
      name, area, address, latitude, longitude, cuisine_type, price_range,
      vibe_description, opening_hours, is_published
    ) values (
      'Rajagiriya Rice & Curry House', 'Rajagiriya', '167 Nawala Road, Rajagiriya',
      6.9083, 79.8967, array['Sri Lankan'], '$',
      'Home-style rice and curry buffet, unlimited helpings, fluorescent lights and steel tables -- built for a fast affordable lunch, not lingering. Regulars, office crowd on weekdays.',
      '{"mon":"11:30-15:00","tue":"11:30-15:00","wed":"11:30-15:00","thu":"11:30-15:00","fri":"11:30-15:00","sat":"11:30-15:30","sun":"closed"}',
      true
    )
    returning id into r_id;

    insert into menu_items (restaurant_id, item_name, description, price, category) values
      (r_id, 'Rice & Curry Buffet', 'Unlimited rice, 5 curries, papadam', 450, 'Mains'),
      (r_id, 'Curd & Treacle', 'Buffalo curd, kithul treacle', 300, 'Desserts');
  end if;

  if not exists (select 1 from restaurants where name = 'Dehiwala Rooftop Brew') then
    insert into restaurants (
      name, area, address, latitude, longitude, cuisine_type, price_range,
      vibe_description, opening_hours, is_published
    ) values (
      'Dehiwala Rooftop Brew', 'Dehiwala', '9 Galle Road, Dehiwala',
      6.8508, 79.8654, array['Cafe'], '$$',
      'Laid-back rooftop cafe, great sunset views over the railway line, quiet on weekday mornings and full of students by evening. Affordable specialty coffee, good wifi.',
      '{"mon":"7:00-22:00","tue":"7:00-22:00","wed":"7:00-22:00","thu":"7:00-22:00","fri":"7:00-23:00","sat":"7:00-23:00","sun":"7:00-22:00"}',
      true
    )
    returning id into r_id;

    insert into menu_items (restaurant_id, item_name, description, price, category) values
      (r_id, 'Pour Over', 'Single origin, rotating', 600, 'Beverages'),
      (r_id, 'Avocado Toast', 'Sourdough, chili flakes, lime', 750, 'Mains');
  end if;

end $$;
