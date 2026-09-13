-- 1718 CLUB — seed the CMS media slots with the initial brand photography.
-- The image files ship in the repo under public/brand/photos/ and deploy with the
-- app, so public_url is a site-relative path; the /api/media/[slot] route resolves
-- it against the current origin (works on production and previews alike).
--
-- Admins can still replace any image later via the CMS Media tab — an upload sets
-- storage_path (Supabase Storage) which the route also serves. Re-running this file
-- only resets a slot back to its shipped photo.
--
-- Safe to run repeatedly. Apply AFTER deploying the build that contains the photos.

update public.cms_media as m set
  public_url = v.url,
  storage_path = null,
  active = true
from (values
  ('splash_hero',            '/brand/photos/splash_hero.jpg'),
  ('home_matcha',            '/brand/photos/home_matcha.jpg'),
  ('product_matcha',         '/brand/photos/product_matcha.jpg'),
  ('product_spanish_latte',  '/brand/photos/product_spanish_latte.jpg'),
  ('product_cascara_orange', '/brand/photos/product_cascara_orange.jpg'),
  ('reward_free_drink',      '/brand/photos/reward_free_drink.jpg'),
  ('reward_secret_menu',     '/brand/photos/reward_secret_menu.jpg'),
  ('reward_credit',          '/brand/photos/reward_credit.jpg'),
  ('brand_story',            '/brand/photos/brand_story.jpg'),
  ('club_hero',              '/brand/photos/club_hero.jpg'),
  ('profile_mascot',         '/brand/photos/profile_mascot.jpg')
) as v(slot_key, url)
where m.slot_key = v.slot_key;
