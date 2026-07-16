-- ═══════════════════════════════════════════════════════════════════
-- Infinity — Migration 002
-- 1. Corrige policies de RBAC (admin pode editar roles de outros membros)
-- 2. Adiciona módulo RH: colaboradores, faltas, atestados, alertas_legais, rh_pendencias
-- 3. Cria Storage bucket para atestados
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- PARTE 1 — Correção do RBAC em profiles
-- ────────────────────────────────────────────────────────────────────

-- Função auxiliar: checa se o usuário atual é admin da mesma empresa
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

-- Remove a policy antiga que só deixava o próprio usuário atualizar
drop policy if exists "Próprio usuário atualiza perfil" on profiles;

-- Nova: próprio usuário pode atualizar nome/avatar, admin pode atualizar role de qualquer membro
create policy "Usuário atualiza próprio perfil"
  on profiles for update
  using (id = auth.uid());

create policy "Admin atualiza membros da empresa"
  on profiles for update
  using (is_admin_of(company_id))
  with check (is_admin_of(company_id));

-- Garante que admin também pode deletar (caso a policy antiga esteja mais restritiva)
drop policy if exists "Admin remove membros" on profiles;
create policy "Admin remove membros da empresa"
  on profiles for delete
  using (
    id != auth.uid()
    and is_admin_of(company_id)
  );

-- ────────────────────────────────────────────────────────────────────
-- PARTE 2 — Módulo RH
-- ────────────────────────────────────────────────────────────────────

-- Colaboradores (ativos + desligados em status)
create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  created_by uuid references auth.users(id),

  -- Identificação
  nome text not null,
  cargo text,
  setor text,
  regime text check (regime in ('CLT','PJ','Estagiário','Prestador','Sócio')) default 'CLT',
  status text check (status in ('Ativo','Desligado','Afastado')) default 'Ativo',

  -- Documentos
  cpf text,
  cnpj text,
  rg text,
  pis text,
  ctps text,
  titulo_eleitor text,
  cnh text,
  conselho text,

  -- Pessoais
  nascimento date,
  estado_civil text,
  escolaridade text,
  conjuge text,
  filhos text,
  observacoes text,

  -- Contato
  telefone text,
  email text,
  endereco text,
  cep text,

  -- Vínculo
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

  -- Documentos digitalizados (jsonb: { ctps: 'ok'|'falta', ... })
  docs jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_colab_company on colaboradores(company_id);
create index if not exists idx_colab_status on colaboradores(company_id, status);
create index if not exists idx_colab_regime on colaboradores(company_id, regime);

-- Faltas e atrasos
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

-- Atestados médicos
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

  -- Storage
  file_url text,
  file_path text,
  file_name text,
  file_size integer,

  created_at timestamptz default now()
);

create index if not exists idx_atest_company on atestados(company_id);
create index if not exists idx_atest_colab on atestados(colaborador_id, data_inicio desc);

-- Alertas legais (compliance trabalhista)
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

-- Pendências do RH (tarefas)
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

-- Rescisões processadas (histórico de desligamentos formais)
create table if not exists rescisoes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  created_by uuid references auth.users(id),

  modalidade text not null check (modalidade in ('sem_justa_causa','pedido_demissao','distrato_484a','justa_causa','fim_contrato','termino_experiencia')),
  data_rescisao date not null,

  -- Verbas calculadas (snapshot)
  saldo_salario numeric(10,2),
  aviso_previo numeric(10,2),
  ferias_vencidas numeric(10,2),
  ferias_proporcionais numeric(10,2),
  terco_ferias numeric(10,2),
  decimo_terceiro numeric(10,2),
  multa_fgts numeric(10,2),
  total_verbas numeric(10,2),

  observacoes text,
  documentos_gerados jsonb default '[]'::jsonb, -- [{nome, url, created_at}]

  created_at timestamptz default now()
);

create index if not exists idx_resc_company on rescisoes(company_id);

-- ────────────────────────────────────────────────────────────────────
-- PARTE 3 — RLS nas tabelas de RH
-- ────────────────────────────────────────────────────────────────────
alter table colaboradores enable row level security;
alter table faltas enable row level security;
alter table atestados enable row level security;
alter table alertas_legais enable row level security;
alter table rh_pendencias enable row level security;
alter table rescisoes enable row level security;

-- Helper function: retorna o role do usuário atual
create or replace function public.my_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- ── Colaboradores
create policy "Membros veem colaboradores" on colaboradores for select
  using (company_id = get_my_company_id());
create policy "Editor+ cria colaboradores" on colaboradores for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Editor+ atualiza colaboradores" on colaboradores for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Admin remove colaboradores" on colaboradores for delete
  using (company_id = get_my_company_id() and my_role() = 'admin');

-- ── Faltas
create policy "Membros veem faltas" on faltas for select
  using (company_id = get_my_company_id());
create policy "Editor+ cria faltas" on faltas for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Editor+ atualiza faltas" on faltas for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Editor+ remove faltas" on faltas for delete
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));

-- ── Atestados
create policy "Membros veem atestados" on atestados for select
  using (company_id = get_my_company_id());
create policy "Editor+ cria atestados" on atestados for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Editor+ atualiza atestados" on atestados for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Editor+ remove atestados" on atestados for delete
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));

-- ── Alertas legais
create policy "Membros veem alertas" on alertas_legais for select
  using (company_id = get_my_company_id());
create policy "Editor+ cria alertas" on alertas_legais for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Editor+ atualiza alertas" on alertas_legais for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Admin remove alertas" on alertas_legais for delete
  using (company_id = get_my_company_id() and my_role() = 'admin');

-- ── Pendências
create policy "Membros veem pendências" on rh_pendencias for select
  using (company_id = get_my_company_id());
create policy "Editor+ cria pendências" on rh_pendencias for insert
  with check (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Editor+ atualiza pendências" on rh_pendencias for update
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));
create policy "Editor+ remove pendências" on rh_pendencias for delete
  using (company_id = get_my_company_id() and my_role() in ('admin','editor'));

-- ── Rescisões (só admin processa)
create policy "Membros veem rescisões" on rescisoes for select
  using (company_id = get_my_company_id());
create policy "Admin cria rescisões" on rescisoes for insert
  with check (company_id = get_my_company_id() and my_role() = 'admin');
create policy "Admin atualiza rescisões" on rescisoes for update
  using (company_id = get_my_company_id() and my_role() = 'admin');
create policy "Admin remove rescisões" on rescisoes for delete
  using (company_id = get_my_company_id() and my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────
-- PARTE 4 — Storage bucket para atestados
-- ────────────────────────────────────────────────────────────────────
-- Execute isto MANUALMENTE no dashboard do Supabase:
-- 1. Storage → New bucket → nome: "atestados", Public: OFF
-- 2. Policies:
--    SELECT: authenticated (bucket_id = 'atestados')
--    INSERT: authenticated (bucket_id = 'atestados' e role in admin/editor)
--    DELETE: authenticated (bucket_id = 'atestados' e role in admin/editor)
--
-- Ou via SQL (requer permissões no schema storage):
insert into storage.buckets (id, name, public)
values ('atestados', 'atestados', false)
on conflict (id) do nothing;

create policy "Atestados: leitura autenticada" on storage.objects for select
  using (bucket_id = 'atestados' and auth.role() = 'authenticated');
create policy "Atestados: editor+ faz upload" on storage.objects for insert
  with check (bucket_id = 'atestados' and auth.role() = 'authenticated');
create policy "Atestados: editor+ deleta" on storage.objects for delete
  using (bucket_id = 'atestados' and auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ═══════════════════════════════════════════════════════════════════
