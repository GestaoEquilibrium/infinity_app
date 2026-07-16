-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 003 — Corrige profiles órfãos (sem company_id)
-- e melhora o trigger de signup para associar empresa automaticamente
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Função admin-only para buscar UUID pelo email (security definer)
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email = p_email limit 1;
$$;
-- Revogar acesso público, apenas funções internas
revoke execute on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to service_role;

-- 2. Função para admin associar um membro à sua empresa por email
create or replace function public.invite_member_by_email(
  p_email text,
  p_role text default 'editor'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_company_id uuid;
  v_existing_company uuid;
begin
  -- Pegar company_id do admin que está chamando
  select company_id into v_company_id
  from profiles where id = auth.uid();

  if v_company_id is null then
    return json_build_object('error', 'Caller has no company_id');
  end if;

  -- Buscar o UUID do usuário pelo email
  select id into v_user_id from auth.users where email = p_email limit 1;

  if v_user_id is null then
    return json_build_object('error', 'User not found: ' || p_email);
  end if;

  -- Verificar se já tem profile
  select company_id into v_existing_company from profiles where id = v_user_id;

  if v_existing_company is not null and v_existing_company != v_company_id then
    return json_build_object('error', 'User already belongs to another company');
  end if;

  -- Upsert: criar ou atualizar o profile com company_id e role
  insert into profiles (id, email, name, company_id, role)
  values (
    v_user_id,
    p_email,
    split_part(p_email, '@', 1),
    v_company_id,
    p_role
  )
  on conflict (id) do update
    set company_id = v_company_id,
        role = p_role,
        updated_at = now();

  return json_build_object(
    'success', true,
    'user_id', v_user_id,
    'company_id', v_company_id,
    'role', p_role
  );
end;
$$;

-- Permitir que usuários autenticados chamem esta função
grant execute on function public.invite_member_by_email(text, text) to authenticated;

-- 3. Melhorar trigger de signup: se metadata tiver company_id, associar automaticamente
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
    -- Pegar company_id do metadata se existir (passado no convite)
    (new.raw_user_meta_data->>'company_id')::uuid,
    coalesce(new.raw_user_meta_data->>'role', 'editor')
  )
  on conflict (id) do update
    set
      company_id = coalesce(
        excluded.company_id,
        profiles.company_id  -- mantém o existente se não vier no metadata
      ),
      name = coalesce(excluded.name, profiles.name);
  return new;
end;
$$;
