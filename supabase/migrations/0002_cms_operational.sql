-- 1718 CLUB — CMS operational layer
-- Adds the product catalog, admin authorization (RLS via is_cms_admin()) for every
-- table the CMS Content Studio manages, and a tamper-resistant audit trail.
--
-- Safe to run against the live database: every statement is idempotent and additive.
-- It never drops data and never touches the existing cms_media policies.
--
-- Security model (unchanged from cms_media): the admin app uses the public
-- publishable key from the browser. Every privileged read/write is gated by
-- public.is_cms_admin() at the RLS layer. No service-role key is used anywhere.

-- ---------------------------------------------------------------------------
-- 0. Product catalog (menu) — did not exist before; the customer menu was hardcoded.
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  category text not null default 'coffee',
  description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'EGP',
  image_slot text,                     -- links to a cms_media.slot_key for the photo
  badge text,                          -- e.g. NEW, BEST SELLER, SIGNATURE
  tone text,                           -- fallback artwork tone: matcha | coffee | orange
  options jsonb not null default '{}'::jsonb,
  available boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_sort_idx on public.products(active, sort_order);

insert into public.products (name, slug, category, description, price, image_slot, badge, tone, sort_order)
values
  ('Iced Matcha Latte','iced-matcha-latte','matcha','Premium Japanese matcha, cold milk and a clean 1718 finish.',120,'product_matcha','NEW','matcha',1),
  ('Spanish Latte','spanish-latte','coffee','Rich espresso, sweetened condensed milk, velvety and balanced.',110,'product_spanish_latte','BEST SELLER','coffee',2),
  ('Cascara Orange','cascara-orange','refresher','Bright cascara infusion with fresh orange — our signature refresher.',95,'product_cascara_orange','SIGNATURE','orange',3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 1. updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Tamper-resistant audit trail
--    SECURITY DEFINER runs as the table owner, so writes bypass RLS and cannot
--    be forged from the browser. Every managed table logs insert/update/delete.
-- ---------------------------------------------------------------------------
create or replace function public.cms_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'DELETE' then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (v_actor, tg_table_name || '.delete', tg_table_name,
              (to_jsonb(old) ->> 'id'), jsonb_build_object('old', to_jsonb(old)));
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (v_actor, tg_table_name || '.update', tg_table_name,
              (to_jsonb(new) ->> 'id'), jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
    return new;
  else
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (v_actor, tg_table_name || '.insert', tg_table_name,
              (to_jsonb(new) ->> 'id'), jsonb_build_object('new', to_jsonb(new)));
    return new;
  end if;
end $$;

drop trigger if exists trg_audit_products on public.products;
create trigger trg_audit_products after insert or update or delete on public.products
  for each row execute function public.cms_audit();

drop trigger if exists trg_audit_rewards on public.rewards;
create trigger trg_audit_rewards after insert or update or delete on public.rewards
  for each row execute function public.cms_audit();

drop trigger if exists trg_audit_tiers on public.membership_tiers;
create trigger trg_audit_tiers after insert or update or delete on public.membership_tiers
  for each row execute function public.cms_audit();

drop trigger if exists trg_audit_campaigns on public.campaigns;
create trigger trg_audit_campaigns after insert or update or delete on public.campaigns
  for each row execute function public.cms_audit();

drop trigger if exists trg_audit_cms_media on public.cms_media;
create trigger trg_audit_cms_media after insert or update or delete on public.cms_media
  for each row execute function public.cms_audit();

-- ---------------------------------------------------------------------------
-- 3. RLS — products
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (active = true);

drop policy if exists "products admin all" on public.products;
create policy "products admin all" on public.products
  for all using (public.is_cms_admin()) with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- 4. RLS — rewards (keep the existing "active rewards read"; add admin access)
-- ---------------------------------------------------------------------------
drop policy if exists "rewards admin all" on public.rewards;
create policy "rewards admin all" on public.rewards
  for all using (public.is_cms_admin()) with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- 5. RLS — membership_tiers (RLS was OFF: anyone with the key could write).
--    Enabling it closes that hole while keeping tiers publicly readable.
-- ---------------------------------------------------------------------------
alter table public.membership_tiers enable row level security;

drop policy if exists "tiers public read" on public.membership_tiers;
create policy "tiers public read" on public.membership_tiers
  for select using (true);

drop policy if exists "tiers admin all" on public.membership_tiers;
create policy "tiers admin all" on public.membership_tiers
  for all using (public.is_cms_admin()) with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- 6. RLS — campaigns
-- ---------------------------------------------------------------------------
alter table public.campaigns enable row level security;

drop policy if exists "campaigns public read" on public.campaigns;
create policy "campaigns public read" on public.campaigns
  for select using (active = true);

drop policy if exists "campaigns admin all" on public.campaigns;
create policy "campaigns admin all" on public.campaigns
  for all using (public.is_cms_admin()) with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- 7. RLS — audit log (admins read; writes only via SECURITY DEFINER triggers)
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read" on public.audit_logs
  for select using (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- 8. RLS — Members module read access (additive; self-policies stay intact)
--    Admins may read member records; customers still only ever see their own.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles
  for select using (public.is_cms_admin());

drop policy if exists "loyalty admin read" on public.loyalty_accounts;
create policy "loyalty admin read" on public.loyalty_accounts
  for select using (public.is_cms_admin());

drop policy if exists "memberships admin read" on public.memberships;
create policy "memberships admin read" on public.memberships
  for select using (public.is_cms_admin());

drop policy if exists "redemptions admin read" on public.reward_redemptions;
create policy "redemptions admin read" on public.reward_redemptions
  for select using (public.is_cms_admin());

drop policy if exists "ledger admin read" on public.points_ledger;
create policy "ledger admin read" on public.points_ledger
  for select using (public.is_cms_admin());

-- memberships needs RLS enabled for the admin read policy to matter for writes;
-- self-read already implies it is enabled, but assert it to be safe.
alter table public.memberships enable row level security;
alter table public.reward_redemptions enable row level security;
