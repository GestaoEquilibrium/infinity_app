-- ═══════════════════════════════════════════════════════════════════════════
-- INFINITY — SETUP COMPLETO DO BANCO NOVO (script único)
--
-- Consolida as migrations 000–008 + categories + audit_log em um só arquivo,
-- já na versão final (sem passos intermediários).
--
-- COMO USAR:
--   1. Crie o projeto novo no Supabase
--   2. Abra SQL Editor → New query → cole este arquivo inteiro → Run
--   3. Depois rode o arquivo 2_empresa_e_admin.sql (cria sua empresa/admin)
--   4. No app, edite index.html com a URL e a anon key do projeto novo
--   5. Em Authentication → URL Configuration, cadastre a URL do site
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ═══════════════════════════════════════════
-- 1. NÚCLEO — empresas, perfis, transações, compras
-- ═══════════════════════════════════════════

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  avatar_url text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),
  description text not null,
  category text,
  type text not null check (type in ('entrada','saida')),
  value numeric not null check (value > 0),
  actual_value numeric,
  date date not null,
  status text not null default 'pendente' check (status in ('pendente','pago','recebido','atrasado')),
  settled_at date,
  created_at timestamptz default now()
);
create index if not exists idx_tx_company_date on transactions(company_id, date desc);

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
  status text not null default 'entregue' check (status in ('em_transito','entregue','ativo','cancelado')),
  created_at timestamptz default now()
);
create index if not exists idx_pur_company_date on purchases(company_id, date desc);

-- Categorias de lançamento (Configurações → Categorias)
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

-- Registro de auditoria (usado pelo app em Equipe/Perfil)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  table_name text,
  record_id text,
  new_data jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_audit_company on audit_log(company_id, created_at desc);

-- ═══════════════════════════════════════════
-- 2. FUNÇÕES AUXILIARES + TRIGGER DE SIGNUP
-- ═══════════════════════════════════════════

-- Evita recursão infinita nas policies
create or replace function get_my_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_admin_of(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and company_id = target_company_id
      and role = 'admin'
  );
$$;

