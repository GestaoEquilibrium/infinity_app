-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 004 — Função invite_member_by_email definitiva
-- Problema anterior: set search_path = public não dá acesso a auth.users
-- Solução: referenciar auth.users pelo schema completo dentro da função
--          e usar SECURITY DEFINER que roda como superuser (tem acesso a auth)
-- ═══════════════════════════════════════════════════════════════════════

-- Dropar versões anteriores
drop function if exists public.invite_member_by_email(text, text);
drop function if exists public.invite_member_by_email(text);

-- Recriar sem set search_path (deixa o Postgres resolver auth.users normalmente)
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
  -- 1. Pegar company_id do admin que está chamando
  select company_id into v_company_id
  from public.profiles
  where id = v_caller_id;

  if v_company_id is null then
    return json_build_object('error', 'sem_empresa', 'msg', 'Seu perfil não tem empresa associada.');
  end if;

  -- 2. Buscar UUID pelo email em auth.users (acesso garantido pelo SECURITY DEFINER)
  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    return json_build_object('error', 'user_not_found', 'msg', 'Usuário não encontrado. Ele precisa se cadastrar primeiro.');
  end if;

  -- 3. Checar se já tem empresa diferente
  select company_id into v_prev_company
  from public.profiles
  where id = v_user_id;

  if v_prev_company is not null and v_prev_company <> v_company_id then
    return json_build_object('error', 'outra_empresa', 'msg', 'Este usuário já pertence a outra empresa.');
  end if;

  -- 4. Upsert do profile associando à empresa
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

-- Revogar acesso anônimo, conceder apenas a usuários autenticados
revoke execute on function public.invite_member_by_email(text, text) from public, anon;
grant  execute on function public.invite_member_by_email(text, text) to authenticated;

-- Policy para admin atualizar profiles órfãos (company_id IS NULL)
-- Necessário para o PATCH via REST API caso a RPC não seja suficiente
drop policy if exists "Admin adota perfil orfao" on public.profiles;
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
