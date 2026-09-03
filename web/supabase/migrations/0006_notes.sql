-- BJJ Game Plan — nota personal (texto libre) por posición y por técnica.
-- Ejecutar en el SQL Editor de Supabase después de 0005_reference_links.sql.

-- note: apunte privado del dueño ("subir el codo", "me pilló David aquí").
--       NULL = sin nota. No se comparte ni se clona (ver shared_map más abajo).
alter table public.positions  add column if not exists note text;
alter table public.techniques add column if not exists note text;

-- La vista pública NO debe exponer las notas: son privadas aunque el dueño
-- comparta el mapa. Se quitan del jsonb de posiciones y técnicas con `- 'note'`.
create or replace function public.shared_map(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when m.id is null then null
    else jsonb_build_object(
      'map', jsonb_build_object('id', m.id, 'name', m.name),
      'positions', coalesce(
        (select jsonb_agg((to_jsonb(p) - 'note') order by p.created_at)
         from public.positions p where p.map_id = m.id), '[]'::jsonb),
      'techniques', coalesce(
        (select jsonb_agg((to_jsonb(t) - 'note') order by t.created_at)
         from public.techniques t where t.map_id = m.id), '[]'::jsonb)
    )
  end
  from (select * from public.maps where public_slug = p_token limit 1) m;
$$;

-- Fuerza a PostgREST a releer el esquema (ver nota en 0005).
notify pgrst, 'reload schema';