-- Cria perfil automaticamente no signup (versão final da migration 003)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, company_id, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    (new.raw_user_meta_data->>'company_id')::uuid,
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  )
  on conflict (id) do update
    set
      company_id = coalesce(excluded.company_id, profiles.company_id),
      name = coalesce(excluded.name, profiles.name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Convite de membro por e-mail (versão final da migration 004)
drop function if exists public.invite_member_by_email(text, text);
drop function if exists public.invite_member_by_email(text);

create or replace function public.invite_member_by_email(
  p_email text,
  p_role  text default 'editor'
)
returns json
language plpgsql
security definer
as $$
declare
  v_caller_id    uuid := auth.uid();
  v_company_id   uuid;
  v_user_id      uuid;
  v_prev_company uuid;
begin
  select company_id into v_company_id
  from public.profiles
  where id = v_caller_id;

  if v_company_id is null then
    return json_build_object('error', 'sem_empresa', 'msg', 'Seu perfil não tem empresa associada.');
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    return json_build_object('error', 'user_not_found', 'msg', 'Usuário não encontrado. Ele precisa se cadastrar primeiro.');
  end if;

  select company_id into v_prev_company
  from public.profiles
  where id = v_user_id;

  if v_prev_company is not null and v_prev_company <> v_company_id then
    return json_build_object('error', 'outra_empresa', 'msg', 'Este usuário já pertence a outra empresa.');
  end if;

  insert into public.profiles (id, email, name, company_id, role)
  values (
    v_user_id,
    lower(p_email),
    coalesce(
      (select raw_user_meta_data->>'name' from auth.users where id = v_user_id),
      split_part(p_email, '@', 1)
    ),
    v_company_id,
    p_role
  )
  on conflict (id) do update
    set company_id = excluded.company_id,
        role       = excluded.role;

  return json_build_object(
    'success',    true,
    'user_id',    v_user_id::text,
    'company_id', v_company_id::text,
    'role',       p_role
  );
end;
$$;

revoke execute on function public.invite_member_by_email(text, text) from public, anon;
grant  execute on function public.invite_member_by_email(text, text) to authenticated;

-- ═══════════════════════════════════════════
-- 3. RLS — NÚCLEO
-- ═══════════════════════════════════════════

alter table companies enable row level security;
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table purchases enable row level security;
alter table categories enable row level security;
alter table audit_log enable row level security;

-- Companies
drop policy if exists "Qualquer autenticado cria empresa" on companies;
create policy "Qualquer autenticado cria empresa"
  on companies for insert to authenticated with check (true);

drop policy if exists "Membros veem sua empresa" on companies;
create policy "Membros veem sua empresa"
  on companies for select using (id = get_my_company_id());

drop policy if exists "Admin atualiza empresa" on companies;
create policy "Admin atualiza empresa"
  on companies for update using (id = get_my_company_id());

-- Profiles
drop policy if exists "Membros veem perfis da empresa" on profiles;
create policy "Membros veem perfis da empresa"
  on profiles for select
  using (company_id = get_my_company_id() or id = auth.uid());

drop policy if exists "Usuário atualiza próprio perfil" on profiles;
create policy "Usuário atualiza próprio perfil"
  on profiles for update using (id = auth.uid());

drop policy if exists "Admin atualiza membros da empresa" on profiles;
create policy "Admin atualiza membros da empresa"
  on profiles for update
  using (is_admin_of(company_id))
  with check (is_admin_of(company_id));

drop policy if exists "Inserir perfil próprio ou convidar membro" on profiles;
create policy "Inserir perfil próprio ou convidar membro"
  on profiles for insert
  with check (id = auth.uid() or company_id = get_my_company_id());

drop policy if exists "Admin remove membros da empresa" on profiles;
create policy "Admin remove membros da empresa"
  on profiles for delete
  using (id != auth.uid() and is_admin_of(company_id));

drop policy if exists "Admin adota perfil orfao" on profiles;
create policy "Admin adota perfil orfao"
  on public.profiles for update
  using (
    company_id is null
    and exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.role = 'admin'
        and admin_p.company_id = public.profiles.company_id
    )
  );

-- Transactions
drop policy if exists "Membros veem transações" on transactions;
create policy "Membros veem transações"
  on transactions for select using (company_id = get_my_company_id());
drop policy if exists "Admin/Editor inserem transações" on transactions;
create policy "Admin/Editor inserem transações"
  on transactions for insert with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Admin/Editor atualizam transações" on transactions;
create policy "Admin/Editor atualizam transações"
  on transactions for update using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Admin exclui transações" on transactions;
create policy "Admin exclui transações"
  on transactions for delete using (company_id = get_my_company_id() and my_role() in ('admin','editor'));

-- Purchases
drop policy if exists "Membros veem compras" on purchases;
create policy "Membros veem compras"
  on purchases for select using (company_id = get_my_company_id());
drop policy if exists "Admin/Editor inserem compras" on purchases;
create policy "Admin/Editor inserem compras"
  on purchases for insert with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Admin/Editor atualizam compras" on purchases;
create policy "Admin/Editor atualizam compras"
  on purchases for update using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Admin exclui compras" on purchases;
create policy "Admin exclui compras"
  on purchases for delete using (company_id = get_my_company_id() and my_role() in ('admin','editor'));

-- Categories
drop policy if exists "Membro lê categorias" on categories;
create policy "Membro lê categorias" on categories for select using (company_id = get_my_company_id());
drop policy if exists "Admin gerencia categorias" on categories;
create policy "Admin gerencia categorias" on categories for all
  using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

-- Audit log
drop policy if exists "Membros veem auditoria" on audit_log;
create policy "Membros veem auditoria" on audit_log for select using (company_id = get_my_company_id());
drop policy if exists "Membros registram auditoria" on audit_log;
create policy "Membros registram auditoria" on audit_log for insert with check (company_id = get_my_company_id());

