-- ============================================================
--  FERSUANADUANA · Esquema del Arancel Nacional (Ecuador)
--  Ejecuta TODO este archivo en:  Supabase -> SQL Editor -> New query
--  (en TU proyecto Supabase). Luego importa data/aranceles.csv
--  en Table Editor -> tabla "aranceles" -> Insert -> Import from CSV.
-- ============================================================

-- 1) Extensiones necesarias (búsqueda por similitud y sin acentos)
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- 2) Tabla del arancel
create table if not exists public.aranceles (
  id            bigint generated always as identity primary key,
  subpartida    text not null unique,          -- código NANDINA 10 dígitos (0000.00.00.00)
  descripcion   text not null,
  unidad        text,                            -- unidad física (kg, u, ...)
  ad_valorem    numeric,                         -- % ad-valorem (NULL si sólo específico)
  especifico    text,                            -- componente específico (ej. 'USD 5.5 por kg')
  tarifa_texto  text,                            -- tarifa original tal como consta en el arancel
  capitulo      text,                            -- 2 primeros dígitos
  partida       text,                            -- grupo de 4 dígitos
  descripcion_lower text generated always as (lower(descripcion)) stored
);

-- 3) Índices de búsqueda
create index if not exists idx_aranceles_desc_trgm
  on public.aranceles using gin (descripcion_lower gin_trgm_ops);
create index if not exists idx_aranceles_subpartida
  on public.aranceles (subpartida text_pattern_ops);
create index if not exists idx_aranceles_capitulo
  on public.aranceles (capitulo);

-- 4) Lectura pública (el arancel es información pública) vía RLS
alter table public.aranceles enable row level security;
drop policy if exists "lectura_publica_aranceles" on public.aranceles;
create policy "lectura_publica_aranceles"
  on public.aranceles for select
  to anon, authenticated
  using (true);

-- 5) Función de búsqueda: por descripción (similitud + contiene) o por código
create or replace function public.search_arancel(term text, max_results int default 20)
returns table (
  subpartida text,
  descripcion text,
  unidad text,
  ad_valorem numeric,
  especifico text,
  tarifa_texto text,
  capitulo text,
  partida text,
  score real
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select
      lower(unaccent(coalesce(term, ''))) as t,
      regexp_replace(coalesce(term, ''), '[^0-9]', '', 'g') as digits
  )
  select
    a.subpartida, a.descripcion, a.unidad, a.ad_valorem, a.especifico,
    a.tarifa_texto, a.capitulo, a.partida,
    greatest(
      case when q.digits <> '' and replace(a.subpartida, '.', '') like q.digits || '%' then 1.0 else 0 end,
      similarity(lower(unaccent(a.descripcion)), q.t)
    )::real as score
  from public.aranceles a, q
  where
    (length(q.digits) >= 2 and replace(a.subpartida, '.', '') like q.digits || '%')
    or (length(q.t) >= 2 and lower(unaccent(a.descripcion)) like '%' || q.t || '%')
    or (length(q.t) >= 3 and similarity(lower(unaccent(a.descripcion)), q.t) > 0.18)
  order by score desc, a.subpartida
  limit greatest(1, least(max_results, 50));
$$;

grant execute on function public.search_arancel(text, int) to anon, authenticated;

-- ============================================================
--  Listo. Después de importar el CSV, prueba:
--    select * from search_arancel('zapatos', 10);
--    select * from search_arancel('8471', 10);
-- ============================================================
