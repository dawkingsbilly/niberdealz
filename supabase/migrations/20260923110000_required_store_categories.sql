-- Required public catalogue categories. Safe to apply repeatedly.
-- Staff/owner mutations remain restricted to approved server functions.
INSERT INTO public.store_categories (name, sort_order, active) VALUES
  ('Jewelry', 10, true),
  ('Electronics', 20, true),
  ('Fashion', 30, true),
  ('Women''s Clothing', 40, true),
  ('Men''s Clothing', 50, true),
  ('Kids'' Clothing', 60, true)
ON CONFLICT (name) DO UPDATE
  SET active = true,
      sort_order = EXCLUDED.sort_order;