-- ═══════════════════════════════════════════
-- 4. MÓDULO RH (migration 002)
-- ═══════════════════════════════════════════

create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),

  nome text not null,
  cargo text,
  setor text,
  regime text check (regime in ('CLT','PJ','Estagiário','Prestador','Sócio')) default 'CLT',
  status text check (status in ('Ativo','Desligado','Afastado')) default 'Ativo',

  cpf text, cnpj text, rg text, pis text, ctps text,
  titulo_eleitor text, cnh text, conselho text,

  nascimento date, estado_civil text, escolaridade text,
  conjuge text, filhos text, observacoes text,

  telefone text, email text, endereco text, cep text,

  admissao date,
  data_desligamento date,
  tipo_desligamento text check (tipo_desligamento in ('Sem justa causa','Pedido demissão','Distrato 484-A','Justa causa','Fim contrato','Término experiência','Aposentadoria')),
  limite_ferias date,
  salario numeric(10,2),
  pagador text,
  insalubridade text,
  ponto_digital_id text,
  origem_estrangeiro text,
  rnm_validade date,

  docs jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_colab_company on colaboradores(company_id);
create index if not exists idx_colab_status on colaboradores(company_id, status);
create index if not exists idx_colab_regime on colaboradores(company_id, regime);

create table if not exists faltas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  created_by uuid references auth.users(id),
  data date not null,
  tipo text check (tipo in ('Injustificada','Justificada','Atestado médico','Atraso','Licença')) not null,
  descricao text,
  fonte text default 'manual' check (fonte in ('manual','ponto-digital','importado-csv')),
  created_at timestamptz default now()
);
create index if not exists idx_faltas_company on faltas(company_id);
create index if not exists idx_faltas_colab on faltas(colaborador_id, data desc);

create table if not exists atestados (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  created_by uuid references auth.users(id),
  data_inicio date not null,
  data_fim date,
  dias integer default 1,
  cid10 text,
  medico text,
  local text,
  observacoes text,
  file_url text, file_path text, file_name text, file_size integer,
  created_at timestamptz default now()
);
create index if not exists idx_atest_company on atestados(company_id);
create index if not exists idx_atest_colab on atestados(colaborador_id, data_inicio desc);

create table if not exists alertas_legais (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  colaborador_id uuid references colaboradores(id) on delete set null,
  created_by uuid references auth.users(id),
  titulo text not null,
  descricao text,
  prioridade text check (prioridade in ('crítica','alta','média','baixa')) default 'média',
  categoria text,
  resolvido boolean default false,
  resolvido_em timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_alertas_company on alertas_legais(company_id, resolvido);

create table if not exists rh_pendencias (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  colaborador_id uuid references colaboradores(id) on delete set null,
  created_by uuid references auth.users(id),
  titulo text not null,
  descricao text,
  prioridade text check (prioridade in ('Alta','Média','Baixa')) default 'Média',
  categoria text,
  status text check (status in ('Aberta','Em andamento','Resolvida')) default 'Aberta',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pend_company on rh_pendencias(company_id, status);

create table if not exists rescisoes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  created_by uuid references auth.users(id),
  modalidade text not null check (modalidade in ('sem_justa_causa','pedido_demissao','distrato_484a','justa_causa','fim_contrato','termino_experiencia')),
  data_rescisao date not null,
  saldo_salario numeric(10,2),
  aviso_previo numeric(10,2),
  ferias_vencidas numeric(10,2),
  ferias_proporcionais numeric(10,2),
  terco_ferias numeric(10,2),
  decimo_terceiro numeric(10,2),
  multa_fgts numeric(10,2),
  total_verbas numeric(10,2),
  observacoes text,
  documentos_gerados jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_resc_company on rescisoes(company_id);

-- RLS do RH
alter table colaboradores enable row level security;
alter table faltas enable row level security;
alter table atestados enable row level security;
alter table alertas_legais enable row level security;
alter table rh_pendencias enable row level security;
alter table rescisoes enable row level security;

drop policy if exists "Membros veem colaboradores" on colaboradores;
create policy "Membros veem colaboradores" on colaboradores for select
  using (company_id = get_my_company_id());
drop policy if exists "Editor+ cria colaboradores" on colaboradores;
create policy "Editor+ cria colaboradores" on colaboradores for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Editor+ atualiza colaboradores" on colaboradores;
create policy "Editor+ atualiza colaboradores" on colaboradores for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Admin remove colaboradores" on colaboradores;
create policy "Admin remove colaboradores" on colaboradores for delete
  using (company_id = get_my_company_id() and my_role() = 'admin');

drop policy if exists "Membros veem faltas" on faltas;
create policy "Membros veem faltas" on faltas for select
  using (company_id = get_my_company_id());
drop policy if exists "Editor+ cria faltas" on faltas;
create policy "Editor+ cria faltas" on faltas for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Editor+ atualiza faltas" on faltas;
create policy "Editor+ atualiza faltas" on faltas for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Editor+ remove faltas" on faltas;
create policy "Editor+ remove faltas" on faltas for delete
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));

