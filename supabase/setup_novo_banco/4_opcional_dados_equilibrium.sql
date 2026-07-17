-- ═══════════════════════════════════════════════════════════════════════════
-- INFINITY — PASSO 4 (opcional): importar dados reais do Equilibrium MedCenter
--
-- 19 colaboradores + 5 alertas legais + 3 pendências RH
-- Fonte: consolidação SHIREQ v2 (Firebase) → Infinity (Supabase)
--
-- ANTES DE RODAR:
--   1. Rode o 1_schema_completo.sql
--   2. Rode o 2_empresa_e_admin.sql (cria a empresa Equilibrium e você como admin)
--   3. Ajuste as duas linhas marcadas com  >>>  abaixo, se necessário
--
-- IDEMPOTÊNCIA:
--   - Colaboradores: reinserção evitada por (company_id, nome)
--   - Alertas/Pendências: reinserção evitada por (company_id, titulo)
--   - Pode rodar 2x sem duplicar linhas.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  -- >>> Nome da empresa (deve bater com o que você usou no passo 2):
  v_company_name text := 'Equilibrium';
  -- >>> E-mail do admin (usuário que vai ficar como created_by):
  v_admin_email  text := 'wessilon@gmail.com';

  v_company_id uuid;
  v_user_id    uuid;
