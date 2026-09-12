-- 1718 CLUB — initial production schema
-- Run in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.membership_tier_code as enum ('member', 'gold', 'black');
create type public.transaction_status as enum ('pending', 'paid', 'cancelled', 'refunded');
create type public.ledger_entry_type as enum ('earn', 'redeem', 'adjustment', 'expiry', 'refund');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.membership_tiers (
  id uuid primary key default gen_random_uuid(),
  code public.membership_tier_code unique not null,
  name text not null,
  min_points integer not null default 0 check (min_points >= 0),
  max_points integer,
  benefits jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (max_points is null or max_points >= min_points)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  tier_id uuid not null references public.membership_tiers(id),
  member_number text unique not null,
  joined_at timestamptz not null default now(),
  birthday date,
  referred_by uuid references public.memberships(id),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  entry_type public.ledger_entry_type not null,
  points integer not null check (points <> 0),
  balance_after integer,
  reference_type text,
  reference_id uuid,
  idempotency_key text unique,
  description text,
  created_at timestamptz not null default now()
);

create index points_ledger_account_created_idx on public.points_ledger(loyalty_account_id, created_at desc);
create index points_ledger_reference_idx on public.points_ledger(reference_type, reference_id);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  reward_type text not null default 'benefit',
  value numeric(12,2),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.rewards(id),
  points_spent integer not null check (points_spent > 0),
  status text not null default 'issued' check (status in ('issued','used','cancelled','expired')),
  redemption_code text unique not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index reward_redemptions_user_idx on public.reward_redemptions(user_id, created_at desc);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  status public.transaction_status not null default 'pending',
  channel text not null default 'in_store',
  external_order_id text,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  points_earned integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index transactions_external_order_unique on public.transactions(external_order_id) where external_order_id is not null;

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  metadata jsonb not null default '{}'::jsonb
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid unique references public.profiles(id) on delete set null,
  referral_code text unique not null,
  status text not null default 'pending' check (status in ('pending','qualified','rewarded','cancelled')),
  created_at timestamptz not null default now(),
  qualified_at timestamptz
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  multiplier numeric(6,2) not null default 1 check (multiplier > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger memberships_updated_at before update on public.memberships for each row execute function public.set_updated_at();
create trigger loyalty_accounts_updated_at before update on public.loyalty_accounts for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_tier uuid;
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.phone)
  on conflict (id) do nothing;

  select id into default_tier from public.membership_tiers where code = 'member' limit 1;
  if default_tier is not null then
    insert into public.memberships (user_id, tier_id, member_number)
    values (new.id, default_tier, '1718-' || upper(substr(replace(new.id::text, '-', ''), 1, 10)))
    on conflict (user_id) do nothing;
  end if;

  insert into public.loyalty_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.loyalty_balances as
select
  la.id as loyalty_account_id,
  la.user_id,
  coalesce(sum(pl.points), 0)::integer as balance,
  la.lifetime_earned
from public.loyalty_accounts la
left join public.points_ledger pl on pl.loyalty_account_id = la.id
group by la.id, la.user_id, la.lifetime_earned;