drop policy if exists "Membros veem atestados" on atestados;
create policy "Membros veem atestados" on atestados for select
  using (company_id = get_my_company_id());
drop policy if exists "Editor+ cria atestados" on atestados;
create policy "Editor+ cria atestados" on atestados for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Editor+ atualiza atestados" on atestados;
create policy "Editor+ atualiza atestados" on atestados for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Editor+ remove atestados" on atestados;
create policy "Editor+ remove atestados" on atestados for delete
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));

drop policy if exists "Membros veem alertas" on alertas_legais;
create policy "Membros veem alertas" on alertas_legais for select
  using (company_id = get_my_company_id());
drop policy if exists "Editor+ cria alertas" on alertas_legais;
create policy "Editor+ cria alertas" on alertas_legais for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Editor+ atualiza alertas" on alertas_legais;
create policy "Editor+ atualiza alertas" on alertas_legais for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Admin remove alertas" on alertas_legais;
create policy "Admin remove alertas" on alertas_legais for delete
  using (company_id = get_my_company_id() and my_role() = 'admin');

drop policy if exists "Membros veem pendências" on rh_pendencias;
create policy "Membros veem pendências" on rh_pendencias for select
  using (company_id = get_my_company_id());
drop policy if exists "Editor+ cria pendências" on rh_pendencias;
create policy "Editor+ cria pendências" on rh_pendencias for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Editor+ atualiza pendências" on rh_pendencias;
create policy "Editor+ atualiza pendências" on rh_pendencias for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
drop policy if exists "Editor+ remove pendências" on rh_pendencias;
create policy "Editor+ remove pendências" on rh_pendencias for delete
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));

drop policy if exists "Membros veem rescisões" on rescisoes;
create policy "Membros veem rescisões" on rescisoes for select
  using (company_id = get_my_company_id());
drop policy if exists "Admin cria rescisões" on rescisoes;
create policy "Admin cria rescisões" on rescisoes for insert
  with check (company_id = get_my_company_id() and my_role() = 'admin');
drop policy if exists "Admin atualiza rescisões" on rescisoes;
create policy "Admin atualiza rescisões" on rescisoes for update
  using (company_id = get_my_company_id() and my_role() = 'admin');
drop policy if exists "Admin remove rescisões" on rescisoes;
create policy "Admin remove rescisões" on rescisoes for delete
  using (company_id = get_my_company_id() and my_role() = 'admin');

-- Storage bucket para atestados
insert into storage.buckets (id, name, public)
values ('atestados', 'atestados', false)
on conflict (id) do nothing;

drop policy if exists "Atestados: leitura autenticada" on storage.objects;
create policy "Atestados: leitura autenticada" on storage.objects for select
  using (bucket_id = 'atestados' and auth.role() = 'authenticated');
drop policy if exists "Atestados: editor+ faz upload" on storage.objects;
create policy "Atestados: editor+ faz upload" on storage.objects for insert
  with check (bucket_id = 'atestados' and auth.role() = 'authenticated');
