-- BJJ Game Plan — varios mapas por usuario
-- Ejecutar en el SQL Editor de Supabase después de 0001_init.sql.

-- ============================================================
-- MAPAS
-- ============================================================
create table if not exists public.maps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  created_at  timestamptz not null default now()
);
create index if not exists maps_user_idx on public.maps (user_id, created_at);

alter table public.maps enable row level security;
drop policy if exists "maps owner access" on public.maps;
create policy "maps owner access" on public.maps
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- map_id en posiciones y técnicas
-- ============================================================
alter table public.positions  add column if not exists map_id uuid references public.maps (id) on delete cascade;
alter table public.techniques add column if not exists map_id uuid references public.maps (id) on delete cascade;

-- Backfill: un mapa "Mi juego" por cada usuario con datos, y le asignamos sus filas.
insert into public.maps (user_id, name)
select distinct user_id, 'Mi juego'
from (
  select user_id from public.positions
  union
  select user_id from public.techniques
) u
where not exists (select 1 from public.maps m where m.user_id = u.user_id);

update public.positions p
set map_id = m.id
from public.maps m
where m.user_id = p.user_id and p.map_id is null;

update public.techniques t
set map_id = m.id
from public.maps m
where m.user_id = t.user_id and t.map_id is null;

alter table public.positions  alter column map_id set not null;
alter table public.techniques alter column map_id set not null;

-- El nombre de posición pasa a ser único por MAPA (antes: por usuario).
drop index if exists public.positions_user_name_key;
create unique index if not exists positions_map_name_key
  on public.positions (map_id, lower(trim(name)));

create index if not exists positions_map_idx  on public.positions (map_id);
create index if not exists techniques_map_idx on public.techniques (map_id);

-- ============================================================
-- RLS: además de user_id, exigir que el mapa referenciado sea del usuario
-- ============================================================
drop policy if exists "positions owner access" on public.positions;
create policy "positions owner access" on public.positions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.maps m where m.id = map_id and m.user_id = auth.uid())
  );

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
  );
