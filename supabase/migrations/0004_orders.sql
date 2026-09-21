-- 1718 CLUB — guest orders placed from the customer app.
-- Anyone may place an order (guest checkout); only CMS admins (staff) can
-- read and update them. Idempotent and additive.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'received' check (status in ('received','preparing','ready','completed','cancelled')),
  order_type text not null default 'pickup' check (order_type in ('pickup','delivery')),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(10,2) not null default 0 check (total >= 0),
  customer_name text,
  phone text,
  address text,
  note text,
  payment_method text not null default 'cash',
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status, created_at desc);

alter table public.orders enable row level security;

-- Guest checkout: anyone may place an order.
drop policy if exists "orders public insert" on public.orders;
create policy "orders public insert" on public.orders for insert with check (true);

-- Staff (CMS admins) can read and manage every order.
drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read" on public.orders for select using (public.is_cms_admin());
drop policy if exists "orders admin manage" on public.orders;
create policy "orders admin manage" on public.orders for all using (public.is_cms_admin()) with check (public.is_cms_admin());

drop trigger if exists trg_orders_touch on public.orders;
create trigger trg_orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_audit_orders on public.orders;
create trigger trg_audit_orders after insert or update or delete on public.orders
  for each row execute function public.cms_audit();
