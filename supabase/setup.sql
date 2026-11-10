-- =====================================================================
-- Configuración de Supabase para la app de incidencias
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Antes: Authentication → Sign In / Providers → activar "Allow anonymous sign-ins"
-- =====================================================================

-- 1) Bucket PRIVADO con límites aplicados en el servidor
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('incidencias', 'incidencias', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Tabla de incidencias: guarda la REFERENCIA (image_path), nunca la imagen
create table if not exists public.incidencias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo      text not null check (char_length(titulo) between 3 and 120),
  descripcion text not null default '' check (char_length(descripcion) <= 1000),
  estado      text not null default 'abierta',
  image_path  text,          -- ej. 8f2c.../1730850000000.jpg
  image_mime  text,
  image_size  integer,       -- bytes
  created_at  timestamptz not null default now()
);

alter table public.incidencias enable row level security;

drop policy if exists "incidencias_select_propias" on public.incidencias;
drop policy if exists "incidencias_insert_propias" on public.incidencias;
drop policy if exists "incidencias_delete_propias" on public.incidencias;

create policy "incidencias_select_propias" on public.incidencias
  for select to authenticated using (user_id = auth.uid());
create policy "incidencias_insert_propias" on public.incidencias
  for insert to authenticated with check (user_id = auth.uid());
create policy "incidencias_delete_propias" on public.incidencias
  for delete to authenticated using (user_id = auth.uid());

-- 3) Reglas de Storage: cada usuario solo opera dentro de SU carpeta (<user_id>/...)
drop policy if exists "incidencias_obj_insert" on storage.objects;
drop policy if exists "incidencias_obj_select" on storage.objects;
drop policy if exists "incidencias_obj_delete" on storage.objects;

create policy "incidencias_obj_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'incidencias' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "incidencias_obj_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'incidencias' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "incidencias_obj_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'incidencias' and (storage.foldername(name))[1] = auth.uid()::text);
