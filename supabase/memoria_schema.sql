-- ============================================================
--  FERSUANADUANA · Memoria / "Cerebro" de clasificaciones
--  Guarda cada clasificación hecha (o importada del historial) para que
--  el sistema clasifique productos iguales o parecidos como ya lo hizo antes.
--  Ejecuta en Supabase -> SQL Editor. Luego importa data/memoria_import.csv
--  en Table Editor -> memoria -> Import CSV.
-- ============================================================
create extension if not exists pg_trgm;

create table if not exists public.memoria (
  id          uuid primary key default gen_random_uuid(),
  descripcion text not null,
  modelo      text,
  marca       text,
  subpartida  text not null,         -- 10 dígitos (con o sin puntos)
  cliente     text,
  veces       int not null default 1,
  created_at  timestamptz not null default now(),
  texto_norm  text generated always as (lower(descripcion || ' ' || coalesce(modelo, ''))) stored
);
create index if not exists idx_memoria_trgm on public.memoria using gin (texto_norm gin_trgm_ops);

alter table public.memoria enable row level security;
drop policy if exists "memoria_sel" on public.memoria;
drop policy if exists "memoria_ins" on public.memoria;
create policy "memoria_sel" on public.memoria for select to anon, authenticated using (true);
create policy "memoria_ins" on public.memoria for insert to authenticated with check (true);
grant select, insert on public.memoria to anon, authenticated;

-- búsqueda por similitud (producto parecido ya clasificado)
create or replace function public.buscar_memoria(term text, max_results int default 5)
returns table (descripcion text, modelo text, marca text, subpartida text, score real)
language sql stable security definer set search_path = public
as $$
  select m.descripcion, m.modelo, m.marca, m.subpartida,
         similarity(m.texto_norm, lower(coalesce(term, '')))::real as score
  from public.memoria m
  where lower(coalesce(term, '')) <> '' and m.texto_norm % lower(term)
  order by score desc, m.veces desc
  limit greatest(1, least(max_results, 10));
$$;
grant execute on function public.buscar_memoria(text, int) to anon, authenticated;

-- ============================================================
--  Después de importar el CSV, prueba:
--    select * from buscar_memoria('portasueros metalicos', 5);
-- ============================================================
