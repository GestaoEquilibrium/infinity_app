-- ═══════════════════════════════════════════════════════════════════════════
-- Infinity — Migration 008
-- Re-seed das escalas com a nova numeração de salas (casa centenal)
--
-- 223 escalas para 33 profissionais
-- 4 fechamentos parciais (Karolina qua/sex)
--
-- Pré-requisito: 007_salas_renumeracao.sql aplicada (cria as 35 salas novas).
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_company_id uuid := '7b8a5efa-c15f-4ff0-a223-75acd6003f15';
  v_user_id uuid;
  v_prof_francisca uuid;
  v_prof_jessica uuid;
  v_prof_kenia uuid;
  v_prof_lais uuid;
  v_prof_mara uuid;
  v_prof_michelle uuid;
  v_prof_rosana uuid;
  v_prof_silvia uuid;
  v_prof_andre uuid;
  v_prof_bruno uuid;
  v_prof_eduardo uuid;
  v_prof_luan uuid;
  v_prof_lucas uuid;
  v_prof_paulo uuid;
  v_prof_priscila uuid;
  v_prof_emilly uuid;
  v_prof_karolina uuid;
  v_prof_mariana uuid;
  v_prof_pamela uuid;
  v_prof_tais uuid;
  v_prof_vitoria uuid;
  v_prof_wessilon uuid;
  v_prof_mayumi uuid;
  v_prof_aline uuid;
  v_prof_hugo uuid;
  v_prof_lara uuid;
  v_prof_ana_maria uuid;
  v_prof_daiane uuid;
  v_prof_sandra uuid;
  v_prof_mona uuid;
  v_prof_marcus uuid;
  v_prof_vitor uuid;
  v_prof_welligton uuid;
  v_sala_eq1_101 uuid;
  v_sala_eq1_102 uuid;
  v_sala_eq1_104 uuid;
  v_sala_eq1_105 uuid;
  v_sala_eq1_107 uuid;
  v_sala_eq1_201 uuid;
  v_sala_eq1_202 uuid;
  v_sala_eq1_203 uuid;
  v_sala_eq1_204 uuid;
  v_sala_eq1_206 uuid;
  v_sala_eq1_207 uuid;
  v_sala_eq1_301 uuid;
  v_sala_eq1_302 uuid;
  v_sala_eq1_303 uuid;
  v_sala_eq2_1 uuid;
  v_sala_eq2_4 uuid;
  v_sala_eq2_5 uuid;
  v_sala_eq2_6 uuid;
  v_sala_eq2_8 uuid;
  v_sala_eq2_9 uuid;
  v_sala_eq2_10 uuid;
  v_sala_eq2_11 uuid;
  v_sala_eq2_12 uuid;
  v_sala_eq2_7 uuid;
  v_cat_eq1_psico uuid;
  v_cat_eq1_psiq uuid;
  v_cat_eq1_neuro uuid;
  v_cat_eq2_aba uuid;
  v_cat_eq2_fono uuid;
  v_cat_eq2_to uuid;
  v_cat_eq2_psp uuid;
  v_cat_eq2_music uuid;
  v_cat_eq2_psm uuid;
  v_cat_eq2_psiq uuid;
