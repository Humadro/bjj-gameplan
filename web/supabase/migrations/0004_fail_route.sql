-- BJJ Game Plan — "¿dónde acabas si fallas?" (plan B) por técnica.
-- Ejecutar en el SQL Editor de Supabase después de 0003_share.sql.

-- Posición a la que sueles ir a parar si la técnica NO sale.
-- NULL = te quedas en la misma posición / no lo has definido.
alter table public.techniques
  add column if not exists fail_position_id uuid
  references public.positions (id) on delete set null;

create index if not exists techniques_fail_idx on public.techniques (fail_position_id);

-- RLS: la posición de "si fallas" también tiene que ser del usuario y del mismo mapa.
drop policy if exists "techniques owner access" on public.techniques;
create policy "techniques owner access" on public.techniques
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.maps m where m.id = map_id and m.user_id = auth.uid())
    and exists (
      select 1 from public.positions p
      where p.id = source_position_id and p.user_id = auth.uid() and p.map_id = map_id
    )
    and (
      destination_position_id is null
      or exists (
        select 1 from public.positions p
        where p.id = destination_position_id and p.user_id = auth.uid() and p.map_id = map_id
      )
    )
    and (
      fail_position_id is null
      or exists (
        select 1 from public.positions p
        where p.id = fail_position_id and p.user_id = auth.uid() and p.map_id = map_id
      )
    )
  );

-- La vista pública (shared_map) usa to_jsonb(t), así que expone fail_position_id sin cambios.
