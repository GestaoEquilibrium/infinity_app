-- ══════════════════════════════════════════
-- RESET COMPLETO — rode ANTES do 001_schema.sql
-- ══════════════════════════════════════════

-- 1. Remover trigger conflitante (causa do "Database error saving new user")
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists get_my_company_id() cascade;

-- 2. Remover tabelas na ordem correta (respeita foreign keys)
drop table if exists purchases cascade;
drop table if exists transactions cascade;
drop table if exists profiles cascade;
drop table if exists companies cascade;
