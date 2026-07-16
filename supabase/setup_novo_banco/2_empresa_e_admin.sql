-- ═══════════════════════════════════════════════════════════════════════════
-- INFINITY — PASSO 2: criar a empresa e promover seu usuário a admin
--
-- ANTES DE RODAR:
--   1. Rode o 1_schema_completo.sql
--   2. Crie sua conta NO APP (tela de login → Cadastrar) — isso gera seu
--      usuário no Supabase Auth e o perfil automaticamente
--   3. Ajuste as duas linhas marcadas com  >>>  abaixo
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  -- >>> Troque pelo e-mail que você usou no cadastro do app:
  v_admin_email text := 'wessilon@gmail.com';
  -- >>> Nome da empresa/clínica:
  v_company_name text := 'Equilibrium';

  v_company_id uuid;
  v_user_id uuid;
begin
  -- Reaproveita a empresa se já existir (idempotente)
  select id into v_company_id from companies where name = v_company_name limit 1;
  if v_company_id is null then
    insert into companies (name) values (v_company_name) returning id into v_company_id;
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(v_admin_email) limit 1;
  if v_user_id is null then
    raise exception 'Usuário % não encontrado. Cadastre-se primeiro no app.', v_admin_email;
  end if;

  -- Vincula o perfil à empresa como admin
  insert into profiles (id, email, name, company_id, role)
  values (v_user_id, lower(v_admin_email), split_part(v_admin_email, '@', 1), v_company_id, 'admin')
  on conflict (id) do update set company_id = excluded.company_id, role = 'admin';

  -- Categorias padrão de lançamento (entrada/saída) — tons de cinza
  insert into categories (company_id, name, type, color)
  select v_company_id, x.name, x.type, x.color
  from (values
    ('Consultas Particulares',      'entrada', '#141414'),
    ('Convênios / Planos',          'entrada', '#404040'),
    ('Procedimentos',               'entrada', '#6c6c6c'),
    ('Pacotes / Planos Internos',   'entrada', '#989898'),
    ('Receitas Financeiras',        'entrada', '#c4c4c4'),
    ('Salários CLT',                'saida',   '#141414'),
    ('Profissionais / Prestadores', 'saida',   '#333333'),
    ('Ocupação / Infraestrutura',   'saida',   '#565656'),
    ('Materiais Clínicos',          'saida',   '#828282'),
    ('Impostos e Tributos',         'saida',   '#404040'),
    ('Marketing e Comercial',       'saida',   '#aeaeae'),
    ('INSS',                        'saida',   '#2a2a2a'),
    ('ISS',                         'saida',   '#4a4a4a'),
    ('DARF',                        'saida',   '#6c6c6c'),
    ('IRPJ',                        'saida',   '#333333'),
    ('CSLL',                        'saida',   '#767676'),
    ('DARF Aluguel',                'saida',   '#565656')
  ) as x(name, type, color)
  where not exists (
    select 1 from categories c
    where c.company_id = v_company_id and c.name = x.name and c.type = x.type
  );

  -- Estrutura padrão do módulo Salas (EQ1/EQ2, categorias e salas físicas)
  perform seed_salas_padrao(v_company_id);

  raise notice 'Pronto! Empresa % criada (%), % é admin.', v_company_name, v_company_id, v_admin_email;
end $$;
