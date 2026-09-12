create extension if not exists pgcrypto;

create type public.member_tier_code as enum ('member','gold','black');
create type public.account_status as enum ('active','suspended');
create type public.ledger_entry_type as enum ('earn','bonus','redeem','adjustment','expiry','reversal');
create type public.redemption_status as enum ('pending','fulfilled','cancelled','expired');
create type public.transaction_status as enum ('completed','voided','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  birth_date date,
  locale text not null default 'en' check (locale in ('en','ar')),
  referral_code text unique,
  referred_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.membership_tiers (
  id uuid primary key default gen_random_uuid(),
  code public.member_tier_code not null unique,
  name text not null,
  min_lifetime_points integer not null default 0 check (min_lifetime_points >= 0),
  invitation_only boolean not null default false,
  benefits jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  tier_id uuid not null references public.membership_tiers(id),
  status public.account_status not null default 'active',
  joined_at timestamptz not null default now(),
  invited_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  status public.account_status not null default 'active',
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id),
  profile_id uuid references public.profiles(id) on delete set null,
  external_id text,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  currency text not null default 'EGP',
  status public.transaction_status not null default 'completed',
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(location_id, external_id)
);

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  sku text,
  name text not null,
  quantity numeric(10,3) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_price numeric(12,2) not null default 0 check (total_price >= 0),
  metadata jsonb not null default '{}'::jsonb
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.loyalty_accounts(id) on delete restrict,
  amount integer not null check (amount <> 0),
  entry_type public.ledger_entry_type not null,
  source_type text not null,
  source_id text,
  idempotency_key text unique,
  description text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  tier_code public.member_tier_code,
  active boolean not null default true,
  secret boolean not null default false,
  inventory_limit integer check (inventory_limit is null or inventory_limit >= 0),
  valid_from timestamptz,
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.loyalty_accounts(id) on delete restrict,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  points_spent integer not null check (points_spent > 0),
  status public.redemption_status not null default 'pending',
  redemption_code text not null unique,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  fulfilled_by uuid references auth.users(id) on delete set null
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referee_id uuid unique references public.profiles(id) on delete set null,
  code text not null,
  status text not null default 'pending' check (status in ('pending','qualified','rewarded','cancelled')),
  qualified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  multiplier numeric(8,2) not null default 1 check (multiplier > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  rules jsonb not null default '{}'::jsonb
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index points_ledger_account_created_idx on public.points_ledger(account_id, created_at desc);
create index transactions_profile_occurred_idx on public.transactions(profile_id, occurred_at desc);
create index reward_redemptions_account_created_idx on public.reward_redemptions(account_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

insert into public.membership_tiers (code,name,min_lifetime_points,invitation_only,sort_order,benefits) values
('member','Member',0,false,1,'{"core":true}'::jsonb),
('gold','Gold',5000,false,2,'{"priority":true,"birthday":true}'::jsonb),
('black','Black',0,true,3,'{"private":true,"exclusive":true}'::jsonb)
on conflict (code) do nothing;

create or replace function public.current_points(p_account_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount),0)::integer from public.points_ledger where account_id = p_account_id and (expires_at is null or expires_at > now());
$$;

create or replace function public.redeem_reward(p_reward_id uuid)
returns public.reward_redemptions language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_account public.loyalty_accounts;
  v_reward public.rewards;
  v_balance integer;
  v_redemption public.reward_redemptions;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into v_account from public.loyalty_accounts where profile_id = v_user and status = 'active' for update;
  if not found then raise exception 'loyalty_account_not_found'; end if;
  select * into v_reward from public.rewards where id = p_reward_id and active = true for update;
  if not found then raise exception 'reward_not_available'; end if;
  v_balance := public.current_points(v_account.id);
  if v_balance < v_reward.points_cost then raise exception 'insufficient_points'; end if;
  insert into public.points_ledger(account_id,amount,entry_type,source_type,source_id,description,created_by)
    values(v_account.id,-v_reward.points_cost,'redeem','reward',p_reward_id::text,'Reward redemption',v_user);
  insert into public.reward_redemptions(account_id,reward_id,points_spent,redemption_code)
    values(v_account.id,p_reward_id,v_reward.points_cost,upper(encode(gen_random_bytes(6),'hex')))
    returning * into v_redemption;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(v_user,'reward.redeemed','reward_redemption',v_redemption.id::text,jsonb_build_object('reward_id',p_reward_id,'points',v_reward.points_cost));
  return v_redemption;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  v_code := '1718-' || upper(substr(replace(new.id::text,'-',''),1,8));
  insert into public.profiles(id,email,phone,full_name,referral_code)
    values(new.id,new.email,new.phone,new.raw_user_meta_data->>'full_name',v_code)
    on conflict (id) do nothing;
  insert into public.loyalty_accounts(profile_id) values(new.id) on conflict (profile_id) do nothing;
  insert into public.memberships(profile_id,tier_id)
    select new.id,id from public.membership_tiers where code='member' on conflict (profile_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.points_ledger enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.transactions enable row level security;

create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "membership self read" on public.memberships for select using (profile_id = auth.uid());
create policy "account self read" on public.loyalty_accounts for select using (profile_id = auth.uid());
create policy "ledger self read" on public.points_ledger for select using (account_id in (select id from public.loyalty_accounts where profile_id = auth.uid()));
create policy "active rewards read" on public.rewards for select using (active = true);
create policy "redemptions self read" on public.reward_redemptions for select using (account_id in (select id from public.loyalty_accounts where profile_id = auth.uid()));
create policy "transactions self read" on public.transactions for select using (profile_id = auth.uid());

revoke all on function public.redeem_reward(uuid) from public;
grant execute on function public.redeem_reward(uuid) to authenticated;
revoke all on function public.current_points(uuid) from public;
grant execute on function public.current_points(uuid) to authenticated;
