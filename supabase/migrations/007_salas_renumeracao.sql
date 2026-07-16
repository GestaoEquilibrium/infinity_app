-- ═══════════════════════════════════════════════════════════════════════════
-- Infinity — Migration 007
-- Renumeração de salas: padrão de casa centenal
--
-- EQ1: 21 salas em 3 andares (101-107, 201-207, 301-307)
-- EQ2: 14 salas no térreo: Sala 0 (TO), Auditório, Salas 1 a 12
--
-- Mudanças:
--   1. Apaga TODAS as escalas e fechamentos da company Equilibrium
--   2. Apaga salas físicas antigas (S01-S07 com andares separados)
--   3. Drop constraint UNIQUE (unidade_id, numero, andar)
--      Recria como UNIQUE (unidade_id, numero) — andar agora é nullable e
--      meramente informativo; a identidade da sala é só o número
--   4. Recria salas com nova numeração
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_company_id uuid := '7b8a5efa-c15f-4ff0-a223-75acd6003f15';
  v_eq1_id uuid;
  v_eq2_id uuid;
begin
  -- Pega IDs das unidades
  select id into v_eq1_id from salas_unidades where company_id = v_company_id and codigo = 'EQ1';
  select id into v_eq2_id from salas_unidades where company_id = v_company_id and codigo = 'EQ2';

  if v_eq1_id is null or v_eq2_id is null then
    raise exception 'Unidades EQ1/EQ2 não encontradas — rode 005_salas_module.sql primeiro';
  end if;

  -- ── 1. Apagar escalas e fechamentos da company ──
  delete from salas_fechamentos where escala_id in (select id from salas_escalas where company_id = v_company_id);
  delete from salas_escalas where company_id = v_company_id;
  raise notice 'Escalas e fechamentos antigos apagados.';

  -- ── 2. Apagar salas físicas antigas das duas unidades ──
  delete from salas_fisicas where unidade_id in (v_eq1_id, v_eq2_id);
  raise notice 'Salas físicas antigas apagadas.';
end $$;

-- ── 3. Ajustar constraint UNIQUE (fora do DO porque DDL não pode estar dentro) ──
-- Drop constraint antiga
alter table salas_fisicas drop constraint if exists salas_fisicas_unidade_id_numero_andar_key;
-- Tornar andar nullable (caso ainda não seja)
alter table salas_fisicas alter column andar drop not null;
-- Nova constraint: identidade da sala é só (unidade, número)
alter table salas_fisicas drop constraint if exists salas_fisicas_unidade_id_numero_key;
alter table salas_fisicas add constraint salas_fisicas_unidade_id_numero_key unique (unidade_id, numero);

-- ── 4. Recriar salas com nova numeração ──
do $$
declare
  v_company_id uuid := '7b8a5efa-c15f-4ff0-a223-75acd6003f15';
  v_eq1_id uuid;
  v_eq2_id uuid;
begin
  select id into v_eq1_id from salas_unidades where company_id = v_company_id and codigo = 'EQ1';
  select id into v_eq2_id from salas_unidades where company_id = v_company_id and codigo = 'EQ2';

  -- ── EQ1 — 21 salas em 3 andares ──
  insert into salas_fisicas (unidade_id, numero, andar, status) values
    -- 1º andar
    (v_eq1_id, '101', null, 'ativa'),
    (v_eq1_id, '102', null, 'ativa'),
    (v_eq1_id, '103', null, 'ativa'),
    (v_eq1_id, '104', null, 'ativa'),
    (v_eq1_id, '105', null, 'ativa'),
    (v_eq1_id, '106', null, 'ativa'),
    (v_eq1_id, '107', null, 'ativa'),
    -- 2º andar
    (v_eq1_id, '201', null, 'ativa'),
    (v_eq1_id, '202', null, 'ativa'),
    (v_eq1_id, '203', null, 'ativa'),
    (v_eq1_id, '204', null, 'ativa'),
    (v_eq1_id, '205', null, 'ativa'),
    (v_eq1_id, '206', null, 'ativa'),
    (v_eq1_id, '207', null, 'ativa'),
    -- 3º andar
    (v_eq1_id, '301', null, 'ativa'),
    (v_eq1_id, '302', null, 'ativa'),
    (v_eq1_id, '303', null, 'ativa'),
    (v_eq1_id, '304', null, 'ativa'),
    (v_eq1_id, '305', null, 'ativa'),
    (v_eq1_id, '306', null, 'ativa'),
    (v_eq1_id, '307', null, 'ativa');

  -- ── EQ2 — 14 salas no térreo ──
  insert into salas_fisicas (unidade_id, numero, andar, apelido, status) values
    (v_eq2_id, '0',         null, 'Terapia Ocupacional', 'ativa'),
    (v_eq2_id, 'Auditório', null, 'Auditório',           'ativa'),
    (v_eq2_id, '1',         null, null, 'ativa'),
    (v_eq2_id, '2',         null, null, 'ativa'),
    (v_eq2_id, '3',         null, null, 'ativa'),
    (v_eq2_id, '4',         null, null, 'ativa'),
    (v_eq2_id, '5',         null, null, 'ativa'),
    (v_eq2_id, '6',         null, null, 'ativa'),
    (v_eq2_id, '7',         null, null, 'ativa'),
    (v_eq2_id, '8',         null, null, 'ativa'),
    (v_eq2_id, '9',         null, null, 'ativa'),
    (v_eq2_id, '10',        null, null, 'ativa'),
    (v_eq2_id, '11',        null, null, 'ativa'),
    (v_eq2_id, '12',        null, null, 'ativa');

  raise notice 'EQ1: 21 salas criadas (101-107, 201-207, 301-307).';
  raise notice 'EQ2: 14 salas criadas (Sala 0/TO, Auditório, 1-12).';
end $$;

-- ── Verificação ──
-- select su.codigo, count(*) as total
-- from salas_fisicas sf
-- join salas_unidades su on su.id = sf.unidade_id
-- where su.company_id = '7b8a5efa-c15f-4ff0-a223-75acd6003f15'
-- group by su.codigo;
-- esperado: EQ1 = 21, EQ2 = 14
