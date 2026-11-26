-- Agrega la columna "cliente" (importador) al historial. Ejecuta en Supabase -> SQL Editor.
alter table public.declaraciones add column if not exists cliente text;
create index if not exists idx_declaraciones_cliente on public.declaraciones (user_id, cliente);