drop policy if exists "Atestados: editor+ deleta" on storage.objects;
create policy "Atestados: editor+ deleta" on storage.objects for delete
  using (bucket_id = 'atestados' and auth.role() = 'authenticated');

-- ═══════════════════════════════════════════
-- 5. MÓDULO SALAS (migrations 005 + 007, já na numeração final)
-- ═══════════════════════════════════════════

create table if not exists salas_unidades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  codigo text not null,
  nome text not null,
  endereco text,
  cor_hex text default '333333',
  ordem_exibicao int not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, codigo)
);
create index if not exists idx_salas_unidades_company on salas_unidades(company_id);

create table if not exists salas_categorias (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references salas_unidades(id) on delete cascade,
  codigo text not null,
  nome text not null,
  cor_fundo_hex text default 'F2F2F2',
  cor_texto_hex text default '333333',
  ordem_exibicao int not null default 0,
  valor_sessao numeric(10,2) default 0,
  duracao_sessao_min int default 50,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unidade_id, codigo)
);
create index if not exists idx_salas_categorias_unidade on salas_categorias(unidade_id);

-- Já nasce com a numeração final (007): identidade da sala = número; andar informativo
create table if not exists salas_fisicas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references salas_unidades(id) on delete restrict,
  numero text not null,
  andar text,
  apelido text,
  status text check (status in ('ativa','manutencao','desativada')) default 'ativa',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unidade_id, numero)
);
create index if not exists idx_salas_fisicas_unidade on salas_fisicas(unidade_id);
create index if not exists idx_salas_fisicas_status on salas_fisicas(status);

create table if not exists salas_escalas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  categoria_id uuid not null references salas_categorias(id) on delete restrict,
  sala_id uuid references salas_fisicas(id) on delete set null,
  dia_semana smallint not null check (dia_semana between 1 and 7),
  turno text not null check (turno in ('manha','tarde','noite')),
  hora_inicio time not null,
  hora_fim time not null check (hora_fim > hora_inicio),
  status text not null check (status in ('ativa','fechada_temporariamente','sob_demanda','itinerante')) default 'ativa',
  observacao text,
  vigencia_inicio date not null default current_date,
  vigencia_fim date check (vigencia_fim is null or vigencia_fim >= vigencia_inicio),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create index if not exists idx_escalas_company on salas_escalas(company_id);
create index if not exists idx_escalas_colaborador on salas_escalas(colaborador_id);
create index if not exists idx_escalas_sala on salas_escalas(sala_id);
create index if not exists idx_escalas_dia_turno on salas_escalas(dia_semana, turno);

create table if not exists salas_fechamentos (
  id uuid primary key default gen_random_uuid(),
  escala_id uuid not null references salas_escalas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7),
  turno text check (turno is null or turno in ('manha','tarde','noite')),
  motivo text,
  vigencia_inicio date not null default current_date,
  vigencia_fim date,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists idx_fechamentos_escala on salas_fechamentos(escala_id);

create table if not exists salas_historico (
  id uuid primary key default gen_random_uuid(),
  escala_id uuid not null references salas_escalas(id) on delete cascade,
  tipo_mudanca text not null check (tipo_mudanca in ('criacao','alteracao_horario','alteracao_sala','alteracao_categoria','fechamento','reativacao','desativacao','observacao')),
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  motivo text,
  alterado_por uuid references auth.users(id),
  data_mudanca timestamptz not null default now()
);
create index if not exists idx_historico_escala on salas_historico(escala_id);

-- Triggers de updated_at + histórico
create or replace function salas_set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_salas_unidades_upd on salas_unidades;
create trigger trg_salas_unidades_upd before update on salas_unidades
  for each row execute function salas_set_updated_at();
drop trigger if exists trg_salas_categorias_upd on salas_categorias;
create trigger trg_salas_categorias_upd before update on salas_categorias
  for each row execute function salas_set_updated_at();
drop trigger if exists trg_salas_fisicas_upd on salas_fisicas;
create trigger trg_salas_fisicas_upd before update on salas_fisicas
  for each row execute function salas_set_updated_at();
