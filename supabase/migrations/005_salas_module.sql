-- ═══════════════════════════════════════════════════════════════════════════
-- Infinity — Migration 005
-- Módulo de Salas — gestão de escalas, ocupação e disponibilidade
--
-- Cria:
--   - salas_unidades       (EQ1, EQ2)
--   - salas_categorias     (Psicólogos, Psiquiatras, Neuro, ABA, Fono, TO, PSP, Music, PSM)
--   - salas_fisicas        (24 salas físicas distribuídas em EQ1 e EQ2)
--   - salas_escalas        (quem ocupa qual sala em qual horário)
--   - salas_fechamentos    (fechamentos parciais por dia da semana — ex: Karolina qua/sex)
--   - salas_historico      (auditoria automática via trigger)
--
-- Tudo multi-tenant via company_id, com RLS por papel (admin/editor/viewer).
-- Reutiliza colaboradores(id) para vincular profissionais.
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. UNIDADES
-- ────────────────────────────────────────────────────────────────────
create table if not exists salas_unidades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  codigo text not null,                            -- 'EQ1', 'EQ2'
  nome text not null,                              -- 'Equilibrium 1'
  endereco text,
  cor_hex text default '1F4E79',
  ordem_exibicao int not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, codigo)
);
create index if not exists idx_salas_unidades_company on salas_unidades(company_id);

-- ────────────────────────────────────────────────────────────────────
-- 2. CATEGORIAS DE ESPECIALIDADE
-- ────────────────────────────────────────────────────────────────────
create table if not exists salas_categorias (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references salas_unidades(id) on delete cascade,
  codigo text not null,                            -- 'PSICO','PSIQ','NEURO','ABA','FONO','TO','PSP','MUSIC','PSM'
  nome text not null,
  cor_fundo_hex text default 'F2F2F2',
  cor_texto_hex text default '333333',
  ordem_exibicao int not null default 0,
  valor_sessao numeric(10,2) default 0,            -- valor médio da sessão (alimenta cálculo de receita potencial)
  duracao_sessao_min int default 50,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unidade_id, codigo)
);
create index if not exists idx_salas_categorias_unidade on salas_categorias(unidade_id);

-- ────────────────────────────────────────────────────────────────────
-- 3. SALAS FÍSICAS
-- ────────────────────────────────────────────────────────────────────
create table if not exists salas_fisicas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references salas_unidades(id) on delete restrict,
  numero text not null,                            -- '01','02','03'...
  andar text not null,                             -- 'TÉRREO','1ºPISO','2ºPISO','3ºPISO'
  apelido text,
  status text check (status in ('ativa','manutencao','desativada')) default 'ativa',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unidade_id, numero, andar)
);
create index if not exists idx_salas_fisicas_unidade on salas_fisicas(unidade_id);
create index if not exists idx_salas_fisicas_status on salas_fisicas(status);

-- ────────────────────────────────────────────────────────────────────
-- 4. ESCALAS — tabela central
-- ────────────────────────────────────────────────────────────────────
create table if not exists salas_escalas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  categoria_id uuid not null references salas_categorias(id) on delete restrict,
  sala_id uuid references salas_fisicas(id) on delete set null,    -- nullable: itinerantes
  dia_semana smallint not null check (dia_semana between 1 and 7),  -- 1=segunda...7=domingo
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

-- ────────────────────────────────────────────────────────────────────
-- 5. FECHAMENTOS PARCIAIS (Karolina qua/sex etc.)
-- ────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────
-- 6. HISTÓRICO (auditoria)
-- ────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────
-- 7. TRIGGERS
-- ────────────────────────────────────────────────────────────────────
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

-- Trigger de histórico
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

-- ────────────────────────────────────────────────────────────────────
-- 8. RLS POLICIES (segue padrão do Infinity)
-- ────────────────────────────────────────────────────────────────────
alter table salas_unidades enable row level security;
alter table salas_categorias enable row level security;
alter table salas_fisicas enable row level security;
alter table salas_escalas enable row level security;
alter table salas_fechamentos enable row level security;
alter table salas_historico enable row level security;

-- Unidades: só vê/edita da própria empresa
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

-- Categorias: via unidade
drop policy if exists "salas_categorias_all" on salas_categorias;
create policy "salas_categorias_all" on salas_categorias for all
  using (unidade_id in (select id from salas_unidades where company_id in (select company_id from profiles where id = auth.uid())));

-- Salas físicas: via unidade
drop policy if exists "salas_fisicas_all" on salas_fisicas;
create policy "salas_fisicas_all" on salas_fisicas for all
  using (unidade_id in (select id from salas_unidades where company_id in (select company_id from profiles where id = auth.uid())));

-- Escalas: por company_id
drop policy if exists "salas_escalas_all" on salas_escalas;
create policy "salas_escalas_all" on salas_escalas for all
  using (company_id in (select company_id from profiles where id = auth.uid()));

-- Fechamentos: via escala
drop policy if exists "salas_fechamentos_all" on salas_fechamentos;
create policy "salas_fechamentos_all" on salas_fechamentos for all
  using (escala_id in (select id from salas_escalas where company_id in (select company_id from profiles where id = auth.uid())));

-- Histórico: somente leitura
drop policy if exists "salas_historico_select" on salas_historico;
create policy "salas_historico_select" on salas_historico for select
  using (escala_id in (select id from salas_escalas where company_id in (select company_id from profiles where id = auth.uid())));

