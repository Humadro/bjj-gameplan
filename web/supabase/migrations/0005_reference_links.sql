-- BJJ Game Plan — enlaces de vídeo/instructional por técnica y por posición.
-- Ejecutar en el SQL Editor de Supabase después de 0004_fail_route.sql.

-- reference_url          : enlace de estudio (YouTube u otro). NULL = sin enlace.
-- reference_label        : texto corto para mostrar (opcional).
-- reference_start_seconds: segundo de inicio para el embed de YouTube (opcional).
alter table public.techniques
  add column if not exists reference_url text,
  add column if not exists reference_label text,
  add column if not exists reference_start_seconds integer;

alter table public.positions
  add column if not exists reference_url text,
  add column if not exists reference_label text,
  add column if not exists reference_start_seconds integer;

-- La vista pública (shared_map) usa to_jsonb(), así que expone estas columnas sin cambios.

-- Fuerza a PostgREST a releer el esquema. Sin esto, tras un ALTER TABLE hecho a
-- mano en el SQL Editor, la API puede seguir con el cache viejo y devolver
-- «Could not find the 'reference_url' column ... in the schema cache» al insertar.
notify pgrst, 'reload schema';