drop trigger if exists trg_salas_escalas_upd on salas_escalas;
create trigger trg_salas_escalas_upd before update on salas_escalas
  for each row execute function salas_set_updated_at();

create or replace function salas_log_escala_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into salas_historico (escala_id, tipo_mudanca, alterado_por, motivo)
    values (new.id, 'criacao', new.created_by, 'Escala criada');
    return new;
  elsif tg_op = 'UPDATE' then
    if new.sala_id is distinct from old.sala_id then
      insert into salas_historico (escala_id, tipo_mudanca, campo_alterado, valor_anterior, valor_novo, alterado_por)
      values (new.id, 'alteracao_sala', 'sala_id', old.sala_id::text, new.sala_id::text, new.updated_by);
    end if;
    if new.hora_inicio is distinct from old.hora_inicio or new.hora_fim is distinct from old.hora_fim then
      insert into salas_historico (escala_id, tipo_mudanca, campo_alterado, valor_anterior, valor_novo, alterado_por)
      values (new.id, 'alteracao_horario', 'horario',
        old.hora_inicio::text || '-' || old.hora_fim::text,
        new.hora_inicio::text || '-' || new.hora_fim::text,
        new.updated_by);
    end if;
    if new.status is distinct from old.status then
      insert into salas_historico (escala_id, tipo_mudanca, campo_alterado, valor_anterior, valor_novo, alterado_por)
      values (new.id,
        case when new.status = 'fechada_temporariamente' then 'fechamento'
             when old.status = 'fechada_temporariamente' and new.status = 'ativa' then 'reativacao'
             else 'observacao' end,
        'status', old.status, new.status, new.updated_by);
    end if;
    return new;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_salas_escalas_log on salas_escalas;
create trigger trg_salas_escalas_log
  after insert or update on salas_escalas
  for each row execute function salas_log_escala_changes();

-- RLS do módulo Salas
alter table salas_unidades enable row level security;
alter table salas_categorias enable row level security;
alter table salas_fisicas enable row level security;
alter table salas_escalas enable row level security;
alter table salas_fechamentos enable row level security;
alter table salas_historico enable row level security;

drop policy if exists "salas_unidades_select" on salas_unidades;
create policy "salas_unidades_select" on salas_unidades for select
  using (company_id in (select company_id from profiles where id = auth.uid()));
drop policy if exists "salas_unidades_insert" on salas_unidades;
create policy "salas_unidades_insert" on salas_unidades for insert
  with check (company_id in (select company_id from profiles where id = auth.uid() and role in ('admin','editor')));
drop policy if exists "salas_unidades_update" on salas_unidades;
create policy "salas_unidades_update" on salas_unidades for update
  using (company_id in (select company_id from profiles where id = auth.uid() and role in ('admin','editor')));
