-- ══════════════════════════════════════════
-- INFINITY APP — Schema Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- ══════════════════════════════════════════

-- Empresas
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  created_at timestamptz default now()
);

-- Perfis de usuário
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  avatar_url text,
  created_at timestamptz default now()
);

-- Transações financeiras
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),
  description text not null,
  category text,
  type text not null check (type in ('entrada','saida')),
  value numeric not null check (value > 0),
  date date not null,
  status text not null default 'pendente' check (status in ('pendente','pago','recebido','atrasado')),
  created_at timestamptz default now()
);

-- Compras
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),
  item text not null,
  supplier text,
  qty integer not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  date date not null,
  status text not null default 'em_transito' check (status in ('em_transito','entregue','ativo','cancelado')),
  created_at timestamptz default now()
);

-- ══════════════════════════════════════════
-- TRIGGER: cria perfil vazio automaticamente no signup
-- Evita "Database error saving new user"
-- ══════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ══════════════════════════════════════════
-- FUNÇÃO HELPER — evita recursão infinita nas policies
-- ══════════════════════════════════════════
create or replace function get_my_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- ── Row Level Security ──────────────────────
alter table companies enable row level security;
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table purchases enable row level security;

-- ── Companies ───────────────────────────────
create policy "Qualquer autenticado cria empresa"
  on companies for insert
  with check (true);

create policy "Membros veem sua empresa"
  on companies for select
  using (id = get_my_company_id());

create policy "Admin atualiza empresa"
  on companies for update
  using (id = get_my_company_id());

-- ── Profiles ────────────────────────────────
create policy "Membros veem perfis da empresa"
  on profiles for select
  using (company_id = get_my_company_id() or id = auth.uid());

create policy "Próprio usuário atualiza perfil"
  on profiles for update
  using (id = auth.uid());

create policy "Inserir perfil próprio ou convidar membro"
  on profiles for insert
  with check (
    id = auth.uid()
    or company_id = get_my_company_id()
  );

create policy "Admin remove membros"
  on profiles for delete
  using (
    id != auth.uid()
    and company_id = get_my_company_id()
  );

-- ── Transactions ─────────────────────────────
create policy "Membros veem transações"
  on transactions for select
  using (company_id = get_my_company_id());

create policy "Admin/Editor inserem transações"
  on transactions for insert
  with check (company_id = get_my_company_id());

create policy "Admin/Editor atualizam transações"
  on transactions for update
  using (company_id = get_my_company_id());

create policy "Admin exclui transações"
  on transactions for delete
  using (company_id = get_my_company_id());

-- ── Purchases ────────────────────────────────
create policy "Membros veem compras"
  on purchases for select
  using (company_id = get_my_company_id());

create policy "Admin/Editor inserem compras"
  on purchases for insert
  with check (company_id = get_my_company_id());

create policy "Admin/Editor atualizam compras"
  on purchases for update
  using (company_id = get_my_company_id());

create policy "Admin exclui compras"
  on purchases for delete
  using (company_id = get_my_company_id());