-- ────────────────────────────────────────────────────────────────────
-- 9. SEED INICIAL — popula EQ1, EQ2 e categorias para a empresa Equilibrium
-- ────────────────────────────────────────────────────────────────────
-- Roda apenas para a company_id do Equilibrium (idempotente via ON CONFLICT)

do $$
declare
  v_company_id uuid := '7b8a5efa-c15f-4ff0-a223-75acd6003f15';
  v_eq1_id uuid;
  v_eq2_id uuid;
begin
  -- Só seed se a company existir
  if not exists (select 1 from companies where id = v_company_id) then
    raise notice 'Company % não encontrada — pulando seed', v_company_id;
    return;
  end if;

  -- Unidades
  insert into salas_unidades (company_id, codigo, nome, cor_hex, ordem_exibicao) values
    (v_company_id, 'EQ1', 'Equilibrium 1', '1F4E79', 1),
    (v_company_id, 'EQ2', 'Equilibrium 2', '0E6655', 2)
  on conflict (company_id, codigo) do update set nome=excluded.nome, cor_hex=excluded.cor_hex;

  select id into v_eq1_id from salas_unidades where company_id = v_company_id and codigo = 'EQ1';
  select id into v_eq2_id from salas_unidades where company_id = v_company_id and codigo = 'EQ2';

  -- Categorias EQ1
  insert into salas_categorias (unidade_id, codigo, nome, cor_fundo_hex, cor_texto_hex, ordem_exibicao, valor_sessao, duracao_sessao_min) values
    (v_eq1_id, 'PSICO', 'Psicólogos',      'D6EAF8', '1A5276', 1, 250.00, 50),
    (v_eq1_id, 'PSIQ',  'Psiquiatras',     'FADBD8', '922B21', 2, 450.00, 50),
    (v_eq1_id, 'NEURO', 'Neuropsicólogos', 'E8DAEF', '6C3483', 3, 350.00, 60)
  on conflict (unidade_id, codigo) do update set nome=excluded.nome, cor_fundo_hex=excluded.cor_fundo_hex, cor_texto_hex=excluded.cor_texto_hex;

  -- Categorias EQ2
  insert into salas_categorias (unidade_id, codigo, nome, cor_fundo_hex, cor_texto_hex, ordem_exibicao, valor_sessao, duracao_sessao_min) values
    (v_eq2_id, 'ABA',   'Psicoterapia ABA',     'FEF9E7', '7D6608', 1, 180.00, 50),
    (v_eq2_id, 'FONO',  'Fonoaudiologia',       'D5F5E3', '1E8449', 2, 180.00, 50),
    (v_eq2_id, 'TO',    'Terapia Ocupacional',  'FDEBD0', 'B7472A', 3, 180.00, 50),
    (v_eq2_id, 'PSP',   'Psicopedagogia',       'D6EEF8', '1A618B', 4, 180.00, 50),
    (v_eq2_id, 'MUSIC', 'Musicoterapia',        'F5CBA7', '935116', 5, 180.00, 50),
    (v_eq2_id, 'PSM',   'Psicomotricidade',     'FAD7A0', '784212', 6, 180.00, 50),
    (v_eq2_id, 'PSIQ',  'Psiquiatras EQ2',      'FADBD8', '922B21', 7, 450.00, 50)
  on conflict (unidade_id, codigo) do update set nome=excluded.nome, cor_fundo_hex=excluded.cor_fundo_hex, cor_texto_hex=excluded.cor_texto_hex;

  -- Salas físicas EQ1
  insert into salas_fisicas (unidade_id, numero, andar) values
    (v_eq1_id, '01', '1ºPISO'), (v_eq1_id, '01', '2ºPISO'), (v_eq1_id, '01', '3ºPISO'),
    (v_eq1_id, '02', '1ºPISO'), (v_eq1_id, '02', '2ºPISO'), (v_eq1_id, '02', '3ºPISO'),
    (v_eq1_id, '03', '2ºPISO'), (v_eq1_id, '03', '3ºPISO'),
    (v_eq1_id, '04', '1ºPISO'), (v_eq1_id, '04', '2ºPISO'),
    (v_eq1_id, '05', '1ºPISO'),
    (v_eq1_id, '06', '2ºPISO'),
    (v_eq1_id, '07', '1ºPISO'), (v_eq1_id, '07', '2ºPISO')
  on conflict (unidade_id, numero, andar) do nothing;

  -- Salas físicas EQ2
  insert into salas_fisicas (unidade_id, numero, andar) values
    (v_eq2_id, '01', 'TÉRREO'), (v_eq2_id, '04', 'TÉRREO'),
    (v_eq2_id, '05', '2ºPISO'), (v_eq2_id, '06', '2ºPISO'),
    (v_eq2_id, '08', '1ºPISO'), (v_eq2_id, '09', '1ºPISO'),
    (v_eq2_id, '10', '1ºPISO'), (v_eq2_id, '11', '1ºPISO'),
    (v_eq2_id, '12', '1ºPISO'), (v_eq2_id, '13', '1ºPISO')
  on conflict (unidade_id, numero, andar) do nothing;

  raise notice 'Seed do módulo Salas concluído. Unidades, categorias e salas criadas.';
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- FIM da migration 005
-- Próximo passo: vincular escalas reais aos colaboradores via UI ou
-- script de seed específico (ver docs/salas_seed_escalas.sql).
-- ════════════════════════════════════════════════════════════════════════
