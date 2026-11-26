-- ============================================================
--  FERSUANADUANA · Restricciones / Control previo por subpartida
--  Nómina COMEX 009-2022 (Anexo I control previo + Anexo II prohibidas).
--  Ejecuta en Supabase -> SQL Editor. Luego importa data/restricciones_import.csv
--  en Table Editor -> restricciones -> Import CSV.
-- ============================================================
create table if not exists public.restricciones (
  subpartida   text primary key,            -- 10 dígitos con puntos (0000.00.00.00)
  descripcion  text,
  tipo         text,                          -- 'control previo' | 'prohibida'
  institucion  text,                          -- entidad de control
  documento    text                           -- documento/permiso exigido
);

alter table public.restricciones enable row level security;
drop policy if exists "restricciones_sel" on public.restricciones;
create policy "restricciones_sel" on public.restricciones for select to anon, authenticated using (true);
grant select on public.restricciones to anon, authenticated;

-- ============================================================
--  Después de importar el CSV, prueba:
--    select * from restricciones where subpartida = '0101.21.00.00';
-- ============================================================
