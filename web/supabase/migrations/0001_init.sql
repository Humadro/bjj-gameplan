-- BJJ Game Plan — esquema inicial
-- Ejecutar en Supabase: SQL Editor -> pega este archivo -> Run.
-- (o `supabase db push` si usas la CLI de Supabase con el proyecto enlazado)

-- ============================================================
-- POSICIONES
-- ============================================================
create table if not exists public.positions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 120),
  -- posición "mala" tipo bottom (front headlock bottom, mount bottom, side control bottom...).
  -- Las flechas técnica -> esta posición se pintan en rojo discontinuo.
  is_bad      boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Una posición hub no se duplica: nombre único por usuario (case-insensitive).
create unique index if not exists positions_user_name_key
  on public.positions (user_id, lower(trim(name)));

-- ============================================================
-- TÉCNICAS
-- ============================================================
create table if not exists public.techniques (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                     text not null check (char_length(trim(name)) between 1 and 160),
  source_position_id       uuid not null references public.positions (id) on delete cascade,
  -- posición a la que desemboca la técnica. NULL si es una sumisión o un callejón sin salida.
  destination_position_id  uuid references public.positions (id) on delete set null,
  confidence               text not null check (confidence in ('alta', 'media', 'baja')),
  -- true => se dibuja como caja (finalización), nunca lleva a otra posición.
  is_submission            boolean not null default false,
  created_at               timestamptz not null default now(),

  constraint submission_has_no_destination
    check (not is_submission or destination_position_id is null),
  constraint destination_is_not_source
    check (destination_position_id is null or destination_position_id <> source_position_id)
);

create index if not exists techniques_user_idx        on public.techniques (user_id);
create index if not exists techniques_source_idx      on public.techniques (source_position_id);
create index if not exists techniques_destination_idx on public.techniques (destination_position_id);

-- ============================================================
-- ROW LEVEL SECURITY — cada usuario solo ve y toca lo suyo
-- ============================================================
alter table public.positions  enable row level security;
alter table public.techniques enable row level security;

drop policy if exists "positions owner access" on public.positions;
create policy "positions owner access" on public.positions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "techniques owner access" on public.techniques;
create policy "techniques owner access" on public.techniques
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    -- las posiciones referenciadas también tienen que ser del propio usuario
    and exists (
      select 1 from public.positions p
      where p.id = source_position_id and p.user_id = auth.uid()
    )
    and (
      destination_position_id is null
      or exists (
        select 1 from public.positions p
        where p.id = destination_position_id and p.user_id = auth.uid()
      )
    )
  );
