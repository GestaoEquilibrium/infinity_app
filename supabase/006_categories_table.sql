create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('entrada','saida')),
  color       text not null default '#6b7280',
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);
create index if not exists categories_company_id_idx on categories(company_id);
alter table categories enable row level security;
drop policy if exists "Membro lê categorias" on categories;
create policy "Membro lê categorias" on categories for select using (company_id = get_my_company_id());
drop policy if exists "Admin gerencia categorias" on categories;
create policy "Admin gerencia categorias" on categories for all using (company_id = get_my_company_id()) with check (company_id = get_my_company_id());
