-- ============================================================
--  FERSUANADUANA · Alertas de nuevas resoluciones (robot)
--  Ejecuta en Supabase -> SQL Editor.
-- ============================================================
create table if not exists public.alertas (
  id          uuid primary key default gen_random_uuid(),
  detectada   timestamptz not null default now(),
  referencia  text unique,          -- ej. "COMEX 006-2025"
  titulo      text,
  url         text,
  revisada    boolean not null default false
);

alter table public.alertas enable row level security;
-- lectura pública para mostrar en el panel; la escritura la hace el cron con service role
drop policy if exists "alertas_sel" on public.alertas;
create policy "alertas_sel" on public.alertas for select to anon, authenticated using (true);
grant select on public.alertas to anon, authenticated;
