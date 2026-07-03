-- 1. Lightweight transient location table
create table if not exists public.handyman_locations (
  id uuid references public.handymen(id) on delete cascade primary key,
  location geography(Point, 4326) not null,
  updated_at timestamptz not null default now()
);

alter table public.handyman_locations enable row level security;

create policy handyman_locations_upsert_own
  on public.handyman_locations for insert
  to authenticated
  with check (id = auth.uid());

create policy handyman_locations_update_own
  on public.handyman_locations for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy handyman_locations_select_searchable
  on public.handyman_locations for select
  to authenticated
  using (
    is_admin()
    or id = auth.uid()
    or exists (
      select 1 from handymen h
      where h.id = handyman_locations.id
        and h.is_online = true
        and h.kyc_status = 'APPROVED'
    )
  );

-- 2. GiST index on the lightweight table (drop the old one on handymen.location)
create index if not exists handyman_locations_gist
  on public.handyman_locations using gist(location);

drop index if exists idx_handymen_location;

-- 3. Hyper-fast UPSERT function
create or replace function public.upsert_handyman_location(
  p_handyman_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.handyman_locations (id, location, updated_at)
  values (
    p_handyman_id,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    now()
  )
  on conflict (id) do update
  set
    location = excluded.location,
    updated_at = excluded.updated_at;
end;
$$;

-- 4. Update search function to read from handyman_locations
create or replace function public.search_nearest_handymen(
  p_client_lat double precision,
  p_client_lng double precision,
  p_radius_meters float,
  p_category service_category
)
returns table (
  handyman_id uuid,
  user_name text,
  photo_url text,
  is_online boolean,
  distance_meters float8
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    h.id,
    u.full_name,
    u.photo_url,
    h.is_online,
    st_distance(
      hl.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography
    ) as distance_meters
  from handymen h
  join users u on h.id = u.id
  join handyman_locations hl on h.id = hl.id
  join handyman_services hs on h.id = hs.handyman_id
  join services s on hs.service_id = s.id
  where h.is_online = true
    and h.kyc_status = 'APPROVED'
    and hl.location is not null
    and s.category = p_category
    and st_dwithin(
      hl.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography,
      p_radius_meters
    )
  order by distance_meters asc
  limit 20;
end;
$$;