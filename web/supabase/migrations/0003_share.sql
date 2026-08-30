-- BJJ Game Plan — compartir un mapa en modo solo lectura mediante enlace con token.
-- Ejecutar después de 0002_maps.sql.

alter table public.maps add column if not exists public_slug uuid unique;

-- Función que devuelve un mapa compartido (mapa + posiciones + técnicas) a partir
-- del token. SECURITY DEFINER: se salta RLS pero SOLO expone el mapa cuyo slug
-- coincide exactamente, así que no hay forma de enumerar mapas ajenos.
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
        (select jsonb_agg(to_jsonb(p) order by p.created_at)
         from public.positions p where p.map_id = m.id), '[]'::jsonb),
      'techniques', coalesce(
        (select jsonb_agg(to_jsonb(t) order by t.created_at)
         from public.techniques t where t.map_id = m.id), '[]'::jsonb)
    )
  end
  from (select * from public.maps where public_slug = p_token limit 1) m;
$$;

grant execute on function public.shared_map(uuid) to anon, authenticated;
