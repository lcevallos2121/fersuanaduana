-- ============================================================
--  FERSUANADUANA · Notas Explicativas del Sistema Armonizado (VUENESA)
--  Ejecuta este archivo en Supabase -> SQL Editor, luego importa
--  data/notas_explicativas.csv en Table Editor -> notas_explicativas -> Import CSV.
-- ============================================================

create table if not exists public.notas_explicativas (
  partida   text primary key,   -- 4 dígitos sin punto (ej. 8413)
  capitulo  text,               -- 2 dígitos
  titulo    text,
  texto     text
);

-- lectura pública (dato de referencia público) + permiso directo para el rol anon
alter table public.notas_explicativas enable row level security;
drop policy if exists "lectura_publica_notas" on public.notas_explicativas;
create policy "lectura_publica_notas"
  on public.notas_explicativas for select to anon, authenticated using (true);
grant select on public.notas_explicativas to anon, authenticated;

-- ============================================================
--  Después de importar el CSV, prueba:
--    select partida, titulo from notas_explicativas where partida = '8413';
-- ============================================================
