-- ============================================================
--  FERSUANADUANA · Historial de declaraciones
--  Ejecuta este archivo en Supabase -> SQL Editor. No requiere importar nada.
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.declaraciones (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  created_at     timestamptz not null default now(),
  numero_factura text,
  proveedor      text,
  cliente        text,
  cabecera       jsonb,
  items          jsonb
);
alter table public.declaraciones add column if not exists cliente text;

alter table public.declaraciones enable row level security;

drop policy if exists "declaraciones_sel_own" on public.declaraciones;
drop policy if exists "declaraciones_ins_own" on public.declaraciones;
drop policy if exists "declaraciones_del_own" on public.declaraciones;

-- cada usuario solo ve, crea y borra sus propias declaraciones
create policy "declaraciones_sel_own" on public.declaraciones for select to authenticated using (auth.uid() = user_id);
create policy "declaraciones_ins_own" on public.declaraciones for insert to authenticated with check (auth.uid() = user_id);
create policy "declaraciones_del_own" on public.declaraciones for delete to authenticated using (auth.uid() = user_id);

grant select, insert, delete on public.declaraciones to authenticated;

create index if not exists idx_declaraciones_user on public.declaraciones (user_id, created_at desc);