begin
  -- Descobre os UUIDs
  select id into v_company_id from companies where name = v_company_name limit 1;
  if v_company_id is null then
    raise exception 'Empresa % não encontrada. Rode o 2_empresa_e_admin.sql antes.', v_company_name;
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(v_admin_email) limit 1;
  if v_user_id is null then
    raise exception 'Usuário % não encontrado.', v_admin_email;
  end if;

  raise notice 'Importando dados para empresa % (id=%) como admin %', v_company_name, v_company_id, v_admin_email;

  -- ────────────────────────────────────────────────────────────────────
  -- COLABORADORES (19)
  -- ────────────────────────────────────────────────────────────────────
  insert into colaboradores (
    company_id, created_by, nome, cargo, setor, regime, status,
    cpf, rg, pis, ctps, titulo_eleitor,
    nascimento, admissao, limite_ferias, salario, pagador,
    telefone, email, endereco, cep,
    estado_civil, escolaridade, conjuge, filhos, conselho,
    insalubridade, observacoes, origem_estrangeiro, rnm_validade,
    docs
  )
  select v_company_id, v_user_id, x.nome, x.cargo, x.setor, x.regime, x.status,
         x.cpf, x.rg, x.pis, x.ctps, x.titulo_eleitor,
         x.nascimento::date, x.admissao::date, x.limite_ferias::date, x.salario, x.pagador,
         x.telefone, x.email, x.endereco, x.cep,
         x.estado_civil, x.escolaridade, x.conjuge, x.filhos, x.conselho,
         x.insalubridade, x.observacoes, x.origem_estrangeiro, x.rnm_validade::date,
         x.docs::jsonb
  from (values
    -- 1
    ('Caroline Aparecida Pereira da Silva','Recepcionista','Administrativo','CLT','Ativo',
     '020.846.796-30','MG 20.184.490 PC MG','162.52287.28.9','6188392/00040 MG',null,
     '1995-03-03','2025-04-14','2027-03-05',1700.00::numeric,'MEDCENTER',
     '34 99873-0395','carolapsilva95@icloud.com',
     'Al. dos Mandarins, 500 - Apto 203 - Bl A3 - Grand Ville','38407-661',
     'Solteira','Ensino Médio',null,null,null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"falta","cnh":"ok","residencia":"ok","casamento":"falta","vacina":"falta","escolar":"ok"}'),
    -- 2
    ('Cristiane Aparecida Português','Auxiliar de Faturamento','Administrativo','CLT','Ativo',
     '121.818.436-19','MG 18.525.229 SSP MG',null,'22316 S00145 SAG',null,
     '1994-09-17','2024-05-02','2026-03-23',2200.00::numeric,'TALENTOS',
     '38 99922-1822','cristiane.portugues1@gmail.com',
     'R. do Calistemon, 363 - Bl E - Ap 112 - Panorama','38413-675',
     'Solteira',null,null,null,null,
     null,null,null,null,
     '{"ctps":"ok","cpf":"ok","rg":"ok"}'),
    -- 3
    ('Erika Mariana Durães Pereira','Recepcionista','Administrativo','CLT','Ativo',
     '111.241.096-17','69.394.629-5 SSPMG','212.75733.35-4','3409054 0040 MG','2008.1323.0248 Z147-S0147',
     '1993-09-09','2025-12-29',null,null::numeric,null,
     '38 98429-2778','mduraes2626@gmail.com',
     'Rua São Francisco de Assis, 1258 - Lagoinha','38408-482',
     'Casada','Ensino Fundamental','Leonardo Soares Braga','Isabela Soares Duraes (22/05/2014)',null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"ok","vacina":"ok","escolar":"ok"}'),
    -- 4
    ('Eva Augusta de Jesus','Auxiliar de Limpeza','Administrativo','CLT','Ativo',
     '481.890.906-82',null,'122.21966.58-0','93340 S0068MG','0169.4515.0281 Z314 S0247',
     '1958-12-12','2025-08-02','2027-06-23',1700.00::numeric,'MEDCENTER',
     '34 99232-9426',null,
     'Rua Jurubeba, 697 - Morumbi','38407-321',
     'Solteira','Ensino Fundamental',null,null,null,
     '10% SM',null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"ok","vacina":"ok","escolar":"ok"}'),
    -- 5
    ('Iris Materán Paredes','Recepcionista','Administrativo','CLT','Ativo',
     '099.231.991-93','RNM 72349-8','214.16427.99-8',null,null,
     '1983-12-25','2024-10-10','2026-08-31',1700.00::numeric,'TALENTOS',
     '34 99279-1920','irisnaile@gmail.com',
     'Rua Azul, 65 - Casa 01 - Tibery',null,
     'Casada','Superior Completo - Pedagogia (Venezuela)','Álvaro Daniel Medina Cegarra',null,null,
     null,'Colaboradora venezuelana - ATENÇÃO: RNM vencido em 05/03/2026','Venezuela','2026-03-05',
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok"}'),
    -- 6
    ('Maria Júlia Cunha Seabra','Auxiliar Administrativo','Administrativo','CLT','Ativo',
     '135.790.686-28','MG 19.871.494 SSPMG','149.93351.18-2','6444690 S0060MG','2249250802 30 Z299 S0380',
     '2005-02-05','2025-05-21','2026-09-22',1616.00::numeric,'MEDCENTER',
     '34 99636-5349',null,
     'Rua do Marmelo, 146 - Pacaembu',null,
     'Solteira','Superior em MKT (Cursando)',null,null,null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"falta","vacina":"falta","escolar":"ok"}'),
    -- 7
    ('Michele Cristina dos Reis Faria Marques','Proprietária','Administrativo','Sócio','Ativo',
     '015.063.276-21',null,null,null,null,
     '1984-12-13','2022-07-01','2024-05-21',2500.00::numeric,null,
     '34 99793-4749','michelewessilon@gmail.com',
     null,null,
     null,null,null,null,null,
     null,'FÉRIAS VENCIDAS há ~24 meses - Risco CRÍTICO de dobra (CLT Art.137)',null,null,
     '{"rg":"ok"}'),
    -- 8
    ('Mikaelly Fonseca Silva','Aux. Faturamento Jr.','Administrativo','CLT','Ativo',
     '117.458.656-75',null,null,null,null,
     null,'2024-05-02','2026-03-23',1569.17::numeric,'TALENTOS',
     '34 99773-5438','fonsecamikaelly81@gmail.com',
     null,null,
     null,null,null,null,null,
     null,'Pasta sem folha de rosto completa - apenas recibo de VT digitalizado',null,null,
     '{}'),
    -- 9
    ('Tais de Oliveira Souza','Auxiliar de Serviço em Neuro','Corpo Clínico','CLT','Ativo',
     '125.842.306-58','MG 17.548.054',null,null,null,
     '2000-09-25','2024-10-03','2026-08-31',2400.00::numeric,'MEDCENTER',
     '34 99877-0541','ttisas25@gmail.com',
     'Rua Albertino Rodrigues de Oliveira - Jardim Patrícia','38414-054',
     'Solteira','Cursando Psicologia 10º período',null,null,'CRP-04/83037',
     null,null,null,null,
     '{"ctps":"ok","cpf":"ok","rg":"ok"}'),
    -- 10
    ('Thalita Silveira Gomes','Auxiliar Administrativo','Administrativo','CLT','Ativo',
     '147.911.976-82','MG 21.300.237','207.60811.28-2','7963874 S0050 MG','2156 9507 0213 Z299 S0088',
     '2000-03-28','2024-10-28','2026-09-22',1616.00::numeric,'TALENTOS',
     '34 99638-5827','thalitagomess19@gmail.com',
     'Rua Brasília, 592 - Bom Jesus','38400-762',
     'Solteira','Ensino Médio Completo',null,null,null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","residencia":"ok","casamento":"ok","vacina":"ok"}'),
    -- 11
    ('Stefany Caroline Rodrigues','Auxiliar de Limpeza','Administrativo','CLT','Ativo',
     '703.668.016-43','MG 22.251.823 SSPMG','213.14028.23-7','7036680 S01643/MG','2390 7324 0205 Z279-S0639',
     '2005-07-12','2025-06-13',null,null::numeric,'MEDCENTER',
     '34 99197-1410','stefanyrodriguescaroline@gmail.com',
     'Rua Professora Maria Célia Cence, 160 - Apto 304 - Bl 17 - Shopping Park','38425-365',
     'Casada','Ensino Fundamental','João Victor Domingues Vieira',null,null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"ok","vacina":"ok","escolar":"ok"}'),
    -- 12
    ('Ester Oliveira Silva','Recepcionista','Administrativo','CLT','Ativo',
     null,null,null,null,null,
     '1998-05-26','2025-04-09',null,1613.40::numeric,null,
     '34 99763-2906',null,
     'Rua Ademar Borges dos Santos, 158 - Chácaras Tubalina','38413-337',
     'Solteira','Ensino Médio Completo',null,null,null,
     null,'FOLHA DE ROSTO VAZIA - Documentação CLT não digitalizada (violação CLT Art.41)',null,null,
     '{}'),
    -- 13
    ('Mariana Braz Silva de Oliveira','Recepcionista','Administrativo','CLT','Ativo',
     '088.597.856-00','MG 15.714.809 SSP-MG','129.53890.13-2','6190654 0040 MG','1894.4959.0248 Z0278 S 0549',
     '1989-05-08','2025-11-24','2027-10-15',1616.00::numeric,null,
     '34 99865-3094','braz.mariana94@gmail.com',
     'Al. José de Oliveira Guimarães, 755 - Casa 6','38412-324',
     'Casada',null,'Paulo Cesar Candido de Oliveira Junior','Miguel (09/05/2017) | Matheus (23/09/2013)',null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"ok","filhosdoc":"ok","vacina":"ok","escolar":"ok"}'),
    -- 14
    ('Fernanda Felix Pinheiro','Recepcionista','Administrativo','CLT','Ativo',
     '140.874.086-98','MG 20.615.507 SSPMG','207.60842.93-5','5178392 S.0040/MG','2156 9111 0230 Z335-S0246',
     '1999-07-22','2025-10-22',null,1613.40::numeric,null,
     '34 99152-4008','fernandafp99@gmail.com',
     'Rua Itabira, 311 - AP 104','38400-324',
     'Solteira',null,null,null,null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"ok","filhosdoc":"ok","vacina":"falta","escolar":"ok"}'),
    -- 15
    ('Anne Caroline Barbosa de Deus','Recepcionista','Administrativo','CLT','Ativo',
     '141.167.016-70',null,'209.62195.30-2','9355598 S.0040 MG','2169 8251 0213 Z335-S0139',
     '1999-04-30','2025-09-05',null,1613.40::numeric,null,
     '65 99927-9605','barbosadedeusannecaroline@gmail.com',
     'Rua da Lanterninha Japonesa, 170','38413-651',
     'Casada',null,null,null,null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"ok","vacina":"ok","escolar":"ok"}'),
    -- 16
    ('Franciele Aparecida dos Santos','Recepcionista','Administrativo','CLT','Ativo',
     '106.999.476-69','MG 17.229.830 PCMG','162.98527.03-7','3369425 0050 MG','1867 2411 0205 Z278 S0717',
     '1991-12-29','2026-01-09',null,1616.00::numeric,null,
     '34 99681-8471','francieleaps9@gmail.com',
     'Rua Sagui do Cerrado, 91','38421-148',
     'Casada',null,'Leandro','Anthoni (13/07/2015) | Lorenzo (13/07/2015) - GÊMEOS',null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","residencia":"ok","casamento":"falta","filhosdoc":"ok","vacina":"falta","escolar":"ok"}'),
    -- 17
    ('Cristina Beatriz Lima','Recepcionista','Administrativo','CLT','Ativo',
     '789.960.616-87','MG 4.715.197 SSPMG','124.43442.64-2','1201118.0040/MG','0619 0030 0299 Z278-S0022',
     '1969-06-15','2026-03-16',null,1700.00::numeric,null,
     '34 99971-0728','crisbialima@gmail.com',
     'Rua Salvador, 1070 - Apto 301 - B1','38400-757',
     'Casada','Superior Ciências Contábeis - UNA (2018)','Stanley Guedes Alves',null,null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"ok","vacina":"falta","escolar":"ok"}'),
    -- 18
    ('Lila Braga Cândido','Recepcionista','Administrativo','CLT','Ativo',
     '081.177.556-96',null,'131.53271.98-3',null,'1518.7253.0281 Z.278 S.0624',
     '1985-01-17','2026-04-17',null,1700.00::numeric,null,
     '34 99197-1410','libraga3@gmail.com',
     'Rua Adelino Ferreira de Sá, 302','38425-365',
     'Casada','Ensino Médio','Ailton Gomes Ferreira',null,null,
     null,null,null,null,
     '{"ctps":"ok","pis":"ok","cpf":"ok","rg":"ok","titulo":"ok","cnh":"ok","residencia":"ok","casamento":"ok","vacina":"ok","escolar":"ok"}'),
    -- 19
    ('Wessilon Marques de Sousa','Neuropsicólogo / Fundador','Corpo Clínico','Sócio','Ativo',
     '037.682.706-88',null,null,null,null,
     '1979-11-17','2019-06-01',null,null::numeric,null,
     '34 99679-1111','wessilon@gmail.com',
     null,null,
     null,null,null,null,'CRP 04/53832',
     null,null,null,null,
     '{}')
  ) as x(
    nome, cargo, setor, regime, status,
    cpf, rg, pis, ctps, titulo_eleitor,
    nascimento, admissao, limite_ferias, salario, pagador,
    telefone, email, endereco, cep,
    estado_civil, escolaridade, conjuge, filhos, conselho,
    insalubridade, observacoes, origem_estrangeiro, rnm_validade,
    docs
  )
  where not exists (
    select 1 from colaboradores c
    where c.company_id = v_company_id and c.nome = x.nome
  );

  raise notice 'Colaboradores inseridos/já existentes: %', (select count(*) from colaboradores where company_id = v_company_id);

  -- ────────────────────────────────────────────────────────────────────
  -- ALERTAS LEGAIS (5)
  -- ────────────────────────────────────────────────────────────────────
  insert into alertas_legais (company_id, created_by, colaborador_id, titulo, descricao, prioridade, categoria, resolvido)
  select v_company_id, v_user_id, a.colab_id, a.titulo, a.descricao, a.prioridade, a.categoria, false
  from (values
    ((select id from colaboradores where nome = 'Iris Materán Paredes' and company_id = v_company_id limit 1),
     'Iris Materán — RNM vencido',
     'Registro Nacional Migratório vencido em 05/03/2026. Risco de multa PF e MTE.',
     'crítica','Imigração'),
    ((select id from colaboradores where nome = 'Michele Cristina dos Reis Faria Marques' and company_id = v_company_id limit 1),
     'Michele Marques — férias vencidas há 24 meses',
     'Limite 21/05/2024. Risco de pagamento em dobro (CLT Art.137).',
     'crítica','Férias'),
    ((select id from colaboradores where nome = 'Ester Oliveira Silva' and company_id = v_company_id limit 1),
     'Ester Oliveira — documentação CLT ausente',
     'Folha de rosto vazia. Violação CLT Art.41.',
     'crítica','Compliance'),
    (null::uuid,
     'Cristiane Português + Mikaelly — férias vencem em 23/03/2026',
     'Agendar gozo em até 2 meses.',
     'alta','Férias'),
    ((select id from colaboradores where nome = 'Mikaelly Fonseca Silva' and company_id = v_company_id limit 1),
     'Mikaelly — documentação incompleta',
     'Pasta sem documentação CLT completa.',
     'alta','Compliance')
  ) as a(colab_id, titulo, descricao, prioridade, categoria)
  where not exists (
    select 1 from alertas_legais al
    where al.company_id = v_company_id and al.titulo = a.titulo
  );

  raise notice 'Alertas legais no total: %', (select count(*) from alertas_legais where company_id = v_company_id);

  -- ────────────────────────────────────────────────────────────────────
  -- PENDÊNCIAS RH (3)
  -- ────────────────────────────────────────────────────────────────────
  insert into rh_pendencias (company_id, created_by, colaborador_id, titulo, descricao, prioridade, categoria, status)
  select v_company_id, v_user_id, p.colab_id, p.titulo, p.descricao, p.prioridade, p.categoria, 'Aberta'
  from (values
    ((select id from colaboradores where nome = 'Iris Materán Paredes' and company_id = v_company_id limit 1),
     'Corrigir CPF divergente da Iris',
     'Conflito entre folha de rosto e planilha bancária.',
     'Alta','Cadastro'),
    ((select id from colaboradores where nome = 'Erika Mariana Durães Pereira' and company_id = v_company_id limit 1),
     'Atualizar CPF correto da Erika',
     'Sistema antigo tinha CPF errado.',
     'Alta','Cadastro'),
    (null::uuid,
     'Processar distrato Antônio Marcos',
     'Encerrou vínculo em 23/12/2025.',
     'Alta','Rescisão')
  ) as p(colab_id, titulo, descricao, prioridade, categoria)
  where not exists (
    select 1 from rh_pendencias rp
    where rp.company_id = v_company_id and rp.titulo = p.titulo
  );

  raise notice 'Pendências RH no total: %', (select count(*) from rh_pendencias where company_id = v_company_id);
  raise notice '✅ Import concluído. Folha mensal: R$ %', (select coalesce(sum(salario),0) from colaboradores where company_id = v_company_id and status = 'Ativo');
end $$;