create or replace function public.earn_points_for_transaction(
  p_user_id uuid,
  p_points integer,
  p_reference_id uuid,
  p_idempotency_key text,
  p_description text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_balance integer;
  v_existing integer;
begin
  if p_user_id is null or p_points <= 0 then
    raise exception 'Invalid loyalty transaction';
  end if;

  select id into v_account_id from public.loyalty_accounts where user_id = p_user_id for update;
  if v_account_id is null then
    raise exception 'Loyalty account not found';
  end if;

  select points into v_existing from public.points_ledger where idempotency_key = p_idempotency_key;
  if v_existing is not null then
    select coalesce(sum(points), 0)::integer into v_balance from public.points_ledger where loyalty_account_id = v_account_id;
    return v_balance;
  end if;

  select coalesce(sum(points), 0)::integer into v_balance from public.points_ledger where loyalty_account_id = v_account_id;
  v_balance := v_balance + p_points;

  insert into public.points_ledger (loyalty_account_id, entry_type, points, balance_after, reference_type, reference_id, idempotency_key, description)
  values (v_account_id, 'earn', p_points, v_balance, 'transaction', p_reference_id, p_idempotency_key, p_description);

  update public.loyalty_accounts
  set lifetime_earned = lifetime_earned + p_points
  where id = v_account_id;

  return v_balance;
end;
$$;

create or replace function public.redeem_reward(p_user_id uuid, p_reward_id uuid)
returns public.reward_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward public.rewards;
  v_account_id uuid;
  v_balance integer;
  v_redemption public.reward_redemptions;
  v_code text;
begin
  if p_user_id is null then raise exception 'User is required'; end if;

  select * into v_reward from public.rewards where id = p_reward_id and is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    for update;
  if v_reward.id is null then raise exception 'Reward is not available'; end if;

  select id into v_account_id from public.loyalty_accounts where user_id = p_user_id for update;
  if v_account_id is null then raise exception 'Loyalty account not found'; end if;

  select coalesce(sum(points), 0)::integer into v_balance from public.points_ledger where loyalty_account_id = v_account_id;
  if v_balance < v_reward.points_cost then raise exception 'Not enough points'; end if;

  v_code := '1718-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  insert into public.reward_redemptions (user_id, reward_id, points_spent, redemption_code)
  values (p_user_id, p_reward_id, v_reward.points_cost, v_code)
  returning * into v_redemption;

  insert into public.points_ledger (loyalty_account_id, entry_type, points, balance_after, reference_type, reference_id, idempotency_key, description)
  values (v_account_id, 'redeem', -v_reward.points_cost, v_balance - v_reward.points_cost, 'reward_redemption', v_redemption.id, 'redeem:' || v_redemption.id::text, v_reward.title);

  return v_redemption;
end;
$$;

-- Seed the initial tiers. Benefits can be edited in the dashboard later.
insert into public.membership_tiers (code, name, min_points, max_points, sort_order, benefits)
values
  ('member', 'Member', 0, 1999, 1, '["Earn points on every visit"]'::jsonb),
  ('gold', 'Gold', 2000, 4999, 2, '["Priority access","Secret menu","Member-only events"]'::jsonb),
  ('black', 'Black', 5000, null, 3, '["Invitation-only experiences","Priority access","Private surprises"]'::jsonb)
on conflict (code) do update set name = excluded.name, min_points = excluded.min_points, max_points = excluded.max_points, benefits = excluded.benefits, sort_order = excluded.sort_order;

insert into public.rewards (title, description, points_cost, reward_type, value)
values
  ('Free Drink on Us', 'Your next signature drink is waiting.', 1500, 'free_drink', 0),
  ('Secret Menu Access', 'Exclusive drinks reserved for the Club.', 2000, 'access', 0),
  ('EGP 250 Club Credit', 'Use it on your next 1718 visit.', 3500, 'credit', 250)
;

-- RLS: customers can read/update their own profile; sensitive writes stay server-side.
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.points_ledger enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.locations enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.referrals enable row level security;
alter table public.campaigns enable row level security;
alter table public.audit_logs enable row level security;
alter table public.membership_tiers enable row level security;

create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "memberships_self_select" on public.memberships for select using (auth.uid() = user_id);
create policy "loyalty_self_select" on public.loyalty_accounts for select using (auth.uid() = user_id);
create policy "ledger_self_select" on public.points_ledger for select using (
  exists (select 1 from public.loyalty_accounts la where la.id = loyalty_account_id and la.user_id = auth.uid())
);
create policy "rewards_authenticated_select" on public.rewards for select using (auth.role() = 'authenticated' and is_active = true);
create policy "redemptions_self_select" on public.reward_redemptions for select using (auth.uid() = user_id);
create policy "locations_authenticated_select" on public.locations for select using (auth.role() = 'authenticated' and is_active = true);
create policy "tiers_authenticated_select" on public.membership_tiers for select using (auth.role() = 'authenticated');
create policy "transactions_self_select" on public.transactions for select using (auth.uid() = user_id);
create policy "transaction_items_self_select" on public.transaction_items for select using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())
);
create policy "referrals_self_select" on public.referrals for select using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);
create policy "campaigns_authenticated_select" on public.campaigns for select using (auth.role() = 'authenticated' and is_active = true);

-- These functions are intentionally not exposed as anonymous client writes.
revoke all on function public.earn_points_for_transaction(uuid, integer, uuid, text, text) from public, anon, authenticated;
revoke all on function public.redeem_reward(uuid, uuid) from public, anon, authenticated;

grant execute on function public.redeem_reward(uuid, uuid) to authenticated;

-- Convenience RPC for the signed-in member dashboard.
create or replace function public.club_snapshot()
returns jsonb
language sql
security invoker
as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'membership', (select to_jsonb(m) from public.memberships m where m.user_id = auth.uid() and m.is_active = true),
    'balance', (select coalesce(balance, 0) from public.loyalty_balances lb where lb.user_id = auth.uid()),
    'rewards', coalesce((select jsonb_agg(to_jsonb(r) order by r.points_cost) from public.rewards r where r.is_active = true), '[]'::jsonb)
  );
$$;

grant execute on function public.club_snapshot() to authenticated;