drop policy if exists "salas_unidades_delete" on salas_unidades;
create policy "salas_unidades_delete" on salas_unidades for delete
  using (company_id in (select company_id from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "salas_categorias_all" on salas_categorias;
create policy "salas_categorias_all" on salas_categorias for all
  using (unidade_id in (select id from salas_unidades where company_id in (select company_id from profiles where id = auth.uid())));

drop policy if exists "salas_fisicas_all" on salas_fisicas;
create policy "salas_fisicas_all" on salas_fisicas for all
  using (unidade_id in (select id from salas_unidades where company_id in (select company_id from profiles where id = auth.uid())));

drop policy if exists "salas_escalas_all" on salas_escalas;
create policy "salas_escalas_all" on salas_escalas for all
  using (company_id in (select company_id from profiles where id = auth.uid()));

drop policy if exists "salas_fechamentos_all" on salas_fechamentos;
create policy "salas_fechamentos_all" on salas_fechamentos for all
  using (escala_id in (select id from salas_escalas where company_id in (select company_id from profiles where id = auth.uid())));

drop policy if exists "salas_historico_select" on salas_historico;
create policy "salas_historico_select" on salas_historico for select
  using (escala_id in (select id from salas_escalas where company_id in (select company_id from profiles where id = auth.uid())));

-- ═══════════════════════════════════════════
-- 6. SEED PADRÃO DO MÓDULO SALAS (função reutilizável)
--    Chame depois de criar sua empresa:
--      select seed_salas_padrao('<company_id>');
--    (o arquivo 2_empresa_e_admin.sql já faz isso)
-- ═══════════════════════════════════════════

create or replace function public.seed_salas_padrao(p_company_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_eq1_id uuid;
  v_eq2_id uuid;
begin
  if not exists (select 1 from companies where id = p_company_id) then
    raise exception 'Company % não encontrada', p_company_id;
  end if;

  -- Unidades
  insert into salas_unidades (company_id, codigo, nome, cor_hex, ordem_exibicao) values
    (p_company_id, 'EQ1', 'Equilibrium 1', '1a1a1a', 1),
    (p_company_id, 'EQ2', 'Equilibrium 2', '4d4d4d', 2)
  on conflict (company_id, codigo) do update set nome = excluded.nome;

  select id into v_eq1_id from salas_unidades where company_id = p_company_id and codigo = 'EQ1';
  select id into v_eq2_id from salas_unidades where company_id = p_company_id and codigo = 'EQ2';

  -- Categorias EQ1
  insert into salas_categorias (unidade_id, codigo, nome, ordem_exibicao, valor_sessao, duracao_sessao_min) values
    (v_eq1_id, 'PSICO', 'Psicólogos',      1, 250.00, 50),
    (v_eq1_id, 'PSIQ',  'Psiquiatras',     2, 450.00, 50),
    (v_eq1_id, 'NEURO', 'Neuropsicólogos', 3, 350.00, 60)
  on conflict (unidade_id, codigo) do update set nome = excluded.nome;

  -- Categorias EQ2
  insert into salas_categorias (unidade_id, codigo, nome, ordem_exibicao, valor_sessao, duracao_sessao_min) values
    (v_eq2_id, 'ABA',   'Psicoterapia ABA',    1, 180.00, 50),
    (v_eq2_id, 'FONO',  'Fonoaudiologia',      2, 180.00, 50),
    (v_eq2_id, 'TO',    'Terapia Ocupacional', 3, 180.00, 50),
    (v_eq2_id, 'PSP',   'Psicopedagogia',      4, 180.00, 50),
    (v_eq2_id, 'MUSIC', 'Musicoterapia',       5, 180.00, 50),
    (v_eq2_id, 'PSM',   'Psicomotricidade',    6, 180.00, 50),
    (v_eq2_id, 'PSIQ',  'Psiquiatras EQ2',     7, 450.00, 50)
  on conflict (unidade_id, codigo) do update set nome = excluded.nome;

  -- Salas EQ1 — numeração centenal (101-107, 201-207, 301-307)
  insert into salas_fisicas (unidade_id, numero, andar)
  select v_eq1_id, (andar_n * 100 + sala_n)::text, andar_n || 'ºPISO'
  from generate_series(1, 3) andar_n, generate_series(1, 7) sala_n
  on conflict (unidade_id, numero) do nothing;

  -- Salas EQ2 — Sala 0 (TO), Auditório, Salas 1 a 12
  insert into salas_fisicas (unidade_id, numero, andar, apelido) values
    (v_eq2_id, '0', 'TÉRREO', 'Sala TO'),
    (v_eq2_id, 'AUD', 'TÉRREO', 'Auditório')
  on conflict (unidade_id, numero) do nothing;
  insert into salas_fisicas (unidade_id, numero, andar)
  select v_eq2_id, n::text, 'TÉRREO' from generate_series(1, 12) n
  on conflict (unidade_id, numero) do nothing;

  raise notice 'Seed do módulo Salas concluído para company %', p_company_id;
end;
$$;

-- ═══════════════════════════════════════════
-- FIM — agora rode o 2_empresa_e_admin.sql
-- ═══════════════════════════════════════════