begin
  select id into v_user_id from profiles where company_id = v_company_id and role = 'admin' limit 1;

  -- ── Resolver IDs de profissionais ──
  select id into v_prof_francisca from colaboradores where company_id = v_company_id and upper(nome) like upper('FRANCISCA%') limit 1;
  select id into v_prof_jessica from colaboradores where company_id = v_company_id and upper(nome) like upper('JESSICA%') limit 1;
  select id into v_prof_kenia from colaboradores where company_id = v_company_id and upper(nome) like upper('KENIA%') limit 1;
  select id into v_prof_lais from colaboradores where company_id = v_company_id and upper(nome) like upper('LAIS%') limit 1;
  select id into v_prof_mara from colaboradores where company_id = v_company_id and upper(nome) like upper('MARA %') and upper(nome) not like upper('MARIANA%') limit 1;
  if v_prof_mara is null then select id into v_prof_mara from colaboradores where company_id = v_company_id and upper(nome) = 'MARA' limit 1; end if;
  select id into v_prof_michelle from colaboradores where company_id = v_company_id and upper(nome) like upper('MICHELLE%') limit 1;
  select id into v_prof_rosana from colaboradores where company_id = v_company_id and upper(nome) like upper('ROSANA%') limit 1;
  select id into v_prof_silvia from colaboradores where company_id = v_company_id and upper(nome) like upper('SILVIA%') limit 1;
  select id into v_prof_andre from colaboradores where company_id = v_company_id and upper(nome) like upper('ANDRE%') limit 1;
  select id into v_prof_bruno from colaboradores where company_id = v_company_id and upper(nome) like upper('BRUNO%') limit 1;
  select id into v_prof_eduardo from colaboradores where company_id = v_company_id and upper(nome) like upper('EDUARDO%') limit 1;
  select id into v_prof_luan from colaboradores where company_id = v_company_id and upper(nome) like upper('LUAN%') limit 1;
  select id into v_prof_lucas from colaboradores where company_id = v_company_id and upper(nome) like upper('LUCAS%') limit 1;
  select id into v_prof_paulo from colaboradores where company_id = v_company_id and upper(nome) like upper('PAULO%') limit 1;
  select id into v_prof_priscila from colaboradores where company_id = v_company_id and upper(nome) like upper('PRISCILA%') limit 1;
  select id into v_prof_emilly from colaboradores where company_id = v_company_id and upper(nome) like upper('EMILLY%') limit 1;
  select id into v_prof_karolina from colaboradores where company_id = v_company_id and upper(nome) like upper('KAROLINA%') limit 1;
  select id into v_prof_mariana from colaboradores where company_id = v_company_id and upper(nome) like upper('MARIANA%') limit 1;
  select id into v_prof_pamela from colaboradores where company_id = v_company_id and upper(nome) like upper('PAMELA%') limit 1;
  select id into v_prof_tais from colaboradores where company_id = v_company_id and upper(nome) like upper('TAIS%') limit 1;
  select id into v_prof_vitoria from colaboradores where company_id = v_company_id and upper(nome) like upper('VITORIA%') limit 1;
  select id into v_prof_wessilon from colaboradores where company_id = v_company_id and upper(nome) like upper('WESSILON%') limit 1;
  select id into v_prof_mayumi from colaboradores where company_id = v_company_id and upper(nome) like upper('MAYUMI%') limit 1;
  select id into v_prof_aline from colaboradores where company_id = v_company_id and upper(nome) like upper('ALINE%') limit 1;
  select id into v_prof_hugo from colaboradores where company_id = v_company_id and upper(nome) like upper('HUGO%') limit 1;
  select id into v_prof_lara from colaboradores where company_id = v_company_id and upper(nome) like upper('LARA%') limit 1;
  select id into v_prof_ana_maria from colaboradores where company_id = v_company_id and upper(nome) like upper('ANA%') limit 1;
  select id into v_prof_daiane from colaboradores where company_id = v_company_id and upper(nome) like upper('DAIANE%') limit 1;
  select id into v_prof_sandra from colaboradores where company_id = v_company_id and upper(nome) like upper('SANDRA%') limit 1;
  select id into v_prof_mona from colaboradores where company_id = v_company_id and upper(nome) like upper('MONA%') limit 1;
  select id into v_prof_marcus from colaboradores where company_id = v_company_id and upper(nome) like upper('MARCUS%') limit 1;
  select id into v_prof_vitor from colaboradores where company_id = v_company_id and upper(nome) like upper('VITOR %') and upper(nome) not like upper('VITORIA%') limit 1;
  if v_prof_vitor is null then select id into v_prof_vitor from colaboradores where company_id = v_company_id and upper(nome) = 'VITOR' limit 1; end if;
  select id into v_prof_welligton from colaboradores where company_id = v_company_id and upper(nome) like upper('WELLIGTON%') limit 1;

  -- ── Resolver IDs de salas físicas (nova numeração) ──
  select sf.id into v_sala_eq1_101 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '101';
  select sf.id into v_sala_eq1_102 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '102';
  select sf.id into v_sala_eq1_104 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '104';
  select sf.id into v_sala_eq1_105 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '105';
  select sf.id into v_sala_eq1_107 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '107';
  select sf.id into v_sala_eq1_201 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '201';
  select sf.id into v_sala_eq1_202 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '202';
  select sf.id into v_sala_eq1_203 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '203';
  select sf.id into v_sala_eq1_204 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '204';
  select sf.id into v_sala_eq1_206 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '206';
  select sf.id into v_sala_eq1_207 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '207';
  select sf.id into v_sala_eq1_301 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '301';
  select sf.id into v_sala_eq1_302 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '302';
  select sf.id into v_sala_eq1_303 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sf.numero = '303';
  select sf.id into v_sala_eq2_1 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '1';
  select sf.id into v_sala_eq2_4 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '4';
  select sf.id into v_sala_eq2_5 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '5';
  select sf.id into v_sala_eq2_6 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '6';
  select sf.id into v_sala_eq2_8 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '8';
  select sf.id into v_sala_eq2_9 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '9';
  select sf.id into v_sala_eq2_10 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '10';
  select sf.id into v_sala_eq2_11 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '11';
  select sf.id into v_sala_eq2_12 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '12';
  select sf.id into v_sala_eq2_7 from salas_fisicas sf join salas_unidades su on su.id = sf.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sf.numero = '7';

  -- ── Resolver IDs de categorias ──
  select sc.id into v_cat_eq1_psico from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sc.codigo = 'PSICO';
  select sc.id into v_cat_eq1_psiq from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sc.codigo = 'PSIQ';
  select sc.id into v_cat_eq1_neuro from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ1' and sc.codigo = 'NEURO';
  select sc.id into v_cat_eq2_aba from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sc.codigo = 'ABA';
  select sc.id into v_cat_eq2_fono from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sc.codigo = 'FONO';
  select sc.id into v_cat_eq2_to from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sc.codigo = 'TO';
  select sc.id into v_cat_eq2_psp from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sc.codigo = 'PSP';
  select sc.id into v_cat_eq2_music from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sc.codigo = 'MUSIC';
  select sc.id into v_cat_eq2_psm from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sc.codigo = 'PSM';
  select sc.id into v_cat_eq2_psiq from salas_categorias sc join salas_unidades su on su.id = sc.unidade_id where su.company_id = v_company_id and su.codigo = 'EQ2' and sc.codigo = 'PSIQ';

  -- ── Diagnóstico de profissionais não encontrados ──
  if v_prof_francisca is null then raise notice 'AVISO: FRANCISCA não encontrado em colaboradores'; end if;
  if v_prof_jessica is null then raise notice 'AVISO: JESSICA não encontrado em colaboradores'; end if;
  if v_prof_kenia is null then raise notice 'AVISO: KENIA não encontrado em colaboradores'; end if;
  if v_prof_lais is null then raise notice 'AVISO: LAIS não encontrado em colaboradores'; end if;
  if v_prof_mara is null then raise notice 'AVISO: MARA não encontrado em colaboradores'; end if;
  if v_prof_michelle is null then raise notice 'AVISO: MICHELLE não encontrado em colaboradores'; end if;
  if v_prof_rosana is null then raise notice 'AVISO: ROSANA não encontrado em colaboradores'; end if;
  if v_prof_silvia is null then raise notice 'AVISO: SILVIA não encontrado em colaboradores'; end if;
  if v_prof_andre is null then raise notice 'AVISO: ANDRE não encontrado em colaboradores'; end if;
  if v_prof_bruno is null then raise notice 'AVISO: BRUNO não encontrado em colaboradores'; end if;
  if v_prof_eduardo is null then raise notice 'AVISO: EDUARDO não encontrado em colaboradores'; end if;
  if v_prof_luan is null then raise notice 'AVISO: LUAN não encontrado em colaboradores'; end if;
  if v_prof_lucas is null then raise notice 'AVISO: LUCAS não encontrado em colaboradores'; end if;
  if v_prof_paulo is null then raise notice 'AVISO: PAULO não encontrado em colaboradores'; end if;
  if v_prof_priscila is null then raise notice 'AVISO: PRISCILA não encontrado em colaboradores'; end if;
  if v_prof_emilly is null then raise notice 'AVISO: EMILLY não encontrado em colaboradores'; end if;
  if v_prof_karolina is null then raise notice 'AVISO: KAROLINA não encontrado em colaboradores'; end if;
  if v_prof_mariana is null then raise notice 'AVISO: MARIANA não encontrado em colaboradores'; end if;
  if v_prof_pamela is null then raise notice 'AVISO: PAMELA não encontrado em colaboradores'; end if;
  if v_prof_tais is null then raise notice 'AVISO: TAIS não encontrado em colaboradores'; end if;
  if v_prof_vitoria is null then raise notice 'AVISO: VITORIA não encontrado em colaboradores'; end if;
  if v_prof_wessilon is null then raise notice 'AVISO: WESSILON não encontrado em colaboradores'; end if;
  if v_prof_mayumi is null then raise notice 'AVISO: MAYUMI não encontrado em colaboradores'; end if;
  if v_prof_aline is null then raise notice 'AVISO: ALINE não encontrado em colaboradores'; end if;
  if v_prof_hugo is null then raise notice 'AVISO: HUGO não encontrado em colaboradores'; end if;
  if v_prof_lara is null then raise notice 'AVISO: LARA não encontrado em colaboradores'; end if;
  if v_prof_ana_maria is null then raise notice 'AVISO: ANA MARIA não encontrado em colaboradores'; end if;
  if v_prof_daiane is null then raise notice 'AVISO: DAIANE não encontrado em colaboradores'; end if;
  if v_prof_sandra is null then raise notice 'AVISO: SANDRA não encontrado em colaboradores'; end if;
  if v_prof_mona is null then raise notice 'AVISO: MONA não encontrado em colaboradores'; end if;
  if v_prof_marcus is null then raise notice 'AVISO: MARCUS não encontrado em colaboradores'; end if;
  if v_prof_vitor is null then raise notice 'AVISO: VITOR não encontrado em colaboradores'; end if;
  if v_prof_welligton is null then raise notice 'AVISO: WELLIGTON não encontrado em colaboradores'; end if;

  -- ── Limpa escalas antigas (idempotência) ──
  delete from salas_fechamentos where escala_id in (select id from salas_escalas where company_id = v_company_id);
  delete from salas_escalas where company_id = v_company_id;

  -- ── INSERT escalas em blocos IF por profissional ──
  if v_prof_francisca is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_francisca, v_cat_eq1_psico, v_sala_eq1_303, 1, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_francisca, v_cat_eq1_psico, v_sala_eq1_303, 2, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_francisca, v_cat_eq1_psico, v_sala_eq1_303, 3, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_francisca, v_cat_eq1_psico, v_sala_eq1_303, 4, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_francisca, v_cat_eq1_psico, v_sala_eq1_303, 5, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_francisca', (select count(*) from salas_escalas where colaborador_id = v_prof_francisca and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de FRANCISCA (não encontrado)';
  end if;

  if v_prof_jessica is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 1, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 1, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 2, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 2, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 3, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 3, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 4, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 4, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 5, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 5, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_jessica, v_cat_eq1_psico, v_sala_eq1_302, 6, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_jessica', (select count(*) from salas_escalas where colaborador_id = v_prof_jessica and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de JESSICA (não encontrado)';
  end if;

  if v_prof_kenia is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 1, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 1, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 2, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 2, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 3, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 3, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 4, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 4, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 5, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 5, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_kenia, v_cat_eq1_psico, v_sala_eq1_303, 6, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_kenia', (select count(*) from salas_escalas where colaborador_id = v_prof_kenia and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de KENIA (não encontrado)';
  end if;

  if v_prof_lais is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 1, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 1, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 1, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 2, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 2, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 2, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 3, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 3, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 3, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 4, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 4, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 4, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 5, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 5, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lais, v_cat_eq1_psico, v_sala_eq1_104, 5, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_lais', (select count(*) from salas_escalas where colaborador_id = v_prof_lais and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de LAIS (não encontrado)';
  end if;

  if v_prof_mara is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_mara, v_cat_eq1_psico, v_sala_eq1_302, 1, 'tarde', '13:00', '18:00', 'itinerante', 'Itinerante: 302 (seg), 206 (ter), 207 (qua/sex), 301 (qui)', v_user_id, v_user_id),
    (v_company_id, v_prof_mara, v_cat_eq1_psico, v_sala_eq1_206, 2, 'tarde', '13:00', '18:00', 'itinerante', 'Itinerante: 302 (seg), 206 (ter), 207 (qua/sex), 301 (qui)', v_user_id, v_user_id),
    (v_company_id, v_prof_mara, v_cat_eq1_psico, v_sala_eq1_207, 3, 'manha', '08:00', '13:00', 'itinerante', 'Itinerante: 302 (seg), 206 (ter), 207 (qua/sex), 301 (qui)', v_user_id, v_user_id),
    (v_company_id, v_prof_mara, v_cat_eq1_psico, v_sala_eq1_301, 4, 'tarde', '13:00', '18:00', 'itinerante', 'Itinerante: 302 (seg), 206 (ter), 207 (qua/sex), 301 (qui)', v_user_id, v_user_id),
    (v_company_id, v_prof_mara, v_cat_eq1_psico, v_sala_eq1_207, 5, 'manha', '08:00', '13:00', 'itinerante', 'Itinerante: 302 (seg), 206 (ter), 207 (qua/sex), 301 (qui)', v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_mara', (select count(*) from salas_escalas where colaborador_id = v_prof_mara and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de MARA (não encontrado)';
  end if;

  if v_prof_michelle is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 1, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 1, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 2, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 2, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 3, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 3, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 4, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 4, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 5, 'tarde', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 5, 'noite', '13:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_michelle, v_cat_eq1_psico, v_sala_eq1_105, 6, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_michelle', (select count(*) from salas_escalas where colaborador_id = v_prof_michelle and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de MICHELLE (não encontrado)';
  end if;

  if v_prof_rosana is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_rosana, v_cat_eq1_psico, v_sala_eq1_102, 1, 'manha', '08:30', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_rosana, v_cat_eq1_psico, v_sala_eq1_102, 1, 'tarde', '13:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_rosana, v_cat_eq1_psico, v_sala_eq1_102, 2, 'manha', '08:30', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_rosana, v_cat_eq1_psico, v_sala_eq1_102, 2, 'tarde', '13:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_rosana, v_cat_eq1_psico, v_sala_eq1_102, 3, 'manha', '08:30', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_rosana, v_cat_eq1_psico, v_sala_eq1_102, 3, 'tarde', '13:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_rosana, v_cat_eq1_psico, v_sala_eq1_102, 4, 'manha', '08:30', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_rosana, v_cat_eq1_psico, v_sala_eq1_102, 4, 'tarde', '13:00', '19:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_rosana', (select count(*) from salas_escalas where colaborador_id = v_prof_rosana and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de ROSANA (não encontrado)';
  end if;

  if v_prof_silvia is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_silvia, v_cat_eq1_psico, v_sala_eq1_301, 1, 'tarde', '16:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_silvia, v_cat_eq1_psico, v_sala_eq1_301, 1, 'noite', '16:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_silvia, v_cat_eq1_psico, v_sala_eq1_301, 2, 'tarde', '16:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_silvia, v_cat_eq1_psico, v_sala_eq1_301, 2, 'noite', '16:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_silvia, v_cat_eq1_psico, v_sala_eq1_301, 4, 'tarde', '16:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_silvia, v_cat_eq1_psico, v_sala_eq1_301, 4, 'noite', '16:00', '19:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_silvia', (select count(*) from salas_escalas where colaborador_id = v_prof_silvia and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de SILVIA (não encontrado)';
  end if;

  if v_prof_andre is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_andre, v_cat_eq1_psiq, v_sala_eq1_206, 5, 'tarde', '13:00', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_andre, v_cat_eq1_psiq, v_sala_eq1_206, 5, 'noite', '13:00', '19:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_andre', (select count(*) from salas_escalas where colaborador_id = v_prof_andre and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de ANDRE (não encontrado)';
  end if;

  if v_prof_bruno is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_bruno, v_cat_eq1_psiq, v_sala_eq1_301, 1, 'manha', '08:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_bruno, v_cat_eq1_psiq, v_sala_eq1_301, 2, 'manha', '08:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_bruno, v_cat_eq1_psiq, v_sala_eq1_301, 3, 'manha', '08:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_bruno, v_cat_eq1_psiq, v_sala_eq1_301, 4, 'manha', '08:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_bruno, v_cat_eq1_psiq, v_sala_eq1_301, 5, 'manha', '08:00', '11:30', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_bruno', (select count(*) from salas_escalas where colaborador_id = v_prof_bruno and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de BRUNO (não encontrado)';
  end if;

  if v_prof_eduardo is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_eduardo, v_cat_eq1_psiq, v_sala_eq1_206, 1, 'manha', '08:00', '12:00', 'sob_demanda', 'Atende sob demanda', v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_eduardo', (select count(*) from salas_escalas where colaborador_id = v_prof_eduardo and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de EDUARDO (não encontrado)';
  end if;

  if v_prof_luan is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_luan, v_cat_eq1_psiq, v_sala_eq1_207, 1, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_luan, v_cat_eq1_psiq, v_sala_eq1_207, 1, 'tarde', '14:30', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_luan, v_cat_eq1_psiq, v_sala_eq1_207, 2, 'tarde', '14:30', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_luan, v_cat_eq1_psiq, v_sala_eq1_207, 3, 'tarde', '14:30', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_luan, v_cat_eq1_psiq, v_sala_eq1_207, 4, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_luan, v_cat_eq1_psiq, v_sala_eq1_207, 4, 'tarde', '14:30', '17:30', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_luan', (select count(*) from salas_escalas where colaborador_id = v_prof_luan and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de LUAN (não encontrado)';
  end if;

  if v_prof_lucas is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_lucas, v_cat_eq1_psiq, v_sala_eq1_302, 4, 'tarde', '16:00', '19:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lucas, v_cat_eq1_psiq, v_sala_eq1_302, 4, 'noite', '16:00', '19:45', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_lucas', (select count(*) from salas_escalas where colaborador_id = v_prof_lucas and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de LUCAS (não encontrado)';
  end if;

  if v_prof_paulo is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_paulo, v_cat_eq1_psiq, v_sala_eq1_302, 1, 'tarde', '16:45', '20:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_paulo', (select count(*) from salas_escalas where colaborador_id = v_prof_paulo and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de PAULO (não encontrado)';
  end if;

  if v_prof_priscila is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_priscila, v_cat_eq1_psiq, v_sala_eq1_207, 2, 'manha', '07:00', '11:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_priscila, v_cat_eq1_psiq, v_sala_eq1_207, 6, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_priscila', (select count(*) from salas_escalas where colaborador_id = v_prof_priscila and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de PRISCILA (não encontrado)';
  end if;

  if v_prof_emilly is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 1, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 1, 'tarde', '13:00', '17:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 2, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 2, 'tarde', '13:00', '17:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 3, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 3, 'tarde', '13:00', '17:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 4, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 4, 'tarde', '13:00', '17:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 5, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_emilly, v_cat_eq1_neuro, v_sala_eq1_203, 5, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_emilly', (select count(*) from salas_escalas where colaborador_id = v_prof_emilly and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de EMILLY (não encontrado)';
  end if;

  if v_prof_karolina is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 1, 'manha', '08:00', '12:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 1, 'tarde', '13:00', '17:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 2, 'manha', '08:00', '12:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 2, 'tarde', '13:00', '17:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 3, 'manha', '07:00', '12:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 3, 'tarde', '13:00', '16:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 4, 'manha', '08:00', '12:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 4, 'tarde', '13:00', '17:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 5, 'manha', '07:00', '12:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id),
    (v_company_id, v_prof_karolina, v_cat_eq1_neuro, v_sala_eq1_201, 5, 'tarde', '13:00', '16:00', 'ativa', 'Agenda fechada quarta e sexta-feira', v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_karolina', (select count(*) from salas_escalas where colaborador_id = v_prof_karolina and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de KAROLINA (não encontrado)';
  end if;

  if v_prof_mariana is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_mariana, v_cat_eq1_neuro, v_sala_eq1_107, 1, 'manha', '07:30', '13:30', 'ativa', 'Entra 07:30 — corrigir registro 08:00', v_user_id, v_user_id),
    (v_company_id, v_prof_mariana, v_cat_eq1_neuro, v_sala_eq1_107, 2, 'manha', '07:30', '13:30', 'ativa', 'Entra 07:30 — corrigir registro 08:00', v_user_id, v_user_id),
    (v_company_id, v_prof_mariana, v_cat_eq1_neuro, v_sala_eq1_107, 3, 'manha', '07:30', '13:30', 'ativa', 'Entra 07:30 — corrigir registro 08:00', v_user_id, v_user_id),
    (v_company_id, v_prof_mariana, v_cat_eq1_neuro, v_sala_eq1_107, 4, 'manha', '07:30', '13:30', 'ativa', 'Entra 07:30 — corrigir registro 08:00', v_user_id, v_user_id),
    (v_company_id, v_prof_mariana, v_cat_eq1_neuro, v_sala_eq1_107, 5, 'manha', '07:30', '13:30', 'ativa', 'Entra 07:30 — corrigir registro 08:00', v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_mariana', (select count(*) from salas_escalas where colaborador_id = v_prof_mariana and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de MARIANA (não encontrado)';
  end if;

  if v_prof_pamela is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 1, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 1, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 2, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 2, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 3, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 3, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 4, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 4, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 5, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_pamela, v_cat_eq1_neuro, v_sala_eq1_204, 5, 'tarde', '13:00', '17:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_pamela', (select count(*) from salas_escalas where colaborador_id = v_prof_pamela and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de PAMELA (não encontrado)';
  end if;

  if v_prof_tais is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 1, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 1, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 2, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 2, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 3, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 3, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 4, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 4, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 5, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_tais, v_cat_eq1_neuro, v_sala_eq1_202, 5, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_tais', (select count(*) from salas_escalas where colaborador_id = v_prof_tais and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de TAIS (não encontrado)';
  end if;

  if v_prof_vitoria is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 1, 'manha', '07:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 1, 'tarde', '13:00', '18:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 2, 'manha', '07:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 2, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 3, 'manha', '07:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 3, 'tarde', '13:00', '18:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 4, 'manha', '07:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 4, 'tarde', '13:00', '16:45', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 5, 'manha', '07:00', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitoria, v_cat_eq1_neuro, v_sala_eq1_101, 5, 'tarde', '13:00', '14:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_vitoria', (select count(*) from salas_escalas where colaborador_id = v_prof_vitoria and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de VITORIA (não encontrado)';
  end if;

  if v_prof_wessilon is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 1, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 1, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 2, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 2, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 3, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 3, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 4, 'manha', '07:00', '12:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 4, 'tarde', '13:00', '15:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_wessilon, v_cat_eq1_neuro, v_sala_eq1_303, 5, 'manha', '07:00', '10:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_wessilon', (select count(*) from salas_escalas where colaborador_id = v_prof_wessilon and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de WESSILON (não encontrado)';
  end if;

  if v_prof_mayumi is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 1, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 1, 'tarde', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 1, 'noite', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 2, 'manha', '07:00', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 2, 'tarde', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 2, 'noite', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 3, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 3, 'tarde', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 3, 'noite', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 4, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 4, 'tarde', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 4, 'noite', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 5, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 5, 'tarde', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mayumi, v_cat_eq2_aba, v_sala_eq2_7, 5, 'noite', '13:45', '19:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_mayumi', (select count(*) from salas_escalas where colaborador_id = v_prof_mayumi and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de MAYUMI (não encontrado)';
  end if;

  if v_prof_aline is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 1, 'manha', '08:30', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 1, 'tarde', '13:00', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 2, 'manha', '08:30', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 2, 'tarde', '13:00', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 3, 'manha', '08:30', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 3, 'tarde', '13:00', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 4, 'manha', '08:30', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 4, 'tarde', '13:00', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 5, 'manha', '08:30', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_aline, v_cat_eq2_fono, v_sala_eq2_11, 5, 'tarde', '13:00', '17:30', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_aline', (select count(*) from salas_escalas where colaborador_id = v_prof_aline and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de ALINE (não encontrado)';
  end if;

  if v_prof_hugo is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 1, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 1, 'tarde', '13:00', '18:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 2, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 2, 'tarde', '13:00', '18:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 3, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 3, 'tarde', '13:00', '18:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 4, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 4, 'tarde', '13:00', '18:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 5, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_hugo, v_cat_eq2_fono, v_sala_eq2_10, 5, 'tarde', '13:00', '18:15', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_hugo', (select count(*) from salas_escalas where colaborador_id = v_prof_hugo and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de HUGO (não encontrado)';
  end if;

  if v_prof_lara is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_lara, v_cat_eq2_fono, v_sala_eq2_12, 1, 'manha', '07:45', '11:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lara, v_cat_eq2_fono, v_sala_eq2_12, 1, 'tarde', '12:15', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lara, v_cat_eq2_fono, v_sala_eq2_12, 3, 'tarde', '13:45', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_lara, v_cat_eq2_fono, v_sala_eq2_12, 5, 'manha', '07:45', '11:30', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_lara', (select count(*) from salas_escalas where colaborador_id = v_prof_lara and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de LARA (não encontrado)';
  end if;

  if v_prof_ana_maria is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 1, 'manha', '07:00', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 1, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 2, 'manha', '07:00', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 2, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 3, 'manha', '07:00', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 3, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 4, 'manha', '07:00', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 4, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 5, 'manha', '07:00', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_ana_maria, v_cat_eq2_psp, v_sala_eq2_8, 5, 'tarde', '13:00', '16:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_ana_maria', (select count(*) from salas_escalas where colaborador_id = v_prof_ana_maria and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de ANA MARIA (não encontrado)';
  end if;

  if v_prof_daiane is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_daiane, v_cat_eq2_psp, v_sala_eq2_9, 1, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_daiane, v_cat_eq2_psp, v_sala_eq2_9, 2, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_daiane, v_cat_eq2_psp, v_sala_eq2_9, 3, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_daiane, v_cat_eq2_psp, v_sala_eq2_9, 4, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_daiane, v_cat_eq2_psp, v_sala_eq2_9, 5, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_daiane', (select count(*) from salas_escalas where colaborador_id = v_prof_daiane and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de DAIANE (não encontrado)';
  end if;

  if v_prof_sandra is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_sandra, v_cat_eq2_music, v_sala_eq2_4, 2, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_sandra', (select count(*) from salas_escalas where colaborador_id = v_prof_sandra and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de SANDRA (não encontrado)';
  end if;

  if v_prof_mona is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_mona, v_cat_eq2_psm, v_sala_eq2_1, 1, 'manha', '08:30', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mona, v_cat_eq2_psm, v_sala_eq2_1, 1, 'tarde', '13:00', '17:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mona, v_cat_eq2_psm, v_sala_eq2_1, 2, 'manha', '07:45', '13:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mona, v_cat_eq2_psm, v_sala_eq2_1, 2, 'tarde', '13:45', '18:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mona, v_cat_eq2_psm, v_sala_eq2_1, 3, 'manha', '07:45', '12:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mona, v_cat_eq2_psm, v_sala_eq2_1, 3, 'tarde', '13:45', '18:15', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_mona, v_cat_eq2_psm, v_sala_eq2_1, 5, 'manha', '07:00', '13:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_mona', (select count(*) from salas_escalas where colaborador_id = v_prof_mona and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de MONA (não encontrado)';
  end if;

  if v_prof_marcus is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_marcus, v_cat_eq2_psiq, v_sala_eq2_5, 4, 'tarde', '13:00', '18:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_marcus', (select count(*) from salas_escalas where colaborador_id = v_prof_marcus and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de MARCUS (não encontrado)';
  end if;

  if v_prof_vitor is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_vitor, v_cat_eq2_psiq, v_sala_eq2_5, 2, 'manha', '07:00', '12:30', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_vitor, v_cat_eq2_psiq, v_sala_eq2_5, 5, 'manha', '08:00', '12:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_vitor', (select count(*) from salas_escalas where colaborador_id = v_prof_vitor and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de VITOR (não encontrado)';
  end if;

  if v_prof_welligton is not null then
    insert into salas_escalas (company_id, colaborador_id, categoria_id, sala_id, dia_semana, turno, hora_inicio, hora_fim, status, observacao, created_by, updated_by) values
    (v_company_id, v_prof_welligton, v_cat_eq2_psiq, v_sala_eq2_6, 1, 'tarde', '14:00', '20:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_welligton, v_cat_eq2_psiq, v_sala_eq2_6, 3, 'tarde', '14:00', '18:00', 'ativa', null, v_user_id, v_user_id),
    (v_company_id, v_prof_welligton, v_cat_eq2_psiq, v_sala_eq2_6, 5, 'tarde', '14:00', '20:00', 'ativa', null, v_user_id, v_user_id);
    raise notice 'Inseridas % escalas para v_prof_welligton', (select count(*) from salas_escalas where colaborador_id = v_prof_welligton and company_id = v_company_id);
  else
    raise notice 'Pulando escalas de WELLIGTON (não encontrado)';
  end if;

  -- ── Fechamentos parciais (Karolina qua/sex) ──
  if v_prof_karolina is not null then
    insert into salas_fechamentos (escala_id, dia_semana, turno, motivo, created_by)
      select e.id, 3, 'manha', 'Agenda fechada às quartas (manhã)', v_user_id from salas_escalas e where e.colaborador_id = v_prof_karolina and e.dia_semana = 3 and e.turno = 'manha'
      union all select e.id, 3, 'tarde', 'Agenda fechada às quartas (tarde)', v_user_id from salas_escalas e where e.colaborador_id = v_prof_karolina and e.dia_semana = 3 and e.turno = 'tarde'
      union all select e.id, 5, 'manha', 'Agenda fechada às sextas (manhã)', v_user_id from salas_escalas e where e.colaborador_id = v_prof_karolina and e.dia_semana = 5 and e.turno = 'manha'
      union all select e.id, 5, 'tarde', 'Agenda fechada às sextas (tarde)', v_user_id from salas_escalas e where e.colaborador_id = v_prof_karolina and e.dia_semana = 5 and e.turno = 'tarde'
    ;
    raise notice 'Fechamentos de KAROLINA inseridos.';
  else
    raise notice 'Fechamentos pulados (KAROLINA não encontrada).';
  end if;

  raise notice 'Seed v2 concluído com nova numeração de salas.';
end $$;

-- ── Verificação ──
-- select count(*) from salas_escalas where company_id = '7b8a5efa-c15f-4ff0-a223-75acd6003f15';  -- esperado: até 223
-- select count(*) from salas_fechamentos f join salas_escalas e on e.id=f.escala_id where e.company_id='7b8a5efa-c15f-4ff0-a223-75acd6003f15';  -- esperado: 4